<script lang="ts">
  import { ui } from '../ui.svelte';
  import { APP_URLS } from '../config';

  const apps = [
    {
      key: 'erp', name: 'Odoo ERP', desc: 'CRM, inventory, akuntansi, HR, POS',
      url: APP_URLS.erp, icon: '📦', color: '#714B67', embeddable: true,
      status: 'active', label: 'ERP',
    },
    {
      key: 'mail', name: 'SOGo Mail', desc: 'Email, kalender, dan kontak terpusat',
      url: APP_URLS.mail, icon: '✉️', color: '#3B7FC4', embeddable: false,
      status: 'active', label: 'Email',
    },
    {
      key: 'cloud', name: 'Nextcloud', desc: 'File storage, kolaborasi dokumen',
      url: APP_URLS.cloud, icon: '☁️', color: '#0082C9', embeddable: false,
      status: 'active', label: 'Drive',
    },
    {
      key: 'auth', name: 'Keycloak SSO', desc: 'Identity & access management',
      url: APP_URLS.auth, icon: '🔑', color: '#4D4D4D', embeddable: true,
      status: 'active', label: 'SSO',
    },
  ];

  function openApp(app: typeof apps[0]) {
    ui.openApp(app.key, app.url, app.name);
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
              <span class="dot dot-ok dot-pulse"></span>
              <span class="status-label">Aktif</span>
            </div>
          </div>
          <div class="app-card-body">
            <div class="app-name">{app.name}</div>
            <div class="app-label-badge" style="background:color-mix(in srgb, {app.color} 15%, transparent);color:{app.color}">{app.label}</div>
            <div class="app-desc">{app.desc}</div>
            {#if !app.embeddable}
              <div class="embed-note">⚠️ Dibuka di tab baru</div>
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
  .status-label { font-size:11px; color:var(--ok); }

  .app-card-body { flex:1; display:flex; flex-direction:column; gap:6px; }
  .app-name { font-size:16px; font-weight:600; color:var(--fg-1); }
  .app-label-badge { display:inline-block; padding:2px 8px; border-radius:4px; font-size:10px; font-weight:700; letter-spacing:.06em; text-transform:uppercase; align-self:flex-start; }
  .app-desc { font-size:12px; color:var(--fg-3); line-height:1.6; }
  .embed-note { font-size:11px; color:var(--warn); margin-top:2px; }

  .app-open-btn { width:100%; justify-content:center; }
</style>
