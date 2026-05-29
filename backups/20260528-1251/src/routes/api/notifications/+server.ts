import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import db from '$lib/db';

function decodeToken(token: string): any {
  try {
    const b64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(Buffer.from(b64, 'base64').toString('utf8'));
  } catch { return null; }
}

function actionLabel(action: string, target: string): string {
  const map: Record<string, string> = {
    ADD_TENANT_USER: `User ${target} ditambahkan ke tenant`,
    REMOVE_TENANT_USER: `User ${target} dihapus dari tenant`,
    SUSPEND_USER: `User ${target} di-suspend`,
    ACTIVATE_USER: `User ${target} diaktifkan`,
    RESET_PASSWORD: `Password ${target} direset`,
    EDIT_USER: `Profil ${target} diperbarui`,
    DELETE_USER: `User ${target} dihapus`,
    CREATE_TENANT: `Tenant baru: ${target}`,
    DELETE_TENANT: `Tenant ${target} dihapus`,
    SET_USER_ROLE: `Role ${target} diubah`,
    UPDATE_TENANT: `Pengaturan tenant ${target} diperbarui`,
    OPEN_MAIL: `Membuka Mail`,
    OPEN_DRIVE: `Membuka Drive`,
    OPEN_CALENDAR: `Membuka Kalender`,
    OPEN_ODOO: `Membuka Odoo ERP`,
    SETTINGS_CHANGE: `Pengaturan akun diperbarui`,
    IMPERSONATE_USER: `Impersonasi ${target}`,
  };
  return map[action] ?? `${action}${target ? ` → ${target}` : ''}`;
}

function notifType(action: string): 'info' | 'warn' | 'danger' {
  if (action.includes('DELETE') || action.includes('SUSPEND')) return 'danger';
  if (action.includes('IMPERSON') || action.includes('RESET') || action.includes('WARN')) return 'warn';
  return 'info';
}

export const GET: RequestHandler = async ({ cookies }) => {
  const token    = cookies.get('opsid_token');
  const payload  = token ? decodeToken(token) : null;
  const username = payload?.preferred_username ?? '';
  const roles    = payload?.realm_access?.roles ?? [];
  const isAdmin  = roles.includes('opsid-admin');

  const notifications: Array<{
    id: string; type: string; message: string; time: string; read: boolean;
  }> = [];

  try {
    if (isAdmin) {
      // Admin: mix of recent audit_logs (system events) + recent activity_logs
      const [auditRes, actRes] = await Promise.allSettled([
        db.query(
          `SELECT id, actor, action, target, created_at, 'audit' AS src
           FROM audit_logs ORDER BY created_at DESC LIMIT 10`
        ),
        db.query(
          `SELECT id, actor, action, target, created_at, 'activity' AS src
           FROM activity_logs ORDER BY created_at DESC LIMIT 10`
        ).catch(() => ({ rows: [] })),
      ]);

      const auditRows  = auditRes.status  === 'fulfilled' ? auditRes.value.rows  : [];
      const actRows    = actRes.status    === 'fulfilled' ? actRes.value.rows    : [];

      const allRows = [...auditRows, ...actRows]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 15);

      for (const row of allRows) {
        notifications.push({
          id:      `${row.src}-${row.id}`,
          type:    notifType(row.action),
          message: actionLabel(row.action, row.target),
          time:    new Date(row.created_at).toLocaleString('id-ID'),
          read:    false,
        });
      }
    } else if (username) {
      // Regular user: their own recent activity
      const res = await db.query(
        `SELECT id, actor, action, target, created_at
         FROM activity_logs
         WHERE actor = $1
         ORDER BY created_at DESC
         LIMIT 12`,
        [username]
      ).catch(() => ({ rows: [] }));

      for (const row of res.rows) {
        notifications.push({
          id:      String(row.id),
          type:    notifType(row.action),
          message: actionLabel(row.action, row.target),
          time:    new Date(row.created_at).toLocaleString('id-ID'),
          read:    false,
        });
      }
    }
  } catch { /* fallback to empty */ }

  return json({ notifications, unread: notifications.length });
};
