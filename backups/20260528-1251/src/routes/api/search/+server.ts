import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import db from '$lib/db';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const FREEIPA_URL   = 'https://ipa.opsid.web.id/ipa';
const FREEIPA_ADMIN = 'admin';
const FREEIPA_PASS  = 'Sandiaman2026';

function decodeToken(token: string): any {
  try {
    const b64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(Buffer.from(b64, 'base64').toString('utf8'));
  } catch { return null; }
}

async function ipaLogin(): Promise<string> {
  const res = await fetch(`${FREEIPA_URL}/session/login_password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Referer': FREEIPA_URL, 'Accept': 'text/plain' },
    body: `user=${FREEIPA_ADMIN}&password=${encodeURIComponent(FREEIPA_PASS)}`,
  });
  if (!res.ok) throw new Error(`FreeIPA login: ${res.status}`);
  return res.headers.get('set-cookie') || '';
}

async function ipaCall(cookie: string, method: string, args: unknown[], kwargs: Record<string, unknown> = {}): Promise<any> {
  const res = await fetch(`${FREEIPA_URL}/session/json`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Referer': FREEIPA_URL, 'Cookie': cookie },
    body: JSON.stringify({ method, params: [args, kwargs], id: 0 }),
  });
  return res.json();
}

interface SearchResult {
  type: 'user' | 'tenant' | 'audit' | 'activity';
  id: string;
  title: string;
  subtitle: string;
  meta?: string;
}

export const GET: RequestHandler = async ({ url, cookies }) => {
  const token    = cookies.get('opsid_token');
  const payload  = token ? decodeToken(token) : null;
  const username = payload?.preferred_username ?? '';
  const roles    = payload?.realm_access?.roles ?? [];
  const isAdmin  = roles.includes('opsid-admin');

  if (!username) return json({ results: [], error: 'Not authenticated' }, { status: 401 });

  const q = (url.searchParams.get('q') ?? '').trim();
  if (q.length < 2) return json({ results: [], query: q });

  const results: SearchResult[] = [];

  // ── 1. Tenant_users DB search (fast, always available) ──────
  try {
    const tenantPattern = `%${q}%`;

    if (isAdmin) {
      // Superadmin: search all users across tenants
      const res = await db.query(
        `SELECT tu.username, tu.full_name, tu.email, tu.role, tu.status, t.name AS tenant_name
         FROM tenant_users tu
         JOIN tenants t ON tu.tenant_id = t.id
         WHERE tu.username ILIKE $1 OR tu.full_name ILIKE $1 OR tu.email ILIKE $1
         LIMIT 8`,
        [tenantPattern]
      );
      for (const row of res.rows) {
        results.push({
          type:     'user',
          id:       row.username,
          title:    row.full_name || row.username,
          subtitle: row.email || row.username,
          meta:     `${row.tenant_name} · ${row.role} · ${row.status}`,
        });
      }

      // Tenants
      const tenRes = await db.query(
        `SELECT id, name, slug, domain, status, plan_nextcloud_gb
         FROM tenants
         WHERE name ILIKE $1 OR slug ILIKE $1 OR domain ILIKE $1
         LIMIT 5`,
        [tenantPattern]
      );
      for (const row of tenRes.rows) {
        results.push({
          type:     'tenant',
          id:       String(row.id),
          title:    row.name,
          subtitle: row.domain,
          meta:     `${row.status} · ${row.plan_nextcloud_gb ?? 50} GB`,
        });
      }
    } else {
      // Tenant user: search only within their tenant
      const tenantRow = await db.query(
        `SELECT tu.tenant_id FROM tenant_users tu WHERE tu.username = $1 AND tu.status = 'active' LIMIT 1`,
        [username]
      );
      const tenantId = tenantRow.rows[0]?.tenant_id;
      if (tenantId) {
        const res = await db.query(
          `SELECT username, full_name, email, role, status
           FROM tenant_users
           WHERE tenant_id = $1 AND (username ILIKE $2 OR full_name ILIKE $2 OR email ILIKE $2)
           LIMIT 8`,
          [tenantId, tenantPattern]
        );
        for (const row of res.rows) {
          results.push({
            type:     'user',
            id:       row.username,
            title:    row.full_name || row.username,
            subtitle: row.email,
            meta:     `${row.role} · ${row.status}`,
          });
        }
      }
    }
  } catch { /* skip DB search on error */ }

  // ── 2. Audit / activity log search ──────────────────────────
  try {
    const logPattern = `%${q}%`;

    if (isAdmin) {
      const logRes = await db.query(
        `SELECT id, actor, action, target, created_at FROM audit_logs
         WHERE actor ILIKE $1 OR action ILIKE $1 OR target ILIKE $1
         ORDER BY created_at DESC LIMIT 5`,
        [logPattern]
      );
      for (const row of logRes.rows) {
        results.push({
          type:     'audit',
          id:       String(row.id),
          title:    row.action,
          subtitle: `${row.actor} → ${row.target}`,
          meta:     new Date(row.created_at).toLocaleDateString('id-ID'),
        });
      }
    } else {
      const actRes = await db.query(
        `SELECT id, actor, action, target, created_at FROM activity_logs
         WHERE actor = $1 AND (action ILIKE $2 OR target ILIKE $2)
         ORDER BY created_at DESC LIMIT 5`,
        [username, logPattern]
      ).catch(() => ({ rows: [] }));
      for (const row of actRes.rows) {
        results.push({
          type:     'activity',
          id:       String(row.id),
          title:    row.action,
          subtitle: row.target || '',
          meta:     new Date(row.created_at).toLocaleDateString('id-ID'),
        });
      }
    }
  } catch { /* skip */ }

  // ── 3. FreeIPA user search (admin only — slower) ─────────────
  if (isAdmin && results.filter(r => r.type === 'user').length < 4) {
    try {
      const cookie = await ipaLogin();
      const r = await ipaCall(cookie, 'user_find', [[q]], { sizelimit: 6, all: false });
      for (const u of (r.result?.result ?? [])) {
        const uid = u.uid?.[0];
        if (!uid || results.some(x => x.id === uid)) continue;
        results.push({
          type:     'user',
          id:       uid,
          title:    u.cn?.[0] || uid,
          subtitle: u.mail?.[0] || uid,
          meta:     'FreeIPA',
        });
      }
    } catch { /* FreeIPA optional */ }
  }

  return json({ results: results.slice(0, 20), query: q });
};
