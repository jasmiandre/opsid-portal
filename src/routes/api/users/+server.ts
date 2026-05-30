import type { RequestHandler } from '@sveltejs/kit';
import { json } from '@sveltejs/kit';
import db from '$lib/db';

const FREEIPA_URL   = 'https://ipa.opsid.web.id/ipa';
const FREEIPA_ADMIN = 'admin';
const FREEIPA_PASS  = 'Sandiaman2026';
const KC_BASE       = 'http://10.34.1.4:8080';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// ── helpers ──────────────────────────────────────────────────────────────────

async function ipaLogin(): Promise<string> {
  const res = await fetch(`${FREEIPA_URL}/session/login_password`, {
    method:  'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Referer':      FREEIPA_URL,
      'Accept':       'text/plain',
    },
    body: `user=${FREEIPA_ADMIN}&password=${encodeURIComponent(FREEIPA_PASS)}`,
  });
  if (!res.ok) throw new Error(`FreeIPA login failed: ${res.status}`);
  return res.headers.get('set-cookie') || '';
}

async function ipaCall(cookie: string, method: string, args: any[], kwargs: any = {}): Promise<any> {
  const res = await fetch(`${FREEIPA_URL}/session/json`, {
    method:  'POST',
    headers: {
      'Content-Type': 'application/json',
      'Referer':      FREEIPA_URL,
      'Cookie':       cookie,
    },
    body: JSON.stringify({ method, params: [args, kwargs], id: 0 }),
  });
  return res.json();
}

function mapIpaUser(u: any) {
  return {
    username: u.uid?.[0]  || '',
    name:     u.cn?.[0]   || u.displayname?.[0] || '',
    email:    u.mail?.[0] || '',
    dept:     u.departmentnumber?.[0] || u.ou?.[0] || '-',
    role:     u.title?.[0] || 'Staff',
    status:   u.nsaccountlock ? 'inactive' : 'active',
  };
}

/** Decode JWT payload — no signature verification, KC already did that. */
function decodeToken(token: string): any {
  try {
    const b64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(Buffer.from(b64, 'base64').toString('utf8'));
  } catch {
    return null;
  }
}

// ── GET ──────────────────────────────────────────────────────────────────────

export const GET: RequestHandler = async ({ cookies }) => {
  const token   = cookies.get('opsid_token');
  const payload = token ? decodeToken(token) : null;
  const username: string = payload?.preferred_username ?? '';
  const email: string    = payload?.email ?? '';
  const roles: string[]  = payload?.realm_access?.roles ?? [];
  const isAdmin = roles.includes('opsid-admin');

  if (!username) return json({ success: false, error: 'Not authenticated' }, { status: 401 });

  // ── Superadmin: all FreeIPA users, enriched with KC realm roles ──────────────
  if (isAdmin) {
    try {
      const cookie = await ipaLogin();
      const result = await ipaCall(cookie, 'user_find', [[]], { sizelimit: 200, all: true });
      if (result.error) return json({ success: false, error: result.error.message }, { status: 400 });

      // Fetch KC superadmins (users with opsid-admin realm role) — best-effort
      const kcAdmins = new Set<string>();
      try {
        const kcRes = await fetch(
          'http://10.34.1.4:8080/realms/master/protocol/openid-connect/token',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: 'client_id=admin-cli&grant_type=password&username=opsid-admin&password=sandiaman2026',
          }
        );
        const kcTok = await kcRes.json();
        if (kcTok.access_token) {
          const roleRes = await fetch(
            'http://10.34.1.4:8080/admin/realms/opsid-internal/roles/opsid-admin/users?max=200',
            { headers: { 'Authorization': `Bearer ${kcTok.access_token}` } }
          );
          if (roleRes.ok) {
            const roleUsers = await roleRes.json();
            for (const u of roleUsers) { if (u.username) kcAdmins.add(u.username); }
          }
        }
      } catch { /* enrichment is best-effort */ }

      const users = (result.result?.result || [])
        .filter((u: any) => !u.uid?.[0]?.startsWith('svc-') && u.uid?.[0] !== 'admin')
        .map((u: any) => {
          const base = mapIpaUser(u);
          if (kcAdmins.has(base.username)) base.role = 'Superadmin';
          return base;
        });

      return json({ success: true, users });
    } catch (err) {
      return json({ success: false, error: String(err) }, { status: 500 });
    }
  }

  // ── Tenant admin: only their tenant's users ──────────────────
  try {
    const row = (await db.query(
      `SELECT tu.role, t.id AS tenant_id, t.slug
       FROM   tenant_users tu
       JOIN   tenants t ON tu.tenant_id = t.id
       WHERE  (tu.username = $1 OR lower(tu.email) = lower($2))
         AND  tu.status = 'active'
       LIMIT  1`,
      [username, email]
    )).rows[0];

    if (!row) return json({ success: false, error: 'Forbidden' }, { status: 403 });
    if (row.role !== 'org-admin') return json({ success: false, error: 'Forbidden' }, { status: 403 });

    const usersResult = await db.query(
      `SELECT username, full_name, email, role, status
       FROM   tenant_users
       WHERE  tenant_id = $1
       ORDER  BY id ASC`,
      [row.tenant_id]
    );

    // If DB has users, return them
    if (usersResult.rows.length > 0) {
      const users = usersResult.rows.map(u => ({
        username: u.username,
        name:     u.full_name || u.username,
        email:    u.email     || '',
        dept:     '-',
        role:     u.role      || 'member',
        status:   u.status    || 'active',
      }));
      return json({ success: true, users });
    }

    // Fallback: try FreeIPA group {slug}-users
    try {
      const cookie = await ipaLogin();
      const groupResult = await ipaCall(cookie, 'user_find', [[]], {
        in_group: [`${row.slug}-users`],
        sizelimit: 200,
        all: true,
      });
      if (!groupResult.error) {
        const users = (groupResult.result?.result || []).map(mapIpaUser);
        return json({ success: true, users, source: 'freeipa_fallback' });
      }
    } catch { /* fallback failed, return empty */ }

    return json({ success: true, users: [] });
  } catch (err) {
    return json({ success: false, error: String(err) }, { status: 500 });
  }
};

