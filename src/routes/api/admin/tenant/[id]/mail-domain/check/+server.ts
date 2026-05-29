import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import db from '$lib/db';
import dns from 'dns';
import { promisify } from 'util';

const resolveMx  = promisify(dns.resolveMx);
const resolveTxt = promisify(dns.resolveTxt);
const MX_HOST    = 'mail.opsid.web.id';
const DNS_TIMEOUT_MS = 6000;

// ── Auth helper ───────────────────────────────────────────────────────────

function decodeToken(token: string): any {
  try {
    const b64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(Buffer.from(b64, 'base64').toString('utf8'));
  } catch { return null; }
}

// ── DNS check helpers ─────────────────────────────────────────────────────

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('DNS timeout')), ms)
    ),
  ]);
}

async function checkMx(domain: string) {
  try {
    const records = await withTimeout(resolveMx(domain), DNS_TIMEOUT_MS);
    const match   = records.find(r => r.exchange.toLowerCase() === MX_HOST);
    return {
      ok:       !!match,
      value:    records.map(r => `${r.priority} ${r.exchange}`).join(', '),
      expected: `10 ${MX_HOST}`,
      detail:   match ? `Ditemukan: ${match.priority} ${match.exchange}` : `Tidak ada MX ke ${MX_HOST}`,
    };
  } catch (e: any) {
    return { ok: false, value: null, expected: `10 ${MX_HOST}`, detail: e.message };
  }
}

async function checkSpf(domain: string) {
  try {
    const records = await withTimeout(resolveTxt(domain), DNS_TIMEOUT_MS);
    const flat    = records.map(r => r.join('')).join('\n');
    const spfRec  = records.map(r => r.join('')).find(r => r.startsWith('v=spf1'));
    if (!spfRec) return { ok: false, value: null, detail: 'Tidak ada SPF record' };
    const hasOpsid = spfRec.includes('mail.opsid.web.id') ||
                     spfRec.includes('include:opsid.web.id') ||
                     spfRec.includes('ip4:103.134.152.140');
    return {
      ok:     hasOpsid,
      value:  spfRec,
      detail: hasOpsid ? 'SPF mencakup mail server OPSID' : 'SPF ada tapi tidak include mail.opsid.web.id',
    };
  } catch (e: any) {
    return { ok: false, value: null, detail: e.message };
  }
}

async function checkDkim(domain: string, selector: string, storedKey: string | null) {
  const dkimName = `${selector}._domainkey.${domain}`;
  try {
    const records = await withTimeout(resolveTxt(dkimName), DNS_TIMEOUT_MS);
    const flat    = records.map(r => r.join('')).join('');
    if (!flat.includes('v=DKIM1'))
      return { ok: false, value: flat || null, detail: 'Record ditemukan tapi bukan DKIM1' };

    // If we have a stored key, verify it matches
    if (storedKey) {
      const storedP  = (storedKey.match(/p=([A-Za-z0-9+/=]+)/) ?? [])[1] ?? '';
      const dnsP     = (flat.match(/p=([A-Za-z0-9+/=]+)/) ?? [])[1] ?? '';
      const matches  = storedP && dnsP && dnsP === storedP;
      return {
        ok:     matches,
        value:  flat,
        detail: matches
          ? 'DKIM record cocok dengan key yang digenerate'
          : 'DKIM record ditemukan tapi public key berbeda — pastikan salin nilai yang benar',
      };
    }
    return { ok: true, value: flat, detail: 'DKIM record valid' };
  } catch (e: any) {
    return { ok: false, value: null, detail: `Record tidak ditemukan: ${e.message}` };
  }
}

async function checkDmarc(domain: string) {
  const dmarcName = `_dmarc.${domain}`;
  try {
    const records = await withTimeout(resolveTxt(dmarcName), DNS_TIMEOUT_MS);
    const flat    = records.map(r => r.join('')).join('');
    const ok      = flat.includes('v=DMARC1');
    return {
      ok,
      value:  flat || null,
      detail: ok ? 'DMARC record valid' : 'Record ditemukan tapi bukan DMARC1',
    };
  } catch (e: any) {
    return { ok: false, value: null, detail: `Record tidak ditemukan: ${e.message}` };
  }
}

// ── GET /check ────────────────────────────────────────────────────────────

export const GET: RequestHandler = async ({ params, cookies }) => {
  const token = cookies.get('opsid_token');
  if (!token) return json({ ok: false, error: 'Unauthorized' }, { status: 401 });

  const claims  = decodeToken(token);
  if (!claims)  return json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  const isAdmin = (claims.realm_access?.roles ?? []).includes('opsid-admin');
  const orgSlug = claims.org_slug ?? claims.organization_slug ?? null;

  // Fetch tenant
  const { rows } = await db.query(
    `SELECT id, mail_domain, dkim_selector, dkim_public_key FROM tenants WHERE id = $1`,
    [params.id]
  );
  if (!rows.length) return json({ ok: false, error: 'Tenant tidak ditemukan' }, { status: 404 });
  const t = rows[0];

  // Tenant admin may only check their own
  if (!isAdmin) {
    const mine = await db.query(`SELECT id FROM tenants WHERE slug = $1`, [orgSlug]);
    if (!mine.rows.length || String(mine.rows[0].id) !== String(params.id))
      return json({ ok: false, error: 'Forbidden' }, { status: 403 });
  }

  if (!t.mail_domain)
    return json({ ok: false, error: 'Mail domain belum dikonfigurasi' }, { status: 400 });

  const domain   = t.mail_domain;
  const selector = t.dkim_selector ?? 'mail';

  // Run all 4 checks in parallel
  const [mx, spf, dkim, dmarc] = await Promise.all([
    checkMx(domain),
    checkSpf(domain),
    checkDkim(domain, selector, t.dkim_public_key),
    checkDmarc(domain),
  ]);

  const allOk = mx.ok && spf.ok && dkim.ok && dmarc.ok;

  // Persist results
  await db.query(
    `UPDATE tenants
     SET dns_checked_at = NOW(),
         dns_mx_ok      = $1,
         dns_spf_ok     = $2,
         dns_dkim_ok    = $3,
         dns_dmarc_ok   = $4
     WHERE id = $5`,
    [mx.ok, spf.ok, dkim.ok, dmarc.ok, params.id]
  );

  return json({
    ok:         true,
    mail_domain: domain,
    all_ok:     allOk,
    checked_at: new Date().toISOString(),
    checks: { mx, spf, dkim, dmarc },
  });
};
