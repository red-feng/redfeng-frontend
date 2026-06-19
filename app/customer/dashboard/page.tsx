import Link from "next/link"
import { createAdminClient } from "@/lib/supabase/admin"
import { formatBookingCode, formatCustomerCode } from "@/lib/merchant-code"
import { createClient } from "@/lib/supabase/server"
import BookingPaymentButton from "@/app/components/BookingPaymentButton"
import { confirmCustomerPickedUp } from "@/app/booking/[id]/actions"
import { getCurrentLocale } from "@/lib/locale"
import { normalizeLocale, type Locale } from "@/lib/i18n"
import { formatPackageMoney } from "@/lib/package-pricing"
import { getEscrowStatusTone, getPaymentStatusTone, normalizeStatus, toneClass } from "@/lib/status-tones"
import { buildSiteUrl, getSiteBaseUrl } from "@/lib/site-config"
import {
  formatFinalPaymentDueLabel,
  isFinalPaymentOverdue,
} from "@/lib/booking/final-payment-deadline"
import { isBookingExpiredForNonPayment } from "@/lib/bookings/draft-cleanup"

type BookingRow = {
  id: string
  package_id: string | null
  booking_code: string | null
  booking_product_type?: string | null
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
  flight_lifecycle_status?: string | null
  flight_booking_hold_expires_at?: string | null
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

function isTripCompletedStatus(status: string | null) {
  const normalized = normalizeStatus(status)
  return normalized === "completed" || normalized === "done"
}

function getCustomerActionHint(
  booking: BookingRow,
  t: {
    paymentPendingNote: string
    settlementWaitingBody: string
  },
  locale: Locale,
) {
  const paymentStatus = normalizeStatus(booking.payment_status)
  const bookingStatus = normalizeStatus(booking.booking_status)
  const escrowStatus = normalizeStatus(booking.escrow_status)
  const hintText = {
    waitingMerchantArrived:
      locale === "en"
        ? "The booking is fully paid. Now wait for the merchant to arrive at the meeting point and click Arrived."
        : locale === "zh"
          ? "订单已全额付款。现在请等待商家到达集合点并点击 Arrived。"
          : "Booking sudah lunas. Sekarang tunggu merchant tiba di meeting point dan klik Arrived.",
    customerPickup:
      locale === "en"
        ? "The merchant has Arrived. Click Picked up only after you are actually picked up."
        : locale === "zh"
          ? "商家已经点击 Arrived。请在您真正上车后再点击 Picked up。"
          : "Merchant sudah Arrived. Klik Picked up setelah Anda benar-benar dijemput.",
    waitingMerchantGo:
      locale === "en"
        ? "Your confirmation is recorded. The merchant now needs to close the pickup checkpoint by clicking Go."
        : locale === "zh"
          ? "您的确认已记录。现在商家需要点击 Go 来完成接送检查点。"
          : "Konfirmasi Anda sudah masuk. Merchant sekarang perlu menutup pickup dengan klik Go.",
    waitingAdminFinance:
      locale === "en"
        ? "The pickup checkpoints are complete. Your booking is now waiting for admin handoff to finance."
        : locale === "zh"
          ? "接送检查点已经完整。您的订单现在正在等待管理员移交给财务。"
          : "Checkpoint pickup lengkap. Booking Anda sekarang menunggu admin mengirimkannya ke finance.",
    financeReview:
      locale === "en"
        ? "The booking has been forwarded to finance and is waiting for the merchant payout review."
        : locale === "zh"
          ? "订单已经转交给财务，目前正在等待商家 payout 审核。"
          : "Booking sudah diteruskan ke finance dan sedang menunggu review payout merchant.",
    financeProcessing:
      locale === "en"
        ? "Finance is currently processing the merchant payout transfer for this booking."
        : locale === "zh"
          ? "财务正在为该订单处理商家 payout 转账。"
          : "Finance sedang memproses transfer payout merchant untuk booking ini.",
    payoutCompleted:
      locale === "en"
        ? "The merchant payout flow for this booking has already been completed."
        : locale === "zh"
          ? "该订单的商家 payout 流程已经处理完成。"
          : "Alur payout merchant untuk booking ini sudah selesai diproses.",
  }

  if (paymentStatus === "pending" || paymentStatus === "unpaid") {
    if (isFlightBooking(booking) && !canOpenFlightPayment(booking)) {
      return {
        tone: "border-sky-200 bg-sky-50 text-sky-800",
        text:
          locale === "en"
            ? "Red Feng is rechecking the fare and securing the airline hold. Payment will open after the hold is confirmed."
            : locale === "zh"
              ? "Red Feng 正在复查票价并锁定航空公司预订。确认 hold 后将开放付款。"
              : "Red Feng sedang recheck fare dan mengunci hold maskapai. Pembayaran akan terbuka setelah hold terkonfirmasi.",
      }
    }

    return {
      tone: "border-slate-200 bg-slate-50 text-slate-700",
      text: t.paymentPendingNote,
    }
  }

  if (paymentStatus === "dp_paid") {
    return {
      tone: "border-amber-200 bg-amber-50 text-amber-800",
      text: t.settlementWaitingBody,
    }
  }

  if (paymentStatus === "paid" && !booking.merchant_arrived_at) {
    return {
      tone: "border-sky-200 bg-sky-50 text-sky-800",
      text: hintText.waitingMerchantArrived,
    }
  }

  if (booking.merchant_arrived_at && !booking.customer_picked_up_at) {
    return {
      tone: "border-orange-200 bg-orange-50 text-orange-800",
      text: hintText.customerPickup,
    }
  }

  if (booking.customer_picked_up_at && !booking.merchant_picked_up_at) {
    return {
      tone: "border-violet-200 bg-violet-50 text-violet-800",
      text: hintText.waitingMerchantGo,
    }
  }

  if (bookingStatus === "awaiting_admin_handoff" || escrowStatus === "awaiting_admin_handoff") {
    return {
      tone: "border-emerald-200 bg-emerald-50 text-emerald-800",
      text: hintText.waitingAdminFinance,
    }
  }

  if (bookingStatus === "finance_review") {
    return {
      tone: "border-sky-200 bg-sky-50 text-sky-800",
      text: hintText.financeReview,
    }
  }

  if (bookingStatus === "finance_processing" || escrowStatus === "payout_processing") {
    return {
      tone: "border-indigo-200 bg-indigo-50 text-indigo-800",
      text: hintText.financeProcessing,
    }
  }

  if (bookingStatus === "payout_completed" || escrowStatus === "paid_out") {
    return {
      tone: "border-emerald-200 bg-emerald-50 text-emerald-800",
      text: hintText.payoutCompleted,
    }
  }

  return null
}

function isFlightBooking(booking: BookingRow) {
  return normalizeStatus(booking.booking_product_type || null) === "flight"
}

function isExpiredDateTime(value: string | null | undefined) {
  if (!value) return false
  const parsed = new Date(value)
  return !Number.isNaN(parsed.getTime()) && parsed.getTime() <= Date.now()
}

function canOpenFlightPayment(booking: BookingRow) {
  if (!isFlightBooking(booking)) return false
  return (
    normalizeStatus(booking.flight_lifecycle_status) === "booking_hold_created" &&
    !isExpiredDateTime(booking.flight_booking_hold_expires_at)
  )
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

const dashboardCopy = {
  id: {
    paymentWaitingSettlement: "Menunggu Pelunasan",
    paid: "Lunas",
    awaitingPayment: "Menunggu Pembayaran",
    refundReview: "Refund Ditinjau",
    merchantGo: "Merchant sudah klik Go",
    customerPickedUp: "Customer sudah klik Picked up",
    merchantArrived: "Merchant sudah tiba di meeting point",
    waitingSettlementCustomer: "Menunggu pelunasan customer",
    completePaymentWaitingPickup: "Pembayaran lengkap, menunggu progress pickup",
    waitingPickupProgress: "Menunggu progress pickup",
    totalBooking: "Total Booking",
    totalBookingNote: "Riwayat seluruh transaksi Anda",
    upcomingTrips: "Trip Mendatang",
    upcomingTripsNote: "Booking dengan tanggal wisata terdekat",
    waitingYourAction: "Menunggu Aksi Anda",
    waitingYourActionNote: "Booking yang perlu konfirmasi customer",
    financeFunds: "Dana Diproses RedFeng",
    financeFundsNote: "Dana sedang atau sudah diproses melalui finance",
    paymentPending: "Payment pending",
    paymentPendingNote: "Perlu diselesaikan agar booking tetap aman.",
    settlement: "Pelunasan",
    settlementNote: "Booking DP yang menunggu pelunasan akhir.",
    pickupConfirmation: "Pickup confirmation",
    pickupConfirmationNote: "Merchant sudah Arrived, customer perlu klik Picked up.",
    upcomingPlans: "Upcoming plans",
    upcomingPlansNote: "Trip aktif yang tanggalnya belum lewat.",
    checklist1Title: "Login sebelum checkout",
    checklist1Body: "Booking dan pembayaran hanya bisa dilakukan oleh customer yang sudah login ke akun RedFeng.",
    checklist2Title: "Pantau progress meeting point",
    checklist2Body: "Saat merchant klik Arrived atau Go, update akan muncul di booking Anda sebagai acuan koordinasi.",
    checklist3Title: "Konfirmasi sudah dijemput",
    checklist3Body: "Klik Picked up setelah benar-benar naik kendaraan agar merchant bisa lanjut klik Go dan booking normal yang sudah lunas bisa masuk queue finance.",
    heroBadge: "Customer Travel Hub",
    heroTitle: "Kelola booking, pembayaran, dan progress trip Anda dalam satu workspace.",
    heroBody: "Pantau status transaksi, alur escrow RedFeng, progres pickup merchant, dan akses cepat ke detail trip tanpa perlu lompat antar halaman.",
    travelSnapshot: "Travel snapshot",
    travelSnapshotBody: "Total booking yang terhubung ke akun Anda, termasuk booking aktif dan histori transaksi.",
    quickActions: "Akses cepat",
    explorePackages: "Jelajahi Paket",
    openBookings: "Buka Booking Center",
    backHome: "Kembali ke Beranda",
    bookingFeed: "Booking Feed",
    latestBookings: "Booking terbaru Anda",
    latestBookingsBody: "Monitor pembayaran, status trip, dan escrow untuk booking yang paling relevan saat ini.",
    failedLoad: "Gagal memuat dashboard customer.",
    noBookings: "Belum ada booking. Mulai dari jelajahi paket, lanjut checkout, lalu semua progres trip akan muncul di sini.",
    booking: "Booking",
    code: "Kode",
    pay: "Bayar",
    trip: "Trip",
    escrow: "Escrow",
    travelDate: "Tanggal Wisata",
    totalTransaction: "Total Transaksi",
    localizedPrice: "Harga sesuai bahasa customer:",
    pickupProgress: "Progress Pickup",
    settlementBadge: "Pelunasan Booking",
    settlementMissed: "Pelunasan Terlewat",
    waitingSettlement: "Menunggu Pelunasan",
    settlementMissedBody: "Batas waktu pelunasan sudah lewat. Booking ini memerlukan tindak lanjut manual dari tim Red Feng.",
    settlementWaitingBody: "DP untuk booking ini sudah diterima. Customer tinggal melunasi sisa pembayaran sebelum batas waktu berakhir.",
    deadlinePassed: "Batas terlewat",
    dueH3: "Jatuh tempo H-3",
    dpReceived: "DP diterima",
    remainingSettlement: "Sisa pelunasan",
    settlementDeadline: "Batas pelunasan",
    viewBooking: "Lihat Detail Booking",
    postBookingChat: "Chat Sesudah Booking",
    payNow: "Lunasi Sekarang",
    viewPackage: "Lihat Paket",
    customerGuide: "Customer Guide",
    customerChecklist: "Checklist aksi customer",
    paymentOverview: "Payment overview",
    paymentSummary: "Ringkasan pembayaran",
    waitingPayment: "Menunggu pembayaran",
    waitingSettlementShort: "Menunggu pelunasan",
    waitingCustomerAction: "Menunggu aksi customer",
    financeProcessing: "Diproses finance",
    financeReview: "Ditinjau finance",
    paidOut: "Sudah dibayarkan",
    confirmed: "Dikonfirmasi",
    cancelled: "Dibatalkan",
    escrowHeld: "Dana ditahan",
    escrowPartialHold: "Dana ditahan sebagian",
    waitingMerchantArrivedHint: "Booking sudah lunas. Sekarang tunggu merchant tiba di meeting point dan klik Arrived.",
    customerPickupHint: "Merchant sudah Arrived. Klik Picked up setelah Anda benar-benar dijemput.",
    waitingMerchantGoHint: "Konfirmasi Anda sudah masuk. Merchant sekarang perlu menutup pickup dengan klik Go.",
    waitingAdminFinanceHint: "Checkpoint pickup lengkap. Booking Anda sekarang menunggu admin mengirimkannya ke finance.",
    financeReviewHint: "Booking sudah diteruskan ke finance dan sedang menunggu review payout merchant.",
    financeProcessingHint: "Finance sedang memproses transfer payout merchant untuk booking ini.",
    payoutCompletedHint: "Alur payout merchant untuk booking ini sudah selesai diproses.",
  },
  en: {
    paymentWaitingSettlement: "Awaiting Final Payment",
    paid: "Paid",
    awaitingPayment: "Awaiting Payment",
    refundReview: "Refund Under Review",
    merchantGo: "Merchant has clicked Go",
    customerPickedUp: "Customer has clicked Picked up",
    merchantArrived: "Merchant has arrived at the meeting point",
    waitingSettlementCustomer: "Waiting for customer final payment",
    completePaymentWaitingPickup: "Payment complete, waiting for pickup progress",
    waitingPickupProgress: "Waiting for pickup progress",
    totalBooking: "Total Bookings",
    totalBookingNote: "Your full booking and transaction history",
    upcomingTrips: "Upcoming Trips",
    upcomingTripsNote: "Bookings with the nearest travel dates",
    waitingYourAction: "Waiting for Your Action",
    waitingYourActionNote: "Bookings that need customer confirmation",
    financeFunds: "Funds Processed by RedFeng",
    financeFundsNote: "Funds are being or have been processed through finance",
    paymentPending: "Payment pending",
    paymentPendingNote: "Needs to be completed to keep the booking secure.",
    settlement: "Final Payment",
    settlementNote: "DP bookings waiting for the remaining payment.",
    pickupConfirmation: "Pickup confirmation",
    pickupConfirmationNote: "Merchant has Arrived, customer needs to click Picked up.",
    upcomingPlans: "Upcoming plans",
    upcomingPlansNote: "Active trips with dates that have not passed.",
    checklist1Title: "Log in before checkout",
    checklist1Body: "Booking and payment can only be made by customers who are logged into a RedFeng account.",
    checklist2Title: "Monitor meeting point progress",
    checklist2Body: "When the merchant clicks Arrived or Go, the update will appear in your booking for coordination.",
    checklist3Title: "Confirm that you have been picked up",
    checklist3Body: "Click Picked up only after you are actually in the vehicle so the merchant can continue with Go and fully paid normal bookings can move into the finance queue.",
    heroBadge: "Customer Travel Hub",
    heroTitle: "Manage your bookings, payments, and trip progress in one workspace.",
    heroBody: "Track transaction status, RedFeng escrow flow, merchant pickup progress, and quick access to trip details without jumping between pages.",
    travelSnapshot: "Travel snapshot",
    travelSnapshotBody: "Total bookings linked to your account, including active bookings and transaction history.",
    quickActions: "Quick access",
    explorePackages: "Explore Packages",
    openBookings: "Open Bookings Center",
    backHome: "Back to Home",
    bookingFeed: "Booking Feed",
    latestBookings: "Your latest bookings",
    latestBookingsBody: "Monitor payment, trip status, and escrow for the bookings most relevant right now.",
    failedLoad: "Failed to load customer dashboard.",
    noBookings: "No bookings yet. Start by exploring packages, continue to checkout, and all trip progress will appear here.",
    booking: "Booking",
    code: "Code",
    pay: "Pay",
    trip: "Trip",
    escrow: "Escrow",
    travelDate: "Travel Date",
    totalTransaction: "Total Transaction",
    localizedPrice: "Price in customer language:",
    pickupProgress: "Pickup Progress",
    settlementBadge: "Booking Final Payment",
    settlementMissed: "Final Payment Missed",
    waitingSettlement: "Awaiting Final Payment",
    settlementMissedBody: "The final payment deadline has passed. This booking requires manual follow-up from the Red Feng team.",
    settlementWaitingBody: "The DP for this booking has been received. The customer only needs to complete the remaining payment before the deadline.",
    deadlinePassed: "Deadline passed",
    dueH3: "Due H-3",
    dpReceived: "DP received",
    remainingSettlement: "Remaining payment",
    settlementDeadline: "Payment deadline",
    viewBooking: "View Booking Detail",
    postBookingChat: "Post-booking Chat",
    payNow: "Pay Now",
    viewPackage: "View Package",
    customerGuide: "Customer Guide",
    customerChecklist: "Customer action checklist",
    paymentOverview: "Payment overview",
    paymentSummary: "Payment summary",
    waitingPayment: "Awaiting payment",
    waitingSettlementShort: "Awaiting final payment",
    waitingCustomerAction: "Waiting for customer action",
    financeProcessing: "Being processed by finance",
    financeReview: "Under finance review",
    paidOut: "Paid out",
    confirmed: "Confirmed",
    cancelled: "Cancelled",
    escrowHeld: "Funds on hold",
    escrowPartialHold: "Funds partially on hold",
    waitingMerchantArrivedHint: "The booking is fully paid. Now wait for the merchant to arrive at the meeting point and click Arrived.",
    customerPickupHint: "The merchant has Arrived. Click Picked up only after you are actually picked up.",
    waitingMerchantGoHint: "Your confirmation is recorded. The merchant now needs to close the pickup checkpoint by clicking Go.",
    waitingAdminFinanceHint: "The pickup checkpoints are complete. Your booking is now waiting for admin handoff to finance.",
    financeReviewHint: "The booking has been forwarded to finance and is waiting for the merchant payout review.",
    financeProcessingHint: "Finance is currently processing the merchant payout transfer for this booking.",
    payoutCompletedHint: "The merchant payout flow for this booking has already been completed.",
  },
  zh: {
    paymentWaitingSettlement: "等待尾款",
    paid: "已付款",
    awaitingPayment: "等待付款",
    refundReview: "退款审核中",
    merchantGo: "商家已点击 Go",
    customerPickedUp: "客户已点击 Picked up",
    merchantArrived: "商家已到达集合点",
    waitingSettlementCustomer: "等待客户支付尾款",
    completePaymentWaitingPickup: "付款已完成，等待接送进度",
    waitingPickupProgress: "等待接送进度",
    totalBooking: "订单总数",
    totalBookingNote: "您的全部订单与交易记录",
    upcomingTrips: "即将出行",
    upcomingTripsNote: "距离出行日期最近的订单",
    waitingYourAction: "等待您的操作",
    waitingYourActionNote: "需要客户确认的订单",
    financeFunds: "由 RedFeng 处理中的资金",
    financeFundsNote: "资金正在或已经由财务处理",
    paymentPending: "待付款",
    paymentPendingNote: "请尽快完成，以确保订单有效。",
    settlement: "尾款",
    settlementNote: "已付定金、等待支付尾款的订单。",
    pickupConfirmation: "接送确认",
    pickupConfirmationNote: "商家已点击 Arrived，客户需要点击 Picked up。",
    upcomingPlans: "即将计划",
    upcomingPlansNote: "日期尚未过去的有效行程。",
    checklist1Title: "结账前先登录",
    checklist1Body: "只有已登录 RedFeng 账号的客户才能进行预订和付款。",
    checklist2Title: "关注集合点进度",
    checklist2Body: "当商家点击 Arrived 或 Go 时，更新会显示在您的订单中，方便协调。",
    checklist3Title: "确认已上车",
    checklist3Body: "请在真正上车后再点击 Picked up，这样商家才能继续点击 Go，且已全额付款的正常订单才能进入财务队列。",
    heroBadge: "客户旅行中心",
    heroTitle: "在一个工作区中管理您的订单、付款和行程进度。",
    heroBody: "查看交易状态、RedFeng 托管流程、商家接送进度，并快速进入行程详情，无需来回切换页面。",
    travelSnapshot: "旅行概览",
    travelSnapshotBody: "与您账号关联的订单总数，包括进行中的订单和交易历史。",
    quickActions: "快捷操作",
    explorePackages: "浏览套餐",
    openBookings: "打开订单中心",
    backHome: "返回首页",
    bookingFeed: "订单动态",
    latestBookings: "您的最新订单",
    latestBookingsBody: "查看当前最相关订单的付款、行程状态和托管进度。",
    failedLoad: "客户仪表盘加载失败。",
    noBookings: "目前还没有订单。先浏览套餐并完成结账，之后所有行程进度都会显示在这里。",
    booking: "订单",
    code: "编号",
    pay: "付款",
    trip: "行程",
    escrow: "托管",
    travelDate: "出行日期",
    totalTransaction: "交易总额",
    localizedPrice: "客户语言价格：",
    pickupProgress: "接送进度",
    settlementBadge: "订单尾款",
    settlementMissed: "错过尾款期限",
    waitingSettlement: "等待尾款",
    settlementMissedBody: "尾款支付期限已过。该订单需要 Red Feng 团队人工跟进。",
    settlementWaitingBody: "该订单定金已收到，客户只需在截止时间前完成剩余付款。",
    deadlinePassed: "已过期限",
    dueH3: "出发前 3 天到期",
    dpReceived: "已收定金",
    remainingSettlement: "剩余尾款",
    settlementDeadline: "尾款截止时间",
    viewBooking: "查看订单详情",
    postBookingChat: "订单后聊天",
    payNow: "立即支付尾款",
    viewPackage: "查看套餐",
    customerGuide: "客户指引",
    customerChecklist: "客户操作清单",
    paymentOverview: "付款概览",
    paymentSummary: "付款汇总",
    waitingPayment: "等待付款",
    waitingSettlementShort: "等待尾款",
    waitingCustomerAction: "等待客户操作",
    financeProcessing: "财务处理中",
    financeReview: "财务审核中",
    paidOut: "已付款给商家",
    confirmed: "已确认",
    cancelled: "已取消",
    escrowHeld: "资金已托管",
    escrowPartialHold: "部分资金托管中",
  },
} satisfies Record<Locale, Record<string, string>>

function resolvePaymentHeadline(status: string | null, locale: Locale) {
  const t = dashboardCopy[locale]
  const normalized = normalizeStatus(status)
  if (normalized === "dp_paid") return t.paymentWaitingSettlement
  if (normalized === "paid") return t.paid
  if (normalized === "pending") return t.awaitingPayment
  if (normalized === "refund_pending_review") return t.refundReview
  return titleCaseStatus(status)
}

function resolveTripStatusLabel(status: string | null, locale: Locale) {
  const normalized = normalizeStatus(status)
  const t = dashboardCopy[locale]
  if (isTripCompletedStatus(status)) {
    return locale === "en" ? "Trip completed" : locale === "zh" ? "行程已完成" : "Trip selesai"
  }
  if (normalized === "merchant_arrived") return t.merchantArrived
  if (normalized === "customer_picked_up") return t.customerPickedUp
  if (normalized === "customer_picked_up_pending_final_payment") return t.customerPickedUp
  if (normalized === "awaiting_admin_handoff" || normalized === "finance_review") return t.financeReview
  if (normalized === "finance_processing" || normalized === "payout_processing") return t.financeProcessing
  if (normalized === "payout_completed") return t.paidOut
  if (normalized === "confirmed") return t.confirmed
  if (normalized.startsWith("cancelled")) return t.cancelled
  return titleCaseStatus(status)
}

function resolveEscrowStatusLabel(status: string | null, locale: Locale) {
  const normalized = normalizeStatus(status)
  const t = dashboardCopy[locale]
  if (normalized === "held") return t.escrowHeld
  if (normalized === "partial_hold") return t.escrowPartialHold
  if (normalized === "finance_review" || normalized === "awaiting_admin_handoff") return t.financeReview
  if (normalized === "payout_processing") return t.financeProcessing
  if (normalized === "paid_out") return t.paidOut
  if (normalized === "refund_pending_review") return t.refundReview
  return titleCaseStatus(status)
}

function badgeClass(value: string | null, type: "payment" | "trip" | "escrow") {
  const normalized = normalizeStatus(value)
  if (normalized === "paid" || normalized === "confirmed" || normalized === "paid_out" || isTripCompletedStatus(value)) {
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

function getTimelineStatus(booking: BookingRow, locale: Locale) {
  const t = dashboardCopy[locale]
  if (booking.merchant_picked_up_at) return t.merchantGo
  if (booking.customer_picked_up_at) return t.customerPickedUp
  if (booking.merchant_arrived_at) return t.merchantArrived
  if (normalizeStatus(booking.payment_status) === "dp_paid") return t.waitingSettlementCustomer
  if (normalizeStatus(booking.payment_status) === "paid") return t.completePaymentWaitingPickup
  return t.waitingPickupProgress
}

function getBookingPriority(booking: BookingRow) {
  const paymentStatus = normalizeStatus(booking.payment_status)
  const bookingStatus = normalizeStatus(booking.booking_status)

  if (paymentStatus === "dp_paid") return 4
  if (paymentStatus === "paid") return 3
  if (bookingStatus.startsWith("cancelled")) return 0
  if (paymentStatus === "pending") return 1
  return 2
}

export default async function CustomerDashboardPage() {
  const supabase = await createClient("customer")
  const adminSupabase = createAdminClient()
  const locale = normalizeLocale(await getCurrentLocale())
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null
  if (!user.email) return null
  const customerCode = formatCustomerCode(user.id)
  const t = dashboardCopy[locale]

  let bookings: BookingRow[] | null = null
  let error: { message?: string } | null = null
    const adminBookingsResult = await adminSupabase
      .from("bookings")
      .select(
        "id, package_id, booking_product_type, booking_code, customer_email, created_at, pickup_date, payment_type, final_payment_amount, total_amount, display_currency, display_subtotal_amount, payment_status, booking_status, escrow_status, merchant_arrived_at, merchant_picked_up_at, customer_picked_up_at",
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
        "id, package_id, booking_product_type, booking_code, customer_email, created_at, payment_type, final_payment_amount, total_amount, display_currency, display_subtotal_amount, payment_status, booking_status, escrow_status, merchant_arrived_at, merchant_picked_up_at, customer_picked_up_at",
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

    const timeA = a.pickup_date ? new Date(a.pickup_date).getTime() : 0
    const timeB = b.pickup_date ? new Date(b.pickup_date).getTime() : 0
      return timeB - timeA
    })

  const flightBookingIds = customerBookings.filter(isFlightBooking).map((booking) => booking.id)
  if (flightBookingIds.length > 0) {
    const { data: flightRows } = await adminSupabase
      .from("flight_booking_details")
      .select("booking_id, lifecycle_status, booking_hold_expires_at")
      .in("booking_id", flightBookingIds)

    const flightMap = new Map(
      ((flightRows as Array<{
        booking_id: string
        lifecycle_status: string | null
        booking_hold_expires_at: string | null
      }> | null) || []).map((row) => [row.booking_id, row]),
    )

    for (const booking of customerBookings) {
      const flight = flightMap.get(booking.id)
      if (!flight) continue
      booking.flight_lifecycle_status = flight.lifecycle_status
      booking.flight_booking_hold_expires_at = flight.booking_hold_expires_at
    }
  }

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
    return (
      !Number.isNaN(pickup.getTime()) &&
      pickup >= now &&
      !normalizeStatus(booking.booking_status).startsWith("cancelled")
    )
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
      label: t.totalBooking,
      value: customerBookings.length,
      note: t.totalBookingNote,
      tone: "from-amber-500 to-orange-400",
    },
    {
      label: t.upcomingTrips,
      value: upcomingTrips.length,
      note: t.upcomingTripsNote,
      tone: "from-orange-500 to-amber-300",
    },
    {
      label: t.waitingYourAction,
      value: waitingCustomerAction.length,
      note: t.waitingYourActionNote,
      tone: "from-orange-600 to-red-400",
    },
    {
      label: t.financeFunds,
      value: readyForPayout.length,
      note: t.financeFundsNote,
      tone: "from-lime-500 to-emerald-400",
    },
  ]

  const quickSignals = [
      {
      label: t.paymentPending,
      value: String(pendingPayments.length),
      note: t.paymentPendingNote,
    },
    {
      label: t.settlement,
      value: String(pendingSettlements.length),
      note: t.settlementNote,
    },
    {
      label: t.pickupConfirmation,
      value: String(waitingCustomerAction.length),
      note: t.pickupConfirmationNote,
    },
    {
      label: t.upcomingPlans,
      value: String(upcomingTrips.length),
      note: t.upcomingPlansNote,
    },
  ]

  const customerChecklist = [
    {
      title: t.checklist1Title,
      body: t.checklist1Body,
    },
    {
      title: t.checklist2Title,
      body: t.checklist2Body,
    },
    {
      title: t.checklist3Title,
      body: t.checklist3Body,
    },
  ]

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fff8f1_0%,#f7f1e8_38%,#f3eee7_100%)] px-4 py-5 sm:px-6 sm:py-6 md:px-8 md:py-8 lg:px-10">
      <div className="mx-auto max-w-7xl space-y-6 sm:space-y-8">
        <section className="overflow-hidden rounded-[30px] border border-orange-200/60 bg-[linear-gradient(135deg,#7c2d12_0%,#c2410c_34%,#f97316_68%,#fdba74_100%)] px-5 py-6 text-white shadow-[0_30px_90px_rgba(146,64,14,0.18)] sm:rounded-[36px] sm:px-8 sm:py-9 sm:shadow-[0_36px_110px_rgba(146,64,14,0.18)] md:px-10 lg:px-12">
          <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
            <div>
              <span className="inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.34em] text-orange-50">
                {t.heroBadge}
              </span>
              <h1 className="mt-4 text-[30px] font-semibold tracking-tight sm:mt-5 sm:text-4xl lg:text-5xl">
                {t.heroTitle}
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-orange-50/92 sm:mt-4 sm:text-base sm:leading-8">
                {t.heroBody}
              </p>

              <div className="mt-6 grid gap-3 sm:mt-8 sm:grid-cols-3 sm:gap-4">
                {quickSignals.map((signal) => (
                  <div key={signal.label} className="rounded-[22px] border border-white/18 bg-white/10 p-4 backdrop-blur sm:rounded-[24px] sm:p-5">
                    <p className="text-[11px] uppercase tracking-[0.28em] text-orange-100/85">{signal.label}</p>
                    <p className="mt-3 text-[28px] font-semibold text-white sm:text-3xl">{signal.value}</p>
                    <p className="mt-3 text-sm leading-6 text-orange-50/85">{signal.note}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-4">
              <div className="rounded-[24px] border border-white/18 bg-white/10 p-5 backdrop-blur sm:rounded-[28px] sm:p-6">
                <p className="text-[11px] uppercase tracking-[0.32em] text-orange-100/80">{t.travelSnapshot}</p>
                <p className="mt-4 text-3xl font-semibold text-white">{customerBookings.length}</p>
                <p className="mt-2 text-sm leading-7 text-orange-50/85">
                  {t.travelSnapshotBody}
                </p>
                <div className="mt-4 inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-orange-50">
                  {customerCode}
                </div>
              </div>

              <div className="rounded-[24px] border border-white/18 bg-white/10 p-5 backdrop-blur sm:rounded-[28px] sm:p-6">
                <p className="text-[11px] uppercase tracking-[0.32em] text-orange-100/80">{t.quickActions}</p>
                <div className="mt-5 grid gap-3">
                  <Link
                    href="/customer/bookings"
                    className="rounded-[18px] bg-white px-4 py-3 text-center text-sm font-semibold text-slate-900 transition hover:bg-orange-50"
                  >
                    {t.openBookings}
                  </Link>
                  <Link
                    href={buildSiteUrl("/paket-tour/")}
                    className="rounded-[18px] border border-white/20 px-4 py-3 text-center text-sm font-semibold text-white transition hover:bg-white/10"
                  >
                    {t.explorePackages}
                  </Link>
                  <Link
                    href={getSiteBaseUrl()}
                    className="rounded-[18px] border border-white/20 px-4 py-3 text-center text-sm font-semibold text-white transition hover:bg-white/10"
                  >
                    {t.backHome}
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-2 gap-3 md:grid-cols-2 md:gap-4 xl:grid-cols-4">
          {summaryCards.map((card) => (
            <article
              key={card.label}
              className="rounded-[24px] border border-[#f0ddc7] bg-white px-4 py-4 shadow-[0_18px_44px_rgba(15,23,42,0.06)] sm:rounded-[28px] sm:px-5 sm:py-5"
            >
              <div className={`h-2 w-20 rounded-full bg-gradient-to-r ${card.tone}`} />
              <p className="mt-5 text-[10px] font-semibold uppercase tracking-[0.24em] text-orange-500">{card.label}</p>
              <p className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-slate-950 sm:text-3xl">{card.value}</p>
              <p className="mt-2 text-[11px] leading-5 text-slate-500 sm:text-xs sm:leading-6">{card.note}</p>
            </article>
          ))}
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-[32px] border border-[#f3dbc3] bg-white/85 p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur-sm sm:p-7">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <span className="inline-flex rounded-full border border-orange-200 bg-orange-50 px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.3em] text-orange-700">
                  {t.bookingFeed}
                </span>
                <h2 className="mt-4 text-2xl font-semibold tracking-tight text-slate-950">{t.latestBookings}</h2>
                <p className="mt-2 text-sm leading-7 text-slate-600">
                  {t.latestBookingsBody}
                </p>
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
                {customerBookings.slice(0, 6).map((booking) => {
                  const pkg = packageMap.get(booking.package_id || "")
                  const canConfirmPickup = Boolean(booking.merchant_arrived_at) && !booking.customer_picked_up_at
                  const isDpPaid = normalizeStatus(booking.payment_status) === "dp_paid"
                  const canPayRemaining = isDpPaid && !isFinalPaymentOverdue(booking.pickup_date)
                  const canPayFlightInitial =
                    ["pending", "unpaid", ""].includes(normalizeStatus(booking.payment_status)) &&
                    canOpenFlightPayment(booking)
                  const finalPaymentDueDate = formatFinalPaymentDueLabel(booking.pickup_date)
                  const isSettlementOverdue = isDpPaid && isFinalPaymentOverdue(booking.pickup_date)
                  const dpAmountPaid = Math.max(Number(booking.total_amount || 0) - Number(booking.final_payment_amount || 0), 0)
                  const actionHint = getCustomerActionHint(booking, t, locale)

                  return (
                    <article
                      key={booking.id}
                      className="rounded-[28px] border border-[#efe1cf] bg-[#fffaf3] p-5 transition hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-[0_18px_38px_rgba(194,65,12,0.1)]"
                    >
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">{t.booking}</p>
                          <h3 className="mt-2 text-xl font-semibold text-slate-950">
                            {pkg?.title || formatBookingCode(booking.booking_code, booking.id)}
                          </h3>
                          <p className="mt-2 text-sm text-slate-500">{t.code}: {formatBookingCode(booking.booking_code, booking.id)}</p>
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

                      <div className="mt-5 grid gap-4 md:grid-cols-3">
                        <div className="rounded-[20px] border border-[#efe1cf] bg-white/80 p-4">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">{t.travelDate}</p>
                          <p className="mt-2 text-sm font-medium text-slate-900">{formatDate(booking.pickup_date, locale)}</p>
                        </div>
                        <div className="rounded-[20px] border border-[#efe1cf] bg-white/80 p-4">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">{t.totalTransaction}</p>
                          <p className="mt-2 text-sm font-medium text-slate-900">{formatMoney(Number(booking.total_amount || 0))}</p>
                          {booking.display_currency && (
                            <p className="mt-2 text-xs text-slate-500">
                              {t.localizedPrice}{" "}
                              {formatPackageMoney(booking.display_subtotal_amount, booking.display_currency, locale)}
                            </p>
                          )}
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

                      {canPayRemaining ? (
                        <div className="mt-5 rounded-[24px] border border-amber-200 bg-[linear-gradient(135deg,#fff8e7_0%,#fff2cf_100%)] p-5 text-amber-900">
                          <div className="flex flex-wrap items-start justify-between gap-4">
                            <div>
                              <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-amber-700">{t.settlementBadge}</p>
                              <h4 className="mt-2 text-lg font-semibold text-amber-950">
                                {isSettlementOverdue ? t.settlementMissed : t.waitingSettlement}
                              </h4>
                              <p className="mt-2 max-w-2xl text-sm leading-7 text-amber-800">
                                {isSettlementOverdue
                                  ? t.settlementMissedBody
                                  : t.settlementWaitingBody}
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
                              <p className="mt-2 text-lg font-semibold text-amber-950">{formatMoney(Number(booking.final_payment_amount || 0))}</p>
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
                            locale={locale}
                            label={t.payNow}
                            className="rounded-2xl border border-orange-300 bg-orange-50 px-4 py-3 text-sm font-semibold text-orange-700 transition hover:bg-orange-100"
                          />
                        )}
                        {canPayFlightInitial && (
                          <BookingPaymentButton
                            bookingId={booking.id}
                            locale={locale}
                            label={t.payNow}
                            className="rounded-2xl border border-orange-300 bg-orange-50 px-4 py-3 text-sm font-semibold text-orange-700 transition hover:bg-orange-100"
                          />
                        )}
                        {pkg?.slug && (
                          <Link
                            href={`/packages/${encodeURIComponent(pkg.slug)}`}
                            className="rounded-2xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-orange-300 hover:text-orange-600"
                          >
                            {t.viewPackage}
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
                {t.customerGuide}
              </span>
              <h2 className="mt-4 text-2xl font-semibold tracking-tight text-slate-950">{t.customerChecklist}</h2>
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
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">{t.paymentOverview}</p>
              <h2 className="mt-4 text-2xl font-semibold tracking-tight text-slate-950">{t.paymentSummary}</h2>
              <div className="mt-5 space-y-4 text-sm text-slate-600">
                <div className="flex items-center justify-between rounded-[18px] border border-[#efe1cf] bg-[#fffaf3] px-4 py-3">
                  <span>{t.waitingPayment}</span>
                  <span className="font-semibold text-slate-900">{pendingPayments.length}</span>
                </div>
                <div className="flex items-center justify-between rounded-[18px] border border-[#efe1cf] bg-[#fffaf3] px-4 py-3">
                  <span>{t.waitingSettlementShort}</span>
                  <span className="font-semibold text-slate-900">{pendingSettlements.length}</span>
                </div>
                <div className="flex items-center justify-between rounded-[18px] border border-[#efe1cf] bg-[#fffaf3] px-4 py-3">
                  <span>{t.waitingCustomerAction}</span>
                  <span className="font-semibold text-slate-900">{waitingCustomerAction.length}</span>
                </div>
                <div className="flex items-center justify-between rounded-[18px] border border-[#efe1cf] bg-[#fffaf3] px-4 py-3">
                  <span>{t.financeProcessing}</span>
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
