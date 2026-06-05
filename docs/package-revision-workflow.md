# Package Revision Workflow

## Goal

Pisahkan paket `live` yang sedang tayang dari revisi merchant yang masih menunggu review admin.

Target akhirnya:

- `packages` menyimpan versi live yang aktif dipakai customer.
- `package_revisions` menyimpan perubahan merchant sebelum disetujui admin.
- Admin mereview revisi, bukan langsung mengubah record live.

## Why

Flow saat ini memakai record `packages` yang sama untuk:

- paket live
- edit merchant
- antrian pending review

Risikonya:

- paket live kehilangan status aktif saat merchant mulai edit
- admin tidak punya diff yang jelas antara versi lama dan revisi
- paket live dan paket pending bercampur dalam data yang sama

## New Table

Migration dasar ada di:

- [2026060501_create_package_revisions.sql](/abs/path/c:/Users/UsEr/redfeng-frontend/supabase/migrations/2026060501_create_package_revisions.sql:1)

Field penting:

- `package_id`
- `merchant_id`
- `status`
- `payload`
- `live_snapshot`
- `changed_fields`
- `submitted_by`
- `reviewed_by`
- `submitted_at`
- `reviewed_at`
- `rejection_reason`
- `approved_at`
- `base_package_updated_at`

## Recommended Status Model

- `packages.status`
  - tetap mewakili status live package: `approved`, `inactive`, atau status publik lain
- `package_revisions.status`
  - `draft`
  - `pending`
  - `approved`
  - `rejected`
  - `superseded`
  - `cancelled`

## Recommended Flow

1. Merchant membuka paket `approved`.
2. Sistem cek apakah paket sudah punya revision `draft` atau `pending`.
3. Jika belum ada, sistem membuat 1 revision baru:
   - `live_snapshot` berisi snapshot paket live saat edit dimulai
   - `payload` berisi salinan awal data live
   - `status = draft`
4. Merchant mengedit revision itu, bukan tabel `packages` langsung.
5. Saat merchant submit review:
   - `package_revisions.status = pending`
   - `submitted_at` diisi
6. Admin review revision.
7. Jika admin reject:
   - `package_revisions.status = rejected`
   - `rejection_reason` diisi
   - paket live tetap tidak berubah
8. Jika admin approve:
   - data di `payload` diterapkan ke `packages` live
   - `package_revisions.status = approved`
   - `approved_at` dan `reviewed_at` diisi

## What Goes Into `payload`

Disarankan `payload` berisi snapshot terstruktur dari semua area yang hari ini diedit merchant:

- basic package fields
- translations
- package details
- package facilities
- package tags
- itinerary days
- itinerary routes
- gallery image references

Minimal shape:

```json
{
  "package": {},
  "translations": [],
  "details": {},
  "facilities": [],
  "tags": [],
  "itinerary": [],
  "images": []
}
```

## Admin Review UX Direction

Admin detail page sebaiknya menampilkan:

- snapshot live saat ini
- snapshot revisi merchant
- daftar field yang berubah
- warning/blocker seperti validasi geo

Diff prioritas tinggi:

- title
- travel style
- departure date
- prices
- destination
- meeting point
- geo fields
- facilities
- itinerary

## Suggested Implementation Order

1. Buat helper untuk membangun snapshot `payload`.
2. Saat merchant edit paket approved, tulis ke `package_revisions`.
3. Ubah halaman admin queue supaya membaca revision `pending`, bukan `packages.status = pending`.
4. Tambahkan action apply revision ke live package saat approve.
5. Setelah flow baru stabil, kurangi ketergantungan pada pola `approved -> draft -> pending`.
