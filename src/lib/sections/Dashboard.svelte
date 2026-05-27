<script lang="ts">
  import { auth } from '../auth.svelte';
  import { APP_URLS } from '../config';
  import { onMount } from 'svelte';

  // ── Icons ───────────────────────────────────────────────────
  const I = {
    mail:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" width="22" height="22"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>`,
    cloud:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" width="22" height="22"><path d="M17.5 19a4.5 4.5 0 1 0-1.4-8.78A6 6 0 1 0 6 14h11.5"/></svg>`,
    box:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" width="22" height="22"><path d="M21 8 12 3 3 8v8l9 5 9-5z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>`,
    arrowR: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" width="13" height="13"><path d="M5 12h14"/><path d="m13 6 6 6-6 6"/></svg>`,
    cal:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" width="13" height="13"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 9h18M8 3v4M16 3v4"/></svg>`,
    bell:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><path d="M6 8a6 6 0 1 1 12 0c0 7 3 7 3 9H3c0-2 3-2 3-9Z"/><path d="M10 21a2 2 0 0 0 4 0"/></svg>`,
    db:     `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5"/><path d="M3 12c0 1.66 4.03 3 9 3s9-1.34 9-3"/></svg>`,
    file:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg>`,
    users:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
    search: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><circle cx="11" cy="11" r="7"/><path d="m20 20-4.3-4.3"/></svg>`,
    eye:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`,
    settings:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"/></svg>`,
    logout: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/></svg>`,
    x:      `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
  };

  const apps = [
    { key:'mail',  tile:'mail',  ic:'mail',  name:'SOGo Mail', url: APP_URLS.mail  },
    { key:'cloud', tile:'cloud', ic:'cloud', name:'Nextcloud', url: APP_URLS.cloud },
    { key:'erp',   tile:'erp',   ic:'box',   name:'Odoo ERP',  url: APP_URLS.erp   },
  ];

  // ── State (Svelte 5 runes) ──────────────────────────────────
  let storageUser   = $state<{ used: number; quota: number } | null>(null);
  let inboxData     = $state({ unseen: 0, total: 0, ok: false });
  let inboxMessages = $state<{ from: string; subj: string; time: string; unread: boolean }[]>([]);
  let odooData      = $state({ crm: { leads: 0 }, hr: { employees: 0 }, calendar: { today: 0 }, ok: false });
  let agenda        = $state<{ time: string; title: string; meta: string; color: string }[]>([]);
  let notifCount    = $state(0);
  let loading       = $state(true);
  let profileOpen   = $state(false);

  // ── Derived ─────────────────────────────────────────────────
  let storagePct = $derived(storageUser ? Math.round(storageUser.used / storageUser.quota * 100) : 0);

  // Placeholder — TODO: fetch dari Nextcloud WebDAV API
  const recentFiles = [
    { name:'Proposal_Hackathon_IDCloudHost.docx', type:'docx', meta:'Diubah oleh kamu', time:'2 mnt lalu' },
    { name:'Invoice_Manjapoles_2026.pdf',         type:'pdf',  meta:'Dibagikan Mira',   time:'1 jam lalu' },
    { name:'Laporan_Keuangan_Q2.xlsx',            type:'xlsx', meta:'3 editor aktif',   time:'3 jam lalu' },
    { name:'Arsitektur_OPSID_v3.pptx',            type:'pptx', meta:'Diubah Bagas',     time:'Kemarin'    },
  ];

  // ── Helpers ─────────────────────────────────────────────────
  function greeting() {
    const h = new Date().getHours();
    return h < 12 ? 'Selamat pagi' : h < 15 ? 'Selamat siang' : h < 18 ? 'Selamat sore' : 'Selamat malam';
  }
  function dateStr() {
    return new Date().toLocaleDateString('id-ID', { weekday:'long', day:'numeric', month:'long', year:'numeric' });
  }
  function openApp(url: string) { window.open(url, '_blank'); }
  function fileColor(t: string) {
    return t==='docx'?'var(--pri)':t==='pdf'?'var(--danger)':t==='xlsx'?'var(--ok)':'var(--warn)';
  }
  function storageColor(pct: number) {
    return pct > 85 ? 'var(--danger)' : pct > 60 ? 'var(--warn)' : 'var(--ok)';
  }
  function fmtStorage(gb: number) {
    if (gb < 1) return (gb * 1024).toFixed(0) + ' MB';
    return gb.toFixed(1) + ' GB';
  }

  // ── Close profile dropdown on outside click ─────────────────
  function handleWindowClick(e: MouseEvent) {
    const target = e.target as HTMLElement;
    if (profileOpen && !target.closest('.profile-dropdown')) {
      profileOpen = false;
    }
  }

  // ── Fetch data on mount ─────────────────────────────────────
  onMount(async () => {
    const username = auth.profile.username || '';

    const [quotaRes, inboxRes, odooRes, calRes, notifRes] = await Promise.allSettled([
      fetch('/api/nextcloud/quota').then(r => r.json()),
      fetch(`/api/sogo/inbox?user=${encodeURIComponent(username)}`).then(r => r.json()),
      fetch('/api/odoo/stats').then(r => r.json()),
      fetch(`/api/sogo/calendar?user=${encodeURIComponent(username)}`).then(r => r.json()),
      fetch('/api/notifications').then(r => r.json()),
    ]);

    if (quotaRes.status === 'fulfilled' && Array.isArray(quotaRes.value)) {
      const me = quotaRes.value.find((u: any) => u.name === username);
      if (me) {
        storageUser = { used: me.used, quota: me.quota };
      } else if (quotaRes.value.length > 0) {
        storageUser = { used: quotaRes.value[0].used, quota: quotaRes.value[0].quota };
      }
    }
    if (inboxRes.status === 'fulfilled') {
      inboxData = inboxRes.value;
      inboxMessages = inboxRes.value.messages || [];
    }
    if (odooRes.status === 'fulfilled') {
      odooData = odooRes.value;
    }
    if (calRes.status === 'fulfilled' && Array.isArray(calRes.value.events) && calRes.value.events.length > 0) {
      agenda = calRes.value.events;
    } else {
      // Fallback kalau CalDAV belum ada event
      agenda = [
        { time:'10:00', title:'Stand-up infra · 15 menit', meta:'9 peserta · Google Meet', color:'var(--pri)' },
        { time:'13:30', title:'Review onboarding Tenant',   meta:'Mira, Bagas, Dewi',       color:'var(--ok)'  },
        { time:'16:00', title:'Sprint demo hackathon',      meta:'Tim portal · Zoom',        color:'var(--warn)'},
      ];
    }
    if (notifRes.status === 'fulfilled') {
      notifCount = notifRes.value.unread ?? 0;
    }
    loading = false;

    window.addEventListener('click', handleWindowClick);
    return () => window.removeEventListener('click', handleWindowClick);
  });
