<script lang="ts">
  import '../app.css';

  let { children, data } = $props();

  const pri      = $derived(data?.branding?.primary_color ?? '#5B86FF');
  const logoUrl  = $derived(data?.branding?.logo_url ?? '');
  const siteName = $derived(data?.branding?.tenant_name ?? 'OPSID');
</script>

<svelte:head>
  <title>{siteName} Portal</title>
  {#if logoUrl}
    <link rel="icon" type="image/png" href={logoUrl} />
  {/if}
  <meta name="theme-color" content={pri} />
</svelte:head>

<div style="--pri:{pri};--pri-soft:color-mix(in srgb,{pri} 12%,transparent)">
  {@render children()}
</div>

<style>
  div { display:contents; }
</style>
