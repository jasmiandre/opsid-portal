import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import db from '$lib/db';
import { logAudit, usernameFromCookie } from '$lib/server/audit';

const FREEIPA_URL   = 'https://ipa.opsid.web.id/ipa';
const FREEIPA_ADMIN = 'admin';
const FREEIPA_PASS  = 'Sandiaman2026';
const KC_BASE       = 'http://10.34.1.4:8080'; // internal — no hairpin NAT

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

async function getKcToken(): Promise<string> {
  const res = await fetch(`${KC_BASE}/realms/master/protocol/openid-connect/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'client_id=admin-cli&grant_type=password&username=opsid-admin&password=sandiaman2026',
  });
  const d = await res.json();
  return d.access_token;
}

function requireAdmin(cookies: any): { ok: false; res: Response } | { ok: true; username: string } {
  const token = cookies.get('opsid_token');
  if (!token) return { ok: false, res: json({ ok: false, error: 'Unauthorized' }, { status: 401 }) as Response };
  try {
    const b64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const p   = JSON.parse(Buffer.from(b64, 'base64').toString('utf8'));
    if (!(p?.realm_access?.roles ?? []).includes('opsid-admin'))
      return { ok: false, res: json({ ok: false, error: 'Forbidden' }, { status: 403 }) as Response };
    return { ok: true, username: p.preferred_username ?? 'admin' };
  } catch {
    return { ok: false, res: json({ ok: false, error: 'Invalid token' }, { status: 401 }) as Response };
  }
}

/** PATCH /api/admin/tenant/[id]/users/[username] — update role, status, or reset password */
export const PATCH: RequestHandler = async ({ params, request, cookies }) => {
  const authCheck = requireAdmin(cookies);
  if (!authCheck.ok) return authCheck.res;
  const actor = authCheck.username;
  const { action, role, newPassword } = await request.json();

  try {
    const tenantResult = await db.query(
      `SELECT id, slug FROM tenants WHERE id = $1`, [params.id]
    );
    if (!tenantResult.rows.length) return json({ ok: false, error: 'Tenant tidak ditemukan' }, { status: 404 });
    const tenant = tenantResult.rows[0];

    if (action === 'set_role') {
      if (!role) return json({ ok: false, error: 'role wajib' }, { status: 400 });
      const isAdmin = role === 'org-admin';

      // Update FreeIPA title
      const cookie = await ipaLogin();
      await ipaCall(cookie, 'user_mod', [params.username], { title: role }).catch(() => null);

      // Update DB
      await db.query(
        `UPDATE tenant_users SET role = $1, is_admin = $2 WHERE tenant_id = $3 AND username = $4`,
        [role, isAdmin, tenant.id, params.username]
      );

      await logAudit(actor, 'SET_USER_ROLE', params.username, { tenantId: tenant.id, role });
      return json({ ok: true });
    }

    if (action === 'suspend') {
      // Lock in FreeIPA
      const cookie = await ipaLogin();
      await ipaCall(cookie, 'user_disable', [params.username], {}).catch(() => null);

      await db.query(
        `UPDATE tenant_users SET status = 'suspended' WHERE tenant_id = $1 AND username = $2`,
        [tenant.id, params.username]
      );

      await logAudit(actor, 'SUSPEND_USER', params.username, { tenantId: tenant.id });
      return json({ ok: true });
    }

    if (action === 'activate') {
      // Unlock in FreeIPA
      const cookie = await ipaLogin();
      await ipaCall(cookie, 'user_enable', [params.username], {}).catch(() => null);

      await db.query(
        `UPDATE tenant_users SET status = 'active' WHERE tenant_id = $1 AND username = $2`,
        [tenant.id, params.username]
      );

      await logAudit(actor, 'ACTIVATE_USER', params.username, { tenantId: tenant.id });
      return json({ ok: true });
    }

    if (action === 'reset_password') {
      if (!newPassword || newPassword.length < 8) {
        return json({ ok: false, error: 'Password minimal 8 karakter' }, { status: 400 });
      }

      // Reset in Keycloak
      try {
        const kcToken = await getKcToken();
        const usersRes = await fetch(
          `${KC_BASE}/admin/realms/opsid-internal/users?username=${encodeURIComponent(params.username)}&exact=true`,
          { headers: { 'Authorization': `Bearer ${kcToken}` } }
        );
        const users = await usersRes.json();
        if (users.length > 0) {
          await fetch(
            `${KC_BASE}/admin/realms/opsid-internal/users/${users[0].id}/reset-password`,
            {
              method: 'PUT',
              headers: { 'Authorization': `Bearer ${kcToken}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({ type: 'password', value: newPassword, temporary: false }),
            }
          );
        }
      } catch { /* FreeIPA fallback below */ }

      // Also reset in FreeIPA
      const cookie = await ipaLogin();
      await ipaCall(cookie, 'user_mod', [params.username], { userpassword: newPassword }).catch(() => null);

      await logAudit(actor, 'RESET_PASSWORD', params.username, { tenantId: tenant.id });
      return json({ ok: true });
    }

    return json({ ok: false, error: 'Action tidak dikenal' }, { status: 400 });
  } catch (e) {
    return json({ ok: false, error: String(e) }, { status: 500 });
  }
};

/** DELETE /api/admin/tenant/[id]/users/[username] — remove user from tenant */
export const DELETE: RequestHandler = async ({ params, cookies }) => {
  const authCheck = requireAdmin(cookies);
  if (!authCheck.ok) return authCheck.res;
  const actor = authCheck.username;

  try {
    const tenantResult = await db.query(
      `SELECT id, slug FROM tenants WHERE id = $1`, [params.id]
    );
    if (!tenantResult.rows.length) return json({ ok: false, error: 'Tenant tidak ditemukan' }, { status: 404 });
    const tenant = tenantResult.rows[0];

    // Remove from FreeIPA group (don't delete the user — they may belong to other tenants)
    const cookie = await ipaLogin();
    await ipaCall(cookie, 'group_remove_member', [`${tenant.slug}-users`], { user: params.username }).catch(() => null);

    // Remove from tenant_users
    await db.query(
      `DELETE FROM tenant_users WHERE tenant_id = $1 AND username = $2`,
      [tenant.id, params.username]
    );

    await logAudit(actor, 'REMOVE_TENANT_USER', params.username, { tenantId: tenant.id, slug: tenant.slug });
    return json({ ok: true });
  } catch (e) {
    return json({ ok: false, error: String(e) }, { status: 500 });
  }
};
