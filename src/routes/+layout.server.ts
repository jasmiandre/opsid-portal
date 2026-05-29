import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
  const branding = locals.branding ?? {
    primary_color: '#5B86FF',
    logo_url: '',
    tenant_name: 'OPSID',
  };
  return {
    branding,
    // true when the request hostname matches a tenant domain in the DB
    isTenantDomain: !!('tenant_id' in branding && (branding as any).tenant_id),
  };
};
