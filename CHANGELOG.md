# OPSID Portal — CHANGELOG

---

## [2026-05-29] Bug Fix Sprint — BUG-001 through BUG-008

### BUG-005 (HIGH) — Keycloak unreachable from server (Hairpin NAT)
- All server-side KC calls now use `http://10.34.1.4:8080` (internal KC IP) instead of
  `https://auth.opsid.web.id` (public IP → TCP timeout from server due to hairpin NAT)
- Files fixed: `tenantProvisioning.ts`, `check/+server.ts`, `admin/tenant/[id]/+server.ts`
- **Impact**: Fixes all KC validation failures, KC org/user provisioning, redirect URI sync

### BUG-001 (CRITICAL) — Custom domain login redirect & cookie domain
- `auth.svelte.ts` `login()`: now uses `window.location.origin + '/dashboard'` (was hardcoded `https://opsid.web.id`)
- `auth.svelte.ts` `logout()`: now uses `window.location.origin`
- Cookie `domain=.opsid.web.id` is now set only for `*.opsid.web.id` hostnames
- For custom domains (e.g. `workspace.1go.biz.id`), cookie is host-only (no domain attribute)
- **Impact**: Login/logout from custom domain tenant portals now returns to the correct domain

### BUG-002 (CRITICAL) — Processing status breaks Permintaan UI
- `GET /api/onboarding?status=pending` now also returns `status='processing'` rows
- `PUT /api/onboarding/[id]` now accepts `status='reset_pending'` to reset stuck rows
- UI shows "Memproses…" badge (blue) for processing status
- UI shows "Reset ke Pending" button for stuck processing requests
- **Impact**: Admins can now see and unblock stuck provisioning attempts

### BUG-006 (HIGH) — Odoo company validation inconsistent
- `checkOdoo()` in `check/+server.ts`: if sentinel search returns empty (Odoo company isolation),
  fall back to verifying via the linked user's `company_id` field
- Company found via fallback is still marked OK with note about sentinel mismatch
- **Impact**: Company validation now passes for provisioned tenants

### BUG-004 (HIGH) — User management email not tenant-aware
- Add User modal in `AdminUsers.svelte`: shows email domain hint for tenant admins
- Email placeholder auto-updates to `john@{tenant_domain}`
- `createUser()` validates email ends with `@{tenantDomain}` for non-superadmin callers
- **Impact**: Tenant admins can no longer accidentally create users with wrong email domain

### BUG-003 (HIGH) — Onboarding form email domain hint
- `Landing.svelte`: when `custom_domain` is selected and email domain doesn't match,
  show a soft warning: "Gunakan email bisnis dari domain {domain_value} jika tersedia"
- Placeholder updates to `budi@{domain_value}` when custom domain is filled
- Not a hard block (PIC may not have domain email yet during registration)

### BUG-007 (MEDIUM) — Provisioning log empty for old tenants
- Log modal in `AdminUsers.svelte`: empty log now shows explanation message:
  "Tenant yang dibuat sebelum v0.3.5 tidak memiliki log. Klik Re-provision..."
- Previously showed generic "Tidak ada log" with no context

### BUG-008 (MEDIUM) — Admin console not responsive
- Added responsive CSS breakpoints:
  - ≤900px: table font-size smaller, reduced cell padding
  - ≤768px: page-head stacks vertically, filter-tabs full width, tenant-grid 1 column, modals full-screen

---

## [2026-05-29] Stabilization Audit — Security + Race Condition + Idempotency Fixes

### Security fixes (9 endpoints were unprotected)

| Endpoint | Before | After |
|----------|--------|-------|
| `GET /api/admin/tenant` | No auth | opsid-admin required |
| `POST /api/admin/tenant` | No auth | opsid-admin required |
| `GET /api/admin/tenant/[id]` | No auth | authenticated user (admin or own tenant) |
| `DELETE /api/admin/tenant/[id]` | **No auth — CRITICAL** | opsid-admin required |
| `GET/POST /api/admin/tenant/[id]/users` | No auth | opsid-admin or org-admin of tenant |
| `PATCH/DELETE /api/admin/tenant/[id]/users/[u]` | No auth | opsid-admin required |
| `GET /api/admin/tenant/[id]/ssl` | No auth | opsid-admin required |
| `GET /api/admin/tenant/[id]/dns` | No auth | opsid-admin required |
| `POST /api/users` | No auth | authenticated + admin or tenant-admin |
| `PATCH/DELETE /api/users/[username]` | No auth validation | opsid-admin required |

### Race condition fix — double provisioning prevention
- `PUT /api/onboarding/[id]`: Now uses atomic `UPDATE … WHERE status='pending'` to claim the
  request before provisioning. Status transitions: `pending → processing → approved` (or back to
  `pending` on failure). Concurrent approvals can no longer both trigger provisioning.

### Provisioning idempotency in initial provision
- `freeipa_group`: "already exists" (error code 4002) now treated as ✓ (was: error)
- `kc_org`: HTTP 409 now treated as ✓ + recovers existing orgId for membership step (was: error)
- `freeipa_user`: "already exists" now treated as ✓ (was: error)
- `kc_user`: HTTP 409 now treated as ✓ + recovers kcUserId (was: error)
- `kc_org_member`: Step is **always** written to provisioning_log, even when skipped due to
  missing orgId or kcUserId (was: silently absent from log → confusing debug)

### Tenant delete FK fix
- `DELETE /api/admin/tenant/[id]` now NULLs `onboarding_requests.tenant_id` before deleting the
  tenant row, preventing FK constraint violations. Also finds KC org by alias (not just index 0).

### DB improvements
- Added `idx_onboarding_tenant_id` index on `onboarding_requests(tenant_id)` ✓
- `migrations/002_indexes_stabilization.sql` written for audit_logs + tenants indexes
  (requires postgres superuser to apply)
