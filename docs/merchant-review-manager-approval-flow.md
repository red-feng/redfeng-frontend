# Blueprint Merchant Review Dengan Approval Manager

Dokumen ini menyesuaikan flow yang diinginkan dengan struktur codebase Red Feng saat ini.

Tujuan flow:

- merchant registrasi lalu submit onboarding
- admin melakukan review awal
- admin mengajukan keputusan ke operations manager
- operations manager memberi keputusan final `approve` atau `reject`
- jika reject, manager wajib menulis alasan
- alasan dikirim ke merchant dan terlihat oleh admin
- jika merchant tidak memperbaiki data dalam 7 hari, data merchant dihapus permanen termasuk akun auth Supabase

## 1. Kondisi Codebase Saat Ini

Saat ini flow merchant masih seperti ini:

- merchant submit onboarding
- `merchants.verification_status` menjadi `pending`
- admin dapat `approve` langsung
- admin dapat `reject` langsung
- merchant yang `rejected` bisa klik resubmit dan kembali ke `draft`

File utama saat ini:

- `app/merchant/onboarding/steps/DocumentsStep.tsx`
- `app/admin/(protected)/merchants/actions.ts`
- `app/admin/(protected)/merchants/page.tsx`
- `app/merchant/rejected/page.tsx`
- `app/merchant/rejected/actions.ts`

Catatan penting:

- pola `admin request -> operations manager approve/reject` sebenarnya sudah ada untuk `merchant_deletion_requests`
- jadi onboarding merchant sebaiknya mengikuti pola tabel request review yang mirip, bukan menumpuk semua state ke `merchants` saja

## 2. Flow Yang Direkomendasikan

Flow akhir yang saya rekomendasikan:

1. Merchant submit onboarding
2. Status merchant menjadi `pending_admin_review`
3. Admin memeriksa data
4. Admin klik salah satu:
   - `Ajukan approve ke manager`
   - `Ajukan reject ke manager`
5. Sebuah request review dibuat untuk manager
6. Operations manager membuka queue review dan memberi keputusan final:
   - `approve`
   - `reject`
7. Jika manager `reject`:
   - manager wajib isi alasan
   - merchant status menjadi `revision_requested`
   - deadline revisi diset `now + 7 days`
   - email dikirim ke merchant
   - alasan tampil juga ke admin
8. Jika merchant memperbaiki sebelum deadline:
   - merchant submit ulang
   - status kembali ke `pending_admin_review`
   - request lama ditutup
9. Jika lewat 7 hari tidak ada revisi:
   - status menjadi `expired`
   - sistem hapus data merchant dan auth user
   - merchant harus daftar dari awal

## 3. Status Yang Disarankan

### Status di tabel `merchants`

Saya sarankan `verification_status` dipakai untuk status bisnis utama:

- `draft`
- `pending_admin_review`
- `awaiting_manager_approval`
- `awaiting_manager_rejection`
- `revision_requested`
- `approved`
- `inactive`
- `deleted`
- `expired`

Catatan:

- `rejected` sebaiknya diganti menjadi `revision_requested`
- alasan: merchant masih punya kesempatan revisi 7 hari, jadi belum benar-benar final reject

### Status di tabel request review baru

Tambahkan tabel baru untuk request keputusan manager, misalnya:

- `merchant_review_requests`

Status yang disarankan:

- `pending`
- `approved`
- `rejected`
- `cancelled`
- `superseded`
- `expired`

## 4. Tabel Baru Yang Disarankan

### `merchant_review_requests`

Tabel ini menjadi jejak keputusan antara admin dan manager.

Kolom yang saya sarankan:

- `id uuid primary key default gen_random_uuid()`
- `merchant_id uuid not null references public.merchants(id) on delete cascade`
- `request_type text not null`
  Nilai:
  - `approve`
  - `reject`
- `status text not null default 'pending'`
  Nilai:
  - `pending`
  - `approved`
  - `rejected`
  - `cancelled`
  - `superseded`
  - `expired`
