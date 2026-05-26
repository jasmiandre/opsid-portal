<script lang="ts">
  import { page } from "$app/stores"
  import { onMount } from "svelte"

  let activeTab = "users"
  let impersonating = false
  let impersonateTarget = ""
  let showAddUser = false
  let showAddTenant = false

  const users = [
    { uid: "jasmiandre", name: "M Jasmi Dwi Andrea", email: "jasmiandre@opsid.web.id", role: "Superadmin", status: "active" },
    { uid: "admin.opsid", name: "Admin OPSID", email: "admin@opsid.web.id", role: "Admin", status: "active" },
    { uid: "dcops.idch", name: "DCOPS IDCloudHost", email: "dcops@idcloudhost.co.id", role: "Operator", status: "active" },
    { uid: "testuser", name: "Test User", email: "testuser@opsid.web.id", role: "Staff", status: "active" },
  ]

  const tenants = [
    { domain: "opsid.web.id", name: "OPSID Platform", status: "active", users: 4, ssl: "Valid" },
    { domain: "shll.web.id", name: "SHLL Corporation", status: "pending", users: 0, ssl: "Pending" },
  ]

  const services = [
    { name: "Nginx (edge-01)", ip: "10.34.1.1", status: "up", cpu: 8, ram: 23 },
    { name: "Portal (app-01)", ip: "10.34.1.2", status: "up", cpu: 12, ram: 31 },
    { name: "FreeIPA (dir-01)", ip: "10.34.1.3", status: "up", cpu: 15, ram: 45 },
    { name: "Keycloak (auth-01)", ip: "10.34.1.4", status: "up", cpu: 22, ram: 58 },
    { name: "FreeRADIUS (radius-01)", ip: "10.34.1.5", status: "up", cpu: 5, ram: 18 },
    { name: "SOGo Mail (mail-01)", ip: "10.34.1.6", status: "up", cpu: 18, ram: 42 },
    { name: "Nextcloud (collab-01)", ip: "10.34.1.7", status: "up", cpu: 35, ram: 62 },
    { name: "Odoo ERP (erp-01)", ip: "10.34.1.8", status: "up", cpu: 28, ram: 55 },
    { name: "PostgreSQL Primary (db-01)", ip: "10.34.1.9", status: "up", cpu: 20, ram: 48 },
    { name: "PostgreSQL Standby (db-02)", ip: "10.34.1.10", status: "up", cpu: 8, ram: 35 },
    { name: "Monitoring (mon-01)", ip: "10.34.1.11", status: "up", cpu: 12, ram: 40 },
  ]

  const auditLogs = [
    { time: "21:30:15", actor: "jasmiandre", action: "LOGIN", target: "portal", type: "info" },
    { time: "21:28:03", actor: "jasmiandre", action: "IMPERSONATE", target: "testuser", type: "warn" },
    { time: "21:15:44", actor: "admin.opsid", action: "CREATE_USER", target: "testuser", type: "info" },
    { time: "20:55:12", actor: "jasmiandre", action: "LOGIN", target: "portal", type: "info" },
    { time: "20:30:00", actor: "System", action: "SSL_RENEWED", target: "*.opsid.web.id", type: "info" },
  ]

  function doImpersonate(uid: string, name: string) {
    impersonating = true
    impersonateTarget = name
  }
  function stopImpersonate() {
    impersonating = false
    impersonateTarget = ""
  }
</script>