- `db.ts`: Added `pool.on('error')` handler + `connectionTimeoutMillis: 5000` to prevent
  silent hangs when DB is unreachable

### Code cleanup
- Removed **16 `.bak` files** from `src/` (routes + lib directories)
- Fixed dead code: `adminEmail` calculation in `provisionTenant()` simplified

---

## [2026-05-29] Stabilization — Validation Checklist + Quick Check Badges

### Changes

| File | Action |
|------|--------|
| `src/routes/api/admin/tenant/[id]/check/+server.ts` | New endpoint: 11 parallel live checks (KC org/user, FreeIPA group/user, NC group/user, Dovecot quota, Odoo company/user, DNS, SSL-on-demand). Returns `{ allPassing, failCount, checks, tenant, onboarding, provisioning_log, checked_at }` |
| `src/lib/sections/admin/AdminUsers.svelte` | Add `CheckResult`/`CheckItem` interfaces; add `checkBusy`, `checkAllBusy`, `validationModal`, `quickCheck` state |
| `src/lib/sections/admin/AdminUsers.svelte` | Add `runCheck()` — fetch `/check`, open validation modal, store result in `quickCheck` |
| `src/lib/sections/admin/AdminUsers.svelte` | Add `checkAll()` — iterate all tenants, fetch checks in serial, store per-tenant result in `quickCheck` |
| `src/lib/sections/admin/AdminUsers.svelte` | Tenant card: `🔍 Validasi` button per card; `Check All` button in header |
| `src/lib/sections/admin/AdminUsers.svelte` | Tenant card: quick-check badge after stats — shows ✓ Semua OK or ⚠ N gagal |
| `src/lib/sections/admin/AdminUsers.svelte` | Validation modal: grid checklist of all 11 checks, provisioning log viewer, Re-provision + Refresh buttons |

### Features
- Each tenant card now shows a live status badge after `Validasi` or `Check All` is run
- Validation modal shows all system checks at a glance with pass/fail per service
- Provisioning log in modal has human-readable step labels
- SSL check is on-demand (button) to avoid slow TLS connections by default
- Re-provision button in modal if any check fails and onboarding request exists
- `/check` endpoint supports `?ssl=1` (include TLS) and `?fast=1` (skip FreeIPA + Odoo)

---

## [2026-05-29] P0.4 — Application Provisioning (Nextcloud · Dovecot · Odoo)

### Audit Findings (pre-implementation)
- Nextcloud 28.0.14: `user_oidc` + `user_ldap` enabled; OCS Provisioning API reachable; only `admin` group existed
- SOGo: auth via FreeIPA LDAP (users auto-provisioned); single `SOGoMailDomain = opsid.web.id`; per-tenant email domain deferred
- Odoo: single `odoo_db`; auth_oauth provider `OPSID SSO` (id=4) already enabled; multi-company isolation via `res.company`
- Dovecot quota file format: `priv/{user}/quota_bytes={bytes}` at `/etc/dovecot/quota-users` on `mail-01`
- NC group membership: correct endpoint is `POST /ocs/v1.php/cloud/users/{uid}/groups` with body `groupid=...`

### Changes

| File | Action |
|------|--------|
| `src/lib/server/tenantProvisioning.ts` | Add NC constants + Odoo constants; add `ncOcs()`, `createNcGroup()`, `createNcUser()`, `setNcQuota()`, `addNcUserToGroup()`, `setDovecotQuota()`, `odooGetSession()`, `odooCall()`, `getOrCreateOdooCompany()`, `getOrCreateOdooUser()` |
| `src/lib/server/tenantProvisioning.ts` | Add 5 new steps to `provisionTenant()`: `nc_group`, `nc_user`, `sogo_quota`, `odoo_company`, `odoo_user` |
| `src/lib/server/tenantProvisioning.ts` | Add same 5 steps to `reprovisionTenant()` with `planEmailGb`/`planNcGb` inputs |
| `src/routes/api/admin/onboarding/[id]/reprovision/+server.ts` | Pass `plan_email_gb` + `plan_nextcloud_gb` from tenant row; update canonical step ORDER |

### Provisioning Flow (new steps, after kc_redirect_uri)
```
Step 9:  nc_group      → POST /ocs/v1.php/cloud/groups {groupid: slug}
Step 10: nc_user       → POST /ocs/v1.php/cloud/users + PUT quota + POST /cloud/users/{uid}/groups
Step 11: sogo_quota    → SSH mail-01: upsert /etc/dovecot/quota-users
Step 12: odoo_company  → getOrCreateOdooCompany (sentinel: website=opsid-slug:{slug})
Step 13: odoo_user     → getOrCreateOdooUser (login=admin@{domain}, oauth_provider=4)
```

### All steps
- Best-effort (failures logged, provisioning not aborted)
- Idempotent: NC 102 = already exists (ok); Odoo search-before-create; Dovecot upsert
- Re-provision: all 5 steps supported in reprovisionTenant()

### Smoke tested
```
NC group '1go':    created ✓
NC user admin.1go: already exists (102) ✓
NC quota 50GB:     set ✓
NC group membership: admin.1go → 1go ✓
Dovecot quota:     priv/admin.1go/quota_bytes=53687091200 ✓
Odoo:              company search works (no existing 1go company → created on next real provision)
```

### Build
```
npm run build && pm2 restart portal  ✓
```

---

## [2026-05-29] P0.3.5–P0.3.8 — Identity, SSL Visibility, Branding, Provisioning Reliability

### P0.3.5 — Identity Lifecycle

| File | Action |
|------|--------|
| `src/lib/server/tenantProvisioning.ts` | KC credential `temporary: true` (force password change on first login) |
| `src/routes/api/onboarding/[id]/+server.ts` | Save `provisioning_log` JSONB to `onboarding_requests` on approval |
| PostgreSQL | `ALTER TABLE onboarding_requests ADD COLUMN IF NOT EXISTS provisioning_log JSONB` |

