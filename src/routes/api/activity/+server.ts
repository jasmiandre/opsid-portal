import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import db from '$lib/db';
import { logActivity } from '$lib/server/activity';

function decodeToken(token: string): any {
  try {
    const b64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(Buffer.from(b64, 'base64').toString('utf8'));
  } catch { return null; }
}

/** GET /api/activity — fetch activity log for current user (or all for admin) */
export const GET: RequestHandler = async ({ cookies, url }) => {
  const token   = cookies.get('opsid_token');
  const payload = token ? decodeToken(token) : null;
  const username: string = payload?.preferred_username ?? '';
  const roles: string[]  = payload?.realm_access?.roles ?? [];
  const isAdmin  = roles.includes('opsid-admin');

  if (!username) return json({ error: 'Not authenticated' }, { status: 401 });

  try {
    // Ensure table exists (first-call migration)
    await logActivity('__system__', '__noop__', ''); // triggers ensureTable
    await db.query(`DELETE FROM activity_logs WHERE actor = '__system__' AND action = '__noop__'`).catch(() => null);

    const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '100'), 500);
    const actorFilter = url.searchParams.get('actor') ?? '';

    let rows;

    if (isAdmin) {
      // Admin sees all events
      const params: unknown[] = [];
      let where = '';
      if (actorFilter) {
        params.push(`%${actorFilter}%`);
        where = `WHERE actor ILIKE $1`;
      }
      const res = await db.query(
        `SELECT id, actor, action, target, metadata, created_at
         FROM activity_logs
         ${where}
         ORDER BY created_at DESC
         LIMIT ${limit}`,
        params
      );
      rows = res.rows;
    } else {
      // Regular users see only their own activity
      const res = await db.query(
        `SELECT id, actor, action, target, metadata, created_at
         FROM activity_logs
         WHERE actor = $1
         ORDER BY created_at DESC
         LIMIT $2`,
        [username, limit]
      );
      rows = res.rows;
    }

    const logs = rows.map(row => {
      const d = new Date(row.created_at);
      return {
        id: row.id,
        time: d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        date: d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
        actor: row.actor,
        action: row.action,
        target: row.target,
        type: row.action.includes('DELETE') ? 'danger'
            : row.action.includes('PASSWORD') || row.action.includes('RESET') ? 'warn'
            : row.action.includes('CREATE') || row.action.includes('ADD') ? 'ok'
            : 'info',
        metadata: row.metadata,
      };
    });

    return json({ logs });
  } catch (e) {
    return json({ error: String(e) }, { status: 500 });
  }
};
