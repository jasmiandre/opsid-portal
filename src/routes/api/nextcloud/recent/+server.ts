import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const NC_BASE  = 'https://files.opsid.web.id';
const NC_ADMIN = 'admin';
const NC_PASS  = 'VqscHz0m1mrJWvjWofR81Dupuft3VLrrPRPzdkDC6Os9fDYEWIpLA5lbOcNv5p753jRJEnDN';
const NC_AUTH  = 'Basic ' + Buffer.from(`${NC_ADMIN}:${NC_PASS}`).toString('base64');

function decodeToken(token: string): any {
  try {
    const b64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(Buffer.from(b64, 'base64').toString('utf8'));
  } catch { return null; }
}

function getFileType(name: string, contenttype: string): string {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  if (['docx', 'doc'].includes(ext)) return 'docx';
  if (['xlsx', 'xls', 'csv'].includes(ext)) return 'xlsx';
  if (['pdf'].includes(ext)) return 'pdf';
  if (['pptx', 'ppt'].includes(ext)) return 'pptx';
  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return 'image';
  if (contenttype.includes('folder') || ext === '') return 'folder';
  return 'file';
}

function relativeTime(modified: string): string {
  if (!modified) return '';
  try {
    const d     = new Date(modified);
    const diff  = (Date.now() - d.getTime()) / 1000;
    if (diff < 60)  return 'Baru saja';
    if (diff < 3600) return Math.round(diff / 60) + ' mnt lalu';
    if (diff < 86400) return Math.round(diff / 3600) + ' jam lalu';
    if (diff < 172800) return 'Kemarin';
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
  } catch { return ''; }
}

export const GET: RequestHandler = async ({ cookies }) => {
  const token    = cookies.get('opsid_token');
  const payload  = token ? decodeToken(token) : null;
  const username = payload?.preferred_username ?? '';

  if (!username) return json({ ok: false, files: [] });

  // Use PROPFIND to list root directory and pick recent items
  const davPath = `/remote.php/dav/files/${encodeURIComponent(username)}/`;

  try {
    const res = await fetch(`${NC_BASE}${davPath}`, {
      method:  'PROPFIND',
      headers: {
        'Authorization': NC_AUTH,
        'Depth':         '1',
        'Content-Type':  'application/xml',
      },
      body: `<?xml version="1.0" encoding="UTF-8"?>
<d:propfind xmlns:d="DAV:">
  <d:prop>
    <d:displayname/>
    <d:getcontenttype/>
    <d:getcontentlength/>
    <d:getlastmodified/>
    <d:resourcetype/>
  </d:prop>
</d:propfind>`,
    });

    if (!res.ok) {
      if (res.status === 404) return json({ ok: true, files: [] });
      return json({ ok: false, files: [], error: `Nextcloud ${res.status}` });
    }

    const xml = await res.text();
    const responses = xml.split('<d:response>').slice(1);

    const items = responses.map(r => {
      const href        = r.match(/<d:href>(.*?)<\/d:href>/)?.[1] ?? '';
      const displayname = r.match(/<d:displayname>(.*?)<\/d:displayname>/)?.[1] ?? '';
      const contenttype = r.match(/<d:getcontenttype>(.*?)<\/d:getcontenttype>/)?.[1] ?? '';
      const size        = parseInt(r.match(/<d:getcontentlength>(.*?)<\/d:getcontentlength>/)?.[1] ?? '0', 10);
      const modified    = r.match(/<d:getlastmodified>(.*?)<\/d:getlastmodified>/)?.[1] ?? '';
      const isDir       = r.includes('<d:collection/>') || r.includes('<d:collection />');
      const name        = displayname || decodeURIComponent(href.split('/').filter(Boolean).pop() ?? '');
      return { name, href: NC_BASE + href, contenttype, size, modified, isDir };
    })
    .filter(i => i.name && i.name !== '.' && !i.isDir) // files only
    .sort((a, b) => {
      // Sort by last modified descending
      return new Date(b.modified).getTime() - new Date(a.modified).getTime();
    })
    .slice(0, 6)
    .map(i => ({
      name:    i.name,
      href:    i.href,
      type:    getFileType(i.name, i.contenttype),
      size:    i.size,
      time:    relativeTime(i.modified),
      modified: i.modified,
    }));

    return json({ ok: true, files: items });
  } catch (e) {
    return json({ ok: false, files: [], error: String(e) });
  }
};
