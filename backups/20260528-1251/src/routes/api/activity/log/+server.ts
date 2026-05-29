import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { logActivity } from '$lib/server/activity';

const ALLOWED_ACTIONS = new Set([
  'OPEN_MAIL', 'OPEN_DRIVE', 'OPEN_CALENDAR', 'OPEN_ODOO', 'OPEN_KEYCLOAK',
  'VIEW_DASHBOARD', 'VIEW_TASKS', 'VIEW_ACTIVITY',
  'SETTINGS_CHANGE', 'LOGOUT',
]);

function decodeToken(token: string): any {
  try {
    const b64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(Buffer.from(b64, 'base64').toString('utf8'));
  } catch { return null; }
}

/** POST /api/activity/log — record a user-visible activity event from client */
export const POST: RequestHandler = async ({ request, cookies }) => {
  const token   = cookies.get('opsid_token');
  const payload = token ? decodeToken(token) : null;
  const actor: string = payload?.preferred_username ?? '';

  if (!actor) return json({ ok: false, error: 'Not authenticated' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const action: string = (body.action ?? '').toUpperCase();
  const target: string = body.target ?? '';

  if (!ALLOWED_ACTIONS.has(action)) {
    return json({ ok: false, error: `Action '${action}' tidak diizinkan` }, { status: 400 });
  }

  await logActivity(actor, action, target);
  return json({ ok: true });
};
