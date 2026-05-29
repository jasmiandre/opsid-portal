import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const ODOO_URL  = 'http://10.34.1.8:8069';
const ODOO_DB   = 'odoo_db';
const ODOO_USER = 'admin';
const ODOO_PASS = 'Sandiaman2026';

async function odooSession(): Promise<string> {
  const res = await fetch(`${ODOO_URL}/web/session/authenticate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0', method: 'call', id: 1,
      params: { db: ODOO_DB, login: ODOO_USER, password: ODOO_PASS }
    })
  });
  const cookie = res.headers.get('set-cookie') ?? '';
  return cookie.split(';')[0];
}

async function odooCall(session: string, model: string, method: string, args: unknown[], kwargs: Record<string, unknown> = {}) {
  const res = await fetch(`${ODOO_URL}/web/dataset/call_kw`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': session },
    body: JSON.stringify({
      jsonrpc: '2.0', method: 'call', id: Math.random(),
      params: { model, method, args, kwargs }
    })
  });
  const d = await res.json();
  return d.result;
}

export const GET: RequestHandler = async ({ url }) => {
  // username hint from query — used only for logging; actual task filter is open
  const _user = url.searchParams.get('user') ?? '';

  try {
    const session = await odooSession();

    // Search tasks assigned to any user (limit 50, newest first)
    const taskIds: number[] = await odooCall(
      session, 'project.task', 'search',
      [[['active', '=', true]]],
      { limit: 50, order: 'write_date desc' }
    );

    if (!taskIds || taskIds.length === 0) {
      return json({ ok: true, tasks: [] });
    }

    const taskData = await odooCall(
      session, 'project.task', 'read',
      [taskIds, ['id', 'name', 'project_id', 'stage_id', 'date_deadline', 'priority', 'kanban_state']],
      {}
    );

    interface OdooTask {
      id: number;
      name: string;
      project_id: [number, string] | false;
      stage_id: [number, string] | false;
      date_deadline: string | false;
      priority: string;
      kanban_state: string;
    }

    const tasks = (taskData as OdooTask[]).map((t) => ({
      id: t.id,
      name: t.name,
      projectName: Array.isArray(t.project_id) ? t.project_id[1] : 'Tanpa Proyek',
      state: t.kanban_state ?? 'normal',
      stageName: Array.isArray(t.stage_id) ? t.stage_id[1] : '',
      dateDeadline: t.date_deadline || null,
      priority: t.priority ?? '0',
    }));

    return json({ ok: true, tasks });
  } catch (e) {
    return json({ ok: false, error: 'Gagal mengambil data tugas Odoo: ' + String(e) }, { status: 500 });
  }
};
