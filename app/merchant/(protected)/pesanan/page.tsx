import Link from "next/link"
import { type Locale, normalizeLocale } from "@/lib/i18n"
import { getCurrentLocale } from "@/lib/locale"
import { getEscrowStatusTone, getJourneyStageTone, getPaymentStatusTone, normalizeStatus } from "@/lib/status-tones"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { markMerchantArrived, markMerchantGo } from "./actions"
import { isBookingExpiredForNonPayment } from "@/lib/bookings/draft-cleanup"

export const dynamic = "force-dynamic"

type BookingRow = {
  id: string
  package_id: string | null
  booking_code: string | null
  customer_name: string | null
  pickup_date: string | null
  adult_count: number | null
  child_count: number | null
  payment_status: string | null
  booking_status: string | null
  escrow_status: string | null
  merchant_arrived_at: string | null
  merchant_picked_up_at: string | null
  customer_picked_up_at: string | null
}

type PackageRow = {
  id: string
  title: string | null
}

type OrderFilter = {
  key: string
  label: string
}

const orderFilters: OrderFilter[] = [
  { key: "all", label: "Semua Pesanan" },
  { key: "new", label: "Pesanan Baru" },
  { key: "waiting-payment", label: "Menunggu Pembayaran" },
  { key: "paid", label: "Terbayar" },
  { key: "done", label: "Selesai" },
  { key: "refund", label: "Refund" },
  { key: "cancelled", label: "Dibatalkan" },
]

function formatDate(dateStr: string | null) {
  if (!dateStr) return "-"
  const date = new Date(dateStr)
  if (Number.isNaN(date.getTime())) return dateStr
  return date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  })
}

