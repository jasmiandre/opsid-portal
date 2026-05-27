import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import db from '$lib/db';

const NGINX_API  = 'http://10.34.1.1:8080';
const KC_BASE    = 'https://auth.opsid.web.id';
const FREEIPA_URL = 'https://ipa.opsid.web.id/ipa';
const FREEIPA_ADMIN = 'admin';
const FREEIPA_PASS = 'Sandiaman2026';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const PORTAL_UPSTREAM = '10.34.1.2:3000';

function generateSlug(name: string): string {
  return name.toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
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

async function ipaLogin(): Promise<string> {
  const res = await fetch(`${FREEIPA_URL}/session/login_password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Referer': FREEIPA_URL,
      'Accept': 'text/plain',
    },
    body: `user=${FREEIPA_ADMIN}&password=${encodeURIComponent(FREEIPA_PASS)}`,
  });

  if (!res.ok) throw new Error(`FreeIPA login failed: ${res.status}`);
  return res.headers.get('set-cookie') || '';
}

async function ipaCall(cookie: string, method: string, args: any[], kwargs: any = {}): Promise<any> {
  const res = await fetch(`${FREEIPA_URL}/session/json`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Referer': FREEIPA_URL,
      'Cookie': cookie,
    },
    body: JSON.stringify({
      method,
      params: [args, kwargs],
      id: 0,
    }),
  });

  const data = await res.json();
  if (data.error) throw new Error(`FreeIPA ${method} failed: ${data.error.message}`);
  return data;
}


async function createKeycloakOrg(slug: string, name: string, domain: string): Promise<string | null> {
  const token = await getKcToken();
  const res = await fetch(`${KC_BASE}/admin/realms/opsid-internal/organizations`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, alias: slug, domains: [{ name: domain, verified: false }] }),
  });
  if (res.status === 201) {
    const loc = res.headers.get('location');
    return loc ? loc.split('/').pop() ?? null : null;
  }
  return null;
}

async function createKcUser(slug: string, adminName: string, adminPassword: string, domain: string): Promise<string | null> {
  const token = await getKcToken();
  const names = adminName.split(' ');
  const res = await fetch(`${KC_BASE}/admin/realms/opsid-internal/users`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: `admin.${slug}`,
      email: `admin@${domain}`,
      firstName: names[0],
      lastName: names.slice(1).join(' ') || slug,
      enabled: true,
      emailVerified: true,
      credentials: [{ type: 'password', value: adminPassword, temporary: false }],
    }),
  });
  if (res.status === 201) {
    const loc = res.headers.get('location');
    return loc ? loc.split('/').pop() ?? null : null;
  }
  return null;
}

async function assignOrgAdmin(orgId: string, userId: string): Promise<void> {
  const token = await getKcToken();
  // Tambah user ke organization dulu
  await fetch(`${KC_BASE}/admin/realms/opsid-internal/organizations/${orgId}/members`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: userId }),
  });
}

async function createFreeIPAGroup(slug: string): Promise<void> {
  const cookie = await ipaLogin();
  await ipaCall(cookie, 'group_add', [`${slug}-users`], {
    description: `Users for tenant ${slug}`,
    nonposix: true,
  });
}

async function createFreeIPAUser(slug: string, adminName: string, adminPassword: string, domain: string): Promise<void> {
  const cookie = await ipaLogin();
  const names = adminName.trim().split(' ');
  const username = `admin.${slug}`;

  await ipaCall(cookie, 'user_add', [username], {
    givenname: names[0],
    sn: names.slice(1).join(' ') || slug,
    cn: adminName,
    mail: `admin@${domain}`,
    userpassword: adminPassword,
    departmentnumber: [slug],
    title: 'org-admin',
  });

  await ipaCall(cookie, 'group_add_member', [`${slug}-users`], {
    user: username,
  });
}

export const GET: RequestHandler = async () => {
  try {
    const result = await db.query(`
      SELECT t.*, COUNT(tu.id) as user_count
      FROM tenants t
      LEFT JOIN tenant_users tu ON t.id = tu.tenant_id
      GROUP BY t.id
      ORDER BY t.created_at DESC
    `);
    return json({ ok: true, tenants: result.rows });
  } catch (e) {
    return json({ ok: false, error: String(e) }, { status: 500 });
  }
};

export const POST: RequestHandler = async ({ request }) => {
  const {
    name, slug: inputSlug, primaryColor, logoUrl,
    useCustomDomain, domain,
    planNextcloudGb, planEmailGb, planOdooGb,
    adminName, adminPassword,
  } = await request.json();

  if (!name) return json({ error: 'name wajib' }, { status: 400 });

  const slug = (inputSlug || generateSlug(name)).trim();
  const tenantDomain = useCustomDomain && domain ? domain : `${slug}.opsid.web.id`;

  try {
    // 1. Simpan ke PostgreSQL
    const result = await db.query(`
      INSERT INTO tenants (name, slug, domain, primary_color, logo_url, plan_nextcloud_gb, plan_email_gb, plan_odoo_gb)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [name, slug, tenantDomain,
        primaryColor || '#5B86FF', logoUrl || '',
        planNextcloudGb || 50, planEmailGb || 50, planOdooGb || 50]);

    const tenant = result.rows[0];

    // 2. Buat Nginx site via HTTP API (bukan SSH)
    await fetch(`${NGINX_API}/site/add`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ domain: tenantDomain, slug, upstream: PORTAL_UPSTREAM }),
    }).catch(() => null);

    // 3. Buat FreeIPA group
    await createFreeIPAGroup(slug).catch(() => null);

    // 4. Buat Keycloak Organization
    const orgId = await createKeycloakOrg(slug, name, tenantDomain).catch(() => null);

    // 5. Buat user admin jika disediakan
if (adminName && adminPassword) {
  const adminUsername = `admin.${slug}`;
  const adminEmail = `admin@${tenantDomain}`;

  await createFreeIPAUser(slug, adminName, adminPassword, tenantDomain);

  await db.query(
    `INSERT INTO tenant_users (tenant_id, username, email, full_name, role, is_admin, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (tenant_id, username)
     DO UPDATE SET email = EXCLUDED.email,
                   full_name = EXCLUDED.full_name,
                   role = EXCLUDED.role,
                   is_admin = EXCLUDED.is_admin,
                   status = EXCLUDED.status`,
    [tenant.id, adminUsername, adminEmail, adminName, 'org-admin', true, 'active']
  );
}
    // 6. Audit log
    await db.query(
      `INSERT INTO audit_logs (actor, action, target, metadata) VALUES ($1, $2, $3, $4)`,
      ['system', 'CREATE_TENANT', tenantDomain, JSON.stringify({ name, slug })]
    );

    return json({ ok: true, tenant });
  } catch (e) {
    return json({ ok: false, error: String(e) }, { status: 500 });
  }
};
