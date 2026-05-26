<script lang="ts">
  interface Props {
    initials: string;
    size?: number;
  }
  let { initials, size = 36 }: Props = $props();
</script>

<div
  class="avatar"
  style:--size="{size}px"
  style:--font-size="{Math.round(size * 0.4)}px"
>
  {initials}
</div>

<style>
  .avatar {
    width: var(--size);
    height: var(--size);
    border-radius: 50%;
    display: grid;
    place-items: center;
    background: linear-gradient(135deg, oklch(0.55 0.18 270), oklch(0.45 0.2 290));
    color: #fff;
    font-weight: 600;
    font-size: var(--font-size);
    letter-spacing: 0.02em;
    flex-shrink: 0;
  }
</style>
