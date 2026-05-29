import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import db from '$lib/db';

export const GET: RequestHandler = async ({ url }) => {
  try {
    const tenant = url.searchParams.get('tenant');
    const params: string[] = [];
    let where = '';

    if (tenant) {
      params.push(`%${tenant}%`);
      where = `WHERE target ILIKE $1 OR metadata::text ILIKE $1`;
    }

    const result = await db.query(
      `SELECT id, actor, action, target, metadata, created_at
       FROM audit_logs
       ${where}
       ORDER BY created_at DESC
       LIMIT 50`,
      params
    );

    const logs = result.rows.map((row) => {
      const d = new Date(row.created_at);
      return {
        id: row.id,
        time: d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        date: d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
        actor: row.actor,
        action: row.action,
        target: row.target,
        type: row.action.includes('DELETE') ? 'danger'
            : row.action.includes('IMPERSON') || row.action.includes('RESTART') ? 'warn'
            : 'info',
        metadata: row.metadata,
      };
    });

    return json({ logs });
  } catch (e) {
    return json({ error: String(e) }, { status: 500 });
  }
};
