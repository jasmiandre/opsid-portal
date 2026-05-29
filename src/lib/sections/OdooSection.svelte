<script lang="ts">
  const I = {
    arrowUR: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" width="11" height="11"><path d="M7 17 17 7"/><path d="M8 7h9v9"/></svg>`,
    refresh: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/><path d="M3 21v-5h5"/></svg>`,
    key:     `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><circle cx="7.5" cy="15.5" r="5.5"/><path d="m21 2-9.6 9.6"/><path d="m15.5 7.5 3 3L22 7l-3-3"/></svg>`,
  };

  // Load Odoo web directly — nginx on erp.opsid.web.id strips X-Frame-Options and
  // sets frame-ancestors to allow opsid.web.id embedding.
  //
  // If the user has a valid Odoo session cookie, they land on /web (dashboard) immediately.
  // If not (first visit or session expired), Odoo redirects to its login page which may
  // further redirect to Keycloak — KC login cannot be iframed (X-Frame-Options: SAMEORIGIN).
  //
  // Fallback: "Login via SSO" button opens the KC → Odoo OAuth flow in a new tab.
  // After completing login in the new tab the user closes it, comes back here,
  // and clicks "Muat Ulang" — the iframe now has a valid Odoo session cookie.
  const ODOO_WEB = 'https://erp.opsid.web.id/web';

  // Build KC → Odoo OAuth URL (for the fallback "Login via SSO" button only — NOT for iframe).
  function buildSsoUrl(): string {
    const nonce = (typeof crypto !== 'undefined' && crypto.randomUUID)
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2);
    const state = JSON.stringify({ d: 'odoo_db', p: 4, r: 'https://erp.opsid.web.id/web' });
    const params = new URLSearchParams({
      response_type: 'token',
      client_id:     'odoo',
      redirect_uri:  'https://erp.opsid.web.id/auth_oauth/signin',
      scope:         'openid profile email',
      state,
      nonce,
    });
    return `https://auth.opsid.web.id/realms/opsid-internal/protocol/openid-connect/auth?${params}`;
  }

  let loading = $state(true);
  let iframe  = $state<HTMLIFrameElement | null>(null);
  // Show SSO hint banner until first successful load hides it.
  // Stays visible if user hasn't authenticated with Odoo yet.
  let showSsoHint = $state(false);
  let loadCount   = $state(0); // counts onload fires

  function onLoad() {
    loadCount += 1;
    loading = false;
    // After first load: if iframe has navigated away from /web (e.g. to /web/login),
    // we can't read its URL (cross-origin) but we can show the SSO hint after a delay
    // so the user knows what to do if the page looks like a login screen.
    // Show hint after 2s on first load — user dismisses it if already logged in.
    if (loadCount === 1) {
      setTimeout(() => { showSsoHint = true; }, 2000);
    }
  }

  function reload() {
    if (!iframe) return;
    loading = true;
    showSsoHint = false;
    loadCount = 0;
    iframe.src = '';
    setTimeout(() => { if (iframe) iframe.src = ODOO_WEB; }, 30);
  }

  function dismissHint() { showSsoHint = false; }
</script>

<div class="embed-shell">
  <header class="topbar">
    <div class="crumb"><strong>ERP</strong> <span class="crumb-sub">— Odoo</span></div>
    <div class="topbar-right">
      <button class="btn btn-secondary btn-sm" onclick={reload}>{@html I.refresh} Muat Ulang</button>
      <a class="btn btn-secondary btn-sm sso-btn"
         href={buildSsoUrl()}
         target="_blank"
         rel="noopener noreferrer">
        {@html I.key} Login via SSO
      </a>
      <a class="btn btn-secondary btn-sm" href={ODOO_WEB} target="_blank" rel="noopener">
        Buka di Tab Baru {@html I.arrowUR}
      </a>
    </div>
  </header>

  <div class="frame-wrap">
    {#if loading}
      <div class="frame-overlay">
        <div class="spinner"></div>
        <span>Memuat Odoo ERP…</span>
      </div>
    {/if}

    <iframe
      bind:this={iframe}
      src={ODOO_WEB}
      title="Odoo ERP"
      onload={onLoad}
      class:hidden={loading}
    ></iframe>

    {#if showSsoHint}
      <!-- Shown briefly after first load in case Odoo redirected to a login screen -->
      <div class="sso-hint">
        <div class="sso-hint-inner">
          <span class="sso-hint-icon">{@html I.key}</span>
          <div class="sso-hint-text">
            <strong>Belum login Odoo?</strong>
            Klik <em>Login via SSO</em> di topbar, selesaikan login di tab baru,
            lalu kembali ke sini dan klik <em>Muat Ulang</em>.
          </div>
          <button class="sso-hint-close" onclick={dismissHint} aria-label="Tutup">✕</button>
        </div>
      </div>
    {/if}
  </div>
</div>

<style>
  .embed-shell { flex:1; display:flex; flex-direction:column; height:100%; overflow:hidden; }

  .topbar { display:flex; align-items:center; justify-content:space-between; padding:0 28px; height:56px; border-bottom:1px solid var(--bd-1); background:color-mix(in srgb, var(--bg-0) 80%, transparent); backdrop-filter:blur(12px); flex-shrink:0; position:sticky; top:0; z-index:10; }
  .topbar-right { display:flex; gap:8px; }
  .crumb { font-size:14px; font-weight:600; color:var(--fg-1); display:flex; align-items:center; gap:6px; }
  .crumb-sub { font-size:12px; font-weight:400; color:var(--fg-4); }

  .sso-btn { color:var(--pri) !important; border-color:color-mix(in srgb,var(--pri) 40%,transparent) !important; }
  .sso-btn:hover { background:color-mix(in srgb,var(--pri) 10%,transparent) !important; }

  .frame-wrap { flex:1; position:relative; overflow:hidden; }

  .frame-overlay { position:absolute; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center; background:var(--bg-0); z-index:5; gap:14px; color:var(--fg-3); font-size:13px; }
  .spinner { width:28px; height:28px; border:3px solid var(--bd-2); border-top-color:var(--pri); border-radius:50%; animation:spin .8s linear infinite; }
  @keyframes spin { to { transform:rotate(360deg); } }

  iframe { width:100%; height:100%; border:none; background:#fff; display:block; }
  iframe.hidden { visibility:hidden; }

  /* SSO hint banner — slides up from bottom of frame */
  .sso-hint { position:absolute; bottom:16px; left:50%; transform:translateX(-50%); z-index:6; width:min(520px, calc(100% - 32px)); animation:slideUp .25s ease; }
  @keyframes slideUp { from{opacity:0;transform:translateX(-50%) translateY(12px)} to{opacity:1;transform:translateX(-50%) translateY(0)} }
  .sso-hint-inner { display:flex; align-items:center; gap:12px; background:var(--bg-1); border:1px solid var(--bd-2); border-radius:10px; padding:12px 16px; box-shadow:0 8px 24px rgba(0,0,0,.35); }
  .sso-hint-icon { flex-shrink:0; color:var(--pri); }
  .sso-hint-icon :global(svg) { width:18px; height:18px; }
  .sso-hint-text { flex:1; font-size:12px; color:var(--fg-3); line-height:1.5; }
  .sso-hint-text strong { color:var(--fg-1); }
  .sso-hint-text em { font-style:normal; color:var(--pri); font-weight:600; }
  .sso-hint-close { flex-shrink:0; background:none; border:none; color:var(--fg-4); cursor:pointer; font-size:12px; padding:2px 4px; line-height:1; }
  .sso-hint-close:hover { color:var(--fg-1); }
</style>
