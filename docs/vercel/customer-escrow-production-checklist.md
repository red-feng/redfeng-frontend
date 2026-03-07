# Customer Escrow Production Checklist

## 1. Login Guard Checkout
- Buka paket lalu masuk ke halaman checkout.
- Dalam kondisi belum login, klik tombol booking.
- Pastikan user diarahkan ke `/login?next=/checkout/{slug}`.
- Login sebagai customer.
- Pastikan user kembali ke halaman checkout yang sama.

## 2. Booking Ownership
- Login sebagai Customer A.
- Buat booking baru.
- Salin URL `/booking/{id}`.
- Logout lalu login sebagai Customer B.
- Buka URL booking milik Customer A.
- Pastikan halaman menolak akses dan booking tidak bisa dilihat.

## 3. Payment Flow
- Login sebagai customer pemilik booking.
- Buat payment dari booking tersebut.
- Selesaikan pembayaran di Midtrans sandbox/production sesuai environment.
- Verifikasi setelah webhook masuk:
  - Full payment: `payment_status = paid`, `escrow_status = held`
  - DP payment: `payment_status = dp_paid`, `escrow_status = partial_hold`

## 4. Merchant Pickup Flow
- Login sebagai merchant pemilik paket.
- Buka `Merchant > Pesanan`.
- Pastikan tombol `Tiba` hanya aktif untuk booking yang sudah lunas.
- Klik `Tiba`.
- Pastikan progress berubah ke `merchant_arrived`.
- Klik `Dijemput`.
- Pastikan progress berubah ke `pickup_confirm_merchant`.

## 5. Customer Pickup Confirmation
- Login kembali sebagai customer pemilik booking.
- Buka detail booking.
- Pastikan tombol `Sudah dijemput` hanya muncul setelah merchant klik `Dijemput`.
- Klik `Sudah dijemput`.
- Verifikasi:
  - `booking_status = pickup_confirmed`
  - `escrow_status = ready_for_payout`

## 6. Merchant Balance and Payout
- Login sebagai merchant.
- Buka `Saldo & Payout`.
- Pastikan booking yang belum selesai pickup tetap ada di `Dana masih ditahan`.
- Pastikan booking yang sudah `ready_for_payout` pindah ke `Booking siap payout`.
- Ajukan payout.
- Pastikan request masuk ke `Riwayat pencairan` dengan status `pending`.

## 7. Customer Dashboard
- Login sebagai customer.
- Buka `/customer/dashboard`.
- Pastikan tampil:
  - total booking
  - trip mendatang
  - menunggu aksi customer
  - dana diproses RedFeng
- Pastikan tiap kartu booking punya link ke detail booking.

## 8. Regression Checks
- Merchant login tetap diarahkan ke `/merchant/dashboard`.
- Admin login tetap diarahkan ke `/admin/dashboard`.
- Customer login tanpa profile row tetap bisa masuk ke `/customer/dashboard`.
- Build Vercel harus lolos tanpa TypeScript error.
