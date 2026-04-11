# Checklist Regresi Portal Internal

Dokumen ini dipakai untuk menjaga dua area yang paling mudah regress saat auth, layout, atau dashboard diedit:

- kunci role login per portal
- perilaku badge per role dan per jenis antrean

Dokumen ini melengkapi:

- [role-matrix.md](./role-matrix.md)
- [role-matrix-checklist.md](./role-matrix-checklist.md)

## Source Of Truth

Sebelum mengubah halaman login atau layout portal, cek file berikut lebih dulu:

- `lib/internal-roles.ts`
  Fungsi utama:
  - `normalizeRole`
  - `canAccessInternalPortal`
  - `getInternalPortalHomePath`
- `lib/nav-badge-policy.ts`
  Konstanta utama:
  - `ADMIN_ACTIVE_BOOKING_BADGE_STATUSES`
  - `ADMIN_ACTIVE_PACKAGE_BADGE_STATUSES`
  - `FINANCE_ACTIVE_REFUND_BADGE_STATUSES`
  - `FINANCE_ACTIVE_PAYOUT_BADGE_STATUSES`
  - `MERCHANT_ACTIVE_PAYOUT_ESCROW_STATUSES`
  - `MERCHANT_REVIEWED_PACKAGE_BADGE_STATUSES`

Jika aturan role atau badge berubah, ubah helper ini dulu. Jangan mulai dari komponen UI.

## 1. Checklist Role Login

### Admin Portal

- [ ] Login admin hanya menerima `admin` dan `operations_manager`
- [ ] Login admin menolak `superadmin` dengan pesan khusus
- [ ] Login admin menolak `merchant`, `customer`, `finance`, dan `finance_manager`
- [ ] Redirect sukses login admin selalu menuju `/admin/dashboard`

File utama:

- `app/admin/login/AdminLoginClient.tsx`
- `app/admin/(protected)/layout.tsx`

### Finance Portal

- [ ] Login finance hanya menerima `finance` dan `finance_manager`
- [ ] Login finance menolak `superadmin` dengan pesan khusus
- [ ] Login finance menolak `admin`, `operations_manager`, `merchant`, dan `customer`
- [ ] Redirect sukses login finance selalu menuju `/finance/dashboard`

File utama:

- `app/finance/login/FinanceLoginClient.tsx`
- `app/finance/(protected)/layout.tsx`

### Superadmin Portal

- [ ] Login superadmin hanya menerima `superadmin`
- [ ] Login superadmin menolak semua role lain
- [ ] Redirect sukses login superadmin selalu menuju `/superadmin/dashboard`

File utama:

- `app/superadmin/login/SuperadminLoginClient.tsx`
- `app/superadmin/(protected)/layout.tsx`

### Customer dan Merchant Portal

- [ ] Customer tidak boleh nyasar ke portal internal
- [ ] Merchant tidak boleh nyasar ke portal internal
- [ ] Session role yang berubah harus dilempar kembali ke portal yang benar

File utama:

- `app/customer/layout.tsx`
- `app/merchant/(protected)/layout.tsx`
- `lib/portal-session.ts`

## 2. Checklist Badge

### Badge Queue Yang Harus Persisten

Badge ini tidak boleh hilang hanya karena halaman dibuka.
Badge baru hilang saat item keluar dari antrean aktif.

#### Admin

- [ ] `Merchant Directory` = jumlah merchant `pending`
- [ ] `Merchant Directory` secondary badge = jumlah request hapus merchant `pending`
- [ ] `Package Review` = jumlah package `pending`
- [ ] `Booking Center` = jumlah booking `awaiting_admin_handoff` atau `finance_review`

File utama:

- `app/admin/(protected)/layout.tsx`

#### Finance

- [ ] `Refund Queue` = jumlah refund aktif sesuai policy
- [ ] `Payout Queue` = jumlah payout aktif sesuai policy

File utama:

- `app/finance/(protected)/layout.tsx`

#### Superadmin

- [ ] `Booking Center` = jumlah booking aktif sesuai queue admin handoff dan finance review

File utama:

- `app/superadmin/(protected)/layout.tsx`

### Badge Yang Tetap Unread/Seen Based

Badge ini memang boleh turun setelah dibuka atau dibaca.

- [ ] chat customer tetap unread-based
- [ ] chat merchant tetap unread-based
- [ ] audit atau account activity superadmin tetap seen/activity-based
- [ ] badge merchant untuk package review result tetap seen-based

File utama:

- `app/customer/layout.tsx`
- `app/merchant/(protected)/layout.tsx`
- `app/superadmin/(protected)/layout.tsx`

## 3. Smoke Test Manual

Lakukan smoke test ini setelah edit auth, nav, dashboard, atau layout:

1. Login sebagai `admin` lalu pastikan masuk ke `/admin/dashboard`
2. Login sebagai `operations_manager` dari portal admin lalu pastikan tetap masuk ke `/admin/dashboard`
3. Login sebagai `finance` lalu pastikan masuk ke `/finance/dashboard`
4. Login sebagai `finance_manager` lalu pastikan masuk ke `/finance/dashboard`
5. Login sebagai `superadmin` lalu pastikan masuk ke `/superadmin/dashboard`
6. Coba akun dengan role salah pada tiap portal lalu pastikan ditolak
7. Buka halaman badge queue admin, pindah halaman lain, lalu pastikan badge queue tidak hilang bila status item masih aktif
8. Buka halaman badge unread chat, tandai terbaca, lalu pastikan badge turun sesuai unread state

## 4. Verifikasi Teknis Minimum

Jalankan ini setiap selesai mengubah role portal atau badge:

```bash
npx eslint 'lib/internal-roles.ts' 'lib/nav-badge-policy.ts' 'app/admin/login/AdminLoginClient.tsx' 'app/finance/login/FinanceLoginClient.tsx' 'app/superadmin/login/SuperadminLoginClient.tsx' 'app/admin/(protected)/layout.tsx' 'app/finance/(protected)/layout.tsx' 'app/superadmin/(protected)/layout.tsx' 'app/merchant/(protected)/layout.tsx' 'app/customer/layout.tsx'
npx tsc --noEmit --pretty false
```

Jika perubahan menyentuh auth flow lebih luas, lanjutkan juga dengan:

```bash
npm run verify:release
```

## 5. Guardrail Review

Saat review PR, tolak perubahan jika:

- logic role portal dipindah ke komponen UI tanpa update helper pusat
- status badge queue di-hardcode ulang di banyak file
- badge queue aktif berubah menjadi seen-based tanpa keputusan produk yang jelas
- badge unread/chat berubah menjadi persisten queue tanpa alasan bisnis yang jelas
- redirect sukses login tidak lagi memakai home path portal yang benar

## 6. Update Wajib Saat Menambah Role Baru

Kalau nanti role internal baru diperkenalkan:

- [ ] tambahkan ke `lib/internal-roles.ts`
- [ ] tentukan boleh masuk portal mana
- [ ] tentukan home path portalnya
- [ ] audit login screen yang terdampak
- [ ] audit protected layout yang terdampak
- [ ] audit badge yang terkait queue role tersebut
- [ ] perbarui `docs/role-matrix.md`
- [ ] perbarui dokumen checklist ini
