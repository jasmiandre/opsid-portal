import type { RequestHandler } from '@sveltejs/kit';
import { json } from '@sveltejs/kit';
import db from '$lib/db';
import { logAudit, usernameFromCookie } from '$lib/server/audit';
import { logActivity } from '$lib/server/activity';

const FREEIPA_URL   = 'https://ipa.opsid.web.id/ipa';
const FREEIPA_ADMIN = 'admin';
const FREEIPA_PASS  = 'Sandiaman2026';
const KC_BASE       = 'https://auth.opsid.web.id';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// ── IPA helpers ──────────────────────────────────────────────

async function ipaLogin(): Promise<string> {
  const res = await fetch(`${FREEIPA_URL}/session/login_password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Referer': FREEIPA_URL },
    body: `user=${FREEIPA_ADMIN}&password=${encodeURIComponent(FREEIPA_PASS)}`,
  });
  if (!res.ok) throw new Error(`FreeIPA login failed: ${res.status}`);
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

// ── KC helpers ───────────────────────────────────────────────

async function getKcToken(): Promise<string> {
  const res = await fetch(`${KC_BASE}/realms/master/protocol/openid-connect/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'client_id=admin-cli&grant_type=password&username=opsid-admin&password=sandiaman2026',
  });
  const d = await res.json();
  if (!d.access_token) throw new Error('KC token exchange failed');
  return d.access_token;
}

async function findKcUserId(kcToken: string, username: string): Promise<string | null> {
  const res = await fetch(
    `${KC_BASE}/admin/realms/opsid-internal/users?username=${encodeURIComponent(username)}&exact=true`,
    { headers: { 'Authorization': `Bearer ${kcToken}` } }
  );
  if (!res.ok) return null;
  const users = await res.json();
  return users[0]?.id ?? null;
}

// ── PATCH ────────────────────────────────────────────────────
// Body options:
//   { name, email, dept, role }            — edit user details
//   { action: 'suspend' }                  — disable in FreeIPA + KC + DB
//   { action: 'activate' }                 — enable in FreeIPA + KC + DB

