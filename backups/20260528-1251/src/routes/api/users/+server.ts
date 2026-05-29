import type { RequestHandler } from '@sveltejs/kit';
import { json } from '@sveltejs/kit';
import db from '$lib/db';

const FREEIPA_URL   = 'https://ipa.opsid.web.id/ipa';
const FREEIPA_ADMIN = 'admin';
const FREEIPA_PASS  = 'Sandiaman2026';

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
  const roles: string[]  = payload?.realm_access?.roles ?? [];
  const isAdmin = roles.includes('opsid-admin');

  if (!username) return json({ success: false, error: 'Not authenticated' }, { status: 401 });

  // ── Superadmin: all FreeIPA users ────────────────────────────
  if (isAdmin) {
    try {
      const cookie = await ipaLogin();
      const result = await ipaCall(cookie, 'user_find', [[]], { sizelimit: 200, all: true });
      if (result.error) return json({ success: false, error: result.error.message }, { status: 400 });

      const users = (result.result?.result || [])
        .filter((u: any) => !u.uid?.[0]?.startsWith('svc-') && u.uid?.[0] !== 'admin')
        .map(mapIpaUser);

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
       WHERE  tu.username = $1 AND tu.status = 'active'
       LIMIT  1`,
      [username]
    )).rows[0];

    if (!row) return json({ success: false, error: 'Forbidden' }, { status: 403 });
    if (row.role !== 'org-admin') return json({ success: false, error: 'Forbidden' }, { status: 403 });

    const usersResult = await db.query(
      `SELECT username, full_name, email, role, status
       FROM   tenant_users
       WHERE  tenant_id = $1
       ORDER  BY created_at DESC`,
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

// ── POST — create user di FreeIPA ────────────────────────────────────────────

export const POST: RequestHandler = async ({ request }) => {
  const { username, name, fullname, email, password, dept, role } = await request.json();

  if (!username || !(fullname || name) || !email || !password) {
    return json({ success: false, error: 'Username, nama, email, dan password wajib diisi' }, { status: 400 });
  }

  try {
    const cookie = await ipaLogin();
    const names    = (fullname || name).trim().split(' ');
    const givenname = names[0];
    const sn        = names.slice(1).join(' ') || names[0];

    const result = await ipaCall(cookie, 'user_add', [username], {
      givenname,
      sn,
      cn:               fullname || name,
      mail:             email,
      userpassword:     password,
      departmentnumber: dept ? [dept] : undefined,
      title:            role || 'Staff',
    });

    if (result.error) return json({ success: false, error: result.error.message }, { status: 400 });

    return json({ success: true, message: `User ${fullname || name} berhasil dibuat.` });
  } catch (err) {
    return json({ success: false, error: String(err) }, { status: 500 });
  }
};
