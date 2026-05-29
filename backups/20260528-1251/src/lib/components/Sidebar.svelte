<script lang="ts">
  import { auth } from '../auth.svelte';
  import { ui } from '../ui.svelte';
  import { APP_URLS } from '../config';
  import type { Scene } from '../types';

  interface Props {
    scene: Scene;
    onScene: (s: Scene) => void;
    onAdmin: () => void;
  }
  let { scene, onScene, onAdmin }: Props = $props();

  const I = {
    grid:     `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>`,
    apps:     `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><rect x="3" y="3" width="6" height="6" rx="1"/><rect x="15" y="3" width="6" height="6" rx="1"/><rect x="3" y="15" width="6" height="6" rx="1"/><rect x="15" y="15" width="6" height="6" rx="1"/></svg>`,
    drive:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>`,
    mail:     `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>`,
    cal:      `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 9h18M8 3v4M16 3v4"/></svg>`,
    tasks:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>`,
    activity: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>`,
    shield:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/></svg>`,
    user:     `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>`,
    settings: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"/></svg>`,
    logout:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/></svg>`,
    erp:      `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><path d="M21 8 12 3 3 8v8l9 5 9-5z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>`,
  };

  let showAdmin = $derived(auth.profile.isAdmin || auth.profile.isTenantAdmin);

  // Determine active scene indicator (also when AppViewer is showing)
  function isActive(s: Scene) {
    if (ui.currentApp) return ui.currentApp.key === 'erp' && s === 'apps';
    return scene === s;
  }

  function navigate(s: Scene) {
    ui.closeApp();
    onScene(s);
  }
</script>

<aside class="sidebar">
  <!-- Brand -->
  <div class="sidebar-head">
    <div class="brand" onclick={() => navigate('dashboard')} role="button" tabindex="0" onkeydown={(e) => e.key==='Enter' && navigate('dashboard')}>
      <div class="brand-mark"></div>
      <div>
        <div class="brand-name">OPSID</div>
        <div class="brand-sub">Workspace</div>
      </div>
    </div>
  </div>

  <div class="sb-scroll">
    <!-- Workspace nav -->
    <div class="nav-group" style="margin-top:14px">
      <button class="nav-item" class:active={isActive('dashboard')} onclick={() => navigate('dashboard')}>
        {@html I.grid} Dashboard
      </button>
      <button class="nav-item" class:active={isActive('apps')} onclick={() => navigate('apps')}>
        {@html I.apps} Aplikasi
      </button>
    </div>

    <div class="nav-group">
      <div class="nav-label">Komunikasi</div>
      <button class="nav-item" class:active={isActive('mail')} onclick={() => navigate('mail')}>
        {@html I.mail} Mail
      </button>
      <button class="nav-item" class:active={isActive('calendar')} onclick={() => navigate('calendar')}>
        {@html I.cal} Kalender
      </button>
    </div>

    <div class="nav-group">
      <div class="nav-label">Kolaborasi</div>
      <button class="nav-item" class:active={isActive('drive')} onclick={() => navigate('drive')}>
        {@html I.drive} Drive
      </button>
      <button class="nav-item" class:active={!!ui.currentApp && ui.currentApp.key === 'erp'}
        onclick={() => ui.openApp('erp', APP_URLS.erp, 'Odoo ERP')}>
        {@html I.erp} Odoo ERP
      </button>
    </div>

    <div class="nav-group">
      <div class="nav-label">Pantauan</div>
      <button class="nav-item" class:active={isActive('activity')} onclick={() => navigate('activity')}>
        {@html I.activity} Aktivitas
      </button>
    </div>
  </div>

  <!-- Bottom: user info + actions -->
  <div class="sb-bot">
    <div class="nav-group" style="padding-top:12px;border-top:1px solid var(--bd-1)">
      {#if showAdmin}
        <button
          class="nav-item"
          class:active={scene === 'admin' && !ui.currentApp}
          onclick={() => { ui.closeApp(); onAdmin(); }}
          style="color:{scene === 'admin' && !ui.currentApp ? 'var(--pri)' : '#A78BFA'}"
        >
          {@html I.shield} Admin Console
        </button>
      {/if}
      <button class="nav-item" onclick={() => ui.openProfile('profil')}>
        {@html I.user} Profil Saya
      </button>
      <button class="nav-item" onclick={() => ui.openProfile('keamanan')}>
        {@html I.settings} Pengaturan
      </button>
      <button class="nav-item" onclick={() => auth.logout()} style="color:var(--danger)">
        {@html I.logout} Keluar
      </button>
    </div>

    <!-- User info strip -->
    <div class="user-strip">
      <div class="av">{auth.profile.initials}</div>
      <div class="user-strip-info">
        <div class="user-strip-name">{auth.profile.fullName}</div>
        <div class="user-strip-role">
          {auth.profile.isAdmin ? 'Superadmin' : auth.profile.isTenantAdmin ? 'Tenant Admin' : 'User'}
          {#if auth.profile.tenantName} · {auth.profile.tenantName}{/if}
        </div>
      </div>
    </div>
  </div>
</aside>

<style>
  .sidebar { display:flex; flex-direction:column; height:100vh; overflow:hidden; }
  .sidebar-head { flex-shrink:0; padding:16px 16px 0; }
  .sb-scroll { flex:1; overflow-y:auto; overflow-x:hidden; }
  .sb-scroll::-webkit-scrollbar { width:0; }
  .sb-bot { flex-shrink:0; padding-bottom:0; }

  .brand { display:flex; align-items:center; gap:10px; cursor:pointer; padding:8px; border-radius:var(--r-md); transition:.12s; user-select:none; }
  .brand:hover { background:var(--bg-2); }
  .brand-name { font-size:15px; font-weight:700; color:var(--fg-1); letter-spacing:-.01em; }
  .brand-sub { font-size:10px; color:var(--fg-4); letter-spacing:.03em; text-transform:uppercase; }

  .nav-item { width:100%; display:flex; align-items:center; gap:9px; padding:8px 14px; border-radius:var(--r-md); font-size:13px; font-weight:500; color:var(--fg-3); cursor:pointer; transition:.12s; background:none; border:none; font-family:inherit; text-align:left; }
  .nav-item:hover { background:var(--bg-2); color:var(--fg-1); }
  .nav-item.active { background:var(--bg-2); color:var(--fg-1); }

  .user-strip { display:flex; align-items:center; gap:10px; padding:12px 14px; border-top:1px solid var(--bd-1); margin-top:4px; }
  .user-strip-info { flex:1; min-width:0; }
  .user-strip-name { font-size:12px; font-weight:600; color:var(--fg-1); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .user-strip-role { font-size:10px; color:var(--fg-4); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
</style>
