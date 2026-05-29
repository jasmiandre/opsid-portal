import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import db from '$lib/db';
import { reprovisionTenant } from '$lib/server/tenantProvisioning';

function decodeToken(token: string): any {
  try {
    const b64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(Buffer.from(b64, 'base64').toString('utf8'));
  } catch { return null; }
}

// POST /api/admin/onboarding/[id]/reprovision
// Re-runs all non-DB provisioning steps for an approved onboarding request.
// Optional body: { only: string[] } — subset of step names to retry.
export const POST: RequestHandler = async ({ params, request, cookies }) => {
  // ── Auth ──────────────────────────────────────────────────────
  const token = cookies.get('opsid_token');
  if (!token) return json({ ok: false, error: 'Unauthorized' }, { status: 401 });

  const p = decodeToken(token);
  const isAdmin = (p?.realm_access?.roles ?? []).includes('opsid-admin');
  if (!isAdmin) return json({ ok: false, error: 'Forbidden' }, { status: 403 });

  const actor = p?.preferred_username ?? 'admin';

  // ── Body ──────────────────────────────────────────────────────
  const body = await request.json().catch(() => ({}));
  const only: string[] | undefined = Array.isArray(body.only) ? body.only : undefined;

  // ── Fetch onboarding request ──────────────────────────────────
  const reqRow = await db.query(
    `SELECT * FROM onboarding_requests WHERE id = $1`,
    [params.id]
  ).then(r => r.rows[0]).catch(() => null);

  if (!reqRow) return json({ ok: false, error: 'Request tidak ditemukan' }, { status: 404 });
  if (reqRow.status !== 'approved') {
    return json({ ok: false, error: 'Hanya request yang sudah disetujui yang dapat di-reprovision' }, { status: 409 });
  }
  if (!reqRow.tenant_id) {
    return json({ ok: false, error: 'Request ini tidak memiliki tenant_id — provisioning awal gagal total' }, { status: 409 });
  }

  // ── Fetch tenant ──────────────────────────────────────────────
  const tenantRow = await db.query(
    `SELECT * FROM tenants WHERE id = $1`,
    [reqRow.tenant_id]
  ).then(r => r.rows[0]).catch(() => null);

  if (!tenantRow) return json({ ok: false, error: 'Tenant terkait tidak ditemukan di DB' }, { status: 404 });

  const domainType = (reqRow.domain_type === 'custom_domain' ? 'custom_domain' : 'subdomain') as 'subdomain' | 'custom_domain';

  // ── Run reprovision ───────────────────────────────────────────
  const result = await reprovisionTenant({
    tenantId:    tenantRow.id,
    slug:        tenantRow.slug,
    domain:      tenantRow.domain,
    domain_type: domainType,
    name:        tenantRow.name,
    adminName:   reqRow.pic_name,
    planEmailGb: tenantRow.plan_email_gb    ?? 50,
    planNcGb:    tenantRow.plan_nextcloud_gb ?? 50,
    actor,
    only,
  });

  // ── Merge with existing log, persist ─────────────────────────
  let mergedLog: any[] = [];
  try {
    const existingLog: any[] = Array.isArray(reqRow.provisioning_log)
      ? reqRow.provisioning_log
      : (reqRow.provisioning_log ? JSON.parse(reqRow.provisioning_log) : []);

    // Keep steps from existing log that were not re-run; override with new results.
    const retriedSteps = new Set(result.steps.map(s => s.step));
    mergedLog = [
      ...existingLog.filter(s => !retriedSteps.has(s.step)),
      ...result.steps,
    ];
    // Sort by canonical order
    const ORDER = ['db_tenant','nginx','ssl_certbot','freeipa_group','kc_org',
                   'freeipa_user','kc_user','kc_org_member','tenant_users','kc_redirect_uri',
                   'nc_group','nc_user','sogo_quota','odoo_company','odoo_user'];
    mergedLog.sort((a, b) => ORDER.indexOf(a.step) - ORDER.indexOf(b.step));
  } catch {
    mergedLog = result.steps;
  }

  await db.query(
    `UPDATE onboarding_requests SET provisioning_log = $1 WHERE id = $2`,
    [JSON.stringify(mergedLog), params.id]
  ).catch(() => null);

  return json({
    ok:            result.ok,
    steps:         result.steps,
    mergedLog,
    adminPassword: result.adminPassword, // only present if user was (re)created
  });
};
