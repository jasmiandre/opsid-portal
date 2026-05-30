import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const NC_URL  = 'https://files.opsid.web.id';
const NC_USER = 'admin';
const NC_PASS = 'VqscHz0m1mrJWvjWofR81Dupuft3VLrrPRPzdkDC6Os9fDYEWIpLA5lbOcNv5p753jRJEnDN';

function requireAdmin(cookies: { get: (k: string) => string | undefined }): boolean {
  const token = cookies.get('opsid_token');
  if (!token) return false;
  try {
    const p = JSON.parse(Buffer.from(token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/'), 'base64').toString());
    const roles: string[] = p?.realm_access?.roles ?? [];
    return roles.includes('opsid-admin') && (p.exp ?? 0) > Math.floor(Date.now() / 1000);
  } catch { return false; }
}

// SET quota untuk user ke semua service
export const POST: RequestHandler = async ({ request, cookies }) => {
  if (!requireAdmin(cookies)) return json({ error: 'Forbidden' }, { status: 403 });
  const { username, quotaGB } = await request.json();

  if (!username || !quotaGB) {
    return json({ error: 'username dan quotaGB wajib diisi' }, { status: 400 });
  }

  const results: Record<string, string> = {};

  // 1. Nextcloud quota via OCS API
  try {
    const res = await fetch(
      `${NC_URL}/ocs/v1.php/cloud/users/${username}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': 'Basic ' + Buffer.from(`${NC_USER}:${NC_PASS}`).toString('base64'),
          'OCS-APIRequest': 'true',
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `key=quota&value=${quotaGB}GB`,
      }
    );
    results.nextcloud = res.ok ? `OK ${quotaGB}GB` : `Error ${res.status}`;
  } catch (e) {
    results.nextcloud = `Error: ${e}`;
  }

  // 2. Dovecot quota via SSH ke mail-01
  try {
    const quotaBytes = quotaGB * 1024 * 1024 * 1024;
    const { stdout, stderr } = await execAsync(
      `ssh -o StrictHostKeyChecking=no root@10.34.1.6 "` +
      `grep -v 'priv/${username}/quota_bytes' /etc/dovecot/quota-users > /tmp/quota-tmp && ` +
      `echo 'priv/${username}/quota_bytes=${quotaBytes}' >> /tmp/quota-tmp && ` +
      `mv /tmp/quota-tmp /etc/dovecot/quota-users && ` +
      `chmod 644 /etc/dovecot/quota-users && chown root:vmail /etc/dovecot/quota-users` +
      `"`
    );
    results.dovecot = stderr ? `Error: ${stderr}` : `OK ${quotaGB}GB`;
  } catch (e) {
    results.dovecot = `Error: ${e}`;
  }

  // 3. Odoo — set max attachment size via ir.config_parameter
  // Odoo tidak support per-user attachment quota, catat saja
  results.odoo = `Noted: max attachment ${quotaGB}GB (global setting)`;

  return json({ username, quotaGB, results });
};

// GET quota semua user dari Nextcloud
export const GET: RequestHandler = async ({ cookies }) => {
  if (!requireAdmin(cookies)) return json({ error: 'Forbidden' }, { status: 403 });
  try {
    const res = await fetch(`${NC_URL}/ocs/v1.php/cloud/users?format=json`, {
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`${NC_USER}:${NC_PASS}`).toString('base64'),
        'OCS-APIRequest': 'true',
      }
    });

    const data = await res.json();
    const userIds: string[] = data?.ocs?.data?.users || [];
    const skip = ['admin','svc-keycloak','svc-nextcloud','svc-radius','svc-sogo','admin_6219','dcops.idch'];
    const realUsers = userIds.filter(u => !skip.some(s => u.startsWith(s)));

    const results = await Promise.all(
      realUsers.map(async (uid) => {
        const r = await fetch(`${NC_URL}/ocs/v1.php/cloud/users/${uid}?format=json`, {
          headers: {
            'Authorization': 'Basic ' + Buffer.from(`${NC_USER}:${NC_PASS}`).toString('base64'),
            'OCS-APIRequest': 'true',
          }
        });
        const d = await r.json();
        const storage = d?.ocs?.data?.quota;
        const quotaDef = d?.ocs?.data?.quota;
        const usedBytes  = quotaDef?.used  || 0;
        const quotaBytes = quotaDef?.total > 0 ? quotaDef.total : 50 * 1024 * 1024 * 1024;
        return {
          name:    uid,
          used:    parseFloat((usedBytes  / 1024 / 1024 / 1024).toFixed(2)),
          quota:   parseFloat((quotaBytes / 1024 / 1024 / 1024).toFixed(0)),
          loading: false,
        };
      })
    );

    return json(results);
  } catch (e) {
    return json([], { status: 500 });
  }
};
