import db from '$lib/db';

export function decodeToken(token: string): any {
  try {
    const b64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(Buffer.from(b64, 'base64').toString('utf8'));
  } catch { return null; }
}

/**
 * Verify the caller can access a specific tenant.
 * - opsid-admin  → allowed for all tenants.
 * - org-admin    → allowed only for their own tenant (matched via username OR email).
 * - anyone else  → Forbidden.
 */
export async function requireTenantAccess(
  cookies: { get: (name: string) => string | undefined },
  tenantId: string | number,
): Promise<
  | { ok: true;  isAdmin: boolean }
  | { ok: false; error: string; status: number }
> {
  const token = cookies.get('opsid_token');
  if (!token) return { ok: false, error: 'Unauthorized', status: 401 };

  const payload = decodeToken(token);
  const username: string = payload?.preferred_username ?? '';
  if (!username) return { ok: false, error: 'Unauthorized', status: 401 };

  const roles: string[] = payload?.realm_access?.roles ?? [];
  if (roles.includes('opsid-admin')) return { ok: true, isAdmin: true };

  const email: string = payload?.email ?? '';

  const row = await db.query(
    `SELECT 1 FROM tenant_users
     WHERE  (username = $1 OR lower(email) = lower($2))
       AND  role = 'org-admin' AND status = 'active'
       AND  tenant_id = $3
     LIMIT  1`,
    [username, email, tenantId],
  ).then(r => r.rows[0]).catch(() => null);

  if (!row) return { ok: false, error: 'Forbidden', status: 403 };
  return { ok: true, isAdmin: false };
}
