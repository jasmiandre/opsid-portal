<script lang="ts">
  interface Props {
    tenantId: number;
    tenantName: string;
    onClose: () => void;
  }
  let { tenantId, tenantName, onClose }: Props = $props();

  const I = {
    x:      `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
    plus:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><path d="M12 5v14M5 12h14"/></svg>`,
    lock:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" width="13" height="13"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>`,
    unlock: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" width="13" height="13"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 5.93-3.88"/></svg>`,
    key:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" width="13" height="13"><circle cx="7.5" cy="15.5" r="5.5"/><path d="m21 2-9.6 9.6"/><path d="m15.5 7.5 3 3L22 7l-3-3"/></svg>`,
    trash:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" width="13" height="13"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg>`,
  };

  interface TenantUser {
    username: string;
    name: string;
    email: string;
    role: string;
    status: string;
    dept: string;
  }

  let users    = $state<TenantUser[]>([]);
  let loading  = $state(true);
  let msg      = $state('');
  let busy     = $state(false);
  let view     = $state<'list' | 'add' | 'resetpw'>('list');
  let selected = $state<TenantUser | null>(null);

  let addForm = $state({ username: '', fullName: '', email: '', password: '', role: 'member' });
  let resetPw = $state({ value: '' });

  async function loadUsers() {
    loading = true;
    try {
      const res = await fetch(`/api/admin/tenant/${tenantId}/users`);
      const d = await res.json();
      if (d.ok) users = d.users;
      else msg = d.error ?? 'Gagal memuat users';
    } catch { msg = 'Koneksi gagal'; }
    loading = false;
  }

  async function addUser() {
    if (!addForm.username || !addForm.fullName || !addForm.email || !addForm.password) {
      msg = 'Semua field wajib diisi'; return;
    }
    busy = true; msg = '';
    try {
      const res = await fetch(`/api/admin/tenant/${tenantId}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(addForm),
      });
      const d = await res.json();
      if (d.ok) {
        view = 'list';
        addForm = { username: '', fullName: '', email: '', password: '', role: 'member' };
        await loadUsers();
      } else {
        msg = d.error ?? 'Gagal menambahkan user';
      }
    } catch { msg = 'Koneksi gagal'; }
    busy = false;
  }

  async function doAction(username: string, action: string, extra: Record<string, any> = {}) {
    busy = true; msg = '';
    try {
      const res = await fetch(`/api/admin/tenant/${tenantId}/users/${encodeURIComponent(username)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...extra }),
      });
      const d = await res.json();
      if (d.ok) {
        msg = `Berhasil: ${action}`;
        view = 'list'; selected = null;
        await loadUsers();
      } else {
        msg = d.error ?? 'Aksi gagal';
      }
    } catch { msg = 'Koneksi gagal'; }
    busy = false;
  }

  async function removeUser(username: string) {
    if (!confirm(`Hapus ${username} dari tenant ini?`)) return;
    busy = true; msg = '';
    try {
      const res = await fetch(`/api/admin/tenant/${tenantId}/users/${encodeURIComponent(username)}`, { method: 'DELETE' });
      const d = await res.json();
      if (d.ok) { msg = 'User dihapus dari tenant'; await loadUsers(); }
      else msg = d.error ?? 'Gagal menghapus';
    } catch { msg = 'Koneksi gagal'; }
    busy = false;
  }

  function initials(name: string) {
    return name.split(' ').slice(0,2).map(w => w[0]).join('').toUpperCase() || '??';
  }

  $effect(() => { void tenantId; loadUsers(); });
</script>

