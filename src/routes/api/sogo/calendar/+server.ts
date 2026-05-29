import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// Use internal IP directly — bypasses hairpin NAT (public URL times out from inside VM).
// SOGo at mail-01 is configured with WOTrustProxyAuthentication = YES,
// so we can set X-Webobjects-Remote-User without re-authenticating.
const SOGO_BASE = 'http://10.34.1.6:80/SOGo';

interface CalEvent {
  time: string;
  title: string;
  meta: string;
  color: string;
}

function parseIcalEvents(xmlText: string): CalEvent[] {
  const events: CalEvent[] = [];

  for (const match of xmlText.matchAll(/<.*?calendar-data[^>]*>([\s\S]*?)<\/.*?calendar-data>/g)) {
    const ical = match[1];
    const summary = ical.match(/SUMMARY:(.+)/)?.[1]?.trim();
    const dtStart = ical.match(/DTSTART(?:;[^:]*)?:(\d{8}T\d{6})/)?.[1];
    const location = ical.match(/LOCATION:(.+)/)?.[1]?.trim();

    if (summary && dtStart) {
      const hour = dtStart.slice(9, 11);
      const min  = dtStart.slice(11, 13);
      events.push({
        time:  `${hour}:${min}`,
        title: summary,
        meta:  location ?? '',
        color: 'var(--pri)',
      });
    }
  }

  return events.sort((a, b) => a.time.localeCompare(b.time));
}

export const GET: RequestHandler = async ({ url, cookies }) => {
  const user = url.searchParams.get('user');
  if (!user) return json({ events: [] });

  const today    = new Date();
  const tomorrow = new Date(today.getTime() + 86_400_000);
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, '').split('.')[0];

  const calDavUrl = `${SOGO_BASE}/dav/${encodeURIComponent(user)}/Calendar/personal/`;
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<C:calendar-query xmlns:C="urn:ietf:params:xml:ns:caldav" xmlns:D="DAV:">
  <D:prop><D:getetag/><C:calendar-data/></D:prop>
  <C:filter>
    <C:comp-filter name="VCALENDAR">
      <C:comp-filter name="VEVENT">
        <C:time-range start="${fmt(today)}Z" end="${fmt(tomorrow)}Z"/>
      </C:comp-filter>
    </C:comp-filter>
  </C:filter>
</C:calendar-query>`;

  try {
    const res = await fetch(calDavUrl, {
      method: 'REPORT',
      headers: {
        'Content-Type':             'application/xml',
        'Depth':                    '1',
        // Proxy trust header — SOGo is configured to trust this from internal callers
        'X-Webobjects-Remote-User': user,
      },
      body,
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      const errorText = await res.text().catch(() => '');
      console.error('SOGo CalDAV error:', res.status, errorText.slice(0, 200));
      return json({ events: [], error: `SOGo ${res.status}`, detail: errorText.slice(0, 200) });
    }

    const text   = await res.text();
    const events = parseIcalEvents(text);
    return json({ events });

  } catch (e) {
    console.error('SOGo Calendar fetch failed:', e);
    return json({ events: [], error: String(e) });
  }
};
