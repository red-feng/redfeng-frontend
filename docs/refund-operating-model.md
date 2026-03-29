# Refund Operating Model

Dokumen ini menjadi acuan operasional refund Red Feng dengan kombinasi `Midtrans` sebagai payment gateway dan `Kopra Bank Mandiri` untuk refund manual ke rekening customer.

## Tujuan

- memastikan refund diproses sampai dana benar-benar kembali ke customer
- memisahkan jalur refund `Midtrans` vs `Kopra manual`
- menyiapkan audit trail dan status operasional yang konsisten

## Prinsip Kanal Refund

- Jika transaksi masih bisa `cancel/void`, jangan pakai refund.
- Jika metode pembayaran didukung Midtrans refund dan transaksi sudah `settlement`, utamakan `Midtrans refund`.
- Jika metode tidak didukung atau refund harus dikirim manual ke rekening customer, gunakan `Kopra manual`.

## Status Refund

Gunakan lifecycle berikut:

- `refund_requested`
- `refund_under_review`
- `refund_approved`
- `refund_rejected`
- `refund_processing_midtrans`
- `refund_processing_bank`
- `refund_paid`
- `refund_failed`
- `refund_reconciled`
- `refund_closed`

## RACI

- `Customer Service`
  menerima permintaan refund, menjelaskan policy, dan mengumpulkan data customer
- `Operations`
  memvalidasi alasan refund dan eligibility
- `Finance`
  menyetujui nominal akhir dan mengeksekusi refund
- `System`
  menyimpan status, event log, dan bukti transaksi

## SOP Refund End-to-End

1. Customer mengajukan refund.
2. CS membuat tiket refund.
3. System memeriksa status transaksi Midtrans.
4. Operations menilai alasan dan policy refund.
5. Finance menyetujui nominal refund dan memilih channel refund.
6. Refund dieksekusi melalui Midtrans atau Kopra.
7. Bukti refund disimpan.
8. Customer diberi notifikasi.
9. Finance melakukan rekonsiliasi.
10. Tiket refund ditutup.

## Aturan Pengambilan Keputusan

### Jalur Midtrans

Gunakan Midtrans jika:

- transaksi berada di status `settlement`
- metode pembayaran refundable di Midtrans
- payable amount tersedia

Kolom yang wajib terisi:

- `midtrans_transaction_id`
- `midtrans_refund_id`
- `refund_channel = 'midtrans'`

Status utama:

- `refund_processing_midtrans`
- `refund_paid`
- `refund_failed`

### Jalur Kopra Manual

Gunakan Kopra jika:

- metode pembayaran tidak refundable via Midtrans
- refund dilakukan ke rekening bank customer
- finance memutuskan refund manual

Kolom yang wajib terisi:

- `bank_name`
- `bank_account_number`
- `bank_account_holder`
- `kopra_reference_no`
- `refund_channel = 'kopra_manual'`

Status utama:

- `refund_processing_bank`
- `refund_paid`
- `refund_failed`

## Policy Nominal Refund

### Merchant fault

- refund 100 persen
- biaya non-refundable ditanggung merchant

### Customer cancellation

Refund dapat dikurangi:

- fee payment gateway yang tidak kembali
- biaya supplier non-refundable
- biaya transfer manual bila policy mengizinkan

## Bukti Wajib

### Midtrans

- order ID
- transaction ID
- refund ID
- amount
- timestamp
- response payload atau screenshot dashboard

### Kopra

- transfer reference number
- amount
- bank tujuan
- account holder
- timestamp
- bukti transfer

## Tabel Database

Migration `20260329_create_refund_requests_and_events.sql` menambah:

- `public.refund_requests`
- `public.refund_events`

serta memperluas `admin_action_logs.target_type` agar bisa mencatat `refund`.

## Mapping Operasional ke Database

### refund_requests

Menyimpan state utama refund:

- referensi booking, customer, merchant
- payment method dan payment channel
- channel refund
- nominal gross, deduction, net
- rekening tujuan refund manual
- status lifecycle
- actor yang meminta, mereview, menyetujui, dan mengeksekusi

### refund_events

Menyimpan histori event, misalnya:

- refund dibuat
- review selesai
- approval finance
- Midtrans refund submitted
- Kopra transfer submitted
- refund berhasil
- refund gagal
- rekonsiliasi selesai

## Event yang Disarankan

- `request_created`
- `review_completed`
- `approved`
- `rejected`
- `midtrans_refund_submitted`
- `midtrans_refund_confirmed`
- `kopra_transfer_submitted`
- `kopra_transfer_confirmed`
- `reconciliation_completed`
- `closed`

## Langkah Implementasi Berikutnya

1. Buat halaman finance/admin untuk daftar dan detail refund.
2. Tambahkan server actions untuk:
   - create refund request
   - approve or reject refund
   - record Midtrans execution
   - record Kopra execution
   - close refund
3. Hubungkan event ke `refund_events`.
4. Tambahkan audit log admin dengan `target_type = 'refund'`.

## Status Implementasi Saat Ini

- finance refund queue sudah tersedia di portal finance
- create refund request, approval flow, execution flow, sync gateway, dan close flow sudah tersedia
- event refund dan admin audit log sudah tersambung
- Midtrans terhubung langsung dari server action
- Kopra terhubung melalui endpoint HTTP yang bisa diarahkan ke integrasi Mandiri langsung atau bridge internal

## Konfigurasi API

- `MIDTRANS_SERVER_KEY`
  wajib untuk refund, cancel, dan status sync Midtrans
- `MIDTRANS_IS_PRODUCTION`
  opsional, default dianggap production kecuali diisi `false`
- `KOPRA_REFUND_API_URL`
  wajib jika ingin tombol `refund_processing_bank` mengeksekusi transfer bank otomatis
- `KOPRA_STATUS_API_URL`
  wajib jika ingin tombol `Sync gateway status` membaca hasil transfer bank otomatis
- `KOPRA_API_TOKEN`
  opsional bearer token untuk endpoint Kopra / bridge
- `KOPRA_API_KEY`
  opsional API key header untuk endpoint Kopra / bridge

Dokumen kontrak payload bridge:

- lihat `docs/kopra-refund-bridge-contract.md`
