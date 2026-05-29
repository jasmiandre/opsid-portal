import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import db from '$lib/db';
import dns from 'dns';
import { promisify } from 'util';

const lookup = promisify(dns.lookup);
const TARGET_IP = '103.134.152.140';

export const GET: RequestHandler = async ({ params }) => {
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
