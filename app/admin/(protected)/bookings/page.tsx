import Link from "next/link"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { normalizeLocale } from "@/lib/i18n"
import { getCurrentLocale } from "@/lib/locale"
import { isAdminExecutionRole } from "@/lib/internal-roles"
import { formatPackageMoney } from "@/lib/package-pricing"
import { isBookingExpiredForNonPayment, isBookingPastRetentionWindow } from "@/lib/bookings/draft-cleanup"
import { getEscrowStatusTone, getJourneyStageTone, getPaymentStatusTone, normalizeStatus } from "@/lib/status-tones"
import { cleanupExpiredPendingBookings, handoffBookingToFinance } from "./actions"

type BookingRow = {
  id: string
  package_id: string | null
  booking_code: string | null
  customer_name: string | null
  pickup_date: string | null
  created_at: string | null
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

type QueueFilter = "all" | "needs-attention" | "ready" | "in-finance"
type AttentionFocus = "all" | "payment" | "pickup" | "overdue" | "aging-ready"
type SortMode = "created_desc" | "pickup_asc" | "amount_desc" | "urgent_desc"

type PackageRow = {
  id: string
  title: string | null
  merchant_id: string | null
}

type MerchantRow = {
  id: string
  brand_name: string | null
  company_name: string | null
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

function daysSince(value: string | null | undefined) {
  if (!value) return 0
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return 0
  const diff = Date.now() - parsed.getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24))
}

function formatMoney(value: number | null) {
  return `Rp ${Number(value || 0).toLocaleString("id-ID")}`
}