// ── KC helpers ────────────────────────────────────────────────────────────────

async function kcAdminToken(): Promise<string> {
  const r = await fetch(`${KC_BASE}/realms/master/protocol/openid-connect/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'client_id=admin-cli&grant_type=password&username=opsid-admin&password=sandiaman2026',
  });
  const d = await r.json();
  if (!d.access_token) throw new Error('KC token gagal');
  return d.access_token;
}

async function kcCreateUser(token: string, username: string, fullname: string, email: string, password: string): Promise<string | null> {
  const names = fullname.trim().split(' ');
  const r = await fetch(`${KC_BASE}/admin/realms/opsid-internal/users`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username, email,
      firstName:     names[0],
      lastName:      names.slice(1).join(' ') || names[0],
      enabled:       true,
      emailVerified: true,
      credentials:   [{ type: 'password', value: password, temporary: false }],
    }),
  });
  if (r.status === 201) {
    const loc = r.headers.get('location');
    return loc ? loc.split('/').pop() ?? null : null;
  }
  if (r.status === 409) {
    // Already exists — find by username
    const sr = await fetch(
      `${KC_BASE}/admin/realms/opsid-internal/users?username=${encodeURIComponent(username)}&exact=true`,
      { headers: { 'Authorization': `Bearer ${token}` } }
    );
    const users = await sr.json().catch(() => []);
    return users[0]?.id ?? null;
  }
  const body = await r.text().catch(() => '');
  throw new Error(`KC user create ${r.status}: ${body.slice(0, 120)}`);
}

async function kcFindOrg(token: string, slug: string, domain: string): Promise<string | null> {
  async function search(q: string): Promise<any[]> {
    const r = await fetch(
      `${KC_BASE}/admin/realms/opsid-internal/organizations?search=${encodeURIComponent(q)}`,
      { headers: { 'Authorization': `Bearer ${token}` } }
    );
    return r.ok ? r.json().catch(() => []) : [];
  }
  const byDomain = await search(domain);
  const m = byDomain.find((o: any) => o.alias === slug || o.domains?.some((d: any) => d.name === domain));
  if (m?.id) return m.id;
  const bySlug = await search(slug);
  return bySlug.find((o: any) => o.alias === slug)?.id ?? null;
}

// ── Derive username from full name + tenant domain ────────────────────────────
function deriveUsername(fullname: string, tenantDomain: string): string {
  const firstName = fullname.trim().split(' ')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
  // OPSID subdomain: use first label  (atom.opsid.web.id → atom)
  // Custom domain:   use first label of mail domain from email
  const labels = tenantDomain.split('.');
  const short = tenantDomain.endsWith('.opsid.web.id')
    ? labels[0]
    : labels[0];
  const username = `${firstName}.${short}`.replace(/[^a-z0-9._-]/g, '').slice(0, 32);
  return username;
}

// ── POST — create user (FreeIPA + Keycloak + DB) ─────────────────────────────

export const POST: RequestHandler = async ({ request, cookies }) => {
  const token   = cookies.get('opsid_token');
  const payload = token ? decodeToken(token) : null;
  if (!payload?.preferred_username)
    return json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const roles: string[] = payload?.realm_access?.roles ?? [];
  const isAdmin = roles.includes('opsid-admin');

  // Resolve tenant: superadmin passes tenantId (null = OPSID platform), tenant admin inferred from session
  let tenantRow: any = null;
  if (isAdmin) {
    const body = await request.clone().json().catch(() => ({}));
    const { tenantId } = body;
    // tenantId null/undefined = OPSID platform user (no tenant)
    if (tenantId) {
      tenantRow = (await db.query(
        `SELECT id, slug, domain, name FROM tenants WHERE id = $1`, [tenantId]
      ).catch(() => ({ rows: [] }))).rows[0];
      if (!tenantRow) return json({ success: false, error: 'Tenant tidak ditemukan' }, { status: 404 });
    }
    // tenantRow stays null for platform users — handled below
  } else {
    tenantRow = (await db.query(
      `SELECT t.id, t.slug, t.domain, t.name
       FROM   tenant_users tu JOIN tenants t ON tu.tenant_id = t.id
       WHERE  (tu.username = $1 OR lower(tu.email) = lower($2))
         AND  tu.role = 'org-admin' AND tu.status = 'active'
       LIMIT  1`,
      [payload.preferred_username, payload.email ?? '']
    ).catch(() => ({ rows: [] }))).rows[0];
    if (!tenantRow) return json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  const { fullname, email, password, role } = await request.json();
  if (!fullname?.trim() || !email?.trim() || !password)
    return json({ success: false, error: 'Nama, email, dan password wajib diisi' }, { status: 400 });

  const cleanEmail    = email.trim().toLowerCase();
  const cleanFullname = fullname.trim();
  const isPlatform    = !tenantRow; // no tenant = OPSID platform user
  const domain        = isPlatform ? 'opsid.web.id' : tenantRow.domain;
  const username      = deriveUsername(cleanFullname, domain);
  const dbRole        = role === 'org-admin' ? 'org-admin' : 'member';

  try {
    // 1. FreeIPA user
    const ipaCookie = await ipaLogin();
    const names     = cleanFullname.split(' ');
    const ipaRes    = await ipaCall(ipaCookie, 'user_add', [username], {
      givenname:        names[0],
      sn:               names.slice(1).join(' ') || names[0],
      cn:               names[0],
      mail:             cleanEmail,
      userpassword:     password,
      departmentnumber: isPlatform ? ['opsid'] : [tenantRow.slug],
      title:            dbRole,
    });
    if (ipaRes.error && !ipaRes.error.message?.includes('already exists'))
      return json({ success: false, error: ipaRes.error.message }, { status: 400 });

    // Extend password expiry
    await ipaCall(ipaCookie, 'user_mod', [username], {
      setattr: 'krbpasswordexpiration=20301231000000Z',
    }).catch(() => null);

    // Add to tenant group (skip for platform users)
    if (!isPlatform) {
      await ipaCall(ipaCookie, 'group_add_member', [`${tenantRow.slug}-users`], { user: username }).catch(() => null);
    }

    // 2. Keycloak user
    const kcToken  = await kcAdminToken();
    const kcUserId = await kcCreateUser(kcToken, username, cleanFullname, cleanEmail, password);

    // Add to KC org (tenant users only)
    if (kcUserId && !isPlatform) {
      const orgId = await kcFindOrg(kcToken, tenantRow.slug, tenantRow.domain);
      if (orgId) {
        await fetch(`${KC_BASE}/admin/realms/opsid-internal/organizations/${orgId}/members`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${kcToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(kcUserId),
        }).catch(() => null);
      }
    }

    // 3. DB record (tenant users only)
    if (!isPlatform) {
      await db.query(
        `INSERT INTO tenant_users (tenant_id, username, email, full_name, role, is_admin, status)
         VALUES ($1,$2,$3,$4,$5,$6,'active')
         ON CONFLICT (tenant_id, username) DO UPDATE
           SET email=$3, full_name=$4, role=$5, is_admin=$6`,
        [tenantRow.id, username, cleanEmail, cleanFullname, dbRole, dbRole === 'org-admin']
      );
    }

    return json({ success: true, username, message: `User ${cleanFullname} (${username}) berhasil dibuat.` });
  } catch (err) {
    return json({ success: false, error: String(err) }, { status: 500 });
  }
};
