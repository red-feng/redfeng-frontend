import Link from "next/link"
import { redirect } from "next/navigation"
import AdminProductWorkspace from "@/app/components/AdminProductWorkspace"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { getAccessibleInternalProducts, hasInternalProductAccess } from "@/lib/internal-product-access"
import { DHARMAWISATA_AIRLINE_ENDPOINTS } from "@/lib/flights/dharmawisataAirlineApi"
import {
  autoDharmawisataSearchAndPreviewHold,
  checkFlightSchemaReadiness,
  previewDharmawisataHoldPayload,
  testDharmawisataAirlineEndpoint,
  testDharmawisataLogin,
  testDharmawisataSearch,
} from "./actions"

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

function asRecord(value: unknown): ResultRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as ResultRecord) : {}
}

function summarizeResult(result: ResultRecord | null) {
  if (!result) return []

  return [
    ["Status", asText(result.status) || asText(result.authStatus) || "-"],
    ["Message", asText(result.respMessage) || asText(result.authMessage) || asText(result.error) || "-"],
    ["Elapsed", result.elapsedMs ? `${result.elapsedMs} ms` : "-"],
    ["Endpoint", asText(result.endpoint) || "-"],
    ["Journeys", typeof result.journeyDepartCount === "number" ? `${result.journeyDepartCount}` : "-"],
    ["Search attempts", typeof result.searchAttemptCount === "number" ? `${result.searchAttemptCount}` : "-"],
    ["Missing columns", typeof result.missingColumnCount === "number" ? `${result.missingColumnCount}` : "-"],
  ]
}

const DEFAULT_AIRLINE_ENDPOINT_PAYLOAD = JSON.stringify(
  {},
  null,
  2,
)

async function ensureFlightDiagnosticsPageAccess() {
  const supabase = await createClient("admin")
  const adminSupabase = createAdminClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/admin/login?error=no-session")

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
  if (profile?.role !== "operations_manager" && profile?.role !== "superadmin") {
    redirect("/admin/dashboard?error=Akses%20diagnostics%20Pesawat%20hanya%20untuk%20Operations%20Manager")
  }

  const accessibleProducts = await getAccessibleInternalProducts(adminSupabase, user.id, profile?.role)
  if (!hasInternalProductAccess(accessibleProducts, "flight", "execute")) {
    redirect("/admin/dashboard?error=Akses%20produk%20Pesawat%20tidak%20diizinkan")
  }
}

