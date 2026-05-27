import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import db from '$lib/db';

interface Notification {
  id: string;
  type: 'info' | 'warn' | 'danger';
  message: string;
  time: string;
  read: boolean;
}

export const GET: RequestHandler = async () => {
  const notifications: Notification[] = [];

  // Ambil audit log terbaru sebagai notifikasi sistem
  try {
    const result = await db.query(`
      SELECT id, action, target, created_at
      FROM audit_logs
      ORDER BY created_at DESC
      LIMIT 15
    `);

    for (const row of result.rows) {
      notifications.push({
        id: String(row.id),
        type: row.action.includes('DELETE') ? 'danger'
            : row.action.includes('IMPERSON') || row.action.includes('WARN') || row.action.includes('RESTART') ? 'warn'
            : 'info',
        message: `${row.action} → ${row.target}`,
        time: new Date(row.created_at).toLocaleString('id-ID'),
        read: false,
      });
    }
  } catch { /* skip */ }

  return json({ notifications, unread: notifications.length });
};
