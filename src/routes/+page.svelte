<script lang="ts">
  import { onMount } from 'svelte';
  import { auth } from '$lib/auth.svelte';
  import { ui }   from '$lib/ui.svelte';
  import { theme } from '$lib/theme.svelte';
  import Sidebar          from '$lib/components/Sidebar.svelte';
  import AppViewer        from '$lib/components/AppViewer.svelte';
  import ProfileModal     from '$lib/components/ProfileModal.svelte';
  import Landing          from '$lib/sections/Landing.svelte';
  import Dashboard        from '$lib/sections/Dashboard.svelte';
  import AdminUsers       from '$lib/sections/admin/AdminUsers.svelte';
  import AppsSection      from '$lib/sections/AppsSection.svelte';
  import DriveSection     from '$lib/sections/DriveSection.svelte';
  import MailSection      from '$lib/sections/MailSection.svelte';
  import CalendarSection  from '$lib/sections/CalendarSection.svelte';
  import ActivitySection  from '$lib/sections/ActivitySection.svelte';
  import TasksSection     from '$lib/sections/TasksSection.svelte';
  import type { Scene } from '$lib/types';
  import { page } from '$app/state';

  let scene: Scene = $state('landing');
  let branding = $derived((page.data as any)?.branding ?? { tenant_name: 'OPSID', logo_url: '' });

  onMount(async () => {
    theme.init();
    await auth.init();
    if (auth.authenticated) {
      scene = 'dashboard';
    } else if ((page.data as any).isTenantDomain) {
      // Tenant workspace domains must never show the public landing page.
      // Redirect unauthenticated users straight to Keycloak SSO login.
      auth.login();
      // scene stays 'landing' briefly while redirect is in-flight — the
      // boot spinner covers it, so no flash of marketing content.
    } else {
      scene = 'landing';
    }
  });

  // Allow components without onScene access (Dashboard, AppsSection) to trigger navigation
  $effect(() => {
    if (ui.pendingScene) {
      scene = ui.pendingScene as Scene;
      ui.pendingScene = null;
    }
  });
</script>

{#if auth.loading}
  <div class="boot">Memuat…</div>
{:else if scene === 'landing'}
  <Landing />
{:else}
  <div class="app-root">

    <!-- ── Mobile-only top bar ─────────────────────────────── -->
    <header class="mob-bar">
      <button class="mob-ham" onclick={() => ui.sidebarOpen = !ui.sidebarOpen} aria-label="Toggle menu">
        {#if ui.sidebarOpen}
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="20" height="20"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        {:else}
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="20" height="20"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
        {/if}
      </button>
      <div class="mob-brand">
        {#if branding.logo_url}
          <img src={branding.logo_url} alt={branding.tenant_name} style="height:26px;width:auto;display:block" />
        {:else}
          <img src="/brand/opsid-logo.png" alt={branding.tenant_name} style="height:26px;width:auto;display:block" />
        {/if}
        <span class="mob-brand-name">{branding.tenant_name}</span>
      </div>
      <div style="width:40px"></div>
    </header>

    <div class="shell">
      <!-- Overlay backdrop for mobile sidebar -->
      {#if ui.sidebarOpen}
        <div
          class="mob-overlay"
          onclick={() => ui.sidebarOpen = false}
          role="button"
          tabindex="-1"
          aria-label="Tutup menu"
          onkeydown={(e) => e.key === 'Escape' && (ui.sidebarOpen = false)}
        ></div>
      {/if}

      <Sidebar
        {scene}
        onScene={(s) => { scene = s; ui.sidebarOpen = false; }}
        onAdmin={() => { scene = 'admin'; ui.sidebarOpen = false; }}
      />
      <main>
        {#if ui.currentApp}
          <AppViewer />
        {:else if scene === 'dashboard'}
          <Dashboard />
        {:else if scene === 'admin'}
          <AdminUsers />
        {:else if scene === 'apps'}
          <AppsSection />
        {:else if scene === 'drive'}
          <DriveSection />
        {:else if scene === 'mail'}
          <MailSection />
        {:else if scene === 'calendar'}
          <CalendarSection />
        {:else if scene === 'activity'}
          <ActivitySection />
        {:else if scene === 'tasks'}
          <TasksSection />
        {/if}
      </main>
    </div>
  </div>

  <!-- Global profile/settings modal — always available regardless of scene -->
  <ProfileModal />
{/if}

<style>
  /* ── Desktop layout (unchanged) ─────────────────────── */
  .app-root { display:flex; flex-direction:column; height:100vh; overflow:hidden; }
  .shell { display:flex; flex:1; overflow:hidden; min-height:0; }
  main { flex:1; overflow:hidden; display:flex; flex-direction:column; min-width:0; }
  .boot { display:grid; place-items:center; height:100vh; color:var(--fg-3); }

  /* ── Mobile bar — hidden on desktop ─────────────────── */
  .mob-bar { display:none; flex-shrink:0; }
  .mob-overlay { display:none; }

  @media(max-width:768px) {
    .mob-bar {
      display:flex; align-items:center; justify-content:space-between;
      height:52px; padding:0 12px; flex-shrink:0;
      background:var(--bg-1); border-bottom:1px solid var(--bd-1);
      position:relative; z-index:50;
    }
    .mob-ham {
      width:40px; height:40px; display:flex; align-items:center; justify-content:center;
      border-radius:var(--r-md); color:var(--fg-2); background:none; border:none;
      cursor:pointer; transition:.12s; flex-shrink:0;
    }
    .mob-ham:hover { background:var(--bg-2); color:var(--fg-1); }
    .mob-brand { display:flex; align-items:center; gap:8px; }
    .mob-brand-name { font-size:14px; font-weight:700; color:var(--fg-1); letter-spacing:-.01em; }
    .mob-overlay {
      display:block; position:fixed; inset:0; z-index:99;
      background:rgba(8,9,11,.55); backdrop-filter:blur(2px);
    }
  }
</style>
