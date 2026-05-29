import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import db from '$lib/db';
import { provisionTenant, generateSlug } from '$lib/server/tenantProvisioning';

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
    useCustomDomain, domain,
    planNextcloudGb, planEmailGb, planOdooGb,
    adminName, adminPassword,
  } = body;

  if (!name) return json({ error: 'name wajib' }, { status: 400 });
  if (!adminName || !adminPassword) return json({ error: 'adminName dan adminPassword wajib' }, { status: 400 });

  const slug         = (inputSlug || generateSlug(name)).trim();
  const tenantDomain = useCustomDomain && domain ? domain : `${slug}.opsid.web.id`;

  const result = await provisionTenant({
    name, slug, domain: tenantDomain,
    primaryColor, logoUrl,
    planNextcloudGb, planEmailGb, planOdooGb,
    adminName, adminPassword,
    createdBy: auth.username,
  });

  if (!result.ok) return json({ ok: false, error: result.error }, { status: 500 });
  return json({ ok: true, tenant: result.tenant, steps: result.steps });
};
