import Link from "next/link"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { confirmCustomerPickedUp } from "@/app/booking/[id]/actions"

type BookingRow = {
  id: string
  package_id: string | null
  booking_code: string | null
  pickup_date: string | null
  total_amount: number | null
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
  slug: string | null
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

function formatMoney(value: number) {
  return `Rp ${value.toLocaleString("id-ID")}`
}

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

function badgeClass(value: string | null, type: "payment" | "trip" | "escrow") {
  const normalized = normalizeStatus(value)
  if (normalized === "paid" || normalized === "confirmed" || normalized === "pickup_confirmed" || normalized === "ready_for_payout") {
    return "bg-emerald-50 text-emerald-700"
  }
  if (normalized === "pending" || normalized === "dp_paid" || normalized === "held" || normalized === "partial_hold") {
    return type === "payment" ? "bg-amber-50 text-amber-700" : "bg-sky-50 text-sky-700"
  }
  if (normalized === "merchant_arrived" || normalized === "pickup_confirm_merchant") {
    return "bg-violet-50 text-violet-700"
  }
  if (normalized === "cancelled" || normalized === "refund") {
    return "bg-rose-50 text-rose-700"
  }
  return "bg-slate-100 text-slate-700"
}

function getTimelineStatus(booking: BookingRow) {
  if (booking.customer_picked_up_at) return "Customer sudah konfirmasi dijemput"
  if (booking.merchant_picked_up_at) return "Menunggu konfirmasi customer"
  if (booking.merchant_arrived_at) return "Merchant sudah tiba di meeting point"
  return "Menunggu progress pickup"
}

export default async function CustomerDashboardPage() {
  const supabase = await createClient()
  const adminSupabase = createAdminClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data: bookings, error } = await adminSupabase
    .from("bookings")
    .select("id, package_id, booking_code, pickup_date, total_amount, payment_status, booking_status, escrow_status, merchant_arrived_at, merchant_picked_up_at, customer_picked_up_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })

  const customerBookings = (bookings as BookingRow[] | null) || []
  const packageIds = [...new Set(customerBookings.map((booking) => booking.package_id).filter(Boolean))]

  const { data: packageRows } = packageIds.length
    ? await adminSupabase
        .from("packages")
        .select("id, title, slug")
        .in("id", packageIds)
    : { data: [] as PackageRow[] }

  const packageMap = new Map(((packageRows as PackageRow[] | null) || []).map((pkg) => [pkg.id, pkg]))

  const now = new Date()
  const upcomingTrips = customerBookings.filter((booking) => {
    if (!booking.pickup_date) return false
    const pickup = new Date(booking.pickup_date)
    return !Number.isNaN(pickup.getTime()) && pickup >= now && normalizeStatus(booking.booking_status) !== "cancelled"
  })

  const pendingPayments = customerBookings.filter((booking) => {
    const paymentStatus = normalizeStatus(booking.payment_status)
    return paymentStatus === "pending" || paymentStatus === "dp_paid"
  })

  const waitingCustomerAction = customerBookings.filter(
    (booking) => Boolean(booking.merchant_picked_up_at) && !booking.customer_picked_up_at,
  )

  const readyForPayout = customerBookings.filter(
    (booking) => normalizeStatus(booking.escrow_status) === "ready_for_payout",
  )

  const summaryCards = [
    {
      label: "Total Booking",
      value: customerBookings.length,
      note: "Riwayat seluruh transaksi Anda",
    },
    {
      label: "Trip Mendatang",
      value: upcomingTrips.length,
      note: "Booking dengan tanggal wisata terdekat",
    },
    {
      label: "Menunggu Aksi Anda",
      value: waitingCustomerAction.length,
      note: "Booking yang perlu konfirmasi customer",
    },
    {
      label: "Dana Diproses RedFeng",
      value: readyForPayout.length,
      note: "Escrow siap diteruskan ke merchant",
    },
  ]

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)] p-6 md:p-10">
      <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm md:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-orange-500">Customer Dashboard</p>
            <h1 className="mt-3 text-3xl font-bold text-slate-900 md:text-4xl">Kelola booking, pembayaran, dan progress trip Anda</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-500 md:text-base">
              Pantau status pembayaran, escrow RedFeng, progres pickup merchant, dan akses cepat ke detail booking dalam satu dashboard yang lebih rapi.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Link href="/" className="rounded-2xl border border-slate-300 px-5 py-3 text-center text-sm font-semibold text-slate-700 transition hover:border-orange-300 hover:text-orange-600">
              Cari Paket Lagi
            </Link>
            <Link href="/packages" className="rounded-2xl bg-slate-900 px-5 py-3 text-center text-sm font-semibold text-white transition hover:bg-slate-800">
              Jelajahi Paket
            </Link>
          </div>
        </div>
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => (
          <div key={card.label} className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">{card.label}</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">{card.value}</p>
            <p className="mt-2 text-xs text-slate-500">{card.note}</p>
          </div>
        ))}
      </section>

      <section className="mt-8 grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Booking Terbaru</h2>
              <p className="mt-1 text-sm text-slate-500">Booking terbaru Anda beserta status pembayaran, trip, dan escrow.</p>
            </div>
          </div>

          {error ? (
            <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
              Gagal memuat dashboard customer.
            </div>
          ) : customerBookings.length === 0 ? (
            <div className="mt-5 rounded-[20px] border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600">
              Belum ada booking. Mulai dari jelajahi paket lalu lanjutkan checkout.
            </div>
          ) : (
            <div className="mt-5 space-y-4">
              {customerBookings.slice(0, 6).map((booking) => {
                const pkg = packageMap.get(booking.package_id || "")
                const canConfirmPickup = Boolean(booking.merchant_picked_up_at) && !booking.customer_picked_up_at

                return (
                  <div key={booking.id} className="rounded-[24px] border border-slate-200 p-5">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Booking</p>
                        <h3 className="mt-2 text-lg font-semibold text-slate-900">{pkg?.title || booking.booking_code || booking.id}</h3>
                        <p className="mt-2 text-sm text-slate-500">Kode: {booking.booking_code || booking.id}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
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

                    <div className="mt-5 grid gap-4 md:grid-cols-3">
                      <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Tanggal Wisata</p>
                        <p className="mt-2 text-sm font-medium text-slate-900">{formatDate(booking.pickup_date)}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Total Transaksi</p>
                        <p className="mt-2 text-sm font-medium text-slate-900">{formatMoney(Number(booking.total_amount || 0))}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Progress Pickup</p>
                        <p className="mt-2 text-sm font-medium text-slate-900">{getTimelineStatus(booking)}</p>
                      </div>
                    </div>

                    <div className="mt-5 flex flex-wrap gap-3">
                      <Link href={`/booking/${booking.id}`} className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800">
                        Lihat Detail Booking
                      </Link>
                      {canConfirmPickup && (
                        <form action={confirmCustomerPickedUp}>
                          <input type="hidden" name="booking_id" value={booking.id} />
                          <button
                            type="submit"
                            className="rounded-2xl bg-orange-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-orange-600"
                          >
                            Sudah dijemput
                          </button>
                        </form>
                      )}
                      {pkg?.slug && (
                        <Link href={`/packages/${encodeURIComponent(pkg.slug)}`} className="rounded-2xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-orange-300 hover:text-orange-600">
                          Lihat Paket
                        </Link>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">Checklist Aksi Customer</h2>
            <div className="mt-5 space-y-4">
              <div className="rounded-[20px] bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-900">1. Login sebelum checkout</p>
                <p className="mt-2 text-sm text-slate-600">Booking dan pembayaran hanya bisa dilakukan oleh customer yang sudah login.</p>
              </div>
              <div className="rounded-[20px] bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-900">2. Pantau progress meeting point</p>
                <p className="mt-2 text-sm text-slate-600">Saat merchant klik `Tiba` atau `Dijemput`, status akan muncul di detail booking Anda.</p>
              </div>
              <div className="rounded-[20px] bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-900">3. Konfirmasi `Sudah dijemput`</p>
                <p className="mt-2 text-sm text-slate-600">Konfirmasi customer diperlukan agar RedFeng dapat memproses pelepasan escrow ke merchant.</p>
              </div>
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">Ringkasan Pembayaran</h2>
            <div className="mt-5 space-y-4 text-sm text-slate-600">
              <div className="flex items-center justify-between rounded-[18px] bg-slate-50 px-4 py-3">
                <span>Menunggu pembayaran</span>
                <span className="font-semibold text-slate-900">{pendingPayments.length}</span>
              </div>
              <div className="flex items-center justify-between rounded-[18px] bg-slate-50 px-4 py-3">
                <span>Menunggu aksi customer</span>
                <span className="font-semibold text-slate-900">{waitingCustomerAction.length}</span>
              </div>
              <div className="flex items-center justify-between rounded-[18px] bg-slate-50 px-4 py-3">
                <span>Siap payout ke merchant</span>
                <span className="font-semibold text-slate-900">{readyForPayout.length}</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
