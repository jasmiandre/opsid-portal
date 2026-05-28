<script lang="ts">
  import { auth } from '../auth.svelte';
  import { ui } from '../ui.svelte';

  const I = {
    x:      `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
    user:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>`,
    lock:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>`,
    building:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><rect x="4" y="3" width="16" height="18" rx="1.5"/><path d="M9 21V12h6v9"/><path d="M9 7h2M13 7h2M9 10h2M13 10h2"/></svg>`,
  };

  // ── Password change ─────────────────────────────────────────
  let pwForm = $state({ newPassword: '', confirm: '' });
  let pwMsg   = $state('');
  let pwBusy  = $state(false);

  function resetPw() { pwForm = { newPassword: '', confirm: '' }; pwMsg = ''; }

  async function changePassword() {
    if (pwForm.newPassword !== pwForm.confirm) { pwMsg = 'Password baru tidak cocok'; return; }
    if (pwForm.newPassword.length < 8) { pwMsg = 'Password minimal 8 karakter'; return; }
    pwBusy = true; pwMsg = '';
    try {
      const res = await fetch('/api/admin/profile', {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ username: auth.profile.username, newPassword: pwForm.newPassword }),
      });
      const d = await res.json();
      if (d.ok) {
        pwMsg  = 'Password berhasil diubah';
        pwForm = { newPassword: '', confirm: '' };
      } else {
        pwMsg = 'Gagal: ' + (d.error ?? 'Unknown error');
      }
    } catch { pwMsg = 'Koneksi gagal'; }
    pwBusy = false;
  }

  function close() { ui.closeProfile(); resetPw(); }

  const tabs = [
    { id: 'profil',      label: 'Profil',      icon: 'user'     },
    { id: 'keamanan',    label: 'Keamanan',    icon: 'lock'     },
    { id: 'organisasi',  label: 'Organisasi',  icon: 'building' },
  ] as const;

  function roleLabel() {
    if (auth.profile.isAdmin)       return 'Superadmin';
    if (auth.profile.isTenantAdmin) return 'Tenant Admin';
    return 'User';
  }
</script>

