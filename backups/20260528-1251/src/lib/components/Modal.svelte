<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    open: boolean;
    title: string;
    onClose: () => void;
    body: Snippet;
    footer?: Snippet;
  }
  let { open, title, onClose, body, footer }: Props = $props();

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') onClose();
  }
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
  <div class="modal-backdrop" role="dialog" aria-modal="true" aria-label={title} onclick={onClose}>
    <div class="modal" onclick={(e) => e.stopPropagation()}>
      <header class="modal-head">
        <h3>{title}</h3>
        <button class="modal-close" onclick={onClose} aria-label="Tutup">×</button>
      </header>
      <div class="modal-body">{@render body()}</div>
      {#if footer}
        <footer class="modal-foot">{@render footer()}</footer>
      {/if}
    </div>
  </div>
{/if}
