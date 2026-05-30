import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import db from '$lib/db';

const NGINX_API  = 'http://10.34.1.1:8080';
const KC_BASE    = 'http://10.34.1.4:8080'; // internal; hairpin NAT blocks public IP from server
const IPA_BASE   = 'https://ipa.opsid.web.id/ipa/session/json';

function decodeToken(token: string): any {
  try {
    const b64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(Buffer.from(b64, 'base64').toString('utf8'));
  } catch { return null; }
}

async function getKcToken(): Promise<string> {
  const res = await fetch(`${KC_BASE}/realms/master/protocol/openid-connect/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'client_id=admin-cli&grant_type=password&username=opsid-admin&password=sandiaman2026',
  });
  const d = await res.json();
  return d.access_token;
}

// Returns { isAdmin, username } or null if unauthenticated
function parseAuth(cookies: any): { isAdmin: boolean; username: string } | null {
  const token = cookies.get('opsid_token');
  if (!token) return null;
  const p = decodeToken(token);
  if (!p?.preferred_username) return null;
  return {
    isAdmin:  (p.realm_access?.roles ?? []).includes('opsid-admin'),
    username: p.preferred_username,
  };
}

export const GET: RequestHandler = async ({ params, cookies }) => {
  const auth = parseAuth(cookies);
  if (!auth) return json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const result = await db.query(
      `SELECT t.*, COUNT(tu.id) as user_count
       FROM tenants t
       LEFT JOIN tenant_users tu ON t.id = tu.tenant_id
       WHERE t.id = $1
       GROUP BY t.id`,
      [params.id]
    );
    if (!result.rows.length) return json({ error: 'Tenant tidak ditemukan' }, { status: 404 });

    const tenant = result.rows[0];

    // Non-admins may only see their own tenant
    if (!auth.isAdmin) {
      const ownership = await db.query(
        `SELECT 1 FROM tenant_users WHERE username = $1 AND tenant_id = $2 AND status = 'active'`,
        [auth.username, params.id]
      );
      if (!ownership.rows.length) return json({ error: 'Forbidden' }, { status: 403 });
    }

    return json({ ok: true, tenant });
  } catch (e) {
    return json({ error: String(e) }, { status: 500 });
  }
};

export const PUT: RequestHandler = async ({ params, request, cookies }) => {
  const auth = parseAuth(cookies);
  if (!auth) return json({ ok: false, error: 'Unauthorized' }, { status: 401 });

  try {
    if (!auth.isAdmin) {
      // Verify tenant admin owns this tenant
      const ownership = await db.query(
        `SELECT 1 FROM tenant_users WHERE username = $1 AND tenant_id = $2 AND role = 'org-admin' AND status = 'active'`,
        [auth.username, params.id]
      );
      if (!ownership.rows.length) return json({ ok: false, error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const {
      name, primaryColor, logoUrl,
      planNextcloudGb, planEmailGb, planOdooGb,
      maxUsers, planTier,
      status,
    } = body;

    const updates: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (name             !== undefined) { updates.push(`name = $${idx++}`);                 values.push(String(name)); }
    if (primaryColor     !== undefined) { updates.push(`primary_color = $${idx++}`);        values.push(primaryColor); }
    if (logoUrl          !== undefined) { updates.push(`logo_url = $${idx++}`);             values.push(logoUrl); }
    if (planNextcloudGb  !== undefined) { updates.push(`plan_nextcloud_gb = $${idx++}`);    values.push(Number(planNextcloudGb)); }
    if (planEmailGb      !== undefined) { updates.push(`plan_email_gb = $${idx++}`);        values.push(Number(planEmailGb)); }
    if (planOdooGb       !== undefined) { updates.push(`plan_odoo_gb = $${idx++}`);         values.push(Number(planOdooGb)); }
    if (maxUsers         !== undefined) { updates.push(`max_users = $${idx++}`);            values.push(Number(maxUsers)); }
    if (planTier         !== undefined) { updates.push(`plan_tier = $${idx++}`);            values.push(String(planTier)); }
    if (status           !== undefined) {
      updates.push(`status = $${idx++}`);
      values.push(status);
      if (status === 'suspended') {
        updates.push(`suspended_at = NOW()`);
      } else {
        updates.push(`suspended_at = NULL`);
      }
    }

    if (!updates.length) return json({ ok: false, error: 'Tidak ada field yang diubah' }, { status: 400 });

    values.push(params.id);

    try {
      await db.query(
        `UPDATE tenants SET ${updates.join(', ')} WHERE id = $${idx}`,
        values
      );
    } catch (sqlErr: any) {
      // Strip optional columns that may not exist in older schema
      const safe = updates.filter(u =>
        !u.includes('suspended_at') &&
        !u.includes('updated_at') &&
        !u.includes('max_users') &&
        !u.includes('plan_tier')
      );
      if (safe.length > 0) {
        await db.query(
          `UPDATE tenants SET ${safe.join(', ')} WHERE id = $${idx}`,
          values
        );
      } else {
        throw sqlErr;
      }
    }

    await db.query(
      `INSERT INTO audit_logs (actor, action, target, metadata) VALUES ($1, $2, $3, $4)`,
      [auth.username, 'UPDATE_TENANT', String(params.id),
       JSON.stringify({ name, primaryColor, logoUrl, planNextcloudGb, planEmailGb, planOdooGb, maxUsers, planTier, status })]
    ).catch(() => null);

    return json({ ok: true });
  } catch (e) {
    return json({ ok: false, error: String(e) }, { status: 500 });
  }
};

// ── KC org lookup: search by domain first (more reliable), fallback by slug ──
async function findKcOrgId(token: string, slug: string, domain: string): Promise<string | null> {
  async function searchOrg(q: string): Promise<any[]> {
    const r = await fetch(
      `${KC_BASE}/admin/realms/opsid-internal/organizations?search=${encodeURIComponent(q)}`,
      { headers: { 'Authorization': `Bearer ${token}` } }
    );
    if (!r.ok) return [];
    return r.json().catch(() => []);
  }

  const byDomain = await searchOrg(domain);
  const matchDomain = byDomain.find((o: any) =>
    o.alias === slug || o.domains?.some((d: any) => d.name === domain)
  );
  if (matchDomain?.id) return matchDomain.id;

  const bySlug = await searchOrg(slug);
  const matchSlug = bySlug.find((o: any) =>
    o.alias === slug || o.domains?.some((d: any) => d.name === domain)
  );
  return matchSlug?.id ?? null;
}

// ── FreeIPA session login ────────────────────────────────────────────────────
const IPA_URL   = 'https://ipa.opsid.web.id/ipa';
const IPA_ADMIN = 'admin';
const IPA_PASS  = 'Sandiaman2026';

async function ipaLogin(): Promise<string> {
  const res = await fetch(`${IPA_URL}/session/login_password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Referer': IPA_URL,
      'Accept': 'text/plain',
    },
    body: `user=${IPA_ADMIN}&password=${encodeURIComponent(IPA_PASS)}`,
  });
  if (!res.ok) throw new Error(`FreeIPA login failed: ${res.status}`);
  return res.headers.get('set-cookie') ?? '';
}

