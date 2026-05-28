import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import db from '$lib/db';
import { logAudit, usernameFromCookie } from '$lib/server/audit';

const KC_BASE = 'https://auth.opsid.web.id';
const REALM   = 'opsid-internal';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function getKcToken(): Promise<string> {
  const res = await fetch(`${KC_BASE}/realms/master/protocol/openid-connect/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'client_id=admin-cli&grant_type=password&username=opsid-admin&password=sandiaman2026',
  });
  const d = await res.json();
  if (!d.access_token) throw new Error('KC token empty');
  return d.access_token;
}

async function listKcOrgs(token: string): Promise<any[]> {
  const res = await fetch(`${KC_BASE}/admin/realms/${REALM}/organizations?max=200`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  if (!res.ok) return [];
  return res.json();
}

/** GET /api/admin/tenant/sync — returns mismatch report */
export const GET: RequestHandler = async ({ cookies }) => {
  const actor = usernameFromCookie(cookies.get('opsid_token'));

  try {
    const token = await getKcToken();
    const [kcOrgs, dbResult] = await Promise.all([
      listKcOrgs(token),
      db.query(`SELECT id, name, slug, domain, status FROM tenants ORDER BY created_at DESC`),
    ]);

    const dbTenants = dbResult.rows;
    const dbSlugs = new Set(dbTenants.map((t: any) => t.slug));
    const kcSlugs = new Set(kcOrgs.map((o: any) => o.alias ?? o.slug));

    const onlyInKc = kcOrgs.filter((o: any) => !dbSlugs.has(o.alias ?? o.slug)).map((o: any) => ({
      kcId: o.id,
      name: o.name,
      slug: o.alias ?? o.slug,
      domains: o.domains?.map((d: any) => d.name) ?? [],
    }));

    const onlyInDb = dbTenants.filter((t: any) => !kcSlugs.has(t.slug)).map((t: any) => ({
      dbId: t.id,
      name: t.name,
      slug: t.slug,
      domain: t.domain,
      status: t.status,
    }));

    const both = dbTenants
      .filter((t: any) => kcSlugs.has(t.slug))
      .map((t: any) => {
        const kc = kcOrgs.find((o: any) => (o.alias ?? o.slug) === t.slug);
        return { dbId: t.id, kcId: kc?.id, name: t.name, slug: t.slug, domain: t.domain, status: 'synced' };
      });

    return json({
      ok: true,
      summary: {
        total_kc: kcOrgs.length,
        total_db: dbTenants.length,
        synced: both.length,
        only_in_kc: onlyInKc.length,
        only_in_db: onlyInDb.length,
      },
      onlyInKc,
      onlyInDb,
      synced: both,
    });
  } catch (e) {
    return json({ ok: false, error: String(e) }, { status: 500 });
  }
};

/** POST /api/admin/tenant/sync — perform sync action */
export const POST: RequestHandler = async ({ request, cookies }) => {
  const actor = usernameFromCookie(cookies.get('opsid_token'));
  const { action, slug, kcId, dbId, name, domain } = await request.json();

  try {
    const token = await getKcToken();

    if (action === 'import_to_db') {
      // Import Keycloak org into PostgreSQL tenants table
      if (!slug || !name) return json({ ok: false, error: 'slug dan name wajib' }, { status: 400 });
      const tenantDomain = domain || `${slug}.opsid.web.id`;

      const existing = await db.query(`SELECT id FROM tenants WHERE slug = $1`, [slug]);
      if (existing.rows.length) {
        return json({ ok: false, error: 'Tenant sudah ada di database' }, { status: 409 });
      }

      const result = await db.query(
        `INSERT INTO tenants (name, slug, domain, primary_color, status)
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [name, slug, tenantDomain, '#3B82F6', 'active']
      );

      await logAudit(actor, 'SYNC_IMPORT_TENANT', slug, { name, tenantDomain, kcId });
      return json({ ok: true, tenantId: result.rows[0].id });
    }

    if (action === 'delete_kc_org') {
      // Delete orphan Keycloak organization (requires explicit confirmation)
      if (!kcId) return json({ ok: false, error: 'kcId wajib' }, { status: 400 });

      const res = await fetch(`${KC_BASE}/admin/realms/${REALM}/organizations/${kcId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!res.ok && res.status !== 404) {
        return json({ ok: false, error: `KC delete failed: ${res.status}` }, { status: 500 });
      }

      await logAudit(actor, 'SYNC_DELETE_KC_ORG', kcId, { slug, name });
      return json({ ok: true });
    }

    return json({ ok: false, error: 'Action tidak dikenal' }, { status: 400 });
  } catch (e) {
    return json({ ok: false, error: String(e) }, { status: 500 });
  }
};
