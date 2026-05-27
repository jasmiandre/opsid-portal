<script lang="ts">
  import { auth } from '../auth.svelte';
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
    arrowUR:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" width="11" height="11"><path d="M7 17 17 7"/><path d="M8 7h9v9"/></svg>`,
  };

  const apps = [
    { key:'mail',  label:'SOGo Mail', icon:'mail',  tile:'mail',  url: APP_URLS.mail  },
    { key:'cloud', label:'Nextcloud', icon:'cloud', tile:'cloud', url: APP_URLS.cloud },
    { key:'erp',   label:'Odoo ERP',  icon:'box',   tile:'erp',   url: APP_URLS.erp   },
  ] as const;

  // Show Admin Console only for admins
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
      <button class="nav-item" aria-current={scene === 'dashboard'} onclick={onDashboard}>
        {@html I.grid} Dashboard
      </button>
    </div>

    <div class="nav-group">
      <div class="nav-label">Aplikasi</div>
      {#each apps as a (a.key)}
        <a class="nav-item" href={a.url} target="_blank" rel="noopener">
          <span class="tile tile-sm tile-{a.tile}" style="width:24px;height:24px;border-radius:6px">
            {@html (I as any)[a.icon]}
          </span>
          {a.label}
          <span class="ext">{@html I.arrowUR}</span>
        </a>
      {/each}
    </div>
  </div>

  <!-- BOTTOM: Sistem + User -->
  <div class="sb-bot">
    <div class="nav-group" style="margin-top:0;padding-top:14px;border-top:1px solid var(--bd-1)">
      <div class="nav-label">Sistem</div>
      {#if showAdmin}
        <button class="nav-item" aria-current={scene === 'admin'} onclick={onAdmin} style="color:{scene === 'admin' ? 'var(--pri)' : '#A78BFA'}">
          {@html I.shield} Admin Console
        </button>
      {/if}
      <button class="nav-item">
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
  .user-card {
    display:flex; align-items:center; gap:10px;
    padding:12px 10px; margin-top:8px;
    border-top:1px solid var(--bd-1); border-radius:var(--r-md);
    cursor:pointer; transition:background .15s;
  }
  .user-card:hover { background:var(--bg-2); }
  .user-info { flex:1; min-width:0; }
  .user-name { font-size:12px; font-weight:600; color:var(--fg-1); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .user-email { font-size:10px; color:var(--fg-4); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .ext { margin-left:auto; color:var(--fg-4); opacity:0; transition:opacity .12s; }
  .nav-item:hover .ext { opacity:1; }
</style>
