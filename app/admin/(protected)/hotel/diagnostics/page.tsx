import Link from "next/link"
import type { ReactNode } from "react"
import AdminProductWorkspace from "@/app/components/AdminProductWorkspace"
import { createAdminClient } from "@/lib/supabase/admin"
import {
  checkHotelSchemaReadiness,
  previewHotelBookingPayload,
  saveHotelCityMappingFromDiagnostics,
  testHotelAvailableRooms,
  testHotelCitySearch,
  testHotelLogin,
  testHotelPricePolicy,
} from "./actions"

type SearchParams = Promise<{
  panel?: string
  status?: string
  result?: string
}>

type ResultRecord = Record<string, unknown>

type CitySearchLogRow = {
  id: string
  country_id: string
  city_name_filter: string
  status: string | null
  resp_message: string | null
  city_count: number
  created_at: string
}

function getDefaultDate(offsetDays: number) {
  const date = new Date()
  date.setDate(date.getDate() + offsetDays)
  return date.toISOString().slice(0, 10)
}

function parseResult(value?: string): ResultRecord | null {
  if (!value) return null
  try {
    const parsed = JSON.parse(value)
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : { value: parsed }
  } catch {
    return { error: "Result tidak bisa dibaca sebagai JSON.", raw: value }
  }
}

function asText(value: unknown) {
  if (typeof value === "string") return value
  if (typeof value === "number" || typeof value === "boolean") return String(value)
  return ""
}

function asRecord(value: unknown): ResultRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as ResultRecord) : {}
}

function formatDateTime(value: string) {
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return "-"
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(parsed)
}

function getCityCandidates(result: ResultRecord | null) {
  const cities = Array.isArray(result?.cities) ? result.cities : []
  return cities
    .map((city) => {
      const row = asRecord(city)
      const name = asText(row.Name) || asText(row.name)
      const id = asText(row.ID) || asText(row.id)
      const countryId = asText(row.CountryID) || asText(row.countryID) || asText(row.countryId) || asText(result?.countryID)
      return {
        name,
        id,
        countryId,
      }
    })
    .filter((city) => city.name && city.id && city.countryId)
}

function getStatusClasses(status?: string) {
  if (status === "success") return "border-emerald-200 bg-emerald-50 text-emerald-800"
  if (status === "warning") return "border-amber-200 bg-amber-50 text-amber-800"
  if (status === "error") return "border-rose-200 bg-rose-50 text-rose-800"
  return "border-slate-200 bg-slate-50 text-slate-700"
}

function summarizeResult(result: ResultRecord | null) {
  if (!result) return []
  return [
    ["Status", asText(result.status) || "-"],
    ["Message", asText(result.respMessage) || asText(result.error) || "-"],
    ["Elapsed", result.elapsedMs ? `${result.elapsedMs} ms` : "-"],
    ["Rooms", typeof result.roomCount === "number" ? `${result.roomCount}` : "-"],
    ["Cities", typeof result.cityCount === "number" ? `${result.cityCount}` : "-"],
    ["Enable booking", typeof result.isEnableBooking === "boolean" ? String(result.isEnableBooking) : "-"],
    ["Missing columns", typeof result.missingColumnCount === "number" ? `${result.missingColumnCount}` : "-"],
  ]
}

function Field({
  label,
  name,
  defaultValue,
  type = "text",
  placeholder,
}: {
  label: string
  name: string
  defaultValue?: string | number
  type?: string
  placeholder?: string
}) {
  return (
    <label className="block text-sm font-semibold text-slate-700">
      {label}
      <input
        type={type}
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="mt-2 h-11 w-full rounded-[10px] border border-[#e8d8ca] bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
      />
    </label>
  )
}

