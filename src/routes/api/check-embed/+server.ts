import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// Hardcoded whitelist — all *.opsid.web.id subdomains are OPSID-owned services.
// We do NOT make a network request to check headers because the portal server (app-01)
// cannot reach public *.opsid.web.id URLs due to hairpin NAT (130s timeout).
// The administrator is responsible for ensuring these services are safe to embed.
const OPSID_HOSTS = new Set([
  'mail.opsid.web.id',
  'files.opsid.web.id',
  'erp.opsid.web.id',
  'auth.opsid.web.id',
  'ipa.opsid.web.id',
]);

export const GET: RequestHandler = async ({ url }) => {
  const target = url.searchParams.get('url');
  if (!target) return json({ embeddable: false, reason: 'no_url' });

  let hostname = '';
  try { hostname = new URL(target).hostname; }
  catch { return json({ embeddable: false, reason: 'invalid_url' }); }

  // All OPSID-internal subdomains are treated as embeddable.
  // SOGo has no X-Frame-Options; Odoo is accessed via KC auth URL (not /web/login).
  // Nextcloud has SAMEORIGIN but is used via WebDAV file browser, not iframe.
  if (OPSID_HOSTS.has(hostname) || hostname.endsWith('.opsid.web.id')) {
    return json({ embeddable: true, reason: 'opsid_internal' });
  }

  // For unknown external hosts: try a quick HEAD request with a 4s timeout.
  // Fall back to embeddable: false on timeout/error.
  const controller = new AbortController();
  const tid = setTimeout(() => controller.abort(), 4000);
  try {
    const res = await fetch(target, {
      method: 'HEAD',
      signal: controller.signal,
      redirect: 'follow',
      headers: { 'User-Agent': 'OPSID-Portal/1.0 (embed-check)' },
    });
    clearTimeout(tid);

    const xfo = (res.headers.get('x-frame-options') ?? '').toUpperCase();
    const csp = res.headers.get('content-security-policy') ?? '';
    const xfoBlocked = xfo === 'DENY' || xfo === 'SAMEORIGIN';
    let cspBlocked = false;
    if (csp.includes('frame-ancestors')) {
      const fa = csp.split(';').find(d => d.trim().startsWith('frame-ancestors'));
      if (fa && !fa.includes('*') && !fa.includes('opsid.web.id')) cspBlocked = true;
    }
    const blocked = xfoBlocked || cspBlocked;
    return json({
      embeddable: !blocked,
      reason: blocked ? (xfoBlocked ? `X-Frame-Options: ${xfo}` : 'CSP frame-ancestors') : 'ok',
    });
  } catch (err: any) {
    clearTimeout(tid);
    return json({ embeddable: false, reason: err?.name === 'AbortError' ? 'timeout' : 'fetch_failed' });
  }
};
