import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// In-memory cache: hostname → { embeddable, ts }
const cache = new Map<string, { embeddable: boolean; reason: string; ts: number }>();
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

export const GET: RequestHandler = async ({ url }) => {
  const target = url.searchParams.get('url');
  if (!target) return json({ embeddable: false, reason: 'no_url' });

  let hostname = '';
  try { hostname = new URL(target).hostname; }
  catch { return json({ embeddable: false, reason: 'invalid_url' }); }

  // Check cache
  const cached = cache.get(hostname);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return json({ embeddable: cached.embeddable, reason: cached.reason });
  }

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

    // X-Frame-Options: DENY or SAMEORIGIN = blocked
    const xfoBlocked = xfo === 'DENY' || xfo === 'SAMEORIGIN';

    // CSP frame-ancestors without '*' or the portal domain = blocked
    let cspBlocked = false;
    if (csp.includes('frame-ancestors')) {
      const fa = csp.split(';').find(d => d.trim().startsWith('frame-ancestors'));
      if (fa && !fa.includes('*') && !fa.includes('opsid.web.id')) {
        cspBlocked = true;
      }
    }

    const blocked = xfoBlocked || cspBlocked;
    const reason = blocked
      ? (xfoBlocked ? `X-Frame-Options: ${xfo}` : 'CSP frame-ancestors')
      : 'ok';

    cache.set(hostname, { embeddable: !blocked, reason, ts: Date.now() });
    return json({ embeddable: !blocked, reason });

  } catch (err: any) {
    clearTimeout(tid);
    const reason = err?.name === 'AbortError' ? 'timeout' : 'fetch_failed';
    // On error, assume not embeddable to be safe
    cache.set(hostname, { embeddable: false, reason, ts: Date.now() });
    return json({ embeddable: false, reason });
  }
};