function formatDateTime(dateStr: string | null) {
  if (!dateStr) return "-"
  const date = new Date(dateStr)
  if (Number.isNaN(date.getTime())) return dateStr
  return date.toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
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

function isVisiblePaidBooking(booking: BookingRow) {
  const paymentStatus = normalizeStatus(booking.payment_status)
  return paymentStatus === "paid" || paymentStatus === "dp_paid"
}

function isMatchingFilter(booking: BookingRow, filter: string) {
  const paymentStatus = normalizeStatus(booking.payment_status)
  const tripStatus = normalizeStatus(booking.booking_status)

  if (filter === "all") return true
  if (filter === "new") return tripStatus === "pending"
  if (filter === "waiting-payment") return paymentStatus === "pending" || paymentStatus === "dp_paid"
  if (filter === "paid") return paymentStatus === "paid" || tripStatus === "confirmed" || booking.escrow_status === "held"
  if (filter === "done") {
    return ["completed", "done", "awaiting_admin_handoff", "finance_review", "finance_processing", "payout_completed"].includes(tripStatus)
  }
  if (filter === "refund") return paymentStatus === "refund" || tripStatus === "refund"
  if (filter === "cancelled") return tripStatus === "cancelled" || paymentStatus === "cancelled"

  return true
}

function paymentTone(value: string | null) {
  return getPaymentStatusTone(value, "bordered")
}

function escrowTone(value: string | null) {
  return getEscrowStatusTone(value, "bordered")
}

function journeyPhase(booking: BookingRow, text: ReturnType<typeof getOrdersText>) {
  if (normalizeStatus(booking.escrow_status) === "paid_out") {
    return { label: text.paidOut, tone: getJourneyStageTone("paid_out", "bordered") }
  }
  if (["awaiting_admin_handoff", "finance_review", "finance_processing", "payout_completed"].includes(normalizeStatus(booking.booking_status))) {
    return { label: text.readyForFinance, tone: getJourneyStageTone("ready_for_finance", "bordered") }
  }
  if (booking.merchant_picked_up_at) {
    return { label: text.goConfirmed, tone: getJourneyStageTone("go_confirmed", "bordered") }
  }
  if (booking.customer_picked_up_at) {
    return { label: text.pickedUp, tone: getJourneyStageTone("picked_up", "bordered") }
  }
  if (booking.merchant_arrived_at) {
    return { label: text.awaitingPickup, tone: getJourneyStageTone("awaiting_pickup", "bordered") }
  }
  if (normalizeStatus(booking.payment_status) === "paid") {
    return { label: text.fullyPaid, tone: getJourneyStageTone("fully_paid", "bordered") }
  }
  if (normalizeStatus(booking.payment_status) === "dp_paid") {
    return { label: text.dpPaid, tone: getJourneyStageTone("dp_paid", "bordered") }
  }
  return { label: titleCaseStatus(booking.booking_status), tone: getJourneyStageTone("fallback", "bordered") }
}

function pickupTimeline(booking: BookingRow, text: ReturnType<typeof getOrdersText>) {
  return [
    {
      label: text.merchantArrivedMeetingPoint,
      done: Boolean(booking.merchant_arrived_at),
      value: booking.merchant_arrived_at,
    },
    {
      label: text.customerClickedPickedUp,
      done: Boolean(booking.customer_picked_up_at),
      value: booking.customer_picked_up_at,
    },
    {
      label: text.merchantClickedGo,
      done: Boolean(booking.merchant_picked_up_at),
      value: booking.merchant_picked_up_at,
    },
  ]
}

export default async function MerchantOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; success?: string; error?: string }>
}) {
  const params = await searchParams
  const locale = normalizeLocale(await getCurrentLocale())
  const t = getOrdersText(locale)
  const activeFilter = orderFilters.some((item) => item.key === params.filter) ? String(params.filter) : "all"
  const localizedOrderFilters: OrderFilter[] = [
    { key: "all", label: t.filterAll },
    { key: "new", label: t.filterNew },
    { key: "waiting-payment", label: t.filterWaitingPayment },
    { key: "paid", label: t.filterPaid },
    { key: "done", label: t.filterDone },
    { key: "refund", label: t.filterRefund },
    { key: "cancelled", label: t.filterCancelled },
  ]

  const supabase = await createClient()
  const adminSupabase = createAdminClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data: merchant } = await adminSupabase.from("merchants").select("id").eq("user_id", user.id).single()

  if (!merchant) return <div className="p-10">{t.merchantMissing}</div>

  const { data: packageRows, error: packageError } = await adminSupabase
    .from("packages")
    .select("id, title")
    .eq("merchant_id", merchant.id)

  const merchantPackages = (packageRows as PackageRow[] | null) || []
  const packageIds = merchantPackages.map((pkg) => pkg.id)
  const packageMap = new Map(merchantPackages.map((pkg) => [pkg.id, pkg.title || "-"]))

  const { data, error } = packageIds.length
    ? await adminSupabase
        .from("bookings")
        .select(
          "id, package_id, booking_code, customer_name, pickup_date, adult_count, child_count, payment_status, booking_status, escrow_status, merchant_arrived_at, merchant_picked_up_at, customer_picked_up_at",
        )
        .in("package_id", packageIds)
        .order("created_at", { ascending: false })
    : { data: [] as BookingRow[], error: packageError }

  const allBookings = ((data as BookingRow[] | null) ?? [])
    .filter((booking) => !isBookingExpiredForNonPayment(booking))
    .filter((booking) => isVisiblePaidBooking(booking))
  const bookings = allBookings.filter((booking) => isMatchingFilter(booking, activeFilter))

  const summaryCards = [
    { label: t.totalOrders, value: allBookings.length },
    {
      label: t.waitingPayment,
      value: allBookings.filter((booking) => normalizeStatus(booking.payment_status) === "pending").length,
    },
    {
      label: t.escrowHeld,
      value: allBookings.filter((booking) => {
        const escrowStatus = normalizeStatus(booking.escrow_status)
        return escrowStatus === "held" || escrowStatus === "partial_hold"
      }).length,
    },
    {
      label: t.readyPayout,
      value: allBookings.filter((booking) =>
        ["awaiting_admin_handoff", "finance_review", "payout_processing", "paid_out"].includes(normalizeStatus(booking.escrow_status)),
      ).length,
    },
  ]

  const heroStats = [
    {
      label: t.newOrders,
      value: allBookings.filter((booking) => normalizeStatus(booking.booking_status) === "pending").length,
      note: t.newOrdersNote,
    },
    {
      label: t.paidBookings,
      value: allBookings.filter((booking) => {
        const paymentStatus = normalizeStatus(booking.payment_status)
        const tripStatus = normalizeStatus(booking.booking_status)
        return paymentStatus === "paid" || tripStatus === "confirmed" || booking.escrow_status === "held"
      }).length,
      note: t.paidBookingsNote,
    },
    {
      label: t.activePickup,
      value: allBookings.filter((booking) => Boolean(booking.merchant_arrived_at) && !booking.customer_picked_up_at).length,
      note: t.activePickupNote,
    },
  ]

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#fff8f1_0%,#f7f1e8_38%,#f3eee7_100%)] p-6 md:p-10">
      <section className="overflow-hidden rounded-[32px] bg-[linear-gradient(135deg,#9a3412_0%,#ea580c_45%,#fb923c_100%)] text-white shadow-[0_32px_90px_-40px_rgba(154,52,18,0.85)]">
        <div className="grid gap-6 px-7 py-8 lg:grid-cols-[minmax(0,1.65fr)_420px] lg:px-10 lg:py-10">
          <div>
            <span className="inline-flex rounded-full border border-white/30 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-orange-50">
              {t.heroBadge}
            </span>
            <h1 className="mt-4 max-w-3xl text-3xl font-semibold leading-tight md:text-5xl">
              {t.heroTitle}
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-orange-50/92 md:text-base">
              {t.heroDescription}
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
            {heroStats.map((card) => (
              <div key={card.label} className="rounded-[28px] border border-white/30 bg-white/12 p-5 backdrop-blur">
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-orange-100/90">{card.label}</p>
                <p className="mt-3 text-3xl font-semibold">{card.value}</p>
                <p className="mt-2 text-sm text-orange-50/85">{card.note}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {params.success && (
        <div className="mt-6 rounded-[24px] border border-emerald-200 bg-emerald-50/90 p-4 text-emerald-700 shadow-sm">
          {params.success}
        </div>
      )}

      {params.error && (
        <div className="mt-6 rounded-[24px] border border-rose-200 bg-rose-50/90 p-4 text-rose-700 shadow-sm">
          {params.error}
        </div>
      )}

      <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => (
          <div
            key={card.label}
            className="rounded-[28px] border border-orange-100/70 bg-white/90 p-5 shadow-[0_24px_60px_-40px_rgba(15,23,42,0.35)] backdrop-blur"
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">{card.label}</p>
            <p className="mt-3 text-3xl font-semibold text-slate-950">{card.value}</p>
          </div>
        ))}
      </section>

      <section className="mt-8 rounded-[32px] border border-orange-100/80 bg-white/90 p-6 shadow-[0_28px_70px_-45px_rgba(15,23,42,0.35)] backdrop-blur">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <span className="inline-flex rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-orange-700">
              {t.orderFilters}
            </span>
            <h2 className="mt-4 text-2xl font-semibold text-slate-950">{t.pipelineTitle}</h2>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600">
              {t.pipelineDescription}
            </p>
          </div>
          <div className="grid gap-3 rounded-[28px] border border-orange-100 bg-[linear-gradient(180deg,#fffaf5_0%,#fff4ea_100%)] p-5 xl:w-[320px]">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">{t.escrowHeld}</p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">{summaryCards[2]?.value ?? 0}</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">{t.readyPayout}</p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">{summaryCards[3]?.value ?? 0}</p>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          {localizedOrderFilters.map((filter) => {
            const active = filter.key === activeFilter
            return (
              <Link
                key={filter.key}
                href={`/merchant/pesanan?filter=${filter.key}`}
                className={`rounded-full px-4 py-2.5 text-sm font-medium transition ${
                  active
                    ? "bg-slate-950 text-white shadow-lg"
                    : "border border-slate-200 bg-white text-slate-700 hover:border-orange-300 hover:bg-orange-50 hover:text-orange-700"
                }`}
              >
                {filter.label}
              </Link>
            )
          })}
        </div>

        {error || packageError ? (
          <div className="mt-6 rounded-[24px] border border-red-200 bg-red-50 p-4 text-red-700">{t.loadError}</div>
        ) : bookings.length === 0 ? (
          <div className="mt-6 rounded-[24px] border border-slate-200 bg-[linear-gradient(180deg,#fffaf5_0%,#f8fafc_100%)] p-5 text-slate-600">
            {t.emptyState}
          </div>
        ) : (
          <div className="mt-6 space-y-5">
            {bookings.map((booking) => {
              const totalPeserta = (booking.adult_count ?? 0) + (booking.child_count ?? 0)
              const timeline = pickupTimeline(booking, t)
              const paymentStatus = normalizeStatus(booking.payment_status)
              const canMarkArrived = ["paid", "dp_paid"].includes(paymentStatus) && !booking.merchant_arrived_at
              const canMarkGo = Boolean(booking.customer_picked_up_at) && !booking.merchant_picked_up_at
              const phase = journeyPhase(booking, t)

              return (
                <div
                  key={booking.id}
                  className="rounded-[28px] border border-orange-100/80 bg-white p-6 shadow-[0_24px_60px_-42px_rgba(15,23,42,0.35)]"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-3">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">{t.bookingId}</p>
                        <p className="mt-2 text-xl font-semibold text-slate-950">{booking.booking_code || booking.id}</p>
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        <div className="rounded-[22px] bg-[linear-gradient(180deg,#fffaf5_0%,#ffffff_100%)] p-4">
                          <p className="text-[11px] uppercase tracking-[0.24em] text-slate-400">{t.customer}</p>
                          <p className="mt-2 text-sm font-medium text-slate-900">{booking.customer_name || "-"}</p>
                        </div>
                        <div className="rounded-[22px] bg-[linear-gradient(180deg,#fffaf5_0%,#ffffff_100%)] p-4">
                          <p className="text-[11px] uppercase tracking-[0.24em] text-slate-400">{t.packageLabel}</p>
                          <p className="mt-2 text-sm font-medium text-slate-900">{packageMap.get(booking.package_id || "") || "-"}</p>
                        </div>
                        <div className="rounded-[22px] bg-[linear-gradient(180deg,#fffaf5_0%,#ffffff_100%)] p-4">
                          <p className="text-[11px] uppercase tracking-[0.24em] text-slate-400">{t.tripDate}</p>
                          <p className="mt-2 text-sm font-medium text-slate-900">{formatDate(booking.pickup_date)}</p>
                        </div>
                        <div className="rounded-[22px] bg-[linear-gradient(180deg,#fffaf5_0%,#ffffff_100%)] p-4">
                          <p className="text-[11px] uppercase tracking-[0.24em] text-slate-400">{t.participantCount}</p>
                          <p className="mt-2 text-sm font-medium text-slate-900">{totalPeserta}</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 lg:max-w-sm lg:justify-end">
                      <span className={`rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] ${paymentTone(booking.payment_status)}`}>
                        {titleCaseStatus(booking.payment_status)}
                      </span>
                      <span className={`rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] ${phase.tone}`}>
                        {phase.label}
                      </span>
                      <span className={`rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] ${escrowTone(booking.escrow_status)}`}>
                        {t.escrowLabel} {titleCaseStatus(booking.escrow_status)}
                      </span>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-4 xl:grid-cols-[1fr_auto]">
                    <div className="rounded-[24px] border border-orange-100 bg-[linear-gradient(180deg,#fffaf5_0%,#fff4ea_100%)] p-4">
                      <p className="text-sm font-semibold text-slate-950">{t.meetingPointProgress}</p>
                      <div className="mt-4 grid gap-3 md:grid-cols-3">
                        {timeline.map((item) => (
                          <div key={item.label} className="rounded-[20px] border border-white bg-white p-4 shadow-sm">
                            <p className="text-sm font-medium text-slate-900">{item.label}</p>
                            <p className={`mt-2 text-xs font-semibold ${item.done ? "text-emerald-600" : "text-slate-500"}`}>
                              {item.done ? t.completed : t.waiting}
                            </p>
                            <p className="mt-2 text-xs text-slate-500">{formatDateTime(item.value)}</p>
                          </div>
                        ))}
                      </div>
                      <p className="mt-4 text-xs leading-6 text-slate-500">
                        {t.meetingPointProgressNote}
                      </p>
                    </div>

                    <div className="flex flex-col gap-3 xl:w-56">
                      <form action={markMerchantArrived}>
                        <input type="hidden" name="booking_id" value={booking.id} />
                        <input type="hidden" name="filter" value={activeFilter} />
                        <button
                          type="submit"
                          disabled={!canMarkArrived}
                          className="w-full rounded-[20px] bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                        >
                          {t.arrivedButton}
                        </button>
                      </form>
                      <form action={markMerchantGo}>
                        <input type="hidden" name="booking_id" value={booking.id} />
                        <input type="hidden" name="filter" value={activeFilter} />
                        <button
                          type="submit"
                          disabled={!canMarkGo}
                          className="w-full rounded-[20px] border border-orange-300 bg-orange-50 px-4 py-3 text-sm font-semibold text-orange-700 transition hover:bg-orange-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
                        >
                          {t.goButton}
                        </button>
                      </form>
                      <Link
                        href={`/booking/${booking.id}`}
                        className="rounded-[20px] border border-slate-200 bg-white px-4 py-3 text-center text-sm font-semibold text-slate-700 transition hover:border-orange-300 hover:text-orange-600"
                      >
                        {t.customerDetail}
                      </Link>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}

function getOrdersText(locale: Locale) {
  const dict = {
    id: {
      merchantMissing: "Data merchant tidak ditemukan.",
      totalOrders: "Total Pesanan",
      waitingPayment: "Menunggu Pembayaran",
      escrowHeld: "Dana Ditahan Escrow",
      readyPayout: "Siap Payout",
      newOrders: "Pesanan Baru",
      newOrdersNote: "Butuh respons merchant secepatnya.",
      paidBookings: "Booking Terbayar",
      paidBookingsNote: "Siap diproses ke layanan berikutnya.",
      activePickup: "Pickup Aktif",
      activePickupNote: "Merchant sudah tiba dan menunggu customer naik.",
      heroBadge: "Merchant Orders",
      heroTitle: "Satu command center untuk booking, escrow, dan pickup progress.",
      heroDescription: "Pantau pesanan baru, booking terbayar, status escrow Red Feng, dan konfirmasi meeting point tanpa berpindah dashboard.",
      orderFilters: "Order Filters",
      pipelineTitle: "Kelola pipeline pesanan merchant",
      pipelineDescription: "Gunakan filter untuk fokus ke booking baru, pembayaran, atau status perjalanan yang membutuhkan tindakan berikutnya.",
      filterAll: "Semua Pesanan",
      filterNew: "Pesanan Baru",
      filterWaitingPayment: "Menunggu Pembayaran",
      filterPaid: "Terbayar",
      filterDone: "Selesai",
      filterRefund: "Refund",
      filterCancelled: "Dibatalkan",
      loadError: "Gagal memuat data pesanan.",
      emptyState: "Belum ada data pada kategori ini.",
      paidOut: "Paid Out",
      readyForFinance: "Ready for Finance",
      goConfirmed: "Go Confirmed",
      pickedUp: "Picked Up",
      awaitingPickup: "Awaiting Pickup",
      fullyPaid: "Fully Paid",
      dpPaid: "DP Paid",
      merchantArrivedMeetingPoint: "Merchant tiba di meeting point",
      customerClickedPickedUp: "Customer klik Picked up",
      merchantClickedGo: "Merchant klik Go",
      bookingId: "ID Booking",
      customer: "Customer",
      packageLabel: "Paket",
      tripDate: "Tanggal Wisata",
      participantCount: "Jumlah Peserta",
      escrowLabel: "Escrow",
      meetingPointProgress: "Progress meeting point",
      completed: "Selesai",
      waiting: "Menunggu",
      meetingPointProgressNote: "Dana customer tetap ditahan di rekening RedFeng sampai urutan Arrived, customer Picked up, dan merchant Go selesai.",
      arrivedButton: "Arrived",
      goButton: "Go",
      customerDetail: "Detail Customer",
    },
    en: {
      merchantMissing: "Merchant data not found.",
      totalOrders: "Total Orders",
      waitingPayment: "Awaiting Payment",
      escrowHeld: "Escrow Held",
      readyPayout: "Ready for Payout",
      newOrders: "New Orders",
      newOrdersNote: "Needs merchant response as soon as possible.",
      paidBookings: "Paid Bookings",
      paidBookingsNote: "Ready for the next service stage.",
      activePickup: "Active Pickup",
      activePickupNote: "Merchant has arrived and is waiting for the customer.",
      heroBadge: "Merchant Orders",
      heroTitle: "One command center for bookings, escrow, and pickup progress.",
      heroDescription: "Monitor new orders, paid bookings, Red Feng escrow status, and meeting-point confirmations without switching dashboards.",
      orderFilters: "Order Filters",
      pipelineTitle: "Manage the merchant order pipeline",
      pipelineDescription: "Use filters to focus on new bookings, payments, or trip statuses that need the next action.",
      filterAll: "All Orders",
      filterNew: "New Orders",
      filterWaitingPayment: "Awaiting Payment",
      filterPaid: "Paid",
      filterDone: "Completed",
      filterRefund: "Refund",
      filterCancelled: "Cancelled",
      loadError: "Failed to load order data.",
      emptyState: "There is no data in this category yet.",
      paidOut: "Paid Out",
      readyForFinance: "Ready for Finance",
      goConfirmed: "Go Confirmed",
      pickedUp: "Picked Up",
      awaitingPickup: "Awaiting Pickup",
      fullyPaid: "Fully Paid",
      dpPaid: "DP Paid",
      merchantArrivedMeetingPoint: "Merchant arrived at meeting point",
      customerClickedPickedUp: "Customer clicked Picked up",
      merchantClickedGo: "Merchant clicked Go",
      bookingId: "Booking ID",
      customer: "Customer",
      packageLabel: "Package",
      tripDate: "Trip Date",
      participantCount: "Participants",
      escrowLabel: "Escrow",
      meetingPointProgress: "Meeting point progress",
      completed: "Completed",
      waiting: "Waiting",
      meetingPointProgressNote: "Customer funds remain held in the RedFeng account until Arrived, customer Picked up, and merchant Go are all completed.",
      arrivedButton: "Arrived",
      goButton: "Go",
      customerDetail: "Customer Detail",
    },
    zh: {
      merchantMissing: "未找到商家数据。",
      totalOrders: "订单总数",
      waitingPayment: "等待付款",
      escrowHeld: "托管冻结资金",
      readyPayout: "待结算",
      newOrders: "新订单",
      newOrdersNote: "需要商家尽快响应。",
      paidBookings: "已付款预订",
      paidBookingsNote: "已准备进入下一阶段服务。",
      activePickup: "进行中的接送",
      activePickupNote: "商家已到达并正在等待客户上车。",
      heroBadge: "商家订单",
      heroTitle: "在一个工作台中统一处理预订、托管与接送进度。",
      heroDescription: "无需切换页面即可查看新订单、已付款预订、Red Feng 托管状态以及集合点确认进度。",
      orderFilters: "订单筛选",
      pipelineTitle: "管理商家订单流程",
      pipelineDescription: "使用筛选快速聚焦需要下一步处理的新预订、付款状态或行程状态。",
      filterAll: "全部订单",
      filterNew: "新订单",
      filterWaitingPayment: "等待付款",
      filterPaid: "已付款",
      filterDone: "已完成",
      filterRefund: "退款",
      filterCancelled: "已取消",
      loadError: "加载订单数据失败。",
      emptyState: "该分类下暂时没有数据。",
      paidOut: "已结算",
      readyForFinance: "待财务处理",
      goConfirmed: "Go 已确认",
      pickedUp: "已上车",
      awaitingPickup: "等待接送",
      fullyPaid: "已全额付款",
      dpPaid: "已付定金",
      merchantArrivedMeetingPoint: "商家已到达集合点",
      customerClickedPickedUp: "客户点击了 Picked up",
      merchantClickedGo: "商家点击了 Go",
      bookingId: "预订编号",
      customer: "客户",
      packageLabel: "套餐",
      tripDate: "出游日期",
      participantCount: "人数",
      escrowLabel: "托管",
      meetingPointProgress: "集合点进度",
      completed: "已完成",
      waiting: "等待中",
      meetingPointProgressNote: "在 Arrived、客户 Picked up、以及商家 Go 全部完成之前，客户资金仍会保留在 RedFeng 托管账户中。",
      arrivedButton: "Arrived",
      goButton: "Go",
      customerDetail: "客户详情",
    },
  } satisfies Record<Locale, Record<string, string>>

  return dict[locale]
}
