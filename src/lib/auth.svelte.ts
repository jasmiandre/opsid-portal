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
    username: '', email: '',
    isAdmin: false, isTenantAdmin: false,
    organizationSlug: '', tenantName: '',
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
        this.#loadProfileFromToken();
        this.#saveCookie();
        this.#scheduleRefresh();
        // Enrich with DB role info in the background (non-blocking)
        this.#enrichProfileFromBackend().catch(() => {});
      }
    } finally {
      this.loading = false;
    }
  }

  login()  { this.kc?.login({ redirectUri: 'https://opsid.web.id' }); }
  logout() {
    this.#clearCookie();
    this.kc?.logout({ redirectUri: 'https://opsid.web.id' });
  }

  get token(): string | undefined { return this.kc?.token; }

  // ── private ────────────────────────────────────────────────
  #loadProfileFromToken() {
    const t = this.kc.tokenParsed;
    if (!t) return;
    const firstName = t.given_name  ?? t.preferred_username ?? 'User';
    const lastName  = t.family_name ?? '';
    const username  = t.preferred_username ?? '';
    const roles: string[] = t.realm_access?.roles ?? [];

    this.profile = {
      firstName, lastName,
      fullName:  t.name ?? `${firstName} ${lastName}`.trim(),
      initials:  ((firstName[0] ?? '') + (lastName[0] ?? '')).toUpperCase() || 'U',
      username,
      email:          t.email ?? '',
      isAdmin:        roles.includes('opsid-admin'),
      isTenantAdmin:  false,   // will be overwritten by backend
      organizationSlug: '',
      tenantName: '',
    };
  }

  async #enrichProfileFromBackend() {
    try {
      const res = await fetch('/api/me');
      if (!res.ok) return;
      const d = await res.json();
      // Merge only the DB-authoritative fields; keep token fields (name, email, etc.)
      this.profile = {
        ...this.profile,
        isTenantAdmin:   d.isTenantAdmin  ?? this.profile.isTenantAdmin,
        organizationSlug: d.organizationSlug ?? this.profile.organizationSlug,
        tenantName:      d.tenantName     ?? this.profile.tenantName,
      };
    } catch {
      // Non-fatal — user still gets token-based roles
    }
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
