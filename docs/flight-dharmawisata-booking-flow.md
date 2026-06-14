# Flight Dharmawisata Booking Flow

Dokumen ini menurunkan skema Bus & Travel Booking ke produk Pesawat dengan guard tambahan yang wajib ada untuk flight.

## Prinsip

- Pesawat tidak boleh memakai flow `book -> pay -> issued` secara langsung.
- Fare harus direcheck sebelum customer diarahkan bayar.
- Supplier reference, PNR, journey reference, atau hold expiry harus disimpan bila tersedia.
- Ticketing/issue hanya berjalan setelah pembayaran customer valid.
- Jika issue gagal, booking masuk exception queue untuk refund/follow up manual.

## Lifecycle

1. `fare_recheck_required`
   - Customer/admin sudah punya pilihan flight, tapi fare belum divalidasi ulang.
2. `fare_rechecked`
   - Fare/journey reference sudah disimpan dari hasil supplier.
3. `booking_hold_created`
   - Booking/hold/reference awal dari supplier sudah tercatat.
4. `pending_payment`
   - Customer menunggu pembayaran bank transfer.
5. `payment_uploaded`
   - Bukti transfer diterima.
6. `payment_verified`
   - Admin menyatakan pembayaran valid.
7. `ticketing`
   - Admin/API sedang memproses issue tiket.
8. `issued`
   - Tiket berhasil issued dan siap dikirim ke customer.
9. `issue_failed`
   - Issue gagal; admin perlu follow up/refund/manual process.
10. `cancelled` atau `refund_required`
   - Booking dibatalkan atau perlu proses refund.

## Implementasi Saat Ini

- Form admin Pesawat mencatat booking awal ke:
  - `bookings`
  - `supplier_orders`
  - `flight_booking_details`
- Migration `2026061401_add_flight_booking_lifecycle.sql` menambahkan lifecycle flight:
  - `lifecycle_status`
  - `fare_reference_id`
  - `fare_rechecked_at`
  - `booking_hold_expires_at`
  - timestamp issue/customer notification
  - `supplier_raw_reference`
- Halaman detail booking menampilkan panel Flight Lifecycle untuk booking `flight`.

## Batas Aman

Sampai endpoint issue Dharmawisata production/UAT dipasang ke action admin, status `issued` tidak boleh dipilih saat create booking. Issue dilakukan setelah payment verified melalui step terpisah.