### P0.3.6 — Domain & SSL Visibility

| File | Action |
|------|--------|
| `src/routes/api/admin/tenant/[id]/ssl/+server.ts` | NEW — GET checks DNS (dns.resolve4) + TLS cert (tls.connect), persists ssl_cert_* to `tenants` |
| `src/lib/sections/admin/AdminUsers.svelte` | SSL badge, "SSL" check button, SslResult interface, checkSsl() |
| PostgreSQL | `ALTER TABLE tenants ADD COLUMN IF NOT EXISTS ssl_cert_issuer/subject/expires/checked_at` |

### P0.3.7 — Tenant Branding Management

| File | Action |
|------|--------|
| `src/routes/+layout.svelte` | `<svelte:head>`: favicon link (logo_url), `<title>` per tenant, theme-color meta |
| `src/lib/sections/admin/AdminUsers.svelte` | Live brand preview strip in Edit Tenant modal (color bar + logo/initial + color chip) |

### P0.3.8 — Provisioning Reliability

| File | Action |
|------|--------|
| `src/lib/server/tenantProvisioning.ts` | NEW `reprovisionTenant()` — idempotent re-run of non-DB steps; 409/already-exists handled gracefully; new password only if user actually recreated |
| `src/routes/api/admin/onboarding/[id]/reprovision/+server.ts` | NEW — POST endpoint; auth opsid-admin; fetches request+tenant; runs reprovision; merges+persists log |
| `src/lib/sections/admin/AdminUsers.svelte` | Re-provision button (amber) for failed-step rows; Log button for all approved rows; Reprovision Result modal; Provisioning Log modal |

### Build
```
npm run build && pm2 restart portal
# All 4 sprints: clean build ✓
```

---

## [2026-05-29] P0.3.4 — SSL Provisioning Custom Domain

### Changes

| File | Action |
|------|--------|
| `edge-01:/opt/nginx-api/app.py` | Refactor ke `build_site_config()` + `ensure_symlink()`, tambah `POST /ssl/issue` |
| `src/lib/server/tenantProvisioning.ts` | Tambah `domain_type` ke `ProvisionInput`, fungsi `sslProvision()`, Step 2b (custom_domain only) |
| `src/routes/api/onboarding/[id]/+server.ts` | Pass `domain_type` ke `provisionTenant()` |

### SSL Issue Flow (`POST /ssl/issue`)
1. **DNS check** — `socket.gethostbyname(domain)` harus return `103.134.152.140`
2. **Buat webroot** — `/opt/nginxui/data/acme-webroot/` (= `/etc/nginx/acme-webroot/` di container)
3. **Update nginx config** — tambah `location /.well-known/acme-challenge/` sebelum `return 301`
4. **Reload nginx**
5. **certbot** — `certonly --webroot -w {webroot} -d {domain}` — Let's Encrypt HTTP-01
6. **Update nginx config** — ganti `/etc/nginx/ssl/` dengan `/etc/letsencrypt/live/{domain}/`
7. **Reload nginx**

### nginx-api improvements
- Template port-80 sekarang selalu include `acme-challenge` location (semua site baru)
- `ensure_symlink()` pakai `lexists` — tidak crash jika symlink sudah ada
- `/ssl/issue` baca slug/upstream dari config existing jika tidak disupply

### Tested
```
workspace.1go.biz.id:
  Subject: CN=workspace.1go.biz.id
  Issuer:  Let's Encrypt YR1
  Expiry:  Aug 27 2026
  TLS Verify: 0 (ok)
```

### Rollback
```bash
ssh edge-01 "cp /opt/nginx-api/app.py.bak-ssl-* /opt/nginx-api/app.py && pkill -f 'python3.*app.py' && nohup python3 /opt/nginx-api/app.py &"
```

---

## [2026-05-28] P0.3.3 — White-label Tenant Detection + Branding

### Changes

| File | Action |
|------|--------|
| `src/hooks.server.ts` | Tambah `tenant_domain`, `tenant_id` ke branding locals |
| `src/app.d.ts` | Tambah `tenant_domain?`, `tenant_id?` ke Locals.branding type |
| `src/lib/components/Sidebar.svelte` | Import `page` dari `$app/state`, brand name dari `branding.tenant_name` |
| `src/lib/sections/Landing.svelte` | Import `page`, brand nav/hero/footer/modal dari `branding.tenant_name` |
| `src/routes/+page.svelte` | Boot text: "Memuat OPSID…" → "Memuat…" |

### Behavior per hostname
```
opsid.web.id              → tenant_name: OPSID  (fallback DEFAULT_BRANDING)
workspace.1go.biz.id      → tenant_name: 1GO    (dari tenants WHERE domain = host)
tenant.opsid.web.id       → tenant_name: sesuai tenant di DB
```

### Verified
curl -s http://localhost:3000/ -H "Host: workspace.1go.biz.id" → tenant_name: 1GO ✓
curl -s http://localhost:3000/ -H "Host: opsid.web.id"         → tenant_name: OPSID ✓

### P0.3.4 SSL Custom Domain — Plan (belum diimplementasi)
Approach: certbot HTTP-01 via endpoint baru `/ssl/issue` di nginx-api (edge-01)
Syarat: DNS domain harus pointing ke 103.134.152.140 sebelum cert bisa diissue
Menunggu konfirmasi plan sebelum implementasi.

---

## [2026-05-28] P0.3.2 — Keycloak Client Redirect URI Sync on Tenant Approve

### Changes

| File | Action |
|------|--------|
| `src/lib/server/tenantProvisioning.ts` | Tambah `syncKcClientRedirectUri(domain)` — GET client, merge idempotent, PUT |
| `src/lib/server/tenantProvisioning.ts` | `provisionTenant()` Step 8: panggil KC redirect sync sebelum audit log |

