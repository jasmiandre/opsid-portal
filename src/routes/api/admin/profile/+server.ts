import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const KC_BASE = 'https://auth.opsid.web.id';

async function getKcAdminToken(): Promise<string> {
  const res = await fetch(`${KC_BASE}/realms/master/protocol/openid-connect/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'client_id=admin-cli&grant_type=password&username=opsid-admin&password=sandiaman2026',
  });
  const d = await res.json();
  return d.access_token;
}

export const GET: RequestHandler = async ({ request }) => {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) return json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const res = await fetch(`${KC_BASE}/realms/opsid-internal/protocol/openid-connect/userinfo`, {
      headers: { 'Authorization': authHeader },
    });
    if (!res.ok) return json({ error: 'Token tidak valid' }, { status: 401 });
    const profile = await res.json();
    return json({ ok: true, profile });
  } catch (e) {
    return json({ error: String(e) }, { status: 500 });
  }
};

export const PUT: RequestHandler = async ({ request }) => {
  const { username, newPassword } = await request.json();
  if (!username || !newPassword) {
    return json({ error: 'username dan newPassword wajib' }, { status: 400 });
  }

  try {
    const token = await getKcAdminToken();

    const usersRes = await fetch(
      `${KC_BASE}/admin/realms/opsid-internal/users?username=${encodeURIComponent(username)}&exact=true`,
      { headers: { 'Authorization': `Bearer ${token}` } }
    );
    const users = await usersRes.json();
    if (!users.length) return json({ error: 'User tidak ditemukan' }, { status: 404 });

    const userId = users[0].id;

    const resetRes = await fetch(
      `${KC_BASE}/admin/realms/opsid-internal/users/${userId}/reset-password`,
      {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'password', value: newPassword, temporary: false }),
      }
    );

    if (!resetRes.ok) return json({ error: 'Gagal reset password' }, { status: 500 });
    return json({ ok: true });
  } catch (e) {
    return json({ error: String(e) }, { status: 500 });
  }
};
