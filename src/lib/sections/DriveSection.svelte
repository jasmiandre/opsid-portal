<script lang="ts">
  import ThemeToggle from '../components/ThemeToggle.svelte';
  import { onMount } from 'svelte';

  const I = {
    arrowUR: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" width="11" height="11"><path d="M7 17 17 7"/><path d="M8 7h9v9"/></svg>`,
    refresh: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/><path d="M3 21v-5h5"/></svg>`,
    cloud:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" width="48" height="48"><path d="M17.5 19a4.5 4.5 0 1 0-1.4-8.78A6 6 0 1 0 6 14h11.5"/></svg>`,
    file:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" width="15" height="15"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg>`,
    folder:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" width="15" height="15"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>`,
  };

  // Cookie sharing strategy:
  //   opsid.web.id (root)          → iframe files.opsid.web.id (frame-ancestors allows root portal)
  //   *.opsid.web.id (subdomain)   → CANNOT iframe files.opsid.web.id (CSP blocks it)
  //                                  → show fallback portal dengan recent files + redirect button
  //   custom-domain tenant          → iframe drive.{tenant-domain} (nginx strips X-Frame-Options)
  const _host     = typeof window !== 'undefined' ? window.location.hostname : 'opsid.web.id';
  const isCustom  = !(_host === 'opsid.web.id' || _host.endsWith('.opsid.web.id'));
  const isSubdomain = _host !== 'opsid.web.id' && _host.endsWith('.opsid.web.id');

  // isSubdomain = true → files.opsid.web.id CSP sekarang allow *.opsid.web.id
  // (nginx opsid.conf telah diupdate frame-ancestors)
  // Fallback mode jika iframe terblokir masih tersedia via variabel ini
  const useIframe = true; // selalu iframe setelah nginx CSP fix

  const driveHost = isCustom
    ? `drive.${_host.split('.').slice(1).join('.')}`
    : 'files.opsid.web.id';

  const driveUrl = `https://${driveHost}/apps/user_oidc/login/1?redirect_url=/apps/files/`;

  let loading      = $state(true);
  let iframe       = $state<HTMLIFrameElement | null>(null);
  let recentFiles  = $state<{ name: string; href: string; type: string; time: string }[]>([]);
  let filesLoading = $state(true);

  function reload() {
    if (!iframe) return;
    loading = true;
    iframe.src = '';
    setTimeout(() => { if (iframe) iframe.src = driveUrl; }, 30);
  }

  function onLoad() { loading = false; }

  function fileColor(t: string) {
    return t==='docx'?'var(--pri)':t==='pdf'?'var(--danger)':t==='xlsx'?'var(--ok)':t==='folder'?'var(--warn)':'var(--fg-3)';
  }
  function fileIcon(t: string) {
    return t === 'folder' ? I.folder : I.file;
  }

  onMount(async () => {
    if (!useIframe) {
      // Load recent files untuk tampilkan di fallback view
      try {
        const res = await fetch('/api/nextcloud/recent');
        const d   = await res.json();
        if (d.ok) recentFiles = d.files ?? [];
      } catch { /* ignore */ }
      filesLoading = false;
    }
  });
</script>

