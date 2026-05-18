# Flight Promo Integration Blueprint

Dokumen ini menjelaskan jalur sambungan promo transaksi RedFeng untuk produk `flight` sebelum katalog customer live penuh.

## Tujuan

Membuat integrasi promo flight konsisten dengan engine promo transaksi yang sudah hidup di `packages`, tanpa mengulang desain contract saat search result dan checkout flight nanti dibangun.

## Status Saat Ini

Yang sudah siap:

- target rule promo flight di `transaction_promo_rule_targets`
- evaluator promo flight di [lib/transaction-promos.ts](../lib/transaction-promos.ts)
- contract + adapter flight di [lib/flight-promo-contract.ts](../lib/flight-promo-contract.ts)
- admin/manual booking flight di:
  - [app/admin/(protected)/pesawat/actions.ts](../app/admin/(protected)/pesawat/actions.ts)
  - [app/admin/(protected)/pesawat/bookings/new/page.tsx](../app/admin/(protected)/pesawat/bookings/new/page.tsx)

Yang belum live:

- katalog customer flight
- result page flight
- checkout flight customer
- apply promo flight di transaksi customer live

## Komponen Utama

### 1. Rule targeting

Promo flight bisa membatasi:

- `origin_airport_code`
- `destination_airport_code`
- `airline_code`
- `cabin_class`
- `trip_type`
- `departure_starts_at`
- `departure_ends_at`
- `return_starts_at`
- `return_ends_at`

### 2. Contract normalizer

Gunakan [normalizeFlightPromoContractRow](../lib/flight-promo-contract.ts) untuk merapikan data flight mentah menjadi format kontrak yang konsisten.

### 3. Readiness check

Gunakan [assessFlightPromoContractReadiness](../lib/flight-promo-contract.ts) untuk membedakan:

- `rule_match`
  - minimum untuk evaluasi kecocokan rule promo
- `checkout_live`
  - minimum untuk apply promo di checkout customer live

## Jalur Integrasi

### A. Dari admin/manual booking

Saat membaca `flight_booking_details`, gunakan:

- [mapFlightBookingDetailsToPromoContract](../lib/flight-promo-contract.ts)

Ini cocok untuk:

- audit internal
- simulasi promo
- validasi readiness data operasional

Contoh alur:

```ts
import {
  mapFlightBookingDetailsToPromoContract,
  summarizeFlightPromoContract,
} from "@/lib/flight-promo-contract"

const contract = mapFlightBookingDetailsToPromoContract(flightBookingDetailsRow)
const summary = summarizeFlightPromoContract(contract)
```

### B. Dari future search result

Saat result page flight customer sudah ada, gunakan:

- [mapFlightSearchResultToPromoContract](../lib/flight-promo-contract.ts)
- [buildFlightPromoCheckoutInputFromSearchResult](../lib/flight-promo-contract.ts)
- [adaptFlightSearchResultForPromo](../lib/flight-promo-contract.ts)

Ini cocok untuk:

- result page
- price quote
- checkout prefill

Contoh alur:

```ts
import {
  adaptFlightSearchResultForPromo,
  buildFlightTransactionPromoContext,
} from "@/lib/flight-promo-contract"

const adapted = adaptFlightSearchResultForPromo(searchResult, {
  customerLocale: locale,
  customerId,
  customerEmail,
  promoCode,
  paymentMethod,
})

if (!adapted.summary.readiness.checkoutLive.ready) {
  // tampilkan state belum siap checkout live
}

const promoContext = buildFlightTransactionPromoContext(adapted.checkoutInput)
```

## Minimum Field Yang Disarankan

### Untuk rule match

- `origin_airport_code`
- `destination_airport_code`
- `departure_at`

### Untuk checkout live

- semua field `rule match`
- `trip_type`
- `cabin_class`

### Untuk round trip / multi-city

- `return_at` sebaiknya tersedia agar validasi window promo pulang bisa jujur

## Rekomendasi Tahap Implementasi

### Tahap 1

Bangun result page flight dengan data minimum:

- route
- airline
- departure time
- subtotal
- supplier reference

Lalu sambungkan ke:

- `adaptFlightSearchResultForPromo(...)`

### Tahap 2

Bangun quote/checkout flight customer:

- pilih result
- bangun `FlightPromoCheckoutInput`
- kirim ke promo engine

### Tahap 3

Tambahkan pencatatan:

- quote success / reject
- reserved
- applied
- reverted

agar analytics promo flight setara dengan package.

## Aturan Penting

- jangan mengaktifkan promo flight live sebelum result/checkout punya `checkout_live readiness`
- jangan bypass adapter contract dengan menyusun `TransactionPromoContext` manual di banyak tempat
- satu jalur adapter lebih aman untuk audit, analytics, dan maintenance

## Ringkasan

Saat katalog flight nanti dibangun, integrasi yang disarankan adalah:

1. `search result row`
2. `adaptFlightSearchResultForPromo(...)`
3. `buildFlightTransactionPromoContext(...)`
4. evaluator promo transaksi
5. quote / checkout / redemption
