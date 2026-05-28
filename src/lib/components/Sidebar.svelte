<script lang="ts">
  import { auth } from '../auth.svelte';
  import { ui } from '../ui.svelte';
  import { APP_URLS } from '../config';
  import type { Scene } from '../types';

  interface Props {
    scene: Scene;
    onAdmin: () => void;
    onDashboard: () => void;
  }
  let { scene, onAdmin, onDashboard }: Props = $props();

  const I = {
    grid:     `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>`,
    mail:     `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>`,
    cloud:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><path d="M17.5 19a4.5 4.5 0 1 0-1.4-8.78A6 6 0 1 0 6 14h11.5"/></svg>`,
    box:      `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><path d="M21 8 12 3 3 8v8l9 5 9-5z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>`,
    shield:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/></svg>`,
    settings: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"/></svg>`,
    logout:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/></svg>`,
    user:     `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>`,
  };

  const apps = [
    { key: 'mail',  label: 'SOGo Mail', icon: 'mail',  url: APP_URLS.mail  },
    { key: 'cloud', label: 'Nextcloud', icon: 'cloud', url: APP_URLS.cloud },
    { key: 'erp',   label: 'Odoo ERP',  icon: 'box',   url: APP_URLS.erp   },
  ] as const;

  let showAdmin = $derived(auth.profile.isAdmin || auth.profile.isTenantAdmin);
</script>

<aside class="sidebar">
  <!-- TOP: Brand + Nav -->
  <div class="sb-top">
    <div class="sidebar-head">
      <div class="brand">
        <div class="brand-mark"></div>
        <div>
          <div class="brand-name">OPSID</div>
          <div class="brand-sub">{scene === 'admin' ? 'Admin Console' : 'Workspace'}</div>
        </div>
      </div>
    </div>

    <div class="nav-group" style="margin-top:18px">
      <button class="nav-item" aria-current={scene === 'dashboard' ? 'page' : undefined} onclick={() => { ui.closeApp(); onDashboard(); }}>
        {@html I.grid} Dashboard
      </button>
    </div>

    <div class="nav-group">
      <div class="nav-label">Aplikasi Workspace</div>
      {#each apps as a (a.key)}
        <button
          class="nav-item app-nav-btn"
          aria-current={ui.currentApp?.key === a.key ? 'page' : undefined}
          onclick={() => ui.openApp(a.key, a.url, a.label)}
          title="Buka {a.label} dalam workspace"
        >
          <span class="tile tile-sm tile-{a.key === 'mail' ? 'mail' : a.key === 'cloud' ? 'cloud' : 'erp'}" style="width:24px;height:24px;border-radius:6px">
            {@html (I as any)[a.icon]}
          </span>
          {a.label}
        </button>
      {/each}
    </div>
  </div>

  <!-- BOTTOM: Sistem + User -->
  <div class="sb-bot">
    <div class="nav-group" style="margin-top:0;padding-top:14px;border-top:1px solid var(--bd-1)">
      <div class="nav-label">Sistem</div>
      {#if showAdmin}
        <button
          class="nav-item"
          aria-current={scene === 'admin' && !ui.currentApp ? 'page' : undefined}
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
  </div>
</aside>

<style>
  .sb-top { flex:1; overflow-y:auto; min-height:0; }
  .sb-top::-webkit-scrollbar { width:0; }
  .sb-bot { flex-shrink:0; }

  .app-nav-btn { position:relative; }
</style>
