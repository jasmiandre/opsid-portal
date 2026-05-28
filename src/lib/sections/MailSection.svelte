<script lang="ts">
  import { auth } from '../auth.svelte';
  import { APP_URLS } from '../config';
  import { onMount } from 'svelte';

  const I = {
    arrowUR: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" width="11" height="11"><path d="M7 17 17 7"/><path d="M8 7h9v9"/></svg>`,
    refresh: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/><path d="M3 21v-5h5"/></svg>`,
    compose: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5Z"/></svg>`,
  };

  interface Message { from: string; subj: string; time: string; unread: boolean; }

  let inboxData = $state({ unseen: 0, total: 0, ok: false });
  let messages  = $state<Message[]>([]);
  let loading   = $state(true);
  let error     = $state('');

  async function load() {
    loading = true; error = '';
    const username = auth.profile.username;
    try {
      const res = await fetch(`/api/sogo/inbox?user=${encodeURIComponent(username)}`);
      const d = await res.json();
      inboxData = d;
      messages = d.messages ?? [];
    } catch { error = 'Gagal memuat email'; }
    loading = false;
  }

  onMount(load);
</script>

<div class="main-scroll">
  <header class="topbar">
    <div class="crumb"><strong>Mail</strong></div>
    <div class="topbar-right">
      <button class="btn btn-secondary btn-sm" onclick={load}>{@html I.refresh}</button>
      <a class="btn btn-primary btn-sm" href="{APP_URLS.mail}/compose" target="_blank" rel="noopener">
        {@html I.compose} Tulis Email
      </a>
      <a class="btn btn-secondary btn-sm" href={APP_URLS.mail} target="_blank" rel="noopener">
        Buka SOGo {@html I.arrowUR}
      </a>
    </div>
  </header>

  <div class="main-pad">
    <div class="page-head">
      <div>
        <h1 class="page-h1">Inbox</h1>
        <p class="page-sub">
          {#if inboxData.ok}
            {inboxData.unseen} belum dibaca · {inboxData.total} total
          {:else if loading}
            Memuat…
          {:else}
            Terhubung ke mail.opsid.web.id
          {/if}
        </p>
      </div>
    </div>

    <div class="notice-card">
      <div class="notice-icon">✉️</div>
      <div>
        <div class="notice-title">Email dikelola oleh SOGo Mail</div>
        <div class="notice-sub">
          Inbox, kalender, dan kontak lengkap tersedia di SOGo. OPSID tidak dapat menampilkan SOGo dalam mode embedded karena kebijakan keamanan.
        </div>
        <a class="btn btn-primary btn-sm" href={APP_URLS.mail} target="_blank" rel="noopener" style="margin-top:10px;display:inline-flex">
          Buka SOGo Webmail {@html I.arrowUR}
        </a>
      </div>
    </div>

    <div class="panel">
      <div class="panel-head">
        <span class="panel-title">Email Terbaru</span>
        <button class="btn btn-ghost btn-sm" onclick={load}>{@html I.refresh}</button>
      </div>
      {#if loading}
        <div class="empty-state">Memuat email…</div>
      {:else if error}
        <div class="empty-state" style="color:var(--danger)">{error}</div>
      {:else if messages.length === 0}
        <div class="empty-state">Inbox kosong atau tidak ada email yang dapat diambil</div>
      {:else}
        <div class="inbox">
          {#each messages as m}
            <a class="inbox-row" class:unread={m.unread} href={APP_URLS.mail} target="_blank" rel="noopener">
              <span class="unread-dot" class:visible={m.unread}></span>
              <div style="flex:1;min-width:0">
                <div class="from">{m.from.split(' ').slice(0,3).join(' ')}</div>
                <div class="subj">{#if m.unread}<b>{m.subj}</b>{:else}{m.subj}{/if}</div>
              </div>
              <span class="time mono">{m.time}</span>
            </a>
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

  .notice-card { display:flex; align-items:flex-start; gap:16px; padding:20px; background:color-mix(in srgb, var(--warn) 8%, var(--bg-1)); border:1px solid color-mix(in srgb, var(--warn) 20%, transparent); border-radius:var(--r-lg); }
  .notice-icon { font-size:32px; flex-shrink:0; }
  .notice-title { font-size:14px; font-weight:600; color:var(--fg-1); }
  .notice-sub { font-size:12px; color:var(--fg-3); line-height:1.7; margin-top:4px; }

  .panel-head { padding:14px 20px; border-bottom:1px solid var(--bd-1); display:flex; align-items:center; justify-content:space-between; }
  .panel-title { font-size:12px; font-weight:700; color:var(--fg-3); text-transform:uppercase; letter-spacing:.06em; }

  .inbox { }
  .inbox-row { display:flex; align-items:flex-start; gap:10px; padding:12px 20px; border-bottom:1px solid var(--bd-1); transition:.12s; text-decoration:none; color:inherit; }
  .inbox-row:last-child { border-bottom:none; }
  .inbox-row:hover { background:var(--bg-2); }
  .unread-dot { width:7px; height:7px; border-radius:50%; background:transparent; border:1px solid var(--bd-2); flex-shrink:0; margin-top:5px; }
  .unread-dot.visible { background:var(--pri); border-color:var(--pri); }
  .from { font-size:12.5px; font-weight:500; color:var(--fg-1); }
  .subj { font-size:12px; color:var(--fg-3); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; margin-top:1px; }
  .inbox-row.unread .subj { color:var(--fg-2); }
  .time { font-size:11px; color:var(--fg-4); flex-shrink:0; }
  .empty-state { padding:40px; text-align:center; color:var(--fg-3); font-size:13px; }
</style>