export default async function AdminFlightsDiagnosticsPage({ searchParams }: { searchParams?: SearchParams }) {
  await ensureFlightDiagnosticsPageAccess()

  const params = (await searchParams) || {}
  const activePanel = params.panel || "login"
  const result = parseResult(params.result)
  const resultTitle = asText(result?.title) || "Belum ada hasil test"
  const resultRows = summarizeResult(result)
  const defaultDepartDate = getDefaultDepartDate()
  const requestDefaults = asRecord(result?.request)
  const routeDefaults = {
    origin: asText(requestDefaults.origin) || "CGK",
    destination: asText(requestDefaults.destination) || "SUB",
    departDate: asText(requestDefaults.departDate) || defaultDepartDate,
    returnDate: asText(requestDefaults.returnDate),
    tripType: asText(requestDefaults.tripType).toLowerCase() === "roundtrip" ? "round_trip" : "one_way",
    paxAdult: asText(requestDefaults.paxAdult) || "1",
    paxChild: asText(requestDefaults.paxChild) || "0",
    paxInfant: asText(requestDefaults.paxInfant) || "0",
  }

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
      preparedModules={["Schema readiness", "Login token", "Low fare search", "Airline endpoint explorer", "Redacted response", "Hold readiness"]}
    >
      <div className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="space-y-5">
          <div id="flight-diagnostics-schema" className="rounded-[20px] border border-[#eee3d9] bg-white p-5 shadow-[0_14px_34px_rgba(15,23,42,0.04)]">
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

          <div id="flight-diagnostics-login" className="rounded-[20px] border border-[#eee3d9] bg-white p-5 shadow-[0_14px_34px_rgba(15,23,42,0.04)]">
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

          <div className="rounded-[20px] border border-sky-200 bg-sky-50 p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-sky-700">Finance boundary</p>
                <h2 className="mt-2 text-base font-semibold text-slate-950">Saldo Agent Dipantau Finance Manager</h2>
                <p className="mt-1 text-sm leading-6 text-sky-800">
                  Diagnostics operasional tidak menampilkan nominal deposit supplier. Cek saldo Dharmawisata dipindahkan ke workspace Finance Manager.
                </p>
              </div>
              <span className="rounded-[12px] border border-sky-200 bg-white px-3 py-2 text-xs font-semibold text-sky-700">
                Finance Manager only
              </span>
            </div>
          </div>

          <div id="flight-diagnostics-auto" className="rounded-[20px] border border-amber-200 bg-amber-50 p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-amber-700">Simple Mode</p>
                <h2 className="mt-2 text-base font-semibold text-amber-950">Tes pesawat otomatis</h2>
                <p className="mt-2 text-sm leading-6 text-amber-800">
                  Tombol ini menjalankan login, fare search, lalu membuat preview payload hold tanpa membuat PNR supplier.
                </p>
              </div>
              <span className="rounded-[12px] border border-amber-300 bg-white px-3 py-1 text-xs font-semibold text-amber-800">
                Dry-run
              </span>
            </div>

            <form action={autoDharmawisataSearchAndPreviewHold} className="mt-5 space-y-4">
              <div className="grid gap-4 sm:grid-cols-4">
                <label className="text-sm font-semibold text-amber-950">
                  Origin
                  <input
                    name="origin"
                    defaultValue={routeDefaults.origin}
                    className="mt-2 h-11 w-full rounded-[12px] border border-amber-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                  />
                </label>
                <label className="text-sm font-semibold text-amber-950">
                  Destination
                  <input
                    name="destination"
                    defaultValue={routeDefaults.destination}
                    className="mt-2 h-11 w-full rounded-[12px] border border-amber-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                  />
                </label>
                <label className="text-sm font-semibold text-amber-950">
                  Tanggal
                  <input
                    type="date"
                    name="depart_date"
                    defaultValue={routeDefaults.departDate}
                    className="mt-2 h-11 w-full rounded-[12px] border border-amber-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                  />
                </label>
                <label className="text-sm font-semibold text-amber-950">
                  Trip
                  <select
                    name="trip_type"
                    defaultValue={routeDefaults.tripType}
                    className="mt-2 h-11 w-full rounded-[12px] border border-amber-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                  >
                    <option value="one_way">One way</option>
                    <option value="round_trip">Round trip</option>
                  </select>
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-4">
                <label className="text-sm font-semibold text-amber-950">
                  Tanggal pulang
                  <input
                    type="date"
                    name="return_date"
                    defaultValue={routeDefaults.returnDate}
                    className="mt-2 h-11 w-full rounded-[12px] border border-amber-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                  />
                </label>
                <label className="text-sm font-semibold text-amber-950">
                  Dewasa
                  <input
                    type="number"
                    name="pax_adult"
                    min={1}
                    defaultValue={routeDefaults.paxAdult}
                    className="mt-2 h-11 w-full rounded-[12px] border border-amber-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                  />
                </label>
                <label className="text-sm font-semibold text-amber-950">
                  Anak
                  <input
                    type="number"
                    name="pax_child"
                    min={0}
                    defaultValue={routeDefaults.paxChild}
                    className="mt-2 h-11 w-full rounded-[12px] border border-amber-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                  />
                </label>
                <label className="text-sm font-semibold text-amber-950">
                  Infant
                  <input
                    type="number"
                    name="pax_infant"
                    min={0}
                    defaultValue={routeDefaults.paxInfant}
                    className="mt-2 h-11 w-full rounded-[12px] border border-amber-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                  />
                </label>
              </div>

              <button
                type="submit"
                className="inline-flex w-full items-center justify-center rounded-[14px] bg-orange-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-orange-700"
              >
                Auto Search + Preview Hold
              </button>
            </form>
          </div>

          <div id="flight-diagnostics-search" className="rounded-[20px] border border-[#eee3d9] bg-white p-5 shadow-[0_14px_34px_rgba(15,23,42,0.04)]">
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
                    defaultValue={routeDefaults.origin}
                    className="mt-2 h-11 w-full rounded-[12px] border border-[#e8d8ca] bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                  />
                </label>
                <label className="text-sm font-semibold text-slate-700">
                  Destination
                  <input
                    name="destination"
                    defaultValue={routeDefaults.destination}
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
                    defaultValue={routeDefaults.departDate}
                    className="mt-2 h-11 w-full rounded-[12px] border border-[#e8d8ca] bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                  />
                </label>
                <label className="text-sm font-semibold text-slate-700">
                  Trip
                  <select
                    name="trip_type"
                    defaultValue={routeDefaults.tripType}
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
                  defaultValue={routeDefaults.returnDate}
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
                    defaultValue={routeDefaults.paxAdult}
                    className="mt-2 h-11 w-full rounded-[12px] border border-[#e8d8ca] bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                  />
                </label>
                <label className="text-sm font-semibold text-slate-700">
                  Anak
                  <input
                    type="number"
                    name="pax_child"
                    min={0}
                    defaultValue={routeDefaults.paxChild}
                    className="mt-2 h-11 w-full rounded-[12px] border border-[#e8d8ca] bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                  />
                </label>
                <label className="text-sm font-semibold text-slate-700">
                  Infant
                  <input
                    type="number"
                    name="pax_infant"
                    min={0}
                    defaultValue={routeDefaults.paxInfant}
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

          <details id="flight-diagnostics-hold-preview" className="group rounded-[20px] border border-amber-200 bg-amber-50 p-5">
            <summary className="flex cursor-pointer list-none flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-amber-700">Advanced/manual</p>
                <h2 className="mt-2 text-base font-semibold text-amber-900">Preview Payload Hold Manual</h2>
                <p className="mt-2 text-sm leading-6 text-amber-800">
                  Opsional untuk debugging detail. Tes normal cukup pakai Simple Mode di atas.
                </p>
              </div>
              <span className="rounded-[12px] border border-amber-300 bg-white px-3 py-1 text-xs font-semibold text-amber-800">
                Buka form manual
              </span>
            </summary>

            <form action={previewDharmawisataHoldPayload} className="mt-5 space-y-4 border-t border-amber-200 pt-5">
              <p className="text-sm leading-6 text-amber-800">
                Form ini hanya merakit payload `/Airline/Booking`. Action ini tidak membuat PNR dan tidak mengirim request booking ke supplier.
              </p>
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
                  defaultValue="MR | Red Feng Test | ops@redfeng.co | 1990-01-01 | Male | Adult"
                  placeholder="MR | Red Feng Test | ops@redfeng.co | 1990-01-01 | Male | Adult"
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
          </details>

          <details id="flight-diagnostics-airline-endpoints" className="group rounded-[20px] border border-slate-200 bg-white p-5 shadow-[0_14px_34px_rgba(15,23,42,0.04)]">
            <summary className="flex cursor-pointer list-none flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500">Supplier adapter</p>
                <h2 className="mt-2 text-base font-semibold text-slate-950">Airline Endpoint Explorer</h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Panel UAT untuk semua endpoint `Airline/*`. Payload tambahan dikirim sebagai JSON, sedangkan `userID` dan `accessToken` diisi otomatis.
                </p>
              </div>
              <span className="rounded-[12px] border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
                {DHARMAWISATA_AIRLINE_ENDPOINTS.length} endpoint
              </span>
            </summary>

            <form action={testDharmawisataAirlineEndpoint} className="mt-5 space-y-4 border-t border-slate-200 pt-5">
              <label className="block text-sm font-semibold text-slate-700">
                Endpoint
                <select
                  name="endpoint"
                  defaultValue="nationality"
                  className="mt-2 h-11 w-full rounded-[12px] border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                >
                  {DHARMAWISATA_AIRLINE_ENDPOINTS.map((endpoint) => (
                    <option key={endpoint.key} value={endpoint.key}>
                      {endpoint.label} - {endpoint.mode} - {endpoint.customerFlow}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-sm font-semibold text-slate-700">
                Payload JSON
                <textarea
                  name="payload_json"
                  rows={8}
                  defaultValue={DEFAULT_AIRLINE_ENDPOINT_PAYLOAD}
                  className="mt-2 w-full rounded-[12px] border border-slate-200 bg-slate-950 px-3 py-3 font-mono text-xs leading-6 text-slate-100 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                />
              </label>

              <label className="flex items-start gap-3 rounded-[14px] border border-rose-200 bg-rose-50 p-4 text-sm leading-6 text-rose-800">
                <input
                  type="checkbox"
                  name="allow_mutating"
                  className="mt-1 h-4 w-4 rounded border-rose-300 text-rose-600 focus:ring-rose-200"
                />
                <span>
                  Izinkan endpoint private/mutating seperti `Airline/Booking` atau `Airline/Issued`. Aktifkan hanya saat benar-benar ingin memanggil supplier.
                </span>
              </label>

              <div className="rounded-[14px] border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Status integrasi</p>
                <div className="mt-3 grid gap-2 text-xs leading-5 text-slate-600 sm:grid-cols-2">
                  {DHARMAWISATA_AIRLINE_ENDPOINTS.map((endpoint) => (
                    <div key={endpoint.key} className="rounded-[12px] border border-slate-200 bg-white p-3">
                      <p className="font-semibold text-slate-900">{endpoint.label}</p>
                      <p className="mt-1">{endpoint.summary}</p>
                    </div>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                className="inline-flex w-full items-center justify-center rounded-[14px] bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 sm:w-auto"
              >
                Test endpoint Airline
              </button>
            </form>
          </details>
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
              <li>Search sukses berarti token dapat dipakai untuk endpoint LowFareSchedule dan minimal satu journey live terbaca.</li>
              <li>Gunakan `holdPreviewHint` dari response search untuk mengisi payload hold bila perlu dry-run lebih dekat ke hasil supplier.</li>
              <li>Jika UAT butuh ignore SSL, pastikan hanya environment UAT yang memakai nilai TLS non-standar.</li>
              <li>Production sebaiknya tetap SSL normal sesuai jawaban tim Dharmawisata.</li>
            </ul>
          </div>
        </div>
      </div>
    </AdminProductWorkspace>
  )
}