</script>

<div class="main-scroll">
  <!-- Topbar -->
  <header class="topbar">
    <div class="crumb">
      <strong>Ringkasan hari ini</strong>
      <span style="color:var(--fg-5)">·</span>
      <span>{dateStr()}</span>
    </div>
    <div class="topbar-right">
      <div class="topbar-search">
        {@html I.search}
        <input placeholder="Cari..." />
        <span class="kbd">⌘K</span>
      </div>
      <button class="btn-icon" style="position:relative" title="{notifCount} notifikasi">
        {@html I.bell}
        {#if notifCount > 0}<span class="notif-dot"></span>{/if}
      </button>
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
            <button class="profile-item">{@html I.eye} Lihat Profil</button>
            <button class="profile-item">{@html I.settings} Pengaturan</button>
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
        <div class="page-sub">{apps.length} aplikasi terhubung · {inboxData.unseen} email belum dibaca · {loading ? '...' : agenda.length} jadwal hari ini</div>
      </div>
      <button class="btn btn-primary btn-sm" onclick={() => openApp(APP_URLS.mail)}>
        {@html I.mail} Buka Inbox
      </button>
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
          <div class="stat-sub">{loading ? 'Memuat...' : 'Tidak ada data'}</div>
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
          <span class="tag {inboxData.ok ? 'tag-ok' : ''}">{inboxData.ok ? 'Inbox aktif' : loading ? 'Memuat...' : 'Offline'}</span>
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
          <span class="stat-label">Penggunaan</span>
          <span class="stat-icon" style="background:var(--ok-soft);color:var(--ok)">{@html I.db}</span>
        </div>
        {#if storageUser}
          {@const pct = storagePct}
          <div class="stat-val" style="color:{storageColor(pct)}">{pct}%</div>
          <div class="stat-sub">{auth.profile.username} · {storageUser.quota} GB kuota</div>
          <div class="prog-bar"><div class="prog-fill" style="width:{pct}%;background:{storageColor(pct)}"></div></div>
        {:else}
          <div class="stat-val">–</div>
          <div class="stat-sub">{loading ? 'Memuat...' : 'Tidak ada data'}</div>
        {/if}
      </div>
    </div>

    <!-- Quick access -->
    <div class="panel">
      <div class="panel-head">
        <span class="panel-title">Akses Cepat</span>
      </div>
      <div class="quick-row">
        {#each apps as a (a.key)}
          <button class="quick-tile" onclick={() => openApp(a.url)}>
            <span class="tile tile-{a.tile}" style="width:52px;height:52px;border-radius:14px">
              {@html (I as any)[a.ic]}
            </span>
            <span class="quick-label">{a.name}</span>
          </button>
        {/each}
      </div>
    </div>

    <!-- Email + Calendar split -->
    <div class="split">
      <div class="panel">
        <div class="panel-head">
          <span class="panel-title">Email Terbaru</span>
          <button class="btn btn-ghost btn-sm" onclick={() => openApp(APP_URLS.mail)}>
            Buka SOGo {@html I.arrowR}
          </button>
        </div>
        <div class="inbox">
          {#if loading}
            <div class="empty-state">Memuat email...</div>
          {:else if inboxMessages.length === 0}
            <div class="empty-state">Inbox kosong</div>
          {:else}
            {#each inboxMessages as m}
              <div class="inbox-row" class:unread={m.unread}>
                <span class="unread-dot" class:visible={m.unread}></span>
                <div style="flex:1;min-width:0">
                  <div class="from">{m.from.split(" ").slice(0,3).join(" ")}</div>
                  <div class="subj">{#if m.unread}<b>{m.subj}</b>{:else}{m.subj}{/if}</div>
                </div>
                <span class="time mono">{m.time}</span>
              </div>
            {/each}
          {/if}
        </div>
      </div>

      <div class="panel">
        <div class="panel-head">
          <span class="panel-title">Jadwal Hari Ini</span>
          <button class="btn btn-ghost btn-sm" onclick={() => openApp(APP_URLS.mail)}>
            {@html I.cal} Kalender
          </button>
        </div>
        <div class="agenda">
          {#each agenda as a (a.time)}
            <div class="agenda-row">
              <span class="agenda-time">{a.time}</span>
              <span class="agenda-bar" style="background:{a.color}"></span>
              <div>
                <div class="agenda-title">{a.title}</div>
                <div class="agenda-meta">{a.meta}</div>
              </div>
            </div>
          {/each}
          <div style="padding:12px 20px;border-top:1px solid var(--bd-1);font-size:11px;color:var(--fg-4)" class="mono">
            Sinkronisasi via CalDAV · mail.opsid.web.id
          </div>
        </div>
      </div>
    </div>

    <!-- Recent files -->
    <div class="panel">
      <div class="panel-head">
        <span class="panel-title">File Terbaru (Nextcloud)</span>
        <button class="btn btn-ghost btn-sm" onclick={() => openApp(APP_URLS.cloud)}>
          Lihat semua {@html I.arrowR}
        </button>
      </div>
      <div class="file-list">
        {#each recentFiles as f}
          <button class="file-row" onclick={() => openApp(APP_URLS.cloud)}>
            <span class="file-icon" style="color:{fileColor(f.type)}">{@html I.file}</span>
            <div style="flex:1;min-width:0">
              <div class="file-name">{f.name}</div>
              <div class="file-meta">{f.meta}</div>
            </div>
            <span class="time mono">{f.time}</span>
          </button>
        {/each}
      </div>
    </div>
  </div>
</div>

<style>
  /* ── Layout ──────────────────────────────────────────────── */
  .main-scroll { flex:1; overflow-y:auto; display:flex; flex-direction:column; min-height:0; }
  .main-pad { flex:1; padding:28px; display:flex; flex-direction:column; gap:22px; max-width:1320px; margin:0 auto; width:100%; }

  /* ── Topbar ──────────────────────────────────────────────── */
  .topbar { display:flex; align-items:center; justify-content:space-between; padding:0 28px; height:56px; border-bottom:1px solid var(--bd-1); background:color-mix(in srgb, var(--bg-0) 80%, transparent); backdrop-filter:blur(12px); flex-shrink:0; z-index:10; position:sticky; top:0; }
  .topbar-right { display:flex; align-items:center; gap:6px; }
  .topbar-search { display:flex; align-items:center; gap:8px; padding:7px 12px; background:var(--bg-2); border:1px solid var(--bd-1); border-radius:var(--r-md); color:var(--fg-4); font-size:12px; width:220px; transition:border-color .15s; }
  .topbar-search:focus-within { border-color:var(--pri); }
  .topbar-search input { flex:1; background:none; border:none; padding:0; color:var(--fg-1); font-size:12px; outline:none; font-family:inherit; }
  .topbar-search input::placeholder { color:var(--fg-4); }
  .notif-dot { position:absolute; top:7px; right:7px; width:7px; height:7px; border-radius:50%; background:var(--danger); border:2px solid var(--bg-0); }

  /* ── Profile dropdown ────────────────────────────────────── */
  .profile-menu { position:absolute; top:100%; right:0; margin-top:6px; background:var(--bg-1); border:1px solid var(--bd-2); border-radius:var(--r-lg); padding:6px; width:220px; box-shadow:0 12px 40px -12px rgba(0,0,0,.7); z-index:100; }
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

  /* ── Email ───────────────────────────────────────────────── */
  .inbox-row { display:flex; align-items:flex-start; gap:10px; padding:12px 20px; border-bottom:1px solid var(--bd-1); transition:.12s; cursor:pointer; }
  .inbox-row:last-child { border-bottom:none; }
  .inbox-row:hover { background:var(--bg-2); }
  .unread-dot { width:7px; height:7px; border-radius:50%; background:transparent; border:1px solid var(--bd-2); flex-shrink:0; margin-top:5px; }
  .unread-dot.visible { background:var(--pri); border-color:var(--pri); box-shadow:0 0 6px color-mix(in srgb, var(--pri) 50%, transparent); }
  .from { font-size:12.5px; font-weight:500; color:var(--fg-1); }
  .subj { font-size:12px; color:var(--fg-3); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; margin-top:1px; }
  .inbox-row.unread .from { font-weight:600; }
  .inbox-row.unread .subj { color:var(--fg-2); }
  .time { font-size:11px; color:var(--fg-4); flex-shrink:0; }
  .empty-state { padding:32px; text-align:center; color:var(--fg-3); font-size:13px; }

  /* ── Agenda ──────────────────────────────────────────────── */
  .agenda-row { display:flex; align-items:flex-start; gap:12px; padding:12px 20px; border-bottom:1px solid var(--bd-1); }
  .agenda-row:last-child { border-bottom:none; }
  .agenda-time { font-family:'Geist Mono',monospace; font-size:11px; color:var(--fg-3); width:42px; flex-shrink:0; padding-top:2px; }
  .agenda-bar { width:3px; border-radius:2px; min-height:38px; flex-shrink:0; align-self:stretch; }
  .agenda-title { font-size:13px; font-weight:500; color:var(--fg-1); }
  .agenda-meta { font-size:11px; color:var(--fg-3); margin-top:2px; }

  /* ── Files ───────────────────────────────────────────────── */
  .file-row { display:flex; align-items:center; gap:12px; padding:11px 20px; border-bottom:1px solid var(--bd-1); width:100%; text-align:left; transition:.12s; background:none; border-left:none; border-right:none; border-top:none; border-radius:0; cursor:pointer; color:inherit; font-family:inherit; }
  .file-row:last-child { border-bottom:none; }
  .file-row:hover { background:var(--bg-2); }
  .file-icon { flex-shrink:0; }
  .file-name { font-size:13px; font-weight:500; color:var(--fg-1); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .file-meta { font-size:11px; color:var(--fg-3); margin-top:1px; }

  /* ── Responsive ──────────────────────────────────────────── */
  @media(max-width:1200px) { .stat-grid { grid-template-columns:repeat(2,1fr); } }
  @media(max-width:900px) { .split { grid-template-columns:1fr; } }
</style>
