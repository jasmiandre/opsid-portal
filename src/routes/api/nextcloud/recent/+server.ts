import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { execSync } from 'child_process';
import db from '$lib/db';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const NC_BASE   = 'http://files.opsid.web.id:8080';
const NC_PUBLIC = 'https://files.opsid.web.id';

// ── helpers ──────────────────────────────────────────────────

function decodeToken(token: string): any {
  try {
    const b64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(Buffer.from(b64, 'base64').toString('utf8'));
  } catch { return null; }
}

function fileType(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  if (['docx', 'doc'].includes(ext))          return 'docx';
  if (['xlsx', 'xls', 'csv'].includes(ext))   return 'xlsx';
  if (['pdf'].includes(ext))                   return 'pdf';
  if (['pptx', 'ppt'].includes(ext))           return 'pptx';
  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return 'image';
  if (['mp4', 'mov', 'avi', 'webm'].includes(ext)) return 'video';
  if (['md', 'txt'].includes(ext))             return 'text';
  if (['odp', 'odg', 'odt', 'ods'].includes(ext)) return 'document';
  return 'file';
}

function relativeTime(iso: string): string {
  if (!iso) return '';
  try {
    const diff = (Date.now() - new Date(iso).getTime()) / 1000;
    if (diff < 60)     return 'Baru saja';
    if (diff < 3600)   return Math.round(diff / 60)   + ' mnt lalu';
    if (diff < 86400)  return Math.round(diff / 3600)  + ' jam lalu';
    if (diff < 172800) return 'Kemarin';
    return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
  } catch { return ''; }
}

// ── app password management ───────────────────────────────────

async function getAppPassword(username: string): Promise<string | null> {
  // 1. Check portal DB cache (generated previously)
  try {
    const row = await db.query(
      'SELECT nc_app_password FROM user_tokens WHERE username = $1',
      [username]
    );
    if (row.rows[0]?.nc_app_password) return row.rows[0].nc_app_password;
  } catch (e) {
    console.error('[NC] DB lookup error:', String(e).slice(0, 120));
    return null;
  }

  // 2. Generate once via official Nextcloud occ CLI (SSH to collab-01)
  console.log(`[NC] Generating app password for user: ${username}`);
  try {
    const safeUser = username.replace(/[^a-zA-Z0-9._-]/g, '');
    if (!safeUser) return null;

    const cmd = [
      'ssh', '-o', 'BatchMode=yes', '-o', 'ConnectTimeout=10',
      '-o', 'StrictHostKeyChecking=no',
      'collab-01',
      `docker exec -u 33 nextcloud php /var/www/html/occ user:add-app-password '${safeUser}' --no-interaction 2>&1`,
    ].join(' ');

    const output = execSync(cmd, { timeout: 20000 }).toString();

    // Parse line after "app password:"
    const lines  = output.split('\n').map(l => l.trim());
    const idx    = lines.findIndex(l => l === 'app password:');
    const passwd = idx !== -1 ? lines[idx + 1] : '';
    if (!passwd) {
      console.error('[NC] occ produced no password for', username);
      return null;
    }

    // 3. Persist in portal DB — never written to logs
    await db.query(
      `INSERT INTO user_tokens (username, nc_app_password, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (username) DO UPDATE
         SET nc_app_password = EXCLUDED.nc_app_password, updated_at = NOW()`,
      [username, passwd]
    );
    console.log(`[NC] App password stored for: ${username}`);
    return passwd;
  } catch (e: any) {
    console.error('[NC] occ generation failed:', String(e?.message ?? e).slice(0, 200));
    return null;
  }
}

// ── request handler ───────────────────────────────────────────

export const GET: RequestHandler = async ({ cookies }) => {
  const token = cookies.get('opsid_token');
  if (!token) return json({ ok: false, files: [], error: 'no_session' });

  const payload  = decodeToken(token);
  const username = payload?.preferred_username ?? '';
  if (!username) return json({ ok: false, files: [], error: 'no_username' });

  const appPassword = await getAppPassword(username);
  if (!appPassword) {
    return json({ ok: false, files: [], error: 'nextcloud_unavailable' });
  }

  // Basic auth header — never logged
  const auth = 'Basic ' + Buffer.from(`${username}:${appPassword}`).toString('base64');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);

  try {
    const res = await fetch(
      `${NC_BASE}/ocs/v2.php/apps/activity/api/v2/activity` +
      `?object_type=files&sort=desc&limit=30&format=json`,
      {
        headers: { 'Authorization': auth, 'OCS-APIREQUEST': 'true' },
        signal: controller.signal,
      }
    );
    clearTimeout(timer);

    // 401 means app password was revoked in Nextcloud — purge cache
    if (res.status === 401) {
      await db.query('DELETE FROM user_tokens WHERE username = $1', [username]).catch(() => {});
      return json({ ok: false, files: [], error: 'session_expired' });
    }

    if (!res.ok) {
      return json({ ok: false, files: [], error: `nc_${res.status}` });
    }

    const data: any      = await res.json();
    const activities: any[] = data?.ocs?.data ?? [];

    // Deduplicate by file ID, skip deleted, take 6 most recent
    const seen = new Map<number, object>();
    for (const a of activities) {
      if (a.object_type !== 'files' || a.type === 'file_deleted') continue;
      const fid: number = a.object_id;
      if (!fid || seen.has(fid)) continue;

      const rich  = Array.isArray(a.subject_rich) ? a.subject_rich : [];
      const finfo = (rich.length > 1 && rich[1]?.file) ? rich[1].file : {};

      const name = finfo.name
        ?? (a.object_name ?? '').replace(/^\//, '').split('/').pop()
        ?? '';
      if (!name) continue;

      // Wrap through user_oidc OIDC endpoint (provider 1 = Keycloak OPSID).
      // Same mechanism as DriveSection: browser hits /apps/user_oidc/login/1,
      // KC sees existing session → issues token → Nextcloud creates session → redirects to file.
      // Direct /f/{id} links skip OIDC flow and land on Nextcloud's own login page.
      const fileUrl = `/f/${fid}`;
      const href = `${NC_PUBLIC}/apps/user_oidc/login/1?redirect_url=${encodeURIComponent(fileUrl)}`;

      seen.set(fid, {
        name,
        href,
        type:     fileType(name),
        time:     relativeTime(a.datetime ?? ''),
        modified: a.datetime ?? '',
      });
    }

    const files = [...seen.values()].slice(0, 6);
    console.log(`[NC] Recent files (${username}): ${files.length} items`);
    return json({ ok: true, files });

  } catch (e: any) {
    clearTimeout(timer);
    if (e?.name === 'AbortError') {
      return json({ ok: false, files: [], error: 'timeout' });
    }
    console.error('[NC] Fetch error:', e?.message ?? String(e));
    return json({ ok: false, files: [], error: 'fetch_error' });
  }
};
