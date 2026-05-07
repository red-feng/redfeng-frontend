import Link from "next/link"
import BookingPaymentButton from "@/app/components/BookingPaymentButton"
import { confirmCustomerPickedUp } from "@/app/booking/[id]/actions"
import {
  formatFinalPaymentDueLabel,
  isFinalPaymentOverdue,
} from "@/lib/booking/final-payment-deadline"
import { isBookingExpiredForNonPayment } from "@/lib/bookings/draft-cleanup"
import { normalizeLocale, type Locale } from "@/lib/i18n"
import { getCurrentLocale } from "@/lib/locale"
import { formatBookingCode } from "@/lib/merchant-code"
import { formatPackageMoney } from "@/lib/package-pricing"
import {
  getEscrowStatusTone,
  getPaymentStatusTone,
  normalizeStatus,
  toneClass,
} from "@/lib/status-tones"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

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

function formatDate(dateStr: string | null, locale: Locale) {
  if (!dateStr) return "-"

  const date = new Date(dateStr)
  if (Number.isNaN(date.getTime())) return dateStr

  const dateLocale = locale === "en" ? "en-US" : locale === "zh" ? "zh-CN" : "id-ID"
  return date.toLocaleDateString(dateLocale, {
    day: "2-digit",
    month: "long",
    year: "numeric",
  })
}

function resolvePaymentHeadline(status: string | null, locale: Locale) {
  const normalized = normalizeStatus(status)
  if (normalized === "paid") return locale === "en" ? "Paid" : locale === "zh" ? "已付款" : "Lunas"
  if (normalized === "dp_paid") return locale === "en" ? "DP Paid" : locale === "zh" ? "定金已付" : "DP Dibayar"
  if (normalized === "pending" || normalized === "unpaid") {
    return locale === "en" ? "Waiting Payment" : locale === "zh" ? "等待付款" : "Menunggu Pembayaran"
  }
  return titleCaseStatus(status)
}

function resolveTripStatusLabel(status: string | null, locale: Locale) {
  const normalized = normalizeStatus(status)
  if (normalized === "confirmed") return locale === "en" ? "Confirmed" : locale === "zh" ? "已确认" : "Terkonfirmasi"
  if (normalized === "awaiting_final_payment") {
    return locale === "en" ? "Awaiting Settlement" : locale === "zh" ? "等待尾款" : "Menunggu Pelunasan"
  }
  if (normalized === "finance_review") {
    return locale === "en" ? "Finance Review" : locale === "zh" ? "财务审核" : "Review Finance"
  }
  if (normalized === "finance_processing") {
    return locale === "en" ? "Finance Processing" : locale === "zh" ? "财务处理中" : "Finance Processing"
  }
  if (normalized === "payout_completed") {
    return locale === "en" ? "Completed" : locale === "zh" ? "已完成" : "Selesai"
  }
  return titleCaseStatus(status)
}

function resolveEscrowStatusLabel(status: string | null, locale: Locale) {
  const normalized = normalizeStatus(status)
  if (normalized === "held" || normalized === "partial_hold") {
    return locale === "en" ? "Held" : locale === "zh" ? "托管中" : "Ditahan"
  }
  if (normalized === "finance_review") {
    return locale === "en" ? "Finance Review" : locale === "zh" ? "财务审核" : "Review Finance"
  }
  if (normalized === "payout_processing") {
    return locale === "en" ? "Payout Processing" : locale === "zh" ? "付款处理中" : "Payout Diproses"
  }
  if (normalized === "paid_out") {
    return locale === "en" ? "Paid Out" : locale === "zh" ? "已打款" : "Sudah Dibayarkan"
  }
  return titleCaseStatus(status)
}

