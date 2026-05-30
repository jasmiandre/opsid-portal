import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import db from '$lib/db';
import { provisionTenant, generateSlug, sendWelcomeEmail } from '$lib/server/tenantProvisioning';

function decodeToken(token: string): any {
  try {
    const b64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(Buffer.from(b64, 'base64').toString('utf8'));
  } catch { return null; }
}

function requireAdmin(cookies: any): { ok: true; username: string } | { ok: false; res: Response } {
  const token = cookies.get('opsid_token');
  if (!token) return { ok: false, res: json({ ok: false, error: 'Unauthorized' }, { status: 401 }) as Response };
  const p = decodeToken(token);
  if (!(p?.realm_access?.roles ?? []).includes('opsid-admin'))
    return { ok: false, res: json({ ok: false, error: 'Forbidden' }, { status: 403 }) as Response };
  return { ok: true, username: p.preferred_username ?? 'admin' };
}

export const GET: RequestHandler = async ({ cookies }) => {
  const auth = requireAdmin(cookies);
  if (!auth.ok) return auth.res;

  try {
    const result = await db.query(`
      SELECT t.*, COUNT(tu.id) as user_count
      FROM tenants t
      LEFT JOIN tenant_users tu ON t.id = tu.tenant_id
      GROUP BY t.id
      ORDER BY t.created_at DESC
    `);
    return json({ ok: true, tenants: result.rows });
  } catch (e) {
    return json({ ok: false, error: String(e) }, { status: 500 });
  }
};

export const POST: RequestHandler = async ({ request, cookies }) => {
  const auth = requireAdmin(cookies);
  if (!auth.ok) return auth.res;

  const body = await request.json().catch(() => null);
  if (!body) return json({ error: 'Invalid JSON' }, { status: 400 });

  const {
    name, slug: inputSlug, primaryColor, logoUrl,
    useCustomDomain, domain, adminEmail,
    planNextcloudGb, planEmailGb, planOdooGb,
    adminName, adminPassword,
  } = body;

  if (!name) return json({ error: 'name wajib' }, { status: 400 });
  if (!adminName || !adminPassword) return json({ error: 'adminName dan adminPassword wajib' }, { status: 400 });

  const slug         = (inputSlug || generateSlug(name)).trim();
  const domainType   = (useCustomDomain && domain) ? 'custom_domain' : 'subdomain';
  const tenantDomain = domainType === 'custom_domain' ? domain : `${slug}.opsid.web.id`;

  const result = await provisionTenant({
    name, slug,
    domain:      tenantDomain,
    domain_type: domainType,
    primaryColor, logoUrl,
    planNextcloudGb, planEmailGb, planOdooGb,
    adminName, adminPassword,
    adminEmail:  adminEmail || undefined,
    createdBy:   auth.username,
  });

  if (!result.ok) return json({ ok: false, error: result.error, steps: result.steps }, { status: 500 });

  // Send welcome email to admin (best-effort, non-blocking)
  const picEmail = adminEmail || `${result.adminUsername}@${tenantDomain}`;
  sendWelcomeEmail({
    toEmail:    picEmail,
    toName:     adminName,
    company:    name,
    domain:     tenantDomain,
    username:   result.adminUsername ?? adminName,
    password:   adminPassword,
    domainType,
  }).catch(e => console.error('[AdminTenant] welcome email failed:', String(e)));

  return json({
    ok:            true,
    tenant:        result.tenant,
    adminUsername: result.adminUsername,
    adminPassword,
    domain:        tenantDomain,
    steps:         result.steps,
  });
};
