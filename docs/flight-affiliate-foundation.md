# Flight Affiliate Foundation

Status saat ini:
- UI katalog pesawat hanya menampilkan hasil supplier live.
- Fondasi type untuk model affiliate sudah disiapkan.
- Fallback dummy affiliate sudah dinonaktifkan agar customer tidak bisa checkout dari fare contoh.

File utama:
- `lib/flights/affiliateTypes.ts`
- `lib/flights/flightCatalogService.ts`
- `lib/flights/dharmawisataAffiliateFlightProvider.ts`

Tujuan:
- Menjaga UI tetap stabil saat supplier live kosong tanpa menampilkan inventory contoh.
- Menyiapkan shape data internal yang lebih dekat ke partner OTA affiliate.
- Mengurangi coupling langsung antara komponen katalog dan format response provider.

Urutan migrasi yang disarankan:
1. Render hasil hanya dari provider live.
2. Jika provider kosong/error, tampilkan empty state tanpa checkout.
3. Tambahkan adapter provider sandbox dari partner affiliate bila diperlukan.
4. Pastikan `reprice` dan `booking` hanya menerima supplier metadata live.

Catatan bisnis affiliate:
- Harga dan seat availability harus dianggap indikatif sampai tahap recheck.
- RedFeng tetap menjadi pemilik UX, sementara fulfillment berasal dari partner.
- Contract internal sebaiknya tetap provider-agnostic walau partner awal hanya satu.
