import { createAdminClient } from "@/lib/supabase/admin"
import { normalizeLocale } from "@/lib/i18n"
import { getCurrentLocale } from "@/lib/locale"
import { formatPackageMoney } from "@/lib/package-pricing"
import { handoffBookingToFinance } from "./actions"

type BookingRow = {
  id: string
  package_id: string | null
  booking_code: string | null
  customer_name: string | null
  pickup_date: string | null
  display_currency?: string | null
  display_subtotal_amount?: number | null
  subtotal_amount: number | null
  customer_admin_fee_amount: number | null
  customer_tax_amount: number | null
  final_payment_amount: number | null
  total_amount: number | null
  payment_status: string | null
  booking_status: string | null
  escrow_status: string | null
  merchant_arrived_at: string | null
  customer_picked_up_at: string | null
  merchant_picked_up_at: string | null
}

type ProductFilter =
  | "all"
  | "paket-tour"
  | "pesawat"
  | "hotel"
  | "bus-travel"
  | "kereta-api"
  | "kapal-laut"
  | "kapal-pesiar"

type PackageRow = {
  id: string
  title: string | null
}

function normalizeStatus(value: string | null) {
  return (value || "").trim().toLowerCase()
}

function formatDate(value: string | null) {
  if (!value) return "-"
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return parsed.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

function formatMoney(value: number | null) {
  return `Rp ${Number(value || 0).toLocaleString("id-ID")}`
}

function titleCaseStatus(value: string | null) {
  const normalized = normalizeStatus(value)
  if (!normalized) return "-"
  return normalized
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

function paymentTone(status: string | null) {
  const normalized = normalizeStatus(status)
  if (normalized === "paid") return "border-emerald-200 bg-emerald-50 text-emerald-700"
  if (normalized === "dp_paid") return "border-amber-200 bg-amber-50 text-amber-700"
  if (normalized === "cancelled") return "border-rose-200 bg-rose-50 text-rose-700"
  return "border-slate-200 bg-slate-100 text-slate-700"
}

function escrowTone(status: string | null) {
  const normalized = normalizeStatus(status)
  if (normalized === "held" || normalized === "partial_hold") return "border-orange-200 bg-orange-50 text-orange-700"
  if (normalized === "awaiting_admin_handoff" || normalized === "ready_for_payout") {
    return "border-sky-200 bg-sky-50 text-sky-700"
  }
  if (normalized === "paid_out") return "border-violet-200 bg-violet-50 text-violet-700"
  return "border-slate-200 bg-slate-100 text-slate-700"
}

function journeyPhase(booking: BookingRow) {
  if (normalizeStatus(booking.escrow_status) === "paid_out") {
    return { label: "Paid Out", tone: "border-violet-200 bg-violet-50 text-violet-700" }
  }
  if (normalizeStatus(booking.booking_status) === "finance_review") {
    return { label: "Ready for Finance", tone: "border-sky-200 bg-sky-50 text-sky-700" }
  }
  if (booking.merchant_picked_up_at) {
    return { label: "Go Confirmed", tone: "border-emerald-200 bg-emerald-50 text-emerald-700" }
  }
  if (booking.customer_picked_up_at) {
    return { label: "Picked Up", tone: "border-emerald-200 bg-emerald-50 text-emerald-700" }
  }
  if (booking.merchant_arrived_at) {
    return { label: "Awaiting Pickup", tone: "border-amber-200 bg-amber-50 text-amber-700" }
  }
  if (normalizeStatus(booking.payment_status) === "paid") {
    return { label: "Fully Paid", tone: "border-emerald-200 bg-emerald-50 text-emerald-700" }
  }
  if (normalizeStatus(booking.payment_status) === "dp_paid") {
    return { label: "DP Paid", tone: "border-amber-200 bg-amber-50 text-amber-700" }
  }
  return { label: titleCaseStatus(booking.booking_status), tone: "border-slate-200 bg-slate-100 text-slate-700" }
}

function canHandoffToFinance(booking: BookingRow) {
  return (
    normalizeStatus(booking.payment_status) === "paid" &&
    Boolean(booking.merchant_arrived_at) &&
    Boolean(booking.customer_picked_up_at) &&
    Boolean(booking.merchant_picked_up_at) &&
    !["finance_review", "finance_processing", "payout_completed"].includes(normalizeStatus(booking.booking_status))
  )
}

function hasCompleteAdminData(booking: BookingRow, packageTitle: string | null | undefined) {
  return Boolean(
    packageTitle &&
      booking.customer_name &&
      booking.pickup_date &&
      booking.total_amount !== null &&
      booking.subtotal_amount !== null &&
      booking.customer_admin_fee_amount !== null &&
      booking.customer_tax_amount !== null &&
      booking.final_payment_amount !== null,
  )
}

function normalizeProductFilter(value: string | undefined): ProductFilter {
  const normalized = String(value || "").trim().toLowerCase()
  if (
    normalized === "paket-tour" ||
    normalized === "pesawat" ||
    normalized === "hotel" ||
    normalized === "bus-travel" ||
    normalized === "kereta-api" ||
    normalized === "kapal-laut" ||
    normalized === "kapal-pesiar"
  ) {
    return normalized
  }

  return "all"
}

function deriveBookingProduct(booking: BookingRow): Exclude<ProductFilter, "all"> {
  if (booking.package_id) return "paket-tour"
  return "pesawat"
}

export default async function AdminBookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string; product?: string }>
}) {
  const params = await searchParams
  const adminSupabase = createAdminClient()
  const locale = normalizeLocale(await getCurrentLocale())
  const activeProduct = normalizeProductFilter(params.product)

  const { data: bookingsData, error } = await adminSupabase
    .from("bookings")
    .select(
      "id, package_id, booking_code, customer_name, pickup_date, display_currency, display_subtotal_amount, subtotal_amount, customer_admin_fee_amount, customer_tax_amount, final_payment_amount, total_amount, payment_status, booking_status, escrow_status, merchant_arrived_at, customer_picked_up_at, merchant_picked_up_at",
    )
    .order("created_at", { ascending: false })

  const bookings = (bookingsData as BookingRow[] | null) || []
  const packageIds = [...new Set(bookings.map((booking) => booking.package_id).filter(Boolean))]
  const { data: packageData } =
    packageIds.length > 0
      ? await adminSupabase.from("packages").select("id, title").in("id", packageIds)
      : { data: [] as PackageRow[] }

  const packageMap = new Map(((packageData as PackageRow[] | null) || []).map((pkg) => [pkg.id, pkg.title || "-"]))
  const validBookings = bookings.filter((booking) =>
    hasCompleteAdminData(booking, packageMap.get(booking.package_id || "")),
  )
  const incompleteBookings = bookings.filter(
    (booking) => !hasCompleteAdminData(booking, packageMap.get(booking.package_id || "")),
  )
  const filteredBookings =
    activeProduct === "all"
      ? validBookings
      : validBookings.filter((booking) => deriveBookingProduct(booking) === activeProduct)
  const filteredReadyForAdmin = filteredBookings.filter(
    (booking) => normalizeStatus(booking.booking_status) === "awaiting_admin_handoff",
  )
  const filteredInFinance = filteredBookings.filter(
    (booking) => normalizeStatus(booking.booking_status) === "finance_review",
  )
  const productFilters: Array<{ value: ProductFilter; label: string }> = [
    { value: "all", label: "Semua Produk" },
    { value: "paket-tour", label: "Paket Tour" },
    { value: "pesawat", label: "Pesawat" },
    { value: "hotel", label: "Hotel" },
    { value: "bus-travel", label: "Bus & Travel" },
    { value: "kereta-api", label: "Kereta Api" },
    { value: "kapal-laut", label: "Kapal Laut" },
    { value: "kapal-pesiar", label: "Kapal Pesiar" },
  ]

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fff8f1_0%,#f7f1e8_100%)] px-6 py-8 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-7xl space-y-8">
        <section className="rounded-[32px] border border-orange-200/60 bg-[linear-gradient(135deg,#7c2d12_0%,#c2410c_38%,#f97316_72%,#fdba74_100%)] px-8 py-10 text-white shadow-[0_30px_100px_rgba(146,64,14,0.18)]">
          <p className="inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.34em] text-orange-50">
            Admin Booking Control
          </p>
          <h1 className="mt-5 text-4xl font-semibold tracking-tight sm:text-5xl">
            Admin memvalidasi alur pickup lalu handoff payout ke finance.
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-8 text-orange-50/90">
            Setelah merchant klik Arrived, customer klik Picked up, dan merchant klik Go, admin mengirim booking ke finance untuk proses transfer. Halaman ini menjadi pusat booking lintas produk.
          </p>
        </section>

        {params.success && (
          <div className="rounded-[24px] border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-700">
            {params.success}
          </div>
        )}

        {params.error && (
          <div className="rounded-[24px] border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
            {params.error}
          </div>
        )}

        {incompleteBookings.length > 0 && (
          <div className="rounded-[24px] border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-700">
            {incompleteBookings.length} booking lama / belum lengkap disembunyikan dari queue admin karena data paket
            atau nominalnya belum sinkron.
          </div>
        )}

        <section className="rounded-[32px] border border-[#f3dbc3] bg-white/85 p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur-sm lg:p-7">
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-orange-500">Filter produk</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950">Booking tetap gabungan, bisa dipilah per produk</h2>
          <div className="mt-5 flex flex-wrap gap-2">
            {productFilters.map((filter) => {
              const href = filter.value === "all" ? "/admin/bookings" : `/admin/bookings?product=${filter.value}`
              const isActive = activeProduct === filter.value

              return (
                <a
                  key={filter.value}
                  href={href}
                  className={`inline-flex items-center rounded-full border px-4 py-2 text-sm font-semibold transition ${
                    isActive
                      ? "border-orange-200 bg-[#fff7ef] text-orange-600"
                      : "border-[#ecd9c2] bg-white text-slate-700 hover:border-orange-200 hover:bg-[#fff7ef] hover:text-orange-600"
                  }`}
                >
                  {filter.label}
                </a>
              )
            })}
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-[26px] border border-[#f0ddc7] bg-white px-5 py-5 shadow-[0_18px_44px_rgba(15,23,42,0.06)]">
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-orange-500">Total booking</p>
            <p className="mt-3 text-3xl font-semibold text-slate-950">{filteredBookings.length}</p>
          </div>
          <div className="rounded-[26px] border border-[#f0ddc7] bg-white px-5 py-5 shadow-[0_18px_44px_rgba(15,23,42,0.06)]">
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-orange-500">Siap handoff</p>
            <p className="mt-3 text-3xl font-semibold text-slate-950">{filteredReadyForAdmin.length}</p>
          </div>
          <div className="rounded-[26px] border border-[#f0ddc7] bg-white px-5 py-5 shadow-[0_18px_44px_rgba(15,23,42,0.06)]">
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-orange-500">Sedang di finance</p>
            <p className="mt-3 text-3xl font-semibold text-slate-950">{filteredInFinance.length}</p>
          </div>
        </section>

        <section className="rounded-[32px] border border-[#f3dbc3] bg-white/85 p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur-sm lg:p-7">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-orange-500">Admin handoff queue</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950">Validasi booking ke finance</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Admin hanya mengirim booking yang sudah lunas dan seluruh urutan pickup selesai.
            </p>
          </div>

          {error ? (
            <div className="mt-6 rounded-[24px] border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700">
              Gagal memuat data booking.
            </div>
          ) : filteredBookings.length === 0 ? (
            <div className="mt-6 rounded-[24px] border border-[#efe1cf] bg-[#fffaf3] p-5 text-sm text-slate-600">
              Belum ada data booking yang lengkap untuk filter produk ini.
            </div>
          ) : (
            <div className="mt-6 space-y-4">
              {filteredBookings.map((booking) => {
                const ready = canHandoffToFinance(booking)
                const phase = journeyPhase(booking)
                const packageTitle = packageMap.get(booking.package_id || "") || "-"
                const productLabel = productFilters.find((item) => item.value === deriveBookingProduct(booking))?.label || "Produk"

                return (
                  <article
                    key={booking.id}
                    className="rounded-[28px] border border-[#efe1cf] bg-[#fffaf3] p-5"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                          {booking.booking_code || booking.id}
                        </p>
                        <h3 className="mt-2 text-xl font-semibold text-slate-950">
                          {packageTitle}
                        </h3>
                        <p className="mt-2 text-sm text-slate-600">
                        <p className="mt-2 inline-flex rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-orange-700">
                          {productLabel}
                        </p>
                          {booking.customer_name || "-"} • {formatDate(booking.pickup_date)} • {formatMoney(booking.total_amount)}
                        </p>
                        {booking.display_currency && (
                          <p className="mt-2 text-xs text-slate-500">
                            Harga sesuai bahasa customer:{" "}
                            {formatPackageMoney(booking.display_subtotal_amount, booking.display_currency, locale)}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2 text-xs font-semibold">
                        <span className={`rounded-full border px-3 py-1 ${paymentTone(booking.payment_status)}`}>
                          {titleCaseStatus(booking.payment_status)}
                        </span>
                        <span className={`rounded-full border px-3 py-1 ${phase.tone}`}>
                          {phase.label}
                        </span>
                        <span className={`rounded-full border px-3 py-1 ${escrowTone(booking.escrow_status)}`}>
                          Escrow {titleCaseStatus(booking.escrow_status)}
                        </span>
                      </div>
                    </div>

                    <div className="mt-5 grid gap-3 md:grid-cols-3">
                      <div className="rounded-[20px] border border-white bg-white p-4 text-sm text-slate-700">
                        Arrived: {booking.merchant_arrived_at ? "Selesai" : "Menunggu"}
                      </div>
                      <div className="rounded-[20px] border border-white bg-white p-4 text-sm text-slate-700">
                        Picked up: {booking.customer_picked_up_at ? "Selesai" : "Menunggu"}
                      </div>
                      <div className="rounded-[20px] border border-white bg-white p-4 text-sm text-slate-700">
                        Go: {booking.merchant_picked_up_at ? "Selesai" : "Menunggu"}
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 md:grid-cols-4">
                      <div className="rounded-[20px] border border-white bg-white p-4">
                        <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400">Subtotal Paket</p>
                        <p className="mt-2 text-sm font-semibold text-slate-900">{formatMoney(booking.subtotal_amount)}</p>
                      </div>
                      <div className="rounded-[20px] border border-white bg-white p-4">
                        <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400">Admin Fee</p>
                        <p className="mt-2 text-sm font-semibold text-slate-900">{formatMoney(booking.customer_admin_fee_amount)}</p>
                      </div>
                      <div className="rounded-[20px] border border-white bg-white p-4">
                        <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400">Pajak</p>
                        <p className="mt-2 text-sm font-semibold text-slate-900">{formatMoney(booking.customer_tax_amount)}</p>
                      </div>
                      <div className="rounded-[20px] border border-white bg-white p-4">
                        <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400">Sisa Pelunasan</p>
                        <p className="mt-2 text-sm font-semibold text-slate-900">{formatMoney(booking.final_payment_amount)}</p>
                      </div>
                    </div>

                    <div className="mt-5 flex flex-wrap gap-3">
                      <form action={handoffBookingToFinance}>
                        <input type="hidden" name="booking_id" value={booking.id} />
                        <button
                          type="submit"
                          disabled={!ready}
                          className="rounded-[20px] bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                        >
                          Kirim ke Finance
                        </button>
                      </form>
                      {!ready && (
                        <span className="rounded-[20px] border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-700">
                          Menunggu lunas dan urutan pickup lengkap
                        </span>
                      )}
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
