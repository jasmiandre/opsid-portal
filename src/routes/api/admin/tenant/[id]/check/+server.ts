/**
 * GET /api/admin/tenant/[id]/check
 *
 * Comprehensive live validation of all provisioning steps for a tenant.
 * Returns structured check results for the Admin Validation UI.
 *
 * Query params:
 *   ?ssl=1   — also run TLS cert check (adds ~6 s timeout)
 *   ?fast=1  — skip FreeIPA + Odoo checks (only NC, DNS, KC)
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import db from '$lib/db';
import tls from 'tls';
import dns from 'dns/promises';
import { execSync } from 'child_process';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const OPSID_IP    = '103.134.152.140';
const KC_BASE     = 'http://10.34.1.4:8080'; // internal; hairpin NAT blocks public IP from server
const FREEIPA_URL = 'https://ipa.opsid.web.id/ipa';
const NC_INTERNAL = 'http://files.opsid.web.id:8080';
const NC_ADMIN    = 'admin';
const NC_PASS     = 'VqscHz0m1mrJWvjWofR81Dupuft3VLrrPRPzdkDC6Os9fDYEWIpLA5lbOcNv5p753jRJEnDN';
const NC_AUTH     = 'Basic ' + Buffer.from(`${NC_ADMIN}:${NC_PASS}`).toString('base64');
const ODOO_URL    = 'http://10.34.1.8:8069';
const ODOO_DB     = 'odoo_db';
const ODOO_ADMIN  = 'admin';
const ODOO_PASS   = 'Sandiaman2026';

// ── helpers ──────────────────────────────────────────────────────

function timeout<T>(ms: number, promise: Promise<T>, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>(res => setTimeout(() => res(fallback), ms)),
  ]);
}

function decodeToken(token: string): any {
  try {
    const b64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(Buffer.from(b64, 'base64').toString('utf8'));
  } catch { return null; }
}

// ── KC ───────────────────────────────────────────────────────────

async function checkKcOrg(slug: string): Promise<{ ok: boolean; orgId?: string; detail: string }> {
  try {
    const r1 = await fetch(`${KC_BASE}/realms/master/protocol/openid-connect/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'client_id=admin-cli&grant_type=password&username=opsid-admin&password=sandiaman2026',
    });
    const { access_token } = await r1.json();
    if (!access_token) return { ok: false, detail: 'KC token fetch failed' };

    const r2 = await fetch(
      `${KC_BASE}/admin/realms/opsid-internal/organizations?search=${encodeURIComponent(slug)}`,
      { headers: { 'Authorization': `Bearer ${access_token}` } }
    );
    const orgs: any[] = await r2.json().catch(() => []);
    const org = orgs.find((o: any) => o.alias === slug);
    if (org) return { ok: true, orgId: org.id, detail: `id=${org.id}` };
    return { ok: false, detail: 'Org tidak ditemukan di KC' };
  } catch (e: any) {
    return { ok: false, detail: String(e).slice(0, 120) };
  }
}

async function checkKcUser(username: string): Promise<{ ok: boolean; userId?: string; detail: string }> {
  try {
    const r1 = await fetch(`${KC_BASE}/realms/master/protocol/openid-connect/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'client_id=admin-cli&grant_type=password&username=opsid-admin&password=sandiaman2026',
    });
    const { access_token } = await r1.json();
    if (!access_token) return { ok: false, detail: 'KC token fetch failed' };

    const r2 = await fetch(
      `${KC_BASE}/admin/realms/opsid-internal/users?username=${encodeURIComponent(username)}&exact=true`,
      { headers: { 'Authorization': `Bearer ${access_token}` } }
    );
    const users: any[] = await r2.json().catch(() => []);
    const user = users[0];
    if (user) return { ok: true, userId: user.id, detail: `id=${user.id}, enabled=${user.enabled}` };
    return { ok: false, detail: 'User tidak ditemukan di KC' };
  } catch (e: any) {
    return { ok: false, detail: String(e).slice(0, 120) };
  }
}

// ── FreeIPA ──────────────────────────────────────────────────────

async function ipaLogin(): Promise<string> {
  const res = await fetch(`${FREEIPA_URL}/session/login_password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Referer': FREEIPA_URL, 'Accept': 'text/plain' },
    body: 'user=admin&password=Sandiaman2026',
  });
  if (!res.ok) throw new Error(`IPA login ${res.status}`);
  return res.headers.get('set-cookie') || '';
}

async function ipaCall(cookie: string, method: string, args: any[], kwargs: any = {}): Promise<any> {
  const res = await fetch(`${FREEIPA_URL}/session/json`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Referer': FREEIPA_URL, 'Cookie': cookie },
    body: JSON.stringify({ method, params: [args, kwargs], id: 0 }),
  });
  return res.json();
}

async function checkIpa(slug: string): Promise<{
  group:  { ok: boolean; memberCount?: number; detail: string };
  user:   { ok: boolean; detail: string };
}> {
  const FAIL = { group: { ok: false, detail: 'IPA check failed' }, user: { ok: false, detail: 'IPA check failed' } };
  try {
    const cookie = await ipaLogin();
    const [grpRes, usrRes] = await Promise.all([
      ipaCall(cookie, 'group_show', [`${slug}-users`], { all: false }),
      ipaCall(cookie, 'user_show',  [`admin.${slug}`],  { all: false }),
    ]);
    const grpData = grpRes?.result?.result;
    const usrData = usrRes?.result?.result;
    return {
      group: grpData
        ? { ok: true,  memberCount: grpData.member_user?.length ?? 0, detail: `${grpData.member_user?.length ?? 0} member(s)` }
        : { ok: false, detail: grpRes?.error?.message ?? 'Group tidak ada' },
      user: usrData
        ? { ok: true,  detail: `uid=${usrData.uid?.[0]}, title=${usrData.title?.[0] ?? '-'}` }
        : { ok: false, detail: usrRes?.error?.message ?? 'User tidak ada' },
    };
  } catch (e: any) {
    return FAIL;
  }
}

// ── Nextcloud ─────────────────────────────────────────────────────

async function checkNc(slug: string, username: string): Promise<{
  group: { ok: boolean; detail: string };
  user:  { ok: boolean; quotaGb?: number; usedGb?: number; groups?: string[]; detail: string };
}> {
  const heads = { 'Authorization': NC_AUTH, 'OCS-APIRequest': 'true', 'Host': 'files.opsid.web.id' };

  const [grpRes, usrRes] = await Promise.allSettled([
    fetch(`${NC_INTERNAL}/ocs/v1.php/cloud/groups/${encodeURIComponent(slug)}?format=json`, { headers: heads })
      .then(r => r.json()),
    fetch(`${NC_INTERNAL}/ocs/v1.php/cloud/users/${encodeURIComponent(username)}?format=json`, { headers: heads })
      .then(r => r.json()),
  ]);

  const grpOk   = grpRes.status === 'fulfilled' && grpRes.value?.ocs?.meta?.statuscode === 100;
  const grpData = grpRes.status === 'fulfilled' ? grpRes.value?.ocs?.data : null;

  const usrOk   = usrRes.status === 'fulfilled' && usrRes.value?.ocs?.meta?.statuscode === 100;
  const usrData = usrRes.status === 'fulfilled' ? usrRes.value?.ocs?.data : null;

  const usedGb   = usrData?.quota?.used  ? parseFloat((usrData.quota.used  / 1e9).toFixed(2)) : 0;
  const quotaGb  = usrData?.quota?.quota > 0 ? Math.round(usrData.quota.quota / 1e9) : null;

  return {
    group: grpOk
      ? { ok: true,  detail: `${grpData?.users?.length ?? 0} user(s) dalam group` }
      : { ok: false, detail: 'Group tidak ada di Nextcloud' },
    user:  usrOk
      ? { ok: true, quotaGb: quotaGb ?? undefined, usedGb,
          groups: usrData?.groups,
          detail: `quota=${quotaGb != null ? quotaGb + ' GB' : 'none'}, used=${usedGb} GB, groups=[${usrData?.groups?.join(', ') ?? ''}]` }
      : { ok: false, detail: 'User tidak ada di Nextcloud' },
  };
}

// ── Dovecot quota (SSH) ───────────────────────────────────────────

async function checkDovecot(username: string): Promise<{ ok: boolean; quotaBytes?: number; detail: string }> {
  try {
    const safeUser = username.replace(/[^a-zA-Z0-9._-]/g, '');
    const out = execSync(
      `ssh -o BatchMode=yes -o ConnectTimeout=5 -o StrictHostKeyChecking=no mail-01 "grep 'priv/${safeUser}/quota_bytes' /etc/dovecot/quota-users 2>/dev/null || echo MISSING"`,
      { timeout: 8000 }
    ).toString().trim();
    if (out === 'MISSING' || !out) return { ok: false, detail: 'Quota tidak ditemukan di Dovecot' };
    const bytes = parseInt(out.split('=')[1] ?? '0', 10);
    const gb    = Math.round(bytes / 1e9);
    return { ok: true, quotaBytes: bytes, detail: `${gb} GB (${bytes} bytes)` };
  } catch (e: any) {
    return { ok: false, detail: 'SSH mail-01 gagal: ' + String(e).slice(0, 80) };
  }
}

// ── Odoo ─────────────────────────────────────────────────────────

async function checkOdoo(slug: string, domain: string): Promise<{
  company: { ok: boolean; id?: number; detail: string };
  user:    { ok: boolean; id?: number; detail: string };
}> {
  const FAIL = { company: { ok: false, detail: 'Odoo check failed' }, user: { ok: false, detail: 'Odoo check failed' } };
  try {
    const authRes = await fetch(`${ODOO_URL}/web/session/authenticate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', method: 'call', id: 1,
        params: { db: ODOO_DB, login: ODOO_ADMIN, password: ODOO_PASS } }),
    });
    const sid = authRes.headers.get('set-cookie')?.match(/session_id=([^;]+)/)?.[1];
    if (!sid) return FAIL;
    const sess = `session_id=${sid}`;

    const call = (model: string, args: any[], kwargs: any = {}) =>
      fetch(`${ODOO_URL}/web/dataset/call_kw`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Cookie': sess },
        body: JSON.stringify({ jsonrpc: '2.0', method: 'call', id: Math.random(),
          params: { model, method: 'search_read', args, kwargs } }),
      }).then(r => r.json()).then(d => d.result ?? []);

    const sentinel = `opsid-slug:${slug}`;
    const login    = `admin@${domain}`;

    const [companies, users] = await Promise.all([
      call('res.company', [[['website', '=', sentinel]]], { fields: ['id', 'name'], limit: 1 }),
      call('res.users',   [[['login',   '=', login]]],   { fields: ['id', 'login', 'oauth_uid', 'company_id'], limit: 1 }),
    ]);

    // If company not found by sentinel (Odoo may restrict search to admin's company_ids),
    // fall back to checking via the user's company_id field.
    let companyResult: { ok: boolean; id?: number; detail: string };
    if (companies.length) {
      companyResult = { ok: true, id: companies[0].id, detail: `id=${companies[0].id}, name="${companies[0].name}"` };
    } else if (users.length && users[0].company_id) {
      const cid = Array.isArray(users[0].company_id) ? users[0].company_id[0] : users[0].company_id;
      const byId: any[] = await call('res.company', [[['id', '=', cid]]], { fields: ['id', 'name', 'website'], limit: 1 }).catch(() => []);
      if (byId.length) {
        const sentinelMatch = byId[0].website === sentinel;
        companyResult = {
          ok:     true,
          id:     byId[0].id,
          detail: `id=${byId[0].id}, name="${byId[0].name}"${sentinelMatch ? '' : ' (sentinel mismatch — OK via user.company_id)'}`,
        };
      } else {
        companyResult = { ok: false, detail: 'Company tidak ada di Odoo' };
      }
    } else {
      companyResult = { ok: false, detail: 'Company tidak ada di Odoo' };
    }

    return {
      company: companyResult,
      user: users.length
        ? { ok: true,  id: users[0].id,
            detail: `id=${users[0].id}, oauth_uid=${users[0].oauth_uid ? users[0].oauth_uid.slice(0,8)+'…' : 'belum login'}` }
        : { ok: false, detail: 'User tidak ada di Odoo' },
    };
  } catch (e: any) {
    return FAIL;
  }
}

// ── DNS ──────────────────────────────────────────────────────────

async function checkDns(domain: string): Promise<{ ok: boolean; ip?: string; pointing: boolean; detail: string }> {
  try {
    const addrs = await dns.resolve4(domain);
    const ip    = addrs[0] ?? '';
    const ok    = addrs.includes(OPSID_IP);
    return { ok, ip, pointing: ok, detail: ok ? `${ip} → OPSID ✓` : `${ip} ≠ ${OPSID_IP}` };
  } catch (e: any) {
    return { ok: false, ip: undefined, pointing: false, detail: 'DNS resolve gagal: ' + String(e).slice(0, 80) };
  }
}

// ── SSL ──────────────────────────────────────────────────────────

function checkTls(domain: string): Promise<{ ok: boolean; issuer?: string; subject?: string; expires?: string; daysLeft?: number; detail: string }> {
  return new Promise(resolve => {
    const sock = tls.connect({ host: domain, port: 443, servername: domain, rejectUnauthorized: false }, () => {
      const cert     = sock.getPeerCertificate();
      sock.destroy();
      const expires  = cert.valid_to ?? '';
      const daysLeft = Math.floor((new Date(expires).getTime() - Date.now()) / 86400000);
      const issuer   = cert.issuer?.O  ?? '';
      const subject  = cert.subject?.CN ?? '';
      const ok       = sock.authorized || daysLeft > 0;
      resolve({ ok, issuer, subject, expires, daysLeft, detail: `${issuer} · ${subject} · ${daysLeft}d left` });
    });
    sock.on('error', (e: any) => resolve({ ok: false, detail: String(e).slice(0, 80) }));
    sock.setTimeout(6000, () => { sock.destroy(); resolve({ ok: false, detail: 'TLS timeout' }); });
  });
}

// ── Main handler ─────────────────────────────────────────────────

export const GET: RequestHandler = async ({ params, url, cookies }) => {
  // Auth check
  const token = cookies.get('opsid_token');
  if (!token) return json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  const p = decodeToken(token);
  if (!(p?.realm_access?.roles ?? []).includes('opsid-admin'))
    return json({ ok: false, error: 'Forbidden' }, { status: 403 });

  const withSsl  = url.searchParams.get('ssl')  === '1';
  const fastMode = url.searchParams.get('fast') === '1';

  // Fetch tenant
  const tenantRow = await db.query(
    `SELECT t.*,
       (SELECT COUNT(*) FROM tenant_users tu WHERE tu.tenant_id = t.id) AS user_count
     FROM tenants t WHERE t.id = $1`,
    [params.id]
  ).then(r => r.rows[0]).catch(() => null);

  if (!tenantRow) return json({ ok: false, error: 'Tenant tidak ditemukan' }, { status: 404 });

  // Fetch provisioning_log from onboarding_requests
  const provRow = await db.query(
    `SELECT id, status, provisioning_log, reviewed_at, reviewed_by, notes
     FROM onboarding_requests WHERE tenant_id = $1 ORDER BY id DESC LIMIT 1`,
    [params.id]
  ).then(r => r.rows[0]).catch(() => null);

  const { slug, domain } = tenantRow;
  const adminUsername = `admin.${slug}`;

  // Run all checks in parallel (with per-check timeouts)
  const T = 12000; // max per check

  const [dnsResult, kcOrg, kcUser, ncResult, dovecot, odooResult, ipaResult, sslResult] = await Promise.all([
    timeout(T, checkDns(domain), { ok: false, pointing: false, detail: 'timeout' }),
    timeout(T, checkKcOrg(slug),         { ok: false, detail: 'timeout' }),
    timeout(T, checkKcUser(adminUsername), { ok: false, detail: 'timeout' }),
    timeout(T, checkNc(slug, adminUsername), {
      group: { ok: false, detail: 'timeout' },
      user:  { ok: false, detail: 'timeout' },
    }),
    timeout(T, checkDovecot(adminUsername), { ok: false, detail: 'timeout' }),
    fastMode ? Promise.resolve({ company: { ok: false, detail: 'skipped (fast mode)' }, user: { ok: false, detail: 'skipped' } })
             : timeout(T, checkOdoo(slug, domain), { company: { ok: false, detail: 'timeout' }, user: { ok: false, detail: 'timeout' } }),
    fastMode ? Promise.resolve({ group: { ok: false, detail: 'skipped (fast mode)' }, user: { ok: false, detail: 'skipped' } })
             : timeout(T, checkIpa(slug), { group: { ok: false, detail: 'timeout' }, user: { ok: false, detail: 'timeout' } }),
    withSsl  ? timeout(8000, checkTls(domain), { ok: false, detail: 'timeout' })
             : Promise.resolve(null),
  ]);

  // Parse provisioning_log
  let provLog: any[] = [];
  try {
    const raw = provRow?.provisioning_log;
    provLog   = Array.isArray(raw) ? raw : (raw ? JSON.parse(raw) : []);
  } catch { /* ignore */ }

  const checks = {
    dns:            dnsResult,
    ssl:            sslResult,
    kc_org:         kcOrg,
    kc_user:        kcUser,
    freeipa_group:  ipaResult.group,
    freeipa_user:   ipaResult.user,
    nc_group:       ncResult.group,
    nc_user:        ncResult.user,
    sogo_quota:     dovecot,
    odoo_company:   odooResult.company,
    odoo_user:      odooResult.user,
  };

  const allOk      = Object.values(checks).every(c => c === null || (c as any).ok);
  const failCount  = Object.values(checks).filter(c => c !== null && !(c as any).ok).length;

  return json({
    ok:          true,
    allPassing:  allOk,
    failCount,
    tenant: {
      id:                tenantRow.id,
      name:              tenantRow.name,
      slug:              tenantRow.slug,
      domain:            tenantRow.domain,
      status:            tenantRow.status,
      plan_tier:         tenantRow.plan_tier,
      plan_nextcloud_gb: tenantRow.plan_nextcloud_gb,
      plan_email_gb:     tenantRow.plan_email_gb,
      user_count:        Number(tenantRow.user_count),
    },
    onboarding: provRow ? {
      id:           provRow.id,
      status:       provRow.status,
      reviewed_at:  provRow.reviewed_at,
      reviewed_by:  provRow.reviewed_by,
    } : null,
    provisioning_log: provLog,
    checks,
    checked_at: new Date().toISOString(),
  });
};
