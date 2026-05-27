import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import db from '$lib/db';

async function getKcToken(): Promise<string> {
  const res = await fetch('https://auth.opsid.web.id/realms/master/protocol/openid-connect/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'client_id=admin-cli&grant_type=password&username=opsid-admin&password=sandiaman2026'
  });
  const d = await res.json();
  return d.access_token;
}

export const POST: RequestHandler = async ({ request, fetch: svelteFetch }) => {
  const { username } = await request.json();
  if (!username) return json({ error: 'username wajib' }, { status: 400 });

  try {
    const token = await getKcToken();

    // Cari user di Keycloak
    const usersRes = await fetch(
      `https://auth.opsid.web.id/admin/realms/opsid-internal/users?username=${username}&exact=true`,
      { headers: { 'Authorization': `Bearer ${token}` } }
    );
    const users = await usersRes.json();
    if (!users.length) return json({ error: 'User tidak ditemukan' }, { status: 404 });

    const userId = users[0].id;

    // Call Keycloak impersonation dari server
    const impRes = await fetch(
      `https://auth.opsid.web.id/admin/realms/opsid-internal/users/${userId}/impersonation`,
      { 
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const impData = await impRes.json();

    // Catat audit log
    await db.query(
      `INSERT INTO audit_logs (actor, action, target, metadata) VALUES ($1, $2, $3, $4)`,
      ['jasmiandre', 'IMPERSONATE', username, JSON.stringify({ userId, result: impData })]
    );

    return json({ ok: true, redirect: impData.redirect || 'https://opsid.web.id' });
  } catch (e) {
    return json({ error: String(e) }, { status: 500 });
  }
};
