import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import db from '$lib/db';
import dns from 'dns';
import { promisify } from 'util';

const lookup = promisify(dns.lookup);
const TARGET_IP = '103.134.152.140';

function decodeToken(token: string): any {
  try {
    const b64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(Buffer.from(b64, 'base64').toString('utf8'));
  } catch { return null; }
}

export const GET: RequestHandler = async ({ params, cookies }) => {
  // Auth: opsid-admin only
  const token = cookies.get('opsid_token');
  if (!token) return json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  if (!(decodeToken(token)?.realm_access?.roles ?? []).includes('opsid-admin'))
    return json({ ok: false, error: 'Forbidden' }, { status: 403 });

  try {
    const result = await db.query(`SELECT domain FROM tenants WHERE id = $1`, [params.id]);
    if (!result.rows.length) return json({ error: 'Tenant tidak ditemukan' }, { status: 404 });

    const { domain } = result.rows[0];

    try {
      const { address } = await lookup(domain);
      return json({
        ok: true,
        domain,
        resolved_ip: address,
        pointing: address === TARGET_IP,
        target_ip: TARGET_IP,
      });
    } catch {
      return json({
        ok: false,
        domain,
        error: 'DNS tidak dapat diselesaikan',
        pointing: false,
        target_ip: TARGET_IP,
      });
    }
  } catch (e) {
    return json({ error: String(e) }, { status: 500 });
  }
};
