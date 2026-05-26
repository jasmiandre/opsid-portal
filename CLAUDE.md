# OPSID Portal - Panduan untuk Claude Code & Claude Design

## Stack
- SvelteKit 5 (Svelte runes: $state, $derived)
- TypeScript
- Keycloak JS untuk SSO
- PostgreSQL via pg library
- PM2 untuk process management
- Deploy: npm run build && pm2 restart portal

## Struktur Penting
- src/lib/auth.svelte.ts — Keycloak auth state
- src/lib/sections/Dashboard.svelte — Dashboard utama
- src/lib/sections/admin/AdminUsers.svelte — Admin Console
- src/routes/api/ — semua API endpoints
- src/lib/db.ts — koneksi PostgreSQL

## Role Hierarchy
- Superadmin: realm role "opsid-admin" di Keycloak
- Tenant Admin: organization role "org-admin" di Keycloak Organization
- User biasa: tidak ada role khusus → tidak lihat Admin Console

## PR List (Priority Order)

### 1. Dashboard UI/UX
- [ ] Body tidak bisa scroll di layar normal
- [ ] Nama user double "Jasmi Andre Andre" di sidebar dan kanan atas
- [ ] User profile pojok kanan atas tidak berfungsi (klik tidak ada aksi)
- [ ] Pengaturan di sidebar tidak berfungsi
- [ ] File terbaru masih dummy, harus dari Nextcloud WebDAV API
- [ ] Jadwal hari ini masih dummy, harus dari SOGo CalDAV API

### 2. Admin Console
- [ ] Tab navigation posisi salah (muncul di topbar)
- [ ] Privileges: Superadmin lihat semua tab, Tenant Admin hanya User+Tenant, User biasa tidak lihat Admin Console
- [ ] User Management: tambah kolom Set Quota dan Impersonate
- [ ] Tenant Management: tambah tombol Delete tenant
- [ ] Tenant Management: form placeholder harus generic (bukan "shll")
- [ ] Service Health tab: status VM real dari Prometheus API
- [ ] Audit Log tab: data real dari PostgreSQL tabel audit_logs

### 3. Multi-tenant White-label
- [ ] Portal baca Host header → load branding dari DB PostgreSQL
- [ ] shll.opsid.web.id tampil dengan logo dan warna SHLL
- [ ] Isolasi SOGo: email domain per tenant
- [ ] Isolasi Nextcloud: group per tenant
- [ ] Isolasi Odoo: multi-company per tenant

### 4. Cron Job
- [ ] Hitung total usage per tenant tiap 1 jam
- [ ] Kalau over quota → suspend semua user tenant di FreeIPA
- [ ] Kirim email notifikasi ke tenant admin

## API Endpoints yang Sudah Ada
- GET/POST /api/admin/tenant — CRUD tenant (PostgreSQL + Nginx SSH + Keycloak)
- GET /api/users — list user dari FreeIPA
- POST /api/users — tambah user ke FreeIPA
- DELETE /api/users/[username] — hapus user dari FreeIPA
- GET /api/nextcloud/quota — quota storage user
- GET /api/sogo/inbox — inbox email user
- GET /api/odoo/stats — statistik Odoo
- GET /api/admin/health — status VM dari Prometheus

## Credentials (Internal Only)
- PostgreSQL: postgresql://svc_portal:Sandiaman2026@10.34.1.9:5432/opsid_db
- Keycloak Admin: opsid-admin / sandiaman2026
- NginxUI Node Secret: 1e20cbe1-c87c-421c-9886-40cac3a8312f
- FreeIPA: via JSON-RPC https://ipa.opsid.web.id/ipa/session/json
