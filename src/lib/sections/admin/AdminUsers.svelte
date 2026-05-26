<script lang="ts">
  import { onMount } from 'svelte';

  interface User {
    username: string;
    name: string;
    email: string;
    dept: string;
    role: string;
    status: string;
  }

  const I = {
    plus:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><path d="M12 5v14M5 12h14"/></svg>`,
    search: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>`,
    edit:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 1 1 3 3L7 19l-4 1 1-4Z"/></svg>`,
    trash:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>`,
    close:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><path d="M18 6 6 18M6 6l12 12"/></svg>`,
    bell:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><path d="M6 8a6 6 0 1 1 12 0c0 7 3 7 3 9H3c0-2 3-2 3-9Z"/><path d="M10 21a2 2 0 0 0 4 0"/></svg>`,
  };

  let users = $state<User[]>([]);
  let loading = $state(true);
  let error = $state('');
  let query = $state('');
  let showModal = $state(false);
  let isEdit = $state(false);
  let saving = $state(false);
  let saveMsg = $state('');
  let saveError = $state('');
  let activeTab = $state('users');
  let tenants = $state([]);
  let tenantsLoading = $state(true);
  let showAddTenant = $state(false);
  let tenantSaving = $state(false);
  let tenantMsg = $state('');
  let tenantErr = $state('');
  let tenantForm = $state({ name:'', slug:'', primaryColor:'#3B82F6', logoUrl:'', useCustomDomain:false, domain:'', planNextcloudGb:50, planEmailGb:50, planOdooGb:50 });

  let form = $state({
    username: '', name: '', email: '',
    dept: '', role: 'Staff', password: ''
  });

  let filtered = $derived(
    users.filter(u =>
      !query ||
      u.name.toLowerCase().includes(query.toLowerCase()) ||
      u.username.toLowerCase().includes(query.toLowerCase()) ||
      u.email.toLowerCase().includes(query.toLowerCase())
    )
  );

  onMount(async () => { await Promise.all([fetchUsers(), fetchTenants()]); });

  async function fetchUsers() {
    loading = true;
    error = '';
    try {
      const res = await fetch('/api/users');
      const data = await res.json();
      if (data.success) users = data.users;
      else error = data.error || 'Gagal memuat user';
    } catch (e) {
      error = 'Tidak dapat terhubung ke server';
    } finally {
      loading = false;
    }
  }

  function openAdd() {
    isEdit = false;
    form = { username:'', name:'', email:'', dept:'', role:'Staff', password:'' };
    saveMsg = ''; saveError = '';
    showModal = true;
  }

  function openEdit(u: User) {
    isEdit = true;
    form = { username: u.username, name: u.name, email: u.email, dept: u.dept, role: u.role, password: '' };
    saveMsg = ''; saveError = '';
    showModal = true;
  }

  async function saveUser() {
    if (!form.name || !form.email) { saveError = 'Nama dan email wajib diisi'; return; }
    if (!isEdit && (!form.username || !form.password)) { saveError = 'Username dan password wajib untuk user baru'; return; }

    saving = true; saveError = ''; saveMsg = '';
    try {
      const method = isEdit ? 'PATCH' : 'POST';
      const url = isEdit ? `/api/users/${form.username}` : '/api/users';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (data.success) {
        saveMsg = data.message || 'Berhasil disimpan';
        await fetchUsers();
        setTimeout(() => { showModal = false; saveMsg = ''; }, 1500);
      } else {
        saveError = data.error || 'Gagal menyimpan';
      }
    } catch (e) {
      saveError = 'Koneksi gagal';
    } finally {
      saving = false;
    }
  }

  async function deleteUser(u: User) {
    if (!confirm(`Hapus user ${u.name} (@${u.username})?\n\nUser akan dihapus dari FreeIPA dan tidak bisa login ke semua aplikasi.`)) return;
    try {
      const res = await fetch(`/api/users/${u.username}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) await fetchUsers();
      else alert('Gagal hapus: ' + (data.error || 'Unknown error'));
    } catch {
      alert('Koneksi gagal');
    }
  }

  function roleCls(role: string) {
    if (role === 'Admin') return 'role-admin';
    if (role === 'Manager') return 'role-mgr';
    return 'role-staff';
  }

  function initials(name: string) {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  }
  async function fetchTenants() {
    tenantsLoading = true;
    try { const r = await fetch('/api/admin/tenant'); const d = await r.json(); tenants = d.tenants || []; } catch {}
    tenantsLoading = false;
  }
  async function saveTenant() {
    if (!tenantForm.name || !tenantForm.slug) { tenantErr = 'Nama dan slug wajib'; return; }
    tenantSaving = true; tenantErr = ''; tenantMsg = '';
    try {
      const r = await fetch('/api/admin/tenant', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(tenantForm) });
      const d = await r.json();
      if (d.ok) { tenantMsg = 'Tenant ' + d.tenant.domain + ' berhasil dibuat!'; await fetchTenants(); setTimeout(() => { showAddTenant=false; tenantMsg=''; }, 2000); }
      else tenantErr = d.error || 'Gagal';
    } catch { tenantErr = 'Koneksi gagal'; }
    tenantSaving = false;
  }
