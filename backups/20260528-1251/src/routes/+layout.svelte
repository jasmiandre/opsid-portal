<script lang="ts">
  import '../app.css';

  let { children, data } = $props();
</script>

<div style="--pri:{data?.branding?.primary_color ?? '#5B86FF'};--pri-soft:color-mix(in srgb,{data?.branding?.primary_color ?? '#5B86FF'} 12%,transparent)">
  {@render children()}
</div>

<style>
  div { display:contents; }
</style>
