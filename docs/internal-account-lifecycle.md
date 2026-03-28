# Internal Account Lifecycle

Dokumen ini menjelaskan arsitektur ringkas pengelolaan akun internal Red Feng setelah pemisahan domain `admin` dan `finance` dirapikan.

## Tujuan

- Menjelaskan siapa yang mengelola akun internal siapa.
- Menjelaskan lokasi module dan helper yang sekarang menjadi sumber kebenaran.
- Menjadi referensi saat menambah role internal atau mengubah permission account management.

## Hierarki Pengelolaan Akun

### Jalur Operasional

- `operations_manager` mengelola akun `admin`
- `superadmin` mengelola akun `admin` dan `operations_manager`

### Jalur Finance

- `finance_manager` mengelola akun `finance`
- `superadmin` mengelola akun `finance` dan `finance_manager`

### Jalur Superadmin

- hanya `superadmin` yang mengelola akun `superadmin`

## Aturan Inti

- role manager boleh mengelola akun tim di bawahnya
- role manager tidak mengeksekusi aksi bisnis rutin yang dikerjakan oleh tim eksekutor
- semua create, reset password, dan delete akun internal wajib masuk audit log
- audit log account management memakai `target_type = internal_account`

## Sumber Kebenaran Saat Ini

### Admin Team Accounts

- route utama: `/admin/team-accounts`
- page: `app/admin/(protected)/team-accounts/page.tsx`
- actions: `app/admin/(protected)/team-accounts/actions.ts`

### Finance Team Accounts

- route utama: `/finance/team-accounts`
- page: `app/finance/(protected)/team-accounts/page.tsx`
- actions: `app/finance/(protected)/team-accounts/finance-actions.ts`

### Shared Helpers

- helper bersama account management: `lib/internal-account-management.ts`
- helper email dan username internal: `lib/internal-auth.ts`
- helper role guard: `lib/internal-roles.ts`
- helper audit log: `lib/admin-audit.ts`

## Compatibility Layer

Route lama `/finance/admin-users` tetap dipertahankan sebagai redirect ke `/finance/team-accounts` agar link lama tidak putus.

File redirect:

- `app/finance/(protected)/admin-users/page.tsx`

Folder legacy ini tidak lagi menjadi sumber kebenaran business logic.

## Audit Log

### Jenis target

- `merchant`
- `package`
- `booking`
- `internal_account`

### Aksi account management yang saat ini dicatat

- `create_account`
- `reset_password`
- `delete_account`

### Policy database

Policy `select` dan `insert` pada `admin_action_logs` sudah diselaraskan untuk actor internal yang sah:

- `admin`
- `operations_manager`
- `finance`
- `finance_manager`
- `superadmin`

## Saat Menambah Role Baru

Saat role internal baru diperkenalkan, periksa minimal area berikut:

- `lib/internal-roles.ts`
- routing portal dan middleware
- page dan action account management
- audit log target dan action
- migration RLS atau policy database terkait
- `docs/role-matrix.md`
- `docs/role-matrix-checklist.md`

## Prinsip Desain

- domain operasional dan domain finance dipisah di level action
- helper bersama tetap kecil dan netral terhadap domain
- route legacy boleh dipakai sementara hanya sebagai redirect, bukan lokasi logic utama

Dokumen ini harus diperbarui bila lifecycle akun internal berubah secara struktural.
