<script lang="ts">
  import { auth } from '../auth.svelte';
  import { APP_URLS } from '../config';
  import { onMount } from 'svelte';

  const I = {
    arrowUR: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" width="11" height="11"><path d="M7 17 17 7"/><path d="M8 7h9v9"/></svg>`,
    refresh: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/><path d="M3 21v-5h5"/></svg>`,
  };

  interface CalEvent { time: string; title: string; meta: string; color: string; }

  let events  = $state<CalEvent[]>([]);
  let loading = $state(true);
  let error   = $state('');

  function dateStr() {
    return new Date().toLocaleDateString('id-ID', { weekday:'long', day:'numeric', month:'long', year:'numeric' });
  }

  const sogoCalUrl = () =>
    `https://mail.opsid.web.id/SOGo/so/${auth.profile.username}/Calendar/view#!/calendar/week/`;

  async function load() {
    loading = true; error = '';
    try {
      const res = await fetch(`/api/sogo/calendar?user=${encodeURIComponent(auth.profile.username)}`);
      const d = await res.json();
      events = Array.isArray(d.events) ? d.events : [];
    } catch { error = 'Gagal memuat kalender'; }
    loading = false;
  }

  onMount(load);
</script>

<div class="main-scroll">
  <header class="topbar">
    <div class="crumb"><strong>Kalender</strong></div>
    <div class="topbar-right">
      <button class="btn btn-secondary btn-sm" onclick={load}>{@html I.refresh}</button>
      <a class="btn btn-secondary btn-sm" href={sogoCalUrl()} target="_blank" rel="noopener">
        Buka Kalender Lengkap {@html I.arrowUR}
      </a>
    </div>
  </header>

  <div class="main-pad">
    <div class="page-head">
      <div>
        <h1 class="page-h1">Kalender</h1>
        <p class="page-sub">{dateStr()}</p>
      </div>
    </div>

    <div class="notice-card">
      <div class="notice-icon">📅</div>
      <div>
        <div class="notice-title">Kalender SOGo CalDAV</div>
        <div class="notice-sub">
          Jadwal disinkronisasi dari SOGo CalDAV. Untuk tampilan lengkap, gunakan SOGo Webmail.
        </div>
        <a class="btn btn-primary btn-sm" href={sogoCalUrl()} target="_blank" rel="noopener" style="margin-top:10px;display:inline-flex">
          Buka SOGo Kalender {@html I.arrowUR}
        </a>
      </div>
    </div>

    <div class="panel">
      <div class="panel-head">
        <span class="panel-title">Jadwal Hari Ini</span>
      </div>
      {#if loading}
        <div class="empty-state">Memuat jadwal…</div>
      {:else if error}
        <div class="empty-state" style="color:var(--danger)">{error}</div>
      {:else if events.length === 0}
        <div class="empty-state">Tidak ada jadwal hari ini</div>
      {:else}
        <div class="event-list">
          {#each events as ev}
            <div class="event-row">
              <div class="event-time mono">{ev.time}</div>
              <div class="event-bar" style="background:{ev.color}"></div>
              <div>
                <div class="event-title">{ev.title}</div>
                <div class="event-meta">{ev.meta}</div>
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
  .notice-card { display:flex; align-items:flex-start; gap:16px; padding:20px; background:color-mix(in srgb, var(--pri) 8%, var(--bg-1)); border:1px solid color-mix(in srgb, var(--pri) 20%, transparent); border-radius:var(--r-lg); }
  .notice-icon { font-size:32px; flex-shrink:0; }
  .notice-title { font-size:14px; font-weight:600; color:var(--fg-1); }
  .notice-sub { font-size:12px; color:var(--fg-3); line-height:1.7; margin-top:4px; }
  .panel-head { padding:14px 20px; border-bottom:1px solid var(--bd-1); display:flex; align-items:center; justify-content:space-between; }
  .panel-title { font-size:12px; font-weight:700; color:var(--fg-3); text-transform:uppercase; letter-spacing:.06em; }
  .event-list { }
  .event-row { display:flex; align-items:flex-start; gap:12px; padding:14px 20px; border-bottom:1px solid var(--bd-1); }
  .event-row:last-child { border-bottom:none; }
  .event-time { font-size:12px; color:var(--fg-3); width:48px; flex-shrink:0; padding-top:2px; }
  .event-bar { width:3px; border-radius:2px; min-height:40px; flex-shrink:0; align-self:stretch; }
  .event-title { font-size:13px; font-weight:500; color:var(--fg-1); }
  .event-meta { font-size:11px; color:var(--fg-3); margin-top:2px; }
  .empty-state { padding:40px; text-align:center; color:var(--fg-3); font-size:13px; }
</style>
