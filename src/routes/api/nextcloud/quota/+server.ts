import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import db from '$lib/db';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const NC_BASE  = 'http://files.opsid.web.id:8080';
const NC_ADMIN = 'admin';
const NC_PASS  = 'VqscHz0m1mrJWvjWofR81Dupuft3VLrrPRPzdkDC6Os9fDYEWIpLA5lbOcNv5p753jRJEnDN';
const NC_AUTH  = 'Basic ' + Buffer.from(`${NC_ADMIN}:${NC_PASS}`).toString('base64');
const NC_HEADS = { 'Authorization': NC_AUTH, 'OCS-APIRequest': 'true' };
const SKIP = ['admin','admin.opsid','admin_6219','dcops.idch','svc-keycloak','svc-nextcloud','svc-radius','svc-sogo'];

function decodeToken(token: string): any {
  try {
    const b64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(Buffer.from(b64, 'base64').toString('utf8'));
  } catch { return null; }
}

export const GET: RequestHandler = async ({ cookies }) => {
  // Get the current user's KC token to determine their tenant quota
  const token    = cookies.get('opsid_token');
  const payload  = token ? decodeToken(token) : null;
  const username = payload?.preferred_username ?? '';

  try {
    // ── Fetch tenant quota for this user from DB ──────────────
    let tenantQuotaGb = 0; // 0 = no tenant plan found
    if (username) {
      try {
        const r = await db.query(
          `SELECT t.plan_nextcloud_gb FROM tenant_users tu
           JOIN tenants t ON tu.tenant_id = t.id
           WHERE tu.username = $1 LIMIT 1`,
          [username]
        );
        if (r.rows.length > 0 && r.rows[0].plan_nextcloud_gb) {
          tenantQuotaGb = Number(r.rows[0].plan_nextcloud_gb);
        }
      } catch { /* tenant lookup is best-effort */ }
    }

    // ── Fetch NC users list (admin credentials) ───────────────
    const res     = await fetch(`${NC_BASE}/ocs/v1.php/cloud/users?format=json`, { headers: NC_HEADS });
    const data    = await res.json();
    const userIds: string[] = data?.ocs?.data?.users || [];
    const realUsers = userIds.filter(u => !SKIP.includes(u));

    const results = await Promise.all(
      realUsers.map(async (uid) => {
        const r = await fetch(`${NC_BASE}/ocs/v1.php/cloud/users/${uid}?format=json`, { headers: NC_HEADS });
        const d = await r.json();
        const quotaDef   = d?.ocs?.data?.quota;
        const usedBytes  = quotaDef?.used  || 0;
        // NC quota -3 = no limit (shows physical disk); use NC's own quota if set, else tenant plan
        const ncQuotaBytes = (quotaDef?.quota > 0) ? quotaDef.quota : 0;
        const usedGb  = parseFloat((usedBytes / 1024 / 1024 / 1024).toFixed(2));

        // Effective quota: prefer NC per-user quota, then tenant plan, then 50 GB default
        let effectiveQuotaGb = 50;
        if (ncQuotaBytes > 0) {
          effectiveQuotaGb = parseFloat((ncQuotaBytes / 1024 / 1024 / 1024).toFixed(0));
        } else if (uid === username && tenantQuotaGb > 0) {
          effectiveQuotaGb = tenantQuotaGb;
        } else if (tenantQuotaGb > 0) {
          effectiveQuotaGb = tenantQuotaGb;
        }

        return {
          name:    uid,
          display: d?.ocs?.data?.displayname || uid,
          used:    usedGb,
          quota:   effectiveQuotaGb,
          loading: false,
        };
      })
    );
    return json(results);
  } catch (e) {
    return json([], { status: 500 });
  }
};
