# Dashboard Visual Language

Dokumen ini menjadi acuan visual untuk grafik dan panel status di dashboard `operations_manager`, `finance_manager`, `superadmin`, `merchant`, dan `customer`.

Tujuannya:

- menjaga arti warna tetap konsisten di seluruh dashboard
- membantu owner dan manager membaca status tanpa menebak
- mencegah panel baru memakai warna yang bertentangan dengan makna lama

## Aturan Warna Inti

- `amber` = antrian awal, pending, atau tahap yang baru masuk queue
- `sky` = proses berjalan, review aktif, atau tahap tengah
- `emerald` = selesai, released, paid, atau outcome sukses
- `rose` = tertahan, rejected, blocked, mismatch, atau kondisi yang butuh perhatian

## Aturan Penerapan

### 1. Queue Operasional

- merchant pending = `amber`
- package review = `sky`
- ready for finance = `emerald`

Catatan:
- `ready for finance` diperlakukan sebagai outcome operasional yang selesai dari sisi admin, walaupun proses bisnis keseluruhan belum selesai.

### 2. Queue Finance

- payout pending = `amber`
- approved / processing = `sky`
- paid = `emerald`
- rejected = `rose`

### 3. Dana Customer

- dana tertahan = `rose`
- masuk finance review / siap ke finance = `sky`
- sudah paid out = `emerald`

Catatan:
- dana tertahan memakai `rose` karena secara pembacaan manajerial ia menandakan dana masih tertahan atau masih memiliki blocker.

### 4. Komposisi Pembayaran Customer

- DP = `amber`
- pelunasan = `sky`
- full payment = `emerald`

Catatan:
- warna di bagian ini tetap mengikuti progres pembayaran:
- DP = tahap awal
- pelunasan = tahap lanjutan
- full payment = kondisi pembayaran sudah lengkap

## Legend Wajib

Setiap panel grafik yang memakai warna status wajib menampilkan legend kecil di panel yang sama jika:

- panel memuat lebih dari 2 warna
- warna mewakili status bisnis, bukan sekadar dekorasi
- panel dibaca oleh owner atau manager lintas fungsi

Legend boleh dihilangkan hanya jika:

- label tiap bar sudah sangat eksplisit
- dan panel tersebut tidak dipakai untuk pembacaan cepat lintas role

## Larangan

Hindari:

- memakai `emerald` untuk status yang masih tertahan
- memakai `rose` untuk status sukses
- memakai warna baru untuk status inti tanpa alasan kuat
- memberi arti berbeda untuk warna yang sama di halaman manager dan superadmin

## Prinsip Desain

- warna membantu membaca status, bukan menjadi satu-satunya sumber informasi
- angka dan label tetap harus terlihat jelas meskipun tanpa warna
- panel superadmin harus mengikuti bahasa visual manager agar mudah dibandingkan
- saat ragu, utamakan konsistensi lintas dashboard daripada variasi visual

## Cakupan

Standar ini berlaku untuk:

- dashboard internal: `operations_manager`, `finance_manager`, dan `superadmin`
- dashboard eksternal operasional: `merchant` dan `customer`

Jika ada alasan produk yang sangat kuat untuk menyimpang, penyimpangan itu harus dicatat secara eksplisit agar tidak menimbulkan dua arti warna untuk status yang mirip.

## Lokasi Implementasi Saat Ini

- `app/admin/(protected)/dashboard/page.tsx`
- `app/finance/(protected)/dashboard/page.tsx`
- `app/customer/dashboard/page.tsx`
- `app/merchant/(protected)/dashboard/page.tsx`
- `app/merchant/(protected)/pesanan/page.tsx`
- `app/merchant/(protected)/saldo-payout/page.tsx`

Dokumen ini perlu diperbarui jika ada dashboard baru, grafik baru, atau perubahan arti status utama di sistem.
