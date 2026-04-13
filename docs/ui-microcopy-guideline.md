# Panduan Microcopy UI Internal

Dokumen ini jadi standar singkat untuk label tombol dan teks ringkas di portal internal (`admin`, `finance`, `superadmin`).

## 1. Prinsip Utama

- Label aksi utamakan 1 kata.
- Gunakan kata kerja langsung.
- Hindari label panjang yang mengulang konteks kartu.
- Konsisten antar modul agar operator tidak bingung saat pindah halaman.

Contoh:

- `Setujui`
- `Tolak`
- `Ajukan`
- `Batalkan`
- `Hapus`
- `Detail`
- `Aktifkan`
- `Nonaktifkan`
- `Reset`
- `Buat`

## 2. Aturan Tombol

- Tombol utama (CTA) pakai kata paling ringkas yang tetap jelas.
- Tombol sekunder tetap pendek, jangan lebih panjang dari 1-2 kata.
- Konteks detail dipindah ke:
  - judul kartu
  - deskripsi singkat
  - `confirmMessage` pada `ConfirmSubmitButton`

## 3. Aturan Label Non-Tombol

- Label section pakai frasa pendek:
  - `Queue booking`
  - `Direktori tim`
  - `Akun baru`
  - `Alur peran`
- Label field gunakan istilah paling umum:
  - `Username`
  - `Role`
  - `Password awal`

## 4. Mapping Label Lama ke Baru

- `Setujui paket`, `Setujui merchant`, `Setujui penghapusan` -> `Setujui`
- `Tolak paket`, `Tolak merchant`, `Tolak penghapusan` -> `Tolak`
- `Ajukan approve`, `Ajukan reject`, `Kirim approval request` -> `Ajukan`
- `Buka detail ...`, `Review detail ...` -> `Detail`
- `Hapus permanen ...` -> `Hapus`
- `Reset password` -> `Reset`
- `Buat akun ...` -> `Buat`

## 5. Checklist Sebelum Merge

- [ ] Tombol aksi utama sudah singkat (1 kata jika memungkinkan)
- [ ] Tidak ada duplikasi konteks di label tombol
- [ ] `confirmMessage` tetap menjelaskan dampak aksi
- [ ] Istilah konsisten di list, detail, dan modal
- [ ] Lulus `eslint` dan `tsc`

## 6. File Referensi

- `app/admin/(protected)/merchants/page.tsx`
- `app/admin/(protected)/packages/page.tsx`
- `app/admin/(protected)/bookings/page.tsx`
- `app/admin/(protected)/team-accounts/page.tsx`
- `app/superadmin/(protected)/superadmin-accounts/page.tsx`
