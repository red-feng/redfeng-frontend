# Checklist Teknis Role Matrix

Dokumen ini menurunkan [role-matrix.md](./role-matrix.md) menjadi checklist implementasi teknis per modul, lalu mencocokkannya dengan kondisi codebase saat ini.

Status yang dipakai:

- `Done`: sudah sesuai dan terlihat konsisten
- `Partial`: sebagian sudah sesuai, tetapi masih ada celah atau coverage belum penuh
- `Todo`: belum terlihat di codebase saat ini

## 1. Fondasi Role dan Routing

### Checklist

- [x] Portal admin menerima `admin` dan `operations_manager`
- [x] Portal superadmin tetap terpisah dari portal admin
- [x] Middleware route `/admin` mengizinkan `operations_manager`
- [x] Label role internal membedakan `admin`, `operations_manager`, `finance`, `finance_manager`, dan `superadmin`

### Implementasi Saat Ini

- `Done` Role admin portal dibuka untuk `admin` dan `operations_manager` di `lib/internal-roles.ts`
- `Done` Login admin menerima `operations_manager` di `app/admin/login/page.tsx`
- `Done` Layout admin membedakan workspace manager vs admin di `app/admin/(protected)/layout.tsx`
- `Done` Middleware `/admin` sudah mengizinkan `operations_manager` di `proxy.ts`

## 2. Merchant Module

### Aturan Target

- `admin` boleh approve merchant
- `admin` boleh reject merchant
- `admin` boleh deactivate atau reactivate merchant
- `admin` boleh mencabut akses merchant anomali
- `operations_manager` hanya read-only pada eksekusi merchant
- `superadmin` boleh override lewat jalur admin execution

### Checklist

- [x] Server action merchant dibatasi ke `admin` dan `superadmin`
- [x] UI merchant untuk `operations_manager` tampil read-only
- [x] Audit log merchant mencatat actor role

### Implementasi Saat Ini

- `Done` Guard server action merchant memakai `isAdminExecutionRole` di `app/admin/(protected)/merchants/actions.ts`
- `Done` UI merchant menampilkan pesan read-only untuk `operations_manager` di `app/admin/(protected)/merchants/page.tsx`
- `Done` Audit log merchant tercatat lewat `createAdminAuditLog` di `app/admin/(protected)/merchants/actions.ts`

## 3. Package Module

### Aturan Target

- `admin` boleh approve package
- `admin` boleh reject package
- `operations_manager` hanya memonitor queue dan kualitas review
- hapus permanen package hanya untuk `superadmin`

### Checklist

- [x] Server action package dibatasi ke `admin` dan `superadmin`
- [x] UI package untuk `operations_manager` tampil read-only
- [x] Hapus permanen package dibatasi ke `superadmin`
- [x] Audit log package mencatat actor role

### Implementasi Saat Ini

- `Done` Guard server action package memakai `isAdminExecutionRole` di `app/admin/(protected)/packages/actions.ts`
- `Done` UI package menahan `operations_manager` dari approve atau reject di `app/admin/(protected)/packages/page.tsx`
- `Done` Penghapusan permanen package dibatasi ke `superadmin` di `app/admin/(protected)/packages/actions.ts`
- `Done` Audit log package tercatat lewat `createAdminAuditLog`

## 4. Booking Module

### Aturan Target

- `admin` boleh handoff booking ke finance
- `admin` boleh membuat dan mengubah internal note
- `operations_manager` hanya membaca kesiapan handoff dan histori note
- `operations_manager` tidak boleh handoff dan tidak boleh mengubah note

### Checklist

- [x] Server action booking handoff dibatasi ke `admin` dan `superadmin`
- [x] Server action note dibatasi ke `admin` dan `superadmin`
- [x] UI booking center menahan `operations_manager` dari handoff
- [x] UI booking detail menahan `operations_manager` dari create/update note
- [x] Audit log booking mencatat actor role

### Implementasi Saat Ini

- `Done` Handoff booking dibatasi lewat `isAdminExecutionRole` di `app/admin/(protected)/bookings/actions.ts`
- `Done` Note booking dibatasi lewat `isAdminExecutionRole` di `app/admin/(protected)/bookings/[id]/actions.ts`
- `Done` UI booking center read-only untuk manager di `app/admin/(protected)/bookings/page.tsx`
- `Done` UI booking detail read-only untuk manager di `app/admin/(protected)/bookings/[id]/page.tsx`
- `Done` Audit log booking tercatat untuk handoff dan note lifecycle

## 5. Admin Account Management

### Aturan Target

- `operations_manager` boleh membuat akun `admin`
- `operations_manager` boleh reset password akun `admin`
- `operations_manager` boleh menghapus akun `admin`
- `operations_manager` tidak boleh membuat, reset, atau menghapus `operations_manager`
- `superadmin` boleh mengelola `admin` dan `operations_manager`
- semua aksi account management wajib masuk audit log

### Checklist

- [x] `operations_manager` bisa create `admin`
- [x] `operations_manager` bisa reset password `admin`
- [x] `operations_manager` bisa delete `admin`
- [x] `operations_manager` tidak bisa create `operations_manager`
- [x] `operations_manager` tidak bisa reset atau delete `operations_manager`
- [x] Semua aksi account management masuk audit log
- [x] Audit log account management dapat difilter di UI audit log

### Implementasi Saat Ini

