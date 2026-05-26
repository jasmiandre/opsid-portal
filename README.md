# OPSID Portal — Svelte 5 Konversi

## File yang dihasilkan

| File | Target di repo | Keterangan |
|------|---------------|------------|
| `src/lib/sections/Dashboard.svelte` | Replace langsung | Dashboard utama, fetch dari API |
| `src/lib/sections/admin/AdminUsers.svelte` | Replace langsung | Admin Console lengkap (4 tab) |
| `src/lib/components/Sidebar.svelte` | Replace langsung | Sidebar dengan fix double name |
| `app-additions.css` | **Append** ke `src/app.css` | CSS baru (jangan replace!) |

## Cara install

```bash
# 1. Copy Svelte components
cp svelte-output/src/lib/sections/Dashboard.svelte src/lib/sections/Dashboard.svelte
cp svelte-output/src/lib/sections/admin/AdminUsers.svelte src/lib/sections/admin/AdminUsers.svelte
cp svelte-output/src/lib/components/Sidebar.svelte src/lib/components/Sidebar.svelte

# 2. Append CSS additions ke app.css (JANGAN replace!)
cat svelte-output/app-additions.css >> src/app.css

# 3. Build & test
npm run dev
```

## Perubahan utama

### Dashboard.svelte
- Fetch real data dari `/api/nextcloud/quota`, `/api/sogo/inbox`, `/api/odoo/stats`
- Svelte 5 runes: `$state`, `$derived`
- Profile dropdown yang berfungsi (klik → menu → Profil/Pengaturan/Keluar)
- Topbar sticky saat scroll
- Loading states & error handling
- Agenda dan recent files masih placeholder (butuh CalDAV + WebDAV API)

### AdminUsers.svelte
- 4 tab: User Management, Tenant Management, Service Health, Audit Log
- Tab navigation **di dalam content area** (bukan topbar) — fix issue
- Fetch real data dari `/api/users`, `/api/admin/tenant`
- Health & Audit fallback ke dummy data (endpoint belum ada)
- POST `/api/users` untuk create user
- POST `/api/admin/tenant` untuk create tenant
- Tombol delete tenant
- Role check: `auth.profile.isAdmin` → semua tab, `isTenantAdmin` → Users + Tenants saja
- Search/filter untuk users dan audit log

### Sidebar.svelte
- **FIX double name**: pakai `auth.profile.fullName` bukan `firstName + lastName`
- Admin Console hanya tampil jika `isAdmin || isTenantAdmin`
- Svelte 5 `$derived` untuk reactive show/hide

### CSS Additions
- Stat cards, progress bars, tab bar, modal overlay, tenant grid
- Tag colors: warn, danger, purple
- Button variants: secondary, danger
- Responsive breakpoints
