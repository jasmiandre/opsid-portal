import type { Handle } from "@sveltejs/kit";
import db from "$lib/db";

const DEFAULT_BRANDING = {
  primary_color: '#5B86FF',
  logo_url: '',
  tenant_name: 'OPSID',
};

export const handle: Handle = async ({ event, resolve }) => {
  const token = event.cookies.get("opsid_token");
  if (token) event.locals.token = token;

  // White-label branding berdasarkan Host header
  const host = event.request.headers.get('host')?.split(':')[0] ?? '';

  try {
    const result = await db.query(
      `SELECT primary_color, logo_url, name FROM tenants WHERE domain = $1 LIMIT 1`,
      [host]
    );
    if (result.rows.length > 0) {
      const row = result.rows[0];
      event.locals.branding = {
        primary_color: row.primary_color || DEFAULT_BRANDING.primary_color,
        logo_url: row.logo_url || '',
        tenant_name: row.name || DEFAULT_BRANDING.tenant_name,
      };
    } else {
      event.locals.branding = DEFAULT_BRANDING;
    }
  } catch {
    event.locals.branding = DEFAULT_BRANDING;
  }

  const response = await resolve(event);
  return response;
};
