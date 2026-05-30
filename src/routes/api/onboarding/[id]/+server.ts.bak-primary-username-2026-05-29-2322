import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import db from '$lib/db';
import { provisionTenant, generateSlug, generatePassword, sendWelcomeEmail } from '$lib/server/tenantProvisioning';

function decodeToken(token: string): any {
  try {
    const b64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(Buffer.from(b64, 'base64').toString('utf8'));
  } catch { return null; }
}

// Admin: approve or reject a request
export const PUT: RequestHandler = async ({ params, request, cookies }) => {
  const token = cookies.get('opsid_token');
  if (!token) return json({ ok: false, error: 'Unauthorized' }, { status: 401 });

  const p = decodeToken(token);
  const isAdmin = (p?.realm_access?.roles ?? []).includes('opsid-admin');
  if (!isAdmin) return json({ ok: false, error: 'Forbidden' }, { status: 403 });

  const reviewer = p?.preferred_username ?? 'admin';
  const { status, notes } = await request.json().catch(() => ({}));

  if (!['approved', 'rejected', 'reset_pending'].includes(status))
    return json({ ok: false, error: 'Status tidak valid' }, { status: 400 });

  // ── Reset stuck processing → pending ───────────────────────────
  if (status === 'reset_pending') {
    try {
      const r = await db.query(
        `UPDATE onboarding_requests
         SET status='pending', reviewed_at=NULL, reviewed_by=NULL,
             notes=COALESCE($1,notes)
         WHERE id=$2 AND status='processing'
         RETURNING id`,
        [notes ?? null, params.id]
      );
      if (!r.rows.length) {
        return json({ ok: false, error: 'Request tidak dalam status processing' }, { status: 409 });
      }
      return json({ ok: true });
    } catch (e) {
      return json({ ok: false, error: String(e) }, { status: 500 });
    }
  }

  // ── Rejection path ─────────────────────────────────────────────
  if (status === 'rejected') {
    try {
      await db.query(
        `UPDATE onboarding_requests
         SET status=$1, notes=COALESCE($2,notes), reviewed_at=NOW(), reviewed_by=$3
         WHERE id=$4`,
        ['rejected', notes ?? null, reviewer, params.id]
      );
      return json({ ok: true });
    } catch (e) {
      return json({ ok: false, error: String(e) }, { status: 500 });
    }
  }

  // ── Approval path: atomically claim the request ───────────────
  // Use 'processing' intermediate status to prevent double-provisioning race.
  let row: any;
  try {
    const claim = await db.query(
      `UPDATE onboarding_requests
         SET status = 'processing', reviewed_at = NOW(), reviewed_by = $1
       WHERE id = $2 AND status = 'pending'
       RETURNING *`,
      [reviewer, params.id]
    );
    if (claim.rows.length) {
      row = claim.rows[0];
    } else {
      // No row updated — either not found or already in progress/approved/rejected
      const existing = await db.query(
        `SELECT id, status FROM onboarding_requests WHERE id = $1`,
        [params.id]
      );
      if (!existing.rows.length)
        return json({ ok: false, error: 'Request tidak ditemukan' }, { status: 404 });
      const s = existing.rows[0].status;
      return json({ ok: false, error: `Request sudah dalam status: ${s}` }, { status: 409 });
    }
  } catch (e) {
    return json({ ok: false, error: String(e) }, { status: 500 });
  }

  // Derive slug from company_name
  const slug = generateSlug(row.company_name);

  // Derive final domain
  const domain = row.domain_type === 'custom_domain' && row.domain_value
    ? row.domain_value
    : `${row.domain_value || slug}.opsid.web.id`;

  // Generate temporary admin password
  const adminPassword = generatePassword();

  // Provision tenant
  const result = await provisionTenant({
    name:    row.company_name,
    slug,
    domain,
    domain_type: (row.domain_type === 'custom_domain' ? 'custom_domain' : 'subdomain') as 'subdomain' | 'custom_domain',
    planTier: row.plan_tier,
    maxUsers: row.user_count,
    adminName:     row.primary_user_name || row.pic_name,
    adminEmail:    row.primary_user_email || row.pic_email,
    adminUsername: (row.primary_user_email || row.pic_email || '').split('@')[0],
    adminPassword,
    createdBy: reviewer,
  });

  if (!result.ok) {
    // Reset to 'pending' so the admin can retry; save error in notes
    await db.query(
      `UPDATE onboarding_requests
       SET status='pending', notes=COALESCE($1,notes), reviewed_at=NULL, reviewed_by=NULL
       WHERE id=$2`,
      [`Provisioning gagal: ${result.error}\n${notes ?? ''}`.trim(), params.id]
    ).catch(() => null);
    return json({
      ok:    false,
      error: 'Tenant gagal dibuat: ' + result.error,
      steps: result.steps,
    }, { status: 500 });
  }

  // Update onboarding_requests: processing → approved
  try {
    await db.query(
      `UPDATE onboarding_requests
       SET status='approved', tenant_id=$1,
           notes=COALESCE($2,notes),
           provisioning_log=$3
       WHERE id=$4`,
      [result.tenant!.id, notes ?? null, JSON.stringify(result.steps), params.id]
    );
  } catch (e) {
    console.error('[Onboarding] Failed to update request after provisioning:', String(e));
  }

  // ── Send welcome email to customer (fire-and-forget) ──────────
  sendWelcomeEmail({
    toEmail:  row.pic_email,
    toName:   row.pic_name,
    company:  row.company_name,
    domain,
    username: result.adminUsername ?? `admin.${slug}`,
    password: adminPassword,
  }).catch((e) => console.error('[Onboarding] Welcome email failed:', String(e)));

  return json({
    ok:            true,
    tenant:        result.tenant,
    adminUsername: result.adminUsername,
    adminPassword,
    domain,
    steps:         result.steps,
  });
};
