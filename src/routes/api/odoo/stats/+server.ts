import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

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
  const cookie = res.headers.get('set-cookie') || '';
  return cookie.split(';')[0];
}

async function odooCall(session: string, model: string, method: string, args: any[], kwargs: any = {}) {
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

export const GET: RequestHandler = async () => {
  try {
    const session = await odooSession();

    const [crmLeads, crmWon, employees, calEvents] = await Promise.all([
      odooCall(session, 'crm.lead', 'search_count', [[['active', '=', true], ['type', '=', 'opportunity']]]),
      odooCall(session, 'crm.lead', 'search_count', [[['active', '=', false], ['probability', '=', 100]]]),
      odooCall(session, 'hr.employee', 'search_count', [[['active', '=', true]]]),
      odooCall(session, 'calendar.event', 'search_count', [[
        ['start', '>=', new Date().toISOString().split('T')[0] + ' 00:00:00'],
        ['start', '<=', new Date().toISOString().split('T')[0] + ' 23:59:59'],
      ]]),
    ]);

    return json({
      ok: true,
      crm: { leads: crmLeads || 0, won: crmWon || 0 },
      hr:  { employees: employees || 0 },
      calendar: { today: calEvents || 0 },
    });
  } catch (e) {
    return json({ ok: false, error: String(e) }, { status: 500 });
  }
};