function SelectField({
  label,
  name,
  defaultValue,
  options,
}: {
  label: string
  name: string
  defaultValue?: string
  options: Array<[string, string]>
}) {
  return (
    <label className="block text-sm font-semibold text-slate-700">
      {label}
      <select
        name={name}
        defaultValue={defaultValue}
        className="mt-2 h-11 w-full rounded-[10px] border border-[#e8d8ca] bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
      >
        {options.map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
    </label>
  )
}

function TestCard({
  eyebrow,
  title,
  description,
  tone = "white",
  children,
}: {
  eyebrow: string
  title: string
  description: string
  tone?: "white" | "amber"
  children: ReactNode
}) {
  const classes =
    tone === "amber"
      ? "border-amber-200 bg-amber-50"
      : "border-[#eee3d9] bg-white shadow-[0_14px_34px_rgba(15,23,42,0.04)]"

  return (
    <section className={`rounded-[18px] border p-5 ${classes}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className={`text-[10px] font-semibold uppercase tracking-[0.24em] ${tone === "amber" ? "text-amber-700" : "text-orange-500"}`}>
            {eyebrow}
          </p>
          <h2 className={`mt-2 text-base font-semibold ${tone === "amber" ? "text-amber-950" : "text-slate-950"}`}>{title}</h2>
          <p className={`mt-2 max-w-2xl text-sm leading-6 ${tone === "amber" ? "text-amber-800" : "text-slate-500"}`}>{description}</p>
        </div>
      </div>
      <div className="mt-5">{children}</div>
    </section>
  )
}

function HotelCoreFields() {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Hotel ID" name="hotel_id" placeholder="Dari Hotel/Search atau AvailableRooms" />
        <Field label="Country ID" name="country_id" placeholder="Contoh: ID" />
        <Field label="City ID" name="city_id" placeholder="Dari endpoint city" />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Check-in" name="checkin_date" type="date" defaultValue={getDefaultDate(7)} />
        <Field label="Check-out" name="checkout_date" type="date" defaultValue={getDefaultDate(8)} />
        <Field label="Passport" name="pax_passport" defaultValue="ID" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Jumlah kamar" name="room_count" type="number" defaultValue={1} />
        <Field label="Jumlah anak" name="child_count" type="number" defaultValue={0} />
      </div>
    </>
  )
}

function HotelRateFields() {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <Field label="Internal code" name="internal_code" placeholder="Dari room/rate supplier" />
      <Field label="Room ID" name="room_id" placeholder="Dari room/rate supplier" />
      <Field label="Breakfast ID" name="breakfast_id" placeholder="Dari room/rate supplier" />
    </div>
  )
}

function GuestFields() {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-3">
        <SelectField
          label="Guest title"
          name="guest_title"
          defaultValue="MR"
          options={[
            ["MR", "MR"],
            ["MRS", "MRS"],
            ["MS", "MS"],
            ["MISS", "MISS"],
          ]}
        />
        <Field label="Guest first name" name="guest_first_name" defaultValue="Red" />
        <Field label="Guest last name" name="guest_last_name" defaultValue="Feng" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Guest phone" name="guest_phone" defaultValue="081234567890" />
        <Field label="Guest email" name="guest_email" type="email" defaultValue="ops@redfeng.co" />
      </div>
      <Field label="Request description" name="request_description" defaultValue="Red Feng hotel diagnostics" />
    </>
  )
}

function CityMappingCandidates({ result }: { result: ResultRecord | null }) {
  const candidates = getCityCandidates(result)
  if (candidates.length === 0) return null

  const requestedKeyword = asText(result?.cityNameFilter)

  return (
    <section className="rounded-[18px] border border-[#eee3d9] bg-white p-5 shadow-[0_14px_34px_rgba(15,23,42,0.04)]">
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-950">Kandidat City Mapping</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Pilih salah satu hasil City5 untuk disimpan sebagai mapping katalog hotel.
          </p>
        </div>
        <Link href="/admin/hotel/city-mapping" className="rounded-[10px] border border-orange-200 bg-orange-50 px-3 py-2 text-xs font-semibold text-orange-700 transition hover:bg-orange-100">
          Lihat mapping
        </Link>
      </div>
      <div className="mt-4 space-y-3">
        {candidates.slice(0, 8).map((city) => (
          <form key={`${city.countryId}-${city.id}-${city.name}`} action={saveHotelCityMappingFromDiagnostics} className="rounded-[14px] border border-slate-200 bg-slate-50 p-3">
            <input type="hidden" name="destination_label" value={requestedKeyword || city.name} />
            <input type="hidden" name="destination_key" value={requestedKeyword || city.name} />
            <input type="hidden" name="country_id" value={city.countryId} />
            <input type="hidden" name="city_id" value={city.id} />
            <input type="hidden" name="country_name" value={city.countryId} />
            <input type="hidden" name="city_name" value={city.name} />
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-950">{city.name}</p>
                <p className="mt-1 text-xs text-slate-500">Country ID {city.countryId} | City ID {city.id}</p>
              </div>
              <button type="submit" className="rounded-[12px] bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-700">
                Simpan mapping
              </button>
            </div>
          </form>
        ))}
      </div>
    </section>
  )
}

function CitySearchHistory({ logs }: { logs: CitySearchLogRow[] }) {
  return (
    <section className="rounded-[18px] border border-[#eee3d9] bg-white p-5 shadow-[0_14px_34px_rgba(15,23,42,0.04)]">
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-950">Riwayat pencarian City5</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Menyimpan pencarian kota terakhir agar admin bisa mengulang atau membandingkan kandidat cityID.
          </p>
        </div>
        <Link href="/admin/hotel/city-mapping" className="rounded-[10px] border border-orange-200 bg-orange-50 px-3 py-2 text-xs font-semibold text-orange-700 transition hover:bg-orange-100">
          City mapping
        </Link>
      </div>

      {logs.length === 0 ? (
        <div className="mt-4 rounded-[14px] border border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500">
          Belum ada riwayat pencarian City5, atau migration log belum dijalankan.
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {logs.map((log) => (
            <div key={log.id} className="rounded-[14px] border border-slate-200 bg-slate-50 p-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-950">{log.city_name_filter}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Country {log.country_id} | {log.city_count} kandidat | {formatDateTime(log.created_at)}
                  </p>
                  {log.resp_message ? <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-500">{log.resp_message}</p> : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link
                    href={`/admin/hotel/diagnostics?panel=city&status=warning&result=${encodeURIComponent(JSON.stringify({
                      title: "Riwayat pencarian City5",
                      status: log.status || "",
                      respMessage: log.resp_message || "Gunakan keyword ini untuk pencarian ulang.",
                      cityNameFilter: log.city_name_filter,
                      countryID: log.country_id,
                      cityCount: log.city_count,
                    }))}`}
                    className="rounded-[10px] border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                  >
                    Lihat ringkas
                  </Link>
                  <form action={testHotelCitySearch}>
                    <input type="hidden" name="country_id" value={log.country_id} />
                    <input type="hidden" name="city_name_filter" value={log.city_name_filter} />
                    <button type="submit" className="rounded-[10px] bg-orange-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-orange-700">
                      Cari ulang
                    </button>
                  </form>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

export default async function AdminHotelDiagnosticsPage({ searchParams }: { searchParams?: SearchParams }) {
  const params = (await searchParams) || {}
  const activePanel = params.panel || "schema"
  const result = parseResult(params.result)
  const resultTitle = asText(result?.title) || "Belum ada hasil test"
  const resultRows = summarizeResult(result)
  const adminSupabase = createAdminClient()
  const { data: citySearchLogs } = await adminSupabase
    .from("dharmawisata_hotel_city_search_logs")
    .select("id, country_id, city_name_filter, status, resp_message, city_count, created_at")
    .order("created_at", { ascending: false })
    .limit(8)
  const cityLogs = (citySearchLogs || []) as CitySearchLogRow[]

  return (
    <AdminProductWorkspace
      productType="hotel"
      productLabel="Hotel Diagnostics"
      description="Panel test untuk alur hotel Dharmawisata: schema, login, city ID, AvailableRooms, PriceAndPolicy, dan preview payload booking sebelum payment customer."
      statusLabel="Hotel test console"
      statusNote="Gunakan halaman ini setelah migration Supabase, update environment variable Vercel, atau saat mengecek readiness supplier hotel."
      primaryActionHref="/admin/hotel"
      primaryActionLabel="Kembali ke dashboard Hotel"
      secondaryActionHref="/hotel/catalog"
      secondaryActionLabel="Buka katalog Hotel"
      preparedModules={["Schema readiness", "Login token", "City ID search", "Available rooms", "Price policy", "Booking payload", "Voucher readiness"]}
    >
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_480px]">
        <div className="space-y-5">
          <TestCard
            eyebrow="Schema"
            title="Audit Schema Hotel"
            description="Memastikan kolom request, booking detail, supplier order, dan voucher hotel sudah tersedia di database aktif."
          >
            <form action={checkHotelSchemaReadiness}>
              <button type="submit" className="rounded-[12px] bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800">
                Cek schema hotel
              </button>
            </form>
          </TestCard>

          <TestCard
            eyebrow="Step 1"
            title="Test Login Token"
            description="Memastikan base URL, user ID, password, security code, dan TLS UAT/production bisa menghasilkan access token."
          >
            <form action={testHotelLogin}>
              <button type="submit" className="rounded-[12px] bg-orange-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-orange-700">
                Test login Dharmawisata
              </button>
            </form>
          </TestCard>

          <TestCard
            eyebrow="City"
            title="Cari City ID Dharmawisata"
            description="Cari kandidat cityID dari endpoint Hotel/City5. Hasilnya dipakai untuk mengisi Hotel City Mapping agar katalog live lebih stabil."
          >
            <form action={testHotelCitySearch} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-[180px_minmax(0,1fr)]">
                <Field label="Country ID" name="country_id" defaultValue="ID" placeholder="Contoh: ID" />
                <Field label="Nama kota" name="city_name_filter" defaultValue="Jakarta" placeholder="Jakarta, Bali, Surabaya" />
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <button type="submit" className="rounded-[12px] bg-orange-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-orange-700">
                  Cari City ID
                </button>
                <Link href="/admin/hotel/city-mapping" className="rounded-[12px] border border-orange-200 bg-orange-50 px-4 py-3 text-sm font-semibold text-orange-700 transition hover:bg-orange-100">
                  Buka city mapping
                </Link>
              </div>
            </form>
          </TestCard>

          <TestCard
            eyebrow="Step 2"
            title="Test AvailableRooms"
            description="Cek kamar tersedia berdasarkan Hotel ID, tanggal stay, jumlah kamar, dan komposisi anak. Test ini read-only."
          >
            <form action={testHotelAvailableRooms} className="space-y-4">
              <HotelCoreFields />
              <button type="submit" className="rounded-[12px] bg-orange-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-orange-700">
                Test available rooms
              </button>
            </form>
          </TestCard>

          <TestCard
            eyebrow="Step 3"
            title="Test PriceAndPolicy"
            description="Validasi harga final, komisi, cancellation policy, dan flag isEnableBooking sebelum quote dikirim ke customer."
          >
            <form action={testHotelPricePolicy} className="space-y-4">
              <HotelCoreFields />
              <HotelRateFields />
              <button type="submit" className="rounded-[12px] bg-orange-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-orange-700">
                Test price and policy
              </button>
            </form>
          </TestCard>

          <TestCard
            eyebrow="Dry-run"
            title="Preview Payload Hotel/Booking"
            description="Merakit payload Hotel/Booking tanpa mengirim request booking. Submit asli hanya dilakukan setelah payment Midtrans sukses."
            tone="amber"
          >
            <form action={previewHotelBookingPayload} className="space-y-4">
              <HotelCoreFields />
              <HotelRateFields />
              <GuestFields />
              <button type="submit" className="rounded-[12px] bg-amber-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-amber-800">
                Preview payload booking
              </button>
            </form>
          </TestCard>
        </div>

        <aside className="space-y-5 xl:sticky xl:top-6 xl:self-start">
          <section className={`rounded-[18px] border p-5 shadow-[0_14px_34px_rgba(15,23,42,0.04)] ${getStatusClasses(params.status)}`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.24em]">Hasil Test</p>
                <h2 className="mt-2 text-base font-semibold">{resultTitle}</h2>
              </div>
              <span className="rounded-[10px] border border-current px-3 py-1 text-xs font-semibold">
                {activePanel.toUpperCase()} {params.status ? `- ${params.status.toUpperCase()}` : ""}
              </span>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
              {resultRows.length > 0 ? (
                resultRows.map(([label, value]) => (
                  <div key={label} className="rounded-[12px] border border-current/20 bg-white/65 p-4">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] opacity-70">{label}</p>
                    <p className="mt-2 break-words text-sm font-semibold">{value}</p>
                  </div>
                ))
              ) : (
                <div className="rounded-[12px] border border-current/20 bg-white/65 p-4 text-sm">Jalankan salah satu test untuk melihat ringkasan.</div>
              )}
            </div>
          </section>

          <section className="rounded-[18px] border border-[#eee3d9] bg-white p-5 shadow-[0_14px_34px_rgba(15,23,42,0.04)]">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-base font-semibold text-slate-950">Response JSON</h2>
              <Link href="/admin/hotel/diagnostics" className="rounded-[10px] border border-[#ecd9c2] bg-[#fff7ef] px-3 py-2 text-xs font-semibold text-orange-600 transition hover:bg-orange-50">
                Bersihkan
              </Link>
            </div>
            <pre className="mt-4 max-h-[520px] overflow-auto rounded-[14px] border border-slate-200 bg-slate-950 p-4 text-xs leading-6 text-slate-100">
              {JSON.stringify(result || { note: "Belum ada hasil. Jalankan schema, login, available rooms, price policy, atau preview payload." }, null, 2)}
            </pre>
          </section>

          <CityMappingCandidates result={result} />
          <CitySearchHistory logs={cityLogs} />

          <section className="rounded-[18px] border border-[#eee3d9] bg-white p-5 shadow-[0_14px_34px_rgba(15,23,42,0.04)]">
            <h2 className="text-base font-semibold text-slate-950">Checklist Hotel</h2>
            <div className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
              <p>AvailableRooms sukses berarti hotel, tanggal, dan room request terbaca supplier.</p>
              <p>PriceAndPolicy sukses dan `isEnableBooking=true` berarti quote boleh dikirim ke customer.</p>
              <p>Hotel/Booking tetap hanya dijalankan setelah customer paid di Midtrans.</p>
              <p>Jika response gagal karena kode room/rate kosong, tempel ulang `internalCode`, `roomID`, dan `breakfast` dari response supplier.</p>
            </div>
          </section>
        </aside>
      </div>
    </AdminProductWorkspace>
  )
}
