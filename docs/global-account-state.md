# Global Account State Standard

## Tujuan

State yang memengaruhi makna data, badge, unread, atau keputusan operasional harus disimpan global per akun, bukan per browser atau per device.

## Prinsip

- Gunakan database untuk state `seen`, `read`, `acknowledged`, dan badge operasional.
- Gunakan cookie atau local storage hanya untuk preferensi UI ringan.
- Jika state harus konsisten lintas laptop, browser, atau device, state itu wajib global.

## Yang Wajib Global

- Chat read state customer dan merchant
- Badge nav merchant
- Badge nav admin
- Badge nav finance
- Preferensi yang bersifat akun
- Notifikasi operasional yang perlu sinkron lintas device

## Yang Boleh Lokal

- Panel collapse atau expand
- Filter sementara
- Dismiss install prompt
- Session-only draft UI
- Active portal visual selama itu tidak memengaruhi makna data lintas akun

## Pola Implementasi

1. Tambah tabel `*_nav_seen_states`
2. Simpan `seen_*_at` per akun
3. Saat user membuka section, client memanggil endpoint `POST /api/.../nav-seen`
4. Layout server membaca `seen_*_at`
5. Badge dihitung dari timestamp data terbaru dibanding `seen_*_at`

## Implementasi Saat Ini

- Merchant:
  - `merchant_nav_seen_states`
  - `/api/merchant/nav-seen`
- Admin:
  - `admin_nav_seen_states`
  - `/api/admin/nav-seen`
- Finance:
  - `finance_nav_seen_states`
  - `/api/finance/nav-seen`
- Superadmin:
  - `superadmin_nav_seen_states`
  - `/api/superadmin/nav-seen`
- Chat:
  - `customer_last_read_at`
  - `merchant_last_read_at`
- Customer:
  - chat unread tetap global lewat `customer_last_read_at`
  - menu customer lain saat ini belum punya queue badge operasional non-chat, jadi belum perlu tabel `customer_nav_seen_states`

## Larangan

- Jangan membuat badge operasional penting hanya dengan cookie browser.
- Jangan membuat unread state penting hanya dengan local storage.
- Jangan mencampur state global dan lokal untuk indikator yang sama.

## Migrasi Bertahap

1. Merchant
2. Admin
3. Finance
4. Superadmin
5. Customer jika nanti ada task center/non-chat inbox
