import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
  return {
    branding: locals.branding ?? {
      primary_color: '#5B86FF',
      logo_url: '',
      tenant_name: 'OPSID',
    },
  };
};
