import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const NC_BASE = 'https://files.opsid.web.id';

function decodeToken(token: string): any {
  try {
    const b64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(Buffer.from(b64, 'base64').toString('utf8'));
  } catch { return null; }
}

/** Parse WebDAV PROPFIND response (minimal) */
function parsePropfind(xml: string): any[] {
  const files: any[] = [];
  const responses = xml.split('<d:response>').slice(1);
  for (const r of responses) {
    const href = r.match(/<d:href>(.*?)<\/d:href>/)?.[1] ?? '';
    const displayname = r.match(/<d:displayname>(.*?)<\/d:displayname>/)?.[1] ?? '';
    const contenttype = r.match(/<d:getcontenttype>(.*?)<\/d:getcontenttype>/)?.[1] ?? '';
    const size = r.match(/<d:getcontentlength>(.*?)<\/d:getcontentlength>/)?.[1] ?? '0';
    const modified = r.match(/<d:getlastmodified>(.*?)<\/d:getlastmodified>/)?.[1] ?? '';
    const isDir = r.includes('<d:collection/>') || r.includes('<d:collection />');
    const name = displayname || decodeURIComponent(href.split('/').filter(Boolean).pop() ?? '');
    if (name && name !== '.') {
      files.push({
        name,
        href: NC_BASE + href,
        type: isDir ? 'folder' : (contenttype || 'file'),
        size: parseInt(size, 10),
        modified,
        isDir,
      });
    }
  }
  return files;
}

export const GET: RequestHandler = async ({ cookies, url }) => {
  const token = cookies.get('opsid_token');
  if (!token) return json({ ok: false, error: 'Not authenticated' }, { status: 401 });

  const payload = decodeToken(token);
  const username = payload?.preferred_username ?? '';
  if (!username) return json({ ok: false, error: 'Username not found' }, { status: 401 });

  const path = url.searchParams.get('path') ?? '/';
  const davPath = `/remote.php/dav/files/${encodeURIComponent(username)}${path === '/' ? '/' : path}`;

  try {
    const res = await fetch(`${NC_BASE}${davPath}`, {
      method: 'PROPFIND',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Depth': '1',
        'Content-Type': 'application/xml',
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
      return json({ ok: false, error: 'Unauthorized — cek token Nextcloud', items: [] }, { status: 401 });
    }
    if (!res.ok) {
      return json({ ok: false, error: `Nextcloud error: ${res.status}`, items: [] }, { status: res.status });
    }

    const xml = await res.text();
    const items = parsePropfind(xml).slice(1); // skip root entry

    return json({ ok: true, path, items });
  } catch (e) {
    return json({ ok: false, error: String(e), items: [] }, { status: 500 });
  }
};