<div class="embed-shell">
  <header class="topbar">
    <div class="crumb"><strong>Drive</strong> <span class="crumb-sub">— Nextcloud</span></div>
    <div class="topbar-right">
      {#if useIframe}
        <button class="btn btn-secondary btn-sm" onclick={reload}>{@html I.refresh} Muat Ulang</button>
      {/if}
      <a class="btn btn-secondary btn-sm" href={driveUrl} target="_blank" rel="noopener noreferrer">
        Buka di Tab Baru {@html I.arrowUR}
      </a>
      <ThemeToggle />
    </div>
  </header>

  {#if useIframe}
    <!-- Mode iframe: opsid.web.id (root) dan custom domain tenant -->
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

  {:else}
    <!-- Mode fallback: tenant subdomain *.opsid.web.id -->
    <!-- files.opsid.web.id CSP blokir framing dari subdomain. Tampilkan portal view. -->
    <div class="fallback-wrap">
      <div class="fallback-hero">
        <div class="fallback-icon">{@html I.cloud}</div>
        <h2>Nextcloud Drive</h2>
        <p>Drive tidak bisa ditampilkan langsung di portal karena kebijakan keamanan browser.<br/>
        Klik tombol di bawah untuk membuka Nextcloud di tab baru — login otomatis.</p>
        <a href={driveUrl} target="_blank" rel="noopener noreferrer" class="btn btn-primary btn-lg">
          Buka Nextcloud {@html I.arrowUR}
        </a>
        <p class="fallback-note">Cookie sesi sudah dibagikan — kamu akan langsung masuk tanpa login ulang.</p>
      </div>

      {#if recentFiles.length > 0}
        <div class="recent-panel">
          <div class="recent-head">File Terbaru</div>
          <div class="recent-list">
            {#each recentFiles as f}
              <a href={f.href} target="_blank" rel="noopener" class="recent-row">
                <span class="recent-icon" style="color:{fileColor(f.type)}">{@html fileIcon(f.type)}</span>
                <span class="recent-name">{f.name}</span>
                <span class="recent-time mono">{f.time}</span>
              </a>
            {/each}
          </div>
        </div>
      {:else if filesLoading}
        <div class="recent-empty">Memuat file terbaru…</div>
      {/if}
    </div>
  {/if}
</div>

<style>
  .embed-shell { flex:1; display:flex; flex-direction:column; height:100%; overflow:hidden; }

  .topbar { display:flex; align-items:center; justify-content:space-between; padding:0 28px; height:56px; border-bottom:1px solid var(--bd-1); background:color-mix(in srgb, var(--bg-0) 80%, transparent); backdrop-filter:blur(12px); flex-shrink:0; position:sticky; top:0; z-index:10; }
  .topbar-right { display:flex; gap:8px; }
  .crumb { font-size:14px; font-weight:600; color:var(--fg-1); display:flex; align-items:center; gap:6px; }
  .crumb-sub { font-size:12px; font-weight:400; color:var(--fg-4); }

  /* ── Iframe mode ─────────────────────────────────────────── */
  .frame-wrap { flex:1; position:relative; overflow:hidden; }
  .frame-overlay { position:absolute; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center; background:var(--bg-0); z-index:5; gap:14px; color:var(--fg-3); font-size:13px; }
  .spinner { width:28px; height:28px; border:3px solid var(--bd-2); border-top-color:var(--pri); border-radius:50%; animation:spin .8s linear infinite; }
  @keyframes spin { to { transform:rotate(360deg); } }
  iframe { width:100%; height:100%; border:none; background:#fff; display:block; }
  iframe.hidden { visibility:hidden; }

  /* ── Fallback mode ───────────────────────────────────────── */
  .fallback-wrap { flex:1; overflow-y:auto; display:flex; flex-direction:column; align-items:center; padding:40px 24px; gap:28px; }

  .fallback-hero { display:flex; flex-direction:column; align-items:center; text-align:center; gap:16px; max-width:520px; }
  .fallback-icon { color:var(--pri); opacity:.7; }
  .fallback-hero h2 { font-size:22px; font-weight:700; color:var(--fg-1); letter-spacing:-.02em; }
  .fallback-hero p { font-size:14px; color:var(--fg-3); line-height:1.6; }
  .fallback-note { font-size:11px; color:var(--fg-4); margin-top:4px; }

  .btn-lg { padding:12px 24px; font-size:14px; border-radius:10px; }

  .recent-panel { width:100%; max-width:600px; background:var(--bg-1); border:1px solid var(--bd-1); border-radius:var(--r-lg); overflow:hidden; }
  .recent-head { padding:12px 18px; font-size:11px; font-weight:700; color:var(--fg-3); text-transform:uppercase; letter-spacing:.08em; border-bottom:1px solid var(--bd-1); }
  .recent-list { display:flex; flex-direction:column; }
  .recent-row { display:flex; align-items:center; gap:12px; padding:11px 18px; border-bottom:1px solid var(--bd-1); text-decoration:none; color:inherit; transition:.12s; }
  .recent-row:last-child { border-bottom:none; }
  .recent-row:hover { background:var(--bg-2); }
  .recent-icon { flex-shrink:0; }
  .recent-name { flex:1; font-size:13px; font-weight:500; color:var(--fg-1); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .recent-time { font-size:11px; color:var(--fg-4); flex-shrink:0; }
  .recent-empty { font-size:13px; color:var(--fg-4); }
</style>