async function ipaCall(cookie: string, method: string, args: any[], kwargs: any = {}): Promise<any> {
  const res = await fetch(`${IPA_URL}/session/json`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Referer': IPA_URL, 'Cookie': cookie },
    body: JSON.stringify({ method, params: [args, kwargs], id: 0 }),
  });
  return res.json();
}

export const DELETE: RequestHandler = async ({ params, cookies }) => {
  // Only superadmin can delete tenants
  const auth = parseAuth(cookies);
  if (!auth) return json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  if (!auth.isAdmin) return json({ ok: false, error: 'Forbidden' }, { status: 403 });

  try {
    const result = await db.query(`SELECT * FROM tenants WHERE id = $1`, [params.id]);
    if (!result.rows.length) return json({ error: 'Tenant tidak ditemukan' }, { status: 404 });
    const tenant = result.rows[0];

    // Collect usernames before deleting tenant_users (cascades with tenant delete)
    const usersRes = await db.query(
      `SELECT username FROM tenant_users WHERE tenant_id = $1`,
      [params.id]
    );
    const usernames: string[] = usersRes.rows.map((r: any) => r.username);

    // 1. Null-out onboarding_requests.tenant_id to avoid FK violation
    await db.query(
      `UPDATE onboarding_requests SET tenant_id = NULL WHERE tenant_id = $1`,
      [params.id]
    ).catch(() => null);

    // 2. Hapus vhost dari Nginx
    await fetch(`${NGINX_API}/site/${encodeURIComponent(tenant.domain)}`, {
      method: 'DELETE',
    }).catch(() => null);

    // 3. Hapus Keycloak Organization (search by domain → reliable)
    try {
      const token  = await getKcToken();
      const orgId  = await findKcOrgId(token, tenant.slug, tenant.domain);
      if (orgId) {
        await fetch(
          `${KC_BASE}/admin/realms/opsid-internal/organizations/${orgId}`,
          { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } }
        );
      }

      // 4. Hapus Keycloak users (best-effort per user)
      for (const username of usernames) {
        try {
          const usrRes = await fetch(
            `${KC_BASE}/admin/realms/opsid-internal/users?username=${encodeURIComponent(username)}&exact=true`,
            { headers: { 'Authorization': `Bearer ${token}` } }
          );
          const users = await usrRes.json().catch(() => []);
          if (Array.isArray(users) && users.length > 0) {
            await fetch(
              `${KC_BASE}/admin/realms/opsid-internal/users/${users[0].id}`,
              { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } }
            );
          }
        } catch { /* best-effort per user */ }
      }
    } catch { /* KC failure non-fatal — continue */ }

    // 5. Hapus FreeIPA users + group (best-effort, dengan session login)
    try {
      const ipaCookie = await ipaLogin();
      for (const username of usernames) {
        await ipaCall(ipaCookie, 'user_del', [username], { continue: true }).catch(() => null);
      }
      await ipaCall(ipaCookie, 'group_del', [`${tenant.slug}-users`], {}).catch(() => null);
    } catch { /* FreeIPA failure non-fatal */ }

    // 6. Hapus dari PostgreSQL (tenant_users, audit_logs references cascade)
    await db.query(`DELETE FROM tenants WHERE id = $1`, [params.id]);

    // 7. Audit log
    await db.query(
      `INSERT INTO audit_logs (actor, action, target, metadata) VALUES ($1, $2, $3, $4)`,
      [auth.username, 'DELETE_TENANT', tenant.domain,
       JSON.stringify({ name: tenant.name, slug: tenant.slug, usersDeleted: usernames })]
    );

    return json({ ok: true });
  } catch (e) {
    return json({ error: String(e) }, { status: 500 });
  }
};
