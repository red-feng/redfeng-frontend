import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { markMerchantArrived, markMerchantPickedUp } from "./actions"

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
    return tripStatus === "completed" || tripStatus === "done" || tripStatus === "pickup_confirmed"
  }
  if (filter === "refund") return paymentStatus === "refund" || tripStatus === "refund"
  if (filter === "cancelled") return tripStatus === "cancelled" || paymentStatus === "cancelled"

  return true
}

function badgeClass(value: string | null, type: "payment" | "trip" | "escrow") {
  const normalized = normalizeStatus(value)
  if (normalized === "paid" || normalized === "confirmed" || normalized === "completed" || normalized === "ready_for_payout" || normalized === "pickup_confirmed") {
    return "bg-emerald-50 text-emerald-700"
  }
  if (normalized === "pending" || normalized === "dp_paid" || normalized === "held" || normalized === "partial_hold") {
    return type === "payment" ? "bg-amber-50 text-amber-700" : "bg-sky-50 text-sky-700"
  }
  if (normalized === "merchant_arrived" || normalized === "pickup_confirm_merchant") {
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
      label: "Merchant klik Dijemput",
      done: Boolean(booking.merchant_picked_up_at),
      value: booking.merchant_picked_up_at,
    },
    {
      label: "Customer konfirmasi Sudah dijemput",
      done: Boolean(booking.customer_picked_up_at),
      value: booking.customer_picked_up_at,
    },
  ]
}

export default async function MerchantOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; success?: string; error?: string }>
}) {
  const params = await searchParams
  const activeFilter = orderFilters.some((item) => item.key === params.filter)
    ? String(params.filter)
    : "all"

  const supabase = await createClient()
  const adminSupabase = createAdminClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data: merchant } = await adminSupabase
    .from("merchants")
    .select("id")
    .eq("user_id", user.id)
    .single()

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
        .select("id, package_id, booking_code, customer_name, pickup_date, adult_count, child_count, payment_status, booking_status, escrow_status, merchant_arrived_at, merchant_picked_up_at, customer_picked_up_at")
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
      value: allBookings.filter((booking) => normalizeStatus(booking.escrow_status) === "ready_for_payout").length,
    },
  ]

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)] p-6 md:p-10">
      <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">Pesanan</h1>
        <p className="mt-1 text-sm text-slate-500">
          Kelola pesanan customer, status escrow RedFeng, dan progres meeting point dalam satu tampilan.
        </p>
      </section>

      {params.success && (
        <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-700">
          {params.success}
        </div>
      )}

      {params.error && (
        <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-700">
          {params.error}
        </div>
      )}

      <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => (
          <div key={card.label} className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">{card.label}</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">{card.value}</p>
          </div>
        ))}
      </section>

      <section className="mt-8 rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-6 flex flex-wrap gap-3">
          {orderFilters.map((filter) => {
            const active = filter.key === activeFilter
            return (
              <Link
                key={filter.key}
                href={`/merchant/pesanan?filter=${filter.key}`}
                className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                  active
                    ? "bg-slate-900 text-white"
                    : "border border-slate-300 bg-white text-slate-700 hover:border-orange-300 hover:text-orange-600"
                }`}
              >
                {filter.label}
              </Link>
            )
          })}
        </div>

        {error || packageError ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
            Gagal memuat data pesanan.
          </div>
        ) : bookings.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 text-slate-600">
            Belum ada data pada kategori ini.
          </div>
        ) : (
          <div className="space-y-5">
            {bookings.map((booking) => {
              const totalPeserta = (booking.adult_count ?? 0) + (booking.child_count ?? 0)
              const timeline = pickupTimeline(booking)
              const canMarkArrived = normalizeStatus(booking.payment_status) === "paid" && !booking.merchant_arrived_at
              const canMarkPickedUp = Boolean(booking.merchant_arrived_at) && !booking.merchant_picked_up_at

              return (
                <div key={booking.id} className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm text-slate-500">ID Booking</p>
                        <p className="mt-1 text-lg font-bold text-slate-900">{booking.booking_code || booking.id}</p>
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        <div>
                          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Customer</p>
                          <p className="mt-2 text-sm font-medium text-slate-900">{booking.customer_name || "-"}</p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Paket</p>
                          <p className="mt-2 text-sm font-medium text-slate-900">{packageMap.get(booking.package_id || "") || "-"}</p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Tanggal Wisata</p>
                          <p className="mt-2 text-sm font-medium text-slate-900">{formatDate(booking.pickup_date)}</p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Jumlah Peserta</p>
                          <p className="mt-2 text-sm font-medium text-slate-900">{totalPeserta}</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 lg:max-w-sm lg:justify-end">
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${badgeClass(booking.payment_status, "payment")}`}>
                        Bayar: {titleCaseStatus(booking.payment_status)}
                      </span>
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${badgeClass(booking.booking_status, "trip")}`}>
                        Trip: {titleCaseStatus(booking.booking_status)}
                      </span>
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${badgeClass(booking.escrow_status, "escrow")}`}>
                        Escrow: {titleCaseStatus(booking.escrow_status)}
                      </span>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-4 xl:grid-cols-[1fr_auto]">
                    <div className="rounded-[20px] bg-slate-50 p-4">
                      <p className="text-sm font-semibold text-slate-900">Progress meeting point</p>
                      <div className="mt-4 grid gap-3 md:grid-cols-3">
                        {timeline.map((item) => (
                          <div key={item.label} className="rounded-2xl border border-slate-200 bg-white p-4">
                            <p className="text-sm font-medium text-slate-900">{item.label}</p>
                            <p className={`mt-2 text-xs font-semibold ${item.done ? "text-emerald-600" : "text-slate-500"}`}>
                              {item.done ? "Selesai" : "Menunggu"}
                            </p>
                            <p className="mt-2 text-xs text-slate-500">{formatDateTime(item.value)}</p>
                          </div>
                        ))}
                      </div>
                      <p className="mt-4 text-xs text-slate-500">
                        Dana customer tetap ditahan di rekening RedFeng sampai merchant dan customer sama-sama konfirmasi proses pickup.
                      </p>
                    </div>

                    <div className="flex flex-col gap-3 xl:w-56">
                      <form action={markMerchantArrived}>
                        <input type="hidden" name="booking_id" value={booking.id} />
                        <input type="hidden" name="filter" value={activeFilter} />
                        <button
                          type="submit"
                          disabled={!canMarkArrived}
                          className="w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                        >
                          Tiba
                        </button>
                      </form>
                      <form action={markMerchantPickedUp}>
                        <input type="hidden" name="booking_id" value={booking.id} />
                        <input type="hidden" name="filter" value={activeFilter} />
                        <button
                          type="submit"
                          disabled={!canMarkPickedUp}
                          className="w-full rounded-2xl border border-orange-300 bg-orange-50 px-4 py-3 text-sm font-semibold text-orange-700 transition hover:bg-orange-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
                        >
                          Dijemput
                        </button>
                      </form>
                      <Link
                        href={`/booking/${booking.id}`}
                        className="rounded-2xl border border-slate-300 px-4 py-3 text-center text-sm font-semibold text-slate-700 transition hover:border-orange-300 hover:text-orange-600"
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