function badgeClass(value: string | null, type: "payment" | "trip" | "escrow") {
  if (type === "payment") return getPaymentStatusTone(value, "bordered")
  if (type === "escrow") return getEscrowStatusTone(value, "bordered")

  const normalized = normalizeStatus(value)
  if (normalized === "confirmed" || normalized === "completed" || normalized === "payout_completed") {
    return toneClass("success", "bordered")
  }
  if (
    normalized === "awaiting_final_payment" ||
    normalized === "pending" ||
    normalized === "merchant_arrived" ||
    normalized === "customer_picked_up"
  ) {
    return toneClass("pending", "bordered")
  }
  if (normalized.startsWith("cancelled") || normalized === "rejected") {
    return toneClass("danger", "bordered")
  }
  return toneClass("neutral", "bordered")
}

function getTimelineStatus(booking: BookingRow, locale: Locale) {
  const t = {
    merchantGo: locale === "en" ? "Merchant clicked Go" : locale === "zh" ? "商家已点击 Go" : "Merchant sudah klik Go",
    customerPickedUp:
      locale === "en" ? "Customer confirmed pickup" : locale === "zh" ? "客户已确认上车" : "Customer sudah klik Picked up",
    merchantArrived:
      locale === "en" ? "Merchant arrived" : locale === "zh" ? "商家已到达" : "Merchant sudah tiba",
    waitingSettlement:
      locale === "en" ? "Waiting final payment" : locale === "zh" ? "等待尾款" : "Menunggu pelunasan",
    fullyPaid:
      locale === "en" ? "Fully paid, waiting pickup" : locale === "zh" ? "已付清，等待接送" : "Sudah lunas, menunggu pickup",
    processing:
      locale === "en" ? "Processing booking" : locale === "zh" ? "订单处理中" : "Booking sedang diproses",
  }

  if (booking.merchant_picked_up_at) return t.merchantGo
  if (booking.customer_picked_up_at) return t.customerPickedUp
  if (booking.merchant_arrived_at) return t.merchantArrived
  if (normalizeStatus(booking.payment_status) === "dp_paid") return t.waitingSettlement
  if (normalizeStatus(booking.payment_status) === "paid") return t.fullyPaid
  return t.processing
}

function getBookingPriority(booking: BookingRow) {
  const paymentStatus = normalizeStatus(booking.payment_status)
  const bookingStatus = normalizeStatus(booking.booking_status)

  if (booking.merchant_arrived_at && !booking.customer_picked_up_at) return 100
  if (paymentStatus === "pending" || paymentStatus === "unpaid") return 90
  if (paymentStatus === "dp_paid" || bookingStatus === "awaiting_final_payment") return 80
  if (paymentStatus === "paid" && !booking.merchant_arrived_at) return 70
  if (booking.customer_picked_up_at && !booking.merchant_picked_up_at) return 60
  if (["finance_review", "finance_processing", "payout_completed"].includes(bookingStatus)) return 50
  if (bookingStatus.startsWith("cancelled")) return 0
  return 30
}