- `admin_note text`
- `manager_reason text`
- `requested_by uuid references auth.users(id) on delete set null`
- `reviewed_by uuid references auth.users(id) on delete set null`
- `requested_at timestamptz not null default timezone('utc', now())`
- `reviewed_at timestamptz`
- `expires_at timestamptz`
- `created_at timestamptz not null default timezone('utc', now())`
- `updated_at timestamptz not null default timezone('utc', now())`

Index yang disarankan:

- `(merchant_id, requested_at desc)`
- `(status, requested_at desc)`
- unique partial index untuk request `pending` per merchant

## 5. Kolom Tambahan di `merchants`

Supaya halaman merchant, admin, dan job cleanup bisa bekerja rapi, saya sarankan tambah kolom ini:

- `submitted_at timestamptz`
- `admin_reviewed_at timestamptz`
- `admin_reviewed_by uuid references auth.users(id) on delete set null`
- `manager_review_requested_at timestamptz`
- `manager_review_request_id uuid references public.merchant_review_requests(id) on delete set null`
- `manager_decision text`
  Nilai:
  - `approved`
  - `rejected`
- `manager_decided_at timestamptz`
- `manager_decided_by uuid references auth.users(id) on delete set null`
- `manager_rejection_reason text`
- `revision_requested_at timestamptz`
- `revision_deadline_at timestamptz`
- `last_resubmitted_at timestamptz`
- `expired_at timestamptz`
- `purge_scheduled_at timestamptz`
- `purged_at timestamptz`

Catatan:

- `rejection_reason` lama bisa dimigrasikan menjadi `manager_rejection_reason`
- kalau ingin minim perubahan UI awal, kolom lama `rejection_reason` bisa tetap dipertahankan sementara sebagai mirror dari `manager_rejection_reason`

## 6. Aturan Role Yang Disarankan

### Merchant

- boleh submit onboarding
- boleh resubmit jika status `revision_requested`
- tidak boleh bypass deadline revisi setelah `expired`

### Admin

- boleh review awal merchant
- boleh menambahkan catatan untuk manager
- boleh mengajukan request approve atau reject ke manager
- tidak boleh memberi keputusan final approve atau reject

### Operations Manager

- boleh approve final
- boleh reject final
- wajib isi `manager_reason` jika reject

### Superadmin

- boleh override approve atau reject bila diperlukan
- tetap tercatat di audit log sebagai actor final

## 7. Email Yang Disarankan

### Saat manager approve

Kirim ke merchant:

- status approved
- merchant bisa login ke dashboard

### Saat manager reject

Kirim ke merchant:

- alasan manager
- deadline revisi 7 hari
- peringatan bahwa data akan dihapus permanen jika tidak direvisi

Kirim atau tampilkan juga ke admin:

- merchant mana yang ditolak
- alasan manager
- deadline revisi

### Saat merchant expired dan dipurge

Opsional tapi disarankan kirim email terakhir ke merchant:

- data dihapus karena tidak ada revisi dalam 7 hari
- merchant harus registrasi ulang dari awal

## 8. Cleanup Otomatis 7 Hari

### Aturan bisnis

Jika:

- `verification_status = 'revision_requested'`
- `revision_deadline_at < now()`
- belum ada resubmit

Maka:

1. ubah status menjadi `expired`
2. hapus seluruh data merchant
3. hapus profile merchant
4. hapus auth user merchant
5. catat audit log

### Data yang harus dihapus

Gunakan pola yang sudah ada di `purgeMerchantAccountRecords()`:

- packages terkait
- refund requests terkait merchant
- row `merchants`
- row `profiles`
- auth user Supabase

Tambahan yang perlu ikut dibersihkan:

- `merchant_review_requests`
- file dokumen storage jika ingin full cleanup

### Eksekusi job

Pilihan yang paling cocok:

- Supabase scheduled function / cron
- atau route handler internal yang dipanggil scheduler

