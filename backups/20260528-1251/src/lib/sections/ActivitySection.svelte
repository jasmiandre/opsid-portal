<script lang="ts">
  import { auth } from '../auth.svelte';
  import { onMount } from 'svelte';

  const I = {
    refresh: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/><path d="M3 21v-5h5"/></svg>`,
    search:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><circle cx="11" cy="11" r="7"/><path d="m20 20-4.3-4.3"/></svg>`,
  };

  interface LogEntry {
    id: number;
    time: string;
    date: string;
    actor: string;
    action: string;
    target: string;
    type: string;
  }

  let logs    = $state<LogEntry[]>([]);
  let loading = $state(true);
  let error   = $state('');
  let search  = $state('');

  let filtered = $derived(
    search
      ? logs.filter(l => {
          const q = search.toLowerCase();
          return l.actor.toLowerCase().includes(q) ||
                 l.action.toLowerCase().includes(q) ||
                 l.target.toLowerCase().includes(q);
        })
      : logs
  );

  function actionColor(a: string) {
    if (a.includes('DELETE') || a.includes('SUSPEND')) return 'tag-danger';
    if (a.includes('IMPERSON') || a.includes('WARN') || a.includes('RESET')) return 'tag-warn';
    if (a.includes('CREATE') || a.includes('ADD') || a.includes('ACTIVATE')) return 'tag-ok';
    return 'tag-pri';
  }

  function initials(name: string) {
    return name.split(' ').slice(0,2).map(w => w[0]).join('').toUpperCase() || '??';
  }

  async function load() {
    loading = true; error = '';
    try {
      const res = await fetch('/api/activity');
      const d = await res.json();
      if (d.logs) logs = d.logs;
      else if (d.error) error = d.error;
    } catch { error = 'Gagal memuat aktivitas'; }
    loading = false;
  }

  onMount(load);
</script>

<div class="main-scroll">
  <header class="topbar">
    <div class="crumb"><strong>Aktivitas</strong></div>
    <div class="topbar-right">
      <div class="search-box">
        {@html I.search}
        <input placeholder="Cari aktivitas…" bind:value={search} />
      </div>
      <button class="btn btn-secondary btn-sm" onclick={load}>{@html I.refresh}</button>
    </div>
  </header>

  <div class="main-pad">
    <div class="page-head">
      <div>
        <h1 class="page-h1">Log Aktivitas</h1>
        <p class="page-sub">
          {#if auth.profile.isAdmin}Semua aktivitas sistem · Audit trail{:else}Aktivitas workspace · {auth.profile.tenantName || 'Organisasi Anda'}{/if}
        </p>
      </div>
    </div>

    <div class="panel">
      {#if loading}
        <div class="empty-state">Memuat aktivitas…</div>
      {:else if error}
        <div class="empty-state" style="color:var(--danger)">{error}</div>
      {:else if filtered.length === 0}
        <div class="empty-state">
          {search ? 'Tidak ada aktivitas yang cocok' : 'Belum ada aktivitas tercatat'}
        </div>
      {:else}
        <table class="log-table">
          <thead>
            <tr>
              <th>Waktu</th>
              <th>Aktor</th>
              <th>Aksi</th>
              <th>Target</th>
            </tr>
          </thead>
          <tbody>
            {#each filtered as l (l.id)}
              <tr>
                <td>
                  <div class="mono" style="font-size:12px">{l.time}</div>
                  <div style="font-size:10px;color:var(--fg-4)">{l.date}</div>
                </td>
                <td>
                  <div class="actor-cell">
                    <div class="av-xs">{initials(l.actor)}</div>
                    <span style="font-size:12px;color:var(--fg-2)">{l.actor}</span>
                  </div>
                </td>
                <td>
                  <span class="tag {actionColor(l.action)}" style="font-size:10px;font-family:monospace">
                    {l.action}
                  </span>
                </td>
                <td class="mono" style="font-size:12px;color:var(--fg-3)">{l.target}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      {/if}
    </div>
  </div>
</div>

<style>
  .main-scroll { flex:1; overflow-y:auto; display:flex; flex-direction:column; }
  .topbar { display:flex; align-items:center; justify-content:space-between; padding:0 28px; height:56px; border-bottom:1px solid var(--bd-1); background:color-mix(in srgb, var(--bg-0) 80%, transparent); backdrop-filter:blur(12px); flex-shrink:0; position:sticky; top:0; z-index:10; }
  .topbar-right { display:flex; gap:8px; align-items:center; }
  .crumb { font-size:14px; font-weight:600; color:var(--fg-1); }
  .main-pad { padding:28px; display:flex; flex-direction:column; gap:18px; max-width:1200px; width:100%; }
  .page-head { display:flex; justify-content:space-between; align-items:flex-start; }
  .page-h1 { font-size:24px; font-weight:700; color:var(--fg-1); margin:0; }
  .page-sub { font-size:13px; color:var(--fg-3); margin-top:4px; }

  .search-box { display:flex; align-items:center; gap:8px; padding:7px 12px; background:var(--bg-2); border:1px solid var(--bd-1); border-radius:var(--r-md); width:200px; }
  .search-box input { flex:1; background:none; border:none; padding:0; color:var(--fg-1); font-size:12px; outline:none; font-family:inherit; }
  .search-box input::placeholder { color:var(--fg-4); }

  .log-table { width:100%; border-collapse:collapse; }
  .log-table th { padding:10px 20px; text-align:left; font-size:10px; font-weight:700; color:var(--fg-4); letter-spacing:1px; text-transform:uppercase; border-bottom:1px solid var(--bd-1); background:var(--bg-2); }
  .log-table td { padding:12px 20px; border-bottom:1px solid color-mix(in srgb, var(--bd-1) 60%, transparent); vertical-align:middle; }
  .log-table tr:last-child td { border-bottom:none; }
  .log-table tbody tr:hover td { background:var(--bg-2); }

  .actor-cell { display:flex; align-items:center; gap:8px; }
  .av-xs { width:26px; height:26px; border-radius:50%; background:var(--bg-3); color:var(--fg-2); font-size:10px; font-weight:700; display:grid; place-items:center; flex-shrink:0; }
  .empty-state { padding:48px; text-align:center; color:var(--fg-3); font-size:13px; }
</style>
