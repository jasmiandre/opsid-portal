<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    variant?: 'primary' | 'ghost' | 'soft' | 'danger';
    size?: 'sm' | 'md';
    href?: string;
    type?: 'button' | 'submit';
    disabled?: boolean;
    onclick?: (e: MouseEvent) => void;
    children: Snippet;
  }

  let {
    variant = 'primary',
    size = 'md',
    href,
    type = 'button',
    disabled = false,
    onclick,
    children
  }: Props = $props();
</script>

{#if href}
  <a class="btn btn-{variant} btn-{size}" {href}>{@render children()}</a>
{:else}
  <button class="btn btn-{variant} btn-{size}" {type} {disabled} {onclick}>
    {@render children()}
  </button>
{/if}

<!-- styling lives in app.css under .btn / .btn-primary / etc. -->
