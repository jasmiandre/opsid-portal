<script lang="ts">
  import { theme } from '../theme.svelte';
</script>

<button
  class="theme-toggle"
  onclick={() => theme.toggle()}
  aria-label={theme.isDark ? 'Ganti ke tema terang' : 'Ganti ke tema gelap'}
  title={theme.isDark ? 'Tema terang' : 'Tema gelap'}
>
  <!-- Sun icon -->
  <span class="ti-icon" class:ti-active={theme.isLight}>
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
         stroke-linecap="round" stroke-linejoin="round" width="14" height="14">
      <circle cx="12" cy="12" r="4"/>
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>
    </svg>
  </span>
  <!-- Moon icon -->
  <span class="ti-icon" class:ti-active={theme.isDark}>
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
         stroke-linecap="round" stroke-linejoin="round" width="14" height="14">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
    </svg>
  </span>
</button>

<style>
  .theme-toggle {
    display: flex;
    align-items: center;
    gap: 2px;
    background: var(--bg-2);
    border: 1px solid var(--bd-1);
    border-radius: 999px;
    padding: 3px;
    cursor: pointer;
    transition: border-color .15s;
    flex-shrink: 0;
  }
  .theme-toggle:hover { border-color: var(--bd-2); }

  .ti-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 26px;
    height: 26px;
    border-radius: 999px;
    color: var(--fg-4);
    transition: background .2s, color .2s;
  }
  .ti-icon.ti-active {
    background: var(--bg-0);
    color: var(--fg-1);
    box-shadow: 0 1px 3px rgba(0,0,0,.25);
  }
  :global([data-theme="light"]) .ti-icon.ti-active {
    background: #fff;
    box-shadow: 0 1px 4px rgba(0,0,0,.15);
  }
</style>
