# Hotel Promo Integration Blueprint

Dokumen ini menjelaskan jalur sambungan promo transaksi RedFeng untuk produk `hotel` sebelum katalog dan checkout customer live penuh.

## Tujuan

Membuat integrasi promo hotel konsisten dengan engine promo transaksi yang sudah hidup di `packages`, tanpa mengulang desain contract saat result page dan checkout hotel nanti dibangun.

## Status Saat Ini

Yang sudah siap:

- target rule promo hotel di `transaction_promo_rule_targets`
- evaluator promo hotel di [lib/transaction-promos.ts](../lib/transaction-promos.ts)
- contract + adapter hotel di [lib/hotel-promo-contract.ts](../lib/hotel-promo-contract.ts)
- workspace admin hotel di [app/admin/(protected)/hotel/page.tsx](../app/admin/(protected)/hotel/page.tsx) sudah menandai bahwa operasional hotel masih foundation, belum live checkout

Yang belum live:

- katalog customer hotel
- result page hotel berbasis inventory live
- checkout hotel customer
- apply promo hotel di transaksi customer live
- tabel detail booking hotel operasional yang setara `flight_booking_details`

## Komponen Utama

### 1. Rule targeting

Promo hotel bisa membatasi:

- `hotel_city_code`
- `hotel_country_code`
- `hotel_star_rating`
- `hotel_checkin_starts_at`
- `hotel_checkin_ends_at`
- `hotel_checkout_starts_at`
- `hotel_checkout_ends_at`
- `hotel_min_night_count`
- `hotel_max_night_count`

### 2. Contract normalizer

Gunakan [normalizeHotelPromoContractRow](../lib/hotel-promo-contract.ts) untuk merapikan data hotel mentah menjadi format kontrak yang konsisten.

### 3. Readiness check

Gunakan [assessHotelPromoContractReadiness](../lib/hotel-promo-contract.ts) untuk membedakan:

- `rule_match`
  - minimum untuk evaluasi kecocokan rule promo
- `checkout_live`
  - minimum untuk apply promo di checkout customer live

## Jalur Integrasi

### A. Dari future booking detail internal

Saat RedFeng sudah punya tabel detail booking hotel operasional, gunakan:

- [mapHotelBookingDetailsToPromoContract](../lib/hotel-promo-contract.ts)

Ini cocok untuk:

- audit internal
- simulasi promo
- validasi readiness data operasional

Contoh alur:

```ts
import {
  mapHotelBookingDetailsToPromoContract,
  summarizeHotelPromoContract,
} from "@/lib/hotel-promo-contract"

const contract = mapHotelBookingDetailsToPromoContract(hotelBookingDetailsRow)
const summary = summarizeHotelPromoContract(contract)
```

### B. Dari future search result

Saat result page hotel customer sudah ada, gunakan:

- [mapHotelSearchResultToPromoContract](../lib/hotel-promo-contract.ts)
- [buildHotelPromoCheckoutInputFromSearchResult](../lib/hotel-promo-contract.ts)
- [adaptHotelSearchResultForPromo](../lib/hotel-promo-contract.ts)

Ini cocok untuk:

- result page
- price quote
- checkout prefill

Contoh alur:

```ts
import {
  adaptHotelSearchResultForPromo,
  buildHotelTransactionPromoContext,
} from "@/lib/hotel-promo-contract"

const adapted = adaptHotelSearchResultForPromo(searchResult, {
  customerLocale: locale,
  customerId,
  customerEmail,
  promoCode,
  paymentMethod,
})

if (!adapted.summary.readiness.checkoutLive.ready) {
  // tampilkan state belum siap checkout live
}

const promoContext = buildHotelTransactionPromoContext(adapted.checkoutInput)
```

## Minimum Field Yang Disarankan

### Untuk rule match

- `hotel_city_code`
- `checkin_at`
- `checkout_at`

### Untuk checkout live

- semua field `rule match`
- `night_count`

### Untuk targeting lebih tajam

- `hotel_country_code` untuk guard lintas negara
- `hotel_star_rating` bila promo memang dibatasi ke kelas properti tertentu

## Rekomendasi Tahap Implementasi

### Tahap 1

Bangun result page hotel dengan data minimum:

- destination city
- country
- check-in
- check-out
- subtotal
- supplier reference

Lalu sambungkan ke:

- `adaptHotelSearchResultForPromo(...)`

### Tahap 2

Bangun quote/checkout hotel customer:

- pilih result
- bangun `HotelPromoCheckoutInput`
- kirim ke promo engine

### Tahap 3

Tambahkan pencatatan:

- quote success / reject
- reserved
- applied
- reverted

agar analytics promo hotel setara dengan package dan flight.

## Aturan Penting

- jangan mengaktifkan promo hotel live sebelum result/checkout punya `checkout_live readiness`
- jangan bypass adapter contract dengan menyusun `TransactionPromoContext` manual di banyak tempat
- satu jalur adapter lebih aman untuk audit, analytics, dan maintenance
- jangan membuat fake booking detail hotel; tunggu tabel operasional hotel live, lalu sambungkan ke mapper yang sama

## Ringkasan

Saat katalog hotel nanti dibangun, integrasi yang disarankan adalah:

1. `search result row`
2. `adaptHotelSearchResultForPromo(...)`
3. `buildHotelTransactionPromoContext(...)`
4. evaluator promo transaksi
5. quote / checkout / redemption