function getCustomerActionHint(
  booking: BookingRow,
  locale: Locale,
) {
  const paymentStatus = normalizeStatus(booking.payment_status)
  const bookingStatus = normalizeStatus(booking.booking_status)
  const escrowStatus = normalizeStatus(booking.escrow_status)

  if (paymentStatus === "pending" || paymentStatus === "unpaid") {
    return {
      tone: "border-slate-200 bg-slate-50 text-slate-700",
      text:
        locale === "en"
          ? "Complete payment soon so this booking remains secured."
          : locale === "zh"
            ? "请尽快完成付款，以确保此订单仍然有效。"
            : "Segera selesaikan pembayaran agar booking ini tetap aman.",
    }
  }

  if (paymentStatus === "dp_paid") {
    return {
      tone: "border-amber-200 bg-amber-50 text-amber-800",
      text:
        locale === "en"
          ? "Your DP is recorded. Complete the remaining payment before the H-3 deadline."
          : locale === "zh"
            ? "定金已记录，请在出发前 3 天截止前完成尾款。"
            : "DP sudah tercatat. Selesaikan sisa pembayaran sebelum batas H-3.",
    }
  }

  if (paymentStatus === "paid" && !booking.merchant_arrived_at) {
    return {
      tone: "border-sky-200 bg-sky-50 text-sky-800",
      text:
        locale === "en"
          ? "This booking is fully paid. Wait for the merchant to arrive at the meeting point."
          : locale === "zh"
            ? "该订单已全额付款，请等待商家到达集合点。"
            : "Booking ini sudah lunas. Tinggal tunggu merchant tiba di meeting point.",
    }
  }

  if (booking.merchant_arrived_at && !booking.customer_picked_up_at) {
    return {
      tone: "border-orange-200 bg-orange-50 text-orange-800",
      text:
        locale === "en"
          ? "Merchant has arrived. Click Picked up only after you are actually picked up."
          : locale === "zh"
            ? "商家已到达，请在您真正上车后再点击 Picked up。"
            : "Merchant sudah tiba. Klik Picked up setelah Anda benar-benar dijemput.",
    }
  }

  if (booking.customer_picked_up_at && !booking.merchant_picked_up_at) {
    return {
      tone: "border-violet-200 bg-violet-50 text-violet-800",
      text:
        locale === "en"
          ? "Your confirmation is saved. The merchant now needs to close the pickup step."
          : locale === "zh"
            ? "您的确认已保存，接下来商家需要完成接送步骤。"
            : "Konfirmasi Anda sudah masuk. Merchant tinggal menutup tahap pickup.",
    }
  }

  if (bookingStatus === "finance_review" || escrowStatus === "finance_review") {
    return {
      tone: "border-sky-200 bg-sky-50 text-sky-800",
      text:
        locale === "en"
          ? "Finance is reviewing the next payout step for this booking."
          : locale === "zh"
            ? "财务正在审核此订单的下一步付款流程。"
            : "Finance sedang meninjau tahap payout berikutnya untuk booking ini.",
    }
  }

  if (bookingStatus === "finance_processing" || escrowStatus === "payout_processing") {
    return {
      tone: "border-indigo-200 bg-indigo-50 text-indigo-800",
      text:
        locale === "en"
          ? "Finance is processing this booking in the payout flow."
          : locale === "zh"
            ? "财务正在处理此订单的打款流程。"
            : "Finance sedang memproses booking ini di alur payout.",
    }
  }

  return null
}

