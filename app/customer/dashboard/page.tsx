import Link from "next/link"
import { createAdminClient } from "@/lib/supabase/admin"
import { formatCustomerCode } from "@/lib/merchant-code"
import { createClient } from "@/lib/supabase/server"
import BookingPaymentButton from "@/app/components/BookingPaymentButton"
import { confirmCustomerPickedUp } from "@/app/booking/[id]/actions"
import { getCurrentLocale } from "@/lib/locale"
import { normalizeLocale } from "@/lib/i18n"
import { formatPackageMoney } from "@/lib/package-pricing"
import { getEscrowStatusTone, getPaymentStatusTone, normalizeStatus, toneClass } from "@/lib/status-tones"
import {
  formatFinalPaymentDueLabel,
  isFinalPaymentOverdue,
} from "@/lib/booking/final-payment-deadline"

type BookingRow = {
  id: string
  package_id: string | null
  booking_code: string | null
  customer_email?: string | null
  created_at?: string | null
  pickup_date: string | null
  final_payment_amount?: number | null
  payment_type?: string | null
  total_amount: number | null
  display_currency?: string | null
  display_subtotal_amount?: number | null
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

function resolvePaymentHeadline(status: string | null) {
  const normalized = normalizeStatus(status)
  if (normalized === "dp_paid") return "Menunggu Pelunasan"
  if (normalized === "paid") return "Lunas"
  if (normalized === "pending") return "Menunggu Pembayaran"
  return titleCaseStatus(status)
}

function badgeClass(value: string | null, type: "payment" | "trip" | "escrow") {
  const normalized = normalizeStatus(value)
  if (normalized === "paid" || normalized === "confirmed" || normalized === "paid_out") {
    return toneClass("success")
  }
  if (normalized === "awaiting_admin_handoff" || normalized === "finance_review" || normalized === "payout_completed") {
    return toneClass("progress")
  }
  if (normalized === "held" || normalized === "partial_hold") {
    return type === "escrow" ? getEscrowStatusTone(value) : toneClass("progress")
  }
  if (normalized === "pending" || normalized === "dp_paid") {
    return type === "payment" ? getPaymentStatusTone(value) : toneClass("progress")
  }
  if (
    normalized === "merchant_arrived" ||
    normalized === "customer_picked_up" ||
    normalized === "customer_picked_up_pending_final_payment" ||
    normalized === "finance_processing" ||
    normalized === "payout_processing"
  ) {
    return toneClass("progress")
  }
  if (normalized === "cancelled" || normalized === "refund") {
    return toneClass("danger")
  }
  return toneClass("neutral")
}

function getTimelineStatus(booking: BookingRow) {
  if (booking.merchant_picked_up_at) return "Merchant sudah klik Go"
  if (booking.customer_picked_up_at) return "Customer sudah klik Picked up"
  if (booking.merchant_arrived_at) return "Merchant sudah tiba di meeting point"
  if (normalizeStatus(booking.payment_status) === "dp_paid") return "Menunggu pelunasan customer"
  if (normalizeStatus(booking.payment_status) === "paid") return "Pembayaran lengkap, menunggu progress pickup"
  return "Menunggu progress pickup"
}

function getBookingPriority(booking: BookingRow) {
  const paymentStatus = normalizeStatus(booking.payment_status)
  const bookingStatus = normalizeStatus(booking.booking_status)

  if (paymentStatus === "dp_paid") return 4
  if (paymentStatus === "paid") return 3
  if (bookingStatus === "cancelled") return 0
  if (paymentStatus === "pending") return 1
  return 2
}

export default async function CustomerDashboardPage() {
  const supabase = await createClient()
  const adminSupabase = createAdminClient()
  const locale = normalizeLocale(await getCurrentLocale())
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null
  if (!user.email) return null
  const customerCode = formatCustomerCode(user.id)

  let bookings: BookingRow[] | null = null
  let error: { message?: string } | null = null
    const adminBookingsResult = await adminSupabase
      .from("bookings")
      .select(
        "id, package_id, booking_code, customer_email, created_at, pickup_date, payment_type, final_payment_amount, total_amount, display_currency, display_subtotal_amount, payment_status, booking_status, escrow_status, merchant_arrived_at, merchant_picked_up_at, customer_picked_up_at",
      )
      .eq("customer_email", user.email)

  bookings = (adminBookingsResult.data as BookingRow[] | null) || null
  error = adminBookingsResult.error

  // Some production environments lag schema updates. Fall back to a reduced
  // query so the dashboard still renders instead of failing entirely.
  if (error) {
    const fallbackBookingsResult = await adminSupabase
      .from("bookings")
      .select(
        "id, package_id, booking_code, customer_email, created_at, payment_type, final_payment_amount, total_amount, display_currency, display_subtotal_amount, payment_status, booking_status, escrow_status, merchant_arrived_at, merchant_picked_up_at, customer_picked_up_at",
      )
      .eq("customer_email", user.email)

    bookings =
      ((fallbackBookingsResult.data as Omit<BookingRow, "pickup_date">[] | null) || []).map((booking) => ({
        ...booking,
        pickup_date: null,
      }))
    error = fallbackBookingsResult.error
  }

  const customerBookings = ((bookings as BookingRow[] | null) || []).sort((a, b) => {
    const priorityDiff = getBookingPriority(b) - getBookingPriority(a)
    if (priorityDiff !== 0) return priorityDiff

    const createdAtA = a.created_at ? new Date(a.created_at).getTime() : 0
    const createdAtB = b.created_at ? new Date(b.created_at).getTime() : 0
    if (createdAtB !== createdAtA) return createdAtB - createdAtA

    const timeA = a.pickup_date ? new Date(a.pickup_date).getTime() : 0
    const timeB = b.pickup_date ? new Date(b.pickup_date).getTime() : 0
    return timeB - timeA
  })
  const packageIds = [...new Set(customerBookings.map((booking) => booking.package_id).filter(Boolean))]

  let packageRows: PackageRow[] | null = []

  if (packageIds.length) {
    const adminPackagesResult = await adminSupabase
      .from("packages")
      .select("id, title, slug")
      .in("id", packageIds)
    packageRows = (adminPackagesResult.data as PackageRow[] | null) || []
  }

  const packageMap = new Map(((packageRows as PackageRow[] | null) || []).map((pkg) => [pkg.id, pkg]))

  const now = new Date()
  const upcomingTrips = customerBookings.filter((booking) => {
    if (!booking.pickup_date) return false
    const pickup = new Date(booking.pickup_date)
    return !Number.isNaN(pickup.getTime()) && pickup >= now && normalizeStatus(booking.booking_status) !== "cancelled"
  })

  const pendingPayments = customerBookings.filter((booking) => {
    const paymentStatus = normalizeStatus(booking.payment_status)
    return paymentStatus === "pending"
  })

  const pendingSettlements = customerBookings.filter((booking) => {
    const paymentStatus = normalizeStatus(booking.payment_status)
    return paymentStatus === "dp_paid"
  })

  const waitingCustomerAction = customerBookings.filter(
    (booking) => Boolean(booking.merchant_arrived_at) && !booking.customer_picked_up_at,
  )

  const readyForPayout = customerBookings.filter(
    (booking) => ["finance_review", "payout_processing", "paid_out"].includes(normalizeStatus(booking.escrow_status)),
  )

  const summaryCards = [
    {
      label: "Total Booking",
      value: customerBookings.length,
      note: "Riwayat seluruh transaksi Anda",
      tone: "from-amber-500 to-orange-400",
    },
    {
      label: "Trip Mendatang",
      value: upcomingTrips.length,
      note: "Booking dengan tanggal wisata terdekat",
      tone: "from-orange-500 to-amber-300",
    },
    {
      label: "Menunggu Aksi Anda",
      value: waitingCustomerAction.length,
      note: "Booking yang perlu konfirmasi customer",
      tone: "from-orange-600 to-red-400",
    },
    {
      label: "Dana Diproses RedFeng",
      value: readyForPayout.length,
      note: "Dana sedang atau sudah diproses melalui finance",
      tone: "from-lime-500 to-emerald-400",
    },
  ]

  const quickSignals = [
    {
      label: "Payment pending",
      value: String(pendingPayments.length),
      note: "Perlu diselesaikan agar booking tetap aman.",
    },
    {
      label: "Pelunasan",
      value: String(pendingSettlements.length),
      note: "Booking DP yang menunggu pelunasan akhir.",
    },
    {
      label: "Pickup confirmation",
      value: String(waitingCustomerAction.length),
      note: "Merchant sudah Arrived, customer perlu klik Picked up.",
    },
    {
      label: "Upcoming plans",
      value: String(upcomingTrips.length),
      note: "Trip aktif yang tanggalnya belum lewat.",
    },
  ]

  const customerChecklist = [
    {
      title: "Login sebelum checkout",
      body: "Booking dan pembayaran hanya bisa dilakukan oleh customer yang sudah login ke akun RedFeng.",
    },
    {
      title: "Pantau progress meeting point",
      body: "Saat merchant klik Arrived atau Go, update akan muncul di booking Anda sebagai acuan koordinasi.",
    },
    {
      title: "Konfirmasi sudah dijemput",
      body: "Klik Picked up setelah benar-benar naik kendaraan agar merchant bisa lanjut klik Go dan admin bisa handoff ke finance.",
    },
  ]

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fff8f1_0%,#f7f1e8_38%,#f3eee7_100%)] px-6 py-8 md:px-8 lg:px-10">
      <div className="mx-auto max-w-7xl space-y-8">
        <section className="overflow-hidden rounded-[36px] border border-orange-200/60 bg-[linear-gradient(135deg,#7c2d12_0%,#c2410c_34%,#f97316_68%,#fdba74_100%)] px-8 py-9 text-white shadow-[0_36px_110px_rgba(146,64,14,0.18)] sm:px-10 lg:px-12">
          <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
            <div>
              <span className="inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.34em] text-orange-50">
                Customer Travel Hub
              </span>
              <h1 className="mt-5 text-4xl font-semibold tracking-tight sm:text-5xl">
                Kelola booking, pembayaran, dan progress trip Anda dalam satu workspace.
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-8 text-orange-50/92">
                Pantau status transaksi, alur escrow RedFeng, progres pickup merchant, dan akses cepat
                ke detail trip tanpa perlu lompat antar halaman.
              </p>

              <div className="mt-8 grid gap-4 sm:grid-cols-3">
                {quickSignals.map((signal) => (
                  <div key={signal.label} className="rounded-[24px] border border-white/18 bg-white/10 p-5 backdrop-blur">
                    <p className="text-[11px] uppercase tracking-[0.28em] text-orange-100/85">{signal.label}</p>
                    <p className="mt-3 text-3xl font-semibold text-white">{signal.value}</p>
                    <p className="mt-3 text-sm leading-6 text-orange-50/85">{signal.note}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-4">
              <div className="rounded-[28px] border border-white/18 bg-white/10 p-6 backdrop-blur">
                <p className="text-[11px] uppercase tracking-[0.32em] text-orange-100/80">Travel snapshot</p>
                <p className="mt-4 text-3xl font-semibold text-white">{customerBookings.length}</p>
                <p className="mt-2 text-sm leading-7 text-orange-50/85">
                  Total booking yang terhubung ke akun Anda, termasuk booking aktif dan histori transaksi.
                </p>
                <div className="mt-4 inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-orange-50">
                  {customerCode}
                </div>
              </div>

              <div className="rounded-[28px] border border-white/18 bg-white/10 p-6 backdrop-blur">
                <p className="text-[11px] uppercase tracking-[0.32em] text-orange-100/80">Quick actions</p>
                <div className="mt-5 grid gap-3">
                  <Link
                    href="https://redfeng.co/paket-tour/"
                    className="rounded-[18px] bg-white px-4 py-3 text-center text-sm font-semibold text-slate-900 transition hover:bg-orange-50"
                  >
                    Jelajahi Paket
                  </Link>
                  <Link
                    href="https://redfeng.co/"
                    className="rounded-[18px] border border-white/20 px-4 py-3 text-center text-sm font-semibold text-white transition hover:bg-white/10"
                  >
                    Kembali ke Beranda
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {summaryCards.map((card) => (
            <article
              key={card.label}
              className="rounded-[28px] border border-[#f0ddc7] bg-white px-5 py-5 shadow-[0_18px_44px_rgba(15,23,42,0.06)]"
            >
              <div className={`h-2 w-20 rounded-full bg-gradient-to-r ${card.tone}`} />
              <p className="mt-5 text-[10px] font-semibold uppercase tracking-[0.24em] text-orange-500">{card.label}</p>
              <p className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-slate-950">{card.value}</p>
              <p className="mt-2 text-xs leading-6 text-slate-500">{card.note}</p>
            </article>
          ))}
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-[32px] border border-[#f3dbc3] bg-white/85 p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur-sm sm:p-7">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <span className="inline-flex rounded-full border border-orange-200 bg-orange-50 px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.3em] text-orange-700">
                  Booking Feed
                </span>
                <h2 className="mt-4 text-2xl font-semibold tracking-tight text-slate-950">Booking terbaru Anda</h2>
                <p className="mt-2 text-sm leading-7 text-slate-600">
                  Monitor pembayaran, status trip, dan escrow untuk booking yang paling relevan saat ini.
                </p>
              </div>
            </div>

            {error ? (
              <div className="mt-6 rounded-[24px] border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700">
                Gagal memuat dashboard customer.
                {error.message ? <div className="mt-2 text-xs text-rose-600">Detail: {error.message}</div> : null}
              </div>
            ) : customerBookings.length === 0 ? (
              <div className="mt-6 rounded-[24px] border border-[#efe1cf] bg-[#fffaf3] p-6 text-sm text-slate-600">
                Belum ada booking. Mulai dari jelajahi paket, lanjut checkout, lalu semua progres trip akan muncul di sini.
              </div>
            ) : (
              <div className="mt-6 space-y-4">
                {customerBookings.slice(0, 6).map((booking) => {
                  const pkg = packageMap.get(booking.package_id || "")
                  const canConfirmPickup = Boolean(booking.merchant_arrived_at) && !booking.customer_picked_up_at
                  const isDpPaid = normalizeStatus(booking.payment_status) === "dp_paid"
                  const canPayRemaining = isDpPaid && !isFinalPaymentOverdue(booking.pickup_date)
                  const finalPaymentDueDate = formatFinalPaymentDueLabel(booking.pickup_date)
                  const isSettlementOverdue = isDpPaid && isFinalPaymentOverdue(booking.pickup_date)
                  const dpAmountPaid = Math.max(Number(booking.total_amount || 0) - Number(booking.final_payment_amount || 0), 0)

                  return (
                    <article
                      key={booking.id}
                      className="rounded-[28px] border border-[#efe1cf] bg-[#fffaf3] p-5 transition hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-[0_18px_38px_rgba(194,65,12,0.1)]"
                    >
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">Booking</p>
                          <h3 className="mt-2 text-xl font-semibold text-slate-950">
                            {pkg?.title || booking.booking_code || booking.id}
                          </h3>
                          <p className="mt-2 text-sm text-slate-500">Kode: {booking.booking_code || booking.id}</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${badgeClass(booking.payment_status, "payment")}`}>
                            Bayar: {resolvePaymentHeadline(booking.payment_status)}
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
                        <div className="rounded-[20px] border border-[#efe1cf] bg-white/80 p-4">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">Tanggal Wisata</p>
                          <p className="mt-2 text-sm font-medium text-slate-900">{formatDate(booking.pickup_date)}</p>
                        </div>
                        <div className="rounded-[20px] border border-[#efe1cf] bg-white/80 p-4">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">Total Transaksi</p>
                          <p className="mt-2 text-sm font-medium text-slate-900">{formatMoney(Number(booking.total_amount || 0))}</p>
                          {booking.display_currency && (
                            <p className="mt-2 text-xs text-slate-500">
                              Harga sesuai bahasa customer:{" "}
                              {formatPackageMoney(booking.display_subtotal_amount, booking.display_currency, locale)}
                            </p>
                          )}
                        </div>
                        <div className="rounded-[20px] border border-[#efe1cf] bg-white/80 p-4">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">Progress Pickup</p>
                          <p className="mt-2 text-sm font-medium text-slate-900">{getTimelineStatus(booking)}</p>
                        </div>
                      </div>

                      {canPayRemaining ? (
                        <div className="mt-5 rounded-[24px] border border-amber-200 bg-[linear-gradient(135deg,#fff8e7_0%,#fff2cf_100%)] p-5 text-amber-900">
                          <div className="flex flex-wrap items-start justify-between gap-4">
                            <div>
                              <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-amber-700">Pelunasan Booking</p>
                              <h4 className="mt-2 text-lg font-semibold text-amber-950">
                                {isSettlementOverdue ? "Pelunasan Terlewat" : "Menunggu Pelunasan"}
                              </h4>
                              <p className="mt-2 max-w-2xl text-sm leading-7 text-amber-800">
                                {isSettlementOverdue
                                  ? "Batas waktu pelunasan sudah lewat. Booking ini memerlukan tindak lanjut manual dari tim Red Feng."
                                  : "DP untuk booking ini sudah diterima. Customer tinggal melunasi sisa pembayaran sebelum batas waktu berakhir."}
                              </p>
                            </div>
                              <span className="inline-flex rounded-full border border-amber-300 bg-white/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">
                                {isSettlementOverdue ? "Batas terlewat" : "Jatuh tempo H-3"}
                              </span>
                          </div>

                          <div className="mt-4 grid gap-3 md:grid-cols-3">
                            <div className="rounded-[18px] border border-amber-200 bg-white/70 p-4">
                              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-700">DP diterima</p>
                              <p className="mt-2 text-lg font-semibold text-amber-950">{formatMoney(dpAmountPaid)}</p>
                            </div>
                            <div className="rounded-[18px] border border-amber-200 bg-white/70 p-4">
                              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-700">Sisa pelunasan</p>
                              <p className="mt-2 text-lg font-semibold text-amber-950">{formatMoney(Number(booking.final_payment_amount || 0))}</p>
                            </div>
                            <div className="rounded-[18px] border border-amber-200 bg-white/70 p-4">
                              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-700">Batas pelunasan</p>
                              <p className="mt-2 text-lg font-semibold text-amber-950">{finalPaymentDueDate}</p>
                            </div>
                          </div>
                        </div>
                      ) : null}

                      <div className="mt-5 flex flex-wrap gap-3">
                        <Link
                          href={`/booking/${booking.id}`}
                          className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                        >
                          Lihat Detail Booking
                        </Link>
                        <Link
                          href={`/chat?booking_id=${booking.id}`}
                          className="rounded-2xl border border-orange-300 bg-orange-50 px-4 py-3 text-sm font-semibold text-orange-700 transition hover:bg-orange-100"
                        >
                          Chat Sesudah Booking
                        </Link>
                        {canConfirmPickup && (
                          <form action={confirmCustomerPickedUp}>
                            <input type="hidden" name="booking_id" value={booking.id} />
                            <button
                              type="submit"
                              className="rounded-2xl bg-orange-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-orange-600"
                            >
                              Picked up
                            </button>
                          </form>
                        )}
                        {canPayRemaining && (
                          <BookingPaymentButton
                            bookingId={booking.id}
                            label="Lunasi Sekarang"
                            className="rounded-2xl border border-orange-300 bg-orange-50 px-4 py-3 text-sm font-semibold text-orange-700 transition hover:bg-orange-100"
                          />
                        )}
                        {pkg?.slug && (
                          <Link
                            href={`/packages/${encodeURIComponent(pkg.slug)}`}
                            className="rounded-2xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-orange-300 hover:text-orange-600"
                          >
                            Lihat Paket
                          </Link>
                        )}
                      </div>
                    </article>
                  )
                })}
              </div>
            )}
          </div>

          <aside className="space-y-6">
            <div className="rounded-[32px] border border-[#f3dbc3] bg-white/85 p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur-sm">
              <span className="inline-flex rounded-full border border-orange-200 bg-orange-50 px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.3em] text-orange-700">
                Customer Guide
              </span>
              <h2 className="mt-4 text-2xl font-semibold tracking-tight text-slate-950">Checklist aksi customer</h2>
              <div className="mt-5 space-y-4">
                {customerChecklist.map((item, index) => (
                  <div key={item.title} className="rounded-[22px] border border-[#efe1cf] bg-[#fffaf3] p-4">
                    <p className="text-sm font-semibold text-slate-900">
                      {index + 1}. {item.title}
                    </p>
                    <p className="mt-2 text-sm leading-7 text-slate-600">{item.body}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[32px] border border-[#f3dbc3] bg-white/85 p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Payment overview</p>
              <h2 className="mt-4 text-2xl font-semibold tracking-tight text-slate-950">Ringkasan pembayaran</h2>
              <div className="mt-5 space-y-4 text-sm text-slate-600">
                <div className="flex items-center justify-between rounded-[18px] border border-[#efe1cf] bg-[#fffaf3] px-4 py-3">
                  <span>Menunggu pembayaran</span>
                  <span className="font-semibold text-slate-900">{pendingPayments.length}</span>
                </div>
                <div className="flex items-center justify-between rounded-[18px] border border-[#efe1cf] bg-[#fffaf3] px-4 py-3">
                  <span>Menunggu pelunasan</span>
                  <span className="font-semibold text-slate-900">{pendingSettlements.length}</span>
                </div>
                <div className="flex items-center justify-between rounded-[18px] border border-[#efe1cf] bg-[#fffaf3] px-4 py-3">
                  <span>Menunggu aksi customer</span>
                  <span className="font-semibold text-slate-900">{waitingCustomerAction.length}</span>
                </div>
                <div className="flex items-center justify-between rounded-[18px] border border-[#efe1cf] bg-[#fffaf3] px-4 py-3">
                  <span>Diproses finance</span>
                  <span className="font-semibold text-slate-900">{readyForPayout.length}</span>
                </div>
              </div>
            </div>
          </aside>
        </section>
      </div>
    </main>
  )
}