### Behavior
- Setiap approve onboarding → `https://<tenant_domain>/*` masuk `validRedirectUris`
- Setiap approve onboarding → `https://<tenant_domain>` masuk `webOrigins`
- Idempotent: jika sudah ada, skip PUT (tidak duplikasi)
- Tidak overwrite existing URIs — hanya append
- Wildcard `https://*opsid.web.id/*` tetap ada untuk subdomain tenants
- Custom domain tenants mendapat entry eksplisit agar login tidak error `redirect_uri`

### Tested
KC PUT HTTP 204 dengan domain test `workspace.testcustomer.com`:
- Berhasil ditambahkan tanpa menghapus existing URIs
- Berhasil di-cleanup setelah test

---

## [2026-05-28] P0.3 Rev2 — Approve Triggers Real Tenant Provisioning

### Keputusan
Approve onboarding bukan lagi hanya update status — langsung provision tenant penuh
menggunakan logic yang sama dengan Tenant Management manual.

### Architecture
- Shared module `$lib/server/tenantProvisioning.ts` dengan `provisionTenant()` reusable
- `POST /api/admin/tenant` sekarang import dari shared module (tidak duplikasi)
- `PUT /api/onboarding/[id]` panggil `provisionTenant()` saat approve

### Changes

| File | Action |
|------|--------|
| `src/lib/server/tenantProvisioning.ts` | **NEW** — shared provisioning: DB, Nginx, FreeIPA, Keycloak |
| `src/routes/api/admin/tenant/+server.ts` | Refactor import dari shared module |
| `src/routes/api/onboarding/[id]/+server.ts` | Approve → provision tenant → return credentials one-time |
| `src/lib/sections/admin/AdminUsers.svelte` | Modal hasil provisioning: tenant ID, domain, username, password sementara, step log |
| PostgreSQL `onboarding_requests` | Tambah kolom `tenant_id FK → tenants.id` |

### Approve Flow
1. PUT /api/onboarding/:id {status: approved}
2. Fetch onboarding_requests row
3. Derive slug dari company_name, domain dari domain_type/domain_value
4. Generate password sementara (16 char base64url)
5. provisionTenant() → DB + Nginx + FreeIPA group + KC org + FreeIPA user + KC user + tenant_users
6. Status = approved hanya jika DB tenant insert berhasil
7. Return {tenant, adminUsername, adminPassword, domain, steps[]}
8. Password ditampilkan sekali di modal Admin Console

### Rollback Plan
Jika ada regresi:
```bash
cp /opt/portal/src/routes/api/admin/tenant/+server.ts.bak-provision-* /opt/portal/src/routes/api/admin/tenant/+server.ts
cp /opt/portal/src/routes/api/onboarding/\[id\]/+server.ts.bak-provision-* /opt/portal/src/routes/api/onboarding/\[id\]/+server.ts
cp /opt/portal/src/lib/sections/admin/AdminUsers.svelte.bak-provision-* /opt/portal/src/lib/sections/admin/AdminUsers.svelte
npm run build && pm2 restart portal
```

---

## [2026-05-28] P0.3 Rev — Domain Workspace: Subdomain OPSID + Custom Domain

### Keputusan
Custom domain diperlakukan sebagai first-class feature sejak onboarding.
Field "Subdomain yang Diinginkan" diganti menjadi "Domain Workspace" dengan dua pilihan.

### Changes

| File | Action |
|------|--------|
| PostgreSQL `onboarding_requests` | Tambah kolom `domain_type` (subdomain/custom_domain) + `domain_value` |
| `src/lib/sections/Landing.svelte` | Radio toggle Subdomain OPSID / Domain Sendiri, preview URL, helper DNS + IP |
| `src/routes/api/onboarding/+server.ts` | Terima `domain_type`/`domain_value`, sanitasi sesuai tipe |
| `src/lib/sections/admin/AdminUsers.svelte` | Kolom Domain tampilkan format sesuai tipe, label "custom domain"/"subdomain opsid" |

### Data Model
```
domain_type  = 'subdomain'     → domain_value = 'perusahaan'  → perusahaan.opsid.web.id
domain_type  = 'custom_domain' → domain_value = 'workspace.customer.com'
```

---

## [2026-05-28] P0.3 — Customer Onboarding MVP

### Changes

| File | Action |
|------|--------|
| `src/lib/sections/Landing.svelte` | Tambah modal "Mulai Berlangganan" dengan form (7 field), plan selector 3 tier, sukses state |
| `src/routes/api/onboarding/+server.ts` | POST (public) — simpan ke `onboarding_requests`; GET (admin) — list dengan filter status |
| `src/routes/api/onboarding/[id]/+server.ts` | PUT (admin) — approve atau reject dengan catatan |
| `src/lib/sections/admin/AdminUsers.svelte` | Tab baru "Permintaan" (superadmin only) — tabel, filter status, tombol Setuju/Tolak, modal reject dengan notes |
| PostgreSQL | Tabel `onboarding_requests` dibuat |

### Flow
1. Visitor klik "Mulai Berlangganan" di Landing → isi form → POST /api/onboarding → sukses
2. Superadmin buka Admin Console → tab "Permintaan" → review daftar → Approve/Reject

---

## [2026-05-28 20:10] P0.2 Rev — Simplify Login Flow + Polish KC Theme

### Keputusan
Flow login dikembalikan simpel: Landing → auth.login() langsung → Keycloak (OPSID theme).
Route `/login` dihapus — tidak dipakai.

### Changes

| File | Action |
|------|--------|
| `src/lib/sections/Landing.svelte` | CTA kembali `auth.login()`, logo tetap 44px |
| `src/routes/login/+page.svelte` | Dihapus |
| `KC: messages/messages_id.properties` | Tambah `usernameOrEmail=Email atau Username` |
| `KC: resources/css/opsid.css` | Polish: subtitle CSS, card 460px, spasi lebih lega |

