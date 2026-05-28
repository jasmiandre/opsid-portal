import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import db from '$lib/db';

const NGINX_API  = 'http://10.34.1.1:8080';
const KC_BASE    = 'https://auth.opsid.web.id';
const IPA_BASE   = 'https://ipa.opsid.web.id/ipa/session/json';

async function getKcToken(): Promise<string> {
  const res = await fetch(`${KC_BASE}/realms/master/protocol/openid-connect/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'client_id=admin-cli&grant_type=password&username=opsid-admin&password=sandiaman2026',
  });
  const d = await res.json();
  return d.access_token;
}

export const GET: RequestHandler = async ({ params }) => {
  try {
    const result = await db.query(
      `SELECT t.*, COUNT(tu.id) as user_count
       FROM tenants t
       LEFT JOIN tenant_users tu ON t.id = tu.tenant_id
       WHERE t.id = $1
       GROUP BY t.id`,
      [params.id]
    );
    if (!result.rows.length) return json({ error: 'Tenant tidak ditemukan' }, { status: 404 });
    return json({ ok: true, tenant: result.rows[0] });
  } catch (e) {
    return json({ error: String(e) }, { status: 500 });
  }
};

export const PUT: RequestHandler = async ({ params, request, cookies }) => {
  try {
    // Validate requester — must be superadmin or tenant admin for this exact tenant
    const token = cookies.get('opsid_token');
    let username = '';
    if (token) {
      try {
        const b64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
        const t = JSON.parse(Buffer.from(b64, 'base64').toString('utf8'));
        username = t.preferred_username ?? '';
        const roles: string[] = t.realm_access?.roles ?? [];
        const isAdmin = roles.includes('opsid-admin');

        if (!isAdmin) {
          // Verify tenant admin owns this tenant
          const ownership = await db.query(
            `SELECT 1 FROM tenant_users WHERE username = $1 AND tenant_id = $2 AND role = 'org-admin' AND status = 'active'`,
            [username, params.id]
          );
          if (!ownership.rows.length) {
            return json({ ok: false, error: 'Forbidden' }, { status: 403 });
          }
        }
      } catch {
        return json({ ok: false, error: 'Invalid token' }, { status: 401 });
      }
    } else {
      return json({ ok: false, error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const {
      primaryColor, logoUrl,
      planNextcloudGb, planEmailGb, planOdooGb,
      status,
    } = body;

    const updates: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (primaryColor     !== undefined) { updates.push(`primary_color = $${idx++}`);       values.push(primaryColor); }
    if (logoUrl          !== undefined) { updates.push(`logo_url = $${idx++}`);             values.push(logoUrl); }
    if (planNextcloudGb  !== undefined) { updates.push(`plan_nextcloud_gb = $${idx++}`);    values.push(Number(planNextcloudGb)); }
    if (planEmailGb      !== undefined) { updates.push(`plan_email_gb = $${idx++}`);        values.push(Number(planEmailGb)); }
    if (planOdooGb       !== undefined) { updates.push(`plan_odoo_gb = $${idx++}`);         values.push(Number(planOdooGb)); }
    if (status           !== undefined) {
      updates.push(`status = $${idx++}`);
      values.push(status);
      if (status === 'suspended') {
        updates.push(`suspended_at = NOW()`);
      } else {
        updates.push(`suspended_at = NULL`);
      }
    }

    if (!updates.length) return json({ ok: false, error: 'Tidak ada field yang diubah' }, { status: 400 });

    values.push(params.id);
    try {
      await db.query(
        `UPDATE tenants SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${idx}`,
        values
      );
    } catch (sqlErr: any) {
      // Gracefully handle missing columns (suspended_at may not exist yet)
      if (String(sqlErr).includes('suspended_at')) {
        const updatesNoSuspend = updates.filter(u => !u.includes('suspended_at'));
        if (updatesNoSuspend.length > 0) {
          await db.query(
            `UPDATE tenants SET ${updatesNoSuspend.join(', ')}, updated_at = NOW() WHERE id = $${idx}`,
            values
          );
        }
      } else {
        throw sqlErr;
      }
    }

    await db.query(
      `INSERT INTO audit_logs (actor, action, target, metadata) VALUES ($1, $2, $3, $4)`,
      [username || 'system', 'UPDATE_TENANT', String(params.id),
       JSON.stringify({ primaryColor, logoUrl, planNextcloudGb, planEmailGb, planOdooGb, status })]
    ).catch(() => null);

    return json({ ok: true });
  } catch (e) {
    return json({ ok: false, error: String(e) }, { status: 500 });
  }
};

export const DELETE: RequestHandler = async ({ params }) => {
  try {
    const result = await db.query(`SELECT * FROM tenants WHERE id = $1`, [params.id]);
    if (!result.rows.length) return json({ error: 'Tenant tidak ditemukan' }, { status: 404 });

    const tenant = result.rows[0];

    // 1. Hapus dari Nginx
    await fetch(`${NGINX_API}/site/${encodeURIComponent(tenant.domain)}`, {
      method: 'DELETE',
    }).catch(() => null);

    // 2. Hapus Keycloak Organization
    try {
      const token = await getKcToken();
      const orgsRes = await fetch(
        `${KC_BASE}/admin/realms/opsid-internal/organizations?search=${encodeURIComponent(tenant.slug)}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      const orgs = await orgsRes.json();
      if (Array.isArray(orgs) && orgs.length > 0) {
        await fetch(
          `${KC_BASE}/admin/realms/opsid-internal/organizations/${orgs[0].id}`,
          { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } }
        );
      }
    } catch { /* lanjut walau gagal */ }

    // 3. Hapus FreeIPA group
    await fetch(IPA_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Referer': 'https://ipa.opsid.web.id/ipa' },
      body: JSON.stringify({ method: 'group_del', params: [[`${tenant.slug}-users`], {}] }),
    }).catch(() => null);

    // 4. Hapus dari PostgreSQL
    await db.query(`DELETE FROM tenant_users WHERE tenant_id = $1`, [params.id]);
    await db.query(`DELETE FROM tenants WHERE id = $1`, [params.id]);

    // 5. Audit log
    await db.query(
      `INSERT INTO audit_logs (actor, action, target, metadata) VALUES ($1, $2, $3, $4)`,
      ['system', 'DELETE_TENANT', tenant.domain, JSON.stringify({ name: tenant.name, slug: tenant.slug })]
    );

    return json({ ok: true });
  } catch (e) {
    return json({ error: String(e) }, { status: 500 });
  }
};
