<script lang="ts">
  import { auth } from '../auth.svelte';
  import { ui }   from '../ui.svelte';
  import { APP_URLS } from '../config';
  import { onMount } from 'svelte';

  // ── Icons ───────────────────────────────────────────────────
  const I = {
    mail:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" width="22" height="22"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>`,
    cloud:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" width="22" height="22"><path d="M17.5 19a4.5 4.5 0 1 0-1.4-8.78A6 6 0 1 0 6 14h11.5"/></svg>`,
    box:     `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" width="22" height="22"><path d="M21 8 12 3 3 8v8l9 5 9-5z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>`,
    arrowR:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" width="13" height="13"><path d="M5 12h14"/><path d="m13 6 6 6-6 6"/></svg>`,
    cal:     `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" width="13" height="13"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 9h18M8 3v4M16 3v4"/></svg>`,
    bell:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><path d="M6 8a6 6 0 1 1 12 0c0 7 3 7 3 9H3c0-2 3-2 3-9Z"/><path d="M10 21a2 2 0 0 0 4 0"/></svg>`,
    db:      `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5"/><path d="M3 12c0 1.66 4.03 3 9 3s9-1.34 9-3"/></svg>`,
    file:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg>`,
    folder:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>`,
    users:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
    search:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><circle cx="11" cy="11" r="7"/><path d="m20 20-4.3-4.3"/></svg>`,
    eye:     `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`,
    settings:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"/></svg>`,
    logout:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/></svg>`,
    x:       `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
  };

  const apps = [
    { key:'mail',  ic:'mail',  name:'SOGo Mail', url: APP_URLS.mail  },
    { key:'cloud', ic:'cloud', name:'Nextcloud',  url: APP_URLS.cloud },
    { key:'erp',   ic:'box',   name:'Odoo ERP',   url: APP_URLS.erp   },
  ];

  // ── State ────────────────────────────────────────────────────
  let storageUser   = $state<{ used: number; quota: number } | null>(null);
  let inboxData     = $state({ unseen: 0, total: 0, ok: false });
  let inboxMessages = $state<{ from: string; subj: string; time: string; unread: boolean }[]>([]);
  let odooData      = $state({ crm: { leads: 0 }, hr: { employees: 0 }, calendar: { today: 0 }, ok: false });
  let agenda        = $state<{ time: string; title: string; meta: string; color: string }[]>([]);
  let recentFiles   = $state<{ name: string; href: string; type: string; time: string }[]>([]);
  let filesLoading  = $state(true);
  let loading       = $state(true);
  let profileOpen   = $state(false);
  let notifOpen     = $state(false);

  // ── Search state ─────────────────────────────────────────────
  let searchQuery   = $state('');
  let searchResults = $state<any[]>([]);
  let searchBusy    = $state(false);
  let searchOpen    = $state(false);
  let searchTimer: ReturnType<typeof setTimeout> | null = null;

  // ── Derived ──────────────────────────────────────────────────
  let storagePct = $derived(storageUser ? Math.round(storageUser.used / storageUser.quota * 100) : 0);
  let notifCount = $derived(ui.notifCount);

  // ── Helpers ──────────────────────────────────────────────────
  function greeting() {
    const h = new Date().getHours();
    return h < 12 ? 'Selamat pagi' : h < 15 ? 'Selamat siang' : h < 18 ? 'Selamat sore' : 'Selamat malam';
  }
  function dateStr() {
    return new Date().toLocaleDateString('id-ID', { weekday:'long', day:'numeric', month:'long', year:'numeric' });
  }
  function sogoCalendarUrl() {
    return `https://mail.opsid.web.id/SOGo/so/${auth.profile.username}/Calendar/view#!/calendar/week/`;
  }
  function sogoComposeUrl() {
    return `https://mail.opsid.web.id/SOGo/so/${auth.profile.username}/Mail/compose`;
  }
  function fileColor(t: string) {
    return t==='docx'?'var(--pri)':t==='pdf'?'var(--danger)':t==='xlsx'?'var(--ok)':t==='folder'?'var(--warn)':'var(--fg-3)';
  }
  function fileIcon(t: string) {
    return t === 'folder' ? I.folder : I.file;
  }
  function storageColor(pct: number) {
    return pct > 85 ? 'var(--danger)' : pct > 60 ? 'var(--warn)' : 'var(--ok)';
  }
  function fmtStorage(gb: number) {
    if (gb < 1) return (gb * 1024).toFixed(0) + ' MB';
    return gb.toFixed(1) + ' GB';
  }
  function notifTypeColor(t: string) {
    return t === 'danger' ? 'var(--danger)' : t === 'warn' ? 'var(--warn)' : 'var(--pri)';
  }
  function searchResultIcon(type: string) {
    if (type === 'user') return '👤';
    if (type === 'tenant') return '🏢';
    if (type === 'audit' || type === 'activity') return '📋';
    return '🔍';
  }

  // ── Search ───────────────────────────────────────────────────
  function onSearchInput() {
    if (searchTimer) clearTimeout(searchTimer);
    if (searchQuery.length < 2) { searchResults = []; searchOpen = false; return; }
    searchTimer = setTimeout(async () => {
      searchBusy = true; searchOpen = true;
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`);
        const d   = await res.json();
        searchResults = d.results ?? [];
      } catch { searchResults = []; }
      searchBusy = false;
    }, 300);
  }

  function closeSearch() {
    searchOpen = false; searchQuery = ''; searchResults = [];
  }

  // ── Outside-click handlers ───────────────────────────────────
  function handleWindowClick(e: MouseEvent) {
    const target = e.target as HTMLElement;
    if (profileOpen && !target.closest('.profile-dropdown')) profileOpen = false;
    if (notifOpen  && !target.closest('.notif-dropdown'))  notifOpen  = false;
    if (searchOpen && !target.closest('.search-wrap'))     closeSearch();
  }

  // ── Data load ────────────────────────────────────────────────
  onMount(async () => {
    const username = auth.profile.username || '';

    // Load notifications into ui store
    ui.refreshNotifications();

    const [quotaRes, inboxRes, odooRes, calRes, filesRes] = await Promise.allSettled([
      fetch('/api/nextcloud/quota').then(r => r.json()),
      fetch(`/api/sogo/inbox?user=${encodeURIComponent(username)}`).then(r => r.json()),
      fetch('/api/odoo/stats').then(r => r.json()),
      fetch(`/api/sogo/calendar?user=${encodeURIComponent(username)}`).then(r => r.json()),
      fetch('/api/nextcloud/recent').then(r => r.json()),
    ]);

    if (quotaRes.status === 'fulfilled' && Array.isArray(quotaRes.value)) {
      const me = quotaRes.value.find((u: any) => u.name === username);
      if (me) storageUser = { used: me.used, quota: me.quota };
      else if (quotaRes.value.length > 0) storageUser = { used: quotaRes.value[0].used, quota: quotaRes.value[0].quota };
    }
    if (inboxRes.status === 'fulfilled') {
      inboxData    = inboxRes.value;
      inboxMessages = inboxRes.value.messages ?? [];
    }
    if (odooRes.status === 'fulfilled') odooData = odooRes.value;
    if (calRes.status === 'fulfilled' && Array.isArray(calRes.value.events)) {
      agenda = calRes.value.events;
    }
    if (filesRes.status === 'fulfilled' && filesRes.value.ok) {
      recentFiles = filesRes.value.files ?? [];
    }
    filesLoading = false;
    loading      = false;

    window.addEventListener('click', handleWindowClick);
    return () => window.removeEventListener('click', handleWindowClick);
  });
</script>

<div class="main-scroll">
  <!-- Topbar -->
  <header class="topbar">
    <div class="crumb">
      <strong>Ringkasan</strong>
      <span style="color:var(--fg-5)">·</span>
      <span>{dateStr()}</span>
    </div>
    <div class="topbar-right">
      <!-- Global search -->
      <div class="search-wrap" style="position:relative">
        <div class="topbar-search" class:active={searchOpen}>
          {@html I.search}
          <input
            placeholder="Cari user, tenant, log…"
            bind:value={searchQuery}
            oninput={onSearchInput}
            onfocus={() => { if (searchQuery.length >= 2) searchOpen = true; }}
          />
          {#if searchQuery}
            <button class="search-clear" onclick={closeSearch}>{@html I.x}</button>
          {:else}
            <span class="kbd">⌘K</span>
          {/if}
        </div>
        {#if searchOpen}
          <div class="search-results">
            {#if searchBusy}
              <div class="sr-empty">Mencari…</div>
            {:else if searchResults.length === 0}
              <div class="sr-empty">Tidak ada hasil untuk "{searchQuery}"</div>
            {:else}
              {#each searchResults as r}
                <div class="sr-item">
                  <span class="sr-icon">{searchResultIcon(r.type)}</span>
                  <div class="sr-text">
                    <div class="sr-title">{r.title}</div>
                    <div class="sr-sub">{r.subtitle}</div>
                  </div>
                  {#if r.meta}<span class="sr-meta">{r.meta}</span>{/if}
                </div>
              {/each}
            {/if}
          </div>
        {/if}
      </div>

      <!-- Notification bell -->
      <div class="notif-dropdown" style="position:relative">
        <button class="btn-icon" title="{notifCount} notifikasi" onclick={() => { notifOpen = !notifOpen; if (notifOpen) ui.refreshNotifications(); }}>
          {@html I.bell}
          {#if notifCount > 0}<span class="notif-dot">{notifCount > 9 ? '9+' : notifCount}</span>{/if}
        </button>
        {#if notifOpen}
          <div class="notif-panel">
            <div class="notif-head">
              <span>Notifikasi</span>
              <span class="notif-badge">{notifCount}</span>
            </div>
            {#if ui.notifList.length === 0}
              <div class="notif-empty">Tidak ada notifikasi</div>
            {:else}
              <div class="notif-list">
                {#each ui.notifList.slice(0, 10) as n}
                  <div class="notif-item">
                    <span class="notif-dot-inline" style="background:{notifTypeColor(n.type)}"></span>
                    <div class="notif-body">
                      <div class="notif-msg">{n.message}</div>
                      <div class="notif-time">{n.time}</div>
                    </div>
                  </div>
                {/each}
              </div>
            {/if}
          </div>
        {/if}
      </div>

      <!-- Profile chip -->
      <div class="profile-dropdown" style="position:relative">
        <button class="userchip" onclick={() => profileOpen = !profileOpen}>
          <div style="display:flex;flex-direction:column;align-items:flex-end">
            <span class="uc-name">{greeting()}, {auth.profile.firstName}</span>
            <span class="uc-role">{auth.profile.isAdmin ? 'Superadmin' : auth.profile.isTenantAdmin ? 'Tenant Admin' : 'User'}</span>
          </div>
          <div class="av">{auth.profile.initials}</div>
        </button>
        {#if profileOpen}
          <div class="profile-menu">
            <div class="profile-info">
              <div style="font-size:13px;font-weight:600;color:var(--fg-1)">{auth.profile.fullName}</div>
              <div style="font-size:11px;color:var(--fg-4);margin-top:2px">{auth.profile.email}</div>
            </div>
            <button class="profile-item" onclick={() => { ui.openProfile('profil'); profileOpen = false; }}>{@html I.eye} Lihat Profil</button>
            <button class="profile-item" onclick={() => { ui.openProfile('keamanan'); profileOpen = false; }}>{@html I.settings} Pengaturan</button>
            <div style="border-top:1px solid var(--bd-1);margin-top:4px;padding-top:4px">
              <button class="profile-item danger" onclick={() => auth.logout()}>{@html I.logout} Keluar</button>
            </div>
          </div>
        {/if}
      </div>
    </div>
  </header>

  <div class="main-pad">
    <!-- Page header -->
    <div class="page-head">
      <div>
        <div class="page-h1">{greeting()}, {auth.profile.firstName}.</div>
        <div class="page-sub">{apps.length} aplikasi terhubung · {inboxData.unseen} email belum dibaca · {loading ? '…' : agenda.length} jadwal hari ini</div>
      </div>
      <a class="btn btn-primary btn-sm" href={sogoComposeUrl()} target="_blank" rel="noopener">
        {@html I.mail} Tulis Email
      </a>
    </div>

    <!-- Stat cards -->
    <div class="stat-grid">
      <div class="stat-card">
        <div class="stat-card-head">
          <span class="stat-label">Nextcloud</span>
          <span class="stat-icon" style="background:var(--pri-soft);color:var(--pri)">{@html I.cloud}</span>
        </div>
        {#if storageUser}
          <div class="stat-val">{fmtStorage(storageUser.used)}</div>
          <div class="stat-sub">dari kuota {storageUser.quota} GB</div>
          <div class="prog-bar"><div class="prog-fill" style="width:{storagePct}%;background:var(--pri)"></div></div>
          <div class="stat-sub" style="color:{storageColor(storagePct)}">{storagePct}% terpakai</div>
        {:else}
          <div class="stat-val">–</div>
          <div class="stat-sub">{loading ? 'Memuat…' : 'Tidak ada data'}</div>
        {/if}
      </div>

      <div class="stat-card">
        <div class="stat-card-head">
          <span class="stat-label">Email</span>
          <span class="stat-icon" style="background:rgba(251,191,36,.1);color:var(--warn)">{@html I.mail}</span>
        </div>
        <div class="stat-val">{inboxData.unseen}</div>
        <div class="stat-sub">pesan belum dibaca</div>
        <div style="display:flex;gap:6px;margin-top:8px">
          <span class="tag tag-pri">{inboxData.total} total</span>
          <span class="tag {inboxData.ok ? 'tag-ok' : ''}">{inboxData.ok ? 'Aktif' : loading ? '…' : 'Offline'}</span>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-card-head">
          <span class="stat-label">Karyawan</span>
          <span class="stat-icon" style="background:rgba(167,139,250,.1);color:#A78BFA">{@html I.users}</span>
        </div>
        <div class="stat-val">{odooData.hr.employees}</div>
        <div class="stat-sub">karyawan aktif</div>
        <div style="display:flex;gap:6px;margin-top:8px">
          <span class="tag tag-ok">{odooData.crm.leads} leads CRM</span>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-card-head">
          <span class="stat-label">Penyimpanan</span>
          <span class="stat-icon" style="background:var(--ok-soft);color:var(--ok)">{@html I.db}</span>
        </div>
        {#if storageUser}
          <div class="stat-val" style="color:{storageColor(storagePct)}">{storagePct}%</div>
          <div class="stat-sub">{auth.profile.username} · {storageUser.quota} GB kuota</div>
          <div class="prog-bar"><div class="prog-fill" style="width:{storagePct}%;background:{storageColor(storagePct)}"></div></div>
        {:else}
          <div class="stat-val">–</div>
          <div class="stat-sub">{loading ? 'Memuat…' : 'Tidak ada data'}</div>
        {/if}
      </div>
    </div>

    <!-- Quick access -->
    <div class="panel">
      <div class="panel-head"><span class="panel-title">Akses Cepat</span></div>
      <div class="quick-row">
        {#each apps as a (a.key)}
          <button class="quick-tile" onclick={() => ui.openApp(a.key, a.url, a.name)}>
            <span class="tile tile-{a.key}" style="width:52px;height:52px;border-radius:14px">{@html (I as any)[a.ic]}</span>
            <span class="quick-label">{a.name}</span>
          </button>
        {/each}
      </div>
    </div>

    <!-- Email + Calendar -->
    <div class="split">
      <div class="panel">
        <div class="panel-head">
          <span class="panel-title">Email Terbaru</span>
          <a class="btn btn-ghost btn-sm" href={APP_URLS.mail} target="_blank" rel="noopener">Buka SOGo {@html I.arrowR}</a>
        </div>
        <div class="inbox">
          {#if loading}
            <div class="empty-state">Memuat email…</div>
          {:else if inboxMessages.length === 0}
            <div class="empty-state">Inbox kosong</div>
          {:else}
            {#each inboxMessages as m}
              <a class="inbox-row" class:unread={m.unread} href={APP_URLS.mail} target="_blank" rel="noopener">
                <span class="unread-dot" class:visible={m.unread}></span>
                <div style="flex:1;min-width:0">
                  <div class="from">{m.from.split(' ').slice(0,3).join(' ')}</div>
                  <div class="subj">{#if m.unread}<b>{m.subj}</b>{:else}{m.subj}{/if}</div>
                </div>
                <span class="time mono">{m.time}</span>
              </a>
            {/each}
          {/if}
        </div>
      </div>

      <div class="panel">
        <div class="panel-head">
          <span class="panel-title">Jadwal Hari Ini</span>
          <a class="btn btn-ghost btn-sm" href={sogoCalendarUrl()} target="_blank" rel="noopener">{@html I.cal} Kalender</a>
        </div>
        <div class="agenda">
          {#if loading}
            <div class="empty-state">Memuat jadwal…</div>
          {:else if agenda.length === 0}
            <div class="empty-state">Tidak ada jadwal hari ini</div>
          {:else}
            {#each agenda as a (a.time)}
              <a class="agenda-row" href={sogoCalendarUrl()} target="_blank" rel="noopener">
                <span class="agenda-time">{a.time}</span>
                <span class="agenda-bar" style="background:{a.color}"></span>
                <div>
                  <div class="agenda-title">{a.title}</div>
                  <div class="agenda-meta">{a.meta}</div>
                </div>
              </a>
            {/each}
          {/if}
          <div class="agenda-footer mono">CalDAV · mail.opsid.web.id</div>
        </div>
      </div>
    </div>

    <!-- Recent files from Nextcloud -->
    <div class="panel">
      <div class="panel-head">
        <span class="panel-title">File Terbaru — Nextcloud</span>
        <button class="btn btn-ghost btn-sm" onclick={() => ui.openApp('cloud', APP_URLS.cloud, 'Nextcloud')}>
          Lihat semua {@html I.arrowR}
        </button>
      </div>
      <div class="file-list">
        {#if filesLoading}
          <div class="empty-state">Memuat file dari Nextcloud…</div>
        {:else if recentFiles.length === 0}
          <div class="empty-state">Tidak ada file terbaru · <a href={APP_URLS.cloud} target="_blank" rel="noopener" style="color:var(--pri)">Buka Nextcloud</a></div>
        {:else}
          {#each recentFiles as f}
            <a class="file-row" href={f.href} target="_blank" rel="noopener">
              <span class="file-icon" style="color:{fileColor(f.type)}">{@html fileIcon(f.type)}</span>
              <div style="flex:1;min-width:0">
                <div class="file-name">{f.name}</div>
              </div>
              <span class="time mono">{f.time}</span>
            </a>
          {/each}
        {/if}
      </div>
    </div>
  </div>
</div>

<style>
  /* ── Layout ──────────────────────────────────────────────── */
  .main-scroll { flex:1; overflow-y:auto; display:flex; flex-direction:column; min-height:0; }
  .main-pad { flex:1; padding:28px; display:flex; flex-direction:column; gap:22px; max-width:1320px; margin:0 auto; width:100%; }

  /* ── Topbar ──────────────────────────────────────────────── */
  .topbar { display:flex; align-items:center; justify-content:space-between; padding:0 28px; height:56px; border-bottom:1px solid var(--bd-1); background:color-mix(in srgb, var(--bg-0) 80%, transparent); backdrop-filter:blur(12px); flex-shrink:0; z-index:20; position:sticky; top:0; }
  .topbar-right { display:flex; align-items:center; gap:6px; }
  .topbar-search { display:flex; align-items:center; gap:8px; padding:7px 12px; background:var(--bg-2); border:1px solid var(--bd-1); border-radius:var(--r-md); color:var(--fg-4); font-size:12px; width:260px; transition:border-color .15s; }
  .topbar-search.active { border-color:var(--pri); }
  .topbar-search input { flex:1; background:none; border:none; padding:0; color:var(--fg-1); font-size:12px; outline:none; font-family:inherit; min-width:0; }
  .topbar-search input::placeholder { color:var(--fg-4); }
  .search-clear { background:none; border:none; color:var(--fg-3); cursor:pointer; padding:0; display:flex; }

  /* ── Search results ──────────────────────────────────────── */
  .search-results { position:absolute; top:calc(100% + 6px); left:0; right:0; background:var(--bg-1); border:1px solid var(--bd-2); border-radius:var(--r-lg); box-shadow:0 12px 32px -8px rgba(0,0,0,.5); z-index:200; overflow:hidden; max-height:320px; overflow-y:auto; }
  .sr-empty { padding:20px; text-align:center; color:var(--fg-4); font-size:12px; }
  .sr-item { display:flex; align-items:center; gap:10px; padding:10px 14px; border-bottom:1px solid var(--bd-1); cursor:pointer; transition:.12s; }
  .sr-item:last-child { border-bottom:none; }
  .sr-item:hover { background:var(--bg-2); }
  .sr-icon { font-size:16px; flex-shrink:0; }
  .sr-text { flex:1; min-width:0; }
  .sr-title { font-size:13px; font-weight:500; color:var(--fg-1); }
  .sr-sub { font-size:11px; color:var(--fg-4); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .sr-meta { font-size:10px; color:var(--fg-4); flex-shrink:0; }

  /* ── Notifications ───────────────────────────────────────── */
  .notif-dot { position:absolute; top:5px; right:4px; min-width:14px; height:14px; border-radius:7px; background:var(--danger); border:2px solid var(--bg-0); font-size:8px; color:#fff; font-weight:700; display:grid; place-items:center; padding:0 2px; }
  .notif-panel { position:absolute; top:calc(100% + 6px); right:0; width:320px; background:var(--bg-1); border:1px solid var(--bd-2); border-radius:var(--r-lg); box-shadow:0 12px 32px -8px rgba(0,0,0,.5); z-index:200; overflow:hidden; }
  .notif-head { display:flex; align-items:center; justify-content:space-between; padding:12px 16px; border-bottom:1px solid var(--bd-1); font-size:13px; font-weight:600; color:var(--fg-1); }
  .notif-badge { background:var(--danger); color:#fff; font-size:10px; font-weight:700; padding:2px 6px; border-radius:10px; }
  .notif-list { max-height:280px; overflow-y:auto; }
  .notif-item { display:flex; align-items:flex-start; gap:10px; padding:10px 14px; border-bottom:1px solid color-mix(in srgb, var(--bd-1) 50%, transparent); }
  .notif-item:last-child { border-bottom:none; }
  .notif-dot-inline { width:8px; height:8px; border-radius:50%; flex-shrink:0; margin-top:4px; }
  .notif-body { flex:1; min-width:0; }
  .notif-msg { font-size:12px; color:var(--fg-2); line-height:1.4; }
  .notif-time { font-size:10px; color:var(--fg-4); margin-top:2px; }
  .notif-empty { padding:24px; text-align:center; color:var(--fg-4); font-size:12px; }

  /* ── Profile dropdown ────────────────────────────────────── */
  .profile-menu { position:absolute; top:100%; right:0; margin-top:6px; background:var(--bg-1); border:1px solid var(--bd-2); border-radius:var(--r-lg); padding:6px; width:220px; box-shadow:0 12px 40px -12px rgba(0,0,0,.7); z-index:200; }
  .profile-info { padding:12px 14px; border-bottom:1px solid var(--bd-1); margin-bottom:4px; }
  .profile-item { display:flex; align-items:center; gap:10px; width:100%; padding:8px 10px; border-radius:var(--r-md); color:var(--fg-3); font-size:12px; font-weight:500; transition:all .15s; text-align:left; background:none; border:none; cursor:pointer; font-family:inherit; }
  .profile-item:hover { background:var(--bg-2); color:var(--fg-1); }
  .profile-item.danger { color:var(--danger); }
  .profile-item.danger:hover { background:rgba(248,113,113,.08); }

  /* ── Page header ─────────────────────────────────────────── */
  .page-head { display:flex; align-items:flex-start; justify-content:space-between; gap:16px; flex-wrap:wrap; }
  .page-h1 { font-size:24px; font-weight:700; letter-spacing:-.02em; color:var(--fg-1); }
  .page-sub { font-size:13px; color:var(--fg-3); margin-top:4px; }

  /* ── Stat cards ──────────────────────────────────────────── */
  .stat-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:14px; }
  .stat-card { background:var(--bg-1); border:1px solid var(--bd-1); border-radius:var(--r-lg); padding:18px 20px; display:flex; flex-direction:column; gap:8px; transition:all .15s; }
  .stat-card:hover { border-color:var(--bd-2); transform:translateY(-1px); }
  .stat-card-head { display:flex; align-items:center; justify-content:space-between; }
  .stat-label { font-size:11px; font-weight:600; color:var(--fg-3); text-transform:uppercase; letter-spacing:.06em; }
  .stat-icon { width:36px; height:36px; border-radius:var(--r-md); display:grid; place-items:center; flex-shrink:0; }
  .stat-val { font-size:30px; font-weight:700; color:var(--fg-1); letter-spacing:-.03em; line-height:1; }
  .stat-sub { font-size:12px; color:var(--fg-3); }
  .prog-bar { height:4px; background:var(--bg-3); border-radius:2px; overflow:hidden; }
  .prog-fill { height:100%; border-radius:2px; transition:width .6s ease; }

  /* ── Quick access ────────────────────────────────────────── */
  .quick-row { display:flex; gap:14px; padding:20px; }
  .quick-tile { display:flex; flex-direction:column; align-items:center; justify-content:center; gap:12px; padding:28px 20px; border-radius:14px; border:1px solid var(--bd-1); background:var(--bg-2); cursor:pointer; transition:.15s; flex:1; min-height:110px; color:inherit; font-family:inherit; }
  .quick-tile:hover { background:var(--bg-3); border-color:var(--bd-2); transform:translateY(-2px); }
  .quick-label { font-size:12px; font-weight:500; color:var(--fg-2); }

  /* ── Split ───────────────────────────────────────────────── */
  .split { display:grid; grid-template-columns:1fr 1fr; gap:14px; }

  /* ── Email ───────────────────────────────────────────────── */
  .inbox-row { display:flex; align-items:flex-start; gap:10px; padding:12px 20px; border-bottom:1px solid var(--bd-1); transition:.12s; text-decoration:none; color:inherit; }
  .inbox-row:last-child { border-bottom:none; }
  .inbox-row:hover { background:var(--bg-2); }
  .unread-dot { width:7px; height:7px; border-radius:50%; background:transparent; border:1px solid var(--bd-2); flex-shrink:0; margin-top:5px; }
  .unread-dot.visible { background:var(--pri); border-color:var(--pri); }
  .from { font-size:12.5px; font-weight:500; color:var(--fg-1); }
  .subj { font-size:12px; color:var(--fg-3); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; margin-top:1px; }
  .inbox-row.unread .subj { color:var(--fg-2); }
  .time { font-size:11px; color:var(--fg-4); flex-shrink:0; }
  .empty-state { padding:32px; text-align:center; color:var(--fg-3); font-size:13px; }

  /* ── Agenda ──────────────────────────────────────────────── */
  .agenda-row { display:flex; align-items:flex-start; gap:12px; padding:12px 20px; border-bottom:1px solid var(--bd-1); text-decoration:none; color:inherit; transition:.12s; }
  .agenda-row:hover { background:var(--bg-2); }
  .agenda-time { font-family:'Geist Mono',monospace; font-size:11px; color:var(--fg-3); width:42px; flex-shrink:0; padding-top:2px; }
  .agenda-bar { width:3px; border-radius:2px; min-height:38px; flex-shrink:0; align-self:stretch; }
  .agenda-title { font-size:13px; font-weight:500; color:var(--fg-1); }
  .agenda-meta { font-size:11px; color:var(--fg-3); margin-top:2px; }
  .agenda-footer { padding:10px 20px; border-top:1px solid var(--bd-1); font-size:10px; color:var(--fg-4); }

  /* ── Files ───────────────────────────────────────────────── */
  .file-row { display:flex; align-items:center; gap:12px; padding:11px 20px; border-bottom:1px solid var(--bd-1); transition:.12s; text-decoration:none; color:inherit; }
  .file-row:last-child { border-bottom:none; }
  .file-row:hover { background:var(--bg-2); }
  .file-icon { flex-shrink:0; }
  .file-name { font-size:13px; font-weight:500; color:var(--fg-1); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }

  /* ── Responsive ──────────────────────────────────────────── */
  @media(max-width:1200px) { .stat-grid { grid-template-columns:repeat(2,1fr); } }
  @media(max-width:900px)  { .split { grid-template-columns:1fr; } }
</style>
