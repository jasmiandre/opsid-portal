import db from '$lib/db';
import { randomBytes } from 'crypto';
import { execSync } from 'child_process';
import nodemailer from 'nodemailer';

const NGINX_API    = 'http://10.34.1.1:8080';
const KC_BASE      = 'http://10.34.1.4:8080'; // internal; hairpin NAT blocks public IP from server
const FREEIPA_URL  = 'https://ipa.opsid.web.id/ipa';
const FREEIPA_ADMIN = 'admin';
const FREEIPA_PASS  = 'Sandiaman2026';
const PORTAL_UPSTREAM = '10.34.1.2:3000';
const MAIL_API     = 'http://10.34.1.6:8082';

// ── Nextcloud ──────────────────────────────────────────────────
const NC_INTERNAL = 'http://files.opsid.web.id:8080';
const NC_ADMIN    = 'admin';
const NC_PASS     = 'VqscHz0m1mrJWvjWofR81Dupuft3VLrrPRPzdkDC6Os9fDYEWIpLA5lbOcNv5p753jRJEnDN';
const NC_AUTH     = 'Basic ' + Buffer.from(`${NC_ADMIN}:${NC_PASS}`).toString('base64');
const NC_HEADS    = {
  'Authorization':  NC_AUTH,
  'OCS-APIRequest': 'true',
  'Host':           'files.opsid.web.id',
};

// ── Odoo ───────────────────────────────────────────────────────
const ODOO_URL      = 'http://10.34.1.8:8069';
const ODOO_DB       = 'odoo_db';
const ODOO_ADMIN    = 'admin';
const ODOO_PASS     = 'Sandiaman2026';
const ODOO_KC_PROV  = 4; // OPSID SSO auth.oauth.provider id

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// ── Email sender ───────────────────────────────────────────────
// Uses Postfix on mail-01 as smarthost (internal SMTP, no auth needed).
const mailer = nodemailer.createTransport({
  host:    '10.34.1.6',
  port:    25,
  secure:  false,
  tls:     { rejectUnauthorized: false },
});