Nama job yang disarankan:

- `purge_expired_merchant_revisions`

## 9. Audit Log Yang Disarankan

Tambahkan event ini ke `admin_action_logs`:

- `submit_for_manager_approval`
- `submit_for_manager_rejection`
- `manager_approve_merchant`
- `manager_reject_merchant`
- `merchant_resubmit_after_revision`
- `merchant_revision_expired`
- `purge_expired_merchant`

Metadata yang penting:

- `merchantId`
- `requestId`
- `adminNote`
- `managerReason`
- `revisionDeadlineAt`
- `purgedBy`
  Nilai:
  - `system`
  - `superadmin`
  - `operations_manager`

## 10. Mapping Implementasi ke File Saat Ini

### UI dan action merchant submit

File:

- `app/merchant/onboarding/steps/DocumentsStep.tsx`

Perubahan:

- saat submit, status jangan langsung `pending`
- ubah menjadi `pending_admin_review`
- isi `submitted_at`

### UI merchant revisi

File:

- `app/merchant/rejected/page.tsx`
- `app/merchant/rejected/actions.ts`

Perubahan:

- halaman ini sebaiknya diganti konsepnya menjadi `revision requested`
- tampilkan:
  - alasan manager
  - deadline revisi
  - sisa hari
- saat resubmit:
  - status kembali `pending_admin_review`
  - reset kolom revision deadline
  - tutup request manager lama sebagai `superseded`

### UI dan action admin merchant review

File:

- `app/admin/(protected)/merchants/page.tsx`
- `app/admin/(protected)/merchants/actions.ts`

Perubahan:

- tombol `Approve merchant` langsung dihapus dari admin
- tombol `Reject merchant` langsung dihapus dari admin
- ganti jadi:
  - `Ajukan approve ke manager`
  - `Ajukan reject ke manager`
- admin dapat isi catatan untuk manager

### Queue manager

Tempat paling cocok:

- tetap di `app/admin/(protected)/merchants/page.tsx` dengan mode berbeda untuk `operations_manager`
- atau buat panel khusus di halaman yang sama seperti deletion review queue

Perubahan:

- manager melihat queue `merchant_review_requests`
- manager klik approve/reject
- jika reject, textarea alasan wajib

### Cleanup dan purge

File kandidat:

- `app/admin/(protected)/merchants/actions.ts`
- helper baru di `lib/merchant-review-lifecycle.ts`
- scheduler function baru

Saran:

- pindahkan logika purge merchant ke helper yang reusable
- gunakan helper yang sama untuk:
  - delete request approval
  - expiry cleanup 7 hari

## 11. Implementasi Bertahap Yang Paling Aman

Saya sarankan implementasi dibagi 4 tahap:

### Tahap 1

- tambah tabel `merchant_review_requests`
- tambah kolom baru di `merchants`
- belum ubah UI besar

### Tahap 2

- ubah admin merchant review:
  - admin hanya mengajukan ke manager
  - manager memutuskan final

### Tahap 3

- ubah halaman merchant `rejected` menjadi `revision requested`
- tampilkan deadline 7 hari
- email manager rejection aktif

### Tahap 4

- tambah job otomatis purge expired merchant
- hapus data Supabase secara permanen
- tambah audit log cleanup

## 12. Rekomendasi Akhir

Menurut saya flow yang Anda mau sangat masuk akal dan cocok dengan role matrix yang lebih sehat.

Versi yang paling tepat untuk codebase ini adalah:

- admin menjadi reviewer awal dan pengaju keputusan
- operations manager menjadi decision maker final
- reject manager menjadi `revision requested`, bukan langsung reject permanen
- 7 hari tanpa revisi berarti `expired` lalu dipurge otomatis

Dengan pola ini:

- audit trail lebih jelas
- tanggung jawab role lebih rapi
- merchant dapat alasan yang resmi dari manager
- cleanup data bisa otomatis tanpa menyisakan akun yatim