{#if ui.showProfileModal}
  <div class="modal-overlay" role="dialog" aria-modal="true" aria-label="Profil & Pengaturan" onclick={close}>
    <div class="modal" onclick={(e) => e.stopPropagation()}>
      <!-- Head -->
      <div class="modal-head">
        <div class="head-info">
          <div class="av-lg">{auth.profile.initials}</div>
          <div>
            <div class="head-name">{auth.profile.fullName}</div>
            <div class="head-sub">{auth.profile.email}</div>
          </div>
        </div>
        <button class="btn-icon" onclick={close} aria-label="Tutup">{@html I.x}</button>
      </div>

      <!-- Tab bar -->
      <div class="tab-bar">
        {#each tabs as t}
          <button
            class="tab-btn"
            class:active={ui.profileTab === t.id}
            onclick={() => ui.profileTab = t.id}
          >
            {@html (I as any)[t.icon]} {t.label}
          </button>
        {/each}
      </div>

      <!-- ── Profil ──────────────────────────────────────────── -->
      {#if ui.profileTab === 'profil'}
        <div class="modal-body">
          <div class="pf-row"><span class="pf-label">Nama Lengkap</span><span class="pf-val">{auth.profile.fullName}</span></div>
          <div class="pf-row"><span class="pf-label">Username</span><code class="pf-val mono">{auth.profile.username}</code></div>
          <div class="pf-row"><span class="pf-label">Email</span><span class="pf-val">{auth.profile.email}</span></div>
          <div class="pf-row">
            <span class="pf-label">Role</span>
            <span class="pf-val">
              <span class="role-chip" class:admin={auth.profile.isAdmin} class:tenant={auth.profile.isTenantAdmin}>
                {roleLabel()}
              </span>
            </span>
          </div>
          {#if auth.profile.tenantName}
            <div class="pf-row"><span class="pf-label">Organisasi</span><span class="pf-val">{auth.profile.tenantName}</span></div>
          {/if}
          {#if auth.profile.tenantDomain}
            <div class="pf-row"><span class="pf-label">Domain</span><code class="pf-val mono">{auth.profile.tenantDomain}</code></div>
          {/if}
        </div>
        <div class="modal-foot">
          <button class="btn btn-secondary" onclick={close}>Tutup</button>
        </div>

      <!-- ── Keamanan ────────────────────────────────────────── -->
      {:else if ui.profileTab === 'keamanan'}
        <div class="modal-body">
          <p class="section-title">Ganti Password</p>
          <div class="sfield">
            <label for="pm-new">Password Baru</label>
            <input id="pm-new" type="password" placeholder="Min 8 karakter" bind:value={pwForm.newPassword} />
          </div>
          <div class="sfield">
            <label for="pm-confirm">Konfirmasi Password</label>
            <input id="pm-confirm" type="password" placeholder="Ulangi password baru" bind:value={pwForm.confirm} />
          </div>
          {#if pwMsg}
            <p class="smsg" class:ok={pwMsg.includes('berhasil')}>{pwMsg}</p>
          {/if}
        </div>
        <div class="modal-foot">
          <button class="btn btn-secondary" onclick={close}>Batal</button>
          <button class="btn btn-primary" onclick={changePassword} disabled={pwBusy}>
            {pwBusy ? 'Menyimpan...' : 'Simpan Password'}
          </button>
        </div>

      <!-- ── Organisasi ──────────────────────────────────────── -->
      {:else if ui.profileTab === 'organisasi'}
        <div class="modal-body">
          {#if auth.profile.tenantName}
            <div class="pf-row"><span class="pf-label">Organisasi</span><span class="pf-val">{auth.profile.tenantName}</span></div>
            <div class="pf-row"><span class="pf-label">Slug</span><code class="pf-val mono">{auth.profile.organizationSlug}</code></div>
            <div class="pf-row"><span class="pf-label">Domain</span><code class="pf-val mono">{auth.profile.tenantDomain}</code></div>
            <div class="divider"></div>
            <p class="section-title">Kuota Layanan</p>
            <div class="quota-row">
              <div class="quota-item">
                <div class="quota-label">Nextcloud</div>
                <div class="quota-val">{auth.profile.planNextcloudGb} GB</div>
              </div>
              <div class="quota-item">
                <div class="quota-label">Email</div>
                <div class="quota-val">{auth.profile.planEmailGb} GB</div>
              </div>
              <div class="quota-item">
                <div class="quota-label">Odoo ERP</div>
                <div class="quota-val">{auth.profile.planOdooGb} GB</div>
              </div>
            </div>
          {:else if auth.profile.isAdmin}
            <div class="empty-org">
              <p>Anda adalah <strong>Superadmin OPSID</strong>.</p>
              <p style="color:var(--fg-4);font-size:12px;margin-top:4px">Superadmin mengelola semua tenant dari Admin Console.</p>
            </div>
          {:else}
            <div class="empty-org">
              <p style="color:var(--fg-3)">Akun Anda belum terdaftar di organisasi manapun.</p>
            </div>
          {/if}
        </div>
        <div class="modal-foot">
          <button class="btn btn-secondary" onclick={close}>Tutup</button>
        </div>
      {/if}
    </div>
  </div>
{/if}

<style>
  .modal-overlay { position:fixed; inset:0; background:rgba(0,0,0,.6); backdrop-filter:blur(8px); z-index:500; display:grid; place-items:center; padding:24px; }
  .modal { background:var(--bg-1); border:1px solid var(--bd-2); border-radius:18px; width:460px; max-width:100%; box-shadow:0 20px 60px -20px rgba(0,0,0,.8); display:flex; flex-direction:column; }

  .modal-head { padding:20px 24px; border-bottom:1px solid var(--bd-1); display:flex; align-items:center; justify-content:space-between; gap:14px; }
  .head-info { display:flex; align-items:center; gap:14px; min-width:0; }
  .av-lg { width:48px; height:48px; border-radius:50%; background:var(--pri); color:#fff; font-size:17px; font-weight:700; display:grid; place-items:center; flex-shrink:0; }
  .head-name { font-size:15px; font-weight:600; color:var(--fg-1); }
  .head-sub { font-size:12px; color:var(--fg-4); margin-top:2px; }

  .tab-bar { display:flex; padding:8px 16px; gap:2px; border-bottom:1px solid var(--bd-1); }
  .tab-btn { display:flex; align-items:center; gap:6px; padding:7px 14px; border-radius:var(--r-md); font-size:12px; font-weight:500; color:var(--fg-3); background:none; border:none; cursor:pointer; font-family:inherit; transition:all .15s; }
  .tab-btn:hover { color:var(--fg-2); background:var(--bg-2); }
  .tab-btn.active { color:var(--fg-1); background:var(--bg-2); }

  .modal-body { padding:20px 24px; display:flex; flex-direction:column; gap:12px; flex:1; }
  .modal-foot { padding:14px 24px; border-top:1px solid var(--bd-1); display:flex; justify-content:flex-end; gap:8px; }

  .pf-row { display:flex; justify-content:space-between; align-items:center; gap:12px; padding:8px 0; border-bottom:1px solid color-mix(in srgb, var(--bd-1) 50%, transparent); }
  .pf-row:last-child { border-bottom:none; }
  .pf-label { font-size:11px; font-weight:600; color:var(--fg-4); text-transform:uppercase; letter-spacing:.05em; flex-shrink:0; }
  .pf-val { font-size:13px; color:var(--fg-1); text-align:right; }

  .role-chip { padding:2px 10px; border-radius:20px; font-size:11px; font-weight:500; background:var(--bg-3); color:var(--fg-2); border:1px solid var(--bd-2); }
  .role-chip.admin { color:#A78BFA; background:rgba(167,139,250,.1); border-color:rgba(167,139,250,.25); }
  .role-chip.tenant { color:#60A5FA; background:rgba(96,165,250,.1); border-color:rgba(96,165,250,.25); }

  .section-title { font-size:11px; font-weight:700; color:var(--fg-3); text-transform:uppercase; letter-spacing:.06em; margin:0; }
  .divider { border:none; border-top:1px solid var(--bd-1); margin:4px 0; }

  .sfield { display:flex; flex-direction:column; gap:6px; }
  .sfield label { font-size:11px; font-weight:600; color:var(--fg-3); }
  .sfield input { background:var(--bg-2); border:1px solid var(--bd-2); border-radius:var(--r-md); padding:8px 12px; font-size:13px; color:var(--fg-1); font-family:inherit; outline:none; transition:border-color .15s; }
  .sfield input:focus { border-color:var(--pri); }
  .smsg { font-size:12px; color:var(--danger); margin:0; }
  .smsg.ok { color:var(--ok); }

  .quota-row { display:grid; grid-template-columns:repeat(3,1fr); gap:10px; }
  .quota-item { background:var(--bg-2); border-radius:var(--r-md); padding:12px; text-align:center; }
  .quota-label { font-size:10px; font-weight:600; color:var(--fg-4); text-transform:uppercase; letter-spacing:.05em; }
  .quota-val { font-size:18px; font-weight:700; color:var(--fg-1); margin-top:4px; }

  .empty-org { padding:24px; text-align:center; font-size:13px; color:var(--fg-2); }
</style>