export async function sendWelcomeEmail(opts: {
  toEmail:    string;
  toName:     string;
  company:    string;
  domain:     string;
  username:   string;
  password:   string;
}): Promise<void> {
  const { toEmail, toName, company, domain, username, password } = opts;
  const workspaceUrl = `https://${domain}`;
  const firstName    = toName.split(' ')[0];

  await mailer.sendMail({
    from:    '"OPSID Workspace" <noreply@opsid.web.id>',
    to:      toEmail,
    subject: `[OPSID] Workspace ${company} sudah aktif — Kredensial Login`,
    text: [
      `Halo ${firstName},`,
      ``,
      `Workspace OPSID untuk ${company} sudah berhasil diaktifkan.`,
      ``,
      `=== INFORMASI LOGIN ===`,
      `URL Workspace : ${workspaceUrl}`,
      `Username      : ${username}`,
      `Password      : ${password}`,
      ``,
      `Langkah pertama:`,
      `1. Buka ${workspaceUrl}`,
      `2. Klik "Masuk dengan SSO"`,
      `3. Masukkan username dan password di atas`,
      `4. Kamu akan masuk ke dashboard OPSID`,
      ``,
      `Setelah login, kamu bisa mengakses semua aplikasi dari sidebar portal.`,
      `Klik "Mail", "Drive", atau "Odoo ERP" di sidebar setelah masuk.`,
      ``,
      `Simpan email ini. Jika ada masalah, balas email ini atau hubungi admin OPSID.`,
      ``,
      `Salam,`,
      `Tim OPSID`,
    ].join('\n'),
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0a0b0d; color: #e2e8f0; margin: 0; padding: 0; }
  .wrap { max-width: 540px; margin: 40px auto; background: #111318; border: 1px solid #1e2330; border-radius: 12px; overflow: hidden; }
  .header { background: linear-gradient(135deg, #1a1f2e 0%, #0f1319 100%); padding: 32px 36px 24px; border-bottom: 1px solid #1e2330; }
  .logo { font-size: 20px; font-weight: 700; color: #5b86ff; letter-spacing: .04em; }
  .logo-sub { font-size: 11px; color: #4a5568; margin-top: 2px; }
  .body { padding: 32px 36px; }
  h2 { font-size: 18px; color: #f1f5f9; margin: 0 0 8px; }
  p { font-size: 14px; color: #94a3b8; line-height: 1.6; margin: 0 0 16px; }
  .creds { background: #0d1117; border: 1px solid #1e2330; border-radius: 8px; padding: 20px 24px; margin: 24px 0; }
  .cred-row { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid #1a1f2e; }
  .cred-row:last-child { border-bottom: none; }
  .cred-label { font-size: 11px; color: #4a5568; text-transform: uppercase; letter-spacing: .06em; }
  .cred-value { font-family: 'SF Mono', Monaco, Consolas, monospace; font-size: 13px; color: #e2e8f0; font-weight: 600; }
  .url-val { color: #5b86ff; }
  .btn { display: inline-block; margin: 4px 0 24px; padding: 12px 28px; background: #5b86ff; color: #fff; font-size: 14px; font-weight: 600; text-decoration: none; border-radius: 8px; }
  .apps { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin: 20px 0; }
  .app { background: #0d1117; border: 1px solid #1e2330; border-radius: 8px; padding: 12px; text-align: center; text-decoration: none; }
  .app-name { font-size: 12px; color: #94a3b8; margin-top: 4px; }
  .footer { padding: 16px 36px; border-top: 1px solid #1e2330; font-size: 11px; color: #4a5568; text-align: center; }
</style></head>
<body>
<div class="wrap">
  <div class="header">
    <div class="logo">OPSID</div>
    <div class="logo-sub">Open Platform Sovereign Indonesia</div>
  </div>
  <div class="body">
    <h2>Workspace ${company} sudah aktif 🎉</h2>
    <p>Halo <strong>${firstName}</strong>, workspace OPSID kamu sudah siap digunakan.</p>

    <div class="creds">
      <div class="cred-row">
        <span class="cred-label">URL Workspace</span>
        <span class="cred-value url-val">${workspaceUrl}</span>
      </div>
      <div class="cred-row">
        <span class="cred-label">Username</span>
        <span class="cred-value">${username}</span>
      </div>
      <div class="cred-row">
        <span class="cred-label">Password</span>
        <span class="cred-value">${password}</span>
      </div>
    </div>

    <a href="${workspaceUrl}" class="btn">Masuk ke Workspace →</a>

    <p style="font-size:13px;color:#64748b;margin-bottom:8px">Setelah login, kamu dapat mengakses:</p>
    <div class="apps">
      <a href="${workspaceUrl}" class="app">
        <div style="font-size:20px">📧</div>
        <div class="app-name">Mail</div>
      </a>
      <a href="${workspaceUrl}" class="app">
        <div style="font-size:20px">📁</div>
        <div class="app-name">Drive</div>
      </a>
      <a href="${workspaceUrl}" class="app">
        <div style="font-size:20px">📊</div>
        <div class="app-name">ERP</div>
      </a>
    </div>

    <p style="font-size:12px;color:#4a5568">Simpan email ini. Jika ada pertanyaan, balas email ini atau hubungi tim OPSID.</p>
  </div>
  <div class="footer">© 2026 OPSID — Open Platform Sovereign Indonesia</div>
</div>
</body>
</html>`,
  });
}

// ── Postfix domain registration (via mail-api) ─────────────────
async function registerPostfixDomain(domain: string): Promise<void> {
  const res = await fetch(`${MAIL_API}/postfix/domain/add`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ domain }),
  });
  const data = await res.json().catch(() => ({}));
  if (!data.ok) throw new Error(data.error ?? `mail-api postfix/domain/add HTTP ${res.status}`);
}

/**
 * Generate (or retrieve existing) DKIM key for a mail domain.
 * Returns the public key TXT record value, or null on failure.
 */
async function generateDkim(mailDomain: string, selector = 'mail'): Promise<string | null> {
  // Try generate first
  try {
    const res  = await fetch(`${MAIL_API}/dkim/generate`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ domain: mailDomain, selector }),
    });
    const data = await res.json().catch(() => ({}));
    if (data.ok && data.public_key_txt) return data.public_key_txt;
  } catch { /* fall through to status check */ }

  // Key may already exist — fetch it
  try {
    const res  = await fetch(`${MAIL_API}/dkim/status?domain=${encodeURIComponent(mailDomain)}&selector=${encodeURIComponent(selector)}`);
    const data = await res.json().catch(() => ({}));
    if (data.ok && data.public_key_txt) return data.public_key_txt;
  } catch { /* ignore */ }

  return null;
}

// ── Post-provisioning smoke test ───────────────────────────────
export interface SmokeResult {
  kc_user:    boolean;
  nc_user:    boolean;
  sogo_path:  boolean;
  details:    Record<string, string>;
}

export async function smokeTestTenant(slug: string, domain: string): Promise<SmokeResult> {
  const tenantRes = await db.query(
    `SELECT tu.username
       FROM tenant_users tu
       JOIN tenants t ON t.id = tu.tenant_id
      WHERE t.slug = $1 OR t.domain = $2
      ORDER BY tu.is_admin DESC, tu.id ASC
      LIMIT 1`,
    [slug, domain]
  );

  const adminUsername = tenantRes.rows[0]?.username || deriveUsernameFromEmail(`admin@${domain}`, domain);
  const details: Record<string, string> = {};
  let kc_user = false, nc_user = false, sogo_path = false;

  // 1. KC user exists
  try {
    const uid = await findKcUserByUsername(adminUsername);
    kc_user = !!uid;
    details.kc_user = uid ? `user ID ${uid}` : 'not found';
  } catch (e: any) {
    details.kc_user = String(e);
  }

  // 2. NC user exists
  try {
    const ncRes = await fetch(
      `${NC_INTERNAL}/ocs/v1.php/cloud/users/${encodeURIComponent(adminUsername)}?format=json`,
      { headers: NC_HEADS }
    );
    const ncData = await ncRes.json().catch(() => ({}));
    const code = ncData?.ocs?.meta?.statuscode;
    nc_user = code === 100;
    details.nc_user = `OCS code ${code}`;
  } catch (e: any) {
    details.nc_user = String(e);
  }

  // 3. SOGo path reachable (just check nginx responds for /SOGo/)
  try {
    const sogoRes = await fetch(`https://${domain}/SOGo/`, {
      redirect: 'manual',
      signal:   AbortSignal.timeout(8000),
    });
    // 401 = auth_request rejected (unauthenticated) = SOGo proxy is working
    // 302/200 = also fine
    sogo_path = sogoRes.status !== 0;
    details.sogo_path = `HTTP ${sogoRes.status}`;
  } catch (e: any) {
    details.sogo_path = String(e);
  }

  return { kc_user, nc_user, sogo_path, details };
}

// ── Types ─────────────────────────────────────────────────────

export interface ProvisionInput {
  name:            string;
  slug:            string;
  domain:          string;
  domain_type?:    'subdomain' | 'custom_domain';
  primaryColor?:   string;
  logoUrl?:        string;
  planNextcloudGb?: number;
  planEmailGb?:    number;
  planOdooGb?:     number;
  maxUsers?:       number;
  planTier?:       string;
  adminName:       string;
  adminEmail?:      string;
  adminUsername?:   string;
  adminPassword:   string;
  createdBy?:      string;
}

export interface StepResult {
  step:   string;
  ok:     boolean;
  error?: string;
}

export interface ProvisionResult {
  ok:          boolean;
  tenant?:     Record<string, any>;
  adminUsername?: string;
  steps:       StepResult[];
  error?:      string;
}

// ── Helpers ────────────────────────────────────────────────────

export function generateSlug(name: string): string {
  return name.toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export function generatePassword(): string {
  return randomBytes(12).toString('base64url').slice(0, 16);
}

async function getKcToken(): Promise<string> {
  const res = await fetch(`${KC_BASE}/realms/master/protocol/openid-connect/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'client_id=admin-cli&grant_type=password&username=opsid-admin&password=sandiaman2026',
  });
  const d = await res.json();
  if (!d.access_token) throw new Error('KC token fetch failed');
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
    body: JSON.stringify({ method, params: [args, kwargs], id: 0 }),
  });
  const data = await res.json();
  if (data.error) throw new Error(`FreeIPA ${method}: ${data.error.message}`);
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
    // Try Location header first (standard KC response)
    const loc = res.headers.get('location');
    if (loc) {
      const fromLoc = loc.split('/').pop() ?? null;
      if (fromLoc) return fromLoc;
    }
    // Fallback: search by alias (Location header missing in some KC versions)
    const searchRes = await fetch(
      `${KC_BASE}/admin/realms/opsid-internal/organizations?search=${encodeURIComponent(slug)}&exact=true`,
      { headers: { 'Authorization': `Bearer ${token}` } }
    );
    const orgs: any[] = await searchRes.json().catch(() => []);
    return orgs.find((o: any) => o.alias === slug)?.id ?? null;
  }
  const text = await res.text().catch(() => '');
  throw new Error(`KC org create status ${res.status}: ${text.slice(0, 200)}`);
}


function deriveUsernameFromEmail(email: string, domain: string): string {
  const local = email.split('@')[0].toLowerCase().replace(/[^a-z0-9._-]/g, '');

  // Pilih bagian identitas tenant:
  //
  // OPSID subdomain (*.opsid.web.id):
  //   → gunakan label pertama domain → "atom.opsid.web.id"  = "atom"
  //   → "kreasinus.opsid.web.id" = "kreasinus"
  //
  // Custom domain (tidak berakhiran .opsid.web.id):
  //   → gunakan label pertama EMAIL domain, bukan portal domain
  //   → karena portal domain sering generik ("workspace", "portal", "app")
  //   → dedi@1ds.biz.id  + portal.1ds.biz.id  → "1ds"  (bukan "portal")
  //   → andrean@1go.biz.id + workspace.1go.biz.id → "1go" (bukan "workspace")
  let tenantShort: string;
  const lowerDomain = domain.toLowerCase();

  if (lowerDomain === 'opsid.web.id' || lowerDomain.endsWith('.opsid.web.id')) {
    // OPSID subdomain: pakai label pertama portal domain
    tenantShort = lowerDomain.split('.')[0];
  } else {
    // Custom domain: pakai label pertama email domain
    const emailDomain = (email.split('@')[1] ?? '').toLowerCase();
    tenantShort = emailDomain.split('.')[0] || lowerDomain.split('.')[0];
  }

  let username = `${local}.${tenantShort}`.replace(/[^a-z0-9._-]/g, '');
  if (username.length > 32) username = username.slice(0, 32);
  return username;
}

async function createKcUser(slug: string, adminUsername: string, adminName: string, adminPassword: string, adminEmail: string): Promise<string | null> {
  const token = await getKcToken();
  const names = adminName.split(' ');
  const res = await fetch(`${KC_BASE}/admin/realms/opsid-internal/users`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username:      adminUsername,
      email:         adminEmail,
      firstName:     names[0],
      lastName:      names.slice(1).join(' ') || slug,
      enabled:       true,
      emailVerified: true,
      credentials:   [{ type: 'password', value: adminPassword, temporary: false }],
    }),
  });
  if (res.status === 201) {
    const loc = res.headers.get('location');
    return loc ? loc.split('/').pop() ?? null : null;
  }
  const text = await res.text().catch(() => '');
  throw new Error(`KC user create status ${res.status}: ${text.slice(0, 200)}`);
}

async function findKcUserByUsername(username: string): Promise<string | null> {
  const token = await getKcToken();
  const res = await fetch(
    `${KC_BASE}/admin/realms/opsid-internal/users?username=${encodeURIComponent(username)}&exact=true`,
    { headers: { 'Authorization': `Bearer ${token}` } }
  );
  if (!res.ok) return null;
  const users = await res.json();
  return users[0]?.id ?? null;
}

async function assignOrgMember(orgId: string, userId: string): Promise<void> {
  const token = await getKcToken();
  const res = await fetch(`${KC_BASE}/admin/realms/opsid-internal/organizations/${orgId}/members`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(userId),
  });
  if (!res.ok && res.status !== 409) {
    throw new Error(`KC assignOrgMember failed: ${res.status}`);
  }
}

// ── KC client portal: sync redirect URIs ──────────────────────
export async function syncKcClientRedirectUri(domain: string): Promise<void> {
  const token = await getKcToken();

  // 1. Fetch portal client
  const listRes = await fetch(
    `${KC_BASE}/admin/realms/opsid-internal/clients?clientId=portal`,
    { headers: { 'Authorization': `Bearer ${token}` } }
  );
  if (!listRes.ok) throw new Error(`KC clients list failed: ${listRes.status}`);
  const clients: any[] = await listRes.json();
  if (!clients.length) throw new Error('KC client portal not found');
  const client = clients[0];

  const newRedirect    = `https://${domain}/*`;
  const newOrigin      = `https://${domain}`;
  const newPostLogout  = `https://${domain}`;
  const newPostLogout2 = `https://${domain}/*`;

  // Root portal URIs — selalu pastikan ada (fix logout dari opsid.web.id)
  const rootUris = [
    'https://opsid.web.id',
    'https://opsid.web.id/*',
    'https://*.opsid.web.id/*',
  ];

  const existing   = client.redirectUris  ?? [];
  const existingWO = client.webOrigins    ?? [];

  // Parse ##-separated post-logout redirect URIs (Keycloak 22+ format)
  const existingPostRaw: string = client.attributes?.['post.logout.redirect.uris'] ?? '';
  const existingPost: string[]  = existingPostRaw.split('##').map((s: string) => s.trim()).filter(Boolean);

  // 2. Idempotent: skip if all already present
  const alreadyHasPost = existingPost.includes(newPostLogout) && existingPost.includes(newPostLogout2)
    && rootUris.every(u => existingPost.includes(u));
  if (existing.includes(newRedirect) && existingWO.includes(newOrigin) && alreadyHasPost) return;

  const redirectUris = Array.from(new Set([...existing,     newRedirect]));
  const webOrigins   = Array.from(new Set([...existingWO,   newOrigin]));
  const postLogout   = Array.from(new Set([
    ...existingPost, ...rootUris, newPostLogout, newPostLogout2,
  ])).join('##');

  const updatedClient = {
    ...client,
    redirectUris,
    webOrigins,
    attributes: { ...(client.attributes ?? {}), 'post.logout.redirect.uris': postLogout },
  };

  // 3. PUT full client back (KC requires full representation)
  const putRes = await fetch(
    `${KC_BASE}/admin/realms/opsid-internal/clients/${client.id}`,
    {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedClient),
    }
  );
  if (!putRes.ok) {
    const body = await putRes.text().catch(() => '');
    throw new Error(`KC client PUT failed ${putRes.status}: ${body.slice(0, 200)}`);
  }
}

// ── KC redirect URIs for tenant drive/erp subdomains ──────────
async function addKcRedirectUrisForTenant(driveDomain: string, erpDomain: string): Promise<void> {
  const token = await getKcToken();

  async function updateClient(clientId: string, newUris: string[], newOrigins: string[] = []): Promise<void> {
    const listRes = await fetch(`${KC_BASE}/admin/realms/opsid-internal/clients?clientId=${clientId}`,
      { headers: { 'Authorization': `Bearer ${token}` } });
    const clients: any[] = await listRes.json();
    if (!clients.length) throw new Error(`KC client ${clientId} not found`);
    const client = clients[0];

    const uris    = Array.from(new Set([...(client.redirectUris ?? []), ...newUris]));
    const origins = Array.from(new Set([...(client.webOrigins  ?? []), ...newOrigins]));
    if (uris.length === (client.redirectUris ?? []).length && origins.length === (client.webOrigins ?? []).length) return;

    const res = await fetch(`${KC_BASE}/admin/realms/opsid-internal/clients/${client.id}`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...client, redirectUris: uris, webOrigins: origins }),
    });
    if (!res.ok) throw new Error(`KC PUT ${clientId} failed ${res.status}`);
  }

  await updateClient('nextcloud', [`https://${driveDomain}/*`, `https://${driveDomain}/apps/user_oidc/code`]);
  await updateClient('odoo', [`https://${erpDomain}/*`, `https://${erpDomain}/auth_oauth/signin`], [`https://${erpDomain}`]);
}

// ── SSL provisioning via nginx-api (custom domain only) ───────
export async function sslProvision(domain: string, slug: string): Promise<void> {
  const res = await fetch(`${NGINX_API}/ssl/issue`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ domain, slug, upstream: PORTAL_UPSTREAM }),
  });
  const data = await res.json().catch(() => ({}));
  if (!data.ok) throw new Error(data.error ?? `ssl/issue HTTP ${res.status}`);
}

async function createFreeIPAGroup(slug: string): Promise<void> {
  const cookie = await ipaLogin();
  await ipaCall(cookie, 'group_add', [`${slug}-users`], {
    description: `Users for tenant ${slug}`,
    nonposix: true,
  });
}

async function createFreeIPAUser(slug: string, adminUsername: string, adminName: string, adminPassword: string, adminEmail: string): Promise<void> {
  const cookie = await ipaLogin();
  const names = adminName.trim().split(' ');
  const username = adminUsername;
  await ipaCall(cookie, 'user_add', [username], {
    givenname:        names[0],
    sn:               names.slice(1).join(' ') || slug,
    cn:               names[0],   // KC mapper: cn → firstName; set to first name only
    mail:             adminEmail,
    userpassword:     adminPassword,
    departmentnumber: [slug],
    title:            'org-admin',
  });
  await ipaCall(cookie, 'group_add_member', [`${slug}-users`], { user: username });

  // FreeIPA marks admin-set passwords as immediately expired (krbPasswordExpiration = now),
  // which causes KC to show "Invalid username or password" on first login.
  // Set expiry to year 2030 so the provisioned tenant admin can log in without a forced change.
  await ipaCall(cookie, 'user_mod', [username], {
    setattr: 'krbpasswordexpiration=20301231000000Z',
  }).catch(() => null); // non-fatal — admin can reset manually if this fails
}

// ── Nextcloud helpers ──────────────────────────────────────────

/** Call OCS API. Returns parsed ocs.meta.statuscode (100=ok, 102=already exists). */
async function ncOcs(method: string, path: string, body?: Record<string, string>): Promise<{ code: number; message: string }> {
  const opts: RequestInit = {
    method,
    headers: { ...NC_HEADS, 'Content-Type': 'application/x-www-form-urlencoded' },
  };
  if (body) opts.body = new URLSearchParams(body).toString();
  const res  = await fetch(`${NC_INTERNAL}/ocs/v1.php${path}?format=json`, opts);
  const data = await res.json().catch(() => ({}));
  const meta = data?.ocs?.meta ?? {};
  return { code: Number(meta.statuscode ?? 0), message: String(meta.message ?? '') };
}

/** Create NC group. Idempotent: statuscode 102 = already exists → ok. */
async function createNcGroup(slug: string): Promise<void> {
  const { code, message } = await ncOcs('POST', '/cloud/groups', { groupid: slug });
  if (code !== 100 && code !== 102) throw new Error(`NC createGroup ${code}: ${message}`);
}

/**
 * Provision NC LDAP user via occ (avoids creating a conflicting local DB user).
 *
 * FreeIPA creates the user in LDAP during earlier provisioning steps. NC's LDAP
 * connector syncs FreeIPA users, but on a schedule. Running `ldap:check-user`
 * forces NC to immediately look up and register the FreeIPA user in NC's account
 * table. This ensures:
 *   1. The NC username matches the FreeIPA uid exactly (no _NNNN suffix).
 *   2. No local Database user is created that would block OIDC soft-auto-provisioning
 *      (user_oidc would otherwise create admin.username_NNNN conflict copies).
 */
async function provisionNcLdapUser(username: string): Promise<void> {
  const safeUser = username.replace(/[^a-zA-Z0-9._-]/g, '');
  if (!safeUser) throw new Error('Invalid username');
  // Run occ ldap:check-user inside the NC Docker container on files-01 (10.34.1.7).
  // This forces NC LDAP to register the user immediately if they exist in FreeIPA LDAP.
  const cmd = [
    'ssh', '-o', 'BatchMode=yes', '-o', 'ConnectTimeout=10',
    '-o', 'StrictHostKeyChecking=no', '10.34.1.7',
    `"docker exec --user www-data nextcloud php occ ldap:check-user ${safeUser}"`,
  ].join(' ');
  try {
    execSync(cmd, { timeout: 20000 });
  } catch (e: any) {
    // "The given user is not a recognized LDAP user" → LDAP sync hasn't run yet.
    // This is non-fatal; NC will pick up the user on next periodic LDAP sync.
    if (!String(e?.stdout ?? e).includes('not a recognized LDAP user')) throw e;
  }
}

/** Set NC user quota. Idempotent (always applies). */
async function setNcQuota(username: string, quotaGb: number): Promise<void> {
  const { code, message } = await ncOcs('PUT', `/cloud/users/${encodeURIComponent(username)}`, {
    key: 'quota', value: `${quotaGb}GB`,
  });
  if (code !== 100) throw new Error(`NC setQuota ${code}: ${message}`);
}

/** Add NC user to group. Idempotent (re-adding is ok → 102 or 100). */
async function addNcUserToGroup(username: string, groupId: string): Promise<void> {
  const { code, message } = await ncOcs('POST', `/cloud/users/${encodeURIComponent(username)}/groups`, {
    groupid: groupId,
  });
  if (code !== 100 && code !== 102) throw new Error(`NC addToGroup ${code}: ${message}`);
}

/**
 * Add a domain to NC trusted_domains so NC accepts requests with that Host header.
 * Required for per-tenant drive subdomains (drive.example.com).
 * Uses occ config:system:set via SSH → docker exec on files-01.
 * Idempotent: reading existing list first, only adds if missing.
 */
async function addNcTrustedDomain(domain: string): Promise<void> {
  const safeDomain = domain.replace(/[^a-zA-Z0-9._-]/g, '');
  if (!safeDomain) throw new Error('Invalid domain');

  // 1. Get current trusted_domains list
  const getCmd = [
    'ssh', '-o', 'BatchMode=yes', '-o', 'ConnectTimeout=10',
    '-o', 'StrictHostKeyChecking=no', '10.34.1.7',
    `"docker exec -u 33 nextcloud php occ config:system:get trusted_domains 2>/dev/null"`,
  ].join(' ');

  let existing: string[] = [];
  try {
    const out = execSync(getCmd, { timeout: 15000 }).toString().trim();
    existing = out.split('\n').map(s => s.trim()).filter(Boolean);
  } catch { /* ignore — treat as empty list */ }

  if (existing.includes(safeDomain)) return; // already trusted

  // 2. Find next available index
  const nextIndex = existing.length;

  // 3. Set the new entry
  const setCmd = [
    'ssh', '-o', 'BatchMode=yes', '-o', 'ConnectTimeout=10',
    '-o', 'StrictHostKeyChecking=no', '10.34.1.7',
    `"docker exec -u 33 nextcloud php occ config:system:set trusted_domains ${nextIndex} --value=${safeDomain}"`,
  ].join(' ');
  execSync(setCmd, { timeout: 15000 });
}

// ── Dovecot quota via SSH ──────────────────────────────────────

/** Set per-user Dovecot quota. Writes to /etc/dovecot/quota-users on mail-01 via SSH. Idempotent. */
async function setDovecotQuota(username: string, quotaGb: number): Promise<void> {
  const quotaBytes = quotaGb * 1024 * 1024 * 1024;
  const safeUser   = username.replace(/[^a-zA-Z0-9._-]/g, '');
  if (!safeUser) throw new Error('Invalid username for Dovecot quota');

  // Upsert the quota line — remove old entry then append fresh one.
  const cmd = [
    'ssh', '-o', 'BatchMode=yes', '-o', 'ConnectTimeout=10',
    '-o', 'StrictHostKeyChecking=no', 'mail-01',
    `"grep -v 'priv/${safeUser}/quota_bytes' /etc/dovecot/quota-users > /tmp/quota-tmp 2>/dev/null || true && ` +
    `echo 'priv/${safeUser}/quota_bytes=${quotaBytes}' >> /tmp/quota-tmp && ` +
    `mv /tmp/quota-tmp /etc/dovecot/quota-users && ` +
    `chmod 644 /etc/dovecot/quota-users && chown root:vmail /etc/dovecot/quota-users 2>/dev/null || true"`,
  ].join(' ');

  execSync(cmd, { timeout: 15000 });
}

// ── Odoo helpers ───────────────────────────────────────────────

async function odooGetSession(): Promise<string> {
  const res = await fetch(`${ODOO_URL}/web/session/authenticate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0', method: 'call', id: 1,
      params: { db: ODOO_DB, login: ODOO_ADMIN, password: ODOO_PASS },
    }),
  });
  const cookie = res.headers.get('set-cookie') ?? '';
  const sid    = cookie.match(/session_id=([^;]+)/)?.[1];
  if (!sid) throw new Error('Odoo session auth failed');
  return `session_id=${sid}`;
}

async function odooCall(session: string, model: string, method: string, args: any[], kwargs: Record<string, any> = {}): Promise<any> {
  const res = await fetch(`${ODOO_URL}/web/dataset/call_kw`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': session },
    body: JSON.stringify({
      jsonrpc: '2.0', method: 'call', id: Math.random(),
      params: { model, method, args, kwargs },
    }),
  });
  const d = await res.json();
  if (d.error) throw new Error(`Odoo ${model}.${method}: ${d.error.data?.message ?? d.error.message}`);
  return d.result;
}

/**
 * Find-or-create Odoo company for a tenant.
 * Uses `website` field as slug sentinel for reliable idempotent lookup.
 * Returns company ID.
 */
async function getOrCreateOdooCompany(session: string, slug: string, name: string, domain: string): Promise<number> {
  // Search by website (stored as slug:// sentinel)
  const sentinel = `opsid-slug:${slug}`;
  const existing: any[] = await odooCall(session, 'res.company', 'search_read',
    [[['website', '=', sentinel]]], { fields: ['id', 'name'], limit: 1 });
  if (existing.length) return existing[0].id;

  const id: number = await odooCall(session, 'res.company', 'create', [{
    name,
    website:  sentinel,
    email:    `admin@${domain}`,
  }]);
  return id;
}

/**
 * Find-or-create Odoo user for tenant admin.
 * Login = admin@{domain}. oauth_uid is set on first KC login.
 */
async function getOrCreateOdooUser(session: string, login: string, name: string, companyId: number): Promise<number> {
  const existing: any[] = await odooCall(session, 'res.users', 'search_read',
    [[['login', '=', login]]], { fields: ['id', 'login', 'company_id'], limit: 1 });
  if (existing.length) {
    // Ensure user is associated with the right company
    const uid = existing[0].id;
    await odooCall(session, 'res.users', 'write', [[uid], {
      company_id:  companyId,
      company_ids: [[4, companyId]],  // link (no unlink)
    }]).catch(() => null);
    return uid;
  }

  const uid: number = await odooCall(session, 'res.users', 'create', [{
    login,
    name,
    company_id:           companyId,
    company_ids:          [[4, companyId]],
    oauth_provider_id:    ODOO_KC_PROV,
    sel_groups_1_10_11:   1,           // Internal User
    active:               true,
  }]);
  return uid;
}

// ── Main Provision Function ────────────────────────────────────

export async function provisionTenant(input: ProvisionInput): Promise<ProvisionResult> {
  const {
    name, slug, domain,
    domain_type = 'subdomain',
    primaryColor = '#5B86FF', logoUrl = '',
    planNextcloudGb = 50, planEmailGb = 50, planOdooGb = 50,
    maxUsers, planTier = 'basic',
    adminName, adminPassword,
    adminEmail: inputAdminEmail,
    adminUsername: inputAdminUsername,
    createdBy = 'system',
  } = input;

  const steps: StepResult[] = [];
  const adminEmail = (inputAdminEmail || `admin@${domain}`).trim().toLowerCase();
  const adminUsername = deriveUsernameFromEmail(adminEmail, domain);

  // ── Pre-flight: duplicate check (abort before any external calls) ──
  try {
    const dup = await db.query(
      `SELECT id, slug, domain FROM tenants WHERE slug = $1 OR domain = $2 LIMIT 1`,
      [slug, domain]
    );
    if (dup.rows.length) {
      const d = dup.rows[0];
      const reason = d.slug === slug ? `slug "${slug}" sudah dipakai` : `domain "${domain}" sudah dipakai`;
      return { ok: false, error: `Duplikat tenant: ${reason}`, steps: [] };
    }
  } catch (e: any) {
    return { ok: false, error: `Duplicate check gagal: ${String(e)}`, steps: [] };
  }

  // ── Step 1: Insert tenant into PostgreSQL (critical — abort if fails) ──
  let tenant: Record<string, any>;
  try {
    const r = await db.query(`
      INSERT INTO tenants (name, slug, domain, primary_color, logo_url,
                           plan_nextcloud_gb, plan_email_gb, plan_odoo_gb,
                           max_users, plan_tier)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      RETURNING *
    `, [name, slug, domain, primaryColor, logoUrl,
        planNextcloudGb, planEmailGb, planOdooGb,
        maxUsers ?? 50, planTier]);
    tenant = r.rows[0];
    steps.push({ step: 'db_tenant', ok: true });
  } catch (e: any) {
    return { ok: false, error: String(e), steps: [{ step: 'db_tenant', ok: false, error: String(e) }] };
  }

  // ── Step 2: Nginx portal vhost (best-effort) ──────────────────
  try {
    const r = await fetch(`${NGINX_API}/site/add`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ domain, slug, upstream: PORTAL_UPSTREAM }),
    });
    steps.push({ step: 'nginx', ok: r.ok, error: r.ok ? undefined : `HTTP ${r.status}` });
  } catch (e: any) {
    steps.push({ step: 'nginx', ok: false, error: String(e) });
  }

  // ── Step 2b: SSL + drive/erp vhosts (custom domain only, best-effort) ─
  if (domain_type === 'custom_domain') {
    // Derive drive/erp subdomains: workspace.example.com → drive/erp.example.com
    const baseDomain  = domain.split('.').slice(1).join('.');
    const driveDomain = `drive.${baseDomain}`;
    const erpDomain   = `erp.${baseDomain}`;

    try {
      await sslProvision(domain, slug);
      steps.push({ step: 'ssl_certbot', ok: true });
    } catch (e: any) {
      steps.push({ step: 'ssl_certbot', ok: false, error: String(e) });
    }

    // Drive vhost + SSL
    try {
      const r = await fetch(`${NGINX_API}/ssl/issue-nc`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nc_domain: driveDomain, portal_domain: domain }),
      });
      steps.push({ step: 'nginx_drive', ok: r.ok, error: r.ok ? undefined : `HTTP ${r.status}` });
    } catch (e: any) {
      steps.push({ step: 'nginx_drive', ok: false, error: String(e) });
    }

    // ERP vhost + SSL
    try {
      const r = await fetch(`${NGINX_API}/ssl/issue-odoo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ erp_domain: erpDomain, portal_domain: domain }),
      });
      steps.push({ step: 'nginx_erp', ok: r.ok, error: r.ok ? undefined : `HTTP ${r.status}` });
    } catch (e: any) {
      steps.push({ step: 'nginx_erp', ok: false, error: String(e) });
    }

    // KC: add drive/erp redirect URIs
    try {
      await addKcRedirectUrisForTenant(driveDomain, erpDomain);
      steps.push({ step: 'kc_redirect_uris', ok: true });
    } catch (e: any) {
      steps.push({ step: 'kc_redirect_uris', ok: false, error: String(e) });
    }

    // NC trusted_domains: add drive subdomain so NC accepts requests with that Host header.
    // Without this, NC returns "Access through untrusted domain" for iframe requests.
    try {
      await addNcTrustedDomain(driveDomain);
      steps.push({ step: 'nc_trusted_domain', ok: true });
    } catch (e: any) {
      steps.push({ step: 'nc_trusted_domain', ok: false, error: String(e) });
    }
  }

  // ── Step 3: FreeIPA group (best-effort, idempotent) ──────────
  try {
    await createFreeIPAGroup(slug);
    steps.push({ step: 'freeipa_group', ok: true });
  } catch (e: any) {
    const msg = String(e);
    const alreadyExists = msg.includes('already exists') || msg.includes('Duplicate') || msg.includes('4002');
    steps.push({ step: 'freeipa_group', ok: alreadyExists, error: alreadyExists ? undefined : msg });
  }

  // ── Step 4: Keycloak Organization (best-effort, idempotent) ──
  let orgId: string | null = null;
  try {
    orgId = await createKeycloakOrg(slug, name, domain);
    steps.push({ step: 'kc_org', ok: true });
  } catch (e: any) {
    const msg = String(e);
    const conflict = msg.includes('409') || msg.includes('already exists');
    steps.push({ step: 'kc_org', ok: conflict, error: conflict ? undefined : msg });
  }

  // Recovery: if orgId is still null (org created but Location header missing,
  // OR org already existed from a conflict), search by alias.
  if (!orgId) {
    try {
      const token = await getKcToken();
      const r = await fetch(
        `${KC_BASE}/admin/realms/opsid-internal/organizations?search=${encodeURIComponent(slug)}&exact=true`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      const orgs: any[] = await r.json().catch(() => []);
      orgId = orgs.find((o: any) => o.alias === slug)?.id ?? null;
    } catch { /* best-effort */ }
  }

  // ── Step 5: FreeIPA user (best-effort, idempotent) ───────────
  try {
    await createFreeIPAUser(slug, adminUsername, adminName, adminPassword, adminEmail);
    steps.push({ step: 'freeipa_user', ok: true });
  } catch (e: any) {
    const msg = String(e);
    const alreadyExists = msg.includes('already exists') || msg.includes('Duplicate') || msg.includes('4002');
    steps.push({ step: 'freeipa_user', ok: alreadyExists, error: alreadyExists ? undefined : msg });
  }

  // ── Step 6: Keycloak user (best-effort, idempotent) ──────────
  let kcUserId: string | null = null;
  try {
    kcUserId = await createKcUser(slug, adminUsername, adminName, adminPassword, adminEmail);
    if (!kcUserId) kcUserId = await findKcUserByUsername(adminUsername);
    steps.push({ step: 'kc_user', ok: !!kcUserId, error: kcUserId ? undefined : 'user not found after create' });
  } catch (e: any) {
    const msg = String(e);
    const conflict = msg.includes('409') || msg.includes('User exists');
    steps.push({ step: 'kc_user', ok: conflict, error: conflict ? undefined : msg });
    // Always try to recover userId regardless
    kcUserId = await findKcUserByUsername(adminUsername).catch(() => null);
  }

  // ── Step 6b: KC org membership ────────────────────────────────
  // Retry up to 3x with 1s delay — KC search index sometimes lags after user create.
  if (orgId) {
    if (!kcUserId) {
      // One extra lookup with small delay before giving up
      await new Promise(r => setTimeout(r, 1500));
      kcUserId = await findKcUserByUsername(adminUsername).catch(() => null);
    }
    if (kcUserId) {
      let memberOk = false;
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          await assignOrgMember(orgId, kcUserId);
          memberOk = true;
          break;
        } catch (e: any) {
          if (attempt < 2) await new Promise(r => setTimeout(r, 1000));
          else steps.push({ step: 'kc_org_member', ok: false, error: String(e) });
        }
      }
      if (memberOk) steps.push({ step: 'kc_org_member', ok: true });
    } else {
      steps.push({
        step: 'kc_org_member', ok: false,
        error: `skipped: kcUserId=null orgId=${orgId}`,
      });
    }
  } else {
    steps.push({
      step: 'kc_org_member', ok: false,
      error: `skipped: orgId=null`,
    });
  }

  // ── Step 7: tenant_users record (best-effort) ─────────────────
  try {
    await db.query(
      `INSERT INTO tenant_users (tenant_id, username, email, full_name, role, is_admin, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT (tenant_id, username) DO UPDATE
         SET email=$3, full_name=$4, role=$5, is_admin=$6, status=$7`,
      [tenant.id, adminUsername, adminEmail, adminName, 'org-admin', true, 'active']
    );
    steps.push({ step: 'tenant_users', ok: true });
  } catch (e: any) {
    steps.push({ step: 'tenant_users', ok: false, error: String(e) });
  }

  // ── Step 8: KC client portal — sync redirect URIs (best-effort) ─
  try {
    await syncKcClientRedirectUri(domain);
    steps.push({ step: 'kc_redirect_uri', ok: true });
  } catch (e: any) {
    steps.push({ step: 'kc_redirect_uri', ok: false, error: String(e) });
  }

  // ── Step 9: Nextcloud group (best-effort) ─────────────────────
  try {
    await createNcGroup(slug);
    steps.push({ step: 'nc_group', ok: true });
  } catch (e: any) {
    steps.push({ step: 'nc_group', ok: false, error: String(e) });
  }

  // ── Step 10: Nextcloud LDAP sync + quota + group membership ──────
  // NOTE: We intentionally do NOT create a local Database user in NC.
  // The FreeIPA user was created in step 6; here we force NC's LDAP connector
  // to register it immediately, then set quota + group.
  // Creating a local DB user would conflict with OIDC soft-auto-provisioning.
  //
  // Retry logic: occ ldap:check-user triggers sync but NC may need 1-3s to
  // fully commit the user before OCS setQuota/addToGroup works (OCS 998 = not found).
  try {
    await provisionNcLdapUser(adminUsername);
    let ncOk = false;
    for (let attempt = 0; attempt < 3; attempt++) {
      if (attempt > 0) {
        // Wait for NC LDAP to finish committing the user, then re-trigger check
        await new Promise(r => setTimeout(r, 2500));
        await provisionNcLdapUser(adminUsername).catch(() => {});
      }
      try {
        await setNcQuota(adminUsername, planNextcloudGb);
        await addNcUserToGroup(adminUsername, slug);
        ncOk = true;
        break;
      } catch (ncErr: any) {
        // 998 = user not found in NC yet — retry
        if (!String(ncErr).includes('998') || attempt === 2) throw ncErr;
      }
    }
    steps.push({ step: 'nc_user', ok: ncOk });
  } catch (e: any) {
    steps.push({ step: 'nc_user', ok: false, error: String(e) });
  }

  // ── Step 11: Dovecot mailbox quota (best-effort) ───────────────
  try {
    await setDovecotQuota(adminUsername, planEmailGb);
    steps.push({ step: 'sogo_quota', ok: true });
  } catch (e: any) {
    steps.push({ step: 'sogo_quota', ok: false, error: String(e) });
  }

  // ── Step 12: Odoo company + user (best-effort) ────────────────
  try {
    const odooSess    = await odooGetSession();
    const companyId   = await getOrCreateOdooCompany(odooSess, slug, name, domain);
    // Gunakan adminEmail (email user utama) sebagai Odoo login agar sesuai SSO
    await getOrCreateOdooUser(odooSess, adminEmail, adminName, companyId);
    steps.push({ step: 'odoo_company', ok: true });
    steps.push({ step: 'odoo_user',    ok: true });
  } catch (e: any) {
    const msg = String(e);
    // Split into two steps so the log is granular
    if (!steps.find(s => s.step === 'odoo_company')) {
      steps.push({ step: 'odoo_company', ok: false, error: msg });
    }
    steps.push({ step: 'odoo_user', ok: false, error: msg });
  }

  // ── Step 13: Mail domain — postfix registration + DKIM generation ─
  // Derive the correct mail domain from the admin email address.
  // e.g. jasmi@1go.biz.id → mail domain = 1go.biz.id
  // For subdomain tenants: fall back to slug.opsid.web.id.
  const mailDomain = (() => {
    const fromEmail = adminEmail.split('@')[1]?.trim().toLowerCase();
    if (fromEmail && fromEmail.includes('.')) return fromEmail;
    // fallback: workspace.example.com → example.com; subdomain → slug.opsid.web.id
    if (domain_type === 'custom_domain') {
      return domain.split('.').slice(1).join('.');
    }
    return `${slug}.opsid.web.id`;
  })();

  try {
    await registerPostfixDomain(mailDomain);
    steps.push({ step: 'postfix_domain', ok: true });
  } catch (e: any) {
    steps.push({ step: 'postfix_domain', ok: false, error: String(e) });
  }

  // ── Step 13b: DKIM generation + save to DB ────────────────────
  try {
    const dkimKey = await generateDkim(mailDomain, 'mail');
    await db.query(
      `UPDATE tenants
       SET    mail_domain       = $1,
              dkim_selector     = 'mail',
              dkim_public_key   = $2,
              dkim_generated_at = NOW()
       WHERE  id = $3`,
      [mailDomain, dkimKey, tenant.id]
    );
    steps.push({ step: 'dkim', ok: !!dkimKey, error: dkimKey ? undefined : 'DKIM key missing — check mail-api' });
  } catch (e: any) {
    steps.push({ step: 'dkim', ok: false, error: String(e) });
  }

  // ── Step 14: Post-provisioning smoke test ─────────────────────
  try {
    const smoke = await smokeTestTenant(slug, domain);
    const smokeOk = smoke.kc_user && smoke.nc_user;
    steps.push({
      step:  'smoke_test',
      ok:    smokeOk,
      error: smokeOk ? undefined : JSON.stringify(smoke.details),
    });
  } catch (e: any) {
    steps.push({ step: 'smoke_test', ok: false, error: String(e) });
  }

  // ── Step 15: Audit log ────────────────────────────────────────
  await db.query(
    `INSERT INTO audit_logs (actor, action, target, metadata) VALUES ($1,$2,$3,$4)`,
    [createdBy, 'CREATE_TENANT', domain, JSON.stringify({ name, slug, adminUsername })]
  ).catch(() => null);

  return { ok: true, tenant, adminUsername, steps };
}

// ── Re-provision: retry non-DB steps for an existing tenant ───
// Safe to call multiple times — all external calls are idempotent or handle 409.
// A new adminPassword is generated only when user steps are attempted.

export interface ReprovisionInput {
  tenantId:     number;
  slug:         string;
  domain:       string;
  domain_type:  'subdomain' | 'custom_domain';
  name:         string;
  adminName:    string;
  actor:        string;
  planEmailGb?: number;   // for Dovecot quota (default 50)
  planNcGb?:    number;   // for NC quota (default 50)
  // Which step names to re-run. Omit to re-run ALL non-db steps.
  only?:        string[];
}

export interface ReprovisionResult {
  ok:            boolean;
  steps:         StepResult[];
  adminPassword?: string; // set only if user steps ran successfully
  error?:        string;
}

export async function reprovisionTenant(input: ReprovisionInput): Promise<ReprovisionResult> {
  const { tenantId, slug, domain, domain_type, name, adminName, actor, only,
          planEmailGb = 50, planNcGb = 50 } = input;
  const steps:        StepResult[] = [];

  const adminUserRow = await db.query(
    `SELECT username, email
       FROM tenant_users
      WHERE tenant_id = $1
      ORDER BY is_admin DESC, id ASC
      LIMIT 1`,
    [tenantId]
  ).then(r => r.rows[0]).catch(() => null);

  const adminEmail    = (adminUserRow?.email || `admin@${domain}`).trim().toLowerCase();
  const adminUsername = (adminUserRow?.username || deriveUsernameFromEmail(adminEmail, domain)).trim().toLowerCase();

  const want = (step: string) => !only || only.includes(step);

  let newPassword: string | undefined;

  // ── Nginx ─────────────────────────────────────────────────────
  if (want('nginx')) {
    try {
      const r = await fetch(`${NGINX_API}/site/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain, slug, upstream: PORTAL_UPSTREAM }),
      });
      steps.push({ step: 'nginx', ok: r.ok, error: r.ok ? undefined : `HTTP ${r.status}` });
    } catch (e: any) {
      steps.push({ step: 'nginx', ok: false, error: String(e) });
    }
  }

  // ── SSL (custom domain only) ──────────────────────────────────
  if (want('ssl_certbot') && domain_type === 'custom_domain') {
    try {
      await sslProvision(domain, slug);
      steps.push({ step: 'ssl_certbot', ok: true });
    } catch (e: any) {
      steps.push({ step: 'ssl_certbot', ok: false, error: String(e) });
    }
  }

  // ── FreeIPA group ─────────────────────────────────────────────
  if (want('freeipa_group')) {
    try {
      await createFreeIPAGroup(slug);
      steps.push({ step: 'freeipa_group', ok: true });
    } catch (e: any) {
      // If already exists, that is fine
      const msg = String(e);
      const alreadyExists = msg.includes('already exists') || msg.includes('Duplicate');
      steps.push({ step: 'freeipa_group', ok: alreadyExists, error: alreadyExists ? undefined : msg });
    }
  }

  // ── Keycloak Org ──────────────────────────────────────────────
  let orgId: string | null = null;
  if (want('kc_org')) {
    try {
      orgId = await createKeycloakOrg(slug, name, domain);
      steps.push({ step: 'kc_org', ok: true });
    } catch (e: any) {
      const msg = String(e);
      const conflict = msg.includes('409') || msg.includes('already exists');
      steps.push({ step: 'kc_org', ok: conflict, error: conflict ? undefined : msg });

      if (conflict) {
        try {
          const token = await getKcToken();
          const r = await fetch(
            `${KC_BASE}/admin/realms/opsid-internal/organizations?search=${encodeURIComponent(slug)}`,
            { headers: { 'Authorization': `Bearer ${token}` } }
          );
          const orgs: any[] = await r.json().catch(() => []);
          orgId = orgs.find((o: any) => o.alias === slug)?.id ?? null;
        } catch {}
      }
    }
  }

  // ── FreeIPA user ──────────────────────────────────────────────
  if (want('freeipa_user')) {
    newPassword = newPassword ?? generatePassword();
    try {
      await createFreeIPAUser(slug, adminUsername, adminName, newPassword, adminEmail);
      steps.push({ step: 'freeipa_user', ok: true });
    } catch (e: any) {
      const msg = String(e);
      const alreadyExists = msg.includes('already exists') || msg.includes('Duplicate');
      steps.push({ step: 'freeipa_user', ok: alreadyExists, error: alreadyExists ? undefined : msg });
      if (alreadyExists) newPassword = undefined; // user exists; don't expose new pw
    }
  }

  // ── Keycloak user ─────────────────────────────────────────────
  let kcUserId: string | null = null;
  if (want('kc_user')) {
    newPassword = newPassword ?? generatePassword();
    try {
      kcUserId = await createKcUser(slug, adminUsername, adminName, newPassword, adminEmail);
      if (!kcUserId) kcUserId = await findKcUserByUsername(adminUsername);
      steps.push({ step: 'kc_user', ok: !!kcUserId, error: kcUserId ? undefined : 'user not found after create' });
    } catch (e: any) {
      const msg = String(e);
      const conflict = msg.includes('409') || msg.includes('User exists');
      steps.push({ step: 'kc_user', ok: conflict, error: conflict ? undefined : msg });
      if (conflict) newPassword = undefined; // user exists; don't expose new pw
      kcUserId = await findKcUserByUsername(adminUsername).catch(() => null);
    }
  }

  // ── KC org membership ─────────────────────────────────────────
  if (want('kc_org_member')) {
    if (!orgId) {
      // try to find existing org
      try {
        const token = await getKcToken();
        const r = await fetch(
          `${KC_BASE}/admin/realms/opsid-internal/organizations?search=${encodeURIComponent(slug)}`,
          { headers: { 'Authorization': `Bearer ${token}` } }
        );
        const orgs: any[] = await r.json().catch(() => []);
        orgId = orgs.find((o: any) => o.alias === slug)?.id ?? null;
      } catch { /* ignore */ }
    }
    if (!kcUserId) kcUserId = await findKcUserByUsername(adminUsername).catch(() => null);
    if (kcUserId && orgId) {
      try {
        await assignOrgMember(orgId, kcUserId);
        steps.push({ step: 'kc_org_member', ok: true });
      } catch (e: any) {
        steps.push({ step: 'kc_org_member', ok: false, error: String(e) });
      }
    } else {
      steps.push({ step: 'kc_org_member', ok: false, error: `kcUserId=${kcUserId} orgId=${orgId}` });
    }
  }

  // ── tenant_users upsert ───────────────────────────────────────
  if (want('tenant_users')) {
    try {
      await db.query(
        `INSERT INTO tenant_users (tenant_id, username, email, full_name, role, is_admin, status)
         VALUES ($1,$2,$3,$4,$5,$6,$7)
         ON CONFLICT (tenant_id, username) DO UPDATE
           SET email=$3, full_name=$4, role=$5, is_admin=$6, status=$7`,
        [tenantId, adminUsername, adminEmail, adminName, 'org-admin', true, 'active']
      );
      steps.push({ step: 'tenant_users', ok: true });
    } catch (e: any) {
      steps.push({ step: 'tenant_users', ok: false, error: String(e) });
    }
  }

  // ── KC redirect URI sync ──────────────────────────────────────
  if (want('kc_redirect_uri')) {
    try {
      await syncKcClientRedirectUri(domain);
      steps.push({ step: 'kc_redirect_uri', ok: true });
    } catch (e: any) {
      steps.push({ step: 'kc_redirect_uri', ok: false, error: String(e) });
    }
  }

  // ── NC group ──────────────────────────────────────────────────
  if (want('nc_group')) {
    try {
      await createNcGroup(slug);
      steps.push({ step: 'nc_group', ok: true });
    } catch (e: any) {
      steps.push({ step: 'nc_group', ok: false, error: String(e) });
    }
  }

  // ── NC LDAP sync + quota + group membership ───────────────────
  if (want('nc_user')) {
    try {
      await provisionNcLdapUser(adminUsername);        // force LDAP → NC sync
      await setNcQuota(adminUsername, planNcGb);
      await addNcUserToGroup(adminUsername, slug);
      steps.push({ step: 'nc_user', ok: true });
    } catch (e: any) {
      steps.push({ step: 'nc_user', ok: false, error: String(e) });
    }
  }

  // ── Dovecot quota ─────────────────────────────────────────────
  if (want('sogo_quota')) {
    try {
      await setDovecotQuota(adminUsername, planEmailGb ?? 50);
      steps.push({ step: 'sogo_quota', ok: true });
    } catch (e: any) {
      steps.push({ step: 'sogo_quota', ok: false, error: String(e) });
    }
  }

  // ── Odoo company + user ───────────────────────────────────────
  if (want('odoo_company') || want('odoo_user')) {
    try {
      const odooSess  = await odooGetSession();
      if (want('odoo_company')) {
        await getOrCreateOdooCompany(odooSess, slug, name, domain);
        steps.push({ step: 'odoo_company', ok: true });
      }
      if (want('odoo_user')) {
        const companies: any[] = await odooCall(odooSess, 'res.company', 'search_read',
          [[['website', '=', `opsid-slug:${slug}`]]], { fields: ['id'], limit: 1 });
        const companyId = companies[0]?.id;
        if (companyId) {
          await getOrCreateOdooUser(odooSess, `admin@${domain}`, name, companyId);
          steps.push({ step: 'odoo_user', ok: true });
        } else {
          steps.push({ step: 'odoo_user', ok: false, error: 'odoo_company not found for user link' });
        }
      }
    } catch (e: any) {
      const msg = String(e);
      if (want('odoo_company') && !steps.find(s => s.step === 'odoo_company')) {
        steps.push({ step: 'odoo_company', ok: false, error: msg });
      }
      if (want('odoo_user') && !steps.find(s => s.step === 'odoo_user')) {
        steps.push({ step: 'odoo_user', ok: false, error: msg });
      }
    }
  }

  // ── Audit log ─────────────────────────────────────────────────
  await db.query(
    `INSERT INTO audit_logs (actor, action, target, metadata) VALUES ($1,$2,$3,$4)`,
    [actor, 'REPROVISION_TENANT', domain, JSON.stringify({ slug, steps: steps.map(s => s.step) })]
  ).catch(() => null);

  const anyFail = steps.some(s => !s.ok);
  return {
    ok:            !anyFail,
    steps,
    adminPassword: newPassword,
  };
}
