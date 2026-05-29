<script lang="ts">
  import Icon from './Icon.svelte';
  import type { AppKey } from '../types';

  interface Props {
    app: AppKey;
    size?: number;
  }
  let { app, size = 44 }: Props = $props();

  const ICON_MAP = { mail: 'mail', cloud: 'cloud', erp: 'erp', auth: 'key' } as const;
  const TINT = {
    mail:  'linear-gradient(160deg,#1B3A6E,#0E1F44)',
    cloud: 'linear-gradient(160deg,#1B5B3A,#0E3A26)',
    erp:   'linear-gradient(160deg,#6E4A1B,#3A270E)',
    auth:  'linear-gradient(160deg,#5A3A6E,#2E1E3A)'
  };
</script>

<div class="tile" style:--size="{size}px" style:background={TINT[app]}>
  <Icon name={ICON_MAP[app]} size={Math.round(size * 0.5)} />
</div>

<style>
  .tile {
    width: var(--size);
    height: var(--size);
    border-radius: calc(var(--size) * 0.25);
    display: grid;
    place-items: center;
    color: #ECEEF2;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.08);
    flex-shrink: 0;
  }
</style>
