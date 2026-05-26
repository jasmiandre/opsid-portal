<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    label: string;
    hint?: string;
    error?: string;
    children: Snippet;
  }
  let { label, hint, error, children }: Props = $props();
</script>

<label class="field">
  <span class="field-label">{label}</span>
  {@render children()}
  {#if error}
    <span class="field-error">{error}</span>
  {:else if hint}
    <span class="field-hint">{hint}</span>
  {/if}
</label>
