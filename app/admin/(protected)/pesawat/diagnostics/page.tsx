import Link from "next/link"
import AdminProductWorkspace from "@/app/components/AdminProductWorkspace"
import { checkFlightSchemaReadiness, previewDharmawisataHoldPayload, testDharmawisataLogin, testDharmawisataSearch } from "./actions"

type SearchParams = Promise<{
  panel?: string
  status?: string
  result?: string
}>

type ResultRecord = Record<string, unknown>

function getDefaultDepartDate() {
  const date = new Date()
  date.setDate(date.getDate() + 5)
  return date.toISOString().slice(0, 10)
}

function getDefaultDateTimeLocal(hour: string) {
  return `${getDefaultDepartDate()}T${hour}`
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

function getStatusClasses(status?: string) {
  if (status === "success") return "border-emerald-200 bg-emerald-50 text-emerald-700"
  if (status === "warning") return "border-amber-200 bg-amber-50 text-amber-700"
  if (status === "error") return "border-rose-200 bg-rose-50 text-rose-700"
  return "border-slate-200 bg-slate-50 text-slate-600"
}

function asText(value: unknown) {
  if (typeof value === "string") return value
  if (typeof value === "number" || typeof value === "boolean") return String(value)
  return ""
}

function summarizeResult(result: ResultRecord | null) {
  if (!result) return []

  return [
    ["Status", asText(result.status) || asText(result.authStatus) || "-"],
    ["Message", asText(result.respMessage) || asText(result.authMessage) || asText(result.error) || "-"],
    ["Elapsed", result.elapsedMs ? `${result.elapsedMs} ms` : "-"],
    ["Journeys", result.journeyDepartCount ? `${result.journeyDepartCount}` : "-"],
    ["Missing columns", typeof result.missingColumnCount === "number" ? `${result.missingColumnCount}` : "-"],
  ]
}

export default async function AdminFlightsDiagnosticsPage({ searchParams }: { searchParams?: SearchParams }) {
  const params = (await searchParams) || {}
  const activePanel = params.panel || "login"
  const result = parseResult(params.result)
  const resultTitle = asText(result?.title) || "Belum ada hasil test"
  const resultRows = summarizeResult(result)
  const defaultDepartDate = getDefaultDepartDate()

  return (
    <AdminProductWorkspace
      productType="flight"
      productLabel="Pesawat Diagnostics"
      description="Panel ini dipakai untuk menguji kesiapan pesawat: schema database, login token, low fare search, dan payload sebelum hold booking."
      statusLabel="Flight test console"
      statusNote="Gunakan panel ini setelah update environment variable Vercel, migration Supabase, atau saat mengecek apakah UAT/production Dharmawisata sedang sehat."
      primaryActionHref="/admin/pesawat"
      primaryActionLabel="Kembali ke dashboard Pesawat"
      secondaryActionHref="/admin/pesawat/coverage"
      secondaryActionLabel="Lihat coverage supplier"
      preparedModules={["Schema readiness", "Login token", "Low fare search", "TLS visibility", "Redacted response", "Hold readiness"]}
    >
      <div className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="space-y-5">
          <div className="rounded-[20px] border border-[#eee3d9] bg-white p-5 shadow-[0_14px_34px_rgba(15,23,42,0.04)]">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-orange-500">Schema</p>
                <h2 className="mt-2 text-base font-semibold text-slate-950">Audit Schema Pesawat</h2>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  Memastikan kolom checkout, supplier order, lifecycle, dan ticketing sudah tersedia di database aktif.
                </p>
              </div>
              <span className="rounded-[12px] border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">
                Read only
              </span>
            </div>

            <form action={checkFlightSchemaReadiness} className="mt-5">
              <button
                type="submit"
                className="inline-flex w-full items-center justify-center rounded-[14px] bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 sm:w-auto"
              >
                Cek schema pesawat
              </button>
            </form>
          </div>

          <div className="rounded-[20px] border border-[#eee3d9] bg-white p-5 shadow-[0_14px_34px_rgba(15,23,42,0.04)]">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-orange-500">Step 1</p>
                <h2 className="mt-2 text-base font-semibold text-slate-950">Test Login Token</h2>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  Memastikan kredensial dan endpoint login bisa menghasilkan access token. Token tidak ditampilkan mentah.
                </p>
              </div>
              <span className="rounded-[12px] border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                Aman
              </span>
            </div>

            <form action={testDharmawisataLogin} className="mt-5">
              <button
                type="submit"
                className="inline-flex w-full items-center justify-center rounded-[14px] bg-orange-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-orange-700 sm:w-auto"
              >
                Test login Dharmawisata
              </button>
            </form>
          </div>

          <div className="rounded-[20px] border border-[#eee3d9] bg-white p-5 shadow-[0_14px_34px_rgba(15,23,42,0.04)]">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-orange-500">Step 2</p>
                <h2 className="mt-2 text-base font-semibold text-slate-950">Test Low Fare Search</h2>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  Mengambil fare live dari Dharmawisata dengan parameter rute yang bisa diganti untuk validasi cepat.
                </p>
              </div>
              <span className="rounded-[12px] border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">
                Read only
              </span>
            </div>

            <form action={testDharmawisataSearch} className="mt-5 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-semibold text-slate-700">
                  Origin
                  <input
                    name="origin"
                    defaultValue="CGK"
                    className="mt-2 h-11 w-full rounded-[12px] border border-[#e8d8ca] bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                  />
                </label>
                <label className="text-sm font-semibold text-slate-700">
                  Destination
                  <input
                    name="destination"
                    defaultValue="SUB"
                    className="mt-2 h-11 w-full rounded-[12px] border border-[#e8d8ca] bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                  />
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-semibold text-slate-700">
                  Tanggal berangkat
                  <input
                    type="date"
                    name="depart_date"
                    defaultValue={defaultDepartDate}
                    className="mt-2 h-11 w-full rounded-[12px] border border-[#e8d8ca] bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                  />
                </label>
                <label className="text-sm font-semibold text-slate-700">
                  Trip
                  <select
                    name="trip_type"
                    defaultValue="one_way"
                    className="mt-2 h-11 w-full rounded-[12px] border border-[#e8d8ca] bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                  >
                    <option value="one_way">One way</option>
                    <option value="round_trip">Round trip</option>
                  </select>
                </label>
              </div>

              <label className="block text-sm font-semibold text-slate-700">
                Tanggal pulang
                <input
                  type="date"
                  name="return_date"
                  className="mt-2 h-11 w-full rounded-[12px] border border-[#e8d8ca] bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                />
              </label>

              <div className="grid gap-4 sm:grid-cols-3">
                <label className="text-sm font-semibold text-slate-700">
                  Dewasa
                  <input
                    type="number"
                    name="pax_adult"
                    min={1}
                    defaultValue={1}
                    className="mt-2 h-11 w-full rounded-[12px] border border-[#e8d8ca] bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                  />
                </label>
                <label className="text-sm font-semibold text-slate-700">
                  Anak
                  <input
                    type="number"
                    name="pax_child"
                    min={0}
                    defaultValue={0}
                    className="mt-2 h-11 w-full rounded-[12px] border border-[#e8d8ca] bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                  />
                </label>
                <label className="text-sm font-semibold text-slate-700">
                  Infant
                  <input
                    type="number"
                    name="pax_infant"
                    min={0}
                    defaultValue={0}
                    className="mt-2 h-11 w-full rounded-[12px] border border-[#e8d8ca] bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                  />
                </label>
              </div>

              <button
                type="submit"
                className="inline-flex w-full items-center justify-center rounded-[14px] bg-orange-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-orange-700 sm:w-auto"
              >
                Test search fare live
              </button>
            </form>
          </div>

          <div className="rounded-[20px] border border-amber-200 bg-amber-50 p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-amber-700">Step 3</p>
                <h2 className="mt-2 text-base font-semibold text-amber-900">Preview Payload Hold</h2>
                <p className="mt-2 text-sm leading-6 text-amber-800">
                  Dry-run untuk merakit payload `/Airline/Booking`. Action ini tidak membuat PNR dan tidak mengirim request booking ke supplier.
                </p>
              </div>
              <span className="rounded-[12px] border border-amber-300 bg-white px-3 py-1 text-xs font-semibold text-amber-800">
                Dry-run
              </span>
            </div>

            <form action={previewDharmawisataHoldPayload} className="mt-5 space-y-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <label className="text-sm font-semibold text-amber-950">
                  Airline ID
                  <input
                    name="airline_id"
                    defaultValue="QG"
                    className="mt-2 h-11 w-full rounded-[12px] border border-amber-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                  />
                </label>
                <label className="text-sm font-semibold text-amber-950">
                  Airline code
                  <input
                    name="airline_code"
                    defaultValue="QG"
                    className="mt-2 h-11 w-full rounded-[12px] border border-amber-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                  />
                </label>
                <label className="text-sm font-semibold text-amber-950">
                  Flight number
                  <input
                    name="flight_number"
                    defaultValue="815"
                    className="mt-2 h-11 w-full rounded-[12px] border border-amber-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                  />
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <label className="text-sm font-semibold text-amber-950">
                  Origin
                  <input
                    name="origin"
                    defaultValue="CGK"
                    className="mt-2 h-11 w-full rounded-[12px] border border-amber-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                  />
                </label>
                <label className="text-sm font-semibold text-amber-950">
                  Destination
                  <input
                    name="destination"
                    defaultValue="SUB"
                    className="mt-2 h-11 w-full rounded-[12px] border border-amber-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                  />
                </label>
                <label className="text-sm font-semibold text-amber-950">
                  Class
                  <input
                    name="flight_class"
                    defaultValue="Economy"
                    className="mt-2 h-11 w-full rounded-[12px] border border-amber-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                  />
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-semibold text-amber-950">
                  Departure at
                  <input
                    type="datetime-local"
                    name="departure_at"
                    defaultValue={getDefaultDateTimeLocal("04:10")}
                    className="mt-2 h-11 w-full rounded-[12px] border border-amber-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                  />
                </label>
                <label className="text-sm font-semibold text-amber-950">
                  Arrival at
                  <input
                    type="datetime-local"
                    name="arrival_at"
                    defaultValue={getDefaultDateTimeLocal("05:35")}
                    className="mt-2 h-11 w-full rounded-[12px] border border-amber-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                  />
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-semibold text-amber-950">
                  Trip
                  <select
                    name="trip_type"
                    defaultValue="one_way"
                    className="mt-2 h-11 w-full rounded-[12px] border border-amber-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                  >
                    <option value="one_way">One way</option>
                    <option value="round_trip">Round trip</option>
                  </select>
                </label>
                <label className="text-sm font-semibold text-amber-950">
                  Return at
                  <input
                    type="datetime-local"
                    name="return_at"
                    className="mt-2 h-11 w-full rounded-[12px] border border-amber-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                  />
                </label>
              </div>

              <label className="block text-sm font-semibold text-amber-950">
                Airline access code
                <textarea
                  name="airline_access_code"
                  rows={2}
                  placeholder="Tempel airlineAccessCode dari hasil LowFareSchedule jika tersedia"
                  className="mt-2 w-full rounded-[12px] border border-amber-200 bg-white px-3 py-3 text-sm text-slate-900 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                />
              </label>

              <label className="block text-sm font-semibold text-amber-950">
                Search key
                <textarea
                  name="search_key"
                  rows={2}
                  placeholder="Tempel searchKey dari hasil supplier jika tersedia"
                  className="mt-2 w-full rounded-[12px] border border-amber-200 bg-white px-3 py-3 text-sm text-slate-900 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                />
              </label>

              <label className="block text-sm font-semibold text-amber-950">
                Detail schedule
                <textarea
                  name="detail_schedule"
                  rows={2}
                  placeholder="Tempel detailSchedule/journeyReference jika diperlukan supplier"
                  className="mt-2 w-full rounded-[12px] border border-amber-200 bg-white px-3 py-3 text-sm text-slate-900 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                />
              </label>

              <div className="grid gap-4 sm:grid-cols-3">
                <label className="text-sm font-semibold text-amber-950">
                  Contact title
                  <select
                    name="contact_title"
                    defaultValue="MR"
                    className="mt-2 h-11 w-full rounded-[12px] border border-amber-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                  >
                    <option value="MR">MR</option>
                    <option value="MRS">MRS</option>
                    <option value="MS">MS</option>
                    <option value="MISS">MISS</option>
                    <option value="MSTR">MSTR</option>
                  </select>
                </label>
                <label className="text-sm font-semibold text-amber-950">
                  Contact name
                  <input
                    name="contact_name"
                    defaultValue="Red Feng Test"
                    className="mt-2 h-11 w-full rounded-[12px] border border-amber-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                  />
                </label>
                <label className="text-sm font-semibold text-amber-950">
                  Contact phone
                  <input
                    name="contact_phone"
                    defaultValue="081234567890"
                    className="mt-2 h-11 w-full rounded-[12px] border border-amber-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                  />
                </label>
              </div>

              <label className="block text-sm font-semibold text-amber-950">
                Contact email
                <input
                  type="email"
                  name="contact_email"
                  defaultValue="ops@redfeng.co"
                  className="mt-2 h-11 w-full rounded-[12px] border border-amber-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                />
              </label>

              <div className="grid gap-4 sm:grid-cols-3">
                <label className="text-sm font-semibold text-amber-950">
                  Dewasa
                  <input
                    type="number"
                    name="pax_adult"
                    min={1}
                    defaultValue={1}
                    className="mt-2 h-11 w-full rounded-[12px] border border-amber-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                  />
                </label>
                <label className="text-sm font-semibold text-amber-950">
                  Anak
                  <input
                    type="number"
                    name="pax_child"
                    min={0}
                    defaultValue={0}
                    className="mt-2 h-11 w-full rounded-[12px] border border-amber-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                  />
                </label>
                <label className="text-sm font-semibold text-amber-950">
                  Infant
                  <input
                    type="number"
                    name="pax_infant"
                    min={0}
                    defaultValue={0}
                    className="mt-2 h-11 w-full rounded-[12px] border border-amber-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                  />
                </label>
              </div>

              <label className="block text-sm font-semibold text-amber-950">
                Passenger manifest
                <textarea
                  name="passenger_manifest"
                  rows={3}
                  defaultValue="MR | Red Feng Test | ops@redfeng.co"
                  className="mt-2 w-full rounded-[12px] border border-amber-200 bg-white px-3 py-3 text-sm text-slate-900 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                />
              </label>

              <button
                type="submit"
                className="inline-flex w-full items-center justify-center rounded-[14px] bg-amber-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-amber-800 sm:w-auto"
              >
                Preview payload hold
              </button>
            </form>
          </div>
        </div>

        <div className="space-y-5">
          <div className={`rounded-[20px] border p-5 shadow-[0_14px_34px_rgba(15,23,42,0.04)] ${getStatusClasses(params.status)}`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.24em]">Hasil Test</p>
                <h2 className="mt-2 text-base font-semibold">{resultTitle}</h2>
              </div>
              <span className="rounded-[12px] border border-current px-3 py-1 text-xs font-semibold">
                {activePanel.toUpperCase()} {params.status ? `- ${params.status.toUpperCase()}` : ""}
              </span>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {resultRows.map(([label, value]) => (
                <div key={label} className="rounded-[14px] border border-current/20 bg-white/60 p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] opacity-70">{label}</p>
                  <p className="mt-2 break-words text-sm font-semibold">{value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[20px] border border-[#eee3d9] bg-white p-5 shadow-[0_14px_34px_rgba(15,23,42,0.04)]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-base font-semibold text-slate-950">Response Ringkas</h2>
              <Link
                href="/admin/pesawat/diagnostics"
                className="inline-flex items-center justify-center rounded-[12px] border border-[#ecd9c2] bg-[#fff7ef] px-3 py-2 text-xs font-semibold text-orange-600 transition hover:border-orange-200 hover:bg-orange-50"
              >
                Bersihkan hasil
              </Link>
            </div>
            <pre className="mt-4 max-h-[560px] overflow-auto rounded-[16px] border border-slate-200 bg-slate-950 p-4 text-xs leading-6 text-slate-100">
              {JSON.stringify(result || { note: "Jalankan test login atau search untuk melihat hasil." }, null, 2)}
            </pre>
          </div>

          <div className="rounded-[20px] border border-[#eee3d9] bg-white p-5 shadow-[0_14px_34px_rgba(15,23,42,0.04)]">
            <h2 className="text-base font-semibold text-slate-950">Checklist Interpretasi</h2>
            <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
              <li>Login sukses berarti base URL, user ID, password, dan path login sudah terbaca.</li>
              <li>Search sukses berarti token dapat dipakai untuk endpoint LowFareSchedule.</li>
              <li>Jika UAT butuh ignore SSL, pastikan hanya environment UAT yang memakai nilai TLS non-standar.</li>
              <li>Production sebaiknya tetap SSL normal sesuai jawaban tim Dharmawisata.</li>
            </ul>
          </div>
        </div>
      </div>
    </AdminProductWorkspace>
  )
}
