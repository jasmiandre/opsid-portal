<script lang="ts">
  const I = {
    arrowUR: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" width="11" height="11"><path d="M7 17 17 7"/><path d="M8 7h9v9"/></svg>`,
    refresh: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/><path d="M3 21v-5h5"/></svg>`,
  };

  // Cookie sharing strategy (set in auth.svelte.ts #cookieDomain):
  //   opsid.web.id / *.opsid.web.id  → domain=.opsid.web.id  → shared to files.opsid.web.id
  //   workspace.1go.biz.id           → domain=.1go.biz.id    → shared to drive.1go.biz.id
  //
  // nginx on each drive vhost injects: Authorization: Bearer $cookie_opsid_token
  // NC user_oidc validates the KC token (bearerProvisioning:1) → auto-login → /apps/files/
  // No overlay, no extra click needed — same UX as OPSID native domain.
  const _host    = typeof window !== 'undefined' ? window.location.hostname : 'opsid.web.id';
  const isCustom = !(_host === 'opsid.web.id' || _host.endsWith('.opsid.web.id'));

  const driveHost = isCustom
    ? `drive.${_host.split('.').slice(1).join('.')}`
    : 'files.opsid.web.id';

  const driveUrl = `https://${driveHost}/apps/user_oidc/login/1?redirect_url=/apps/files/`;

  let loading = $state(true);
  let iframe  = $state<HTMLIFrameElement | null>(null);

  function reload() {
    if (!iframe) return;
    loading = true;
    iframe.src = '';
    setTimeout(() => { if (iframe) iframe.src = driveUrl; }, 30);
  }

  function onLoad() { loading = false; }
</script>

<div class="embed-shell">
  <header class="topbar">
    <div class="crumb"><strong>Drive</strong> <span class="crumb-sub">— Nextcloud</span></div>
    <div class="topbar-right">
      <button class="btn btn-secondary btn-sm" onclick={reload}>{@html I.refresh} Muat Ulang</button>
      <a class="btn btn-secondary btn-sm" href={driveUrl} target="_blank" rel="noopener noreferrer">
        Buka di Tab Baru {@html I.arrowUR}
      </a>
    </div>
  </header>

  <div class="frame-wrap">
    {#if loading}
      <div class="frame-overlay">
        <div class="spinner"></div>
        <span>Memuat Nextcloud…</span>
      </div>
    {/if}
    <iframe
      bind:this={iframe}
      src={driveUrl}
      title="Nextcloud Drive"
      onload={onLoad}
      class:hidden={loading}
    ></iframe>
  </div>
</div>

<style>
  .embed-shell { flex:1; display:flex; flex-direction:column; height:100%; overflow:hidden; }

  .topbar { display:flex; align-items:center; justify-content:space-between; padding:0 28px; height:56px; border-bottom:1px solid var(--bd-1); background:color-mix(in srgb, var(--bg-0) 80%, transparent); backdrop-filter:blur(12px); flex-shrink:0; position:sticky; top:0; z-index:10; }
  .topbar-right { display:flex; gap:8px; }
  .crumb { font-size:14px; font-weight:600; color:var(--fg-1); display:flex; align-items:center; gap:6px; }
  .crumb-sub { font-size:12px; font-weight:400; color:var(--fg-4); }

  .frame-wrap { flex:1; position:relative; overflow:hidden; }

  .frame-overlay { position:absolute; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center; background:var(--bg-0); z-index:5; gap:14px; color:var(--fg-3); font-size:13px; }
  .spinner { width:28px; height:28px; border:3px solid var(--bd-2); border-top-color:var(--pri); border-radius:50%; animation:spin .8s linear infinite; }
  @keyframes spin { to { transform:rotate(360deg); } }

  iframe { width:100%; height:100%; border:none; background:#fff; display:block; }
  iframe.hidden { visibility:hidden; }
</style>
