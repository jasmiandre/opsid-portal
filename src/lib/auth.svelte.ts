// Reactive Keycloak state via Svelte 5 runes.
// Components import `auth` and read its fields directly — no prop drilling, no stores boilerplate.
import { KC_URL, REALM, CLIENT_ID } from './config';
import type { KcProfile } from './types';

class AuthState {
  kc: any = $state(null);
  loading = $state(true);
  authenticated = $state(false);
  profile: KcProfile = $state({
    firstName: '', lastName: '', fullName: '', initials: 'U',
    username: '', email: '', isAdmin: false , isTenantAdmin: false, organizationSlug: ''
  });

  async init() {
    const { default: Keycloak } = await import('keycloak-js');
    this.kc = new Keycloak({ url: KC_URL, realm: REALM, clientId: CLIENT_ID });
    try {
      this.authenticated = await this.kc.init({
        onLoad: 'check-sso',
        silentCheckSsoRedirectUri: window.location.origin + '/silent-check-sso.html',
        checkLoginIframe: false,
        pkceMethod: 'S256'
      });
      if (this.authenticated) {
        this.#loadProfile();
        this.#saveCookie();
        this.#scheduleRefresh();
      }
    } finally {
      this.loading = false;
    }
  }

  login() { this.kc?.login({ redirectUri: 'https://opsid.web.id' }); }

logout() {
    this.#clearCookie();
    this.kc?.logout({ redirectUri: 'https://opsid.web.id' });
  }

  get token(): string | undefined { return this.kc?.token; }

  // ── private ────────────────────────────────────────────────
#loadProfile() {
  const t = this.kc.tokenParsed;
  if (!t) return;
  const firstName = t.given_name ?? t.preferred_username ?? 'User';
  const lastName  = t.family_name ?? '';
  const username  = t.preferred_username ?? '';
  const roles: string[] = t.realm_access?.roles ?? [];
  const orgs = t.organizations ?? {};
  const orgSlugs = Object.keys(orgs);
  const isTenantAdmin = orgSlugs.some(slug => orgs[slug]?.roles?.includes('org-admin'));
  
  this.profile = {
    firstName, lastName,
    fullName: t.name ?? `${firstName} ${lastName}`.trim(),
    initials: ((firstName[0] ?? '') + (lastName[0] ?? '')).toUpperCase() || 'U',
    username,
    email: t.email ?? '',
    isAdmin: roles.includes('opsid-admin'),
    isTenantAdmin,
    organizationSlug: orgSlugs[0] ?? ''
  };
}
  #saveCookie() {
    if (!this.kc?.token) return;
    document.cookie = `opsid_token=${this.kc.token}; path=/; domain=.opsid.web.id; max-age=3600; SameSite=Lax; Secure`;
  }

  #clearCookie() {
    document.cookie = 'opsid_token=; path=/; domain=.opsid.web.id; max-age=0';
  }

  #scheduleRefresh() {
    setInterval(() => {
      this.kc?.updateToken(60)
        .then((refreshed: boolean) => { if (refreshed) this.#saveCookie(); })
        .catch(() => { this.#clearCookie(); this.kc?.login(); });
    }, 60_000);
  }
}

export const auth = new AuthState();
