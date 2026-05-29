import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import tls from 'tls';
import dns from 'dns/promises';
import db from '$lib/db';

const OPSID_IP = '103.134.152.140';

function checkTlsCert(domain: string): Promise<{
  valid: boolean; subject: string; issuer: string;
  expires: string; daysLeft: number;
}> {
  return new Promise((resolve, reject) => {
    const socket = tls.connect(
      { host: domain, port: 443, servername: domain, rejectUnauthorized: false },
      () => {
        const cert = socket.getPeerCertificate();
        socket.destroy();
        const expires  = cert.valid_to ?? '';
        const expDate  = new Date(expires);
        const daysLeft = Math.floor((expDate.getTime() - Date.now()) / 86400000);
        resolve({
          valid:    socket.authorized,
          subject:  cert.subject?.CN ?? '',
          issuer:   cert.issuer?.O  ?? '',
          expires,
          daysLeft,
        });
      }
    );
    socket.on('error', reject);
    socket.setTimeout(6000, () => { socket.destroy(); reject(new Error('TLS timeout')); });
  });
}

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

  // Fetch tenant
  const row = await db.query(`SELECT id, domain FROM tenants WHERE id = $1`, [params.id])
    .then(r => r.rows[0]).catch(() => null);
  if (!row) return json({ ok: false, error: 'Tenant tidak ditemukan' }, { status: 404 });

  const domain = row.domain;
  const result: Record<string, any> = { domain };

  // ── DNS check ─────────────────────────────────────────────
  try {
    const addrs = await dns.resolve4(domain);
    result.dns_ip       = addrs[0] ?? null;
    result.dns_pointing = addrs.includes(OPSID_IP);
  } catch (e: any) {
    result.dns_ip       = null;
    result.dns_pointing = false;
    result.dns_error    = String(e);
  }

  // ── SSL check ─────────────────────────────────────────────
  try {
    const cert = await checkTlsCert(domain);
    result.ssl_valid   = cert.valid;
    result.ssl_subject = cert.subject;
    result.ssl_issuer  = cert.issuer;
    result.ssl_expires = cert.expires;
    result.ssl_days_left = cert.daysLeft;

    // Persist to DB
    await db.query(
      `UPDATE tenants SET ssl_cert_issuer=$1, ssl_cert_subject=$2,
         ssl_cert_expires=$3, ssl_checked_at=NOW() WHERE id=$4`,
      [cert.issuer, cert.subject, cert.expires ? new Date(cert.expires) : null, params.id]
    ).catch(() => null);
  } catch (e: any) {
    result.ssl_valid  = false;
    result.ssl_error  = String(e);
  }

  return json({ ok: true, ...result });
};
