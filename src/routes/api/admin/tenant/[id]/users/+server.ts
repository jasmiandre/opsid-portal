import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import db from '$lib/db';
import { logAudit, usernameFromCookie } from '$lib/server/audit';

const FREEIPA_URL   = 'https://ipa.opsid.web.id/ipa';
const FREEIPA_ADMIN = 'admin';
const FREEIPA_PASS  = 'Sandiaman2026';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function ipaLogin(): Promise<string> {
  const res = await fetch(`${FREEIPA_URL}/session/login_password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Referer': FREEIPA_URL, 'Accept': 'text/plain' },
    body: `user=${FREEIPA_ADMIN}&password=${encodeURIComponent(FREEIPA_PASS)}`,
  });
  if (!res.ok) throw new Error(`FreeIPA login failed: ${res.status}`);
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

function requireAdminOrOwner(cookies: any, tenantId: string): Promise<{ ok: false; res: Response } | { ok: true; username: string; isAdmin: boolean }> {
  return (async () => {
    const token = cookies.get('opsid_token');
    if (!token) return { ok: false as const, res: json({ ok: false, error: 'Unauthorized' }, { status: 401 }) as Response };
    try {
      const b64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      const p   = JSON.parse(Buffer.from(b64, 'base64').toString('utf8'));
      const username: string = p.preferred_username ?? '';
      if (!username) return { ok: false as const, res: json({ ok: false, error: 'Unauthorized' }, { status: 401 }) as Response };
      const isAdmin: boolean = (p.realm_access?.roles ?? []).includes('opsid-admin');
      if (!isAdmin) {
        // Must be org-admin of this specific tenant
        const own = await db.query(
          `SELECT 1 FROM tenant_users WHERE username=$1 AND tenant_id=$2 AND role='org-admin' AND status='active'`,
          [username, tenantId]
        );
        if (!own.rows.length) return { ok: false as const, res: json({ ok: false, error: 'Forbidden' }, { status: 403 }) as Response };
      }
      return { ok: true as const, username, isAdmin };
    } catch {
      return { ok: false as const, res: json({ ok: false, error: 'Invalid token' }, { status: 401 }) as Response };
    }
  })();
}

/** GET /api/admin/tenant/[id]/users — list users for a tenant */
export const GET: RequestHandler = async ({ params, cookies }) => {
  const auth = await requireAdminOrOwner(cookies, params.id);
  if (!auth.ok) return auth.res;
  const actor = auth.username;

  try {
    const tenantResult = await db.query(
      `SELECT id, name, slug FROM tenants WHERE id = $1`, [params.id]
    );
    if (!tenantResult.rows.length) return json({ ok: false, error: 'Tenant tidak ditemukan' }, { status: 404 });
    const tenant = tenantResult.rows[0];

    const usersResult = await db.query(
      `SELECT username, email, full_name, role, is_admin, status
       FROM tenant_users
       WHERE tenant_id = $1
       ORDER BY id ASC`,
      [tenant.id]
    );

    // Try to enrich from FreeIPA (add dept, last login, etc.)
    let ipaMap: Record<string, any> = {};
    try {
      const cookie = await ipaLogin();
      const groupResult = await ipaCall(cookie, 'group_show', [`${tenant.slug}-users`], { all: true });
      const members: string[] = groupResult.result?.result?.member_user ?? [];
      if (members.length > 0) {
        const ipaResult = await ipaCall(cookie, 'user_find', [[]], {
          in_group: [`${tenant.slug}-users`],
          all: true,
          sizelimit: 500,
        });
        for (const u of (ipaResult.result?.result ?? [])) {
          const uid = u.uid?.[0];
          if (uid) ipaMap[uid] = {
            dept: u.departmentnumber?.[0] || u.ou?.[0] || '-',
            locked: !!u.nsaccountlock,
          };
        }
      }
    } catch { /* enrich is best-effort */ }

    const users = usersResult.rows.map(u => ({
      username:  u.username,
      name:      u.full_name || u.username,
      email:     u.email || '',
      role:      u.role || 'member',
      isAdmin:   u.is_admin,
      status:    u.status || 'active',
      dept:      ipaMap[u.username]?.dept ?? '-',
      ipaLocked: ipaMap[u.username]?.locked ?? false,
    }));

    return json({ ok: true, tenant: { id: tenant.id, name: tenant.name, slug: tenant.slug }, users });
  } catch (e) {
    return json({ ok: false, error: String(e) }, { status: 500 });
  }
};

/** POST /api/admin/tenant/[id]/users — add a user to a tenant */
export const POST: RequestHandler = async ({ params, request, cookies }) => {
  const auth = await requireAdminOrOwner(cookies, params.id);
  if (!auth.ok) return auth.res;
  const actor = auth.username;
  const { username, fullName, email, password, role = 'member' } = await request.json();

  if (!username || !fullName || !email || !password) {
    return json({ ok: false, error: 'username, fullName, email, password wajib' }, { status: 400 });
  }

  try {
    const tenantResult = await db.query(
      `SELECT id, name, slug FROM tenants WHERE id = $1`, [params.id]
    );
    if (!tenantResult.rows.length) return json({ ok: false, error: 'Tenant tidak ditemukan' }, { status: 404 });
    const tenant = tenantResult.rows[0];

    const cookie = await ipaLogin();
    const names     = fullName.trim().split(' ');
    const givenname = names[0];
    const sn        = names.slice(1).join(' ') || names[0];

    // Create FreeIPA user
    const addResult = await ipaCall(cookie, 'user_add', [username], {
      givenname,
      sn,
      cn:               fullName,
      mail:             email,
      userpassword:     password,
      departmentnumber: [tenant.slug],
      title:            role,
    });
    if (addResult.error) {
      return json({ ok: false, error: `FreeIPA: ${addResult.error.message}` }, { status: 400 });
    }

    // Add to FreeIPA group
    await ipaCall(cookie, 'group_add_member', [`${tenant.slug}-users`], { user: username }).catch(() => null);

    // Upsert tenant_users
    await db.query(
      `INSERT INTO tenant_users (tenant_id, username, email, full_name, role, is_admin, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'active')
       ON CONFLICT (tenant_id, username) DO UPDATE
         SET email = EXCLUDED.email, full_name = EXCLUDED.full_name,
             role = EXCLUDED.role, is_admin = EXCLUDED.is_admin, status = 'active'`,
      [tenant.id, username, email, fullName, role, role === 'org-admin']
    );

    await logAudit(actor, 'ADD_TENANT_USER', username, { tenantId: tenant.id, tenantSlug: tenant.slug, email, role });

    return json({ ok: true });
  } catch (e) {
    return json({ ok: false, error: String(e) }, { status: 500 });
  }
};
