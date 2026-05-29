# OPSID Current State
Last updated: 2026-05-29

## DONE

- P0.1 Recent Files Nextcloud
- P0.2 Login Experience + Keycloak Theme
- P0.3.1 Tenant Provisioning (onboarding approve → create tenant full stack)
- P0.3.2 Keycloak Redirect URI Sync (custom domain → portal client redirectUris/webOrigins)
- P0.3.3 White-label Tenant Detection (hostname → branding dari DB)
- P0.3.4 SSL Provisioning Custom Domain ✅
- P0.3.5 Identity Lifecycle ✅ (temporary password, force password change KC `temporary:true`, provisioning_log JSONB)
- P0.3.6 Domain & SSL Visibility ✅ (GET /api/admin/tenant/[id]/ssl — DNS + TLS check, persist to DB, SSL badge + button di UI)
- P0.3.7 Tenant Branding Management ✅ (favicon injection via svelte:head, theme-color meta, site title per tenant, live brand preview modal)
- P0.3.8 Provisioning Reliability ✅ (reprovisionTenant(), POST /api/admin/onboarding/[id]/reprovision, Re-provision button + Log modal di Permintaan tab)

## P0.3.5 — Identity Lifecycle

- KC credential `temporary: true` → force password change on first login
- `onboarding_requests.provisioning_log JSONB` column added
- Approval path persists step-by-step log to DB
- Admin password shown once in modal, never stored

## P0.3.6 — Domain & SSL Visibility

- `GET /api/admin/tenant/[id]/ssl` checks live DNS (dns.resolve4) + TLS cert (tls.connect)
- Persists ssl_cert_issuer, ssl_cert_subject, ssl_cert_expires, ssl_checked_at to `tenants`
- SSL badge + "SSL" button in Admin Console Tenant card
- DNS + SSL status shown inline

## P0.3.7 — Tenant Branding Management

- `+layout.svelte`: `<svelte:head>` injects favicon `<link>` (if logo_url set), `<title>` per tenant, `<meta name="theme-color">`
- Edit Tenant modal: live branding preview strip (color + logo + name)
- hooks.server.ts already loads `name`, `logo_url`, `primary_color` from DB by Host header

## P0.3.8 — Provisioning Reliability

- `reprovisionTenant()` in tenantProvisioning.ts: re-runs all non-DB steps idempotently
  - Handles 409/already-exists gracefully for FreeIPA group, KC org, KC user
  - Generates new adminPassword only when user step actually runs
  - Merges with existing provisioning_log, sorted by canonical order
- `POST /api/admin/onboarding/[id]/reprovision` endpoint
  - Auth: opsid-admin only
  - Fetches onboarding_request + tenant, runs reprovision, updates provisioning_log
  - Returns steps + adminPassword (if new user created)
- Admin Console Permintaan tab:
  - Approved rows show ⟳ Re-provision button (orange, for failed steps) + Log button
  - All-ok rows show ✓ provisioned + Log button
  - Re-provision Result modal shows retried steps + new password if applicable
  - Provisioning Log modal shows full merged log

## P0.3.4 RESULT (reference)

