import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { markMerchantArrived, markMerchantGo } from "./actions"

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

function normalizeStatus(value: string | null) {
  return (value || "").trim().toLowerCase()
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

function badgeClass(value: string | null, type: "payment" | "trip" | "escrow") {
  const normalized = normalizeStatus(value)
  if (
    normalized === "paid" ||
    normalized === "confirmed" ||
    normalized === "completed" ||
    normalized === "awaiting_admin_handoff" ||
    normalized === "finance_review" ||
    normalized === "finance_approved" ||
    normalized === "finance_processing" ||
    normalized === "payout_completed" ||
    normalized === "paid_out"
  ) {
    return "bg-emerald-50 text-emerald-700"
  }
  if (normalized === "pending" || normalized === "dp_paid" || normalized === "held" || normalized === "partial_hold") {
    return type === "payment" ? "bg-amber-50 text-amber-700" : "bg-sky-50 text-sky-700"
  }
  if (normalized === "merchant_arrived" || normalized === "customer_picked_up" || normalized === "customer_picked_up_pending_final_payment") {
    return "bg-violet-50 text-violet-700"
  }
  if (normalized === "cancelled" || normalized === "refund" || normalized === "rejected") {
    return "bg-rose-50 text-rose-700"
  }
  return "bg-slate-100 text-slate-700"
}

function pickupTimeline(booking: BookingRow) {
  return [
    {
      label: "Merchant tiba di meeting point",
      done: Boolean(booking.merchant_arrived_at),
      value: booking.merchant_arrived_at,
    },
    {
      label: "Customer klik Picked up",
      done: Boolean(booking.customer_picked_up_at),
      value: booking.customer_picked_up_at,
    },
    {
      label: "Merchant klik Go",
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
  const activeFilter = orderFilters.some((item) => item.key === params.filter) ? String(params.filter) : "all"

  const supabase = await createClient()
  const adminSupabase = createAdminClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data: merchant } = await adminSupabase.from("merchants").select("id").eq("user_id", user.id).single()

  if (!merchant) return <div className="p-10">Data merchant tidak ditemukan.</div>

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

  const allBookings = (data as BookingRow[] | null) ?? []
  const bookings = allBookings.filter((booking) => isMatchingFilter(booking, activeFilter))

  const summaryCards = [
    { label: "Total Pesanan", value: allBookings.length },
    {
      label: "Menunggu Pembayaran",
      value: allBookings.filter((booking) => normalizeStatus(booking.payment_status) === "pending").length,
    },
    {
      label: "Dana Ditahan Escrow",
      value: allBookings.filter((booking) => {
        const escrowStatus = normalizeStatus(booking.escrow_status)
        return escrowStatus === "held" || escrowStatus === "partial_hold"
      }).length,
    },
    {
      label: "Siap Payout",
      value: allBookings.filter((booking) =>
        ["awaiting_admin_handoff", "finance_review", "payout_processing", "paid_out"].includes(normalizeStatus(booking.escrow_status)),
      ).length,
    },
  ]

  const heroStats = [
    {
      label: "Pesanan Baru",
      value: allBookings.filter((booking) => normalizeStatus(booking.booking_status) === "pending").length,
      note: "Butuh respons merchant secepatnya.",
    },
    {
      label: "Booking Terbayar",
      value: allBookings.filter((booking) => {
        const paymentStatus = normalizeStatus(booking.payment_status)
        const tripStatus = normalizeStatus(booking.booking_status)
        return paymentStatus === "paid" || tripStatus === "confirmed" || booking.escrow_status === "held"
      }).length,
      note: "Siap diproses ke layanan berikutnya.",
    },
    {
      label: "Pickup Aktif",
      value: allBookings.filter((booking) => Boolean(booking.merchant_arrived_at) && !booking.customer_picked_up_at).length,
      note: "Merchant sudah tiba dan menunggu customer naik.",
    },
  ]

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#fff8f1_0%,#f7f1e8_38%,#f3eee7_100%)] p-6 md:p-10">
      <section className="overflow-hidden rounded-[32px] bg-[linear-gradient(135deg,#9a3412_0%,#ea580c_45%,#fb923c_100%)] text-white shadow-[0_32px_90px_-40px_rgba(154,52,18,0.85)]">
        <div className="grid gap-6 px-7 py-8 lg:grid-cols-[minmax(0,1.65fr)_420px] lg:px-10 lg:py-10">
          <div>
            <span className="inline-flex rounded-full border border-white/30 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-orange-50">
              Merchant Orders
            </span>
            <h1 className="mt-4 max-w-3xl text-3xl font-semibold leading-tight md:text-5xl">
              Satu command center untuk booking, escrow, dan pickup progress.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-orange-50/92 md:text-base">
              Pantau pesanan baru, booking terbayar, status escrow Red Feng, dan konfirmasi meeting point tanpa berpindah dashboard.
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
              Order Filters
            </span>
            <h2 className="mt-4 text-2xl font-semibold text-slate-950">Kelola pipeline pesanan merchant</h2>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600">
              Gunakan filter untuk fokus ke booking baru, pembayaran, atau status perjalanan yang membutuhkan tindakan berikutnya.
            </p>
          </div>
          <div className="grid gap-3 rounded-[28px] border border-orange-100 bg-[linear-gradient(180deg,#fffaf5_0%,#fff4ea_100%)] p-5 xl:w-[320px]">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">Escrow Held</p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">{summaryCards[2]?.value ?? 0}</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">Ready Payout</p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">{summaryCards[3]?.value ?? 0}</p>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          {orderFilters.map((filter) => {
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
          <div className="mt-6 rounded-[24px] border border-red-200 bg-red-50 p-4 text-red-700">Gagal memuat data pesanan.</div>
        ) : bookings.length === 0 ? (
          <div className="mt-6 rounded-[24px] border border-slate-200 bg-[linear-gradient(180deg,#fffaf5_0%,#f8fafc_100%)] p-5 text-slate-600">
            Belum ada data pada kategori ini.
          </div>
        ) : (
          <div className="mt-6 space-y-5">
            {bookings.map((booking) => {
              const totalPeserta = (booking.adult_count ?? 0) + (booking.child_count ?? 0)
              const timeline = pickupTimeline(booking)
              const paymentStatus = normalizeStatus(booking.payment_status)
              const canMarkArrived = ["paid", "dp_paid"].includes(paymentStatus) && !booking.merchant_arrived_at
              const canMarkGo = Boolean(booking.customer_picked_up_at) && !booking.merchant_picked_up_at

              return (
                <div
                  key={booking.id}
                  className="rounded-[28px] border border-orange-100/80 bg-white p-6 shadow-[0_24px_60px_-42px_rgba(15,23,42,0.35)]"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-3">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">ID Booking</p>
                        <p className="mt-2 text-xl font-semibold text-slate-950">{booking.booking_code || booking.id}</p>
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        <div className="rounded-[22px] bg-[linear-gradient(180deg,#fffaf5_0%,#ffffff_100%)] p-4">
                          <p className="text-[11px] uppercase tracking-[0.24em] text-slate-400">Customer</p>
                          <p className="mt-2 text-sm font-medium text-slate-900">{booking.customer_name || "-"}</p>
                        </div>
                        <div className="rounded-[22px] bg-[linear-gradient(180deg,#fffaf5_0%,#ffffff_100%)] p-4">
                          <p className="text-[11px] uppercase tracking-[0.24em] text-slate-400">Paket</p>
                          <p className="mt-2 text-sm font-medium text-slate-900">{packageMap.get(booking.package_id || "") || "-"}</p>
                        </div>
                        <div className="rounded-[22px] bg-[linear-gradient(180deg,#fffaf5_0%,#ffffff_100%)] p-4">
                          <p className="text-[11px] uppercase tracking-[0.24em] text-slate-400">Tanggal Wisata</p>
                          <p className="mt-2 text-sm font-medium text-slate-900">{formatDate(booking.pickup_date)}</p>
                        </div>
                        <div className="rounded-[22px] bg-[linear-gradient(180deg,#fffaf5_0%,#ffffff_100%)] p-4">
                          <p className="text-[11px] uppercase tracking-[0.24em] text-slate-400">Jumlah Peserta</p>
                          <p className="mt-2 text-sm font-medium text-slate-900">{totalPeserta}</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 lg:max-w-sm lg:justify-end">
                      <span className={`rounded-full px-3 py-1.5 text-xs font-semibold ${badgeClass(booking.payment_status, "payment")}`}>
                        Bayar: {titleCaseStatus(booking.payment_status)}
                      </span>
                      <span className={`rounded-full px-3 py-1.5 text-xs font-semibold ${badgeClass(booking.booking_status, "trip")}`}>
                        Trip: {titleCaseStatus(booking.booking_status)}
                      </span>
                      <span className={`rounded-full px-3 py-1.5 text-xs font-semibold ${badgeClass(booking.escrow_status, "escrow")}`}>
                        Escrow: {titleCaseStatus(booking.escrow_status)}
                      </span>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-4 xl:grid-cols-[1fr_auto]">
                    <div className="rounded-[24px] border border-orange-100 bg-[linear-gradient(180deg,#fffaf5_0%,#fff4ea_100%)] p-4">
                      <p className="text-sm font-semibold text-slate-950">Progress meeting point</p>
                      <div className="mt-4 grid gap-3 md:grid-cols-3">
                        {timeline.map((item) => (
                          <div key={item.label} className="rounded-[20px] border border-white bg-white p-4 shadow-sm">
                            <p className="text-sm font-medium text-slate-900">{item.label}</p>
                            <p className={`mt-2 text-xs font-semibold ${item.done ? "text-emerald-600" : "text-slate-500"}`}>
                              {item.done ? "Selesai" : "Menunggu"}
                            </p>
                            <p className="mt-2 text-xs text-slate-500">{formatDateTime(item.value)}</p>
                          </div>
                        ))}
                      </div>
                      <p className="mt-4 text-xs leading-6 text-slate-500">
                        Dana customer tetap ditahan di rekening RedFeng sampai urutan Arrived, customer Picked up, dan merchant Go selesai.
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
                          Arrived
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
                          Go
                        </button>
                      </form>
                      <Link
                        href={`/booking/${booking.id}`}
                        className="rounded-[20px] border border-slate-200 bg-white px-4 py-3 text-center text-sm font-semibold text-slate-700 transition hover:border-orange-300 hover:text-orange-600"
                      >
                        Detail Customer
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
