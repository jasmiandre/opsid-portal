<script lang="ts">
  import { auth } from '../../auth.svelte';
  import { ui } from '../../ui.svelte';
  import { onMount } from 'svelte';
  import TenantUsersModal from '../../components/TenantUsersModal.svelte';
  import DnsWizard from '../../components/DnsWizard.svelte';

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
    mail:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" width="13" height="13"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>`,
    key:     `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" width="13" height="13"><circle cx="7.5" cy="15.5" r="5.5"/><path d="m21 2-9.6 9.6"/><path d="m15.5 7.5 3 3L22 7l-3-3"/></svg>`,
    check:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><polyline points="20 6 9 17 4 12"/></svg>`,
    download:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" width="13" height="13"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`,
    x:       `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
    bell:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><path d="M6 8a6 6 0 1 1 12 0c0 7 3 7 3 9H3c0-2 3-2 3-9Z"/><path d="M10 21a2 2 0 0 0 4 0"/></svg>`,
    searchSm:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><circle cx="11" cy="11" r="7"/><path d="m20 20-4.3-4.3"/></svg>`,
    inbox:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg>`,
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
    plan_odoo_gb?: number;
    max_users?: number;
    plan_tier?: string;
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
    disk?: number;
    load?: number;
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
  interface ProvStep { step: string; ok: boolean; error?: string; }
  interface OnboardingRequest {
    id: number;
    company_name: string;
    pic_name: string;
    pic_email: string;
    pic_whatsapp?: string;
    domain_type?: string;
    domain_value?: string;
    user_count: number;
    plan_tier: string;
    status: string;
    notes?: string;
    tenant_id?: number;
    provisioning_log?: ProvStep[];
    created_at: string;
    reviewed_at?: string;
    reviewed_by?: string;
  }
  interface ApproveResult {
    reqId:         number;
    tenant?:       any;
    adminUsername?: string;
    adminPassword?: string;
    domain?:       string;
    steps?:        { step: string; ok: boolean; error?: string }[];
    error?:        string;
  }

  // ── State ───────────────────────────────────────────────────
  let activeTab     = $state('users');
  let loading       = $state(true);
  let submitting    = $state(false);
  let users         = $state<User[]>([]);
  let tenants       = $state<Tenant[]>([]);
  let services      = $state<VM[]>([]);
  let auditLogs         = $state<AuditLog[]>([]);
  let onboardingReqs    = $state<OnboardingRequest[]>([]);
  let onboardingFilter  = $state('pending');
  let onboardingBusy    = $state<number | null>(null);
  let rejectModal       = $state<OnboardingRequest | null>(null);
  let rejectNotes       = $state('');
  let approveResult     = $state<ApproveResult | null>(null);
  // ── Reprovision ─────────────────────────────────────────────
  let reprovisionBusy      = $state<number | null>(null);
  let reprovisionResult    = $state<{ reqId: number; steps: ProvStep[]; mergedLog: ProvStep[]; adminPassword?: string; error?: string } | null>(null);
  let provLogModal         = $state<OnboardingRequest | null>(null);
  let resetProcessingBusy  = $state<number | null>(null);
  let searchUser    = $state('');
  let searchAudit   = $state('');
  let showAddUser   = $state(false);
  let showAddTenant = $state(false);
  let confirmDelete = $state<Tenant | null>(null);

  // ── Edit Tenant modal ───────────────────────────────────────
  let editTenantTarget = $state<Tenant | null>(null);
  let editTenantForm   = $state({
    name: '', primaryColor: '#3B82F6', logoUrl: '',
    planNextcloudGb: 50, planEmailGb: 50, planOdooGb: 50,
    maxUsers: 50, planTier: 'basic', status: 'active',
  });
  let editTenantBusy = $state(false);
  let editTenantMsg  = $state('');

  let impersonating       = $state(false);
  let impersonateTarget   = $state('');

  // ── Edit User modal ─────────────────────────────────────────
  let editTarget  = $state<User | null>(null);
  let editForm    = $state({ fullname: '', email: '', dept: '', role: '' });
  let editBusy    = $state(false);
  let editMsg     = $state('');

  // ── Delete User confirmation ────────────────────────────────
  let deleteUserTarget = $state<User | null>(null);

  // ── Reset Password ──────────────────────────────────────────
  let resetPwTarget = $state<User | null>(null);
  let resetPwValue  = $state('');
  let resetPwBusy   = $state(false);
  let resetPwMsg    = $state('');

  // ── Tenant Users Modal ──────────────────────────────────────
  let tenantUsersOpen   = $state(false);
  let tenantUsersTarget = $state<Tenant | null>(null);

  // ── DNS Wizard Modal (superadmin — per tenant card) ──────────
  let dnsWizardOpen   = $state(false);
  let dnsWizardTarget = $state<Tenant | null>(null);

  // ── DNS check inline result ─────────────────────────────────
  interface DnsResult { domain: string; pointing: boolean; resolved_ip?: string; target_ip?: string; error?: string; }
  let dnsResults = $state<Record<string, DnsResult>>({});

  // ── SSL check inline result ──────────────────────────────────
  interface SslResult {
    domain: string; dns_pointing: boolean; dns_ip?: string;
    ssl_valid?: boolean; ssl_subject?: string; ssl_issuer?: string;
    ssl_expires?: string; ssl_days_left?: number; ssl_error?: string;
  }
  let sslResults  = $state<Record<string, SslResult>>({});
  let sslChecking = $state<Record<string, boolean>>({});

  // ── Validation check ─────────────────────────────────────────
  interface CheckItem  { ok: boolean; detail: string; [k: string]: any }
  interface CheckResult {
    allPassing:       boolean;
    failCount:        number;
    tenant:           any;
    onboarding:       any;
    provisioning_log: ProvStep[];
    checks: {
      dns:           CheckItem | null;
      ssl:           CheckItem | null;
      kc_org:        CheckItem;
      kc_user:       CheckItem;
      freeipa_group: CheckItem;
      freeipa_user:  CheckItem;
      nc_group:      CheckItem;
      nc_user:       CheckItem;
      sogo_quota:    CheckItem;
      odoo_company:  CheckItem;
      odoo_user:     CheckItem;
    };
    checked_at: string;
  }
  let checkBusy        = $state<Record<number, boolean>>({});
  let checkAllBusy     = $state(false);
  let validationModal  = $state<CheckResult | null>(null);
  let quickCheck       = $state<Record<number, { allPassing: boolean; failCount: number }>>({});

  // ── Tenant Profile edit (for tenant admin) ──────────────────
  let tenantEditForm  = $state({ primaryColor: '', logoUrl: '' });
  let tenantEditMsg   = $state('');
  let tenantEditBusy  = $state(false);

  $effect(() => {
    if (activeTab === 'requests') fetchOnboardingRequests();
  });

  $effect(() => {
    if (onboardingFilter) fetchOnboardingRequests();
  });

  $effect(() => {
    // Pre-fill from auth profile when tab opens
    if (activeTab === 'tenant-profile') {
      tenantEditForm = {
        primaryColor: auth.profile.organizationSlug ? '#3B82F6' : '#3B82F6',
        logoUrl: '',
      };
      tenantEditMsg = '';
    }
  });

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
  // Track if user manually edited the slug so we stop auto-generating
  let slugManuallyEdited = $state(false);

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
      { id: 'users',          label: 'User Management',   icon: I.users    },
      { id: 'tenants',        label: 'Tenant Management', icon: I.building },
      { id: 'health',         label: 'Service Health',    icon: I.pulse    },
      { id: 'audit',          label: 'Audit Log',         icon: I.fileText },
      { id: 'requests',       label: 'Permintaan',        icon: I.inbox    },
    ];
    if (auth.profile.isAdmin) return all;
    if (auth.profile.isTenantAdmin) return [
      { id: 'users',          label: 'User Management',   icon: I.users    },
      { id: 'tenant-profile', label: 'Profil Organisasi', icon: I.building },
      { id: 'dns-email',      label: 'DNS & Email',       icon: I.mail     },
    ];
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
      else auditLogs = [];
    } catch {
      auditLogs = [];
    }
  }

  async function fetchOnboardingRequests() {
    try {
      const res = await fetch('/api/onboarding?status=' + onboardingFilter);
      const data = await res.json();
      if (data.ok) onboardingReqs = data.requests ?? [];
    } catch {
      onboardingReqs = [];
    }
  }

  async function reviewRequest(req: OnboardingRequest, status: 'approved' | 'rejected', notes?: string) {
    onboardingBusy = req.id;
    try {
      const res = await fetch('/api/onboarding/' + req.id, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, notes: notes ?? null }),
      });
      const data = await res.json();
      if (data.ok) {
        onboardingReqs = onboardingReqs.map(r =>
          r.id === req.id
            ? { ...r, status, tenant_id: data.tenant?.id }
            : r
        );
        if (rejectModal?.id === req.id) { rejectModal = null; rejectNotes = ''; }
        if (status === 'approved') {
          approveResult = {
            reqId:         req.id,
            tenant:        data.tenant,
            adminUsername: data.adminUsername,
            adminPassword: data.adminPassword,
            domain:        data.domain,
            steps:         data.steps,
          };
        }
      } else {
        approveResult = {
          reqId: req.id,
          error: data.error ?? 'Unknown error',
          steps: data.steps,
        };
      }
    } catch (e) {
      approveResult = { reqId: req.id, error: 'Koneksi gagal: ' + String(e) };
    }
    onboardingBusy = null;
  }

  async function reprovision(req: OnboardingRequest) {
    reprovisionBusy = req.id;
    try {
      const res  = await fetch(`/api/admin/onboarding/${req.id}/reprovision`, { method: 'POST' });
      const data = await res.json();
      // Update local provisioning_log with merged result
      if (data.mergedLog) {
        onboardingReqs = onboardingReqs.map(r =>
          r.id === req.id ? { ...r, provisioning_log: data.mergedLog } : r
        );
      }
      reprovisionResult = {
        reqId:         req.id,
        steps:         data.steps ?? [],
        mergedLog:     data.mergedLog ?? [],
        adminPassword: data.adminPassword,
        error:         data.ok ? undefined : (data.error ?? 'Beberapa step gagal'),
      };
    } catch (e) {
      reprovisionResult = { reqId: req.id, steps: [], mergedLog: [], error: 'Koneksi gagal: ' + String(e) };
    }
    reprovisionBusy = null;
  }

  async function resetProcessingRequest(req: OnboardingRequest) {
    resetProcessingBusy = req.id;
    try {
      const res = await fetch('/api/onboarding/' + req.id, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'reset_pending', notes: 'Reset manual oleh admin dari status processing' }),
      });
      const data = await res.json();
      if (data.ok) {
        onboardingReqs = onboardingReqs.map(r =>
          r.id === req.id ? { ...r, status: 'pending' } : r
        );
      }
    } catch (e) {
      console.error('Reset processing failed:', e);
    }
    resetProcessingBusy = null;
  }

  async function createUser() {
    if (!newUser.username || !newUser.fullname || !newUser.email || !newUser.password) return;
    // Validate email domain for tenant admins
    if (!auth.profile.isAdmin) {
      const expectedDomain = auth.profile.tenantDomain || (auth.profile.organizationSlug ? auth.profile.organizationSlug + '.opsid.web.id' : null);
      if (expectedDomain && !newUser.email.endsWith('@' + expectedDomain)) {
        alert(`Email harus menggunakan domain @${expectedDomain}`);
        return;
      }
    }
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

  // ── Edit Tenant ──────────────────────────────────────────────
  function openEditTenant(t: Tenant) {
    editTenantTarget = t;
    editTenantForm = {
      name:             t.name,
      primaryColor:     t.primary_color,
      logoUrl:          t.logo_url ?? '',
      planNextcloudGb:  t.plan_nextcloud_gb ?? 50,
      planEmailGb:      t.plan_email_gb ?? 50,
      planOdooGb:       50,
      maxUsers:         50,
      planTier:         'basic',
      status:           t.status ?? 'active',
    };
    editTenantMsg = '';
  }

  async function saveEditTenant() {
    if (!editTenantTarget?.id) return;
    editTenantBusy = true; editTenantMsg = '';
    try {
      const res = await fetch('/api/admin/tenant/' + editTenantTarget.id, {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(editTenantForm),
      });
      const data = await res.json();
      if (data.ok) {
        editTenantMsg = 'Tersimpan';
        // Update local state immediately
        tenants = tenants.map(t =>
          t.id === editTenantTarget!.id
            ? {
                ...t,
                name:             editTenantForm.name,
                primary_color:    editTenantForm.primaryColor,
                logo_url:         editTenantForm.logoUrl,
                plan_nextcloud_gb: editTenantForm.planNextcloudGb,
                plan_email_gb:    editTenantForm.planEmailGb,
                status:           editTenantForm.status,
              }
            : t
        );
        setTimeout(() => { editTenantTarget = null; }, 800);
      } else {
        editTenantMsg = 'Gagal: ' + (data.error ?? 'Unknown error');
      }
    } catch {
      editTenantMsg = 'Koneksi gagal';
    }
    editTenantBusy = false;
  }

  async function checkDns(tenant: Tenant) {
    if (!tenant.id) return;
    const key = tenant.domain;
    dnsResults[key] = { domain: tenant.domain, pointing: false, resolved_ip: '…' };
    try {
      const res = await fetch('/api/admin/tenant/' + tenant.id + '/dns');
      const data = await res.json();
      dnsResults[key] = {
        domain: data.domain ?? tenant.domain,
        pointing: !!data.pointing,
        resolved_ip: data.resolved_ip ?? 'tidak ditemukan',
        target_ip: data.target_ip,
        error: data.error,
      };
    } catch {
      dnsResults[key] = { domain: tenant.domain, pointing: false, error: 'Koneksi gagal' };
    }
  }

  async function checkSsl(tenant: Tenant) {
    if (!tenant.id) return;
    const key = String(tenant.id);
    sslChecking[key] = true;
    try {
      const res  = await fetch('/api/admin/tenant/' + tenant.id + '/ssl');
      const data = await res.json();
      sslResults[key] = data;
    } catch {
      sslResults[key] = { domain: tenant.domain, dns_pointing: false, ssl_error: 'Koneksi gagal' };
    }
    sslChecking[key] = false;
  }

  // ── Validation check ─────────────────────────────────────────
  async function runCheck(tenant: Tenant, withSsl = false) {
    checkBusy[tenant.id] = true;
    try {
      const qs  = withSsl ? '?ssl=1' : '';
      const res = await fetch(`/api/admin/tenant/${tenant.id}/check${qs}`);
      const data: CheckResult = await res.json();
      validationModal = data;
      quickCheck[tenant.id] = { allPassing: data.allPassing, failCount: data.failCount };
    } catch (e) {
      const fallback: CheckResult = {
        allPassing: false, failCount: 1,
        tenant: { id: tenant.id, name: tenant.name, slug: '', domain: tenant.domain, status: '', plan_tier: '' },
        onboarding: null, provisioning_log: [],
        checks: { dns: null, ssl: null, kc_org: { ok: false, detail: 'Koneksi gagal' },
          kc_user: { ok: false, detail: '' }, freeipa_group: { ok: false, detail: '' },
          freeipa_user: { ok: false, detail: '' }, nc_group: { ok: false, detail: '' },
          nc_user: { ok: false, detail: '' }, sogo_quota: { ok: false, detail: '' },
          odoo_company: { ok: false, detail: '' }, odoo_user: { ok: false, detail: '' } },
        checked_at: new Date().toISOString(),
      };
      validationModal = fallback;
      quickCheck[tenant.id] = { allPassing: false, failCount: 1 };
    }
    checkBusy[tenant.id] = false;
  }

  async function checkAll() {
    checkAllBusy = true;
    for (const t of tenants) {
      if (!t.id) continue;
      checkBusy[t.id] = true;
      try {
        const res  = await fetch(`/api/admin/tenant/${t.id}/check`);
        const data = await res.json();
        if (data && typeof data.allPassing === 'boolean') {
          quickCheck[t.id] = { allPassing: data.allPassing, failCount: data.failCount ?? 0 };
        }
      } catch { /* skip failed tenants */ }
      checkBusy[t.id] = false;
    }
    checkAllBusy = false;
  }

  async function doImpersonate(username: string, name: string) {
    try {
      const res = await fetch('/api/admin/impersonate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username }),
      });
      const data = await res.json();
      if (data.ok && data.redirect) {
        impersonating = true;
        impersonateTarget = name;
        window.open(data.redirect, '_blank');
      } else {
        alert('Impersonasi gagal: ' + (data.error ?? 'Unknown error'));
      }
    } catch {
      alert('Koneksi gagal');
    }
  }

  function stopImpersonate() {
    impersonating = false;
    impersonateTarget = '';
  }

  // ── Edit User ────────────────────────────────────────────────
  function openEditUser(u: User) {
    editTarget = u;
    editForm   = { fullname: u.name, email: u.email, dept: u.dept, role: u.role };
    editMsg    = '';
  }

  async function saveEditUser() {
    if (!editTarget) return;
    editBusy = true; editMsg = '';
    try {
      const res = await fetch(`/api/users/${encodeURIComponent(editTarget.username)}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          fullname: editForm.fullname,
          email:    editForm.email,
          dept:     editForm.dept,
          role:     editForm.role,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        editMsg = 'Tersimpan';
        // Update local state immediately
        users = users.map(u =>
          u.username === editTarget!.username
            ? { ...u, name: editForm.fullname, email: editForm.email, dept: editForm.dept, role: editForm.role }
            : u
        );
        setTimeout(() => { editTarget = null; }, 800);
      } else {
        editMsg = 'Gagal: ' + (data.error ?? 'Unknown error');
      }
    } catch {
      editMsg = 'Koneksi gagal';
    }
    editBusy = false;
  }

  // ── Suspend / Activate ───────────────────────────────────────
  async function doSuspendToggle(u: User) {
    const action = u.status === 'active' ? 'suspend' : 'activate';
    const label  = action === 'suspend' ? 'men-suspend' : 'mengaktifkan';
    if (!confirm(`Yakin ingin ${label} user ${u.name}?`)) return;
    try {
      const res = await fetch(`/api/users/${encodeURIComponent(u.username)}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ action }),
      });
      const data = await res.json();
      if (data.ok) {
        users = users.map(x =>
          x.username === u.username
            ? { ...x, status: action === 'suspend' ? 'suspended' : 'active' }
            : x
        );
      } else {
        alert('Gagal: ' + (data.error ?? 'Unknown error'));
      }
    } catch {
      alert('Koneksi gagal');
    }
  }

  // ── Delete User ──────────────────────────────────────────────
  async function doDeleteUser(u: User) {
    submitting = true;
    try {
      const res = await fetch(`/api/users/${encodeURIComponent(u.username)}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.ok) {
        users = users.filter(x => x.username !== u.username);
        deleteUserTarget = null;
      } else {
        alert('Gagal menghapus: ' + (data.error ?? 'Unknown error'));
      }
    } catch {
      alert('Koneksi gagal');
    }
    submitting = false;
  }

  // ── Reset Password ───────────────────────────────────────────
  async function doResetPassword() {
    if (!resetPwTarget) return;
    if (!resetPwValue || resetPwValue.length < 8) { resetPwMsg = 'Password minimal 8 karakter'; return; }
    resetPwBusy = true; resetPwMsg = '';
    try {
      const res = await fetch(`/api/users/${encodeURIComponent(resetPwTarget.username)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset_password', newPassword: resetPwValue }),
      });
      const data = await res.json();
      if (data.ok) {
        resetPwMsg = 'Password berhasil direset';
        setTimeout(() => { resetPwTarget = null; resetPwValue = ''; resetPwMsg = ''; }, 1200);
      } else {
        resetPwMsg = 'Gagal: ' + (data.error ?? 'Unknown error');
      }
    } catch {
      resetPwMsg = 'Koneksi gagal';
    }
    resetPwBusy = false;
  }

  async function saveTenantBranding() {
    const tid = auth.profile.tenantId;
    if (!tid) { tenantEditMsg = 'Tenant ID tidak ditemukan'; return; }
    tenantEditBusy = true; tenantEditMsg = '';
    try {
      const res = await fetch('/api/admin/tenant/' + tid, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          primaryColor: tenantEditForm.primaryColor,
          logoUrl: tenantEditForm.logoUrl,
        }),
      });
      const d = await res.json();
      if (d.ok) {
        tenantEditMsg = 'Branding berhasil disimpan';
      } else {
        tenantEditMsg = 'Gagal: ' + (d.error ?? 'Unknown error');
      }
    } catch {
      tenantEditMsg = 'Koneksi gagal';
    }
    tenantEditBusy = false;
  }

  // ── Mount ───────────────────────────────────────────────────
  onMount(async () => {
    await Promise.allSettled([fetchUsers(), fetchTenants(), fetchHealth(), fetchAuditLogs(), fetchOnboardingRequests()]);
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
      <button class="userchip" onclick={() => ui.openProfile('profil')}>
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
          {@html t.icon} <span class="tab-label">{t.label}</span>
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
                <th class="col-email">Email</th>
                <th class="col-dept">Departemen</th>
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
                  <td class="col-email email-cell">{u.email}</td>
                  <td class="col-dept">{u.dept}</td>
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
                      <button class="btn btn-ghost btn-sm" title="Impersonate"
                        onclick={() => doImpersonate(u.username, u.name ?? u.username)}>
                        {@html I.eye}
                      </button>
                      <button class="btn btn-ghost btn-sm" title="Edit"
                        onclick={() => openEditUser(u)}>
                        {@html I.edit}
                      </button>
                      <button class="btn btn-ghost btn-sm" title="Reset Password"
                        onclick={() => { resetPwTarget = u; resetPwValue = ''; resetPwMsg = ''; }}>
                        {@html I.key}
                      </button>
                      <button class="btn btn-ghost btn-sm"
                        style="color:{u.status === 'active' ? 'var(--warn)' : 'var(--ok)'}"
                        title={u.status === 'active' ? 'Suspend' : 'Aktifkan'}
                        onclick={() => doSuspendToggle(u)}>
                        {@html I.lock}
                      </button>
                      <button class="btn btn-ghost btn-sm" style="color:var(--danger)" title="Hapus"
                        onclick={() => deleteUserTarget = u}>
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

      {#if showAddUser}
        {@const emailDomain = auth.profile.isAdmin ? null : (auth.profile.tenantDomain || (auth.profile.organizationSlug ? auth.profile.organizationSlug + '.opsid.web.id' : null))}
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
                <div class="field">
                  <label for="u-email">Email</label>
                  <input id="u-email"
                    placeholder={emailDomain ? `john@${emailDomain}` : 'john@opsid.web.id'}
                    bind:value={newUser.email}
                  />
                  {#if emailDomain}
                    <span style="font-size:10px;color:var(--fg-4)">Email harus @{emailDomain}</span>
                  {/if}
                </div>
                <div class="field"><label for="u-dept">Departemen</label><input id="u-dept" placeholder="Engineering" bind:value={newUser.dept} /></div>
                <div class="field">
                  <label for="u-role">Role</label>
                  <select id="u-role" bind:value={newUser.role}>
                    <option value="Staff">Staff</option>
                    <option value="Operator">Operator</option>
                    <option value="Manager">Manager</option>
                    <option value="org-admin">Tenant Admin</option>
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

      <!-- ── Edit User Modal ───────────────────────────────── -->
      {#if editTarget}
        <div class="modal-overlay" onclick={() => editTarget = null}>
          <div class="modal" onclick={(e) => e.stopPropagation()}>
            <div class="modal-head">
              <h3>Edit User · <span class="mono" style="font-size:13px;color:var(--fg-3)">{editTarget.username}</span></h3>
              <button class="btn-icon" onclick={() => editTarget = null}>{@html I.x}</button>
            </div>
            <div class="modal-body">
              <div class="form-grid">
                <div class="field" style="grid-column:span 3">
                  <label for="eu-name">Nama Lengkap</label>
                  <input id="eu-name" placeholder="Nama lengkap" bind:value={editForm.fullname} />
                </div>
                <div class="field" style="grid-column:span 2">
                  <label for="eu-email">Email</label>
                  <input id="eu-email" type="email" placeholder="email@domain.com" bind:value={editForm.email} />
                </div>
                <div class="field">
                  <label for="eu-dept">Departemen</label>
                  <input id="eu-dept" placeholder="Engineering" bind:value={editForm.dept} />
                </div>
                <div class="field">
                  <label for="eu-role">Role</label>
                  <select id="eu-role" bind:value={editForm.role}>
                    <option value="Staff">Staff</option>
                    <option value="Operator">Operator</option>
                    <option value="Manager">Manager</option>
                    <option value="org-admin">Tenant Admin</option>
                    <option value="Superadmin">Superadmin</option>
                  </select>
                </div>
              </div>
              {#if editMsg}
                <p style="margin-top:12px;font-size:12px;color:{editMsg === 'Tersimpan' ? 'var(--ok)' : 'var(--danger)'}">
                  {editMsg}
                </p>
              {/if}
            </div>
            <div class="modal-foot">
              <button class="btn btn-secondary" onclick={() => editTarget = null}>Batal</button>
              <button class="btn btn-primary" onclick={saveEditUser} disabled={editBusy}>
                {editBusy ? 'Menyimpan...' : 'Simpan Perubahan'}
              </button>
            </div>
          </div>
        </div>
      {/if}

      <!-- ── Delete User Confirmation ──────────────────────── -->
      {#if deleteUserTarget}
        <div class="modal-overlay" onclick={() => deleteUserTarget = null}>
          <div class="modal" style="width:420px" onclick={(e) => e.stopPropagation()}>
            <div class="modal-head">
              <h3>Hapus User</h3>
              <button class="btn-icon" onclick={() => deleteUserTarget = null}>{@html I.x}</button>
            </div>
            <div class="modal-body">
              <p style="font-size:13px;color:var(--fg-2);line-height:1.6">
                Yakin ingin menghapus user <strong style="color:var(--fg-1)">{deleteUserTarget.name}</strong>
                (<code class="mono">{deleteUserTarget.username}</code>)?
                User akan dihapus dari FreeIPA, Keycloak, dan tenant. Tindakan ini tidak dapat dibatalkan.
              </p>
            </div>
            <div class="modal-foot">
              <button class="btn btn-secondary" onclick={() => deleteUserTarget = null}>Batal</button>
              <button class="btn btn-danger" disabled={submitting}
                onclick={() => deleteUserTarget && doDeleteUser(deleteUserTarget)}>
                {submitting ? 'Menghapus...' : 'Hapus Permanen'}
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
        <div style="display:flex;gap:8px;align-items:center">
          <button class="btn btn-secondary btn-sm" onclick={checkAll} disabled={checkAllBusy} title="Jalankan validasi semua tenant sekaligus">
            {checkAllBusy ? '⏳' : '🔍'} Check All
          </button>
          <button class="btn btn-primary btn-sm" onclick={() => { showAddTenant = true; slugManuallyEdited = false; }}>
            {@html I.plus} Onboarding Tenant
          </button>
        </div>
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
                  <span class="tag {t.status === 'suspended' ? 'tag-danger' : t.status === 'inactive' ? 'tag-warn' : 'tag-ok'}">
                    {t.status === 'suspended' ? 'Suspended' : t.status === 'inactive' ? 'Tidak Aktif' : 'Aktif'}
                  </span>
                </div>
                <div class="tenant-stats">
                  <div><div class="ts-label">Users</div><div class="ts-val mono">{t.user_count ?? 0}{t.max_users ? '/' + t.max_users : ''}</div></div>
                  <div><div class="ts-label">Storage</div><div class="ts-val mono">{t.plan_nextcloud_gb ?? 50} GB</div></div>
                  <div><div class="ts-label">Paket</div><div class="ts-val mono" style="text-transform:capitalize">{t.plan_tier ?? 'basic'}</div></div>
                </div>
                {#if quickCheck[t.id]}
                  <div class="quick-check" class:qc-ok={quickCheck[t.id].allPassing} class:qc-fail={!quickCheck[t.id].allPassing}>
                    {#if quickCheck[t.id].allPassing}
                      ✓ Semua layanan OK
                    {:else}
                      ⚠ {quickCheck[t.id].failCount} layanan bermasalah · klik Validasi untuk detail
                    {/if}
                  </div>
                {/if}
                {#if dnsResults[t.domain]}
                  {@const dr = dnsResults[t.domain]}
                  <div class="dns-result" class:dns-ok={dr.pointing} class:dns-fail={!dr.pointing && dr.resolved_ip !== '…'}>
                    {#if dr.resolved_ip === '…'}
                      <span>⏳ Memeriksa DNS…</span>
                    {:else if dr.pointing}
                      <span>✓ DNS OK · {dr.domain} → {dr.resolved_ip}</span>
                    {:else if dr.error}
                      <span>✗ {dr.error}</span>
                    {:else}
                      <span>✗ Belum diarahkan · {dr.domain} → {dr.resolved_ip ?? '?'} (target: {dr.target_ip})</span>
                    {/if}
                  </div>
                {/if}
                {#if sslResults[String(t.id)]}
                  {@const sr = sslResults[String(t.id)]}
                  <div class="ssl-result" class:ssl-ok={sr.ssl_valid} class:ssl-fail={sr.ssl_valid === false && !sslChecking[String(t.id)]}>
                    {#if sr.ssl_valid}
                      <span>🔒 SSL OK · {sr.ssl_subject} · {sr.ssl_issuer}</span>
                      {#if (sr.ssl_days_left ?? 999) < 30}
                        <span style="color:var(--warn)"> · Expires {sr.ssl_days_left}d</span>
                      {:else}
                        <span style="color:var(--fg-4)"> · {sr.ssl_days_left}d left</span>
                      {/if}
                    {:else if sr.ssl_error}
                      <span>⚠ SSL: {sr.ssl_error}</span>
                    {:else}
                      <span>✗ SSL tidak valid</span>
                    {/if}
                  </div>
                {/if}
                <div class="tenant-actions">
                  <button class="btn btn-primary btn-sm" onclick={() => runCheck(t)} disabled={checkBusy[t.id]}>
                    {checkBusy[t.id] ? '⏳' : '🔍'} {checkBusy[t.id] ? 'Checking…' : 'Validasi'}
                  </button>
                  <button class="btn btn-secondary btn-sm" onclick={() => checkDns(t)}>{@html I.globe} DNS</button>
                  <button class="btn btn-secondary btn-sm" onclick={() => checkSsl(t)} disabled={sslChecking[String(t.id)]}>
                    🔒 {sslChecking[String(t.id)] ? '…' : 'SSL'}
                  </button>
                  <button class="btn btn-secondary btn-sm" onclick={() => { dnsWizardTarget = t; dnsWizardOpen = true; }}>
                    {@html I.mail} Mail DNS
                  </button>
                  <button class="btn btn-secondary btn-sm" onclick={() => { tenantUsersTarget = t; tenantUsersOpen = true; }}>
                    {@html I.users} User
                  </button>
                  <button class="btn btn-secondary btn-sm" onclick={() => openEditTenant(t)}>
                    {@html I.edit} Edit
                  </button>
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
              <div class="form-grid-2">
                <div class="field" style="grid-column:span 2">
                  <label for="t-name">Nama Organisasi</label>
                  <input id="t-name" placeholder="PT Contoh Indonesia" bind:value={newTenant.name}
                    oninput={() => { if (!slugManuallyEdited) newTenant.slug = generateSlug(newTenant.name); }} />
                </div>
                <div class="field">
                  <label for="t-slug">Slug URL</label>
                  <input id="t-slug" placeholder="auto dari nama" bind:value={newTenant.slug}
                    oninput={() => { slugManuallyEdited = newTenant.slug.length > 0; }} />
                  <span class="field-preview">&#8618; {tenantSubdomain}</span>
                </div>
                <div class="field">
                  <label for="t-color">Warna Brand</label>
                  <input id="t-color" type="color" bind:value={newTenant.primaryColor} style="height:40px;padding:4px" />
                </div>
                <div class="field" style="grid-column:span 2">
                  <label for="t-logo">Logo URL (opsional)</label>
                  <input id="t-logo" placeholder="https://cdn.contoh.co.id/logo.png" bind:value={newTenant.logoUrl} />
                </div>
                <div class="field" style="grid-column:span 2">
                  <label>Quota Penyimpanan</label>
                  <div class="quota-row">
                    <div class="field">
                      <label for="t-nc" class="sublabel">Nextcloud (GB)</label>
                      <input id="t-nc" type="number" min="1" bind:value={newTenant.planNextcloudGb} />
                    </div>
                    <div class="field">
                      <label for="t-em" class="sublabel">Email (GB)</label>
                      <input id="t-em" type="number" min="1" bind:value={newTenant.planEmailGb} />
                    </div>
                    <div class="field">
                      <label for="t-od" class="sublabel">Odoo (GB)</label>
                      <input id="t-od" type="number" min="1" bind:value={newTenant.planOdooGb} />
                    </div>
                  </div>
                </div>
                <div class="field" style="grid-column:span 2">
                  <label class="checkbox-label">
                    <input type="checkbox" bind:checked={newTenant.useCustomDomain} />
                    Organisasi punya domain sendiri
                  </label>
                </div>
                {#if newTenant.useCustomDomain}
                  <div class="field" style="grid-column:span 2">
                    <label for="t-domain">Domain Custom</label>
                    <input id="t-domain" placeholder="workspace.perusahaan.co.id" bind:value={newTenant.domain} />
                  </div>
                {/if}
                <div class="admin-preview" style="grid-column:span 2">
                  <span class="field-hint">Email admin yang akan dibuat:</span>
                  <div class="admin-email">{tenantAdminEmail}</div>
                </div>
                <div class="field">
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

      <!-- ── Edit Tenant Modal ───────────────────────────────── -->
      {#if editTenantTarget}
        <div class="modal-overlay" onclick={() => editTenantTarget = null}>
          <div class="modal" onclick={(e) => e.stopPropagation()}>
            <div class="modal-head">
              <h3>Edit Tenant · <span class="mono" style="font-size:13px;color:var(--fg-3)">{editTenantTarget.domain}</span></h3>
              <button class="btn-icon" onclick={() => editTenantTarget = null}>{@html I.x}</button>
            </div>
            <div class="modal-body">
              <div class="form-grid-2">
                <div class="field" style="grid-column:span 2">
                  <label for="et-name">Nama Tenant</label>
                  <input id="et-name" placeholder="PT Contoh Indonesia" bind:value={editTenantForm.name} />
                </div>
                <div class="field">
                  <label for="et-color">Warna Brand</label>
                  <input id="et-color" type="color" bind:value={editTenantForm.primaryColor} style="height:40px;padding:4px" />
                </div>
                <div class="field">
                  <label for="et-status">Status</label>
                  <select id="et-status" bind:value={editTenantForm.status}>
                    <option value="active">Aktif</option>
                    <option value="suspended">Suspended</option>
                    <option value="inactive">Tidak Aktif</option>
                  </select>
                </div>
                <div class="field" style="grid-column:span 2">
                  <label for="et-logo">Logo URL (opsional)</label>
                  <input id="et-logo" placeholder="https://cdn.example.com/logo.png" bind:value={editTenantForm.logoUrl} />
                </div>
                <!-- Branding preview -->
                <div class="field" style="grid-column:span 2">
                  <label>Preview Branding</label>
                  <div class="brand-preview" style="--bp-col:{editTenantForm.primaryColor}">
                    <div class="brand-preview-bar">
                      {#if editTenantForm.logoUrl}
                        <img src={editTenantForm.logoUrl} alt="logo preview" class="brand-preview-logo"
                             onerror={(e) => { (e.target as HTMLImageElement).style.display='none'; }} />
                      {:else}
                        <span class="brand-preview-icon">{editTenantForm.name?.charAt(0)?.toUpperCase() || '?'}</span>
                      {/if}
                      <span class="brand-preview-name">{editTenantForm.name || 'Nama Tenant'}</span>
                    </div>
                    <span class="brand-preview-chip" style="background:{editTenantForm.primaryColor}">{editTenantForm.primaryColor}</span>
                  </div>
                </div>
                <div class="field" style="grid-column:span 2">
                  <label>Paket Layanan</label>
                  <div class="quota-row">
                    <div class="field">
                      <label for="et-tier" class="sublabel">Paket/Lisensi</label>
                      <select id="et-tier" bind:value={editTenantForm.planTier}>
                        <option value="basic">Basic</option>
                        <option value="business">Business</option>
                        <option value="enterprise">Enterprise</option>
                      </select>
                    </div>
                    <div class="field">
                      <label for="et-maxu" class="sublabel">Maks. User</label>
                      <input id="et-maxu" type="number" min="1" bind:value={editTenantForm.maxUsers} />
                    </div>
                  </div>
                </div>
                <div class="field" style="grid-column:span 2">
                  <label>Kuota Penyimpanan</label>
                  <div class="quota-row">
                    <div class="field">
                      <label for="et-nc" class="sublabel">Nextcloud (GB)</label>
                      <input id="et-nc" type="number" min="1" bind:value={editTenantForm.planNextcloudGb} />
                    </div>
                    <div class="field">
                      <label for="et-em" class="sublabel">Email (GB)</label>
                      <input id="et-em" type="number" min="1" bind:value={editTenantForm.planEmailGb} />
                    </div>
                    <div class="field">
                      <label for="et-od" class="sublabel">Odoo (GB)</label>
                      <input id="et-od" type="number" min="1" bind:value={editTenantForm.planOdooGb} />
                    </div>
                  </div>
                </div>
              </div>
              {#if editTenantMsg}
                <p style="margin-top:12px;font-size:12px;color:{editTenantMsg === 'Tersimpan' ? 'var(--ok)' : 'var(--danger)'}">
                  {editTenantMsg}
                </p>
              {/if}
            </div>
            <div class="modal-foot">
              <button class="btn btn-secondary" onclick={() => editTenantTarget = null}>Batal</button>
              <button class="btn btn-primary" onclick={saveEditTenant} disabled={editTenantBusy}>
                {editTenantBusy ? 'Menyimpan...' : 'Simpan Perubahan'}
              </button>
            </div>
          </div>
        </div>
      {/if}
    {/if}

    <!-- ── Reset Password Modal ─────────────────────────────── -->
    {#if resetPwTarget}
      <div class="modal-overlay" onclick={() => resetPwTarget = null}>
        <div class="modal" style="width:420px" onclick={(e) => e.stopPropagation()}>
          <div class="modal-head">
            <h3>Reset Password · <span class="mono" style="font-size:13px;color:var(--fg-3)">{resetPwTarget.username}</span></h3>
            <button class="btn-icon" onclick={() => resetPwTarget = null}>{@html I.x}</button>
          </div>
          <div class="modal-body">
            <div class="field">
              <label for="rp-pw">Password Baru</label>
              <input id="rp-pw" type="password" placeholder="Min 8 karakter" bind:value={resetPwValue} />
            </div>
            {#if resetPwMsg}
              <p style="font-size:12px;color:{resetPwMsg.includes('berhasil') ? 'var(--ok)' : 'var(--danger)'};margin-top:6px">
                {resetPwMsg}
              </p>
            {/if}
          </div>
          <div class="modal-foot">
            <button class="btn btn-secondary" onclick={() => resetPwTarget = null}>Batal</button>
            <button class="btn btn-primary" onclick={doResetPassword} disabled={resetPwBusy}>
              {resetPwBusy ? 'Mereset…' : 'Reset Password'}
            </button>
          </div>
        </div>
      </div>
    {/if}

    <!-- TenantUsersModal — rendered outside tenant grid -->
    {#if tenantUsersOpen && tenantUsersTarget?.id}
      <TenantUsersModal
        tenantId={tenantUsersTarget.id}
        tenantName={tenantUsersTarget.name}
        tenantSlug={tenantUsersTarget.slug}
        tenantDomain={tenantUsersTarget.domain}
        onClose={() => { tenantUsersOpen = false; tenantUsersTarget = null; }}
      />
    {/if}

    <!-- DNS Wizard Modal (superadmin — per tenant card) -->
    {#if dnsWizardOpen && dnsWizardTarget?.id}
      <div class="modal-overlay" onclick={() => { dnsWizardOpen = false; dnsWizardTarget = null; }}>
        <div class="modal" style="width:680px;max-width:96vw;padding:0" onclick={(e) => e.stopPropagation()}>
          <DnsWizard
            tenantId={dnsWizardTarget.id}
            tenantName={dnsWizardTarget.name}
            onClose={() => { dnsWizardOpen = false; dnsWizardTarget = null; }}
          />
        </div>
      </div>
    {/if}

    <!-- ═══════ TENANT PROFILE (tenant admin only) ═══════ -->
    {#if activeTab === 'tenant-profile'}
      <div class="page-head">
        <div>
          <h1 class="page-h1">Profil Organisasi</h1>
          <p class="page-sub">{auth.profile.tenantName || 'Organisasi Anda'} · {auth.profile.tenantDomain || auth.profile.organizationSlug + '.opsid.web.id'}</p>
        </div>
      </div>

      <div class="tp-grid">
        <!-- Org Info -->
        <div class="panel">
          <div class="panel-head"><span class="panel-title">Informasi Organisasi</span></div>
          <div class="tp-body">
            <div class="tp-row">
              <span class="tp-label">Nama</span>
              <span class="tp-val">{auth.profile.tenantName || '—'}</span>
            </div>
            <div class="tp-row">
              <span class="tp-label">Slug</span>
              <code class="tp-val mono">{auth.profile.organizationSlug || '—'}</code>
            </div>
            <div class="tp-row">
              <span class="tp-label">Domain</span>
              <code class="tp-val mono">{auth.profile.tenantDomain || auth.profile.organizationSlug + '.opsid.web.id'}</code>
            </div>
            <div class="tp-row">
              <span class="tp-label">Status</span>
              <span class="tag tag-ok">Aktif</span>
            </div>
            <div class="tp-row">
              <span class="tp-label">Total User</span>
              <span class="tp-val">{users.length} user</span>
            </div>
          </div>
        </div>

        <!-- Quota -->
        <div class="panel">
          <div class="panel-head"><span class="panel-title">Kuota Layanan</span></div>
          <div class="tp-body">
            <div class="tp-row">
              <span class="tp-label">Nextcloud</span>
              <span class="tp-val">{auth.profile.planNextcloudGb} GB</span>
            </div>
            <div class="tp-row">
              <span class="tp-label">Email (SOGo)</span>
              <span class="tp-val">{auth.profile.planEmailGb} GB</span>
            </div>
            <div class="tp-row">
              <span class="tp-label">Odoo ERP</span>
              <span class="tp-val">{auth.profile.planOdooGb} GB</span>
            </div>
            <div style="margin-top:16px;padding:12px;background:var(--bg-2);border-radius:var(--r-md);font-size:12px;color:var(--fg-3)">
              Untuk upgrade kuota, hubungi administrator OPSID.
            </div>
          </div>
        </div>

        <!-- Branding -->
        <div class="panel" style="grid-column:span 2">
          <div class="panel-head"><span class="panel-title">Branding & Tampilan</span></div>
          <div class="tp-body">
            <div class="form-grid-2" style="max-width:480px">
              <div class="field">
                <label for="tp-color">Warna Brand</label>
                <input id="tp-color" type="color" bind:value={tenantEditForm.primaryColor} style="height:40px;padding:4px" />
              </div>
              <div class="field" style="grid-column:span 2">
                <label for="tp-logo">Logo URL</label>
                <input id="tp-logo" placeholder="https://cdn.example.com/logo.png" bind:value={tenantEditForm.logoUrl} />
              </div>
            </div>
            {#if tenantEditMsg}
              <p class="field-hint" style="margin-top:10px;color:{tenantEditMsg.includes('berhasil') ? 'var(--ok)' : 'var(--danger)'}">
                {tenantEditMsg}
              </p>
            {/if}
            <button class="btn btn-primary btn-sm" style="margin-top:16px" onclick={saveTenantBranding} disabled={tenantEditBusy}>
              {tenantEditBusy ? 'Menyimpan...' : 'Simpan Branding'}
            </button>
          </div>
        </div>
      </div>
    {/if}

    <!-- ═══════ DNS & EMAIL (tenant admin only) ═══════ -->
    {#if activeTab === 'dns-email' && auth.profile.isTenantAdmin}
      {@const tid = auth.profile.tenantId}
      <div class="page-head">
        <div>
          <h1 class="page-h1">DNS & Email Setup</h1>
          <p class="page-sub">Konfigurasi MX, SPF, DKIM, DMARC untuk domain email kamu</p>
        </div>
      </div>
      {#if tid}
        <div class="panel" style="padding:0;overflow:hidden">
          <DnsWizard tenantId={tid} tenantName={auth.profile.tenantName || ''} />
        </div>
      {:else}
        <div class="empty-state">Tenant ID tidak ditemukan</div>
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
              {#each [{l:'CPU',v:s.cpu},{l:'RAM',v:s.ram},{l:'DSK',v:s.disk ?? 0}] as m}
                <div class="metric-row">
                  <span class="metric-label mono">{m.l}</span>
                  <div class="metric-bar">
                    <div class="metric-fill" style="width:{m.v}%;background:{metricColor(m.v)}"></div>
                  </div>
                  <span class="metric-val mono">{m.v}%</span>
                </div>
              {/each}
              {#if s.load !== undefined}
                <div class="load-row">
                  <span class="metric-label mono" style="color:var(--fg-4)">LD1</span>
                  <span class="load-val mono">{s.load.toFixed(2)}</span>
                </div>
              {/if}
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
          <div class="empty-state">{searchAudit ? 'Tidak ada log ditemukan' : 'Belum ada aktivitas'}</div>
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

    <!-- ═══════ PERMINTAAN (ONBOARDING) ═══════ -->
    {#if activeTab === 'requests'}
      <div class="page-head">
        <div>
          <h1 class="page-h1">Permintaan Berlangganan</h1>
          <p class="page-sub">Formulir pendaftaran dari calon tenant · onboarding_requests</p>
        </div>
        <div style="display:flex;gap:8px;align-items:center">
          <div class="filter-tabs">
            {#each [['all','Semua'],['pending','Menunggu'],['approved','Disetujui'],['rejected','Ditolak']] as [val, lbl]}
              <button
                class="filter-tab"
                class:active={onboardingFilter === val}
                onclick={() => { onboardingFilter = val; }}
              >{lbl}</button>
            {/each}
          </div>
        </div>
      </div>

      <div class="panel">
        {#if loading}
          <div class="empty-state">Memuat data...</div>
        {:else if onboardingReqs.length === 0}
          <div class="empty-state">Tidak ada permintaan{onboardingFilter !== 'all' ? ' dengan status ini' : ''}</div>
        {:else}
          <table class="data-table">
            <thead>
              <tr>
                <th>Perusahaan</th>
                <th>PIC</th>
                <th>Email / WA</th>
                <th>Domain</th>
                <th style="text-align:center">User</th>
                <th>Paket</th>
                <th>Status</th>
                <th>Tanggal</th>
                <th style="text-align:center">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {#each onboardingReqs as r}
                <tr>
                  <td><strong style="font-size:13px">{r.company_name}</strong></td>
                  <td>{r.pic_name}</td>
                  <td>
                    <div style="font-size:12px">{r.pic_email}</div>
                    {#if r.pic_whatsapp}<div style="font-size:11px;color:var(--fg-4)">{r.pic_whatsapp}</div>{/if}
                  </td>
                  <td style="font-size:12px">
                    {#if r.domain_value}
                      <div class="mono">
                        {r.domain_type === 'subdomain' ? r.domain_value + '.opsid.web.id' : r.domain_value}
                      </div>
                      <div style="font-size:10px;color:var(--fg-4);margin-top:2px">
                        {r.domain_type === 'custom_domain' ? 'custom domain' : 'subdomain opsid'}
                      </div>
                    {:else}
                      <span style="color:var(--fg-4)">—</span>
                    {/if}
                  </td>
                  <td style="text-align:center" class="mono">{r.user_count}</td>
                  <td>
                    <span class="tag {r.plan_tier === 'enterprise' ? 'tag-warn' : r.plan_tier === 'pro' ? 'tag-pri' : 'tag-ok'}" style="font-size:10px;text-transform:capitalize">
                      {r.plan_tier}
                    </span>
                  </td>
                  <td>
                    <span class="tag {r.status === 'approved' ? 'tag-ok' : r.status === 'rejected' ? 'tag-danger' : r.status === 'processing' ? 'tag-pri' : 'tag-warn'}" style="font-size:10px">
                      {r.status === 'pending' ? 'Menunggu' : r.status === 'approved' ? 'Disetujui' : r.status === 'processing' ? 'Memproses…' : 'Ditolak'}
                    </span>
                  </td>
                  <td style="font-size:11px;color:var(--fg-4)">
                    {new Date(r.created_at).toLocaleDateString('id-ID', { day:'2-digit', month:'short', year:'numeric' })}
                  </td>
                  <td>
                    {#if r.status === 'pending'}
                      <div style="display:flex;gap:6px;justify-content:center">
                        <button
                          class="btn btn-ok btn-xs"
                          disabled={onboardingBusy === r.id}
                          onclick={() => reviewRequest(r, 'approved')}
                        >
                          {@html I.check} Setuju
                        </button>
                        <button
                          class="btn btn-danger btn-xs"
                          disabled={onboardingBusy === r.id}
                          onclick={() => { rejectModal = r; rejectNotes = ''; }}
                        >
                          {@html I.x} Tolak
                        </button>
                      </div>
                    {:else if r.status === 'approved'}
                      <div style="display:flex;flex-direction:column;gap:5px;align-items:center">
                        <div style="font-size:11px;color:var(--fg-4)">
                          {r.reviewed_by ?? '—'}
                          {#if r.tenant_id}
                            <span class="mono" style="color:var(--pri)"> · tenant #{r.tenant_id}</span>
                          {/if}
                        </div>
                        {#if r.provisioning_log}
                          {@const failed = r.provisioning_log.filter((s: ProvStep) => !s.ok)}
                          {#if failed.length}
                            <div style="display:flex;gap:4px;flex-wrap:wrap;justify-content:center">
                              <button
                                class="btn btn-warn btn-xs"
                                disabled={reprovisionBusy === r.id}
                                onclick={() => reprovision(r)}
                                title={failed.map((s: ProvStep) => s.step + ': ' + s.error).join('\n')}
                              >
                                {reprovisionBusy === r.id ? '…' : '⟳'} Re-provision
                              </button>
                              <button class="btn btn-secondary btn-xs" onclick={() => provLogModal = r}>Log</button>
                            </div>
                          {:else}
                            <div style="display:flex;gap:4px;justify-content:center">
                              <span style="font-size:11px;color:var(--ok)">✓ provisioned</span>
                              <button class="btn btn-secondary btn-xs" onclick={() => provLogModal = r}>Log</button>
                            </div>
                          {/if}
                        {:else}
                          <button class="btn btn-warn btn-xs" disabled={reprovisionBusy === r.id} onclick={() => reprovision(r)}>
                            {reprovisionBusy === r.id ? '…' : '⟳'} Re-provision
                          </button>
                        {/if}
                      </div>
                    {:else if r.status === 'processing'}
                      <div style="display:flex;flex-direction:column;gap:5px;align-items:center">
                        <span style="font-size:11px;color:var(--fg-4)">Provisioning berjalan…</span>
                        <button
                          class="btn btn-danger btn-xs"
                          disabled={resetProcessingBusy === r.id}
                          onclick={() => resetProcessingRequest(r)}
                          title="Reset ke pending jika provisioning tampak macet"
                        >
                          {resetProcessingBusy === r.id ? '…' : '↺'} Reset ke Pending
                        </button>
                      </div>
                    {:else}
                      <div style="text-align:center;font-size:11px;color:var(--fg-4)">
                        {r.reviewed_by ?? '—'}
                      </div>
                    {/if}
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

<!-- Approve Result Modal -->
{#if approveResult}
  <div class="modal-backdrop" onclick={() => approveResult = null} role="presentation"></div>
  <div class="modal" style="max-width:520px">
    <div class="modal-header">
      {#if approveResult.error}
        <span style="color:var(--danger)">Provisioning Gagal</span>
      {:else}
        <span>Tenant Berhasil Dibuat</span>
      {/if}
      <button class="btn-icon" onclick={() => approveResult = null}>{@html I.x}</button>
    </div>
    <div class="modal-body" style="display:flex;flex-direction:column;gap:14px">
      {#if approveResult.error}
        <div class="prov-error">{approveResult.error}</div>
      {:else}
        <div class="prov-success">
          <div class="prov-row">
            <span class="prov-label">Tenant ID</span>
            <span class="prov-val mono">#{approveResult.tenant?.id}</span>
          </div>
          <div class="prov-row">
            <span class="prov-label">Domain</span>
            <span class="prov-val mono">{approveResult.domain}</span>
          </div>
          <div class="prov-row">
            <span class="prov-label">Admin Username</span>
            <span class="prov-val mono">{approveResult.adminUsername}</span>
          </div>
          <div class="prov-row">
            <span class="prov-label">Password Sementara</span>
            <span class="prov-val mono prov-pw">{approveResult.adminPassword}</span>
          </div>
          <p class="prov-note">Password hanya ditampilkan sekali. Catat dan kirimkan ke tenant admin melalui saluran aman.</p>
        </div>
      {/if}
      {#if approveResult.steps?.length}
        <div class="prov-steps">
          <div class="prov-steps-title">Detail Provisioning</div>
          {#each approveResult.steps as s}
            <div class="prov-step">
              <span class="prov-step-icon" style="color:{s.ok ? 'var(--ok)' : 'var(--danger)'}">
                {s.ok ? '✓' : '✗'}
              </span>
              <span class="prov-step-name mono">{s.step}</span>
              {#if s.error}
                <span class="prov-step-err">{s.error}</span>
              {/if}
            </div>
          {/each}
        </div>
      {/if}
    </div>
    <div class="modal-footer">
      <button class="btn btn-primary" onclick={() => approveResult = null}>Tutup</button>
    </div>
  </div>
{/if}

<!-- Reject Modal -->
{#if rejectModal}
  <div class="modal-backdrop" onclick={() => { rejectModal = null; rejectNotes = ''; }} role="presentation"></div>
  <div class="modal" style="max-width:440px">
    <div class="modal-header">
      <span>Tolak Permintaan</span>
      <button class="btn-icon" onclick={() => { rejectModal = null; rejectNotes = ''; }}>{@html I.x}</button>
    </div>
    <div class="modal-body" style="display:flex;flex-direction:column;gap:14px">
      <p style="font-size:13px;color:var(--fg-2)">
        Tolak permintaan dari <strong>{rejectModal.company_name}</strong>?
      </p>
      <label class="field-label">Catatan / Alasan Penolakan</label>
      <textarea
        class="field-input"
        rows="3"
        placeholder="Opsional — akan disimpan di database"
        bind:value={rejectNotes}
        style="resize:vertical"
      ></textarea>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick={() => { rejectModal = null; rejectNotes = ''; }}>Batal</button>
      <button
        class="btn btn-danger"
        disabled={onboardingBusy === rejectModal.id}
        onclick={() => reviewRequest(rejectModal!, 'rejected', rejectNotes)}
      >
        {@html I.x} Konfirmasi Tolak
      </button>
    </div>
  </div>
{/if}

<!-- ── Reprovision Result Modal ───────────────────────────────── -->
{#if reprovisionResult}
  <div class="modal-backdrop" onclick={() => reprovisionResult = null} role="presentation"></div>
  <div class="modal" style="max-width:520px">
    <div class="modal-header">
      {#if reprovisionResult.error}
        <span style="color:var(--warn)">Re-provision Selesai (ada kegagalan)</span>
      {:else}
        <span style="color:var(--ok)">Re-provision Berhasil</span>
      {/if}
      <button class="btn-icon" onclick={() => reprovisionResult = null}>{@html I.x}</button>
    </div>
    <div class="modal-body" style="display:flex;flex-direction:column;gap:14px">
      {#if reprovisionResult.adminPassword}
        <div class="prov-success">
          <div class="prov-row">
            <span class="prov-label">Password Admin Baru</span>
            <span class="prov-val mono prov-pw">{reprovisionResult.adminPassword}</span>
          </div>
          <p class="prov-note">User admin dibuat ulang. Catat dan kirimkan password melalui saluran aman.</p>
        </div>
      {/if}
      {#if reprovisionResult.steps.length}
        <div class="prov-steps">
          <div class="prov-steps-title">Step yang Dijalankan</div>
          {#each reprovisionResult.steps as s}
            <div class="prov-step">
              <span class="prov-step-icon" style="color:{s.ok ? 'var(--ok)' : 'var(--danger)'}">
                {s.ok ? '✓' : '✗'}
              </span>
              <span class="prov-step-name mono">{s.step}</span>
              {#if s.error}<span class="prov-step-err">{s.error}</span>{/if}
            </div>
          {/each}
        </div>
      {/if}
    </div>
    <div class="modal-footer">
      <button class="btn btn-primary" onclick={() => reprovisionResult = null}>Tutup</button>
    </div>
  </div>
{/if}

<!-- ── Provisioning Log Modal ─────────────────────────────────── -->
{#if provLogModal}
  <div class="modal-backdrop" onclick={() => provLogModal = null} role="presentation"></div>
  <div class="modal" style="max-width:520px">
    <div class="modal-header">
      <span>Provisioning Log · <span class="mono" style="font-size:12px;color:var(--fg-3)">{provLogModal.company_name}</span></span>
      <button class="btn-icon" onclick={() => provLogModal = null}>{@html I.x}</button>
    </div>
    <div class="modal-body">
      {#if provLogModal.provisioning_log?.length}
        <div class="prov-steps">
          {#each provLogModal.provisioning_log as s}
            <div class="prov-step">
              <span class="prov-step-icon" style="color:{s.ok ? 'var(--ok)' : 'var(--danger)'}">
                {s.ok ? '✓' : '✗'}
              </span>
              <span class="prov-step-name mono">{s.step}</span>
              {#if s.error}<span class="prov-step-err">{s.error}</span>{/if}
            </div>
          {/each}
        </div>
      {:else}
        <p style="font-size:13px;color:var(--fg-4)">
          Tidak ada log provisioning tersimpan.<br/>
          <span style="font-size:11px">Tenant yang dibuat sebelum v0.3.5 tidak memiliki log.
          Klik Re-provision untuk menjalankan ulang semua step dan mengisi log.</span>
        </p>
      {/if}
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick={() => { const r = provLogModal!; provLogModal = null; reprovision(r); }}>
        ⟳ Re-provision
      </button>
      <button class="btn btn-primary" onclick={() => provLogModal = null}>Tutup</button>
    </div>
  </div>
{/if}

<!-- ── Validation Modal ───────────────────────────────────────── -->
{#if validationModal}
  {@const vm = validationModal}
  {@const onbId = vm.onboarding?.id}
  <div class="modal-backdrop" onclick={() => validationModal = null} role="presentation"></div>
  <div class="modal val-modal" onclick={(e) => e.stopPropagation()}>

    <!-- Header -->
    <div class="modal-header">
      <div>
        <span style="font-weight:700">{vm.tenant.name}</span>
        <code class="mono" style="font-size:11px;color:var(--fg-4);margin-left:8px">{vm.tenant.domain}</code>
        {#if vm.allPassing}
          <span class="tag tag-ok" style="margin-left:8px;font-size:10px">✓ Semua OK</span>
        {:else}
          <span class="tag tag-danger" style="margin-left:8px;font-size:10px">⚠ {vm.failCount} gagal</span>
        {/if}
      </div>
      <button class="btn-icon" onclick={() => validationModal = null}>{@html I.x}</button>
    </div>

    <div class="modal-body" style="display:flex;flex-direction:column;gap:20px;max-height:70vh;overflow-y:auto">

      <!-- Checklist -->
      <div>
        <div class="val-section-title">Status Layanan</div>
        <div class="val-grid">

          <!-- DNS -->
          {#if vm.checks.dns}
            <div class="val-row">
              <span class="val-icon" class:val-ok={vm.checks.dns.ok} class:val-fail={!vm.checks.dns.ok}>{vm.checks.dns.ok ? '✓' : '✗'}</span>
              <span class="val-label">🌐 DNS</span>
              <span class="val-detail">{vm.checks.dns.detail}</span>
            </div>
          {/if}

          <!-- SSL -->
          {#if vm.checks.ssl}
            <div class="val-row">
              <span class="val-icon" class:val-ok={vm.checks.ssl.ok} class:val-fail={!vm.checks.ssl.ok}>{vm.checks.ssl.ok ? '✓' : '✗'}</span>
              <span class="val-label">🔒 SSL</span>
              <span class="val-detail">{vm.checks.ssl.detail}</span>
            </div>
          {:else}
            <div class="val-row val-skipped">
              <span class="val-icon">—</span>
              <span class="val-label">🔒 SSL</span>
              <span class="val-detail">
                <button class="btn btn-secondary" style="font-size:11px;padding:2px 8px"
                  onclick={async () => { const tid = vm.tenant.id; checkBusy[tid] = true; const r = await fetch(`/api/admin/tenant/${tid}/check?ssl=1`).then(x=>x.json()).catch(()=>null); if (r) validationModal = r; checkBusy[tid] = false; }}>
                  Cek SSL
                </button>
              </span>
            </div>
          {/if}

          {#each [
            ['Keycloak Org',    vm.checks.kc_org,        '🔑'],
            ['Keycloak User',   vm.checks.kc_user,       '🔑'],
            ['FreeIPA Group',   vm.checks.freeipa_group, '🗂'],
            ['FreeIPA User',    vm.checks.freeipa_user,  '🗂'],
            ['Nextcloud Group', vm.checks.nc_group,      '☁'],
            ['Nextcloud User',  vm.checks.nc_user,       '☁'],
            ['Dovecot Quota',   vm.checks.sogo_quota,    '📧'],
            ['Odoo Company',    vm.checks.odoo_company,  '🏢'],
            ['Odoo User',       vm.checks.odoo_user,     '🏢'],
          ] as [label, chk, emoji]}
            <div class="val-row" class:val-row-fail={!chk.ok}>
              <span class="val-icon" class:val-ok={chk.ok} class:val-fail={!chk.ok}>{chk.ok ? '✓' : '✗'}</span>
              <span class="val-label">{emoji} {label}</span>
              <span class="val-detail">{chk.detail}</span>
            </div>
          {/each}
        </div>
        <div style="font-size:10px;color:var(--fg-4);margin-top:6px;text-align:right">
          Dicek: {new Date(vm.checked_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </div>
      </div>

      <!-- Provisioning Log -->
      {#if vm.provisioning_log?.length}
        <div>
          <div class="val-section-title">
            Provisioning Log
            {#if vm.onboarding}
              <span style="font-weight:400;color:var(--fg-4);font-size:11px">
                · req #{vm.onboarding.id} · by {vm.onboarding.reviewed_by ?? '?'}
                {#if vm.onboarding.reviewed_at}
                  · {new Date(vm.onboarding.reviewed_at).toLocaleDateString('id-ID', { day:'2-digit', month:'short', year:'numeric' })}
                {/if}
              </span>
            {/if}
          </div>
          <div class="prov-steps">
            {#each vm.provisioning_log as s}
              {@const label = ({
                db_tenant: 'Database Tenant', nginx: 'Nginx Config', ssl_certbot: 'SSL Certbot',
                freeipa_group: 'FreeIPA Group', kc_org: 'Keycloak Org', freeipa_user: 'FreeIPA User',
                kc_user: 'Keycloak User', kc_org_member: 'KC Org Member', tenant_users: 'DB tenant_users',
                kc_redirect_uri: 'KC Redirect URI', nc_group: 'Nextcloud Group', nc_user: 'Nextcloud User',
                sogo_quota: 'Dovecot Quota', odoo_company: 'Odoo Company', odoo_user: 'Odoo User',
              } as Record<string,string>)[s.step] ?? s.step}
              <div class="prov-step">
                <span class="prov-step-icon" style="color:{s.ok ? 'var(--ok)' : 'var(--danger)'}">
                  {s.ok ? '✓' : '✗'}
                </span>
                <span class="prov-step-name mono">{label}</span>
                {#if s.error}
                  <span class="prov-step-err" title={s.error}>{s.error.slice(0, 100)}{s.error.length > 100 ? '…' : ''}</span>
                {/if}
              </div>
            {/each}
          </div>
        </div>
      {:else}
        <div style="font-size:12px;color:var(--fg-4)">Tidak ada provisioning log tersimpan untuk tenant ini.</div>
      {/if}

    </div>

    <!-- Footer -->
    <div class="modal-footer" style="gap:8px">
      {#if !vm.allPassing && onbId}
        <button class="btn btn-warn"
          onclick={() => {
              const reqId = onbId;
              const tenantId = vm.tenant.id;
              const companyName = vm.tenant.name;
              validationModal = null;
              if (reqId) {
                reprovision({
                  id: reqId,
                  tenant_id: tenantId,
                  company_name: companyName
                } as OnboardingRequest);
              }
            }}>
          ⟳ Re-provision
        </button>
      {/if}
      <button class="btn btn-secondary"
        onclick={async () => { const tid = vm.tenant.id; checkBusy[tid] = true; const r = await fetch(`/api/admin/tenant/${tid}/check`).then(x=>x.json()).catch(()=>null); if (r) validationModal = r; checkBusy[tid] = false; }}>
        🔄 Refresh
      </button>
      <button class="btn btn-primary" onclick={() => validationModal = null}>Tutup</button>
    </div>
  </div>
{/if}

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

  /* ── Quick check badge ───────────────────────────────────── */
  .quick-check { font-size:11px; padding:5px 10px; border-radius:var(--r-md); margin-bottom:8px; border:1px solid var(--bd-1); background:var(--bg-2); color:var(--fg-3); }
  .quick-check.qc-ok   { background:rgba(52,211,153,.08);  border-color:rgba(52,211,153,.3);  color:var(--ok); }
  .quick-check.qc-fail { background:rgba(248,113,113,.08); border-color:rgba(248,113,113,.3); color:var(--danger); }

  /* ── DNS result ──────────────────────────────────────────── */
  .dns-result { font-size:11px; padding:6px 12px; border-radius:var(--r-md); margin-bottom:8px; border:1px solid var(--bd-1); background:var(--bg-2); color:var(--fg-3); }
  .dns-result.dns-ok { background:rgba(52,211,153,.08); border-color:rgba(52,211,153,.3); color:var(--ok); }
  .dns-result.dns-fail { background:rgba(248,113,113,.08); border-color:rgba(248,113,113,.3); color:var(--danger); }
  .ssl-result { font-size:11px; padding:6px 12px; border-radius:var(--r-md); margin-bottom:8px; border:1px solid var(--bd-1); background:var(--bg-2); color:var(--fg-3); }
  .ssl-result.ssl-ok  { background:rgba(52,211,153,.08); border-color:rgba(52,211,153,.3); color:var(--ok); }
  .ssl-result.ssl-fail { background:rgba(248,113,113,.08); border-color:rgba(248,113,113,.3); color:var(--danger); }

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
  .form-grid   { display:grid; grid-template-columns:repeat(3,1fr); gap:14px; }
  .form-grid-2 { display:grid; grid-template-columns:repeat(2,1fr); gap:14px; }
  .field { display:flex; flex-direction:column; gap:6px; }
  .field label { font-size:11px; font-weight:600; color:var(--fg-3); letter-spacing:.04em; text-transform:uppercase; }
  .field input, .field select { background:var(--bg-2); border:1px solid var(--bd-2); border-radius:var(--r-md); padding:8px 12px; font-size:13px; color:var(--fg-1); font-family:inherit; outline:none; transition:border-color .15s; }
  .field input:focus, .field select:focus { border-color:var(--pri); }
  .field-preview { font-size:11px; color:var(--pri); margin-top:2px; }
  .sublabel { font-size:10px !important; font-weight:500 !important; color:var(--fg-4) !important; text-transform:none !important; letter-spacing:0 !important; }
  .quota-row { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:10px; width:100%; }
  .quota-row .field { min-width:0; }
  .brand-preview { border:1px solid var(--bd-1); border-radius:var(--r-md); overflow:hidden; background:var(--bg-2); }
  .brand-preview-bar { display:flex; align-items:center; gap:10px; padding:10px 14px; background:var(--bp-col,#5B86FF)10; border-bottom:3px solid var(--bp-col,#5B86FF); }
  .brand-preview-logo { height:28px; width:auto; object-fit:contain; border-radius:4px; }
  .brand-preview-icon { width:28px; height:28px; border-radius:6px; background:var(--bp-col,#5B86FF); color:#fff; display:grid; place-items:center; font-weight:700; font-size:14px; flex-shrink:0; }
  .brand-preview-name { font-weight:600; font-size:13px; color:var(--fg-1); }
  .brand-preview-chip { font-size:11px; padding:2px 10px 3px; color:#fff; border-radius:999px; margin:6px 14px 8px; display:inline-block; font-family:monospace; }
  .field input, .field select { width:100%; box-sizing:border-box; }
  .checkbox-label { display:flex; align-items:center; gap:8px; cursor:pointer; font-size:13px !important; font-weight:400 !important; letter-spacing:0 !important; text-transform:none !important; color:var(--fg-2) !important; }
  .admin-preview { padding:12px; background:var(--bg-2); border-radius:8px; border:1px solid var(--bd-1); }
  .admin-email { font-size:14px; font-weight:600; color:var(--pri); margin-top:4px; }
  /* ── Health load row ──────────────────────────────────────── */
  .load-row { display:flex; align-items:center; gap:8px; margin-top:6px; }
  .load-val { font-size:11px; color:var(--fg-2); }

  /* ── Tenant Profile ──────────────────────────────────────── */
  .tp-grid { display:grid; grid-template-columns:repeat(2,1fr); gap:14px; }
  .panel-head { padding:14px 20px; border-bottom:1px solid var(--bd-1); }
  .panel-title { font-size:12px; font-weight:700; color:var(--fg-3); text-transform:uppercase; letter-spacing:.06em; }
  .tp-body { padding:16px 20px; display:flex; flex-direction:column; gap:12px; }
  .tp-row { display:flex; justify-content:space-between; align-items:center; gap:12px; font-size:13px; }
  .tp-label { font-size:11px; font-weight:600; color:var(--fg-4); text-transform:uppercase; letter-spacing:.04em; }
  .tp-val { color:var(--fg-1); }
  @media(max-width:900px) { .tp-grid { grid-template-columns:1fr; } .tp-grid > [style*="span 2"] { grid-column:span 1; } }

  /* ── Empty state ─────────────────────────────────────────── */
  .empty-state { padding:48px 24px; text-align:center; color:var(--fg-3); font-size:13px; }

  /* ── Responsive desktop ─────────────────────────────────── */
  @media(max-width:1100px) { .health-grid, .tenant-grid { grid-template-columns:1fr; } }
  @media(max-width:700px)  { .form-grid { grid-template-columns:1fr; } }

  /* Admin console table: tighter at 900px */
  @media(max-width:900px) {
    .data-table { font-size:11px; }
    .data-table th, .data-table td { padding:8px 6px; }
    .data-table .col-dept { display:none; }
  }

  /* ── Mobile (≤768px) ─────────────────────────────────────── */
  @media(max-width:768px) {
    /* Topbar: compact */
    .topbar { padding:0 14px; height:48px; }
    .topbar-search { display:none; }

    /* Main pad: reduced padding */
    .main-pad { padding:14px; gap:16px; }

    /* Page head */
    .page-head { flex-direction:column; gap:10px; align-items:flex-start; }
    .page-head > div:last-child { width:100%; display:flex; flex-wrap:wrap; gap:6px; }
    .page-h1 { font-size:20px; }

    /* Tab bar: horizontally scrollable */
    .tab-bar {
      overflow-x:auto; align-self:stretch; flex-shrink:0;
      -webkit-overflow-scrolling:touch;
    }
    .tab-bar::-webkit-scrollbar { display:none; }
    .tab-btn { flex-shrink:0; padding:7px 11px; font-size:12px; white-space:nowrap; }

    /* Search box: full width */
    .search-box { flex:1; min-width:0; width:auto; }

    /* Filter tabs */
    .filter-tabs { width:100%; overflow-x:auto; }
    .filter-tab  { flex:1; text-align:center; }

    /* Table: horizontal scroll */
    .panel { overflow-x:auto; -webkit-overflow-scrolling:touch; }
    .data-table { min-width:480px; }
    .data-table th, .data-table td { padding:10px 10px; }
    /* Hide email & dept columns */
    .data-table .col-email { display:none; }
    .data-table .col-pic-wa { display:none; }
    .data-table .col-user-count { display:none; }
    /* Action buttons: tighter */
    .action-btns { gap:3px; }
    .action-btns .btn { padding:5px 7px; }

    /* Tenant cards stack */
    .tenant-grid { grid-template-columns:1fr !important; }
    .tenant-inner { padding:14px; }
    .tenant-stats { gap:8px; }
    /* Tenant actions: wrap */
    .tenant-actions { flex-wrap:wrap; gap:6px; }
    .tenant-actions .btn { font-size:11px; padding:5px 9px; }

    /* Health grid: 1-col */
    .health-grid { grid-template-columns:1fr !important; }

    /* Modal: bottom sheet */
    .modal-overlay { align-items:flex-end; padding:0; }
    .modal {
      max-width:100vw !important; width:100vw; margin:0;
      border-radius:var(--r-lg) var(--r-lg) 0 0;
      max-height:92dvh; overflow-y:auto;
    }
    .modal-body { overflow-y:auto; }

    /* Form grid: 1-col on mobile */
    .form-grid   { grid-template-columns:1fr !important; }
    .form-grid-2 { grid-template-columns:1fr !important; }
    /* span overrides → reset to 1 */
    .form-grid   > [style*="span"] { grid-column:span 1 !important; }
    .form-grid-2 > [style*="span"] { grid-column:span 1 !important; }
    .quota-row { grid-template-columns:1fr !important; }
    .tp-grid { grid-template-columns:1fr; }

    /* Validation modal */
    .val-modal { width:100vw; max-width:100vw; }
    .val-row { grid-template-columns:24px 1fr; }
    .val-detail { display:none; } /* hide detail text on mobile to save space */
  }

  /* ── Very small (≤480px): icon-only tabs ─────────────────── */
  @media(max-width:480px) {
    .tab-label { display:none; }
    .tab-btn { padding:8px 11px; gap:0; }
  }

  /* ── Onboarding requests filter ──────────────────────────── */
  .filter-tabs { display:flex; gap:4px; background:var(--bg-2); border:1px solid var(--bd-1); border-radius:var(--r-md); padding:3px; }
  .filter-tab  { padding:5px 12px; border-radius:6px; font-size:12px; font-weight:500; color:var(--fg-3); background:transparent; border:none; cursor:pointer; transition:all .15s; }
  .filter-tab:hover { color:var(--fg-1); }
  .filter-tab.active { background:var(--bg-3); color:var(--fg-1); box-shadow:0 1px 3px rgba(0,0,0,.25); }
  .btn-ok { background:rgba(52,211,153,.1); color:var(--ok); border-color:color-mix(in srgb, var(--ok) 25%, transparent); }
  .btn-ok:hover { background:rgba(52,211,153,.18); }
  .btn-warn { background:rgba(251,191,36,.1); color:var(--warn,#f59e0b); border-color:color-mix(in srgb, var(--warn,#f59e0b) 30%, transparent); }
  .btn-warn:hover { background:rgba(251,191,36,.18); }
  .btn-xs { padding:4px 10px; font-size:11px; gap:4px; }
  .modal-footer { padding:16px 24px; border-top:1px solid var(--bd-1); display:flex; justify-content:flex-end; gap:8px; }
  .field-label { font-size:11px; font-weight:600; color:var(--fg-3); text-transform:uppercase; letter-spacing:.04em; }
  .field-input { background:var(--bg-2); border:1px solid var(--bd-2); border-radius:var(--r-md); padding:8px 12px; font-size:13px; color:var(--fg-1); font-family:inherit; outline:none; width:100%; box-sizing:border-box; transition:border-color .15s; }
  .field-input:focus { border-color:var(--pri); }

  /* ── Approve result modal ─────────────────────────────────── */
  .prov-success { display:flex; flex-direction:column; gap:8px; background:var(--bg-2); border:1px solid var(--bd-1); border-radius:10px; padding:14px 16px; }
  .prov-error   { background:rgba(248,113,113,.08); border:1px solid rgba(248,113,113,.25); border-radius:8px; padding:12px 14px; font-size:13px; color:var(--danger); }
  .prov-row     { display:flex; gap:12px; align-items:baseline; font-size:13px; }
  .prov-label   { width:130px; flex-shrink:0; font-size:11px; font-weight:600; color:var(--fg-4); text-transform:uppercase; letter-spacing:.04em; }
  .prov-val     { color:var(--fg-1); }
  .prov-pw      { background:var(--bg-3); padding:3px 8px; border-radius:5px; letter-spacing:.08em; font-size:13px; color:var(--warn); border:1px solid var(--bd-2); }
  .prov-note    { font-size:11px; color:var(--fg-4); margin-top:4px; border-top:1px solid var(--bd-1); padding-top:10px; }
  .prov-steps   { display:flex; flex-direction:column; gap:5px; }
  .prov-steps-title { font-size:10px; font-weight:700; color:var(--fg-4); text-transform:uppercase; letter-spacing:.06em; margin-bottom:4px; }
  .prov-step    { display:flex; align-items:baseline; gap:8px; font-size:12px; }
  .prov-step-icon { font-size:13px; width:16px; flex-shrink:0; }
  .prov-step-name { color:var(--fg-2); }
  .prov-step-err  { color:var(--fg-4); font-size:11px; }

  /* ── Validation modal ────────────────────────────────────── */
  .val-modal { max-width:660px; width:calc(100vw - 32px); }
  .val-section-title { font-size:10px; font-weight:700; color:var(--fg-4); text-transform:uppercase; letter-spacing:.06em; margin-bottom:8px; }
  .val-grid  { display:flex; flex-direction:column; gap:0; border:1px solid var(--bd-1); border-radius:var(--r-md); overflow:hidden; }
  .val-row   { display:grid; grid-template-columns:28px 180px 1fr; align-items:center; gap:8px; padding:7px 12px; font-size:12px; border-bottom:1px solid var(--bd-1); background:var(--bg-1); }
  .val-row:last-child { border-bottom:none; }
  .val-row-fail { background:rgba(248,113,113,.04); }
  .val-skipped  { background:var(--bg-2); }
  .val-icon  { font-size:13px; font-weight:700; width:20px; text-align:center; }
  .val-ok    { color:var(--ok); }
  .val-fail  { color:var(--danger); }
  .val-label { font-weight:500; color:var(--fg-2); white-space:nowrap; }
  .val-detail { color:var(--fg-4); font-size:11px; word-break:break-all; }
</style>