export const PATCH: RequestHandler = async ({ params, request, cookies }) => {
  const username = params.username;
  if (!username) return json({ success: false, error: 'Username diperlukan' }, { status: 400 });

  const actor = usernameFromCookie(cookies.get('opsid_token'));
  const body  = await request.json();
  const { action } = body;

  // ── suspend ──────────────────────────────────────────────────
  if (action === 'suspend') {
    try {
      const errors: string[] = [];

      // 1. FreeIPA
      try {
        const cookie = await ipaLogin();
        const r = await ipaCall(cookie, 'user_disable', [username], {});
        if (r.error) errors.push(`FreeIPA: ${r.error.message}`);
      } catch (e) { errors.push(`FreeIPA: ${String(e)}`); }

      // 2. Keycloak
      try {
        const kcToken = await getKcToken();
        const userId  = await findKcUserId(kcToken, username);
        if (userId) {
          await fetch(`${KC_BASE}/admin/realms/opsid-internal/users/${userId}`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${kcToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ enabled: false }),
          });
        }
      } catch (e) { errors.push(`KC: ${String(e)}`); }

      // 3. DB — update all tenant_users rows for this username
      await db.query(
        `UPDATE tenant_users SET status = 'suspended' WHERE username = $1`,
        [username]
      ).catch(() => null);

      await logAudit(actor, 'SUSPEND_USER', username, { errors });
      await logActivity(actor, 'SUSPEND_USER', username);

      return json({
        success: true,
        message:  `User ${username} di-suspend`,
        warnings: errors.length ? errors : undefined,
      });
    } catch (e) {
      return json({ success: false, error: String(e) }, { status: 500 });
    }
  }

  // ── activate ─────────────────────────────────────────────────
  if (action === 'activate') {
    try {
      const errors: string[] = [];

      // 1. FreeIPA
      try {
        const cookie = await ipaLogin();
        const r = await ipaCall(cookie, 'user_enable', [username], {});
        if (r.error) errors.push(`FreeIPA: ${r.error.message}`);
      } catch (e) { errors.push(`FreeIPA: ${String(e)}`); }

      // 2. Keycloak
      try {
        const kcToken = await getKcToken();
        const userId  = await findKcUserId(kcToken, username);
        if (userId) {
          await fetch(`${KC_BASE}/admin/realms/opsid-internal/users/${userId}`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${kcToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ enabled: true }),
          });
        }
      } catch (e) { errors.push(`KC: ${String(e)}`); }

      // 3. DB
      await db.query(
        `UPDATE tenant_users SET status = 'active' WHERE username = $1`,
        [username]
      ).catch(() => null);

      await logAudit(actor, 'ACTIVATE_USER', username, { errors });
      await logActivity(actor, 'ACTIVATE_USER', username);

      return json({
        success: true,
        message:  `User ${username} diaktifkan kembali`,
        warnings: errors.length ? errors : undefined,
      });
    } catch (e) {
      return json({ success: false, error: String(e) }, { status: 500 });
    }
  }

  // ── edit details ─────────────────────────────────────────────
  const { name, email, dept, role } = body;

  try {
    const errors: string[] = [];

    // 1. FreeIPA
    try {
      const cookie  = await ipaLogin();
      const kwargs: Record<string, unknown> = {};
      if (name)  {
        const parts = name.trim().split(' ');
        kwargs.givenname = parts[0];
        kwargs.sn        = parts.slice(1).join(' ') || parts[0];
        kwargs.cn        = name;
      }
      if (email) kwargs.mail             = email;
      if (dept)  kwargs.departmentnumber = [dept];
      if (role)  kwargs.title            = role;

      if (Object.keys(kwargs).length) {
        const r = await ipaCall(cookie, 'user_mod', [username], kwargs);
        if (r.error) errors.push(`FreeIPA: ${r.error.message}`);
      }
    } catch (e) { errors.push(`FreeIPA: ${String(e)}`); }

    // 2. Keycloak
    try {
      const kcToken = await getKcToken();
      const userId  = await findKcUserId(kcToken, username);
      if (userId) {
        const parts    = (name ?? '').trim().split(' ');
        const kcUpdate: Record<string, unknown> = {};
        if (name)  { kcUpdate.firstName = parts[0]; kcUpdate.lastName = parts.slice(1).join(' ') || parts[0]; }
        if (email) kcUpdate.email = email;
        if (Object.keys(kcUpdate).length) {
          await fetch(`${KC_BASE}/admin/realms/opsid-internal/users/${userId}`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${kcToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(kcUpdate),
          });
        }
      }
    } catch (e) { errors.push(`KC: ${String(e)}`); }

    // 3. DB — update tenant_users
    const dbUpdates: string[] = [];
    const dbValues: unknown[]  = [];
    let idx = 1;
    if (name)  { dbUpdates.push(`full_name = $${idx++}`); dbValues.push(name); }
    if (email) { dbUpdates.push(`email = $${idx++}`);     dbValues.push(email); }
    if (role)  {
      dbUpdates.push(`role = $${idx++}`);     dbValues.push(role);
      dbUpdates.push(`is_admin = $${idx++}`); dbValues.push(role === 'org-admin');
    }
    if (dbUpdates.length) {
      dbValues.push(username);
      await db.query(
        `UPDATE tenant_users SET ${dbUpdates.join(', ')} WHERE username = $${idx}`,
        dbValues
      ).catch(() => null);
    }

    await logAudit(actor, 'EDIT_USER', username, { name, email, dept, role, errors });
    await logActivity(actor, 'EDIT_USER', username);

    return json({
      success: true,
      message:  `User ${username} berhasil diupdate`,
      warnings: errors.length ? errors : undefined,
    });
  } catch (e) {
    return json({ success: false, error: String(e) }, { status: 500 });
  }
};

// ── DELETE ───────────────────────────────────────────────────

export const DELETE: RequestHandler = async ({ params, cookies }) => {
  const username = params.username;
  if (!username) return json({ success: false, error: 'Username diperlukan' }, { status: 400 });

  const actor = usernameFromCookie(cookies.get('opsid_token'));

  try {
    const errors: string[] = [];

    // 1. Remove from all tenant_users rows first
    await db.query(`DELETE FROM tenant_users WHERE username = $1`, [username]).catch(() => null);

    // 2. FreeIPA delete
    try {
      const cookie = await ipaLogin();
      const r = await ipaCall(cookie, 'user_del', [username], {});
      if (r.error) errors.push(`FreeIPA: ${r.error.message}`);
    } catch (e) { errors.push(`FreeIPA: ${String(e)}`); }

    // 3. Keycloak delete
    try {
      const kcToken = await getKcToken();
      const userId  = await findKcUserId(kcToken, username);
      if (userId) {
        await fetch(`${KC_BASE}/admin/realms/opsid-internal/users/${userId}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${kcToken}` },
        });
      }
    } catch (e) { errors.push(`KC: ${String(e)}`); }

    await logAudit(actor, 'DELETE_USER', username, { errors });
    await logActivity(actor, 'DELETE_USER', username);

    return json({
      success: true,
      message:  `User ${username} dihapus`,
      warnings: errors.length ? errors : undefined,
    });
  } catch (e) {
    return json({ success: false, error: String(e) }, { status: 500 });
  }
};