- `Done` Lifecycle akun admin kini dikelola di `app/admin/(protected)/team-accounts/actions.ts`
- `Done` Manager hanya boleh menyentuh role `admin`, bukan `operations_manager`
- `Done` Create, reset password, dan delete akun internal sudah dicatat ke `admin_action_logs`
- `Done` Audit log UI sudah mengenali `internal_account`, `create_account`, `reset_password`, dan `delete_account`

### Catatan

- Route utama finance account management kini memakai naming yang lebih tepat, yaitu `/finance/team-accounts`.

Status: `Done`

Alasan:
- secara permission, audit, struktur module, dan naming route utama sudah selaras

## 6. Operations Manager Reporting

### Aturan Target

- `operations_manager` boleh mengirim laporan operasional ke `superadmin`
- `admin` tidak boleh mengirim laporan manager

### Checklist

- [x] Server action laporan dibatasi ke `operations_manager` dan `superadmin`
- [x] UI laporan manager tersedia untuk manager
- [x] Data laporan tersimpan dengan role author yang benar

### Implementasi Saat Ini

- `Done` Action laporan dibatasi di `app/admin/(protected)/dashboard/actions.ts`
- `Done` Dashboard manager menyediakan form laporan di `app/admin/(protected)/dashboard/page.tsx`
- `Done` Laporan disimpan dengan `author_role = operations_manager`

## 7. Oversight dan Monitoring

### Aturan Target

- `operations_manager` harus bisa melihat backlog, overdue, SLA, dan ringkasan kapasitas tim
- `operations_manager` harus bisa membaca audit log
- `operations_manager` harus bisa memantau performa tanpa mengeksekusi aksi bisnis

### Checklist

- [x] Dashboard manager menampilkan backlog dan SLA
- [x] Operations manager bisa membuka Merchant Directory
- [x] Operations manager bisa membuka Package Review
- [x] Operations manager bisa membuka Booking Center
- [x] Audit log dapat dibaca oleh manager

### Implementasi Saat Ini

- `Done` Dashboard manager menampilkan metrik operasional di `app/admin/(protected)/dashboard/page.tsx`
- `Done` Manager dapat masuk ke modul merchant, package, dan booking dalam mode monitor
- `Done` Audit log UI saat ini dibaca lewat `createAdminClient()`, sehingga manager dapat memantau log dari layer aplikasi
- `Done` Migration policy select audit log sudah diperluas agar `operations_manager` ikut tercakup di level database

Status: `Done`

Alasan:
- layer aplikasi, UI, route, dan policy database kini selaras untuk kebutuhan baca audit log oleh manager

## 8. Audit Log dan Policy Database

### Aturan Target

- actor role harus selalu tercatat
- target account management harus bisa dicatat
- `operations_manager` harus bisa membaca audit log yang relevan

### Checklist

- [x] Audit log menyimpan `actor_role`
- [x] Audit log mendukung target `merchant`, `package`, `booking`
- [x] Audit log mendukung target `internal_account`
- [x] Policy select audit log mengizinkan `operations_manager`
- [x] Policy insert audit log untuk account management konsisten dengan actor yang sah

### Implementasi Saat Ini

- `Done` `actor_role` sudah digunakan luas di `createAdminAuditLog`
- `Done` constraint target type sudah diperluas dengan migration baru untuk `internal_account`
- `Done` Layer aplikasi saat ini menulis dan membaca audit log lewat `createAdminClient()`, sehingga audit trail aktif tidak bergantung pada RLS untuk server flow ini
- `Done` migration tambahan sudah memperluas select policy untuk `operations_manager`
- `Done` migration tambahan sudah memperluas insert policy untuk actor internal yang sah: `admin`, `operations_manager`, `finance`, `finance_manager`, dan `superadmin`

Status: `Done`

Tindak lanjut yang disarankan:
- pertahankan policy ini tetap sinkron setiap kali role internal baru diperkenalkan

## 9. Naming dan Struktur Kode

### Checklist

- [x] Action admin account management berada di module yang namanya mencerminkan domain operasional
- [x] Action finance account management dipisah jelas dari action operasional
- [x] Shared helper account management dipindah ke lib atau module khusus internal accounts

### Implementasi Saat Ini

- `Done` Action akun admin kini berada di `app/admin/(protected)/team-accounts/actions.ts`
- `Done` Action akun finance kini berada di `app/finance/(protected)/team-accounts/finance-actions.ts`
- `Done` Helper bersama dipindah ke `lib/internal-account-management.ts`

## Ringkasan Status

### Sudah Sesuai

- routing admin vs operations manager
- merchant execution separation
- package execution separation
- booking execution separation
- reporting operations manager
- account management admin oleh operations manager
- audit log account management di level aplikasi
- policy database audit log untuk actor internal yang sah
- struktur dasar module account management

### Masih Perlu Dirapikan

- peluang pemisahan helper lebih lanjut bila domain internal account lifecycle makin besar

## Prioritas Lanjutan

1. Pertimbangkan pemisahan helper lebih lanjut bila domain internal account lifecycle bertambah kompleks.

## Dokumen Pendukung

- role matrix resmi: `docs/role-matrix.md`
- checklist teknis: `docs/role-matrix-checklist.md`
- checklist regresi portal internal: `docs/internal-portal-regression-checklist.md`
- panduan microcopy UI internal: `docs/ui-microcopy-guideline.md`
- arsitektur lifecycle akun internal: `docs/internal-account-lifecycle.md`
- audit role finance: `docs/finance-role-audit.md`
- diagram role dan lifecycle akun: `docs/role-account-lifecycle-diagram.md`
- bahasa visual dashboard: `docs/dashboard-visual-language.md`