### Flow Final
```
Landing → klik "Masuk dengan SSO" → auth.login()
        → Keycloak (opsid theme, dark)
        → login → redirect → dashboard
```

### KC Theme Verified
- opsid.css loaded ✓
- Title: "Masuk ke OPSID" ✓
- Label: "Email atau Username" ✓
- Button: "Masuk" ✓
- Tidak ada "OPSID-INTERNAL" ✓
- Logo HTTP 200 ✓

### Rollback
KC theme → Keycloak Admin UI → Realm Settings → Themes → Login Theme → `keycloak.v2`
Portal → `git stash` → `npm run build` → `pm2 restart portal`

---

## [2026-05-28 19:40] P0.2 — Login Experience (Logo + /login + Keycloak Theme)

### Changes

| File | Action |
|------|--------|
| `src/app.css` | Ganti `.brand-mark` → `.brand-logo` (img-based) |
| `src/lib/components/Sidebar.svelte` | Logo OPSID 30px, ganti CSS "O" mark |
| `src/lib/sections/Landing.svelte` | Logo 44px di nav, CTA → `/login` |
| `src/routes/login/+page.svelte` | **BARU** — halaman login standalone, logo 64px |
| `/opt/keycloak/themes/opsid/login/` | **BARU** — Keycloak dark theme |

### Architecture

```
Landing → href="/login" → /login page (branded, check-sso)
  → jika sudah auth: window.location.href = '/'
  → jika belum: tampilkan SSO button → auth.login() → Keycloak (opsid theme)
    → KC dark theme: parent=keycloak.v2, CSS override, logo via background-image
    → redirect_uri: https://opsid.web.id → dashboard
```

### Keycloak Theme Files
```
/opt/keycloak/themes/opsid/login/
├── theme.properties           (parent=keycloak.v2, loads opsid.css setelah styles.css)
├── resources/css/opsid.css    (dark override: bg #08090B, card #15171D, pri #5B86FF)
├── resources/img/opsid-logo.png (copy dari /opt/portal/static/brand/)
└── messages/messages_id.properties (loginAccountTitle=Masuk ke OPSID)
```

### Logo Sizes
- Sidebar: 30px height
- Landing nav: 44px height
- `/login` page: 64px height
- Keycloak login: 64px via CSS background-image

### Verified
- `opsid.css` loaded di KC login page ✓
- title: "OPSID Workspace" ✓
- h1: "Masuk ke OPSID" ✓
- Logo image: HTTP 200 at `/resources/mclh8/login/opsid/img/opsid-logo.png` ✓
- Realm theme set via Admin API (HTTP 204) ✓

---

## [2026-05-28 18:45] P0 Fix — Dashboard Recent Files Nextcloud

### Problem
Dashboard "File Terbaru" selalu kosong. Root cause: admin Nextcloud tidak bisa browse file user lain via WebDAV — ini by design Nextcloud security model. Admin PROPFIND pada `/remote.php/dav/files/{user}/` hanya mengembalikan root collection tanpa children.

### Solution
Menggunakan **Nextcloud App Password** (generated via official `occ user:add-app-password` CLI) + **Nextcloud Activity OCS API** sebagai user context.

### Changes

| File | Action |
|------|--------|
| `src/routes/api/nextcloud/recent/+server.ts` | Rewrite lengkap |
| `opsid_db.user_tokens` | Tabel baru untuk cache app password per user |

### Architecture

```
Request → ambil username dari KC cookie token
        → cek user_tokens table di portal DB
        → jika belum ada: SSH collab-01 → docker exec occ → generate → simpan DB
        → Activity API: GET /ocs/v2.php/apps/activity/api/v2/activity?object_type=files
        → deduplicate by file ID → return 6 file terbaru
```

### Security
- App password disimpan hanya di `opsid_db.user_tokens` (server-side)
- Tidak pernah dikirim ke frontend atau ditulis ke log
- Log hanya mencatat username dan jumlah file hasil

### UAT Fix — File Link SSO
Klik file di Dashboard sebelumnya redirect ke halaman login Nextcloud karena link langsung ke `/f/{id}` tanpa melalui OIDC flow.

Fix: Semua href file diwrap melalui `apps/user_oidc/login/1?redirect_url=/f/{id}` — sama persis dengan mekanisme DriveSection. Browser yang sudah login KC akan otomatis dapat Nextcloud session tanpa login ulang.

### Rollback Plan
```bash
# 1. Kembalikan endpoint
cp /opt/portal/src/routes/api/nextcloud/recent/+server.ts.bak-apppassword-20260528 \
   /opt/portal/src/routes/api/nextcloud/recent/+server.ts

# 2. Rebuild dan restart
cd /opt/portal && npm run build && pm2 restart portal

# 3. (Opsional) Hapus tabel user_tokens
# PGPASSWORD=... psql ... -c "DROP TABLE user_tokens;"
```

---

---

## [2026-05-28 15:00] Sprint UAT Fix 2 — Mail, Drive, Dashboard, Admin Console

### Issues Fixed

