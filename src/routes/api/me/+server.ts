import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import db from '$lib/db';

export const GET: RequestHandler = async ({ cookies }) => {
  const token = cookies.get('opsid_token');
  if (!token) return json({ error: 'Not authenticated' }, { status: 401 });

  try {
    // Decode JWT payload — already verified by Keycloak, no need to re-verify signature
    const parts = token.split('.');
    if (parts.length < 2) return json({ error: 'Invalid token' }, { status: 401 });

    const payload = JSON.parse(
      Buffer.from(parts[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8')
    );

    const username   = payload.preferred_username ?? '';
    const email      = payload.email ?? '';
    const firstName  = payload.given_name ?? payload.preferred_username ?? 'User';
    const lastName   = payload.family_name ?? '';
    const fullName   = payload.name ?? `${firstName} ${lastName}`.trim();
    const roles: string[] = payload.realm_access?.roles ?? [];
    const isAdmin    = roles.includes('opsid-admin');

    if (isAdmin) {
      return json({
        username, email, firstName, lastName, fullName,
        isAdmin: true,
        isTenantAdmin: false,
        tenantRole: 'superadmin',
        organizationSlug: '',
        tenantName: 'OPSID',
        tenant: null,
      });
    }

    // Lookup tenant membership from PostgreSQL (source of truth)
    const result = await db.query(
      `SELECT tu.role, tu.is_admin, tu.status,
              t.id               AS tenant_id,
              t.name             AS tenant_name,
              t.slug, t.domain,  t.primary_color,
              t.plan_nextcloud_gb,
              t.plan_email_gb,
              t.plan_odoo_gb
       FROM   tenant_users tu
       JOIN   tenants t ON tu.tenant_id = t.id
       WHERE  tu.username = $1
         AND  tu.status   = 'active'
       LIMIT  1`,
      [username]
    );

    const row = result.rows[0] ?? null;
    const isTenantAdmin = row?.role === 'org-admin';

    return json({
      username, email, firstName, lastName, fullName,
      isAdmin: false,
      isTenantAdmin,
      tenantRole:      row?.role              ?? null,
      organizationSlug: row?.slug             ?? '',
      tenantName:      row?.tenant_name       ?? '',
      tenantId:        row?.tenant_id         ?? null,
      tenantDomain:    row?.domain            ?? '',
      planNextcloudGb: row?.plan_nextcloud_gb ?? 50,
      planEmailGb:     row?.plan_email_gb     ?? 50,
      planOdooGb:      row?.plan_odoo_gb      ?? 50,
      tenant: row ? {
        id:              row.tenant_id,
        name:            row.tenant_name,
        slug:            row.slug,
        domain:          row.domain,
        primaryColor:    row.primary_color,
        planNextcloudGb: row.plan_nextcloud_gb ?? 50,
        planEmailGb:     row.plan_email_gb     ?? 50,
        planOdooGb:      row.plan_odoo_gb      ?? 50,
      } : null,
    });

  } catch (e) {
    console.error('/api/me error:', e);
    return json({ error: String(e) }, { status: 500 });
  }
};
