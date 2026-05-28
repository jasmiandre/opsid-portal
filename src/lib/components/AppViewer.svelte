<script lang="ts">
  import { ui } from '../ui.svelte';

  const I = {
    arrowL:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><path d="M19 12H5"/><path d="m11 6-6 6 6 6"/></svg>`,
    arrowUR: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" width="11" height="11"><path d="M7 17 17 7"/><path d="M8 7h9v9"/></svg>`,
    refresh: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/><path d="M3 21v-5h5"/></svg>`,
  };

  let iframe = $state<HTMLIFrameElement | null>(null);
  let loading = $state(true);
  let blocked = $state(false);
  let prevKey = $state('');

  // Reset state on app change
  $effect(() => {
    const key = ui.currentApp?.key ?? '';
    if (key !== prevKey) {
      loading = true;
      blocked = false;
      prevKey = key;
    }
  });

  function onLoad() {
    // If iframe content is inaccessible due to X-Frame-Options,
    // the browser fires load but the contentDocument is null.
    try {
      // Cross-origin iframes throw when accessing contentDocument.
      // This is the expected case — just mark loaded.
      loading = false;
    } catch {
      blocked = true;
      loading = false;
    }
  }

  function onError() {
    blocked = true;
    loading = false;
  }

  function reload() {
    if (!iframe || !ui.currentApp) return;
    loading = true;
    blocked = false;
    // Force reload by toggling src
    const src = ui.currentApp.url;
    iframe.src = '';
    setTimeout(() => { if (iframe) iframe.src = src; }, 50);
  }
</script>

<div class="app-frame">
  <!-- Toolbar -->
  <div class="app-bar">
    <button class="back-btn" onclick={() => ui.closeApp()}>
      {@html I.arrowL}
      Dashboard
    </button>
    <div class="app-bar-center">
      <span class="app-title">{ui.currentApp?.label ?? ''}</span>
      {#if ui.currentApp}
        <code class="app-url mono">{new URL(ui.currentApp.url).hostname}</code>
      {/if}
    </div>
    <div class="app-bar-actions">
      <button class="bar-btn" onclick={reload} title="Muat ulang">{@html I.refresh}</button>
      <a class="bar-btn" href={ui.currentApp?.url} target="_blank" rel="noopener" title="Buka di tab baru">
        {@html I.arrowUR} Buka di tab baru
      </a>
    </div>
  </div>

  <!-- Loading indicator -->
  {#if loading}
    <div class="frame-loading">
      <div class="spinner"></div>
      <span>Memuat {ui.currentApp?.label}…</span>
    </div>
  {/if}

  <!-- Iframe -->
  {#if ui.currentApp && !blocked}
    <iframe
      bind:this={iframe}
      src={ui.currentApp.url}
      title={ui.currentApp.label}
      onload={onLoad}
      onerror={onError}
      class:hidden={loading}
    ></iframe>
  {/if}

  <!-- Fallback when blocked by X-Frame-Options / CSP -->
  {#if blocked}
    <div class="fallback">
      <div class="fallback-icon">🚫</div>
      <h3 class="fallback-title">{ui.currentApp?.label} tidak dapat ditampilkan di sini</h3>
      <p class="fallback-sub">Aplikasi ini memblokir embedding (X-Frame-Options / Content-Security-Policy).<br>Buka di tab baru untuk menggunakannya.</p>
      <a class="btn btn-primary" href={ui.currentApp?.url} target="_blank" rel="noopener">
        Buka {ui.currentApp?.label} {@html I.arrowUR}
      </a>
    </div>
  {/if}
</div>

<style>
  .app-frame {
    flex: 1;
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow: hidden;
    position: relative;
  }

  /* Toolbar */
  .app-bar {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 0 16px;
    height: 48px;
    background: var(--bg-1);
    border-bottom: 1px solid var(--bd-1);
    flex-shrink: 0;
    z-index: 5;
  }

  .back-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    border-radius: var(--r-md);
    font-size: 13px;
    font-weight: 500;
    color: var(--fg-3);
    background: var(--bg-2);
    border: 1px solid var(--bd-1);
    cursor: pointer;
    font-family: inherit;
    transition: all .15s;
    flex-shrink: 0;
  }
  .back-btn:hover { color: var(--fg-1); background: var(--bg-3); }

  .app-bar-center {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
  }
  .app-title {
    font-size: 14px;
    font-weight: 600;
    color: var(--fg-1);
    white-space: nowrap;
  }
  .app-url {
    font-size: 11px;
    color: var(--fg-4);
    background: var(--bg-2);
    padding: 2px 8px;
    border-radius: 4px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 300px;
  }

  .app-bar-actions {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-shrink: 0;
  }
  .bar-btn {
    display: flex;
    align-items: center;
    gap: 5px;
    padding: 6px 12px;
    border-radius: var(--r-md);
    font-size: 12px;
    font-weight: 500;
    color: var(--fg-3);
    background: var(--bg-2);
    border: 1px solid var(--bd-1);
    cursor: pointer;
    font-family: inherit;
    transition: all .15s;
    text-decoration: none;
  }
  .bar-btn:hover { color: var(--fg-1); background: var(--bg-3); }

  /* Loading */
  .frame-loading {
    position: absolute;
    inset: 48px 0 0 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 14px;
    background: var(--bg-0);
    z-index: 4;
    color: var(--fg-3);
    font-size: 13px;
  }
  .spinner {
    width: 32px;
    height: 32px;
    border: 3px solid var(--bd-2);
    border-top-color: var(--pri);
    border-radius: 50%;
    animation: spin .8s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }

  /* Iframe */
  iframe {
    flex: 1;
    width: 100%;
    border: none;
    background: #fff;
  }
  iframe.hidden { visibility: hidden; position: absolute; pointer-events: none; }

  /* Fallback */
  .fallback {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 14px;
    padding: 40px;
    text-align: center;
  }
  .fallback-icon { font-size: 48px; }
  .fallback-title { font-size: 18px; font-weight: 600; color: var(--fg-1); margin: 0; }
  .fallback-sub { font-size: 13px; color: var(--fg-3); line-height: 1.6; max-width: 420px; margin: 0; }
</style>
