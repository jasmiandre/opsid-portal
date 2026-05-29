<script lang="ts">
  import { onMount } from 'svelte';
  import { auth } from '$lib/auth.svelte';
  import { ui }   from '$lib/ui.svelte';
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

  let scene: Scene = $state('landing');

  onMount(async () => {
    await auth.init();
    if (auth.authenticated) scene = 'dashboard';
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
  <div class="shell">
    <Sidebar
      {scene}
      onScene={(s) => { scene = s; }}
      onAdmin={() => { scene = 'admin'; }}
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

  <!-- Global profile/settings modal — always available regardless of scene -->
  <ProfileModal />
{/if}

<style>
  .shell { display:flex; height:100vh; overflow:hidden; }
  main { flex:1; overflow:hidden; display:flex; flex-direction:column; min-width:0; }
  .boot { display:grid; place-items:center; height:100vh; color:var(--fg-3); }
</style>
