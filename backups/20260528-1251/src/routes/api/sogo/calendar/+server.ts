import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const SOGO_BASE = 'https://mail.opsid.web.id/SOGo';

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
    const kcToken = cookies.get('opsid_token');
    const res = await fetch(calDavUrl, {
      method: 'REPORT',
      headers: {
        'Content-Type': 'application/xml',
        'Depth': '1',
        ...(kcToken ? { 'Authorization': `Bearer ${kcToken}` } : {}),
      },
      body,
      signal: AbortSignal.timeout(6000),
    });

if (!res.ok) {
  const errorText = await res.text().catch(() => '');
  console.error('SOGo CalDAV error:', res.status, errorText.slice(0, 300));
  return json({
    events: [],
    error: 'SOGo CalDAV failed',
    status: res.status,
    detail: errorText.slice(0, 300),
  });
}
const text = await res.text();
const events = parseIcalEvents(text);

return json({
  events,
  debug: {
    sogoStatus: res.status,
    sogoOk: res.ok,
    responseLength: text.length,
    hasCalendarData: text.includes('calendar-data'),
    preview: text.slice(0, 300),
  },
});
} catch (e) {
  console.error('SOGo Calendar fetch failed:', e);
  return json({
    events: [],
    error: 'SOGo Calendar fetch exception',
    detail: String(e),
  });
}
};
