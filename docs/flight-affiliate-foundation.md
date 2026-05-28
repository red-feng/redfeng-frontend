# Flight Affiliate Foundation

Status saat ini:
- UI katalog pesawat tetap memakai data dummy.
- Fondasi type untuk model affiliate sudah disiapkan.
- Mock provider affiliate tetap membaca dummy catalog internal.

File utama:
- `lib/flights/affiliateTypes.ts`
- `lib/flights/dummyFlightCatalog.ts`
- `lib/flights/dummyAffiliateFlightProvider.ts`

Tujuan:
- Menjaga UI tetap stabil saat source data masih dummy.
- Menyiapkan shape data internal yang lebih dekat ke partner OTA affiliate.
- Mengurangi coupling langsung antara komponen katalog dan format response provider.

Urutan migrasi yang disarankan:
1. Tetap render UI dari dummy data seperti sekarang.
2. Mulai pakai `dummyAffiliateFlightProvider` di layer service.
3. Tambahkan adapter provider sandbox dari partner affiliate.
4. Ganti source `searchFlights()` dari dummy ke sandbox tanpa ubah komponen UI.
5. Tambahkan `reprice` dan `booking` flow setelah search stabil.

Catatan bisnis affiliate:
- Harga dan seat availability harus dianggap indikatif sampai tahap recheck.
- RedFeng tetap menjadi pemilik UX, sementara fulfillment berasal dari partner.
- Contract internal sebaiknya tetap provider-agnostic walau partner awal hanya satu.
