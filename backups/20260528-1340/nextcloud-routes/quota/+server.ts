import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// Use hostname on internal port — /etc/hosts maps files.opsid.web.id → 10.34.1.7
// This avoids hairpin NAT timeout (public IP unreachable from VM network) while
// keeping the correct Host header for Nextcloud's OCS API validation.
const NC_URL  = 'http://files.opsid.web.id:8080';
const NC_USER = 'admin';
const NC_PASS = 'VqscHz0m1mrJWvjWofR81Dupuft3VLrrPRPzdkDC6Os9fDYEWIpLA5lbOcNv5p753jRJEnDN';
const NC_AUTH = 'Basic ' + Buffer.from(`${NC_USER}:${NC_PASS}`).toString('base64');
const NC_HEADS = {
  'Authorization':  NC_AUTH,
  'OCS-APIRequest': 'true',
};
const SKIP = ['admin','admin.opsid','admin_6219','dcops.idch','svc-keycloak','svc-nextcloud','svc-radius','svc-sogo'];

export const GET: RequestHandler = async () => {
  try {
    const res  = await fetch(`${NC_URL}/ocs/v1.php/cloud/users?format=json`, { headers: NC_HEADS });
    const data = await res.json();
    const userIds: string[] = data?.ocs?.data?.users || [];
    const realUsers = userIds.filter(u => !SKIP.includes(u));

    const results = await Promise.all(
      realUsers.map(async (uid) => {
        const r = await fetch(`${NC_URL}/ocs/v1.php/cloud/users/${uid}?format=json`, { headers: NC_HEADS });
        const d = await r.json();
        const quotaDef   = d?.ocs?.data?.quota;
        const usedBytes  = quotaDef?.used  || 0;
        const quotaBytes = quotaDef?.total > 0 ? quotaDef.total : 50 * 1024 * 1024 * 1024;
        return {
          name:    uid,
          display: d?.ocs?.data?.displayname || uid,
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