<div class="modal-overlay" role="dialog" aria-modal="true" aria-label="Kelola User Tenant">
  <div class="modal" onclick={(e) => e.stopPropagation()}>
    <div class="modal-head">
      <div>
        <h3>Kelola User — {tenantName}</h3>
        {#if view !== 'list'}
          <button class="back-link" onclick={() => { view = 'list'; msg = ''; }}>← Kembali ke daftar</button>
        {/if}
      </div>
      <button class="btn-icon" onclick={onClose} aria-label="Tutup">{@html I.x}</button>
    </div>

    {#if view === 'list'}
      <div class="modal-toolbar">
        <span class="user-count">{users.length} user</span>
        <button class="btn btn-primary btn-sm" onclick={() => { view = 'add'; msg = ''; }}>
          {@html I.plus} Tambah User
        </button>
      </div>

      <div class="user-list">
        {#if loading}
          <div class="empty">Memuat users…</div>
        {:else if users.length === 0}
          <div class="empty">Belum ada user di tenant ini.<br><small>Klik "Tambah User" untuk menambahkan.</small></div>
        {:else}
          {#each users as u (u.username)}
            <div class="user-row">
              <div class="av-sm">{initials(u.name)}</div>
              <div class="user-info">
                <div class="uname">{u.name}</div>
                <div class="udetail mono">{u.username} · {u.email}</div>
              </div>
              <div class="user-meta">
                <select
                  class="role-select"
                  value={u.role}
                  onchange={(e) => doAction(u.username, 'set_role', { role: (e.target as HTMLSelectElement).value })}
                >
                  <option value="member">Member</option>
                  <option value="org-admin">Org Admin</option>
                </select>
                <span class="status-dot" class:active={u.status === 'active'} title={u.status}></span>
              </div>
              <div class="user-actions">
                {#if u.status === 'active'}
                  <button class="btn btn-ghost btn-xs" title="Suspend" onclick={() => doAction(u.username, 'suspend')}>
                    {@html I.lock}
                  </button>
                {:else}
                  <button class="btn btn-ghost btn-xs" title="Aktifkan" onclick={() => doAction(u.username, 'activate')} style="color:var(--ok)">
                    {@html I.unlock}
                  </button>
                {/if}
                <button class="btn btn-ghost btn-xs" title="Reset Password" onclick={() => { selected = u; resetPw = { value: '' }; view = 'resetpw'; msg = ''; }}>
                  {@html I.key}
                </button>
                <button class="btn btn-ghost btn-xs" title="Hapus dari tenant" style="color:var(--danger)" onclick={() => removeUser(u.username)}>
                  {@html I.trash}
                </button>
              </div>
            </div>
          {/each}
        {/if}
      </div>

    {:else if view === 'add'}
      <div class="modal-body">
        <div class="form-grid">
          <div class="field">
            <label for="tu-uid">Username</label>
            <input id="tu-uid" placeholder="budi.santoso" bind:value={addForm.username} />
          </div>
          <div class="field">
            <label for="tu-name">Nama Lengkap</label>
            <input id="tu-name" placeholder="Budi Santoso" bind:value={addForm.fullName} />
          </div>
          <div class="field">
            <label for="tu-email">Email</label>
            <input id="tu-email" type="email" placeholder="budi@domain.co.id" bind:value={addForm.email} />
          </div>
          <div class="field">
            <label for="tu-pass">Password Awal</label>
            <input id="tu-pass" type="password" placeholder="Min 8 karakter" bind:value={addForm.password} />
          </div>
          <div class="field">
            <label for="tu-role">Role</label>
            <select id="tu-role" bind:value={addForm.role}>
              <option value="member">Member</option>
              <option value="org-admin">Org Admin</option>
            </select>
          </div>
        </div>
        {#if msg}<p class="smsg" class:ok={msg.includes('Berhasil')}>{msg}</p>{/if}
      </div>
      <div class="modal-foot">
        <button class="btn btn-secondary" onclick={() => { view = 'list'; msg = ''; }}>Batal</button>
        <button class="btn btn-primary" onclick={addUser} disabled={busy}>
          {busy ? 'Membuat…' : 'Buat User'}
        </button>
      </div>

    {:else if view === 'resetpw'}
      <div class="modal-body">
        <p style="font-size:13px;color:var(--fg-2)">Reset password untuk <strong>{selected?.username}</strong>.</p>
        <div class="field">
          <label for="tu-newpw">Password Baru</label>
          <input id="tu-newpw" type="password" placeholder="Min 8 karakter" bind:value={resetPw.value} />
        </div>
        {#if msg}<p class="smsg" class:ok={msg.includes('Berhasil')}>{msg}</p>{/if}
      </div>
      <div class="modal-foot">
        <button class="btn btn-secondary" onclick={() => { view = 'list'; msg = ''; }}>Batal</button>
        <button class="btn btn-primary" onclick={() => doAction(selected!.username, 'reset_password', { newPassword: resetPw.value })} disabled={busy}>
          {busy ? 'Menyimpan…' : 'Reset Password'}
        </button>
      </div>
    {/if}

    {#if msg && view === 'list'}
      <div class="toast" class:ok={msg.includes('Berhasil')}>{msg}</div>
    {/if}
  </div>
</div>

<style>
  .modal-overlay { position:fixed; inset:0; background:rgba(0,0,0,.6); backdrop-filter:blur(8px); z-index:400; display:grid; place-items:center; padding:24px; }
  .modal { background:var(--bg-1); border:1px solid var(--bd-2); border-radius:18px; width:680px; max-width:100%; max-height:80vh; box-shadow:0 20px 60px -20px rgba(0,0,0,.8); display:flex; flex-direction:column; overflow:hidden; }

  .modal-head { padding:18px 24px; border-bottom:1px solid var(--bd-1); display:flex; align-items:flex-start; justify-content:space-between; gap:14px; flex-shrink:0; }
  .modal-head h3 { font-size:15px; font-weight:600; margin:0; color:var(--fg-1); }
  .back-link { font-size:11px; color:var(--pri); background:none; border:none; cursor:pointer; padding:0; margin-top:4px; font-family:inherit; }

  .modal-toolbar { display:flex; align-items:center; justify-content:space-between; padding:12px 24px; border-bottom:1px solid var(--bd-1); flex-shrink:0; }
  .user-count { font-size:12px; color:var(--fg-4); }

  .user-list { flex:1; overflow-y:auto; }
  .user-row { display:flex; align-items:center; gap:12px; padding:12px 20px; border-bottom:1px solid color-mix(in srgb, var(--bd-1) 60%, transparent); transition:.12s; }
  .user-row:last-child { border-bottom:none; }
  .user-row:hover { background:var(--bg-2); }

  .av-sm { width:34px; height:34px; border-radius:50%; background:var(--pri); color:#fff; font-size:12px; font-weight:700; display:grid; place-items:center; flex-shrink:0; }
  .user-info { flex:1; min-width:0; }
  .uname { font-size:13px; font-weight:500; color:var(--fg-1); }
  .udetail { font-size:11px; color:var(--fg-4); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }

  .user-meta { display:flex; align-items:center; gap:8px; flex-shrink:0; }
  .role-select { background:var(--bg-2); border:1px solid var(--bd-2); border-radius:var(--r-md); padding:4px 8px; font-size:11px; color:var(--fg-2); font-family:inherit; outline:none; cursor:pointer; }
  .status-dot { width:8px; height:8px; border-radius:50%; background:var(--danger); }
  .status-dot.active { background:var(--ok); }

  .user-actions { display:flex; gap:4px; flex-shrink:0; }
  .btn-xs { padding:4px 8px !important; }

  .modal-body { padding:20px 24px; display:flex; flex-direction:column; gap:12px; }
  .modal-foot { padding:14px 24px; border-top:1px solid var(--bd-1); display:flex; justify-content:flex-end; gap:8px; flex-shrink:0; }

  .form-grid { display:grid; grid-template-columns:repeat(2,1fr); gap:12px; }
  .field { display:flex; flex-direction:column; gap:5px; }
  .field label { font-size:11px; font-weight:600; color:var(--fg-3); text-transform:uppercase; letter-spacing:.04em; }
  .field input, .field select { background:var(--bg-2); border:1px solid var(--bd-2); border-radius:var(--r-md); padding:7px 10px; font-size:13px; color:var(--fg-1); font-family:inherit; outline:none; transition:border-color .15s; }
  .field input:focus, .field select:focus { border-color:var(--pri); }

  .empty { padding:40px 24px; text-align:center; color:var(--fg-3); font-size:13px; line-height:1.8; }
  .smsg { font-size:12px; color:var(--danger); margin:0; }
  .smsg.ok { color:var(--ok); }

  .toast { margin:0 24px 16px; padding:10px 14px; border-radius:var(--r-md); font-size:12px; background:var(--bg-2); color:var(--fg-2); border:1px solid var(--bd-2); text-align:center; flex-shrink:0; }
  .toast.ok { background:rgba(52,211,153,.1); color:var(--ok); border-color:rgba(52,211,153,.25); }
</style>
