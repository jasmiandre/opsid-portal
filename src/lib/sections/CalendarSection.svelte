<script lang="ts">
  import ThemeToggle from '../components/ThemeToggle.svelte';
  import { auth } from '../auth.svelte';

  const I = {
    arrowUR: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" width="11" height="11"><path d="M7 17 17 7"/><path d="M8 7h9v9"/></svg>`,
    refresh: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/><path d="M3 21v-5h5"/></svg>`,
  };

  // SOGo Calendar URL — nginx auth_request handles SSO using opsid_token cookie.
  //
  // URL strategy:
  //   opsid.web.id (root)       → https://mail.opsid.web.id/SOGo/  (direct, frame-ancestors allows it)
  //   *.opsid.web.id (tenant)   → https://{host}/SOGo/             (nginx proxies + strips X-Frame)
  //   custom-domain tenant      → https://{host}/SOGo/             (nginx proxies + strips X-Frame)
  //
  // NOTE: jangan gunakan mail.opsid.web.id untuk *.opsid.web.id subdomains —
  // frame-ancestors di nginx hanya allow opsid.web.id, bukan subdomainnya.
  const _sogoHost   = typeof window !== 'undefined' ? window.location.hostname : 'opsid.web.id';
  const _isRootPortal = _sogoHost === 'opsid.web.id';
  const SOGO_ORIGIN = _isRootPortal ? 'https://mail.opsid.web.id' : `https://${_sogoHost}`;

  let username   = $derived(auth.profile.username || '');
  let sogoCalUrl = $derived(`${SOGO_ORIGIN}/SOGo/so/${username}/Calendar/`);

  let loading = $state(true);
  let iframe  = $state<HTMLIFrameElement | null>(null);

  function reload() {
    if (!iframe) return;
    loading = true;
    const src = sogoCalUrl;
    iframe.src = '';
    setTimeout(() => { if (iframe) iframe.src = src; }, 30);
  }

  function onLoad() { loading = false; }
</script>

<div class="embed-shell">
  <header class="topbar">
    <div class="crumb"><strong>Kalender</strong> <span class="crumb-sub">— SOGo Calendar</span></div>
    <div class="topbar-right">
      <button class="btn btn-secondary btn-sm" onclick={reload}>{@html I.refresh} Muat Ulang</button>
      <a class="btn btn-secondary btn-sm" href={sogoCalUrl} target="_blank" rel="noopener">
        Buka di Tab Baru {@html I.arrowUR}
      </a>
    </div>
  </header>

  <div class="frame-wrap">
    {#if loading}
      <div class="frame-overlay">
        <div class="spinner"></div>
        <span>Memuat SOGo Calendar…</span>
      </div>
    {/if}
    {#if username}
      <iframe
        bind:this={iframe}
        src={sogoCalUrl}
        title="SOGo Calendar"
        onload={onLoad}
        class:hidden={loading}
      ></iframe>
    {:else}
      <div class="frame-overlay">
        <span>Memuat profil…</span>
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

  .frame-wrap { flex:1; position:relative; overflow:hidden; }

  .frame-overlay { position:absolute; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center; background:var(--bg-0); z-index:5; gap:14px; color:var(--fg-3); font-size:13px; }
  .spinner { width:28px; height:28px; border:3px solid var(--bd-2); border-top-color:var(--pri); border-radius:50%; animation:spin .8s linear infinite; }
  @keyframes spin { to { transform:rotate(360deg); } }

  iframe { width:100%; height:100%; border:none; background:#fff; display:block; }
  iframe.hidden { visibility:hidden; }
</style>
