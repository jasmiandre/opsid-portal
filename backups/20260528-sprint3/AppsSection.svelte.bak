<script lang="ts">
  import { ui } from '../ui.svelte';
  import { auth } from '../auth.svelte';
  import { APP_URLS } from '../config';

  // App cards — mail/cloud route to internal OPSID scenes, erp uses AppViewer (iframe).
  // Keycloak is only shown to admins (it's an internal admin tool, not a user workspace app).
  const allApps = [
    {
      key: 'erp', name: 'Odoo ERP', desc: 'CRM, inventory, akuntansi, HR, POS',
      icon: '📦', color: '#714B67',
      action: 'app',   // opens in AppViewer iframe
      adminOnly: false,
    },
    {
      key: 'mail', name: 'SOGo Mail', desc: 'Email, kalender, dan kontak terpusat',
      icon: '✉️', color: '#3B7FC4',
      action: 'scene', // navigates to 'mail' scene
      adminOnly: false,
    },
    {
      key: 'cloud', name: 'Nextcloud', desc: 'File storage, kolaborasi dokumen',
      icon: '☁️', color: '#0082C9',
      action: 'scene', // navigates to 'drive' scene
      adminOnly: false,
    },
    {
      key: 'auth', name: 'Keycloak SSO', desc: 'Identity & access management — admin only',
      icon: '🔑', color: '#4D4D4D',
      action: 'external', // opens in new tab
      adminOnly: true,
    },
  ];

  let apps = $derived(allApps.filter(a => !a.adminOnly || auth.profile.isAdmin || auth.profile.isTenantAdmin));

  function openApp(app: typeof allApps[0]) {
    if (app.action === 'scene') {
      // Navigate to internal OPSID scene (Mail → MailSection, cloud → DriveSection)
      const scene = app.key === 'mail' ? 'mail' : app.key === 'cloud' ? 'drive' : app.key;
      ui.navigateTo(scene);
    } else if (app.action === 'app') {
      // Open in AppViewer iframe
      ui.openApp(app.key, APP_URLS.erp, app.name);
    } else {
      // External tab
      window.open(APP_URLS[app.key as keyof typeof APP_URLS] ?? '#', '_blank', 'noopener');
    }
  }
</script>

<div class="main-scroll">
  <header class="topbar">
    <div class="crumb"><strong>Aplikasi</strong></div>
  </header>
  <div class="main-pad">
    <div class="page-head">
      <div>
        <h1 class="page-h1">Aplikasi Workspace</h1>
        <p class="page-sub">Semua aplikasi yang terhubung dengan akun OPSID Anda</p>
      </div>
    </div>

    <div class="apps-grid">
      {#each apps as app (app.key)}
        <div class="app-card">
          <div class="app-card-head">
            <div class="app-icon" style="background:color-mix(in srgb, {app.color} 15%, transparent);border-color:color-mix(in srgb, {app.color} 30%, transparent)">
              <span>{app.icon}</span>
            </div>
            <div class="app-status">
              <span class="dot-pulse" style="background:{app.color}"></span>
              <span class="status-label">Aktif</span>
            </div>
          </div>
          <div class="app-card-body">
            <div class="app-name">{app.name}</div>
            <div class="app-desc">{app.desc}</div>
            {#if app.action === 'external'}
              <div class="embed-note">↗ Dibuka di tab baru</div>
            {:else if app.action === 'scene'}
              <div class="embed-note" style="color:var(--ok)">✓ Tampil di dalam OPSID</div>
            {:else}
              <div class="embed-note" style="color:var(--ok)">✓ Embed di dalam OPSID</div>
            {/if}
          </div>
          <div class="app-card-foot">
            <button
              class="btn btn-primary btn-sm app-open-btn"
              style="background:{app.color};border-color:{app.color}"
              onclick={() => openApp(app)}
            >
              Buka {app.name}
            </button>
          </div>
        </div>
      {/each}
    </div>
  </div>
</div>

<style>
  .main-scroll { flex:1; overflow-y:auto; display:flex; flex-direction:column; }
  .topbar { display:flex; align-items:center; padding:0 28px; height:56px; border-bottom:1px solid var(--bd-1); background:color-mix(in srgb, var(--bg-0) 80%, transparent); backdrop-filter:blur(12px); flex-shrink:0; position:sticky; top:0; z-index:10; }
  .crumb { font-size:14px; font-weight:600; color:var(--fg-1); }
  .main-pad { padding:28px; display:flex; flex-direction:column; gap:22px; max-width:1200px; width:100%; }
  .page-head { display:flex; align-items:flex-start; justify-content:space-between; gap:16px; }
  .page-h1 { font-size:24px; font-weight:700; color:var(--fg-1); margin:0; }
  .page-sub { font-size:13px; color:var(--fg-3); margin-top:4px; }

  .apps-grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(260px, 1fr)); gap:16px; }
  .app-card { background:var(--bg-1); border:1px solid var(--bd-1); border-radius:var(--r-lg); padding:20px; display:flex; flex-direction:column; gap:14px; transition:all .2s; }
  .app-card:hover { border-color:var(--bd-2); transform:translateY(-2px); box-shadow:0 8px 24px -8px rgba(0,0,0,.3); }

  .app-card-head { display:flex; align-items:center; justify-content:space-between; }
  .app-icon { width:52px; height:52px; border-radius:14px; display:grid; place-items:center; border:1px solid; font-size:26px; }
  .app-status { display:flex; align-items:center; gap:5px; }
  .dot-pulse { width:8px; height:8px; border-radius:50%; animation:pulse 2s ease-in-out infinite; }
  @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }
  .status-label { font-size:11px; color:var(--ok); }

  .app-card-body { flex:1; display:flex; flex-direction:column; gap:6px; }
  .app-name { font-size:16px; font-weight:600; color:var(--fg-1); }
  .app-desc { font-size:12px; color:var(--fg-3); line-height:1.6; }
  .embed-note { font-size:11px; color:var(--warn); margin-top:2px; }

  .app-card-foot { }
  .app-open-btn { width:100%; justify-content:center; }
</style>