| # | Issue | Fix |
|---|-------|-----|
| 1 | Mail loading forever | MailSection URL: /SOGo/so/{user}/ → /Mail/ (explicit module path bypasses redirect chain) |
| 2 | Drive shows empty WebDAV browser | DriveSection rewritten as Nextcloud iframe (nginx already allows frame-ancestors opsid.web.id) |
| 3 | Dashboard 'Penyimpanan' widget redundant | Removed 4th stat card; stat-grid updated to 3 columns |
| 4 | Tenant Kelola User SQL error (created_at) | Removed created_at from SELECT + ORDER BY in tenant/[id]/users API |
| 5 | Tenant admin user list SQL error | Fixed ORDER BY created_at → id ASC in /api/users tenant path |
| 6 | jasmiandre shows role=Staff | GET /api/users now fetches KC opsid-admin role members and marks them as Superadmin |
| 7 | Impersonate/Suspend/Edit KC timeout | KC_BASE changed to http://10.34.1.4:8080 (internal) in impersonate + [username] APIs |
| 8 | Edit User fullname not updating | PATCH now reads both fullname and name fields from request body |
| 9 | Edit/Suspend UI never refreshes | PATCH/DELETE responses now include ok:true so UI update logic triggers |
| A | Keycloak still shows in Aplikasi | AppsSection synced — adminOnly:true filter blocks Keycloak for non-admins |

### Root Cause: Mail iframe infinite spinner
SOGo root path /SOGo/so/{user}/ performs a JS client-side redirect to /Mail/.
The onload event fires on the intermediate redirect page, then the browser
navigates to /Mail/ — which triggers another navigation cycle. The spinner
appeared to be stuck because the root URL was serving a redirect document.
Fix: Use /SOGo/so/{user}/Mail/ directly, same pattern as working Calendar.

### Root Cause: created_at missing from tenant_users table
INSERT statement for tenant_users does not include created_at, so the column
does not exist. ORDER BY created_at caused 500 errors. Fixed to ORDER BY id.

### Root Cause: User role enrichment
FreeIPA user title field defaults to 'Staff'. KC realm role 'opsid-admin' is
the canonical superadmin indicator. GET /api/users now cross-references KC
role members to correctly label superadmin users.

### Architecture Note: Nextcloud Drive iframe
Drive is now embedded as Nextcloud iframe. nginx config already has:
  proxy_hide_header X-Frame-Options;
  add_header Content-Security-Policy  frame-ancestors self https://opsid.web.id always;
Nextcloud SSO requires adding auth_request + X-Forwarded-User to nginx AND
configuring Nextcloud config.php trusted_proxies. Not yet implemented — user
may need to log in manually within the iframe for first session.

### Files Changed
- src/lib/sections/MailSection.svelte (URL /Mail/ explicit path)
- src/lib/sections/DriveSection.svelte (rewrite: iframe replacing WebDAV browser)
- src/lib/sections/Dashboard.svelte (remove Penyimpanan card; 3-col stat grid)
- src/lib/sections/AppsSection.svelte (Keycloak adminOnly sync)
- src/routes/api/admin/impersonate/+server.ts (KC internal URL + redirect fix)
- src/routes/api/admin/tenant/[id]/users/+server.ts (SQL created_at fix)
- src/routes/api/users/+server.ts (SQL fix + KC role enrichment)
- src/routes/api/users/[username]/+server.ts (KC internal URL + fullname + ok:true)

### Backup
/opt/portal/backups/20260528-1500/

### Rollback
cp /opt/portal/backups/20260528-1500/MailSection.svelte /opt/portal/src/lib/sections/
cp /opt/portal/backups/20260528-1500/DriveSection.svelte /opt/portal/src/lib/sections/
cp /opt/portal/backups/20260528-1500/Dashboard.svelte /opt/portal/src/lib/sections/
cp /opt/portal/backups/20260528-1500/AppsSection.svelte /opt/portal/src/lib/sections/
cp /opt/portal/backups/20260528-1500/impersonate-server.ts /opt/portal/src/routes/api/admin/impersonate/+server.ts
cp /opt/portal/backups/20260528-1500/users/+server.ts /opt/portal/src/routes/api/users/+server.ts
cp /opt/portal/backups/20260528-1500/users/username-server.ts '/opt/portal/src/routes/api/users/[username]/+server.ts'
cp /opt/portal/backups/20260528-1500/tenant-users/server.ts '/opt/portal/src/routes/api/admin/tenant/[id]/users/+server.ts'
cd /opt/portal && npm run build && pm2 restart portal

## [2026-05-28 13:45] Sprint UAT Fix — Workspace Embed, Drive, Recent Files

### Issues Fixed

| # | Issue | Fix |
|---|-------|-----|
| A/D | Tulis Email opens raw JSON | Button changed to navigate to Mail scene; compose via embedded SOGo |
| B | File Terbaru empty | nc-recent: URL changed to files.opsid.web.id:8080 (correct Host header) |
| C | Apps page wrong routing | Mail/NC cards navigate to internal scenes; Keycloak hidden for non-admins |
| E | Mail/Calendar not embedded | MailSection & CalendarSection rewritten as full-height SOGo iframes |
| F | Drive shows raw HTML error | HTML stripped from errors; nc-files URL fixed to hostname |
| G | Odoo requires manual click | check-embed rewritten: opsid.web.id hosts whitelisted (no timeout) |

### Root Cause: Nextcloud Host Header
Nextcloud requires correct Host header for all requests including WebDAV.
Requests with raw IP (10.34.1.7:8080) return HTTP 400.
Fix: all NC endpoints use http://files.opsid.web.id:8080 (resolved via /etc/hosts).

### Root Cause: check-embed timeout
check-embed made server-side HTTP requests to public URLs.
Public URLs unreachable from app-01 (hairpin NAT) caused 4s timeout.
Fix: hardcode opsid.web.id whitelist, return embeddable:true immediately.

### Architecture Decision: Nextcloud iframe not supported
Nextcloud sends X-Frame-Options: SAMEORIGIN and CSP frame-ancestors: none.
Drive page uses WebDAV file browser (not iframe) — correct behavior.
To enable Nextcloud iframe, add to edge-01 nginx for files.opsid.web.id:
  proxy_hide_header X-Frame-Options;
  add_header Content-Security-Policy "frame-ancestors *.opsid.web.id" always;

