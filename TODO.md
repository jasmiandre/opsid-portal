# TODO

## ✅ P0.3.5 Identity Lifecycle — DONE 2026-05-29
- [x] Temporary password shown once in Admin Console
- [x] Force password change on first login (KC credential `temporary: true`)
- [x] provisioning_log JSONB stored per approval
- [ ] Password reset flow untuk user biasa (future)
- [ ] Welcome email ke tenant admin (future)

---

## ✅ P0.3.6 Domain & SSL Visibility — DONE 2026-05-29
- [x] DNS status check (resolve4, is it pointing to OPSID IP?)
- [x] SSL issuer, subject, expiry, days-left display
- [x] Persist ssl_cert_* columns to `tenants`
- [x] SSL badge + check button in Tenant card

---

## ✅ P0.3.7 Tenant Branding Management — DONE 2026-05-29
- [x] Favicon injection via `<svelte:head>` (logo_url as favicon)
- [x] Page title per tenant (`{tenant_name} Portal`)
- [x] theme-color meta tag per tenant primary_color
- [x] Live brand preview strip in edit tenant modal
- [ ] Actual logo file upload to storage (currently URL only)
- [ ] Sidebar logo rendering (check existing conditional)

---

## ✅ P0.3.8 Provisioning Reliability — DONE 2026-05-29
- [x] reprovisionTenant() — idempotent, non-DB steps only
- [x] POST /api/admin/onboarding/[id]/reprovision
- [x] Re-provision button for approved requests with failed steps
- [x] Provisioning Log modal (full step log)
- [x] Reprovision Result modal (new steps + new password if user recreated)

---

## ✅ App Provisioning (P0.4) — DONE 2026-05-29

- [x] Nextcloud: create group `{slug}` per tenant (OCS API)
- [x] Nextcloud: create user `admin.{slug}`, add to group, set quota
- [x] SOGo/Dovecot: set mailbox quota for admin user via SSH
- [x] Odoo: create `res.company` per tenant (idempotent sentinel: website=opsid-slug:{slug})
- [x] Odoo: create `res.users` admin@{domain} linked to company + OPSID SSO provider
- [x] Re-provision support for all 5 new steps
- [ ] SOGo per-tenant email domain — DEFERRED (requires Dovecot virtual domains + DNS per tenant)

---

## ✅ Stabilization Audit — DONE 2026-05-29
- [x] SEC: 9 unprotected endpoints now have auth guards
- [x] RACE: Onboarding approval is now atomic (pending→processing→approved)
- [x] PROV: FreeIPA/KC "already exists" idempotent in initial provision
- [x] PROV: `kc_org_member` always logged in provisioning_log
- [x] FK: DELETE tenant nulls onboarding_requests.tenant_id first
- [x] DB: idx_onboarding_tenant_id added; 002_indexes.sql for superuser indexes
- [x] DB: pool error handler + connection timeout
- [x] CODE: 16 .bak files removed; adminEmail dead code fixed
- [ ] PENDING: Run migrations/002_indexes_stabilization.sql as postgres superuser

---

## ✅ Stabilization Sprint — DONE 2026-05-29
- [x] GET /api/admin/tenant/[id]/check — 11 live checks (KC, FreeIPA, NC, Dovecot, Odoo, DNS, SSL)
- [x] Validasi button per tenant card → validation modal
- [x] Check All button → per-tenant quick badge (✓ OK / ⚠ N gagal)
- [x] Provisioning log in modal with human-readable step labels
- [x] Re-provision + Refresh buttons in validation modal

---

## ✅ Bug Fix Sprint — DONE 2026-05-29
- [x] BUG-001: Custom domain login redirect (auth.svelte.ts redirectUri + cookie domain)
- [x] BUG-002: Processing status in Permintaan UI + reset endpoint
- [x] BUG-003: Onboarding email domain hint (soft warning)
- [x] BUG-004: User management email domain enforcement for tenant admins
- [x] BUG-005: Keycloak hairpin NAT fix (KC_BASE → http://10.34.1.4:8080 in 3 files)
- [x] BUG-006: Odoo company validation fallback via user.company_id
- [x] BUG-007: Provisioning log empty message for old tenants
- [x] BUG-008: Admin console responsive CSS breakpoints

---

## Cron Jobs (P0.5)

Priority: Medium
Status: Pending

- [ ] Hitung total usage per tenant tiap 1 jam
- [ ] Kalau over quota → suspend semua user tenant di FreeIPA
- [ ] Kirim email notifikasi ke tenant admin

---

## SSL Maintenance

Priority: Low
Status: Future

- [ ] certbot auto-renewal cronjob untuk custom domain certs
- [ ] Notifikasi jika cert akan expired (< 30 hari)
- [ ] Wildcard *.opsid.web.id renewal strategi DNS-01 (expires Aug 2026)

---

## Mobile Responsive

Priority: Medium
Status: Pending

- [ ] Sidebar hamburger untuk layar <768px
- [ ] Landing mobile layout fix

---

## User Features

Priority: Low
Status: Future

- [ ] Password reset flow untuk user biasa
- [ ] Welcome email ke tenant admin
- [ ] User self-service profile edit
