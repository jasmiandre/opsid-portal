<script lang="ts">
  import ThemeToggle from '../components/ThemeToggle.svelte';
  import { auth } from '../auth.svelte';
  import { APP_URLS } from '../config';
  import { onMount } from 'svelte';

  const I = {
    arrowUR: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" width="11" height="11"><path d="M7 17 17 7"/><path d="M8 7h9v9"/></svg>`,
    refresh: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/><path d="M3 21v-5h5"/></svg>`,
    check:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><polyline points="20 6 9 17 4 12"/></svg>`,
    clock:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
  };

  interface Task {
    id: number;
    name: string;
    projectName: string;
    state: string;
    dateDeadline: string | null;
    priority: string;
  }

  let tasks   = $state<Task[]>([]);
  let loading = $state(true);
  let error   = $state('');

  function stateLabel(s: string) {
    const map: Record<string, string> = {
      'in_progress': 'Sedang Dikerjakan',
      'done': 'Selesai',
      'blocked': 'Terblokir',
      'normal': 'Normal',
    };
    return map[s] ?? s;
  }

  function stateClass(s: string) {
    if (s === 'done') return 'tag-ok';
    if (s === 'blocked') return 'tag-danger';
    if (s === 'in_progress') return 'tag-pri';
    return 'tag-neutral';
  }

  function deadlineColor(d: string | null) {
    if (!d) return 'var(--fg-4)';
    const deadline = new Date(d);
    const now = new Date();
    const diff = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    if (diff < 0) return 'var(--danger)';
    if (diff < 3) return 'var(--warn)';
    return 'var(--fg-3)';
  }

  async function load() {
    loading = true; error = '';
    try {
      const res = await fetch(`/api/odoo/tasks?user=${encodeURIComponent(auth.profile.username)}`);
      const d = await res.json();
      if (d.ok) tasks = d.tasks ?? [];
      else error = d.error ?? 'Gagal memuat tugas';
    } catch { error = 'Koneksi ke Odoo gagal'; }
    loading = false;
  }

  onMount(load);
</script>

<div class="main-scroll">
  <header class="topbar">
    <div class="crumb"><strong>Tugas</strong></div>
    <div class="topbar-right">
      <button class="btn btn-secondary btn-sm" onclick={load}>{@html I.refresh}</button>
      <a class="btn btn-secondary btn-sm" href={APP_URLS.erp} target="_blank" rel="noopener">
        Buka Odoo {@html I.arrowUR}
      </a>
    </div>
  </header>

  <div class="main-pad">
    <div class="page-head">
      <div>
        <h1 class="page-h1">Tugas Saya</h1>
        <p class="page-sub">Task yang di-assign ke Anda dari Odoo Project</p>
      </div>
    </div>

    <div class="notice-card">
      <div class="notice-icon">📋</div>
      <div>
        <div class="notice-title">Tugas dari Odoo Project</div>
        <div class="notice-sub">
          Daftar tugas disinkronisasi dari Odoo. Untuk membuat atau mengedit tugas, gunakan Odoo secara langsung.
        </div>
        <a class="btn btn-primary btn-sm" href={APP_URLS.erp} target="_blank" rel="noopener" style="margin-top:10px;display:inline-flex">
          Buka Odoo Project {@html I.arrowUR}
        </a>
      </div>
    </div>

    <div class="panel">
      <div class="panel-head">
        <span class="panel-title">Daftar Tugas</span>
        <span style="font-size:11px;color:var(--fg-4)">{tasks.length} tugas</span>
      </div>
      {#if loading}
        <div class="empty-state">Memuat tugas dari Odoo…</div>
      {:else if error}
        <div class="empty-state" style="color:var(--danger)">{error}</div>
      {:else if tasks.length === 0}
        <div class="empty-state">Tidak ada tugas yang di-assign ke Anda</div>
      {:else}
        <div class="task-list">
          {#each tasks as t (t.id)}
            <div class="task-row">
              <div class="task-main">
                <div class="task-name">{t.name}</div>
                <div class="task-meta">{t.projectName}</div>
              </div>
              <div class="task-right">
                {#if t.dateDeadline}
                  <span class="task-deadline" style="color:{deadlineColor(t.dateDeadline)}">
                    {@html I.clock}
                    {new Date(t.dateDeadline).toLocaleDateString('id-ID', { day:'numeric', month:'short' })}
                  </span>
                {/if}
                <span class="tag {stateClass(t.state)}" style="font-size:10px">{stateLabel(t.state)}</span>
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </div>
  </div>
</div>

<style>
  .main-scroll { flex:1; overflow-y:auto; display:flex; flex-direction:column; }
  .topbar { display:flex; align-items:center; justify-content:space-between; padding:0 28px; height:56px; border-bottom:1px solid var(--bd-1); background:color-mix(in srgb, var(--bg-0) 80%, transparent); backdrop-filter:blur(12px); flex-shrink:0; position:sticky; top:0; z-index:10; }
  .topbar-right { display:flex; gap:8px; }
  .crumb { font-size:14px; font-weight:600; color:var(--fg-1); }
  .main-pad { padding:28px; display:flex; flex-direction:column; gap:18px; max-width:900px; width:100%; }
  .page-head { display:flex; justify-content:space-between; align-items:flex-start; }
  .page-h1 { font-size:24px; font-weight:700; color:var(--fg-1); margin:0; }
  .page-sub { font-size:13px; color:var(--fg-3); margin-top:4px; }

  .notice-card { display:flex; align-items:flex-start; gap:16px; padding:20px; background:color-mix(in srgb, var(--ok) 8%, var(--bg-1)); border:1px solid color-mix(in srgb, var(--ok) 20%, transparent); border-radius:var(--r-lg); }
  .notice-icon { font-size:32px; flex-shrink:0; }
  .notice-title { font-size:14px; font-weight:600; color:var(--fg-1); }
  .notice-sub { font-size:12px; color:var(--fg-3); line-height:1.7; margin-top:4px; }

  .panel-head { padding:14px 20px; border-bottom:1px solid var(--bd-1); display:flex; align-items:center; justify-content:space-between; }
  .panel-title { font-size:12px; font-weight:700; color:var(--fg-3); text-transform:uppercase; letter-spacing:.06em; }

  .task-list { }
  .task-row { display:flex; align-items:center; gap:12px; padding:14px 20px; border-bottom:1px solid var(--bd-1); }
  .task-row:last-child { border-bottom:none; }
  .task-row:hover { background:var(--bg-2); }
  .task-main { flex:1; min-width:0; }
  .task-name { font-size:13px; font-weight:500; color:var(--fg-1); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .task-meta { font-size:11px; color:var(--fg-4); margin-top:2px; }
  .task-right { display:flex; align-items:center; gap:10px; flex-shrink:0; }
  .task-deadline { display:flex; align-items:center; gap:4px; font-size:11px; }
  .empty-state { padding:40px; text-align:center; color:var(--fg-3); font-size:13px; }
</style>