const bookingsCopy = {
  id: {
    eyebrow: "Pusat Pesanan",
    title: "Lihat semua booking, pembayaran, dan progress trip Anda dalam satu halaman.",
    body: "Halaman ini dibuat khusus untuk pesanan agar lebih fokus dari dashboard akun. Semua status penting, aksi pembayaran, dan link detail booking dipusatkan di sini.",
    total: "Total Pesanan",
    waitingPayment: "Menunggu Pembayaran",
    needAction: "Perlu Aksi Anda",
    upcoming: "Trip Mendatang",
    resultLabel: "Daftar pesanan",
    resultBody: "Semua order aktif dan histori yang masih relevan akan tampil di bawah ini.",
    noBookings: "Belum ada pesanan. Mulai dari cari paket atau promo dulu, lalu semua order Anda akan muncul di sini.",
    failedLoad: "Gagal memuat daftar pesanan customer.",
    viewBooking: "Lihat booking",
    viewPackage: "Lihat paket",
    payNow: "Bayar sekarang",
    travelDate: "Tanggal Wisata",
    totalTransaction: "Total Transaksi",
    localizedPrice: "Harga sesuai bahasa customer:",
    pickupProgress: "Progress Pickup",
    createdAt: "Dibuat",
    bookingCode: "Kode Booking",
    pay: "Bayar",
    trip: "Trip",
    escrow: "Escrow",
    settlementBadge: "Pelunasan Booking",
    settlementDeadline: "Batas Pelunasan",
    dpReceived: "DP diterima",
    remainingSettlement: "Sisa pelunasan",
    waitingSettlement: "Menunggu Pelunasan",
    settlementMissed: "Pelunasan Terlewat",
    settlementWaitingBody: "DP sudah diterima. Silakan lunasi sisa pembayaran sebelum batas H-3.",
    settlementMissedBody: "Batas pelunasan sudah lewat. Booking ini perlu ditindaklanjuti oleh tim Red Feng.",
    deadlinePassed: "Batas terlewat",
    dueH3: "Jatuh tempo H-3",
    browsePackages: "Jelajahi paket",
    browsePromo: "Lihat promo",
  },
  en: {
    eyebrow: "Bookings Center",
    title: "See all your bookings, payments, and trip progress in one dedicated page.",
    body: "This page is focused on orders instead of the broader account dashboard. Important statuses, payment actions, and booking links are centralized here.",
    total: "Total Bookings",
    waitingPayment: "Waiting Payment",
    needAction: "Needs Your Action",
    upcoming: "Upcoming Trips",
    resultLabel: "Bookings list",
    resultBody: "All active orders and still-relevant history appear below.",
    noBookings: "No bookings yet. Start by browsing packages or promos, and your orders will appear here.",
    failedLoad: "Failed to load customer bookings.",
    viewBooking: "View booking",
    viewPackage: "View package",
    payNow: "Pay now",
    travelDate: "Travel Date",
    totalTransaction: "Total Transaction",
    localizedPrice: "Localized customer price:",
    pickupProgress: "Pickup Progress",
    createdAt: "Created",
    bookingCode: "Booking Code",
    pay: "Pay",
    trip: "Trip",
    escrow: "Escrow",
    settlementBadge: "Booking Settlement",
    settlementDeadline: "Settlement Deadline",
    dpReceived: "DP received",
    remainingSettlement: "Remaining payment",
    waitingSettlement: "Waiting Settlement",
    settlementMissed: "Settlement Missed",
    settlementWaitingBody: "Your DP has been received. Complete the remaining payment before the H-3 deadline.",
    settlementMissedBody: "The final payment deadline has passed. This booking needs follow-up from the Red Feng team.",
    deadlinePassed: "Deadline passed",
    dueH3: "Due H-3",
    browsePackages: "Browse packages",
    browsePromo: "View promos",
  },
  zh: {
    eyebrow: "订单中心",
    title: "在一个专门页面查看您的全部订单、付款和行程进度。",
    body: "此页面专注于订单本身，而不是更宽泛的账户仪表板。重要状态、付款操作和订单链接都集中在这里。",
    total: "订单总数",
    waitingPayment: "等待付款",
    needAction: "需要您的操作",
    upcoming: "即将出行",
    resultLabel: "订单列表",
    resultBody: "所有有效订单和仍然相关的历史记录都会显示在下方。",
    noBookings: "您还没有订单。先去浏览套餐或促销，之后订单会显示在这里。",
    failedLoad: "加载客户订单失败。",
    viewBooking: "查看订单",
    viewPackage: "查看套餐",
    payNow: "立即付款",
    travelDate: "出行日期",
    totalTransaction: "交易总额",
    localizedPrice: "本地化价格：",
    pickupProgress: "接送进度",
    createdAt: "创建时间",
    bookingCode: "订单编号",
    pay: "付款",
    trip: "行程",
    escrow: "托管",
    settlementBadge: "尾款信息",
    settlementDeadline: "尾款截止",
    dpReceived: "已收定金",
    remainingSettlement: "剩余尾款",
    waitingSettlement: "等待尾款",
    settlementMissed: "错过尾款",
    settlementWaitingBody: "定金已收到，请在 H-3 截止前完成剩余付款。",
    settlementMissedBody: "尾款截止时间已过，此订单需要 Red Feng 团队人工跟进。",
    deadlinePassed: "已过截止",
    dueH3: "H-3 截止",
    browsePackages: "浏览套餐",
    browsePromo: "查看促销",
  },
}

