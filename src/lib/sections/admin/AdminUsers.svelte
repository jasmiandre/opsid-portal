<script lang="ts">
  import { auth } from '../../auth.svelte';
  import { onMount } from 'svelte';

  // ── Icons ───────────────────────────────────────────────────
  const I = {
    users:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
    building:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><rect x="4" y="3" width="16" height="18" rx="1.5"/><path d="M9 21V12h6v9"/><path d="M9 7h2M13 7h2M9 10h2M13 10h2"/></svg>`,
    pulse:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>`,
    fileText:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>`,
    search:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><circle cx="11" cy="11" r="7"/><path d="m20 20-4.3-4.3"/></svg>`,
    plus:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><path d="M12 5v14M5 12h14"/></svg>`,
    eye:     `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" width="13" height="13"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`,
    edit:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" width="13" height="13"><path d="M11 4H4v16h16v-7"/><path d="M18.5 2.5a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5Z"/></svg>`,
    lock:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" width="13" height="13"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>`,
    trash:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" width="13" height="13"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg>`,
    globe:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" width="13" height="13"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>`,
    check:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><polyline points="20 6 9 17 4 12"/></svg>`,
    download:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" width="13" height="13"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`,
    x:       `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
    bell:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><path d="M6 8a6 6 0 1 1 12 0c0 7 3 7 3 9H3c0-2 3-2 3-9Z"/><path d="M10 21a2 2 0 0 0 4 0"/></svg>`,
    searchSm:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><circle cx="11" cy="11" r="7"/><path d="m20 20-4.3-4.3"/></svg>`,
  };

  // ── Types ───────────────────────────────────────────────────
  interface User {
    username: string;
    name: string;
    email: string;
    dept: string;
    role: string;
    status: string;
  }
  interface Tenant {
    id?: number;
    name: string;
    slug: string;
    domain: string;
    primary_color: string;
    logo_url?: string;
    user_count: number;
    plan_nextcloud_gb?: number;
    plan_email_gb?: number;
    created_at?: string;
    status?: string;
  }
  interface VM {
    name: string;
    role?: string;
    ip: string;
    status: string;
    cpu: number;
    ram: number;
    net?: number;
  }
  interface AuditLog {
    time: string;
    date?: string;
    actor: string;
    action: string;
    target: string;
    type: string;
  }

  // ── State ───────────────────────────────────────────────────
  let activeTab     = $state('users');
  let loading       = $state(true);
  let submitting    = $state(false);
  let users         = $state<User[]>([]);
  let tenants       = $state<Tenant[]>([]);
  let services      = $state<VM[]>([]);
  let auditLogs     = $state<AuditLog[]>([]);
  let searchUser    = $state('');
  let searchAudit   = $state('');
  let showAddUser   = $state(false);
  let showAddTenant = $state(false);
  let confirmDelete = $state<Tenant | null>(null);
  let impersonating       = $state(false);
  let impersonateTarget   = $state('');

  // ── Forms ───────────────────────────────────────────────────
  let newUser = $state({
    username: '', fullname: '', email: '', dept: '', role: 'Staff', password: ''
  });
  let newTenant = $state({
    name: '', slug: '', primaryColor: '#3B82F6', logoUrl: '',
    planNextcloudGb: 50, planEmailGb: 50, planOdooGb: 50,
    useCustomDomain: false, domain: '',
    adminName: '', adminPassword: ''
  });

  // ── Derived ─────────────────────────────────────────────────
  let filteredUsers = $derived(
    searchUser
      ? users.filter(u => {
          const q = searchUser.toLowerCase();
          return u.name.toLowerCase().includes(q) || u.username.includes(q) || u.email.includes(q);
        })
      : users
  );

  let filteredLogs = $derived(
    searchAudit
      ? auditLogs.filter(l => {
          const q = searchAudit.toLowerCase();
          return l.actor.includes(q) || l.action.toLowerCase().includes(q) || l.target.includes(q);
        })
      : auditLogs
  );

  let tenantAdminEmail = $derived(
    newTenant.useCustomDomain && newTenant.domain
      ? 'admin@' + newTenant.domain
      : newTenant.slug
        ? 'admin@' + newTenant.slug + '.opsid.web.id'
        : 'admin@yourorg.opsid.web.id'
  );

  let tenantSubdomain = $derived(
    newTenant.useCustomDomain && newTenant.domain
      ? newTenant.domain
      : (newTenant.slug || 'yourorg') + '.opsid.web.id'
  );

  let tabs = $derived((() => {
    const all = [
      { id: 'users',   label: 'User Management',  icon: I.users },
      { id: 'tenants', label: 'Tenant Management', icon: I.building },
      { id: 'health',  label: 'Service Health',    icon: I.pulse },
      { id: 'audit',   label: 'Audit Log',         icon: I.fileText },
    ];
    if (auth.profile.isAdmin) return all;
    if (auth.profile.isTenantAdmin) return all.slice(0, 2);
    return [];
  })());

  // ── Helpers ─────────────────────────────────────────────────
  function generateSlug(name: string): string {
    return name.toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }

  function roleColor(r: string) {
    if (r === 'Superadmin' || r === 'opsid-admin') return { color: '#A78BFA', bg: 'rgba(167,139,250,.1)', bd: 'rgba(167,139,250,.25)' };
    if (r === 'Admin' || r === 'org-admin') return { color: '#60A5FA', bg: 'rgba(96,165,250,.1)', bd: 'rgba(96,165,250,.25)' };
    if (r === 'Manager') return { color: '#FBBF24', bg: 'rgba(251,191,36,.1)', bd: 'rgba(251,191,36,.25)' };
    if (r === 'Operator') return { color: '#34D399', bg: 'rgba(52,211,153,.1)', bd: 'rgba(52,211,153,.25)' };
    return { color: 'var(--fg-2)', bg: 'var(--bg-2)', bd: 'var(--bd-2)' };
  }

  function metricColor(v: number) {
    return v > 80 ? 'var(--danger)' : v > 60 ? 'var(--warn)' : 'var(--ok)';
  }

  function actionColor(a: string) {
    if (a.includes('DELETE')) return 'tag-danger';
    if (a.includes('IMPERSON') || a.includes('RESTART') || a.includes('WARN')) return 'tag-warn';
    if (a.includes('CREATE')) return 'tag-ok';
    return 'tag-pri';
  }

  function initials(name: string) {
    return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase() || '??';
  }

  function greeting() {
    const h = new Date().getHours();
    return h < 12 ? 'Selamat pagi' : h < 15 ? 'Selamat siang' : h < 18 ? 'Selamat sore' : 'Selamat malam';
  }

  // ── API Calls ────────────────────────────────────────────────
  async function fetchUsers() {
    try {
      const res = await fetch('/api/users');
      const data = await res.json();
      if (data.success && data.users) users = data.users;
    } catch (e) {
      console.error('Failed to fetch users:', e);
    }
  }

  async function fetchTenants() {
    try {
      const res = await fetch('/api/admin/tenant');
      const data = await res.json();
      if (data.ok && data.tenants) tenants = data.tenants;
    } catch (e) {
      console.error('Failed to fetch tenants:', e);
    }
  }

  async function fetchHealth() {
    try {
      const res = await fetch('/api/admin/health');
      const data = await res.json();
      if (Array.isArray(data)) services = data;
      else if (data.services) services = data.services;
    } catch {
      services = [
        { name: 'Nginx',      ip: '10.34.1.1',  status: 'up', cpu: 8,  ram: 23, net: 12 },
        { name: 'Portal',     ip: '10.34.1.2',  status: 'up', cpu: 14, ram: 31, net: 8  },
        { name: 'FreeIPA',    ip: '10.34.1.3',  status: 'up', cpu: 15, ram: 45, net: 5  },
        { name: 'Keycloak',   ip: '10.34.1.4',  status: 'up', cpu: 22, ram: 58, net: 14 },
        { name: 'FreeRADIUS', ip: '10.34.1.5',  status: 'up', cpu: 5,  ram: 18, net: 2  },
        { name: 'SOGo Mail',  ip: '10.34.1.6',  status: 'up', cpu: 18, ram: 42, net: 22 },
        { name: 'Nextcloud',  ip: '10.34.1.7',  status: 'up', cpu: 35, ram: 62, net: 45 },
        { name: 'Odoo ERP',   ip: '10.34.1.8',  status: 'up', cpu: 28, ram: 55, net: 18 },
        { name: 'PostgreSQL', ip: '10.34.1.9',  status: 'up', cpu: 20, ram: 48, net: 30 },
        { name: 'PG Standby', ip: '10.34.1.10', status: 'up', cpu: 8,  ram: 35, net: 15 },
        { name: 'Monitoring', ip: '10.34.1.11', status: 'up', cpu: 12, ram: 40, net: 10 },
      ];
    }
  }

  async function fetchAuditLogs() {
    try {
      const res = await fetch('/api/admin/audit');
      const data = await res.json();
      if (Array.isArray(data)) auditLogs = data;
      else if (data.logs) auditLogs = data.logs;
    } catch {
      auditLogs = [
        { time: '21:30:15', date: '27 Mei', actor: 'jasmiandre',  action: 'LOGIN',         target: 'portal',         type: 'info'   },
        { time: '21:28:03', date: '27 Mei', actor: 'jasmiandre',  action: 'IMPERSONATE',   target: 'testuser',       type: 'warn'   },
        { time: '21:15:44', date: '27 Mei', actor: 'rahmaputri',  action: 'CREATE_USER',   target: 'miraanggraeni',  type: 'info'   },
        { time: '20:55:12', date: '27 Mei', actor: 'jasmiandre',  action: 'UPDATE_TENANT', target: 'manjapoles',     type: 'info'   },
        { time: '20:42:08', date: '27 Mei', actor: 'bagasadi',    action: 'RESTART_SVC',   target: 'collab-01',      type: 'warn'   },
        { time: '20:30:00', date: '27 Mei', actor: 'System',      action: 'SSL_RENEWED',   target: '*.opsid.web.id', type: 'info'   },
        { time: '19:15:33', date: '27 Mei', actor: 'jasmiandre',  action: 'DELETE_USER',   target: 'tempuser',       type: 'danger' },
        { time: '18:44:21', date: '27 Mei', actor: 'dewikartika', action: 'LOGIN',          target: 'portal',         type: 'info'   },
      ];
    }
  }

  async function createUser() {
    if (!newUser.username || !newUser.fullname || !newUser.email || !newUser.password) return;
    submitting = true;
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser),
      });
      const data = await res.json();
      if (data.success) {
        showAddUser = false;
        newUser = { username: '', fullname: '', email: '', dept: '', role: 'Staff', password: '' };
        await fetchUsers();
      }
    } catch (e) {
      console.error('Create user failed:', e);
    }
    submitting = false;
  }

  async function createTenant() {
    if (!newTenant.name) return;
    if (!newTenant.slug) newTenant.slug = generateSlug(newTenant.name);
    if (!newTenant.adminName || !newTenant.adminPassword) {
      alert('Nama admin dan password wajib diisi');
      return;
    }
    submitting = true;
    try {
      const res = await fetch('/api/admin/tenant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTenant),
      });
      const data = await res.json();
      if (data.ok) {
        showAddTenant = false;
        newTenant = {
          name: '', slug: '', primaryColor: '#3B82F6', logoUrl: '',
          planNextcloudGb: 50, planEmailGb: 50, planOdooGb: 50,
          useCustomDomain: false, domain: '', adminName: '', adminPassword: ''
        };
        await fetchTenants();
      }
    } catch (e) {
      console.error('Create tenant failed:', e);
    }
    submitting = false;
  }

  async function deleteTenant(tenant: Tenant) {
    if (!tenant.id) return;
    submitting = true;
    try {
      const res = await fetch('/api/admin/tenant/' + tenant.id, { method: 'DELETE' });
      const data = await res.json();
      if (data.ok) {
        confirmDelete = null;
        await fetchTenants();
      } else {
        alert('Gagal menghapus: ' + (data.error ?? 'Unknown error'));
      }
    } catch (e) {
      alert('Koneksi gagal: ' + String(e));
    }
    submitting = false;
  }

  async function checkDns(tenant: Tenant) {
    if (!tenant.id) return;
    try {
      const res = await fetch('/api/admin/tenant/' + tenant.id + '/dns');
      const data = await res.json();
      if (data.pointing) {
        alert('DNS OK\n' + data.domain + ' -> ' + data.resolved_ip);
      } else {
        alert('DNS belum diarahkan.\n' + data.domain + ' -> ' + (data.resolved_ip ?? 'tidak ditemukan') + '\nTarget: ' + data.target_ip);
      }
    } catch {
      alert('Cek DNS gagal');
    }
  }

  async function doImpersonate(username: string, name: string) {
    try {
      const kcAdminUrl = 'https://auth.opsid.web.id/admin/master/console/#/opsid-internal/users';
      await fetch('/api/admin/impersonate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username }),
      });
      impersonating = true;
      impersonateTarget = name;
      alert('Untuk impersonate ' + name + ':\n1. Buka Keycloak Admin\n2. Users -> ' + username + ' -> Impersonate');
      window.open(kcAdminUrl, '_blank');
    } catch {
      alert('Koneksi gagal');
    }
  }

  function stopImpersonate() {
    impersonating = false;
    impersonateTarget = '';
  }

  // ── Mount ───────────────────────────────────────────────────
  onMount(async () => {
    await Promise.allSettled([fetchUsers(), fetchTenants(), fetchHealth(), fetchAuditLogs()]);
    loading = false;
  });
</script>

<div class="main-scroll">
  <!-- Topbar -->
  <header class="topbar">
    <div class="crumb">
      <strong>Admin Console</strong>
      <span style="color:var(--fg-4)">·</span>
      <span>{tabs.find(t => t.id === activeTab)?.label ?? ''}</span>
    </div>
    <div class="topbar-right">
      <div class="topbar-search">
        {@html I.searchSm}
        <input placeholder="Cari..." />
        <span class="kbd">⌘K</span>
      </div>
      <button class="btn-icon" style="position:relative">
        {@html I.bell}
        <span class="notif-dot"></span>
      </button>
      <button class="userchip">
        <div style="display:flex;flex-direction:column;align-items:flex-end">
          <span class="uc-name">{greeting()}, {auth.profile.firstName}</span>
          <span class="uc-role">{auth.profile.isAdmin ? 'Superadmin' : 'Tenant Admin'}</span>
        </div>
        <div class="av">{auth.profile.initials}</div>
      </button>
    </div>
  </header>

  <div class="main-pad">
    <!-- Tab bar -->
    <div class="tab-bar">
      {#each tabs as t (t.id)}
        <button class="tab-btn" class:active={activeTab === t.id} onclick={() => activeTab = t.id}>
          {@html t.icon} {t.label}
        </button>
      {/each}
    </div>

    <!-- ═══════ USER MANAGEMENT ═══════ -->
    {#if activeTab === 'users'}
      <div class="page-head">
        <div>
          <h1 class="page-h1">User Management</h1>
          <p class="page-sub">{users.length} user terdaftar · FreeIPA + Keycloak</p>
        </div>
        <div style="display:flex;gap:8px">
          <div class="search-box">
            {@html I.search}
            <input placeholder="Cari user..." bind:value={searchUser} />
          </div>
          <button class="btn btn-primary btn-sm" onclick={() => showAddUser = true}>
            {@html I.plus} Tambah User
          </button>
        </div>
      </div>

      <div class="panel">
        {#if loading}
          <div class="empty-state">Memuat data user...</div>
        {:else if filteredUsers.length === 0}
          <div class="empty-state">Tidak ada user ditemukan</div>
        {:else}
          <table class="data-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Email</th>
                <th>Departemen</th>
                <th>Role</th>
                <th>Status</th>
                <th style="text-align:right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {#each filteredUsers as u (u.username)}
                {@const rc = roleColor(u.role)}
                <tr>
                  <td>
                    <div class="user-cell">
                      <div class="av">{initials(u.name)}</div>
                      <div>
                        <div class="user-name">{u.name}</div>
                        <div class="user-uid mono">{u.username}</div>
                      </div>
                    </div>
                  </td>
                  <td class="email-cell">{u.email}</td>
                  <td>{u.dept}</td>
                  <td>
                    <span class="role-badge" style="color:{rc.color};background:{rc.bg};border-color:{rc.bd}">
                      {u.role}
                    </span>
                  </td>
                  <td>
                    {#if u.status === 'active'}
                      <span class="tag tag-ok" style="font-size:10px">
                        <span class="dot dot-ok"></span> Aktif
                      </span>
                    {:else}
                      <span class="tag tag-danger" style="font-size:10px">Suspended</span>
                    {/if}
                  </td>
                  <td>
                    <div class="action-btns">
                      <button class="btn btn-ghost btn-sm" title="Impersonate" onclick={() => doImpersonate(u.username, u.name ?? u.username)}>{@html I.eye}</button>
                      <button class="btn btn-ghost btn-sm" title="Edit">{@html I.edit}</button>
                      <button class="btn btn-ghost btn-sm" style="color:var(--danger)" title="Suspend">{@html I.lock}</button>
                    </div>
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        {/if}
      </div>

      {#if showAddUser}
        <div class="modal-overlay" onclick={() => showAddUser = false}>
          <div class="modal" onclick={(e) => e.stopPropagation()}>
            <div class="modal-head">
              <h3>Tambah User Baru</h3>
              <button class="btn-icon" onclick={() => showAddUser = false}>{@html I.x}</button>
            </div>
            <div class="modal-body">
              <div class="form-grid">
                <div class="field"><label for="u-uid">Username</label><input id="u-uid" placeholder="john.doe" bind:value={newUser.username} /></div>
                <div class="field"><label for="u-name">Nama Lengkap</label><input id="u-name" placeholder="John Doe" bind:value={newUser.fullname} /></div>
                <div class="field"><label for="u-email">Email</label><input id="u-email" placeholder="john@opsid.web.id" bind:value={newUser.email} /></div>
                <div class="field"><label for="u-dept">Departemen</label><input id="u-dept" placeholder="Engineering" bind:value={newUser.dept} /></div>
                <div class="field">
                  <label for="u-role">Role</label>
                  <select id="u-role" bind:value={newUser.role}>
                    <option>Staff</option><option>Operator</option><option>Manager</option><option>Admin</option>
                  </select>
                </div>
                <div class="field"><label for="u-pass">Password</label><input id="u-pass" type="password" placeholder="Min 8 karakter" bind:value={newUser.password} /></div>
              </div>
              <p class="field-hint" style="margin-top:14px">User akan otomatis dibuat di FreeIPA, Keycloak, SOGo, Nextcloud, dan Odoo.</p>
            </div>
            <div class="modal-foot">
              <button class="btn btn-secondary" onclick={() => showAddUser = false}>Batal</button>
              <button class="btn btn-primary" onclick={createUser} disabled={submitting}>
                {submitting ? 'Membuat...' : 'Buat User'}
              </button>
            </div>
          </div>
        </div>
      {/if}
    {/if}

    <!-- ═══════ TENANT MANAGEMENT ═══════ -->
    {#if activeTab === 'tenants'}
      <div class="page-head">
        <div>
          <h1 class="page-h1">Tenant Management</h1>
          <p class="page-sub">{tenants.length} tenant terdaftar · Multi-tenant white-label</p>
        </div>
        <button class="btn btn-primary btn-sm" onclick={() => showAddTenant = true}>
          {@html I.plus} Onboarding Tenant
        </button>
      </div>

      {#if loading}
        <div class="empty-state">Memuat data tenant...</div>
      {:else}
        <div class="tenant-grid">
          {#each tenants as t (t.domain)}
            <div class="panel tenant-card">
              <div class="tenant-inner">
                <div class="tenant-header">
                  <div style="display:flex;align-items:center;gap:12px">
                    <div class="tenant-mark" style="background:linear-gradient(135deg,{t.primary_color},{t.primary_color})">
                      {t.name[0]}
                    </div>
                    <div>
                      <div class="tenant-name">{t.name}</div>
                      <code class="mono tenant-domain" style="color:{t.primary_color}">{t.domain}</code>
                    </div>
                  </div>
                  <span class="tag tag-ok">Aktif</span>
                </div>
                <div class="tenant-stats">
                  <div><div class="ts-label">Users</div><div class="ts-val mono">{t.user_count ?? 0}</div></div>
                  <div><div class="ts-label">Storage</div><div class="ts-val mono">{t.plan_nextcloud_gb ?? 50} GB</div></div>
                  <div><div class="ts-label">Slug</div><div class="ts-val mono">{t.slug}</div></div>
                </div>
                <div class="tenant-actions">
                  <button class="btn btn-secondary btn-sm" onclick={() => checkDns(t)}>{@html I.globe} Cek DNS</button>
                  <button class="btn btn-secondary btn-sm">{@html I.users} Kelola User</button>
                  <button class="btn btn-danger btn-sm" style="margin-left:auto" onclick={() => confirmDelete = t}>
                    {@html I.trash} Hapus
                  </button>
                </div>
              </div>
            </div>
          {/each}
        </div>
      {/if}

      {#if showAddTenant}
        <div class="modal-overlay" onclick={() => showAddTenant = false}>
          <div class="modal" onclick={(e) => e.stopPropagation()}>
            <div class="modal-head">
              <h3>Buat Organisasi Baru</h3>
              <button class="btn-icon" onclick={() => showAddTenant = false}>{@html I.x}</button>
            </div>
            <div class="modal-body">
              <div class="form-grid">
                <div class="field" style="grid-column:span 2">
                  <label for="t-name">Nama Organisasi</label>
                  <input id="t-name" placeholder="PT Contoh Indonesia" bind:value={newTenant.name}
                    oninput={() => { if (!newTenant.slug) newTenant.slug = generateSlug(newTenant.name); }} />
                </div>
                <div class="field">
                  <label for="t-slug">Slug (opsional)</label>
                  <input id="t-slug" placeholder="auto dari nama" bind:value={newTenant.slug} />
                  <span style="font-size:11px;color:var(--fg-4);margin-top:4px;display:block">Preview: {tenantSubdomain}</span>
                </div>
                <div class="field">
                  <label for="t-color">Warna Utama</label>
                  <input id="t-color" type="color" bind:value={newTenant.primaryColor} style="height:40px" />
                </div>
                <div class="field">
                  <label for="t-logo">Logo URL</label>
                  <input id="t-logo" placeholder="https://..." bind:value={newTenant.logoUrl} />
                </div>
                <div class="field">
                  <label for="t-nc">Quota Nextcloud (GB)</label>
                  <input id="t-nc" type="number" min="1" bind:value={newTenant.planNextcloudGb} />
                </div>
                <div class="field">
                  <label for="t-em">Quota Email (GB)</label>
                  <input id="t-em" type="number" min="1" bind:value={newTenant.planEmailGb} />
                </div>
                <div class="field">
                  <label for="t-od">Quota Odoo (GB)</label>
                  <input id="t-od" type="number" min="1" bind:value={newTenant.planOdooGb} />
                </div>
                <div class="field" style="grid-column:span 3">
                  <label style="display:flex;align-items:center;gap:8px;cursor:pointer">
                    <input type="checkbox" bind:checked={newTenant.useCustomDomain} />
                    Organisasi punya domain sendiri
                  </label>
                </div>
                {#if newTenant.useCustomDomain}
                  <div class="field" style="grid-column:span 3">
                    <label for="t-domain">Domain Custom</label>
                    <input id="t-domain" placeholder="workspace.perusahaan.co.id" bind:value={newTenant.domain} />
                  </div>
                {/if}
                <div class="field" style="grid-column:span 3;padding:12px;background:var(--bg-2);border-radius:8px;border:1px solid var(--bd-1)">
                  <span style="font-size:11px;color:var(--fg-4)">Email admin yang akan dibuat:</span>
                  <div style="font-size:14px;font-weight:600;color:var(--pri);margin-top:4px">{tenantAdminEmail}</div>
                </div>
                <div class="field" style="grid-column:span 2">
                  <label for="t-aname">Nama Admin Tenant</label>
                  <input id="t-aname" placeholder="Budi Santoso" bind:value={newTenant.adminName} />
                </div>
                <div class="field">
                  <label for="t-apass">Password Awal Admin</label>
                  <input id="t-apass" type="password" placeholder="Min 8 karakter" bind:value={newTenant.adminPassword} />
                </div>
              </div>
              <p class="field-hint" style="margin-top:14px">Sistem otomatis buat Nginx config + Keycloak Organization + FreeIPA group + user admin.</p>
            </div>
            <div class="modal-foot">
              <button class="btn btn-secondary" onclick={() => showAddTenant = false}>Batal</button>
              <button class="btn btn-primary" onclick={createTenant} disabled={submitting}>
                {submitting ? 'Mengaktivasi...' : 'Aktivasi Tenant'}
              </button>
            </div>
          </div>
        </div>
      {/if}

      {#if confirmDelete}
        <div class="modal-overlay" onclick={() => confirmDelete = null}>
          <div class="modal" style="width:420px" onclick={(e) => e.stopPropagation()}>
            <div class="modal-head">
              <h3>Hapus Tenant</h3>
              <button class="btn-icon" onclick={() => confirmDelete = null}>{@html I.x}</button>
            </div>
            <div class="modal-body">
              <p style="font-size:13px;color:var(--fg-2);line-height:1.6">
                Yakin ingin menghapus tenant <strong style="color:var(--fg-1)">{confirmDelete.name}</strong> ({confirmDelete.domain})?
                Semua data user, file, dan konfigurasi akan dihapus permanen.
              </p>
            </div>
            <div class="modal-foot">
              <button class="btn btn-secondary" onclick={() => confirmDelete = null}>Batal</button>
              <button class="btn btn-danger" disabled={submitting} onclick={() => confirmDelete && deleteTenant(confirmDelete)}>
                {submitting ? 'Menghapus...' : 'Hapus Permanen'}
              </button>
            </div>
          </div>
        </div>
      {/if}
    {/if}

    <!-- ═══════ SERVICE HEALTH ═══════ -->
    {#if activeTab === 'health'}
      <div class="page-head">
        <div>
          <h1 class="page-h1">Service Health</h1>
          <p class="page-sub">{services.length} VM dipantau · Prometheus + Grafana</p>
        </div>
        <span class="tag tag-ok" style="padding:8px 16px">
          {@html I.check} Semua sistem normal
        </span>
      </div>

      {#if loading}
        <div class="empty-state">Memuat status VM...</div>
      {:else}
        <div class="health-grid">
          {#each services as s (s.ip)}
            <div class="health-card">
              <div class="health-header">
                <span class="dot dot-ok dot-pulse"></span>
                <div style="flex:1">
                  <div class="health-name">{s.name}</div>
                  <div class="health-role mono">{s.role ?? ''}</div>
                </div>
                <code class="health-ip mono">{s.ip}</code>
              </div>
              {#each [{l:'CPU',v:s.cpu},{l:'RAM',v:s.ram},{l:'NET',v:s.net ?? 0}] as m}
                <div class="metric-row">
                  <span class="metric-label mono">{m.l}</span>
                  <div class="metric-bar">
                    <div class="metric-fill" style="width:{m.v}%;background:{metricColor(m.v)}"></div>
                  </div>
                  <span class="metric-val mono">{m.v}%</span>
                </div>
              {/each}
            </div>
          {/each}
        </div>
      {/if}
    {/if}

    <!-- ═══════ AUDIT LOG ═══════ -->
    {#if activeTab === 'audit'}
      <div class="page-head">
        <div>
          <h1 class="page-h1">Audit Log</h1>
          <p class="page-sub">Semua aktivitas admin tercatat · PostgreSQL</p>
        </div>
        <div style="display:flex;gap:8px">
          <div class="search-box">
            {@html I.search}
            <input placeholder="Cari log..." bind:value={searchAudit} />
          </div>
          <button class="btn btn-secondary btn-sm">{@html I.download} Export</button>
        </div>
      </div>

      <div class="panel">
        {#if loading}
          <div class="empty-state">Memuat audit log...</div>
        {:else if filteredLogs.length === 0}
          <div class="empty-state">Tidak ada log ditemukan</div>
        {:else}
          <table class="data-table">
            <thead>
              <tr>
                <th>Waktu</th><th>Aktor</th><th>Aksi</th><th>Target</th><th>Tipe</th>
              </tr>
            </thead>
            <tbody>
              {#each filteredLogs as l}
                <tr>
                  <td>
                    <div class="mono" style="font-size:12px">{l.time}</div>
                    {#if l.date}<div style="font-size:10px;color:var(--fg-4)">{l.date}</div>{/if}
                  </td>
                  <td>
                    <div class="user-cell">
                      <div class="av">{l.actor === 'System' ? 'SY' : initials(l.actor)}</div>
                      <span>{l.actor}</span>
                    </div>
                  </td>
                  <td>
                    <span class="tag {actionColor(l.action)}" style="font-size:10px;font-family:monospace;letter-spacing:.03em">
                      {l.action}
                    </span>
                  </td>
                  <td class="mono" style="font-size:12px">{l.target}</td>
                  <td>
                    <span class="tag {l.type === 'warn' ? 'tag-warn' : l.type === 'danger' ? 'tag-danger' : 'tag-pri'}" style="font-size:10px">
                      {l.type}
                    </span>
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        {/if}
      </div>
    {/if}
  </div>
</div>

<style>
  /* ── Layout ──────────────────────────────────────────────── */
  .main-scroll { flex:1; overflow-y:auto; display:flex; flex-direction:column; }
  .main-pad { padding:28px; display:flex; flex-direction:column; gap:22px; max-width:1320px; margin:0 auto; width:100%; }

  /* ── Topbar ──────────────────────────────────────────────── */
  .topbar { display:flex; align-items:center; justify-content:space-between; padding:0 28px; height:56px; border-bottom:1px solid var(--bd-1); background:color-mix(in srgb, var(--bg-0) 80%, transparent); backdrop-filter:blur(12px); flex-shrink:0; z-index:10; position:sticky; top:0; }
  .topbar-right { display:flex; align-items:center; gap:6px; }
  .topbar-search { display:flex; align-items:center; gap:8px; padding:7px 12px; background:var(--bg-2); border:1px solid var(--bd-1); border-radius:var(--r-md); color:var(--fg-4); font-size:12px; width:220px; }
  .topbar-search input { flex:1; background:none; border:none; padding:0; color:var(--fg-1); font-size:12px; outline:none; font-family:inherit; }
  .topbar-search input::placeholder { color:var(--fg-4); }
  .notif-dot { position:absolute; top:7px; right:7px; width:7px; height:7px; border-radius:50%; background:var(--danger); border:2px solid var(--bg-0); }

  /* ── Page ─────────────────────────────────────────────────── */
  .page-head { display:flex; align-items:flex-start; justify-content:space-between; gap:16px; flex-wrap:wrap; }
  .page-h1 { font-size:24px; font-weight:700; letter-spacing:-.02em; color:var(--fg-1); margin:0; }
  .page-sub { font-size:13px; color:var(--fg-3); margin-top:4px; }

  /* ── Tabs ─────────────────────────────────────────────────── */
  .tab-bar { display:flex; gap:2px; padding:4px; background:var(--bg-2); border-radius:var(--r-md); align-self:flex-start; }
  .tab-btn { display:flex; align-items:center; gap:7px; padding:8px 16px; border-radius:var(--r-sm); font-size:13px; font-weight:500; color:var(--fg-3); transition:all .15s; background:none; border:none; cursor:pointer; font-family:inherit; }
  .tab-btn:hover { color:var(--fg-2); background:var(--bg-3); }
  .tab-btn.active { color:var(--fg-1); background:var(--bg-1); box-shadow:0 1px 2px rgba(0,0,0,.3); }

  /* ── Search ──────────────────────────────────────────────── */
  .search-box { display:flex; align-items:center; gap:8px; padding:7px 12px; background:var(--bg-2); border:1px solid var(--bd-1); border-radius:var(--r-md); width:200px; }
  .search-box input { flex:1; background:none; border:none; padding:0; color:var(--fg-1); font-size:12px; outline:none; font-family:inherit; }
  .search-box input::placeholder { color:var(--fg-4); }

  /* ── Table ───────────────────────────────────────────────── */
  .data-table { width:100%; border-collapse:collapse; }
  .data-table th { padding:12px 20px; text-align:left; font-size:10px; font-weight:700; color:var(--fg-4); letter-spacing:1px; text-transform:uppercase; border-bottom:1px solid var(--bd-1); background:var(--bg-2); }
  .data-table td { padding:14px 20px; font-size:13px; color:var(--fg-2); border-bottom:1px solid color-mix(in srgb, var(--bd-1) 60%, transparent); vertical-align:middle; }
  .data-table tr:last-child td { border-bottom:none; }
  .data-table tbody tr { transition:background .15s; }
  .data-table tbody tr:hover td { background:var(--bg-2); }

  .user-cell { display:flex; align-items:center; gap:10px; }
  .user-name { font-size:13px; font-weight:500; color:var(--fg-1); }
  .user-uid { font-size:11px; color:var(--fg-4); }
  .email-cell { font-size:12px; color:var(--fg-3); }
  .role-badge { font-size:11px; padding:2px 10px; border-radius:20px; font-weight:500; border:1px solid; }
  .action-btns { display:flex; gap:6px; justify-content:flex-end; }

  /* ── Tenant cards ────────────────────────────────────────── */
  .tenant-grid { display:grid; grid-template-columns:repeat(2,1fr); gap:14px; }
  .tenant-card { overflow:visible; }
  .tenant-inner { padding:20px; }
  .tenant-header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:16px; }
  .tenant-mark { width:40px; height:40px; border-radius:10px; display:grid; place-items:center; color:#fff; font-size:16px; font-weight:700; flex-shrink:0; }
  .tenant-name { font-size:15px; font-weight:600; color:var(--fg-1); }
  .tenant-domain { font-size:11px; }
  .tenant-stats { display:grid; grid-template-columns:repeat(3,1fr); gap:12px; margin-bottom:16px; }
  .ts-label { font-size:10px; color:var(--fg-4); text-transform:uppercase; letter-spacing:.06em; font-weight:600; }
  .ts-val { font-size:14px; font-weight:600; color:var(--fg-1); margin-top:2px; }
  .tenant-actions { display:flex; gap:8px; }

  /* ── Health ──────────────────────────────────────────────── */
  .health-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:12px; }
  .health-card { background:var(--bg-1); border:1px solid var(--bd-1); border-radius:var(--r-lg); padding:18px; transition:all .15s; }
  .health-card:hover { border-color:var(--bd-2); }
  .health-header { display:flex; align-items:center; gap:8px; margin-bottom:14px; }
  .health-name { font-size:13px; font-weight:600; color:var(--fg-1); }
  .health-role { font-size:10px; color:var(--fg-4); }
  .health-ip { font-size:10px; color:var(--fg-4); }
  .metric-row { display:flex; align-items:center; gap:8px; margin-top:6px; }
  .metric-label { font-size:10px; color:var(--fg-4); width:28px; }
  .metric-bar { flex:1; height:4px; background:var(--bg-3); border-radius:2px; overflow:hidden; }
  .metric-fill { height:100%; border-radius:2px; transition:width .5s ease; }
  .metric-val { font-size:11px; color:var(--fg-3); width:30px; text-align:right; }

  /* ── Modal ───────────────────────────────────────────────── */
  .modal-overlay { position:fixed; inset:0; background:rgba(0,0,0,.6); backdrop-filter:blur(8px); z-index:200; display:grid; place-items:center; padding:24px; }
  .modal { background:var(--bg-1); border:1px solid var(--bd-2); border-radius:18px; width:560px; max-width:100%; box-shadow:0 12px 40px -12px rgba(0,0,0,.7); }
  .modal-head { padding:20px 24px; border-bottom:1px solid var(--bd-1); display:flex; align-items:center; justify-content:space-between; }
  .modal-head h3 { font-size:16px; font-weight:600; margin:0; }
  .modal-body { padding:20px 24px; }
  .modal-foot { padding:16px 24px; border-top:1px solid var(--bd-1); display:flex; justify-content:flex-end; gap:8px; }
  .field-hint { font-size:10px; color:var(--fg-4); }

  /* ── Tags ─────────────────────────────────────────────────── */
  .tag-warn { color:var(--warn); background:rgba(251,191,36,.1); border-color:color-mix(in srgb, var(--warn) 25%, transparent); }
  .tag-danger { color:var(--danger); background:rgba(248,113,113,.1); border-color:color-mix(in srgb, var(--danger) 25%, transparent); }

  /* ── Buttons ─────────────────────────────────────────────── */
  .btn-secondary { background:var(--bg-2); color:var(--fg-1); border-color:var(--bd-2); }
  .btn-secondary:hover { background:var(--bg-3); border-color:var(--bd-3); }
  .btn-danger { background:rgba(248,113,113,.1); color:var(--danger); border-color:color-mix(in srgb, var(--danger) 25%, transparent); }
  .btn-danger:hover { background:rgba(248,113,113,.18); }

  /* ── Form ────────────────────────────────────────────────── */
  .form-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:14px; }
  .field { display:flex; flex-direction:column; gap:6px; }
  .field label { font-size:11px; font-weight:600; color:var(--fg-3); letter-spacing:.04em; }
  .field input, .field select { background:var(--bg-2); border:1px solid var(--bd-2); border-radius:var(--r-md); padding:8px 12px; font-size:13px; color:var(--fg-1); font-family:inherit; outline:none; transition:border-color .15s; }
  .field input:focus, .field select:focus { border-color:var(--pri); }

  /* ── Empty state ─────────────────────────────────────────── */
  .empty-state { padding:48px 24px; text-align:center; color:var(--fg-3); font-size:13px; }

  /* ── Responsive ──────────────────────────────────────────── */
  @media(max-width:1100px) { .health-grid, .tenant-grid { grid-template-columns:1fr; } }
  @media(max-width:700px) { .form-grid { grid-template-columns:1fr; } }
</style>
