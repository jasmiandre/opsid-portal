import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { logAudit, usernameFromCookie } from '$lib/server/audit';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const KC_BASE = 'https://auth.opsid.web.id';

async function getKcToken(): Promise<string> {
  const res = await fetch(`${KC_BASE}/realms/master/protocol/openid-connect/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'client_id=admin-cli&grant_type=password&username=opsid-admin&password=sandiaman2026',
  });
  const d = await res.json();
  if (!d.access_token) throw new Error('KC admin token exchange failed');
  return d.access_token;
}

export const POST: RequestHandler = async ({ request, cookies }) => {
  const actor    = usernameFromCookie(cookies.get('opsid_token'));
  const { username } = await request.json();

  if (!username) return json({ error: 'username wajib' }, { status: 400 });
  if (!actor || actor === 'anonymous') {
    return json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const kcToken = await getKcToken();

    // Cari user ID di Keycloak
    const usersRes = await fetch(
      `${KC_BASE}/admin/realms/opsid-internal/users?username=${encodeURIComponent(username)}&exact=true`,
      { headers: { 'Authorization': `Bearer ${kcToken}` } }
    );
    if (!usersRes.ok) throw new Error(`KC users search failed: ${usersRes.status}`);
    const users = await usersRes.json();
    if (!users.length) return json({ error: 'User tidak ditemukan di Keycloak' }, { status: 404 });

    const userId = users[0].id;

    // Jalankan impersonation KC — returns redirect URL
    const impRes = await fetch(
      `${KC_BASE}/admin/realms/opsid-internal/users/${userId}/impersonation`,
      {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${kcToken}`, 'Content-Type': 'application/json' },
      }
    );

    const impData = await impRes.json().catch(() => ({}));
    const redirectUrl: string = impData.redirect || `${KC_BASE}/realms/opsid-internal/account`;

    await logAudit(actor, 'IMPERSONATE_USER', username, { targetUserId: userId, redirectUrl });

    return json({ ok: true, redirect: redirectUrl, message: `Impersonating ${username}` });
  } catch (e) {
    return json({ error: String(e) }, { status: 500 });
  }
};
