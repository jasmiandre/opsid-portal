// Static config — no logic, no secrets. Easy to swap per env.
export const KC_URL    = 'https://auth.opsid.web.id';
export const REALM     = 'opsid-internal';
export const CLIENT_ID = 'portal';

export const APP_URLS = {
  mail:  'https://mail.opsid.web.id/SOGo',
  cloud: 'https://files.opsid.web.id/apps/user_oidc/login/1',
  erp:   'https://auth.opsid.web.id/realms/opsid-internal/protocol/openid-connect/auth?response_type=id_token+token&client_id=odoo&redirect_uri=https%3A%2F%2Ferp.opsid.web.id%2Fauth_oauth/signin&scope=openid+profile+email&state=%7B%22d%22%3A+%22odoo_db%22%2C+%22p%22%3A+4%2C+%22r%22%3A+%22https%253A%252F%252Ferp.opsid.web.id%252Fweb%22%7D&nonce=opsidrandom123',
  auth:  'https://auth.opsid.web.id'
} as const;

/**
 * Returns tenant-specific drive and erp URLs for the given browser hostname.
 *
 * OPSID-native domains (opsid.web.id / *.opsid.web.id):
 *   drive → files.opsid.web.id  (shared Nextcloud)
 *   erp   → existing APP_URLS.erp (KC OAuth → erp.opsid.web.id)
 *
 * Custom-domain tenants (workspace.X):
 *   base  = strip first label  e.g. workspace.1go.biz.id → 1go.biz.id
 *   drive → https://drive.{base}/apps/user_oidc/login/1?redirect_url=/apps/files/
 *   erp   → KC OAuth implicit flow pointing at erp.{base}
 *
 * Called at component init time so Date.now() gives a fresh nonce per mount.
 */
export function tenantAppUrls(host: string): { driveUrl: string; erpUrl: string } {
  if (host === 'opsid.web.id' || host.endsWith('.opsid.web.id')) {
    return {
      driveUrl: `${APP_URLS.cloud}?redirect_url=/apps/files/`,
      erpUrl:   APP_URLS.erp,
    };
  }

  // Strip first subdomain label: workspace.1go.biz.id → 1go.biz.id
  const labels     = host.split('.');
  const baseDomain = labels.length > 1 ? labels.slice(1).join('.') : host;
  const driveHost  = `drive.${baseDomain}`;
  const erpHost    = `erp.${baseDomain}`;

  const erpState  = JSON.stringify({ d: 'odoo_db', p: 4, r: `https://${erpHost}/web` });
  const erpParams = new URLSearchParams({
    response_type: 'id_token token',
    client_id:     'odoo',
    redirect_uri:  `https://${erpHost}/auth_oauth/signin`,
    scope:         'openid profile email',
    state:         erpState,
    nonce:         Math.random().toString(36).slice(2),
  });

  return {
    driveUrl: `https://${driveHost}/apps/user_oidc/login/1?redirect_url=/apps/files/`,
    erpUrl:   `${KC_URL}/realms/${REALM}/protocol/openid-connect/auth?${erpParams}`,
  };
}

export const APP_META = {
  mail:  { tile: 'mail',  name: 'SOGo Mail',    host: 'mail.opsid.web.id',  desc: 'Email, kalender, dan kontak terpusat' },
  cloud: { tile: 'cloud', name: 'Nextcloud',    host: 'files.opsid.web.id', desc: 'Penyimpanan file dan dokumen bersama' },
  erp:   { tile: 'erp',   name: 'Odoo ERP',     host: 'erp.opsid.web.id',   desc: 'CRM, inventory, akuntansi, POS' },
  auth:  { tile: 'key',   name: 'Keycloak SSO', host: 'auth.opsid.web.id',  desc: 'Identity provider' }
} as const;
