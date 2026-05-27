<script lang="ts">
  import { auth } from '../auth.svelte';
  import { APP_URLS } from '../config';
  import type { Scene } from '../types';

  interface Props {
    scene: Scene;
    onAdmin: () => void;
    onDashboard: () => void;
  }
  let { scene, onAdmin, onDashboard }: Props = $props();

  const I = {
    grid:     `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>`,
    mail:     `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>`,
    cloud:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><path d="M17.5 19a4.5 4.5 0 1 0-1.4-8.78A6 6 0 1 0 6 14h11.5"/></svg>`,
    box:      `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><path d="M21 8 12 3 3 8v8l9 5 9-5z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>`,
    shield:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/></svg>`,
    settings: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"/></svg>`,
    logout:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/></svg>`,
    arrowUR:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" width="11" height="11"><path d="M7 17 17 7"/><path d="M8 7h9v9"/></svg>`,
    x:        `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
  };

  const apps = [
    { key:'mail',  label:'SOGo Mail', icon:'mail',  tile:'mail',  url: APP_URLS.mail  },
    { key:'cloud', label:'Nextcloud', icon:'cloud', tile:'cloud', url: APP_URLS.cloud },
    { key:'erp',   label:'Odoo ERP',  icon:'box',   tile:'erp',   url: APP_URLS.erp   },
  ] as const;

  let showAdmin = $derived(auth.profile.isAdmin || auth.profile.isTenantAdmin);

  // ── Settings modal ──────────────────────────────────────────
  let showSettings = $state(false);
  let settingsForm = $state({ newPassword: '', confirm: '' });
  let settingsMsg  = $state('');
  let settingsBusy = $state(false);

  async function changePassword() {
    if (settingsForm.newPassword !== settingsForm.confirm) {
      settingsMsg = 'Password baru tidak cocok'; return;
    }
    if (settingsForm.newPassword.length < 8) {
      settingsMsg = 'Password minimal 8 karakter'; return;
    }
    settingsBusy = true; settingsMsg = '';
    try {
      const res = await fetch('/api/admin/profile', {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ username: auth.profile.username, newPassword: settingsForm.newPassword }),
      });
      const d = await res.json();
      if (d.ok) {
        settingsMsg  = 'Password berhasil diubah';
        settingsForm = { newPassword: '', confirm: '' };
      } else {
        settingsMsg = 'Gagal: ' + (d.error ?? 'Unknown error');
      }
    } catch {
      settingsMsg = 'Koneksi gagal';
    }
    settingsBusy = false;
  }
</script>

<aside class="sidebar">
  <!-- TOP: Brand + Nav -->
  <div class="sb-top">
    <div class="sidebar-head">
      <div class="brand">
        <div class="brand-mark"></div>
        <div>
          <div class="brand-name">OPSID</div>
          <div class="brand-sub">{scene === 'admin' ? 'Admin Console' : 'Workspace'}</div>
        </div>
      </div>
    </div>

    <div class="nav-group" style="margin-top:18px">
      <button class="nav-item" aria-current={scene === 'dashboard'} onclick={onDashboard}>
        {@html I.grid} Dashboard
      </button>
    </div>

    <div class="nav-group">
      <div class="nav-label">Aplikasi Eksternal</div>
      {#each apps as a (a.key)}
        <a class="nav-item" href={a.url} target="_blank" rel="noopener">
          <span class="tile tile-sm tile-{a.tile}" style="width:24px;height:24px;border-radius:6px">
            {@html (I as any)[a.icon]}
          </span>
          {a.label}
          <span class="ext">{@html I.arrowUR}</span>
        </a>
      {/each}
    </div>
  </div>

  <!-- BOTTOM: Sistem + User -->
  <div class="sb-bot">
    <div class="nav-group" style="margin-top:0;padding-top:14px;border-top:1px solid var(--bd-1)">
      <div class="nav-label">Sistem</div>
      {#if showAdmin}
        <button class="nav-item" aria-current={scene === 'admin'} onclick={onAdmin} style="color:{scene === 'admin' ? 'var(--pri)' : '#A78BFA'}">
          {@html I.shield} Admin Console
        </button>
      {/if}
      <button class="nav-item" onclick={() => { showSettings = true; settingsMsg = ''; }}>
        {@html I.settings} Pengaturan
      </button>
      <button class="nav-item" onclick={() => auth.logout()} style="color:var(--danger)">
        {@html I.logout} Keluar
      </button>
    </div>
  </div>
</aside>

<!-- ── Modal: Pengaturan / Ganti Password ───────────────────── -->
{#if showSettings}
  <div class="modal-overlay" role="dialog" aria-modal="true" aria-label="Pengaturan Akun">
    <div class="modal" onclick={(e) => e.stopPropagation()}>
      <div class="modal-head">
        <h3>Pengaturan Akun</h3>
        <button class="btn-icon" onclick={() => showSettings = false} aria-label="Tutup">{@html I.x}</button>
      </div>
      <div class="modal-body">
        <p class="settings-title">Ganti Password</p>
        <div class="sfield">
          <label for="sb-new">Password Baru</label>
          <input id="sb-new" type="password" placeholder="Min 8 karakter" bind:value={settingsForm.newPassword} />
        </div>
        <div class="sfield">
          <label for="sb-confirm">Konfirmasi Password</label>
          <input id="sb-confirm" type="password" placeholder="Ulangi password baru" bind:value={settingsForm.confirm} />
        </div>
        {#if settingsMsg}
          <p class="smsg" class:ok={settingsMsg.includes('berhasil')}>{settingsMsg}</p>
        {/if}
      </div>
      <div class="modal-foot">
        <button class="btn btn-secondary" onclick={() => { showSettings = false; settingsMsg = ''; }}>Batal</button>
        <button class="btn btn-primary" onclick={changePassword} disabled={settingsBusy}>
          {settingsBusy ? 'Menyimpan...' : 'Simpan Password'}
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .sb-top { flex:1; overflow-y:auto; min-height:0; }
  .sb-top::-webkit-scrollbar { width:0; }
  .sb-bot { flex-shrink:0; }
  .ext { margin-left:auto; color:var(--fg-4); opacity:0; transition:opacity .12s; }
  .nav-item:hover .ext { opacity:1; }

  /* ── Modal ───────────────────────────────────────────────── */
  .modal-overlay { position:fixed; inset:0; background:rgba(0,0,0,.6); backdrop-filter:blur(8px); z-index:300; display:grid; place-items:center; padding:24px; }
  .modal { background:var(--bg-1); border:1px solid var(--bd-2); border-radius:18px; width:400px; max-width:100%; box-shadow:0 12px 40px -12px rgba(0,0,0,.7); }
  .modal-head { padding:20px 24px; border-bottom:1px solid var(--bd-1); display:flex; align-items:center; justify-content:space-between; }
  .modal-head h3 { font-size:16px; font-weight:600; margin:0; color:var(--fg-1); }
  .modal-body { padding:20px 24px; display:flex; flex-direction:column; gap:14px; }
  .modal-foot { padding:16px 24px; border-top:1px solid var(--bd-1); display:flex; justify-content:flex-end; gap:8px; }
  .settings-title { font-size:12px; font-weight:700; color:var(--fg-3); text-transform:uppercase; letter-spacing:.06em; margin:0; }
  .sfield { display:flex; flex-direction:column; gap:6px; }
  .sfield label { font-size:11px; font-weight:600; color:var(--fg-3); }
  .sfield input { background:var(--bg-2); border:1px solid var(--bd-2); border-radius:var(--r-md); padding:8px 12px; font-size:13px; color:var(--fg-1); font-family:inherit; outline:none; transition:border-color .15s; }
  .sfield input:focus { border-color:var(--pri); }
  .smsg { font-size:12px; color:var(--danger); margin:0; }
  .smsg.ok { color:var(--ok); }
</style>
