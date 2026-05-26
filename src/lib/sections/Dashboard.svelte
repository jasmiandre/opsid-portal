<script lang="ts">
  import { auth } from '../auth.svelte';
  import { APP_URLS } from '../config';
  import { onMount } from 'svelte';

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
  };

  const apps = [
    { key:'mail',  tile:'mail',  ic:'mail',  name:'SOGo Mail', url: APP_URLS.mail  },
    { key:'cloud', tile:'cloud', ic:'cloud', name:'Nextcloud', url: APP_URLS.cloud },
    { key:'erp',   tile:'erp',  ic:'box',   name:'Odoo ERP',  url: APP_URLS.erp   },
  ];

  const recentFiles = [
    { name:'Proposal_Project.docx', type:'docx', meta:'Diubah oleh kamu', time:'2 mnt lalu' },
    { name:'Invoice_2024.pdf',      type:'pdf',  meta:'Dibagikan Mira',   time:'1 jam lalu' },
    { name:'Laporan_Keuangan.xlsx', type:'xlsx', meta:'3 editor aktif',   time:'3 jam lalu' },
    { name:'Presentasi_Q1.pptx',   type:'pptx', meta:'Diubah arastan',   time:'Kemarin'    },
  ];

  const agenda = [
    { time:'10:00', title:'Stand-up infra · 15 menit', meta:'9 peserta · Meet', color:'var(--pri)' },
    { time:'13:30', title:'Review onboarding SHLL',     meta:'Mira, Bagas',      color:'var(--ok)'  },
    { time:'16:00', title:'Sprint demo internal',        meta:'Tim portal',       color:'var(--warm)'},
  ];

  let storageUsers   = $state<any[]>([]);
  let inboxData      = $state({ unseen: 0, total: 0, ok: false });
  let inboxMessages  = $state<any[]>([]);
  let odooData       = $state({ crm:{ leads:0 }, hr:{ employees:0 }, calendar:{ today:0 }, ok:false });
  let loading        = $state(true);

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

  onMount(async () => {
    const username = auth.profile.username || 'jasmiandre';
    const [quotaRes, inboxRes, odooRes] = await Promise.allSettled([
      fetch('/api/nextcloud/quota').then(r => r.json()),
      fetch(`/api/sogo/inbox?user=${username}`).then(r => r.json()),
      fetch('/api/odoo/stats').then(r => r.json()),
    ]);
    if (quotaRes.status === 'fulfilled') {
      const all = quotaRes.value;
      const me = all.find((u: any) => u.name === username);
      storageUsers = me ? [me] : all.slice(0,1);
    }
    if (inboxRes.status === 'fulfilled') {
      inboxData     = inboxRes.value;
      inboxMessages = inboxRes.value.messages || [];
    }
    if (odooRes.status === 'fulfilled') {
      odooData = odooRes.value;
    }
    loading = false;
  });
</script>