export default async function CustomerBookingsPage() {
  const locale = normalizeLocale(await getCurrentLocale())
  const supabase = await createClient("customer")
  const adminSupabase = createAdminClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user?.email) return null

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

  const customerBookings = ((bookings as BookingRow[] | null) || [])
    .filter((booking) => !isBookingExpiredForNonPayment(booking))
    .sort((a, b) => {
      const priorityDiff = getBookingPriority(b) - getBookingPriority(a)
      if (priorityDiff !== 0) return priorityDiff

      const createdAtA = a.created_at ? new Date(a.created_at).getTime() : 0
      const createdAtB = b.created_at ? new Date(b.created_at).getTime() : 0
      if (createdAtB !== createdAtA) return createdAtB - createdAtA

      const pickupA = a.pickup_date ? new Date(a.pickup_date).getTime() : 0
      const pickupB = b.pickup_date ? new Date(b.pickup_date).getTime() : 0
      return pickupB - pickupA
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
  const pendingPayments = customerBookings.filter((booking) => {
    const paymentStatus = normalizeStatus(booking.payment_status)
    return paymentStatus === "pending" || paymentStatus === "unpaid"
  })
  const waitingCustomerAction = customerBookings.filter(
    (booking) => Boolean(booking.merchant_arrived_at) && !booking.customer_picked_up_at,
  )
  const upcomingTrips = customerBookings.filter((booking) => {
    if (!booking.pickup_date) return false
    const pickup = new Date(booking.pickup_date)
    return !Number.isNaN(pickup.getTime()) && pickup >= now && !normalizeStatus(booking.booking_status).startsWith("cancelled")
  })
  const t = bookingsCopy[locale]

  const summaryCards = [
    {
      label: t.total,
      value: customerBookings.length,
      tone: "from-orange-500 to-amber-300",
    },
    {
      label: t.waitingPayment,
      value: pendingPayments.length,
      tone: "from-amber-500 to-orange-500",
    },
    {
      label: t.needAction,
      value: waitingCustomerAction.length,
      tone: "from-red-500 to-orange-400",
    },
    {
      label: t.upcoming,
      value: upcomingTrips.length,
      tone: "from-emerald-500 to-lime-400",
    },
  ]

  return (
    <main className="min-h-screen px-4 py-5 sm:px-6 sm:py-6 md:px-8 md:py-8 lg:px-10">
      <div className="mx-auto max-w-7xl space-y-6 sm:space-y-8">
        <section className="overflow-hidden rounded-[30px] border border-orange-200/60 bg-[linear-gradient(135deg,#7c2d12_0%,#c2410c_38%,#f97316_72%,#fdba74_100%)] px-5 py-6 text-white shadow-[0_30px_90px_rgba(146,64,14,0.18)] sm:rounded-[36px] sm:px-8 sm:py-9 md:px-10">
          <span className="inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.34em] text-orange-50">
            {t.eyebrow}
          </span>
          <h1 className="mt-4 max-w-4xl text-[28px] font-semibold tracking-tight sm:text-[34px] lg:text-[42px]">
            {t.title}
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-orange-50/92 sm:text-base sm:leading-8">
            {t.body}
          </p>

          <div className="mt-6 grid gap-3 sm:mt-8 sm:grid-cols-2 xl:grid-cols-4">
            {summaryCards.map((card) => (
              <div key={card.label} className="rounded-[22px] border border-white/18 bg-white/10 p-4 backdrop-blur sm:rounded-[24px] sm:p-5">
                <div className={`h-2 w-20 rounded-full bg-gradient-to-r ${card.tone}`} />
                <p className="mt-4 text-[11px] uppercase tracking-[0.26em] text-orange-100/85">{card.label}</p>
                <p className="mt-3 text-[28px] font-semibold text-white sm:text-3xl">{card.value}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-[32px] border border-[#f3dbc3] bg-white/90 p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur-sm sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <span className="inline-flex rounded-full border border-orange-200 bg-orange-50 px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.3em] text-orange-700">
                {t.resultLabel}
              </span>
              <h2 className="mt-4 text-2xl font-semibold tracking-tight text-slate-950">{t.total}</h2>
              <p className="mt-2 text-sm leading-7 text-slate-600">{t.resultBody}</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/packages"
                className="inline-flex rounded-2xl border border-[#ead8c0] bg-[#fffaf3] px-4 py-3 text-sm font-semibold text-slate-900 transition hover:border-orange-200 hover:bg-orange-50"
              >
                {t.browsePackages}
              </Link>
              <Link
                href="/promo"
                className="inline-flex rounded-2xl border border-[#ead8c0] bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-orange-200 hover:text-orange-600"
              >
                {t.browsePromo}
              </Link>
            </div>
          </div>

          {error ? (
            <div className="mt-6 rounded-[24px] border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700">
              {t.failedLoad}
              {error.message ? <div className="mt-2 text-xs text-rose-600">Detail: {error.message}</div> : null}
            </div>
          ) : customerBookings.length === 0 ? (
            <div className="mt-6 rounded-[24px] border border-[#efe1cf] bg-[#fffaf3] p-6 text-sm text-slate-600">
              {t.noBookings}
            </div>
          ) : (
            <div className="mt-6 space-y-4">
              {customerBookings.map((booking) => {
                const pkg = packageMap.get(booking.package_id || "")
                const canConfirmPickup = Boolean(booking.merchant_arrived_at) && !booking.customer_picked_up_at
                const isDpPaid = normalizeStatus(booking.payment_status) === "dp_paid"
                const canPayRemaining = isDpPaid && !isFinalPaymentOverdue(booking.pickup_date)
                const finalPaymentDueDate = formatFinalPaymentDueLabel(booking.pickup_date)
                const isSettlementOverdue = isDpPaid && isFinalPaymentOverdue(booking.pickup_date)
                const dpAmountPaid = Math.max(Number(booking.total_amount || 0) - Number(booking.final_payment_amount || 0), 0)
                const actionHint = getCustomerActionHint(booking, locale)

                return (
                  <article
                    key={booking.id}
                    className="rounded-[28px] border border-[#efe1cf] bg-[#fffaf3] p-5 transition hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-[0_18px_38px_rgba(194,65,12,0.1)]"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">{pkg?.title ? pkg.title : t.bookingCode}</p>
                        <h3 className="mt-2 text-xl font-semibold text-slate-950">
                          {pkg?.title || formatBookingCode(booking.booking_code, booking.id)}
                        </h3>
                        <p className="mt-2 text-sm text-slate-500">
                          {t.bookingCode}: {formatBookingCode(booking.booking_code, booking.id)}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${badgeClass(booking.payment_status, "payment")}`}>
                          {t.pay}: {resolvePaymentHeadline(booking.payment_status, locale)}
                        </span>
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${badgeClass(booking.booking_status, "trip")}`}>
                          {t.trip}: {resolveTripStatusLabel(booking.booking_status, locale)}
                        </span>
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${badgeClass(booking.escrow_status, "escrow")}`}>
                          {t.escrow}: {resolveEscrowStatusLabel(booking.escrow_status, locale)}
                        </span>
                      </div>
                    </div>

                    <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                      <div className="rounded-[20px] border border-[#efe1cf] bg-white/80 p-4">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">{t.createdAt}</p>
                        <p className="mt-2 text-sm font-medium text-slate-900">{formatDate(booking.created_at || null, locale)}</p>
                      </div>
                      <div className="rounded-[20px] border border-[#efe1cf] bg-white/80 p-4">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">{t.travelDate}</p>
                        <p className="mt-2 text-sm font-medium text-slate-900">{formatDate(booking.pickup_date, locale)}</p>
                      </div>
                      <div className="rounded-[20px] border border-[#efe1cf] bg-white/80 p-4">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">{t.totalTransaction}</p>
                        <p className="mt-2 text-sm font-medium text-slate-900">{formatMoney(Number(booking.total_amount || 0))}</p>
                        {booking.display_currency ? (
                          <p className="mt-2 text-xs text-slate-500">
                            {t.localizedPrice} {formatPackageMoney(booking.display_subtotal_amount, booking.display_currency, locale)}
                          </p>
                        ) : null}
                      </div>
                      <div className="rounded-[20px] border border-[#efe1cf] bg-white/80 p-4">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">{t.pickupProgress}</p>
                        <p className="mt-2 text-sm font-medium text-slate-900">{getTimelineStatus(booking, locale)}</p>
                      </div>
                    </div>

                    {actionHint ? (
                      <div className={`mt-5 rounded-[20px] border px-4 py-4 text-sm leading-7 ${actionHint.tone}`}>
                        {actionHint.text}
                      </div>
                    ) : null}

                    {isDpPaid ? (
                      <div className="mt-5 rounded-[24px] border border-amber-200 bg-[linear-gradient(135deg,#fff8e7_0%,#fff2cf_100%)] p-5 text-amber-900">
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          <div>
                            <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-amber-700">{t.settlementBadge}</p>
                            <h4 className="mt-2 text-lg font-semibold text-amber-950">
                              {isSettlementOverdue ? t.settlementMissed : t.waitingSettlement}
                            </h4>
                            <p className="mt-2 max-w-2xl text-sm leading-7 text-amber-800">
                              {isSettlementOverdue ? t.settlementMissedBody : t.settlementWaitingBody}
                            </p>
                          </div>
                          <span className="inline-flex rounded-full border border-amber-300 bg-white/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">
                            {isSettlementOverdue ? t.deadlinePassed : t.dueH3}
                          </span>
                        </div>

                        <div className="mt-4 grid gap-3 md:grid-cols-3">
                          <div className="rounded-[18px] border border-amber-200 bg-white/70 p-4">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-700">{t.dpReceived}</p>
                            <p className="mt-2 text-lg font-semibold text-amber-950">{formatMoney(dpAmountPaid)}</p>
                          </div>
                          <div className="rounded-[18px] border border-amber-200 bg-white/70 p-4">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-700">{t.remainingSettlement}</p>
                            <p className="mt-2 text-lg font-semibold text-amber-950">
                              {formatMoney(Number(booking.final_payment_amount || 0))}
                            </p>
                          </div>
                          <div className="rounded-[18px] border border-amber-200 bg-white/70 p-4">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-700">{t.settlementDeadline}</p>
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
                        {t.viewBooking}
                      </Link>
                      {canConfirmPickup ? (
                        <form action={confirmCustomerPickedUp}>
                          <input type="hidden" name="booking_id" value={booking.id} />
                          <button
                            type="submit"
                            className="rounded-2xl bg-orange-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-orange-600"
                          >
                            Picked up
                          </button>
                        </form>
                      ) : null}
                      {canPayRemaining ? (
                        <BookingPaymentButton
                          bookingId={booking.id}
                          locale={locale}
                          label={t.payNow}
                          className="rounded-2xl border border-orange-300 bg-orange-50 px-4 py-3 text-sm font-semibold text-orange-700 transition hover:bg-orange-100"
                        />
                      ) : null}
                      {pkg?.slug ? (
                        <Link
                          href={`/packages/${encodeURIComponent(pkg.slug)}`}
                          className="rounded-2xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-orange-300 hover:text-orange-600"
                        >
                          {t.viewPackage}
                        </Link>
                      ) : null}
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
