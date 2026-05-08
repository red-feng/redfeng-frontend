# Darma Wisata H2H Integration

Dokumen ini menjadi pegangan awal untuk integrasi layanan partner `Darma Wisata Indonesia` ke hero search dan service search RedFeng.

## Aturan keamanan

- Jangan simpan username atau password Darma Wisata di komponen client.
- Jangan commit credential ke repository.
- Semua credential wajib lewat environment variable server-side.
- Endpoint pengecekan status boleh mengembalikan base URL dan status konfigurasi, tapi tidak boleh mengembalikan username/password.

## Environment variable

Tambahkan env berikut di local dan Vercel:

```env
DARMAWISATA_H2H_BASE_URL=
DARMAWISATA_H2H_USERNAME=
DARMAWISATA_H2H_PASSWORD=
DARMAWISATA_H2H_SWAGGER_URL=
DARMAWISATA_H2H_MANUAL_URL=
DARMAWISATA_H2H_TICKET_EXAMPLE_URL=
DARMAWISATA_H2H_TIMEOUT_MS=10000
DARMAWISATA_H2H_ENABLED_SERVICES=flight,hotel,train,bus,ship
```

## Service scope

Saat ini layanan yang direncanakan memakai provider Darma Wisata:

- `flight`
- `hotel`
- `train`
- `bus`
- `ship`

Layanan berikut tetap internal:

- `cruise`
- `activity`
- `package`

## Endpoint internal yang sudah disiapkan

- `GET /api/integrations/darmawisata/status`
  Mengembalikan status konfigurasi server-side secara aman.
- `GET /api/integrations/darmawisata/lookups`
  Stub lookup untuk origin/destination/passenger/date/time. Endpoint ini belum tersambung ke partner, tapi kontraknya sudah disiapkan.

## Kontrak lookup awal

Query string yang dipakai route lookup:

- `scope`
  Nilai: `flight | hotel | train | bus | ship`
- `field`
  Nilai: `origin | destination | passenger | date | time`
- `query`
  Keyword pencarian user

Respons target yang ingin dicapai:

```json
{
  "ok": true,
  "provider": "partner_darmawisata",
  "scope": "flight",
  "field": "origin",
  "items": [
    {
      "id": "CGK",
      "value": "CGK   Jakarta",
      "label": "CGK",
      "sublabel": "Soekarno Hatta International",
      "group": "Indonesia",
      "meta": {
        "city": "Jakarta",
        "country": "Indonesia"
      }
    }
  ]
}
```

## Kontrak internal lookup pesawat

Walau endpoint partner belum berhasil dibaca dari UAT, kontrak internal RedFeng untuk lookup `Pesawat` sudah ditetapkan seperti ini:

- service: `flight`
- semantic field:
  - `origin`
  - `destination`
  - `transit`

Target shape sesudah payload partner dinormalisasi:

```ts
type HeroTransportPointLookup = {
  provider: "partner_darmawisata"
  service: "flight"
  semantic: "origin" | "destination" | "transit"
  query: string
  items: Array<{
    id: string
    value: string
    label: string
    sublabel?: string
    group?: string
    meta?: {
      city?: string
      airportCode?: string
      airportName?: string
      country?: string
    }
  }>
}
```

Mapping UI yang dipakai hero search:

- `label` = kode IATA seperti `CGK`
- `value` = gabungan `IATA + kota` seperti `CGK   Jakarta`
- `sublabel` = nama bandara seperti `Soekarno Hatta International`
- `group` = region seperti `Indonesia`, `Asia Tenggara`, `Eropa`
- `meta.city` = kota utama
- `meta.country` = negara

## Data yang masih perlu dibaca dari Swagger/manual Darma Wisata

Kita masih perlu memastikan hal-hal ini dari dokumen partner:

1. endpoint login/auth apakah perlu token, cookie, atau basic credential per request
2. endpoint lookup airport/city untuk `origin` dan `destination`
3. apakah lookup flight menggunakan kode IATA, city id, atau keyword bebas
4. nama field request dan response asli dari partner
5. apakah partner mengembalikan region/negara, atau itu perlu kita hitung sendiri
6. rate limit, timeout, dan format error response

## Tahap implementasi berikutnya

1. Mapping endpoint login/auth Darma Wisata bila memang dibutuhkan session/token.
2. Mapping endpoint lookup per layanan:
   - airport / city
   - hotel destination / city
   - station
   - bus route / terminal
   - port / ferry route
3. Normalisasi payload partner ke format dropdown internal RedFeng.
4. Integrasi availability / search result setelah lookup stabil.