workspace.1go.biz.id:
- DNS: 103.134.152.140 ✓
- SSL: CN=workspace.1go.biz.id (Let's Encrypt, valid Aug 27 2026) ✓
- Issuer: Let's Encrypt YR1 ✓
- nginx config: /etc/letsencrypt/live/workspace.1go.biz.id/ ✓

## ARCHITECTURE

Onboarding Approve Flow (custom_domain):
1. DB tenant insert (critical)
2. nginx /site/add
3. ssl_certbot: POST nginx-api /ssl/issue → DNS check → certbot HTTP-01 → update nginx cert → reload
4. FreeIPA group
5. Keycloak org
6. FreeIPA user (credential temporary=true)
7. Keycloak user + org member
8. tenant_users record
9. KC client portal redirect URI sync
10. Audit log + provisioning_log persisted

For subdomain: step 3 skipped (wildcard *.opsid.web.id)

Re-provision: re-runs steps 2–9 (skips step 1), idempotent. New password generated only if user is actually recreated.

## P0.4 — Application Provisioning (2026-05-29) ✅

### Architecture decision
- Nextcloud: shared instance, isolated by NC group per tenant (`{slug}`)
- SOGo/Dovecot: shared instance, auth via FreeIPA LDAP (auto). Email domain = `opsid.web.id` for all tenants (per-tenant domain deferred — high complexity)
- Odoo: shared `odoo_db`, isolated by `res.company` per tenant. OPSID SSO provider (id=4) already configured and enabled.

### New provisioning steps added (all best-effort, idempotent, logged to provisioning_log)
| Step | What |
|------|------|
| `nc_group` | Create NC group `{slug}` via OCS API `POST /ocs/v1.php/cloud/groups` |
| `nc_user` | Create NC user `admin.{slug}` + set quota + add to group via OCS API |
| `sogo_quota` | Set Dovecot per-user quota via SSH to `mail-01` |
| `odoo_company` | Find-or-create `res.company` (sentinel: `website = opsid-slug:{slug}`) |
| `odoo_user` | Find-or-create `res.users` with `login=admin@{domain}`, linked to company + OPSID SSO provider |

### Key discoveries from audit
- NC `user_oidc` (OIDC/Keycloak SSO) is enabled and working
- NC `user_ldap` also enabled (FreeIPA backend)
- SOGo uses FreeIPA LDAP directly → users auto-appear when FreeIPA user created
- Odoo auth provider `id=4` (`OPSID SSO`) already enabled — `oauth_uid` auto-filled on first KC login
- Dovecot quota file format: `priv/{username}/quota_bytes={bytes}` at `/etc/dovecot/quota-users`
- NC correct endpoint for group membership: `POST /ocs/v1.php/cloud/users/{uid}/groups` (not `/groups/{gid}/users`)

### Re-provision support
All 5 new steps added to `reprovisionTenant()` with the same idempotency handling.

## Stabilization Audit (2026-05-29) ✅

### Security
- 9 admin API endpoints were missing auth guards — all fixed
- DELETE /api/admin/tenant/[id] was fully unprotected (critical)
- PATCH/DELETE /api/users/[username] had no admin check
- All admin endpoints now return 401/403 for unauthenticated/unauthorized callers

### Race Condition
- Onboarding approval: atomic `pending → processing → approved` prevents double-provisioning
- On provisioning failure: status resets to `pending` so admin can retry

### Provisioning Idempotency (initial provision now matches reprovision)
- FreeIPA group/user "already exists" → treated as ✓
- KC org 409 → treated as ✓, orgId recovered for membership step
- KC user 409 → treated as ✓, kcUserId recovered
- `kc_org_member` always written to provisioning_log (even when skipped)

### DB
- Added `idx_onboarding_tenant_id` (applied)
- `migrations/002_indexes_stabilization.sql` for audit_logs + tenants indexes (needs postgres)
- Pool error handler + 5s connection timeout

### Code
- 16 `.bak` files removed from src/
- Dead code in `adminEmail` simplified
- Tenant DELETE now nulls FK in onboarding_requests before deletion

---

## Stabilization — Validation Checklist (2026-05-29) ✅

### New: `/api/admin/tenant/[id]/check`
- 11 parallel live checks with per-check 12s timeout
- KC org + user, FreeIPA group + user, NC group + user, Dovecot quota, Odoo company + user, DNS, SSL (on-demand)
- Auth: opsid-admin only
- `?ssl=1` includes TLS check; `?fast=1` skips FreeIPA + Odoo for speed

### New: Validation UI in Tenant Management
- `🔍 Validasi` button per tenant card — opens validation modal with full checklist
- `Check All` header button — runs check on all tenants, stores per-tenant pass/fail badge
- Tenant card shows quick badge after check: ✓ Semua OK or ⚠ N gagal
- Validation modal: grid of all 11 checks, provisioning log with human labels, Re-provision + Refresh buttons

## Bug Fix Sprint (2026-05-29)

### BUG-001 ✅ — Custom domain login redirect
- `auth.svelte.ts`: `login()` uses `window.location.origin + '/dashboard'`
- `auth.svelte.ts`: `logout()` uses `window.location.origin`
- Cookie domain: `.opsid.web.id` for opsid subdomains, host-only for custom domains

### BUG-002 ✅ — Processing status breaks Permintaan UI
- `GET /api/onboarding?status=pending` includes `status='processing'` rows
- `PUT /api/onboarding/[id]` accepts `status='reset_pending'` to unstick
- UI shows "Memproses…" badge + "Reset ke Pending" button

### BUG-003 ✅ — Onboarding email domain hint
- Soft warning when custom_domain selected and email doesn't match
- Placeholder updates to `budi@{domain_value}`

### BUG-004 ✅ — User management email tenant-aware
- Add User modal shows `@{tenantDomain}` hint for tenant admins
- `createUser()` validates email domain for non-superadmin callers

### BUG-005 ✅ — Keycloak unreachable (Hairpin NAT)
- All server-side KC URLs changed from `https://auth.opsid.web.id` to `http://10.34.1.4:8080`
- Files: `tenantProvisioning.ts`, `check/+server.ts`, `admin/tenant/[id]/+server.ts`

### BUG-006 ✅ — Odoo company validation
- `checkOdoo()`: if sentinel search empty, fallback to user's `company_id` field

### BUG-007 ✅ — Provisioning log empty for old tenants
- Log modal shows explanation for tenants created before v0.3.5

### BUG-008 ✅ — Admin console responsive
- Added @media breakpoints: ≤900px table compact, ≤768px full-width layout

## NEXT PRIORITY

1. Cron: usage accounting + over-quota suspension + email notif
2. Mobile responsive (sidebar hamburger)
3. certbot auto-renewal notification
4. Per-tenant email domain (SOGo + Dovecot virtual domains) — deferred high complexity

## RULES
- Audit before coding
- Build + test before done
- Update docs on each sprint
