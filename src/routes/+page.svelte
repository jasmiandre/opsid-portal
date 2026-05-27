<script lang="ts">
  import { onMount } from 'svelte';
  import { auth } from '$lib/auth.svelte';
  import Sidebar  from '$lib/components/Sidebar.svelte';
  import Landing  from '$lib/sections/Landing.svelte';
  import Dashboard from '$lib/sections/Dashboard.svelte';
  import AdminUsers from '$lib/sections/admin/AdminUsers.svelte';
  import type { Scene, DashTab, AdminTab } from '$lib/types';

  let scene: Scene      = $state('landing');
  let dashTab: DashTab  = $state('dashboard');
  let adminTab: AdminTab = $state('users');

  onMount(async () => {
    await auth.init();
    if (auth.authenticated) scene = 'dashboard';
  });
</script>

{#if auth.loading}
  <div class="boot">Memuat OPSID…</div>
{:else if scene === 'landing'}
  <Landing />
{:else}
  <div class="shell">
    <Sidebar
      onDashboard={() => (scene = 'dashboard')}
      {scene}
      
      
      onAdmin={() => (scene = 'admin')}
    />
    <main >
      {#if scene === 'dashboard'}
        <Dashboard />
      {:else if scene === 'admin'}
        <!-- AdminShell would route between Users/Tenants/Health tabs -->
        <AdminUsers />
      {/if}
    </main>
  </div>
{/if}

<style>
  .shell { display:flex; height:100vh; overflow:hidden; }
  main { flex:1; overflow:hidden; display:flex; flex-direction:column; min-width:0; }
  .boot { display:grid; place-items:center; height:100vh; color:var(--fg-3); }
</style>