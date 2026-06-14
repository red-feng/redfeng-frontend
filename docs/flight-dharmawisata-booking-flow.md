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
- Panel detail booking menyediakan gate admin:
  - `Verify Payment`
  - `Request Ticket Issue`
  - `Mark Issued`
  - `Mark Issue Failed`
- Setiap gate menulis audit log dan `supplier_order_events`.
- `Request Ticket Issue` sudah disambungkan ke adapter Dharmawisata:
  - Jika `DHARMAWISATA_H2H_ISSUE_PATH` belum diisi, tombol tetap mencatat status `ticketing` untuk proses manual.
  - Jika `DHARMAWISATA_H2H_ISSUE_PATH` sudah diisi, action login/call API Dharmawisata, menyimpan raw response ke `supplier_orders.response_payload`, lalu otomatis memindahkan booking ke `issued` atau `issue_failed`.
  - Help Page UAT Dharmawisata mengonfirmasi endpoint issue resmi: `POST /h2h/Airline/Issued`.
  - Endpoint `POST /h2h/Airline/BookingIssued` juga ada, tetapi itu memakai payload booking penuh dan tidak dipakai untuk flow Red Feng saat ini karena Red Feng memisahkan `Booking/Hold` dan `Issued`.
- Form create booking Pesawat sudah disambungkan ke adapter `POST /h2h/Airline/Booking`:
  - Jika `DHARMAWISATA_H2H_BOOKING_PATH` belum diisi, form tetap membuat booking internal Red Feng dan supplier hold dilakukan manual.
  - Jika data wajib Dharmawisata belum lengkap, booking tetap tersimpan untuk proses manual dan action memberi pesan field mana yang kurang.
  - Jika API booking sukses, `supplier_orders.supplier_order_id` menyimpan `bookingCode`, `supplier_orders.supplier_reference` menyimpan `referenceNo`/`bookingCodeAirline`, dan `flight_booking_details.booking_hold_expires_at` memakai `timeLimit` jika bisa diparse.

## Batas Aman

Status `issued` tidak boleh dipilih saat create booking. Issue tetap dilakukan setelah payment verified melalui step terpisah.

Isi env berikut saat endpoint resmi dari Dharmawisata sudah dikonfirmasi:

```env
DHARMAWISATA_H2H_BOOKING_PATH=/Airline/Booking
DHARMAWISATA_H2H_BOOKING_DETAIL_PATH=/Airline/BookingDetail
DHARMAWISATA_H2H_ISSUE_PATH=/Airline/Issued
```

Path di atas berasal dari Help Page UAT Dharmawisata. Setelah env ini terpasang, create booking bisa mencoba auto-hold ke `Airline/Booking`, lalu gate `Request Ticket Issue` akan auto-issue via `Airline/Issued`. `Mark Issued` dan `Mark Issue Failed` tetap tersedia sebagai override/follow up manual.