function isVisiblePaidBooking(booking: BookingRow) {
  const paymentStatus = normalizeStatus(booking.payment_status)
  return paymentStatus === "paid" || paymentStatus === "dp_paid" || paymentStatus === "refund_pending_review"
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

function resolvePaymentStatusLabel(value: string | null) {
  const normalized = normalizeStatus(value)
  if (normalized === "refund_pending_review") return "Refund Ditinjau"
  if (normalized === "dp_paid") return "Customer DP Paid"
  return titleCaseStatus(value)
}

function resolveEscrowStatusLabel(value: string | null) {
  const normalized = normalizeStatus(value)
  if (normalized === "refund_review") return "Refund Review"
  return titleCaseStatus(value)
}

function paymentTone(status: string | null) {
  return getPaymentStatusTone(status, "bordered")
}

function escrowTone(status: string | null) {
  return getEscrowStatusTone(status, "bordered")
}

function journeyPhase(booking: BookingRow) {
  if (normalizeStatus(booking.payment_status) === "refund_pending_review") {
    return { label: "Refund Review", tone: getJourneyStageTone("fallback", "bordered") }
  }
  if (normalizeStatus(booking.escrow_status) === "paid_out") {
    return { label: "Paid Out", tone: getJourneyStageTone("paid_out", "bordered") }
  }
  if (normalizeStatus(booking.booking_status) === "finance_review") {
    return { label: "Ready for Finance", tone: getJourneyStageTone("ready_for_finance", "bordered") }
  }
  if (booking.merchant_picked_up_at) {
    return { label: "Go Confirmed", tone: getJourneyStageTone("go_confirmed", "bordered") }
  }
  if (booking.customer_picked_up_at) {
    return { label: "Picked Up", tone: getJourneyStageTone("picked_up", "bordered") }
  }
  if (booking.merchant_arrived_at) {
    return { label: "Awaiting Pickup", tone: getJourneyStageTone("awaiting_pickup", "bordered") }
  }
  if (normalizeStatus(booking.payment_status) === "paid") {
    return { label: "Fully Paid", tone: getJourneyStageTone("fully_paid", "bordered") }
  }
  if (normalizeStatus(booking.payment_status) === "dp_paid") {
    return { label: "Customer DP Paid", tone: getJourneyStageTone("dp_paid", "bordered") }
  }
  return { label: titleCaseStatus(booking.booking_status), tone: getJourneyStageTone("fallback", "bordered") }
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

function isPickupFlowIncomplete(booking: BookingRow) {
  return !booking.merchant_arrived_at || !booking.customer_picked_up_at || !booking.merchant_picked_up_at
}

function isOverduePickup(booking: BookingRow) {
  if (!booking.pickup_date) return false
  const pickupDate = new Date(booking.pickup_date)
  if (Number.isNaN(pickupDate.getTime())) return false
  return pickupDate.getTime() < Date.now() && isPickupFlowIncomplete(booking)
}

function isReadyAgingBooking(booking: BookingRow) {
  return canHandoffToFinance(booking) && daysSince(booking.created_at) >= 1
}

function deriveAttentionReasons(booking: BookingRow) {
  const reasons: Array<{ key: Exclude<AttentionFocus, "all">; label: string; note: string }> = []

  if (normalizeStatus(booking.payment_status) === "refund_pending_review") {
    reasons.push({
      key: "payment",
      label: "Refund review otomatis",
      note: "Booking DP melewati batas pelunasan H-3 dan sudah dipindahkan ke antrean refund review finance.",
    })
    return reasons
  }

  if (normalizeStatus(booking.payment_status) !== "paid") {
    reasons.push({
      key: "payment",
      label: "Payment belum lunas",
      note: "Booking belum bisa handoff karena status payment masih belum Fully Paid.",
    })
  }

  if (normalizeStatus(booking.payment_status) === "paid" && isPickupFlowIncomplete(booking)) {
    reasons.push({
      key: "pickup",
      label: "Urutan pickup belum lengkap",
      note: "Admin masih menunggu Arrived, Picked Up, atau Go selesai.",
    })
  }

  if (isOverduePickup(booking)) {
    reasons.push({
      key: "overdue",
      label: "Pickup date lewat jadwal",
      note: "Tanggal pickup sudah lewat tetapi flow operasional masih belum lengkap.",
    })
  }

  if (isReadyAgingBooking(booking)) {
    reasons.push({
      key: "aging-ready",
      label: "Siap handoff tapi belum dikirim",
      note: "Booking sudah memenuhi syarat, tetapi belum masuk ke Finance dalam 1 hari terakhir.",
    })
  }

  return reasons
}

function deriveActionNow(booking: BookingRow) {
  if (normalizeStatus(booking.payment_status) === "refund_pending_review") {
    return "Pantau antrean refund finance dan pastikan booking ini tidak diproses lagi sebagai handoff payout biasa."
  }
  if (normalizeStatus(booking.payment_status) !== "paid") {
    return "Follow up pembayaran customer sampai status booking Fully Paid."
  }
  if (isOverduePickup(booking)) {
    return "Hubungi merchant atau tim ops untuk cek kenapa flow pickup belum selesai meski tanggal sudah lewat."
  }
  if (isPickupFlowIncomplete(booking)) {
    return "Pastikan merchant update milestone Arrived, Picked Up, dan Go secara lengkap."
  }
  if (isReadyAgingBooking(booking)) {
    return "Booking ini sudah siap. Admin sebaiknya kirim ke Finance agar antrean tidak menumpuk."
  }
  return "Lanjutkan validasi booking sesuai status operasional terbaru."
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

function normalizeQueueFilter(value: string | undefined): QueueFilter {
  const normalized = String(value || "").trim().toLowerCase()
  if (normalized === "needs-attention" || normalized === "ready" || normalized === "in-finance") {
    return normalized
  }

  return "all"
}

function normalizeAttentionFocus(value: string | undefined): AttentionFocus {
  const normalized = String(value || "").trim().toLowerCase()
  if (normalized === "payment" || normalized === "pickup" || normalized === "overdue" || normalized === "aging-ready") {
    return normalized
  }
  return "all"
}

function normalizeSortMode(value: string | undefined): SortMode {
  const normalized = String(value || "").trim().toLowerCase()
  if (normalized === "pickup_asc" || normalized === "amount_desc" || normalized === "urgent_desc") {
    return normalized
  }
  return "created_desc"
}

function deriveBookingProduct(booking: BookingRow): Exclude<ProductFilter, "all"> {
  if (booking.package_id) return "paket-tour"
  return "pesawat"
}

function isNeedsAttentionBooking(booking: BookingRow) {
  return normalizeStatus(booking.booking_status) !== "finance_review" && deriveAttentionReasons(booking).length > 0
}

function matchesAttentionFocus(booking: BookingRow, focus: AttentionFocus) {
  if (focus === "all") return true
  return deriveAttentionReasons(booking).some((reason) => reason.key === focus)
}

function buildFilterHref(product: ProductFilter, queue: QueueFilter, focus: AttentionFocus, q: string, sort: SortMode) {
  const params = new URLSearchParams()
  if (product !== "all") params.set("product", product)
  if (queue !== "all") params.set("queue", queue)
  if (focus !== "all") params.set("focus", focus)
  if (q) params.set("q", q)
  if (sort !== "created_desc") params.set("sort", sort)
  const query = params.toString()
  return query ? `/admin/bookings?${query}` : "/admin/bookings"
}

export default async function AdminBookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string; product?: string; queue?: string; focus?: string; q?: string; sort?: string }>
}) {
  const params = await searchParams
  const adminSupabase = createAdminClient()
  const supabase = await createClient()
  const locale = normalizeLocale(await getCurrentLocale())
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const { data: currentProfile } = user
    ? await supabase.from("profiles").select("role").eq("id", user.id).single()
    : { data: null }
  const canExecuteAdminOps = isAdminExecutionRole(currentProfile?.role)
  const successMessage = params.success ? String(params.success) : ""
  const errorMessage = params.error ? String(params.error) : ""
  const activeProduct = normalizeProductFilter(params.product)
  const activeQueue = normalizeQueueFilter(params.queue)
  const activeFocus = normalizeAttentionFocus(params.focus)
  const searchQuery = String(params.q || "").trim().toLowerCase()
  const sortMode = normalizeSortMode(params.sort)

  const { data: bookingsData, error } = await adminSupabase
    .from("bookings")
    .select(
      "id, package_id, booking_code, customer_name, pickup_date, created_at, display_currency, display_subtotal_amount, subtotal_amount, customer_admin_fee_amount, customer_tax_amount, final_payment_amount, total_amount, payment_status, booking_status, escrow_status, merchant_arrived_at, customer_picked_up_at, merchant_picked_up_at",
    )
    .order("created_at", { ascending: false })

  const bookings = (bookingsData as BookingRow[] | null) || []
  const packageIds = [...new Set(bookings.map((booking) => booking.package_id).filter(Boolean))]
  const { data: packageData } =
    packageIds.length > 0
      ? await adminSupabase.from("packages").select("id, title, merchant_id").in("id", packageIds)
      : { data: [] as PackageRow[] }

  const packages = (packageData as PackageRow[] | null) || []
  const merchantIds = [...new Set(packages.map((pkg) => pkg.merchant_id).filter(Boolean))] as string[]
  const { data: merchantsData } =
    merchantIds.length > 0
      ? await adminSupabase.from("merchants").select("id, brand_name, company_name").in("id", merchantIds)
      : { data: [] as MerchantRow[] }

  const packageMap = new Map(packages.map((pkg) => [pkg.id, pkg.title || "-"]))
  const packageMerchantMap = new Map(packages.map((pkg) => [pkg.id, pkg.merchant_id]))
  const merchantMap = new Map(
    (((merchantsData as MerchantRow[] | null) || []) as MerchantRow[]).map((merchant) => [
      merchant.id,
      merchant.brand_name || merchant.company_name || merchant.id,
    ]),
  )
  const validBookings = bookings.filter(
    (booking) => hasCompleteAdminData(booking, packageMap.get(booking.package_id || "")) && isVisiblePaidBooking(booking),
  )
  const incompleteBookings = bookings.filter(
    (booking) => !hasCompleteAdminData(booking, packageMap.get(booking.package_id || "")),
  )

  const productScopedBookings =
    activeProduct === "all"
      ? validBookings
      : validBookings.filter((booking) => deriveBookingProduct(booking) === activeProduct)

  const searchedBookings = productScopedBookings.filter((booking) => {
    if (!searchQuery) return true
    const packageTitle = packageMap.get(booking.package_id || "") || ""
    const merchantName = merchantMap.get(packageMerchantMap.get(booking.package_id || "") || "") || ""
    return [booking.booking_code || "", booking.id, booking.customer_name || "", packageTitle, merchantName]
      .map((value) => value.toLowerCase())
      .some((value) => value.includes(searchQuery))
  })

  const filteredBookings = searchedBookings.filter((booking) => {
    if (activeQueue === "needs-attention") return isNeedsAttentionBooking(booking) && matchesAttentionFocus(booking, activeFocus)
    if (activeQueue === "ready") return canHandoffToFinance(booking)
    if (activeQueue === "in-finance") return normalizeStatus(booking.booking_status) === "finance_review"
    return true
  })
  const sortedBookings = [...filteredBookings].sort((a, b) => {
    if (sortMode === "pickup_asc") {
      const timeA = a.pickup_date ? new Date(a.pickup_date).getTime() : Number.MAX_SAFE_INTEGER
      const timeB = b.pickup_date ? new Date(b.pickup_date).getTime() : Number.MAX_SAFE_INTEGER
      if (timeA !== timeB) return timeA - timeB
    } else if (sortMode === "amount_desc") {
      const amountDiff = Number(b.total_amount || 0) - Number(a.total_amount || 0)
      if (amountDiff !== 0) return amountDiff
    } else if (sortMode === "urgent_desc") {
      const overdueDiff = Number(isOverduePickup(b)) - Number(isOverduePickup(a))
      if (overdueDiff !== 0) return overdueDiff
      const readyAgingDiff = Number(isReadyAgingBooking(b)) - Number(isReadyAgingBooking(a))
      if (readyAgingDiff !== 0) return readyAgingDiff
      const attentionDiff = deriveAttentionReasons(b).length - deriveAttentionReasons(a).length
      if (attentionDiff !== 0) return attentionDiff
    }

    const createdAtB = b.created_at ? new Date(b.created_at).getTime() : 0
    const createdAtA = a.created_at ? new Date(a.created_at).getTime() : 0
    return createdAtB - createdAtA
  })

  const filteredReadyForAdmin = sortedBookings.filter((booking) => canHandoffToFinance(booking))
  const filteredInFinance = sortedBookings.filter(
    (booking) => normalizeStatus(booking.booking_status) === "finance_review",
  )
  const cleanupPendingCount = bookings.filter((booking) => isBookingExpiredForNonPayment(booking)).length
  const cleanupRetentionCount = bookings.filter((booking) => isBookingPastRetentionWindow(booking)).length
  const needsAttentionCount = productScopedBookings.filter((booking) => isNeedsAttentionBooking(booking)).length
  const paymentAttentionCount = productScopedBookings.filter(
    (booking) => isNeedsAttentionBooking(booking) && matchesAttentionFocus(booking, "payment"),
  ).length
  const pickupAttentionCount = productScopedBookings.filter(
    (booking) => isNeedsAttentionBooking(booking) && matchesAttentionFocus(booking, "pickup"),
  ).length
  const overdueAttentionCount = productScopedBookings.filter(
    (booking) => isNeedsAttentionBooking(booking) && matchesAttentionFocus(booking, "overdue"),
  ).length
  const agingReadyCount = productScopedBookings.filter((booking) => matchesAttentionFocus(booking, "aging-ready")).length

  const attentionFocusFilters: Array<{ value: AttentionFocus; label: string; count: number }> = [
    { value: "all", label: "Semua blocker", count: needsAttentionCount },
    { value: "payment", label: "Payment", count: paymentAttentionCount },
    { value: "pickup", label: "Pickup", count: pickupAttentionCount },
    { value: "overdue", label: "Overdue", count: overdueAttentionCount },
    { value: "aging-ready", label: "Ready aging", count: agingReadyCount },
  ]

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
  const queueFilters: Array<{ value: QueueFilter; label: string; count: number }> = [
    { value: "all", label: "Semua Queue", count: searchedBookings.length },
    { value: "needs-attention", label: "Needs Attention", count: needsAttentionCount },
    { value: "ready", label: "Ready for Finance", count: productScopedBookings.filter((booking) => canHandoffToFinance(booking)).length },
    {
      value: "in-finance",
      label: "In Finance",
      count: productScopedBookings.filter((booking) => normalizeStatus(booking.booking_status) === "finance_review").length,
    },
  ]
  const sortOptions: Array<{ value: SortMode; label: string }> = [
    { value: "created_desc", label: "Booking terbaru" },
    { value: "pickup_asc", label: "Pickup terdekat" },
    { value: "amount_desc", label: "Nominal terbesar" },
    { value: "urgent_desc", label: "Paling urgent" },
  ]

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fff8f1_0%,#f7f1e8_100%)] px-4 py-5 sm:px-6 sm:py-6 md:px-8 md:py-8 lg:px-10">
      <div className="mx-auto max-w-7xl space-y-5 sm:space-y-6 lg:space-y-8">
        {successMessage ? (
          <div className="rounded-[22px] border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-700 shadow-[0_18px_44px_rgba(15,23,42,0.06)]">
            {successMessage}
          </div>
        ) : null}
        {errorMessage ? (
          <div className="rounded-[22px] border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700 shadow-[0_18px_44px_rgba(15,23,42,0.06)]">
            {errorMessage}
          </div>
        ) : null}

        <section className="rounded-[28px] border border-orange-200/60 bg-[linear-gradient(135deg,#7c2d12_0%,#c2410c_38%,#f97316_72%,#fdba74_100%)] px-5 py-6 text-white shadow-[0_30px_100px_rgba(146,64,14,0.18)] sm:rounded-[32px] sm:px-8 sm:py-8 lg:px-10">
          <p className="inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.34em] text-orange-50">
            Booking Center
          </p>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:mt-5 sm:text-4xl lg:text-5xl">
            Booking Center untuk monitoring dan handoff booking lintas produk.
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-orange-50/90 sm:mt-4 sm:text-base sm:leading-8">
            Semua booking customer dikumpulkan di sini sebagai pusat kontrol lintas produk. Admin bisa memfilter per channel, memantau status operasional, melihat queue yang butuh perhatian cepat, lalu mengirim booking yang siap ke finance.
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
            {incompleteBookings.length} booking lama / belum lengkap disembunyikan dari queue admin karena data paket atau nominalnya belum sinkron.
          </div>
        )}

        <section className="rounded-[24px] border border-[#f3dbc3] bg-white/85 p-5 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur-sm sm:rounded-[32px] sm:p-6 lg:p-7">
          <form className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_260px_auto]">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-orange-500">Search</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950">Cari booking</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Pencarian mencakup booking code, nama customer, judul package, dan nama merchant untuk booking Paket Tour.
              </p>
              <input
                type="text"
                name="q"
                defaultValue={params.q || ""}
                placeholder="Booking code, customer, package title, atau merchant"
                className="mt-4 w-full rounded-[18px] border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
              />
              {activeProduct !== "all" ? <input type="hidden" name="product" value={activeProduct} /> : null}
              {activeQueue !== "all" ? <input type="hidden" name="queue" value={activeQueue} /> : null}
              {activeFocus !== "all" ? <input type="hidden" name="focus" value={activeFocus} /> : null}
            </div>

            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-orange-500">Sort</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950">Urutkan</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Pilih urutan yang paling cocok untuk mode kerja admin hari ini.
              </p>
              <select
                name="sort"
                defaultValue={sortMode}
                className="mt-4 w-full rounded-[18px] border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
              >
                {sortOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-wrap items-end gap-3">
              <button className="inline-flex items-center justify-center rounded-[18px] bg-orange-500 px-5 py-3 text-sm font-semibold text-white shadow-[0_12px_28px_rgba(249,115,22,0.22)] transition hover:bg-orange-600">
                Terapkan
              </button>
              <Link
                href={buildFilterHref(activeProduct, activeQueue, activeFocus, "", "created_desc")}
                className="inline-flex items-center justify-center rounded-[18px] border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400"
              >
                Reset
              </Link>
            </div>
          </form>
        </section>

        <section className="rounded-[24px] border border-[#f3dbc3] bg-white/85 p-5 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur-sm sm:rounded-[32px] sm:p-6 lg:p-7">
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-orange-500">Filter produk</p>
          <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-slate-950 sm:text-2xl">Queue gabungan, filter per produk</h2>
          <div className="mt-5 flex flex-wrap gap-2">
            {productFilters.map((filter) => {
              const isActive = activeProduct === filter.value

              return (
                <Link
                  key={filter.value}
                  href={buildFilterHref(filter.value, activeQueue, activeFocus, searchQuery, sortMode)}
                  className={`inline-flex items-center rounded-full border px-4 py-2 text-sm font-semibold transition ${
                    isActive
                      ? "border-orange-200 bg-[#fff7ef] text-orange-600"
                      : "border-[#ecd9c2] bg-white text-slate-700 hover:border-orange-200 hover:bg-[#fff7ef] hover:text-orange-600"
                  }`}
                >
                  {filter.label}
                </Link>
              )
            })}
          </div>
        </section>

        <section className="grid gap-4 sm:gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-[24px] border border-[#f3dbc3] bg-white/85 p-5 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur-sm sm:rounded-[32px] sm:p-6 lg:p-7">
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-orange-500">Needs Attention</p>
            <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-slate-950 sm:text-2xl">Queue yang harus dicek lebih dulu</h2>
            <div className="mt-5 grid gap-3 sm:mt-6 sm:gap-4 md:grid-cols-3">
              <Link
                href={buildFilterHref(activeProduct, "needs-attention", activeFocus, searchQuery, sortMode)}
                className="rounded-[24px] border border-[#efe1cf] bg-[#fffaf3] p-5 transition hover:-translate-y-0.5 hover:border-orange-200"
              >
                <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-orange-500">Needs Attention</p>
                <p className="mt-3 text-3xl font-semibold text-slate-950">{needsAttentionCount}</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">Booking yang belum siap handoff atau status operasionalnya masih macet.</p>
              </Link>
              <Link
                href={buildFilterHref(activeProduct, "ready", "all", searchQuery, sortMode)}
                className="rounded-[24px] border border-[#efe1cf] bg-white p-5 transition hover:-translate-y-0.5 hover:border-orange-200"
              >
                <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-orange-500">Ready for Finance</p>
                <p className="mt-3 text-3xl font-semibold text-slate-950">
                  {productScopedBookings.filter((booking) => canHandoffToFinance(booking)).length}
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-600">Booking yang siap atau sudah otomatis masuk queue finance.</p>
              </Link>
              <Link
                href={buildFilterHref(activeProduct, "in-finance", "all", searchQuery, sortMode)}
                className="rounded-[24px] border border-[#efe1cf] bg-white p-5 transition hover:-translate-y-0.5 hover:border-orange-200"
              >
                <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-orange-500">In Finance</p>
                <p className="mt-3 text-3xl font-semibold text-slate-950">
                  {productScopedBookings.filter((booking) => normalizeStatus(booking.booking_status) === "finance_review").length}
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-600">Booking yang sudah keluar dari admin dan sedang diproses finance.</p>
              </Link>
            </div>
          </div>

          <div className="rounded-[24px] border border-[#f3dbc3] bg-white/85 p-5 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur-sm sm:rounded-[32px] sm:p-6 lg:p-7">
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-orange-500">Queue filter</p>
            <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-slate-950 sm:text-2xl">Pilih mode kerja admin</h2>
            <div className="mt-5 flex flex-wrap gap-2">
              {queueFilters.map((filter) => {
                const isActive = activeQueue === filter.value

                return (
                  <Link
                    key={filter.value}
                    href={buildFilterHref(activeProduct, filter.value, filter.value === "needs-attention" ? activeFocus : "all", searchQuery, sortMode)}
                    className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition ${
                      isActive
                        ? "border-orange-200 bg-[#fff7ef] text-orange-600"
                        : "border-[#ecd9c2] bg-white text-slate-700 hover:border-orange-200 hover:bg-[#fff7ef] hover:text-orange-600"
                    }`}
                  >
                    {filter.label}
                    <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-orange-500 px-1.5 py-0.5 text-[11px] font-semibold leading-none text-white">
                      {filter.count > 99 ? "99+" : filter.count}
                    </span>
                  </Link>
                )
              })}
            </div>
          </div>
        </section>

        {activeQueue === "needs-attention" && (
          <section className="rounded-[24px] border border-[#f3dbc3] bg-white/85 p-5 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur-sm sm:rounded-[32px] sm:p-6 lg:p-7">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-orange-500">Actionable focus</p>
                <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-slate-950 sm:text-2xl">Pilah blocker berdasarkan jenis masalah</h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Fokus ini membantu admin memecah antrian berdasarkan penyebab booking tertahan, jadi follow up harian bisa lebih terarah.
                </p>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              {attentionFocusFilters.map((filter) => {
                const isActive = activeFocus === filter.value

                return (
                  <Link
                    key={filter.value}
                    href={buildFilterHref(activeProduct, "needs-attention", filter.value, searchQuery, sortMode)}
                    className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition ${
                      isActive
                        ? "border-orange-200 bg-[#fff7ef] text-orange-600"
                        : "border-[#ecd9c2] bg-white text-slate-700 hover:border-orange-200 hover:bg-[#fff7ef] hover:text-orange-600"
                    }`}
                  >
                    {filter.label}
                    <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-orange-500 px-1.5 py-0.5 text-[11px] font-semibold leading-none text-white">
                      {filter.count > 99 ? "99+" : filter.count}
                    </span>
                  </Link>
                )
              })}
            </div>

            <div className="mt-5 grid gap-3 sm:mt-6 sm:gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-[24px] border border-[#efe1cf] bg-[#fffaf3] p-5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-orange-500">Payment follow up</p>
                <p className="mt-3 text-3xl font-semibold text-slate-950">{paymentAttentionCount}</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">Booking belum Fully Paid sehingga belum boleh masuk ke finance.</p>
              </div>
              <div className="rounded-[24px] border border-[#efe1cf] bg-[#fffaf3] p-5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-orange-500">Pickup incomplete</p>
                <p className="mt-3 text-3xl font-semibold text-slate-950">{pickupAttentionCount}</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">Milestone Arrived, Picked Up, atau Go masih belum lengkap.</p>
              </div>
              <div className="rounded-[24px] border border-[#efe1cf] bg-[#fffaf3] p-5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-orange-500">Overdue pickup</p>
                <p className="mt-3 text-3xl font-semibold text-slate-950">{overdueAttentionCount}</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">Tanggal pickup sudah lewat, tetapi flow operasional masih tertahan.</p>
              </div>
              <div className="rounded-[24px] border border-[#efe1cf] bg-[#fffaf3] p-5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-orange-500">Ready aging</p>
                <p className="mt-3 text-3xl font-semibold text-slate-950">{agingReadyCount}</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">Booking siap handoff lebih dari 1 hari tetapi belum dikirim ke finance.</p>
              </div>
            </div>
          </section>
        )}

        <section className="grid gap-3 sm:gap-4 md:grid-cols-2 xl:grid-cols-5">
          <div className="rounded-[22px] border border-[#f0ddc7] bg-white px-4 py-4 shadow-[0_18px_44px_rgba(15,23,42,0.06)] sm:rounded-[26px] sm:px-5 sm:py-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-orange-500">Total booking</p>
            <p className="mt-3 text-2xl font-semibold text-slate-950 sm:text-3xl">{filteredBookings.length}</p>
          </div>
          <div className="rounded-[22px] border border-[#f0ddc7] bg-white px-4 py-4 shadow-[0_18px_44px_rgba(15,23,42,0.06)] sm:rounded-[26px] sm:px-5 sm:py-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-orange-500">Siap handoff</p>
            <p className="mt-3 text-2xl font-semibold text-slate-950 sm:text-3xl">{filteredReadyForAdmin.length}</p>
          </div>
          <div className="rounded-[22px] border border-[#f0ddc7] bg-white px-4 py-4 shadow-[0_18px_44px_rgba(15,23,42,0.06)] sm:rounded-[26px] sm:px-5 sm:py-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-orange-500">Sedang di finance</p>
            <p className="mt-3 text-2xl font-semibold text-slate-950 sm:text-3xl">{filteredInFinance.length}</p>
          </div>
          <div className="rounded-[22px] border border-amber-200 bg-amber-50 px-4 py-4 shadow-[0_18px_44px_rgba(15,23,42,0.06)] sm:rounded-[26px] sm:px-5 sm:py-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-amber-600">Cleanup H+1</p>
            <p className="mt-3 text-2xl font-semibold text-slate-950 sm:text-3xl">{cleanupPendingCount}</p>
            <p className="mt-2 text-xs leading-5 text-slate-600">Booking pending yang sudah lewat H+1 dan siap dihapus.</p>
          </div>
          <div className="rounded-[22px] border border-sky-200 bg-sky-50 px-4 py-4 shadow-[0_18px_44px_rgba(15,23,42,0.06)] sm:rounded-[26px] sm:px-5 sm:py-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-sky-600">Retensi 15 Bulan</p>
            <p className="mt-3 text-2xl font-semibold text-slate-950 sm:text-3xl">{cleanupRetentionCount}</p>
            <p className="mt-2 text-xs leading-5 text-slate-600">Booking berbayar yang sudah melewati masa simpan 15 bulan.</p>
          </div>
        </section>

        <section className="rounded-[24px] border border-[#f3dbc3] bg-white/85 p-5 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur-sm sm:rounded-[32px] sm:p-6 lg:p-7">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-orange-500">Queue booking</p>
              <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-slate-950 sm:text-2xl">Pantau booking ke finance</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Booking normal yang sudah lunas dan urutan pickup lengkap akan masuk queue finance secara semi-otomatis. Admin tetap memantau dan bisa melakukan handoff manual jika diperlukan.
              </p>
              <p className="mt-2 text-xs leading-6 text-slate-500">
                Urutan aktif: {sortOptions.find((option) => option.value === sortMode)?.label || "Booking terbaru"}.
              </p>
            </div>
            {canExecuteAdminOps ? (
              <form action={cleanupExpiredPendingBookings} className="rounded-[20px] border border-[#f0ddc7] bg-[#fffaf3] p-3 lg:min-w-[320px]">
                <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-orange-500">Cleanup</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Jalankan pembersihan booking pending yang sudah lewat H+1 dan booking berbayar yang sudah melewati retensi 15 bulan.
                </p>
                <button
                  type="submit"
                  className="mt-3 inline-flex w-full items-center justify-center rounded-[18px] bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  Cleanup
                </button>
              </form>
            ) : null}
          </div>

          {error ? (
            <div className="mt-6 rounded-[24px] border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700">
              Gagal memuat data booking.
            </div>
          ) : sortedBookings.length === 0 ? (
            <div className="mt-6 rounded-[24px] border border-[#efe1cf] bg-[#fffaf3] p-5 text-sm text-slate-600">
              Belum ada data booking yang lengkap untuk kombinasi filter ini.
            </div>
          ) : (
            <div className="mt-6 space-y-4">
              {sortedBookings.map((booking) => {
                const ready = canHandoffToFinance(booking)
                const phase = journeyPhase(booking)
                const packageTitle = packageMap.get(booking.package_id || "") || "-"
                const merchantName = merchantMap.get(packageMerchantMap.get(booking.package_id || "") || "") || "-"
                const productLabel = productFilters.find((item) => item.value === deriveBookingProduct(booking))?.label || "Produk"
                const attentionReasons = deriveAttentionReasons(booking)
                const actionNow = deriveActionNow(booking)

                return (
                  <article
                    key={booking.id}
                    className="rounded-[24px] border border-[#efe1cf] bg-[#fffaf3] p-4 sm:rounded-[28px] sm:p-5"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                          {booking.booking_code || booking.id}
                        </p>
                        <h3 className="mt-2 text-lg font-semibold text-slate-950 sm:text-xl">{packageTitle}</h3>
                        <p className="mt-2 inline-flex rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-orange-700">
                          {productLabel}
                        </p>
                        <p className="mt-2 text-sm text-slate-600">
                          {booking.customer_name || "-"} • {formatDate(booking.pickup_date)} • {formatMoney(booking.total_amount)}
                        </p>
                        {booking.package_id ? <p className="mt-2 text-xs text-slate-500">Merchant: {merchantName}</p> : null}
                        {booking.display_currency && (
                          <p className="mt-2 text-xs text-slate-500">
                            Harga sesuai bahasa customer:{" "}
                            {formatPackageMoney(booking.display_subtotal_amount, booking.display_currency, locale)}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2 text-xs font-semibold">
                        <span className={`rounded-full border px-3 py-1 ${paymentTone(booking.payment_status)}`}>
                          {resolvePaymentStatusLabel(booking.payment_status)}
                        </span>
                        <span className={`rounded-full border px-3 py-1 ${phase.tone}`}>
                          {phase.label}
                        </span>
                        <span className={`rounded-full border px-3 py-1 ${escrowTone(booking.escrow_status)}`}>
                          Escrow {resolveEscrowStatusLabel(booking.escrow_status)}
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

                    {attentionReasons.length > 0 && (
                      <div className="mt-4 rounded-[24px] border border-orange-200 bg-orange-50/70 p-4">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-orange-600">Needs attention detail</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {attentionReasons.map((reason) => (
                            <span
                              key={`${booking.id}-${reason.key}`}
                              className="inline-flex rounded-full border border-orange-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-orange-700"
                            >
                              {reason.label}
                            </span>
                          ))}
                        </div>
                        <div className="mt-4 grid gap-3 lg:grid-cols-[1.15fr_0.85fr]">
                          <div className="space-y-2">
                            {attentionReasons.map((reason) => (
                              <p key={`${booking.id}-${reason.key}-note`} className="text-sm leading-6 text-slate-700">
                                {reason.note}
                              </p>
                            ))}
                          </div>
                          <div className="rounded-[18px] border border-white bg-white p-4">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">Action now</p>
                            <p className="mt-2 text-sm leading-6 text-slate-700">{actionNow}</p>
                          </div>
                        </div>
                      </div>
                    )}

                     <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
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
                      <Link
                        href={`/admin/bookings/${booking.id}`}
                        className="rounded-[20px] border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-800 transition hover:border-orange-300 hover:text-orange-600"
                      >
                        Detail
                      </Link>
                      {canExecuteAdminOps ? (
                        <form action={handoffBookingToFinance}>
                          <input type="hidden" name="booking_id" value={booking.id} />
                          <button
                            type="submit"
                            disabled={!ready}
                            className="rounded-[20px] bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                          >
                            Ajukan
                          </button>
                        </form>
                      ) : (
                        <span className="rounded-[20px] border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-700">
                          Operations Manager hanya monitor kesiapan handoff.
                        </span>
                      )}
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
