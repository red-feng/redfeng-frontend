# Flight Google Auth and Calendar Strategy

Prinsip yang dipakai untuk produk pesawat RedFeng:

- `Login dengan Google` dipakai untuk autentikasi customer.
- `Date picker` pencarian tiket tetap buatan aplikasi RedFeng.
- `Google Calendar` dipakai sebagai fitur tambahan setelah booking berhasil.

## Kenapa dipisah

- Search dan pemilihan tanggal adalah bagian dari booking UX RedFeng.
- Harga, availability, dan rule penerbangan berasal dari sistem internal RedFeng + partner affiliate OTA.
- Google Calendar bukan sumber data penerbangan, jadi tidak cocok menjadi date picker utama.
- Integrasi kalender pasca-booking tetap berguna untuk membantu customer menyimpan itinerary.

## Status repo saat ini

- Customer Google OAuth sudah tersedia lewat `CustomerAuthPanel`.
- Flight search hero dan recommendation calendar tetap dikelola internal.
- Fondasi helper untuk `Add to Google Calendar` disiapkan di:
  - `lib/flights/postBookingCalendar.ts`

## Pola implementasi yang disarankan

1. User login atau register, termasuk opsi `Lanjutkan dengan Google`.
2. User mencari tiket dengan kalender internal RedFeng.
3. User memilih flight affiliate dan lanjut ke booking flow.
4. Setelah booking sukses atau ticket issued, tampilkan CTA:
   - `Tambahkan ke Google Calendar`
5. CTA membentuk tautan Google Calendar dari data booking final.

## Data minimum untuk CTA kalender

- `bookingCode`
- `providerLabel`
- `passengers`
- `segments[]`
- `departAtIso`
- `arriveAtIso`
- `originCode`, `originLabel`
- `destinationCode`, `destinationLabel`
- `airlineName`
- `flightNumber` bila tersedia

## Catatan affiliate

- Tautan kalender sebaiknya dibuat dari booking yang sudah final, bukan dari hasil search.
- Jika ada perubahan jadwal setelah ticket issued, update CTA dari data booking terbaru.
- Jika partner OTA mengirim perubahan async, halaman detail booking RedFeng tetap menjadi source of truth bagi customer.
