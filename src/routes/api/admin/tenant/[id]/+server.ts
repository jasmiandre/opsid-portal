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

export const DELETE: RequestHandler = async ({ params, cookies }) => {
  // Only superadmin can delete tenants
  const auth = parseAuth(cookies);
  if (!auth) return json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  if (!auth.isAdmin) return json({ ok: false, error: 'Forbidden' }, { status: 403 });

  try {
    const result = await db.query(`SELECT * FROM tenants WHERE id = $1`, [params.id]);
    if (!result.rows.length) return json({ error: 'Tenant tidak ditemukan' }, { status: 404 });

    const tenant = result.rows[0];

    // 1. Null-out onboarding_requests.tenant_id to avoid FK violation
    await db.query(
      `UPDATE onboarding_requests SET tenant_id = NULL WHERE tenant_id = $1`,
      [params.id]
    ).catch(() => null);

    // 2. Hapus dari Nginx
    await fetch(`${NGINX_API}/site/${encodeURIComponent(tenant.domain)}`, {
      method: 'DELETE',
    }).catch(() => null);

    // 3. Hapus Keycloak Organization
    try {
      const token = await getKcToken();
      const orgsRes = await fetch(
        `${KC_BASE}/admin/realms/opsid-internal/organizations?search=${encodeURIComponent(tenant.slug)}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      const orgs = await orgsRes.json();
      if (Array.isArray(orgs) && orgs.length > 0) {
        const org = orgs.find((o: any) => o.alias === tenant.slug) ?? orgs[0];
        await fetch(
          `${KC_BASE}/admin/realms/opsid-internal/organizations/${org.id}`,
          { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } }
        );
      }
    } catch { /* continue on failure */ }

    // 4. Hapus FreeIPA group (best-effort)
    await fetch(IPA_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Referer': 'https://ipa.opsid.web.id/ipa' },
      body: JSON.stringify({ method: 'group_del', params: [[`${tenant.slug}-users`], {}] }),
    }).catch(() => null);

    // 5. Hapus dari PostgreSQL (tenant_users cascades)
    await db.query(`DELETE FROM tenants WHERE id = $1`, [params.id]);

    // 6. Audit log
    await db.query(
      `INSERT INTO audit_logs (actor, action, target, metadata) VALUES ($1, $2, $3, $4)`,
      [auth.username, 'DELETE_TENANT', tenant.domain, JSON.stringify({ name: tenant.name, slug: tenant.slug })]
    );

    return json({ ok: true });
  } catch (e) {
    return json({ error: String(e) }, { status: 500 });
  }
};
