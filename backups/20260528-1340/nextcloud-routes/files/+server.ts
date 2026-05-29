import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// Internal IP: bypasses hairpin NAT (https://files.opsid.web.id timed out at 129s)
const NC_INTERNAL = 'http://10.34.1.7:8080';
const NC_PUBLIC   = 'https://files.opsid.web.id'; // for user-facing links
const NC_ADMIN    = 'admin';
const NC_PASS     = 'VqscHz0m1mrJWvjWofR81Dupuft3VLrrPRPzdkDC6Os9fDYEWIpLA5lbOcNv5p753jRJEnDN';
const NC_AUTH     = 'Basic ' + Buffer.from(`${NC_ADMIN}:${NC_PASS}`).toString('base64');

function decodeToken(token: string): any {
  try {
    const b64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(Buffer.from(b64, 'base64').toString('utf8'));
  } catch { return null; }
}

function parsePropfind(xml: string): any[] {
  const files: any[] = [];
  const responses = xml.split('<d:response>').slice(1);
  for (const r of responses) {
    const href        = r.match(/<d:href>(.*?)<\/d:href>/)?.[1]                    ?? '';
    const displayname = r.match(/<d:displayname>(.*?)<\/d:displayname>/)?.[1]      ?? '';
    const contenttype = r.match(/<d:getcontenttype>(.*?)<\/d:getcontenttype>/)?.[1] ?? '';
    const size        = r.match(/<d:getcontentlength>(.*?)<\/d:getcontentlength>/)?.[1] ?? '0';
    const modified    = r.match(/<d:getlastmodified>(.*?)<\/d:getlastmodified>/)?.[1]   ?? '';
    const isDir       = r.includes('<d:collection/>') || r.includes('<d:collection />');
    const name        = displayname || decodeURIComponent(href.split('/').filter(Boolean).pop() ?? '');
    if (name && name !== '.') {
      files.push({
        name,
        href:     NC_PUBLIC + href, // public URL — user's browser can reach this
        type:     isDir ? 'folder' : (contenttype || 'file'),
        size:     parseInt(size, 10) || 0,
        modified,
        isDir,
      });
    }
  }
  return files;
}

export const GET: RequestHandler = async ({ cookies, url }) => {
  const token    = cookies.get('opsid_token');
  const payload  = token ? decodeToken(token) : null;
  const username = payload?.preferred_username ?? '';

  if (!username) return json({ ok: false, error: 'Not authenticated — login ulang', items: [] }, { status: 401 });

  const path    = url.searchParams.get('path') ?? '/';
  const davPath = `/remote.php/dav/files/${encodeURIComponent(username)}${path === '/' ? '/' : path}`;

  try {
    const res = await fetch(`${NC_INTERNAL}${davPath}`, {
      method:  'PROPFIND',
      headers: {
        'Authorization': NC_AUTH,
        'Depth':         '1',
        'Content-Type':  'application/xml',
      },
      body: `<?xml version="1.0" encoding="UTF-8"?>
<d:propfind xmlns:d="DAV:" xmlns:oc="http://owncloud.org/ns" xmlns:nc="http://nextcloud.org/ns">
  <d:prop>
    <d:displayname/>
    <d:getcontenttype/>
    <d:getcontentlength/>
    <d:getlastmodified/>
    <d:resourcetype/>
  </d:prop>
</d:propfind>`,
    });

    if (res.status === 401 || res.status === 403)
      return json({ ok: false, error: 'Akses ditolak oleh Nextcloud', items: [] }, { status: 401 });
    if (res.status === 404)
      return json({ ok: true, path, items: [] });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      return json({ ok: false, error: `Nextcloud ${res.status}: ${body.slice(0, 200)}`, items: [] }, { status: res.status });
    }

    const xml   = await res.text();
    const items = parsePropfind(xml).slice(1); // skip root entry
    return json({ ok: true, path, items });

  } catch (e) {
    return json({ ok: false, error: 'Koneksi Nextcloud gagal: ' + String(e), items: [] }, { status: 500 });
  }
};