### Files Changed
- src/routes/api/check-embed/+server.ts (rewrite: whitelist, no network call)
- src/routes/api/nextcloud/files/+server.ts (NC_INTERNAL: IP -> hostname)
- src/routes/api/nextcloud/recent/+server.ts (NC_BASE: IP -> hostname)
- src/lib/sections/MailSection.svelte (rewrite: full-height SOGo iframe)
- src/lib/sections/CalendarSection.svelte (rewrite: full-height SOGo Calendar iframe)
- src/lib/sections/DriveSection.svelte (strip HTML from error messages)
- src/lib/sections/AppsSection.svelte (routing fix + hide Keycloak for non-admins)
- src/lib/ui.svelte.ts (add navigateTo() method + pendingScene state)
- src/routes/+page.svelte (watch ui.pendingScene to update scene)
- src/lib/sections/Dashboard.svelte (Tulis Email navigates to mail scene)

### Backup
/opt/portal/backups/20260528-1340/

### Rollback
```
cp -r /opt/portal/backups/20260528-1340/sections /opt/portal/src/lib/sections
cp /opt/portal/backups/20260528-1340/ui.svelte.ts /opt/portal/src/lib/
cp /opt/portal/backups/20260528-1340/+page.svelte /opt/portal/src/routes/
cp /opt/portal/backups/20260528-1340/check-embed/+server.ts /opt/portal/src/routes/api/check-embed/
cp -r /opt/portal/backups/20260528-1340/nextcloud-routes /opt/portal/src/routes/api/nextcloud
cd /opt/portal && npm run build && pm2 restart portal
```



## [2026-05-28] Sprint Stabilisasi — Hairpin NAT Fix

### Root Cause
Semua hostname `*.opsid.web.id` resolve ke public IP 103.134.152.140.
VM app-01 (10.34.1.2) tidak bisa menjangkau VM lain via public IP (hairpin NAT),
menyebabkan timeout ~130 detik untuk setiap server-side API call ke layanan eksternal.

### Issues Fixed

| # | Severity | Issue | Fix |
|---|----------|-------|-----|
| 4 | P0 | Tulis Email → 401 | /auth/validate rewrite: local JWT decode, hapus KC userinfo call |
| 5 | P0 | SOGo Webmail → 401 | sama: /auth/validate tidak timeout lagi |
| 6 | P0 | Kalender → 401 | /auth/validate + sogo/calendar pakai internal IP + proxy header |
| 1 | P1 | Dashboard lambat | semua API pakai internal IP, tidak ada 130s timeout |
| 2 | P1 | Nextcloud files tidak muncul | NC_BASE → http://10.34.1.7:8080 |
| 3 | P1 | Storage widget broken | NC_URL → http://files.opsid.web.id:8080 (via /etc/hosts) |
| 7 | P0 | Drive page tidak bisa browse | endpoint baru nextcloud/files dengan admin Basic auth |
| 8 | P1 | Odoo embed manual klik | ODOO_URL → http://10.34.1.8:8069 |
| 9 | P0 | Admin users kosong | /etc/hosts: 10.34.1.3 ipa.opsid.web.id |

### Files Changed

| File | Perubahan |
|------|-----------|
| `src/routes/auth/validate/+server.ts` | Rewrite total: local JWT decode, tidak ada network call ke KC |
| `src/routes/api/sogo/calendar/+server.ts` | Rewrite: SOGO_BASE=http://10.34.1.6:80, X-Webobjects-Remote-User header |
| `src/routes/api/nextcloud/files/+server.ts` | File baru: NC_INTERNAL=http://10.34.1.7:8080, admin Basic auth |
| `src/routes/api/nextcloud/recent/+server.ts` | NC_BASE → http://10.34.1.7:8080 |
| `src/routes/api/nextcloud/quota/+server.ts` | NC_URL → http://files.opsid.web.id:8080 (OCS API butuh Host header benar) |
| `src/routes/api/odoo/stats/+server.ts` | ODOO_URL → http://10.34.1.8:8069 |
| `src/routes/api/odoo/tasks/+server.ts` | ODOO_URL → http://10.34.1.8:8069 |
| `/etc/hosts` | Tambah: 10.34.1.3 ipa.opsid.web.id, 10.34.1.7 files.opsid.web.id |
| `/etc/cloud/templates/hosts.debian.tmpl` | Persist /etc/hosts entries untuk reboot |

### Technical Notes

- `Node.js fetch` tidak mengizinkan custom `Host` header (forbidden header per Fetch spec).
  Solusi: tambah hostname ke `/etc/hosts` sehingga `Host` header ter-set otomatis.
- SOGo CalDAV: gunakan `X-Webobjects-Remote-User` header (WOTrustProxyAuthentication=YES),
  tidak perlu kirim token/password user ke SOGo.
- Nextcloud WebDAV (`/remote.php/dav/`): berfungsi tanpa Host header custom.
  OCS API (`/ocs/v1.php/`): butuh Host header → solusi /etc/hosts.

### Verification Results (post-deploy)

```
[1] /auth/validate          HTTP:401 time:0.007s  ✓ (was: 130s timeout)
[2] /api/nextcloud/quota    HTTP:200 data:OK      ✓ (was: 500 → NC unreachable)
[3] /api/nextcloud/recent   HTTP:200 time:0.007s  ✓ (was: timeout)
[4] /api/sogo/calendar      HTTP:200 time:0.328s  ✓ (was: 401 timeout)
[5] /api/odoo/stats         HTTP:200 data:OK      ✓ (was: timeout)
[6] PM2 portal              online, pid:4481      ✓
```

### Backup Location
`/opt/portal/backups/20260528-1251/`

### Rollback Command
```bash
cp -r /opt/portal/backups/20260528-1251/src/routes/auth /opt/portal/src/routes/auth
cp -r /opt/portal/backups/20260528-1251/src/routes/api /opt/portal/src/routes/api
cd /opt/portal && npm run build && pm2 restart portal
# Revert /etc/hosts: remove 10.34.1.3 and 10.34.1.7 lines
```