</script>

<!-- Tab Navigation -->
<div class="tab-nav">
    <button class="tab-btn" class:active={activeTab==='users'} onclick={() => activeTab='users'}>👥 User Management</button>
    <button class="tab-btn" class:active={activeTab==='tenants'} onclick={() => activeTab='tenants'}>🏢 Tenant Management</button>
  </div>
<div class="main">
  {#if activeTab === 'users'}
  <!-- Topbar -->
  <header class="topbar">
    <div class="crumb">
      <strong>Admin Console</strong>
      <span style="color:var(--fg-5)">·</span>
      <span>Manajemen User</span>
    </div>
    <div class="topbar-right">
      <button class="btn-icon btn-ghost">{@html I.bell}</button>
    </div>
  </header>

  <div class="main-pad">
    <!-- Page head -->
    <div class="page-head">
      <div>
        <div class="page-h1">Manajemen User</div>
        <div class="page-sub">
          {#if loading}Memuat data FreeIPA…
          {:else if error}{error}
          {:else}{users.length} user terdaftar di FreeIPA{/if}
        </div>
      </div>
      <div style="display:flex;gap:8px;align-items:center">
        <!-- Search -->
        <div class="sidebar-search" style="margin:0;width:220px">
          {@html I.search}
          <input bind:value={query} placeholder="Cari user…" />
        </div>
        <button class="btn btn-primary btn-sm" onclick={openAdd}>
          {@html I.plus} Tambah User
        </button>
      </div>
    </div>

    <!-- Table -->
    <div class="panel" style="overflow:hidden">
      {#if loading}
        <div style="padding:48px;text-align:center;color:var(--fg-3)">Memuat data dari FreeIPA…</div>
      {:else if error}
        <div style="padding:48px;text-align:center;color:var(--danger)">{error}</div>
      {:else if filtered.length === 0}
        <div style="padding:48px;text-align:center;color:var(--fg-3)">Tidak ada user ditemukan</div>
      {:else}
        <table class="tbl">
          <thead>
            <tr>
              <th>Nama</th>
              <th>Email</th>
              <th>Departemen</th>
              <th>Role</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {#each filtered as u (u.username)}
              <tr>
                <td>
                  <div class="tbl-user">
                    <div class="av">{initials(u.name)}</div>
                    <div>
                      <div class="name">{u.name}</div>
                      <div class="uname">@{u.username}</div>
                    </div>
                  </div>
                </td>
                <td>{u.email || '—'}</td>
                <td>{u.dept || '—'}</td>
                <td><span class="role-pill {roleCls(u.role)}">{u.role}</span></td>
                <td>
                  <span class="tag {u.status === 'active' ? 'tag-ok' : ''}">
                    <span class="dot" style="color:{u.status === 'active' ? 'var(--ok)' : 'var(--fg-4)'}"></span>
                    {u.status}
                  </span>
                </td>
                <td>
                  <div class="row-act">
                    <button class="btn btn-ghost btn-sm btn-icon" onclick={() => openEdit(u)} title="Edit">
                      {@html I.edit}
                    </button>
                    <button class="btn btn-ghost btn-sm btn-icon" onclick={() => deleteUser(u)} title="Hapus" style="color:var(--danger)">
                      {@html I.trash}
                    </button>
                  </div>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      {/if}
    </div>
  </div>
  {/if}

  {#if activeTab === 'tenants'}
  <div class="main-pad">
    <div class="page-head">
      <div>
        <div class="page-h1">Tenant Management</div>
        <div class="page-sub">{tenantsLoading ? 'Memuat...' : tenants.length + ' tenant aktif'}</div>
      </div>
      <button class="btn btn-primary btn-sm" onclick={() => showAddTenant=!showAddTenant}>+ Tambah Tenant</button>
    </div>

    {#if showAddTenant}
    <div class="panel" style="padding:24px;margin-bottom:20px;border-color:var(--pri-bd)">
      <h3 style="font-size:15px;font-weight:600;color:var(--fg-1);margin-bottom:20px">Onboarding Tenant Baru</h3>
      {#if tenantMsg}<div style="padding:10px 14px;background:var(--ok-soft);border:1px solid var(--ok-bd);border-radius:8px;color:var(--ok);font-size:13px;margin-bottom:12px">{tenantMsg}</div>{/if}
      {#if tenantErr}<div style="padding:10px 14px;background:rgba(229,72,77,.1);border:1px solid rgba(229,72,77,.3);border-radius:8px;color:var(--danger);font-size:13px;margin-bottom:12px">{tenantErr}</div>{/if}
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-bottom:20px">
        <div class="field"><label>Nama Perusahaan</label><input bind:value={tenantForm.name} placeholder="contoh: OPSID" /></div>
        <div class="field"><label>Slug (ID unik)</label><input bind:value={tenantForm.slug} placeholder="contoh: opsid" /></div>
        <div class="field"><label>Warna Primary</label><input type="color" bind:value={tenantForm.primaryColor} /></div>
        <div class="field"><label>Logo URL</label><input bind:value={tenantForm.logoUrl} placeholder="https://..." /></div>
        <div class="field"><label>Quota Nextcloud (GB)</label><input type="number" bind:value={tenantForm.planNextcloudGb} min="1" /></div>
        <div class="field"><label>Quota Email (GB)</label><input type="number" bind:value={tenantForm.planEmailGb} min="1" /></div>
        <div class="field"><label>Quota Odoo (GB)</label><input type="number" bind:value={tenantForm.planOdooGb} min="1" /></div>
        <div class="field" style="grid-column:span 2"><label style="display:flex;align-items:center;gap:8px;cursor:pointer"><input type="checkbox" bind:checked={tenantForm.useCustomDomain} /> Client punya domain sendiri</label></div>
        {#if tenantForm.useCustomDomain}
        <div class="field" style="grid-column:span 3"><label>Domain Custom</label><input bind:value={tenantForm.domain} placeholder="contoh: workspace.perusahaan.co.id" /><span style="font-size:11px;color:var(--fg-3);margin-top:4px;display:block">Client pointing DNS ke 103.134.152.140</span></div>
        {:else}
        <div class="field" style="grid-column:span 3"><label>Subdomain yang dibuat</label><input value="{tenantForm.slug ? tenantForm.slug+'.opsid.web.id' : 'otomatis.opsid.web.id'}" disabled style="opacity:0.6" /></div>
        {/if}
      </div>
      <div style="display:flex;gap:12px">
        <button class="btn btn-primary" onclick={saveTenant} disabled={tenantSaving}>{tenantSaving ? 'Membuat...' : 'Aktivasi Tenant'}</button>
        <button class="btn btn-ghost" onclick={() => showAddTenant=false}>Batal</button>
      </div>
      <p style="font-size:11px;color:var(--fg-4);margin-top:12px">* Auto buat Nginx config + Keycloak Organization + FreeIPA group</p>
    </div>
    {/if}

    <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:16px">
      {#if tenantsLoading}
        <div style="padding:48px;text-align:center;color:var(--fg-3)">Memuat tenant...</div>
      {:else if tenants.length === 0}
        <div style="padding:48px;text-align:center;color:var(--fg-3);grid-column:span 2">Belum ada tenant. Tambah tenant pertama!</div>
      {:else}
        {#each tenants as t}
        <div class="panel" style="padding:20px">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px">
            <div>
              <div style="font-size:15px;font-weight:600;color:var(--fg-1);margin-bottom:4px">{t.name}</div>
              <code style="font-size:12px;color:var(--pri);background:var(--pri-soft);padding:2px 8px;border-radius:4px">{t.domain}</code>
            </div>
            <span style="font-size:11px;padding:4px 12px;border-radius:20px;border:1px solid;color:{t.status==='active'?'var(--ok)':'var(--danger)'};border-color:{t.status==='active'?'var(--ok-bd)':'rgba(229,72,77,.3)'};background:{t.status==='active'?'var(--ok-soft)':'rgba(229,72,77,.1)'}">
              {t.status === 'active' ? 'Aktif' : 'Suspended'}
            </span>
          </div>
          <div style="display:flex;gap:16px;margin-bottom:12px">
            <div><div style="font-size:10px;color:var(--fg-4)">Nextcloud</div><div style="font-size:14px;font-weight:600;color:var(--fg-1)">{t.plan_nextcloud_gb}GB</div></div>
            <div><div style="font-size:10px;color:var(--fg-4)">Email</div><div style="font-size:14px;font-weight:600;color:var(--fg-1)">{t.plan_email_gb}GB</div></div>
            <div><div style="font-size:10px;color:var(--fg-4)">Odoo</div><div style="font-size:14px;font-weight:600;color:var(--fg-1)">{t.plan_odoo_gb}GB</div></div>
          </div>
          <div style="display:flex;gap:8px">
            <button class="btn btn-ghost btn-sm">Cek DNS</button>
            <button class="btn btn-ghost btn-sm">Kelola User</button>
          </div>
        </div>
        {/each}
      {/if}
    </div>
  </div>
  {/if}

</div>

<!-- Modal Tambah/Edit User -->
{#if showModal}
  <div class="modal-bg" onclick={(e) => { if (e.target === e.currentTarget) showModal = false }}>
    <div class="modal">
      <div class="modal-h">
        <div>
          <div class="t">{isEdit ? 'Edit User' : 'Tambah User Baru'}</div>
          <div class="s">{isEdit ? `Mengubah data @${form.username} di FreeIPA` : 'User akan dibuat di FreeIPA dan bisa langsung login ke semua aplikasi'}</div>
        </div>
        <button class="btn-icon btn-ghost" onclick={() => showModal = false}>{@html I.close}</button>
      </div>

      <div class="modal-b">
        {#if saveMsg}
          <div style="padding:10px 14px;background:var(--ok-soft);border:1px solid var(--ok-bd);border-radius:var(--r-md);color:var(--ok);font-size:13px">
            ✓ {saveMsg}
          </div>
        {/if}
        {#if saveError}
          <div style="padding:10px 14px;background:rgba(229,72,77,.1);border:1px solid rgba(229,72,77,.3);border-radius:var(--r-md);color:var(--danger);font-size:13px">
            {saveError}
          </div>
        {/if}

        <div class="form-grid">
          <div class="field">
            <label>Username {#if isEdit}<span style="color:var(--fg-4)">(tidak bisa diubah)</span>{/if}</label>
            <input bind:value={form.username} disabled={isEdit} placeholder="contoh: johndoe" />
          </div>
          <div class="field">
            <label>Nama Lengkap</label>
            <input bind:value={form.name} placeholder="contoh: John Doe" />
          </div>
          <div class="field">
            <label>Email</label>
            <input type="email" bind:value={form.email} placeholder="john@opsid.web.id" />
          </div>
          <div class="field">
            <label>Departemen</label>
            <input bind:value={form.dept} placeholder="contoh: IT, Finance, Sales" />
          </div>
          <div class="field">
            <label>Role</label>
            <select bind:value={form.role}>
              <option value="Staff">Staff</option>
              <option value="Manager">Manager</option>
              <option value="Admin">Admin</option>
            </select>
          </div>
          {#if !isEdit}
            <div class="field">
              <label>Password Awal</label>
              <input type="password" bind:value={form.password} placeholder="Minimal 8 karakter" />
              <span class="hint">User wajib ganti password saat login pertama</span>
            </div>
          {/if}
        </div>
      </div>

      <div class="modal-f">
        <button class="btn btn-ghost" onclick={() => showModal = false}>Batal</button>
        <button class="btn btn-primary" onclick={saveUser} disabled={saving}>
          {saving ? 'Menyimpan…' : isEdit ? 'Simpan Perubahan' : 'Buat User'}
        </button>
      </div>
    </div>
  </div>
{/if}
