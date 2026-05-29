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
    tenantId: null, tenantDomain: '',
    planNextcloudGb: 0, planEmailGb: 0, planOdooGb: 0,
  });

  async init() {
    const { default: Keycloak } = await import('keycloak-js');
    this.kc = new Keycloak({ url: KC_URL, realm: REALM, clientId: CLIENT_ID });
    // Capture the current origin ONCE so every KC redirect stays on the same domain.
    // This is critical for custom-domain tenants (e.g. workspace.1go.biz.id) where
    // window.location.origin must NOT be read lazily inside KC callbacks.
    const origin = window.location.origin;
    try {
      this.authenticated = await this.kc.init({
        onLoad:                   'check-sso',
        // redirectUri: set here so KC JS uses this domain as default for ALL internal
        // login calls (auth_expired refresh, etc.) — not the KC client's rootUrl.
        redirectUri:              origin + '/',
        silentCheckSsoRedirectUri: origin + '/silent-check-sso.html',
        // Disable the silent-check fallback — prevents KC JS from doing an unexpected
        // full-page redirect to KC using the KC client's rootUrl (opsid.web.id).
        silentCheckSsoFallback:   false,
        checkLoginIframe:         false,
        pkceMethod:               'S256',
      });
      if (this.authenticated) {
        this.#loadProfileFromToken();
        this.#saveCookie();
        this.#scheduleRefresh(origin);
        // Enrich with DB role info in the background (non-blocking)
        this.#enrichProfileFromBackend().catch(() => {});
      }
    } finally {
      this.loading = false;
    }
  }

  login()  { this.kc?.login({ redirectUri: window.location.origin + '/' }); }
  logout() {
    this.#clearCookie();
    this.kc?.logout({ redirectUri: window.location.origin });
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
      email:           t.email ?? '',
      isAdmin:         roles.includes('opsid-admin'),
      isTenantAdmin:   false,   // will be overwritten by backend
      organizationSlug: '',
      tenantName: '',
      tenantId: null, tenantDomain: '',
      planNextcloudGb: 0, planEmailGb: 0, planOdooGb: 0,
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
        isTenantAdmin:    d.isTenantAdmin    ?? this.profile.isTenantAdmin,
        organizationSlug: d.organizationSlug ?? this.profile.organizationSlug,
        tenantName:       d.tenantName       ?? this.profile.tenantName,
        tenantId:         d.tenantId         ?? this.profile.tenantId,
        tenantDomain:     d.tenantDomain     ?? this.profile.tenantDomain,
        planNextcloudGb:  d.planNextcloudGb  ?? this.profile.planNextcloudGb,
        planEmailGb:      d.planEmailGb      ?? this.profile.planEmailGb,
        planOdooGb:       d.planOdooGb       ?? this.profile.planOdooGb,
      };
    } catch {
      // Non-fatal — user still gets token-based roles
    }
  }

  #saveCookie() {
    if (!this.kc?.token) return;
    // For opsid subdomains, set domain=.opsid.web.id so all subdomains share the session.
    // For custom domains (e.g. workspace.1go.biz.id), omit domain so cookie is host-only.
    const host = window.location.hostname;
    const domainPart = (host === 'opsid.web.id' || host.endsWith('.opsid.web.id'))
      ? 'domain=.opsid.web.id; '
      : '';
    document.cookie = `opsid_token=${this.kc.token}; path=/; ${domainPart}max-age=3600; SameSite=Lax; Secure`;
  }

  #clearCookie() {
    const host = window.location.hostname;
    const domainPart = (host === 'opsid.web.id' || host.endsWith('.opsid.web.id'))
      ? 'domain=.opsid.web.id; '
      : '';
    document.cookie = `opsid_token=; path=/; ${domainPart}max-age=0`;
  }

  #scheduleRefresh(origin: string) {
    setInterval(() => {
      this.kc?.updateToken(60)
        .then((refreshed: boolean) => { if (refreshed) this.#saveCookie(); })
        // Pass explicit redirectUri so the re-login stays on the current domain,
        // not KC's configured rootUrl (https://opsid.web.id).
        .catch(() => { this.#clearCookie(); this.kc?.login({ redirectUri: origin + '/' }); });
    }, 60_000);
  }
}

export const auth = new AuthState();
