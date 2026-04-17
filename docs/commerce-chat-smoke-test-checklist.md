# Commerce Chat Smoke Test Checklist

Checklist ini dipakai untuk validasi cepat end-to-end setelah migration `commerce_chat_*` aktif dan UI chat customer-merchant sudah terhubung.

Scope checklist ini mengikuti implementasi saat ini:

- thread `inquiry` customer -> merchant
- inbox customer di `/chat`
- inbox merchant di `/merchant/chat`
- titik masuk dari halaman paket
- unread badge merchant dan akses nav customer

Yang belum termasuk:

- booking-linked thread
- report/freeze workflow
- moderation lanjutan

## 1. Prasyarat Data

Siapkan minimal data berikut:

- 1 akun `customer` aktif
- 1 akun `merchant` aktif dengan `verification_status` valid dan onboarding selesai
- 1 `package` berstatus `approved` milik merchant tersebut

Sebelum mulai, pastikan:

- migration `2026041702_create_commerce_chat_tables.sql` sudah berjalan
- halaman package detail bisa dibuka
- merchant bisa login ke portal merchant

## 2. Smoke Test Customer Entry

### Case A. CTA chat muncul di halaman paket

1. Login sebagai customer.
2. Buka halaman detail paket approved.
3. Verifikasi tombol `Chat merchant` muncul:
   - di sidebar desktop
   - di sticky action mobile

Expected:

- tombol tidak hilang
- link mengarah ke `/chat?package_id=<package-id>`

### Case B. Customer membuka chat dari halaman paket

1. Dari halaman paket, klik `Chat merchant`.
2. Pastikan browser masuk ke `/chat?package_id=<package-id>`.

Expected:

- thread inquiry dibuat jika belum ada
- thread lama dipakai ulang jika sudah ada
- halaman chat tidak error
- header thread menampilkan merchant/package context

## 3. Smoke Test Thread Creation

### Case C. Inquiry thread hanya satu per customer + merchant + package

1. Sebagai customer, buka package A lalu klik `Chat merchant`.
2. Kembali ke halaman paket yang sama.
3. Klik `Chat merchant` lagi.

Expected:

- tidak membuat thread duplikat
- inbox tetap membuka thread yang sama
- di database hanya ada satu row inquiry untuk kombinasi:
  `customer_user_id + merchant_id + subject_package_id`

## 4. Smoke Test Customer Messaging

### Case D. Customer kirim pesan teks

1. Di `/chat`, kirim pesan teks sederhana.

Expected:

- pesan muncul di thread customer
- bubble tampil sebagai pesan milik sendiri
- `last_message_sender_role = 'customer'`
- `customer_last_read_at` ikut ter-update

### Case E. Customer kirim lampiran

1. Kirim pesan dengan file yang didukung, misalnya PNG atau PDF.

Expected:

- upload berhasil
- pesan/lampiran muncul di thread
- file image tampil preview
- file non-image tampil sebagai link lampiran

### Case F. Customer kirim pesan kosong

1. Coba submit tanpa teks dan tanpa lampiran.

Expected:

- request ditolak
- muncul error `Pesan atau lampiran wajib diisi.`

## 5. Smoke Test Merchant Inbox

### Case G. Merchant melihat thread baru

1. Login sebagai merchant pemilik paket.
2. Buka `/merchant/chat`.

Expected:

- thread customer muncul di inbox merchant
- urutan thread mengikuti aktivitas terbaru
- unread badge merchant bertambah jika last message dari customer

### Case H. Merchant membaca thread

1. Klik thread yang baru dibuat customer.

Expected:

- pesan customer terlihat
- unread badge untuk thread itu hilang setelah refresh/snapshot berikutnya
- `merchant_last_read_at` ter-update

### Case I. Merchant membalas customer

1. Kirim balasan dari `/merchant/chat`.

Expected:

- pesan merchant muncul di thread merchant
- customer melihat pesan itu di `/chat`
- thread naik ke urutan teratas di kedua portal
- `last_message_sender_role = 'merchant'`

## 6. Smoke Test Realtime / Polling

Karena client saat ini memakai kombinasi Supabase Realtime + polling fallback, uji di dua browser atau dua profile browser.

### Case J. Realtime atau fallback sinkron

1. Buka `/chat` sebagai customer.
2. Buka `/merchant/chat` sebagai merchant.
3. Kirim pesan bergantian dari masing-masing sisi.

Expected:

- pesan muncul otomatis atau maksimal beberapa detik kemudian
- status live tidak wajib selalu `Live`, tetapi data tetap harus sinkron
- bila realtime turun, polling fallback tetap mengangkat pesan baru

## 7. Smoke Test Navigation

### Case K. Customer bisa menemukan inbox lagi

1. Login sebagai customer.
2. Buka header customer.

Expected:

- item nav `Chat` muncul
- jika ada unread, badge count tampil

### Case L. Merchant bisa menemukan inbox lagi

1. Login sebagai merchant.
2. Lihat nav merchant.

Expected:

- item nav `Chat` muncul
- unread count mengikuti message customer baru
- badge ikut refresh saat ada perubahan thread/message

## 8. Security Smoke Test

### Case M. Internal role tidak bisa masuk commerce chat

1. Login sebagai role internal seperti `admin` atau `finance`.
2. Coba akses `/chat`.
3. Coba akses endpoint commerce chat langsung bila perlu.

Expected:

- halaman tidak memberi akses ke inbox commerce
- endpoint mengembalikan `403` untuk role internal

### Case N. Merchant lain tidak bisa membaca thread

1. Login sebagai merchant B yang bukan pemilik package/thread.
2. Buka `/merchant/chat`.

Expected:

- thread merchant A tidak muncul
- akses langsung ke `threadId` thread merchant A harus gagal

### Case O. Customer lain tidak bisa membaca thread

1. Login sebagai customer B.
2. Coba buka `/chat?room_id=<thread-customer-A>`.

Expected:

- thread tidak ditemukan atau tidak punya akses
- customer B tidak bisa melihat pesan customer A

## 9. Database Spot Check

Lakukan verifikasi cepat di Supabase SQL editor setelah beberapa pesan terkirim.

### `commerce_chat_threads`

Pastikan field berikut masuk akal:

- `thread_type = 'inquiry'`
- `subject_package_id` terisi
- `subject_booking_id` masih `null`
- `customer_user_id` benar
- `merchant_id` benar
- `merchant_user_id` benar
- `last_message_at` ter-update
- `last_message_sender_role` sesuai actor terakhir

### `commerce_chat_messages`

Pastikan:

- semua row punya `thread_id` valid
- `sender_role` sesuai actor
- `client_message_id` tidak menduplikasi pesan retry
- lampiran menyimpan URL/nama/MIME bila ada file

## 10. Known Limits Saat Ini

Hal berikut memang belum dianggap bug untuk scope sekarang:

- belum ada thread `booking`
- belum ada report/freeze UI
- belum ada unread badge live khusus customer header, saat ini memakai render server dari layout
- belum ada escalation ke merchant support/internal ops

## 11. Definition of Done Smoke Test

Commerce chat dianggap lolos smoke test bila:

1. Customer bisa memulai inquiry dari halaman paket.
2. Thread inquiry tidak duplikat untuk kombinasi customer-merchant-package yang sama.
3. Merchant menerima thread di `/merchant/chat`.
4. Pesan dua arah customer-merchant berhasil.
5. Unread badge merchant ikut berubah.
6. Customer dan merchant lain yang tidak berhak tidak bisa membaca thread.
7. Role internal tidak bisa memakai commerce chat.