### Rollback Procedure
1. Restore source files dari backup
2. Build ulang: `cd /opt/portal && npm run build`
3. Restart: `pm2 restart portal`
4. Verifikasi: `curl -s http://localhost:3000/auth/validate`
5. Hapus dari /etc/hosts jika diperlukan
6. Jika masih bermasalah: `pm2 logs portal --lines 50`

---

---

## [2026-05-28 15:30] Sprint UAT Fix 2b — Reset Password, Email Auto-fill, KC URL fixes

### Additional Fixes

| # | Issue | Fix |
|---|-------|-----|
| 1 | User Management - Reset Password missing | Added Reset Password modal + button in AdminUsers; PATCH action=reset_password syncs KC+IPA |
| 2 | Tenant Kelola User - email field blank | TenantUsersModal: email auto-fills as username@tenant.domain when username is typed |
| 3 | Tenant user reset_password KC timeout | KC_BASE → http://10.34.1.4:8080 in tenant/[id]/users/[username] |

### Files Changed (2b)
- src/lib/sections/admin/AdminUsers.svelte (Reset Password button + modal)
- src/lib/components/TenantUsersModal.svelte (email auto-fill + tenantSlug/Domain props)
- src/routes/api/users/[username]/+server.ts (add reset_password action)
- src/routes/api/admin/tenant/[id]/users/[username]/+server.ts (KC internal URL)

### Rollback (2b additions)
cp /opt/portal/backups/20260528-1500/users/username-server.ts '/opt/portal/src/routes/api/users/[username]/+server.ts'
cd /opt/portal && npm run build && pm2 restart portal

## Sprint 3 — UAT Round 3 Fixes [2026-05-28 15:30]

### Backup
- Location: /opt/portal/backups/20260528-sprint3/
- Nginx backup: /opt/nginxui/data/sites-enabled/opsid.conf.bak-sprint3
- Rollback portal: cd /opt/portal && cp backups/20260528-sprint3/*.svelte src/lib/sections/ (and subdirs) && npm run build && pm2 restart portal
- Rollback nginx: ssh root@10.34.1.1 'cp /etc/nginx/sites-enabled/opsid.conf.bak-sprint3 /etc/nginx/sites-enabled/opsid.conf && docker exec nginx-ui nginx -s reload'

### Changes
1. Dashboard Quick Access — Mail/Cloud tiles now navigate to internal scenes (mail/drive) instead of opening iframe
2. Dashboard Email Terbaru — Buka Mail link + inbox rows navigate to mail scene instead of new tab
3. Dashboard Jadwal — Kalender link + agenda rows navigate to calendar scene instead of new tab
4. Dashboard Notification badge — clears to 0 when notification panel opens
5. Aplikasi — Keycloak SSO removed entirely from app list
6. Nextcloud recent files — Fixed URL from https:443 to http:8080, Depth from 1 to infinity
7. Impersonate — URL normalisation now strips port from auth.opsid.web.id via regex
8. AdminUsers Edit User — Role dropdown now includes Superadmin/Tenant Admin with correct values
9. Nginx edge-01 — Added proxy_hide_header Content-Security-Policy to Nextcloud block (PENDING reload - stale symlinks blocking nginx reload, see note below)

### Pending
- Nginx reload blocked: stale symlinks in /opt/nginxui/data/sites-enabled/ for ABC, manjapoles, test, testroledb need to be removed by user before nginx can reload the Drive iframe CSP fix

## Sprint 4 — UAT Round 4 Fixes [2026-05-28]

### Backup
- Location: /opt/portal/backups/20260528-sprint4/
- nc-recent: /opt/portal/backups/20260528-sprint4/nc-recent-server.ts.bak
- nc-quota: /opt/portal/backups/20260528-sprint4/nc-quota-server.ts.bak
- AdminUsers: /opt/portal/backups/20260528-sprint4/AdminUsers.svelte.bak
- tenant API: /opt/portal/backups/20260528-sprint4/tenant-id-server.ts.bak
- nginx: /opt/nginxui/data/sites-available/opsid.conf.bak-sprint4 (on edge-01)

### Rollback Portal
cp /opt/portal/backups/20260528-sprint4/nc-recent-server.ts.bak /opt/portal/src/routes/api/nextcloud/recent/+server.ts && cp /opt/portal/backups/20260528-sprint4/nc-quota-server.ts.bak /opt/portal/src/routes/api/nextcloud/quota/+server.ts && cp /opt/portal/backups/20260528-sprint4/AdminUsers.svelte.bak /opt/portal/src/lib/sections/admin/AdminUsers.svelte && cd /opt/portal && npm run build && pm2 restart portal

### Rollback Nginx
ssh root@10.34.1.1 'cp /opt/nginxui/data/sites-available/opsid.conf.bak-sprint4 /opt/nginxui/data/sites-available/opsid.conf && docker exec nginx-ui nginx -s reload'

### Changes
1. Dashboard Quota — nc-quota rewritten to read tenant plan_nextcloud_gb from DB instead of NC physical disk total
2. Dashboard File Terbaru — nc-recent rewritten to use Bearer token (KC access token) via user_oidc; users see their own files
3. Drive SSO — nginx injects Authorization: Bearer  header to NC; user_oidc authenticates without OIDC redirect
4. Tenant Management — Added Edit Tenant button and modal with fields: Nama, Warna Brand, Status, Logo URL, Paket, Maks User, NC/Email/Odoo Quota
5. Tenant API PUT — Fixed missing updated_at column error; added name/maxUsers/planTier support with graceful column fallback
6. Tenant card — Status badge now reflects actual status (Aktif/Suspended/Tidak Aktif); stats show Paket tier