{#if impersonating}
<div class="impersonate-banner">
  <span class="imp-icon">⚠</span>
  <span>Anda sedang login sebagai <strong>{impersonateTarget}</strong></span>
  <button onclick={stopImpersonate}>Keluar dari Impersonate</button>
</div>
{/if}

<div class="admin-shell">
  <!-- Sidebar -->
  <aside class="admin-sidebar">
    <div class="admin-logo">
      <div class="logo-dot"></div>
      <div>
        <div class="logo-name">OPSID</div>
        <div class="logo-sub">Admin Console</div>
      </div>
    </div>

    <nav class="admin-nav">
      <button class="admin-nav-item" class:active={activeTab === 'users'} onclick={() => activeTab = 'users'}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
        User Management
      </button>
      <button class="admin-nav-item" class:active={activeTab === 'tenants'} onclick={() => activeTab = 'tenants'}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
        Tenant Management
      </button>
      <button class="admin-nav-item" class:active={activeTab === 'health'} onclick={() => activeTab = 'health'}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
        Service Health
      </button>
      <button class="admin-nav-item" class:active={activeTab === 'audit'} onclick={() => activeTab = 'audit'}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
        Audit Log
      </button>
    </nav>

    <a href="/" class="back-link">← Kembali ke Portal</a>
  </aside>

  <!-- Content -->
  <main class="admin-main">

    <!-- USER MANAGEMENT -->
    {#if activeTab === 'users'}
    <div class="admin-header">
      <div>
        <h1 class="admin-title">User Management</h1>
        <p class="admin-sub">{users.length} user terdaftar di sistem</p>
      </div>
      <button class="btn-add" onclick={() => showAddUser = !showAddUser}>+ Tambah User</button>
    </div>

    {#if showAddUser}
    <div class="add-form">
      <h3>Tambah User Baru</h3>
      <div class="form-grid">
        <div class="form-group">
          <label>Username</label>
          <input type="text" placeholder="john.doe" />
        </div>
        <div class="form-group">
          <label>Nama Lengkap</label>
          <input type="text" placeholder="John Doe" />
        </div>
        <div class="form-group">
          <label>Email</label>
          <input type="email" placeholder="john@opsid.web.id" />
        </div>
        <div class="form-group">
          <label>Departemen</label>
          <input type="text" placeholder="Engineering" />
        </div>
        <div class="form-group">
          <label>Role</label>
          <select>
            <option>Staff</option>
            <option>Admin</option>
            <option>Operator</option>
          </select>
        </div>
      </div>
      <div class="form-actions">
        <button class="btn-submit">Buat User</button>
        <button class="btn-cancel" onclick={() => showAddUser = false}>Batal</button>
      </div>
      <p class="form-note">* User akan otomatis dibuat di FreeIPA, Keycloak, SOGo, Nextcloud, dan Odoo dalam &lt;30 detik.</p>
    </div>
    {/if}

    <div class="table-wrap">
      <table class="data-table">
        <thead>
          <tr>
            <th>Username</th>
            <th>Nama</th>
            <th>Email</th>
            <th>Role</th>
            <th>Status</th>
            <th>Aksi</th>
          </tr>
        </thead>
        <tbody>
          {#each users as user}
          <tr>
            <td><code class="uid">{user.uid}</code></td>
            <td>{user.name}</td>
            <td class="email-cell">{user.email}</td>
            <td><span class="role-badge role-{user.role.toLowerCase()}">{user.role}</span></td>
            <td><span class="status-dot up"></span></td>
            <td>
              <div class="action-btns">
                <button class="action-btn" onclick={() => doImpersonate(user.uid, user.name)}>Impersonate</button>
                <button class="action-btn danger">Suspend</button>
              </div>
            </td>
          </tr>
          {/each}
        </tbody>
      </table>
    </div>
    {/if}

    <!-- TENANT MANAGEMENT -->
    {#if activeTab === 'tenants'}
    <div class="admin-header">
      <div>
        <h1 class="admin-title">Tenant Management</h1>
        <p class="admin-sub">Kelola multi-tenant dan white-label</p>
      </div>
      <button class="btn-add" onclick={() => showAddTenant = !showAddTenant}>+ Tambah Tenant</button>
    </div>

    {#if showAddTenant}
    <div class="add-form">
      <h3>Onboarding Tenant Baru</h3>
      <div class="form-grid">
        <div class="form-group">
          <label>Domain</label>
          <input type="text" placeholder="client.web.id" />
        </div>
        <div class="form-group">
          <label>Nama Perusahaan</label>
          <input type="text" placeholder="SHLL Corporation" />
        </div>
        <div class="form-group">
          <label>Warna Utama</label>
          <input type="color" value="#3B82F6" />
        </div>
        <div class="form-group">
          <label>Logo URL</label>
          <input type="text" placeholder="https://..." />
        </div>
      </div>
      <div class="form-actions">
        <button class="btn-submit">Aktivasi Tenant</button>
        <button class="btn-cancel" onclick={() => showAddTenant = false}>Batal</button>
      </div>
      <p class="form-note">* Sistem akan otomatis buat Nginx config, SSL certificate, dan Keycloak realm dalam &lt;2 menit.</p>
    </div>
    {/if}

    <div class="tenant-grid">
      {#each tenants as tenant}
      <div class="tenant-card">
        <div class="tenant-header">
          <div>
            <h3 class="tenant-name">{tenant.name}</h3>
            <code class="tenant-domain">{tenant.domain}</code>
          </div>
          <span class="tenant-status" class:active={tenant.status === 'active'}>
            {tenant.status === 'active' ? 'Aktif' : 'Pending'}
          </span>
        </div>
        <div class="tenant-stats">
          <div class="tenant-stat">
            <span class="ts-label">Users</span>
            <span class="ts-value">{tenant.users}</span>
          </div>
          <div class="tenant-stat">
            <span class="ts-label">SSL</span>
            <span class="ts-value" class:ssl-ok={tenant.ssl === 'Valid'}>{tenant.ssl}</span>
          </div>
        </div>
        <div class="tenant-actions">
          <button class="action-btn">Cek DNS</button>
          <button class="action-btn">Kelola User</button>
          {#if tenant.status === 'pending'}
          <button class="action-btn primary">Aktivasi</button>
          {/if}
        </div>
      </div>
      {/each}
    </div>
    {/if}

    <!-- SERVICE HEALTH -->
    {#if activeTab === 'health'}
    <div class="admin-header">
      <div>
        <h1 class="admin-title">Service Health</h1>
        <p class="admin-sub">Status real-time semua VM</p>
      </div>
      <span class="all-up">✓ Semua sistem normal</span>
    </div>

    <div class="health-grid">
      {#each services as svc}
      <div class="health-card">
        <div class="health-header">
          <span class="status-dot {svc.status}"></span>
          <div class="health-name">{svc.name}</div>
          <code class="health-ip">{svc.ip}</code>
        </div>
        <div class="metrics">
          <div class="metric">
            <div class="metric-label">CPU</div>
            <div class="metric-bar">
              <div class="metric-fill" style="width: {svc.cpu}%; background: {svc.cpu > 80 ? '#EF4444' : svc.cpu > 60 ? '#F59E0B' : '#10B981'}"></div>
            </div>
            <div class="metric-val">{svc.cpu}%</div>
          </div>
          <div class="metric">
            <div class="metric-label">RAM</div>
            <div class="metric-bar">
              <div class="metric-fill" style="width: {svc.ram}%; background: {svc.ram > 85 ? '#EF4444' : svc.ram > 70 ? '#F59E0B' : '#3B82F6'}"></div>
            </div>
            <div class="metric-val">{svc.ram}%</div>
          </div>
        </div>
      </div>
      {/each}
    </div>
    {/if}

    <!-- AUDIT LOG -->
    {#if activeTab === 'audit'}
    <div class="admin-header">
      <div>
        <h1 class="admin-title">Audit Log</h1>
        <p class="admin-sub">Semua aktivitas admin tercatat</p>
      </div>
    </div>
    <div class="table-wrap">
      <table class="data-table">
        <thead>
          <tr><th>Waktu</th><th>Actor</th><th>Aksi</th><th>Target</th><th>Tipe</th></tr>
        </thead>
        <tbody>
          {#each auditLogs as log}
          <tr>
            <td><code class="uid">{log.time}</code></td>
            <td>{log.actor}</td>
            <td><span class="action-tag action-{log.action.toLowerCase()}">{log.action}</span></td>
            <td>{log.target}</td>
            <td><span class="log-type {log.type}">{log.type}</span></td>
          </tr>
          {/each}
        </tbody>
      </table>
    </div>
    {/if}

  </main>
</div>

<style>
  :global(*, *::before, *::after) { box-sizing: border-box; margin: 0; padding: 0; }
  :global(body) { background: #0A0A0F; color: #E2E8F0; font-family: 'DM Sans', 'Segoe UI', sans-serif; }

  /* Impersonate Banner */
  .impersonate-banner {
    position: fixed; top: 0; left: 0; right: 0; z-index: 100;
    background: #EF4444; color: white;
    display: flex; align-items: center; justify-content: center; gap: 12px;
    padding: 10px 24px; font-size: 14px; font-weight: 500;
  }
  .imp-icon { font-size: 16px; }
  .impersonate-banner button {
    background: rgba(255,255,255,0.2); border: 1px solid rgba(255,255,255,0.4);
    color: white; padding: 4px 14px; border-radius: 6px; cursor: pointer; font-size: 13px;
  }

  /* Admin Shell */
  .admin-shell { display: flex; height: 100vh; overflow: hidden; }

  /* Admin Sidebar */
  .admin-sidebar {
    width: 240px; background: #0F0F1A; border-right: 1px solid #1E2035;
    display: flex; flex-direction: column; padding: 24px 16px; flex-shrink: 0;
  }
  .admin-logo { display: flex; align-items: center; gap: 10px; margin-bottom: 32px; padding: 0 8px; }
  .logo-dot { width: 8px; height: 8px; border-radius: 50%; background: #3B82F6; box-shadow: 0 0 8px #3B82F6; flex-shrink: 0; }
  .logo-name { font-size: 14px; font-weight: 800; letter-spacing: 1px; }
  .logo-sub { font-size: 10px; color: #4B5563; letter-spacing: 0.5px; }

  .admin-nav { display: flex; flex-direction: column; gap: 4px; flex: 1; }
  .admin-nav-item {
    display: flex; align-items: center; gap: 10px;
    padding: 10px 12px; border-radius: 10px; border: none;
    background: transparent; color: #4B5563; cursor: pointer;
    font-size: 13px; text-align: left; transition: all 0.2s;
  }
  .admin-nav-item:hover { background: #1E2035; color: #94A3B8; }
  .admin-nav-item.active { background: #1E3A5F; color: #3B82F6; }

  .back-link { font-size: 12px; color: #374151; padding: 8px 12px; transition: color 0.2s; }
  .back-link:hover { color: #64748B; }

  /* Admin Main */
  .admin-main { flex: 1; overflow-y: auto; padding: 32px; background: #0A0A0F; }

  .admin-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; }
  .admin-title { font-size: 22px; font-weight: 700; color: #F1F5F9; margin-bottom: 4px; }
  .admin-sub { font-size: 13px; color: #4B5563; }
  .all-up { font-size: 13px; color: #10B981; border: 1px solid #10B98133; background: #10B98111; padding: 8px 16px; border-radius: 8px; }

  .btn-add {
    background: #1E3A5F; color: #3B82F6; border: 1px solid #3B82F633;
    padding: 10px 20px; border-radius: 10px; font-size: 14px; font-weight: 600;
    cursor: pointer; transition: all 0.2s;
  }
  .btn-add:hover { background: #3B82F6; color: white; }

  /* Add Form */
  .add-form {
    background: #0F0F1A; border: 1px solid #3B82F633; border-radius: 16px;
    padding: 24px; margin-bottom: 24px;
  }
  .add-form h3 { font-size: 15px; font-weight: 600; color: #F1F5F9; margin-bottom: 20px; }
  .form-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 20px; }
  .form-group { display: flex; flex-direction: column; gap: 6px; }
  .form-group label { font-size: 11px; font-weight: 600; letter-spacing: 0.5px; color: #4B5563; }
  .form-group input, .form-group select {
    background: #1E2035; border: 1px solid #2D3748; color: #F1F5F9;
    padding: 10px 12px; border-radius: 8px; font-size: 14px; outline: none;
  }
  .form-group input:focus, .form-group select:focus { border-color: #3B82F6; }
  .form-actions { display: flex; gap: 12px; margin-bottom: 12px; }
  .btn-submit { background: #3B82F6; color: white; border: none; padding: 10px 24px; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; }
  .btn-cancel { background: #1E2035; color: #64748B; border: 1px solid #2D3748; padding: 10px 24px; border-radius: 8px; font-size: 14px; cursor: pointer; }
  .form-note { font-size: 11px; color: #4B5563; }

  /* Table */
  .table-wrap { background: #0F0F1A; border: 1px solid #1E2035; border-radius: 16px; overflow: hidden; }
  .data-table { width: 100%; border-collapse: collapse; }
  .data-table th {
    font-size: 10px; font-weight: 700; letter-spacing: 1.5px; color: #4B5563;
    padding: 14px 20px; border-bottom: 1px solid #1E2035; text-align: left;
  }
  .data-table td { padding: 14px 20px; font-size: 13px; color: #94A3B8; border-bottom: 1px solid #1E203550; }
  .data-table tr:last-child td { border-bottom: none; }
  .data-table tr:hover td { background: #11111A; }

  .uid { font-family: 'Fira Code', monospace; font-size: 12px; color: #60A5FA; background: #1E3A5F33; padding: 2px 8px; border-radius: 4px; }
  .email-cell { color: #64748B; font-size: 12px; }

  .role-badge { font-size: 11px; padding: 3px 10px; border-radius: 20px; font-weight: 600; }
  .role-superadmin { background: #7C3AED22; color: #A78BFA; border: 1px solid #7C3AED33; }
  .role-admin { background: #2563EB22; color: #60A5FA; border: 1px solid #2563EB33; }
  .role-operator { background: #0D948022; color: #34D399; border: 1px solid #0D948033; }
  .role-staff { background: #37415122; color: #9CA3AF; border: 1px solid #37415133; }

  .status-dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; }
  .status-dot.up { background: #10B981; box-shadow: 0 0 6px #10B981; }
  .status-dot.down { background: #EF4444; }

  .action-btns { display: flex; gap: 8px; }
  .action-btn {
    font-size: 11px; padding: 4px 12px; border-radius: 6px; border: 1px solid #2D3748;
    background: #1E2035; color: #64748B; cursor: pointer; transition: all 0.2s;
  }
  .action-btn:hover { border-color: #3B82F6; color: #3B82F6; }
  .action-btn.danger:hover { border-color: #EF4444; color: #EF4444; }
  .action-btn.primary { background: #1E3A5F; color: #3B82F6; border-color: #3B82F633; }

  /* Tenants */
  .tenant-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
  .tenant-card { background: #0F0F1A; border: 1px solid #1E2035; border-radius: 16px; padding: 20px; }
  .tenant-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; }
  .tenant-name { font-size: 15px; font-weight: 600; color: #F1F5F9; margin-bottom: 4px; }
  .tenant-domain { font-size: 12px; color: #60A5FA; background: #1E3A5F33; padding: 2px 8px; border-radius: 4px; }
  .tenant-status { font-size: 11px; padding: 4px 12px; border-radius: 20px; border: 1px solid; }
  .tenant-status.active { color: #10B981; border-color: #10B98133; background: #10B98111; }
  .tenant-status:not(.active) { color: #F59E0B; border-color: #F59E0B33; background: #F59E0B11; }
  .tenant-stats { display: flex; gap: 24px; margin-bottom: 16px; }
  .tenant-stat { display: flex; flex-direction: column; gap: 2px; }
  .ts-label { font-size: 10px; color: #4B5563; }
  .ts-value { font-size: 16px; font-weight: 700; color: #F1F5F9; }
  .ssl-ok { color: #10B981 !important; }
  .tenant-actions { display: flex; gap: 8px; }

  /* Health */
  .health-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
  .health-card { background: #0F0F1A; border: 1px solid #1E2035; border-radius: 12px; padding: 16px; }
  .health-header { display: flex; align-items: center; gap: 8px; margin-bottom: 14px; }
  .health-name { font-size: 12px; font-weight: 600; color: #94A3B8; flex: 1; }
  .health-ip { font-size: 10px; color: #4B5563; }
  .metrics { display: flex; flex-direction: column; gap: 8px; }
  .metric { display: flex; align-items: center; gap: 8px; }
  .metric-label { font-size: 10px; color: #4B5563; width: 30px; }
  .metric-bar { flex: 1; height: 4px; background: #1E2035; border-radius: 2px; overflow: hidden; }
  .metric-fill { height: 100%; border-radius: 2px; transition: width 0.3s; }
  .metric-val { font-size: 11px; color: #64748B; width: 30px; text-align: right; }

  /* Audit */
  .action-tag { font-size: 10px; padding: 2px 8px; border-radius: 4px; font-family: monospace; }
  .action-login { background: #1E3A5F; color: #60A5FA; }
  .action-impersonate { background: #7C3AED22; color: #A78BFA; }
  .action-create_user { background: #0D948022; color: #34D399; }
  .action-ssl_renewed { background: #D9770622; color: #FCD34D; }
  .log-type { font-size: 11px; padding: 2px 8px; border-radius: 4px; }
  .log-type.info { background: #1E3A5F; color: #60A5FA; }
  .log-type.warn { background: #7C3AED22; color: #A78BFA; }
</style>
