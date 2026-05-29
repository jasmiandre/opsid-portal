import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const NC_BASE  = 'https://files.opsid.web.id';
// Admin credentials for server-side proxy access
const NC_ADMIN = 'admin';
const NC_PASS  = 'VqscHz0m1mrJWvjWofR81Dupuft3VLrrPRPzdkDC6Os9fDYEWIpLA5lbOcNv5p753jRJEnDN';
const NC_AUTH  = 'Basic ' + Buffer.from(`${NC_ADMIN}:${NC_PASS}`).toString('base64');

function decodeToken(token: string): any {
  try {
    const b64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(Buffer.from(b64, 'base64').toString('utf8'));
  } catch { return null; }
}

function parsePropfind(xml: string, baseUrl: string): any[] {
  const files: any[] = [];
  const responses = xml.split('<d:response>').slice(1);
  for (const r of responses) {
    const href        = r.match(/<d:href>(.*?)<\/d:href>/)?.[1]                 ?? '';
    const displayname = r.match(/<d:displayname>(.*?)<\/d:displayname>/)?.[1]   ?? '';
    const contenttype = r.match(/<d:getcontenttype>(.*?)<\/d:getcontenttype>/)?.[1] ?? '';
    const size        = r.match(/<d:getcontentlength>(.*?)<\/d:getcontentlength>/)?.[1] ?? '0';
    const modified    = r.match(/<d:getlastmodified>(.*?)<\/d:getlastmodified>/)?.[1]  ?? '';
    const isDir       = r.includes('<d:collection/>') || r.includes('<d:collection />');
    const name        = displayname || decodeURIComponent(href.split('/').filter(Boolean).pop() ?? '');
    if (name && name !== '.') {
      files.push({
        name,
        href:     NC_BASE + href,
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
  // Access the user's directory via admin credentials (server-side proxy pattern)
  const davPath = `/remote.php/dav/files/${encodeURIComponent(username)}${path === '/' ? '/' : path}`;

  try {
    const res = await fetch(`${NC_BASE}${davPath}`, {
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

    if (res.status === 401 || res.status === 403) {
      return json({ ok: false, error: 'Akses ditolak oleh Nextcloud', items: [] }, { status: 401 });
    }
    if (res.status === 404) {
      // User's home directory may not exist yet — return empty
      return json({ ok: true, path, items: [] });
    }
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      return json({ ok: false, error: `Nextcloud error ${res.status}: ${body.slice(0, 200)}`, items: [] }, { status: res.status });
    }

    const xml   = await res.text();
    const items = parsePropfind(xml, NC_BASE).slice(1); // skip root entry

    return json({ ok: true, path, items });
  } catch (e) {
    return json({ ok: false, error: 'Koneksi ke Nextcloud gagal: ' + String(e), items: [] }, { status: 500 });
  }
};