<div class="main">
  <header class="topbar">
    <div class="crumb">
      <strong>Ringkasan hari ini</strong>
      <span style="color:var(--fg-5)">·</span>
      <span>{dateStr()}</span>
    </div>
    <div class="topbar-right">
      <button class="btn-icon btn-ghost" style="position:relative">
        {@html I.bell}
        <span class="notif-dot"></span>
      </button>
      <button class="userchip">
        <div style="display:flex;flex-direction:column;align-items:flex-end">
          <span class="uc-name">{greeting()}, {auth.profile.firstName}</span>
          <span class="uc-role">{auth.profile.email}</span>
        </div>
        <div class="av">{auth.profile.initials}</div>
      </button>
    </div>
  </header>

  <div class="main-pad">
    <div class="page-head">
      <div>
        <div class="page-h1">{greeting()}, {auth.profile.firstName}.</div>
        <div class="page-sub">{apps.length} aplikasi terhubung · {inboxData.unseen} email belum dibaca · {agenda.length} jadwal hari ini</div>
      </div>
      <button class="btn btn-primary btn-sm" onclick={() => openApp(APP_URLS.mail)}>
        {@html I.mail} Buka Inbox
      </button>
    </div>

    <!-- STAT CARDS -->
    <div class="stat-grid">
      <div class="stat-card">
        <div class="stat-card-head">
          <span class="stat-label">Nextcloud Storage</span>
          <span class="stat-icon" style="background:var(--pri-soft);color:var(--pri)">{@html I.cloud}</span>
        </div>
        {#each storageUsers.slice(0,1) as u}
          <div class="stat-val">{fmtStorage(u.used)}</div>
          <div class="stat-sub">dari kuota {u.quota} GB</div>
          <div class="prog-bar"><div class="prog-fill" style="width:{Math.min(u.used/u.quota*100,100).toFixed(1)}%;background:var(--pri)"></div></div>
          <div class="stat-sub" style="color:{storageColor(u.used/u.quota*100)}">{(u.used/u.quota*100).toFixed(1)}% terpakai</div>
        {:else}
          <div class="stat-val">–</div>
          <div class="stat-sub">{loading ? 'Memuat...' : 'Tidak ada data'}</div>
        {/each}
      </div>

      <div class="stat-card">
        <div class="stat-card-head">
          <span class="stat-label">Email (SOGo)</span>
          <span class="stat-icon" style="background:rgba(224,179,65,.13);color:var(--warn)">{@html I.mail}</span>
        </div>
        <div class="stat-val">{inboxData.unseen}</div>
        <div class="stat-sub">pesan belum dibaca</div>
        <div style="display:flex;gap:6px;margin-top:6px">
          <span class="tag tag-pri">{inboxData.total} total</span>
          <span class="tag {inboxData.ok ? 'tag-ok' : ''}">{inboxData.ok ? 'Inbox aktif' : loading ? 'Memuat...' : 'Offline'}</span>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-card-head">
          <span class="stat-label">Karyawan (Odoo)</span>
          <span class="stat-icon" style="background:rgba(139,92,246,.13);color:#A78BFA">{@html I.users}</span>
        </div>
        <div class="stat-val">{odooData.hr.employees}</div>
        <div class="stat-sub">karyawan aktif</div>
        <div style="display:flex;gap:6px;margin-top:6px">
          <span class="tag tag-ok">{odooData.crm.leads} leads CRM</span>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-card-head">
          <span class="stat-label">Storage Dipakai</span>
          <span class="stat-icon" style="background:var(--ok-soft);color:var(--ok)">{@html I.db}</span>
        </div>
        {#each storageUsers.slice(0,1) as u}
          {@const pct = Math.round(u.used/u.quota*100)}
          <div class="stat-val" style="color:{storageColor(pct)}">{pct}%</div>
          <div class="stat-sub">{u.display || u.name} · {u.quota} GB kuota</div>
          <div class="prog-bar"><div class="prog-fill" style="width:{pct}%;background:{storageColor(pct)}"></div></div>
        {:else}
          <div class="stat-val">–</div>
        {/each}
      </div>
    </div>

    <!-- QUICK ACCESS -->
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

    <!-- EMAIL + CALENDAR -->
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
              <div class="inbox-row{m.unread ? ' unread' : ''}">
                <span class="unread-dot" class:visible={m.unread}></span>
                <div style="flex:1;min-width:0">
                  <div class="from">{m.from.split(" ").slice(0,3).join(" ")}</div>
                  <div class="subj">{#if m.unread}<b>{m.subj}</b>{:else}{m.subj}{/if}</div>
                </div>
                <span class="time">{m.time}</span>
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
          <div style="padding:12px 18px;border-top:1px solid var(--bd-1);font-size:11px;color:var(--fg-4)" class="mono">
            Sinkronisasi via CalDAV · mail.opsid.web.id
          </div>
        </div>
      </div>
    </div>

    <!-- RECENT FILES -->
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
            <span class="time">{f.time}</span>
          </button>
        {/each}
      </div>
    </div>
  </div>
</div>

<style>
  .main { display:flex; flex-direction:column; flex:1; overflow:hidden; min-height:0; background:var(--bg-0); }
  .topbar { display:flex; align-items:center; justify-content:space-between; padding:12px 24px; border-bottom:1px solid var(--bd-1); background:var(--bg-1); flex-shrink:0; }
  .crumb { display:flex; align-items:center; gap:8px; font-size:13px; color:var(--fg-3); }
  .crumb strong { color:var(--fg-1); font-weight:600; }
  .topbar-right { display:flex; align-items:center; gap:8px; }
  .notif-dot { position:absolute; top:6px; right:6px; width:7px; height:7px; border-radius:50%; background:var(--danger); border:2px solid var(--bg-1); }
  .userchip { display:flex; align-items:center; gap:10px; padding:6px 10px; border-radius:8px; border:1px solid var(--bd-1); background:var(--bg-2); transition:.15s; }
  .userchip:hover { border-color:var(--bd-2); background:var(--bg-3); }
  .uc-name { font-size:12px; font-weight:500; color:var(--fg-1); }
  .uc-role { font-size:11px; color:var(--fg-3); }
  .av { width:28px; height:28px; border-radius:50%; background:var(--pri); color:#fff; font-size:11px; font-weight:700; display:grid; place-items:center; flex-shrink:0; }
  .main-pad { flex:1; overflow-y:auto; padding:24px; display:flex; flex-direction:column; gap:20px; max-width:1200px; margin:0 auto; width:100%; }
  .page-head { display:flex; align-items:flex-start; justify-content:space-between; gap:16px; }
  .page-h1 { font-size:22px; font-weight:700; color:var(--fg-1); letter-spacing:-.02em; }
  .page-sub { font-size:13px; color:var(--fg-3); margin-top:4px; }
  .stat-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:14px; }
  .stat-card { background:var(--bg-1); border:1px solid var(--bd-1); border-radius:var(--r-lg); padding:16px 18px; display:flex; flex-direction:column; gap:8px; transition:.15s; }
  .stat-card:hover { border-color:var(--bd-2); }
  .stat-card-head { display:flex; align-items:center; justify-content:space-between; }
  .stat-label { font-size:11px; font-weight:600; color:var(--fg-3); text-transform:uppercase; letter-spacing:.08em; }
  .stat-icon { width:32px; height:32px; border-radius:8px; display:grid; place-items:center; flex-shrink:0; }
  .stat-val { font-size:28px; font-weight:700; color:var(--fg-1); letter-spacing:-.03em; line-height:1; }
  .stat-sub { font-size:12px; color:var(--fg-3); }
  .prog-bar { height:4px; background:var(--bg-3); border-radius:2px; overflow:hidden; }
  .prog-fill { height:100%; border-radius:2px; transition:width .5s ease; }
  .split { display:grid; grid-template-columns:1fr 1fr; gap:14px; }
  .quick-row { display:flex; gap:12px; padding:20px 18px; }
  .quick-tile { display:flex; flex-direction:column; align-items:center; justify-content:center; gap:12px; padding:28px 20px; border-radius:14px; border:1px solid var(--bd-1); background:var(--bg-2); cursor:pointer; transition:.15s; flex:1; min-height:120px; }
  .quick-tile:hover { background:var(--bg-3); border-color:var(--pri-bd); transform:translateY(-2px); }
  .quick-label { font-size:12px; font-weight:500; color:var(--fg-2); }
  .inbox-row { display:flex; align-items:flex-start; gap:10px; padding:11px 18px; border-bottom:1px solid var(--bd-1); transition:.12s; cursor:pointer; }
  .inbox-row:last-child { border-bottom:none; }
  .inbox-row:hover { background:var(--bg-2); }
  .unread-dot { width:7px; height:7px; border-radius:50%; background:transparent; border:1px solid var(--bd-2); flex-shrink:0; margin-top:4px; }
  .unread-dot.visible { background:var(--pri); border-color:var(--pri); }
  .from { font-size:12.5px; font-weight:500; color:var(--fg-1); }
  .subj { font-size:12px; color:var(--fg-3); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; margin-top:1px; }
  .time { font-size:11px; color:var(--fg-4); flex-shrink:0; margin-top:2px; }
  .empty-state { padding:32px; text-align:center; color:var(--fg-3); font-size:13px; }
  .agenda-row { display:flex; align-items:flex-start; gap:12px; padding:11px 18px; border-bottom:1px solid var(--bd-1); }
  .agenda-row:last-child { border-bottom:none; }
  .agenda-time { font-size:11px; color:var(--fg-3); width:40px; flex-shrink:0; padding-top:2px; font-family:'Geist Mono',monospace; }
  .agenda-bar { width:3px; border-radius:2px; min-height:36px; flex-shrink:0; align-self:stretch; }
  .agenda-title { font-size:13px; font-weight:500; color:var(--fg-1); }
  .agenda-meta { font-size:11px; color:var(--fg-3); margin-top:2px; }
  .file-row { display:flex; align-items:center; gap:12px; padding:10px 18px; border-bottom:1px solid var(--bd-1); width:100%; text-align:left; transition:.12s; background:none; border-left:none; border-right:none; border-top:none; border-radius:0; cursor:pointer; }
  .file-row:last-child { border-bottom:none; }
  .file-row:hover { background:var(--bg-2); }
  .file-icon { flex-shrink:0; }
  .file-name { font-size:13px; font-weight:500; color:var(--fg-1); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .file-meta { font-size:11px; color:var(--fg-3); margin-top:1px; }
  .panel-title { display:flex; align-items:center; gap:6px; font-size:11px; font-weight:600; color:var(--fg-3); letter-spacing:.1em; text-transform:uppercase; }
</style>
