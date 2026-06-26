import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import BookingPaymentButton from "@/app/components/BookingPaymentButton"
import FlightPaymentCountdown from "@/app/components/FlightPaymentCountdown"
import { cancelDraftBooking, confirmCustomerPickedUp } from "./actions"
import { getCurrentLocale } from "@/lib/locale"
import { formatPackageMoney } from "@/lib/package-pricing"
import { getCustomerFlightStatus } from "@/lib/flights/customerFlightStatus"
import { normalizeLocale, type Locale } from "@/lib/i18n"
import {
  formatFinalPaymentDueLabel,
  isFinalPaymentOverdue,
} from "@/lib/booking/final-payment-deadline"
import { formatBookingCode } from "@/lib/merchant-code"

export const dynamic = "force-dynamic"

type BookingPageProps = {
  params: Promise<{ id: string }>
  searchParams: Promise<{ success?: string; error?: string; from_checkout?: string }>
}

type BookingDetailRow = {
  id: string
  booking_code: string | null
  customer_name: string | null
  customer_email: string | null
  customer_phone: string | null
  pickup_date: string | null
  adult_count: number | null
  child_count: number | null
  payment_type: string | null
  dp_amount: number | null
  total_amount: number | null
  subtotal_amount?: number | null
  customer_admin_fee_amount?: number | null
  customer_tax_amount?: number | null
  customer_admin_fee_percent?: number | null
  customer_tax_percent?: number | null
  final_payment_amount?: number | null
  display_currency?: string | null
  display_subtotal_amount?: number | null
  display_price_adult?: number | null
  display_price_child?: number | null
  exchange_rate_date?: string | null
  booking_status: string | null
  payment_status: string | null
  expiry_time?: string | null
  booking_product_type?: string | null
  package_id: string | null
  escrow_status: string | null
  merchant_arrived_at: string | null
  merchant_picked_up_at: string | null
  customer_picked_up_at: string | null
  promo_code?: string | null
  promo_discount_amount?: number | null
  promo_snapshot?: Record<string, unknown> | null
  user_id?: string | null
}

type FlightPaymentGateRow = {
  lifecycle_status: string | null
  issue_status: string | null
  booking_hold_expires_at: string | null
  ticket_number: string | null
  pnr_code: string | null
}

type BookingPromoSnapshot = {
  rule_name?: string | null
  code?: string | null
  source?: string | null
  discount_amount?: number | null
  display_discount_amount?: number | null
  display_subtotal_before_discount?: number | null
  approved_at?: string | null
  approved_by_name?: string | null
  marketing_approved_at?: string | null
  marketing_approved_by_name?: string | null
  finance_approved_at?: string | null
  finance_approved_by_name?: string | null
}

function getPromoSourceLabel(locale: Locale, snapshot: BookingPromoSnapshot | null, bookingPromoCode: string | null | undefined) {
  const normalizedCode = String(bookingPromoCode || snapshot?.code || "").trim()
  const normalizedSource = String(snapshot?.source || "").trim().toLowerCase()
  if (locale === "en") {
    if (normalizedSource === "auto") return "Auto-apply"
    if (normalizedCode) return "Voucher / coupon"
    return "Checkout promo"
  }
  if (locale === "zh") {
    if (normalizedSource === "auto") return "自动优惠"
    if (normalizedCode) return "优惠券 / 代金码"
    return "结账优惠"
  }
  if (normalizedSource === "auto") return "Auto-apply"
  if (normalizedCode) return "Voucher / kupon"
  return "Promo checkout"
}

type BookingParticipantRow = {
  id: string
  participant_type: "adult" | "child"
  sequence_no: number
  full_name: string | null
  identity_number: string | null
  nationality: string | null
  age: number | null
}

function hasExpectedParticipants(
  participants: BookingParticipantRow[],
  counts: {
    adult: number
    child: number
  },
) {
  const expectedKeys = new Set<string>()

  for (let index = 1; index <= counts.adult; index += 1) {
    expectedKeys.add(`adult:${index}`)
  }

  for (let index = 1; index <= counts.child; index += 1) {
    expectedKeys.add(`child:${index}`)
  }

  if (expectedKeys.size === 0 || participants.length !== expectedKeys.size) {
    return false
  }

  return participants.every((participant) =>
    expectedKeys.has(`${participant.participant_type}:${participant.sequence_no}`),
  )
}

function titleCaseStatus(value: string | null) {
  const normalized = (value || "").trim().toLowerCase()
  if (!normalized) return "-"
  return normalized
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

function normalizeStatus(value: string | null) {
  return (value || "").trim().toLowerCase()
}

function isFlightPaymentReadyStatus(value: string | null | undefined) {
  return normalizeStatus(value || null) === "booking_hold_created"
}

function isExpiredDateTime(value: string | null | undefined) {
  if (!value) return false
  const parsed = new Date(value)
  return !Number.isNaN(parsed.getTime()) && parsed.getTime() <= Date.now()
}

function formatFlightHoldDateTime(value: string | null | undefined, locale: Locale) {
  if (!value) return "-"
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return "-"
  return parsed.toLocaleString(locale === "en" ? "en-US" : "id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function getFlightPaymentGateNotice(
  flightPaymentGate: FlightPaymentGateRow | null,
  locale: Locale,
) {
  const lifecycle = normalizeStatus(flightPaymentGate?.lifecycle_status || null)
  const holdExpired = isExpiredDateTime(flightPaymentGate?.booking_hold_expires_at)
  const holdUntil = formatFlightHoldDateTime(flightPaymentGate?.booking_hold_expires_at, locale)

  if (lifecycle === "booking_hold_created" && !holdExpired) {
    return {
      tone: "border-emerald-200 bg-emerald-50 text-emerald-800",
      title:
        locale === "en"
          ? "Payment is open."
          : locale === "zh"
            ? "付款已开放。"
            : "Pembayaran sudah dibuka.",
      body:
        locale === "en"
          ? `The airline hold is valid${holdUntil !== "-" ? ` until ${holdUntil}` : ""}. Complete payment before the hold expires.`
          : locale === "zh"
            ? `航司锁位有效${holdUntil !== "-" ? `至 ${holdUntil}` : ""}。请在锁位到期前完成付款。`
            : `Hold maskapai valid${holdUntil !== "-" ? ` sampai ${holdUntil}` : ""}. Selesaikan pembayaran sebelum batas hold berakhir.`,
    }
  }

  if (holdExpired) {
    return {
      tone: "border-amber-200 bg-amber-50 text-amber-800",
      title:
        locale === "en"
          ? "The previous hold has expired."
          : locale === "zh"
            ? "之前的锁位已过期。"
            : "Hold sebelumnya sudah lewat.",
      body:
        locale === "en"
          ? "Red Feng will recheck the fare and secure a fresh hold before reopening payment."
          : locale === "zh"
            ? "Red Feng 将重新核验票价并重新锁位后再开放付款。"
            : "Red Feng akan recheck fare dan membuat hold baru sebelum payment dibuka lagi.",
    }
  }

  return {
    tone: "border-sky-200 bg-sky-50 text-sky-800",
    title:
      locale === "en"
        ? "Payment is not open yet."
        : locale === "zh"
          ? "付款暂未开放。"
          : "Pembayaran belum dibuka.",
    body:
      locale === "en"
        ? "Red Feng is checking fare and seat availability with the airline. The Midtrans button appears after the hold is valid."
        : locale === "zh"
          ? "Red Feng 正在向航司核验票价和座位。锁位有效后才会显示 Midtrans 按钮。"
          : "Red Feng sedang cek fare dan ketersediaan seat ke maskapai. Tombol Midtrans akan muncul setelah hold valid.",
  }
}

function getFlightStatusForBooking(
  booking: BookingDetailRow,
  flightPaymentGate: FlightPaymentGateRow | null,
  locale: Locale,
) {
  return getCustomerFlightStatus(
    {
      lifecycleStatus: flightPaymentGate?.lifecycle_status,
      issueStatus: flightPaymentGate?.issue_status,
      paymentStatus: booking.payment_status,
      holdExpired: isExpiredDateTime(flightPaymentGate?.booking_hold_expires_at),
      ticketNumber: flightPaymentGate?.ticket_number,
      pnrCode: flightPaymentGate?.pnr_code,
    },
    locale,
  )
}

function parsePromoSnapshot(value: unknown): BookingPromoSnapshot | null {
  if (!value) return null
  if (typeof value === "object" && !Array.isArray(value)) return value as BookingPromoSnapshot
  if (typeof value !== "string") return null
  try {
    const parsed = JSON.parse(value)
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as BookingPromoSnapshot) : null
  } catch {
    return null
  }
}

function formatPromoApprovalTime(value: string | null | undefined) {
  if (!value) return "-"
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return "-"
  return parsed.toLocaleString("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  })
}

function isTripCompletedStatus(status: string | null) {
  const normalized = normalizeStatus(status)
  return normalized === "completed" || normalized === "done"
}

function getTripCompletedLabel(locale: Locale) {
  return locale === "en" ? "Trip Completed" : locale === "zh" ? "行程已完成" : "Trip Selesai"
}

const bookingPageCopy = {
  id: {
    loginRequired: "Silakan login untuk melihat booking Anda.",
    bookingNotFound: "Booking tidak ditemukan",
    waitingSettlement: "Menunggu Pelunasan",
    paid: "Lunas",
    awaitingPayment: "Menunggu Pembayaran",
    refundReview: "Refund Ditinjau",
    paidOut: "Paid Out",
    readyForFinance: "Ready for Finance",
    goConfirmed: "Go Confirmed",
    pickedUp: "Picked Up",
    awaitingPickup: "Awaiting Pickup",
    fullyPaid: "Fully Paid",
    financeProcessing: "Diproses finance",
    confirmed: "Dikonfirmasi",
    cancelled: "Dibatalkan",
    escrowHeld: "Dana ditahan",
    escrowPartialHold: "Dana ditahan sebagian",
    bookingConfirmation: "Konfirmasi Booking",
    bookingSuccess: "Booking Berhasil",
    confirmationIntro: "Periksa dulu seluruh data peserta, rincian booking, dan nominal biaya. Jika sudah sesuai, lanjutkan ke pembayaran dari halaman ini.",
    successIntro: "Dana customer masuk ke rekening RedFeng dan tetap ditahan sampai pickup dikonfirmasi merchant dan customer.",
    checkoutAlert: "Booking sudah dibuat. Lengkapi data peserta, lalu cek detail nominal dan data booking sebelum membuka popup Midtrans.",
    participantsIncomplete: "Data peserta belum lengkap. Silakan isi semua data peserta terlebih dahulu sebelum melanjutkan ke pembayaran.",
    bookingCode: "Kode Booking",
    total: "Total",
    paymentStatus: "Status Pembayaran",
    escrowStatus: "Status Escrow",
    packageSubtotal: "Subtotal Paket",
    adminFee: "Admin Fee",
    tax: "Pajak",
    remainingSettlement: "Sisa Pelunasan",
    localizedPriceSummary: "Ringkasan Harga Sesuai Bahasa Anda",
    localizedPriceBody: "Tampilan harga paket mengikuti bahasa yang Anda pilih saat checkout. Pembayaran tetap diproses dalam IDR.",
    adultPrice: "Harga Dewasa",
    childPrice: "Harga Anak",
    displaySubtotal: "Subtotal Display",
    exchangeRateDate: "Tanggal Kurs",
    bookingDetail: "Detail Booking",
    name: "Nama",
    email: "Email",
    phone: "Nomor Telepon",
    participantCount: "Jumlah Peserta",
    adult: "Dewasa",
    child: "Anak",
    paymentType: "Jenis Pembayaran",
    fullPayment: "Full payment",
    billNow: "Tagihan Sekarang",
    settlementDeadline: "Batas Pelunasan",
    journeyPhase: "Journey Phase",
    participantData: "Data Peserta",
    participantDataBody: "Semua peserta yang akan berangkat harus terdata lengkap sebelum pembayaran dibuka.",
    editParticipantData: "Ubah data peserta",
    fillParticipantData: "Isi data peserta",
    participantStatus: "Status data peserta:",
    participantsComplete: "peserta sudah lengkap",
    participantsFilled: "peserta terisi",
    identityNumber: "No identitas / paspor",
    nationality: "Kewarganegaraan",
    age: "Umur",
    noParticipantData: "Belum ada data peserta yang disimpan untuk booking ini.",
    bookingActions: "Aksi Booking",
    payDpNow: "Bayar DP Sekarang",
    payFullNow: "Bayar Full Payment",
    draftCancelledRedirect: "/customer/dashboard?info=Draft%20booking%20dibatalkan%20karena%20pembayaran%20tidak%20dilanjutkan",
    completeParticipants: "Lengkapi Data Peserta",
    cancelAndDeleteBooking: "Batalkan & Hapus Booking",
    paySettlement: "Bayar Pelunasan",
    settlementExpiredOn: "Batas pelunasan sudah lewat pada",
  },
  en: {
    loginRequired: "Please log in to view your booking.",
    bookingNotFound: "Booking not found",
    waitingSettlement: "Awaiting Final Payment",
    paid: "Paid",
    awaitingPayment: "Awaiting Payment",
    refundReview: "Refund Under Review",
    paidOut: "Paid Out",
    readyForFinance: "Ready for Finance",
    goConfirmed: "Go Confirmed",
    pickedUp: "Picked Up",
    awaitingPickup: "Awaiting Pickup",
    fullyPaid: "Fully Paid",
    financeProcessing: "Being processed by finance",
    confirmed: "Confirmed",
    cancelled: "Cancelled",
    escrowHeld: "Funds on hold",
    escrowPartialHold: "Funds partially on hold",
    bookingConfirmation: "Booking Confirmation",
    bookingSuccess: "Booking Created",
    confirmationIntro: "Please review all participant data, booking details, and payment amounts. If everything is correct, continue to payment from this page.",
    successIntro: "Customer funds are received by RedFeng and remain held until pickup is confirmed by both merchant and customer.",
    checkoutAlert: "The booking has been created. Complete participant data, then review the amount and booking details before opening the Midtrans popup.",
    participantsIncomplete: "Participant data is incomplete. Please fill in all participant information before continuing to payment.",
    bookingCode: "Booking Code",
    total: "Total",
    paymentStatus: "Payment Status",
    escrowStatus: "Escrow Status",
    packageSubtotal: "Package Subtotal",
    adminFee: "Admin Fee",
    tax: "Tax",
    remainingSettlement: "Remaining Final Payment",
    localizedPriceSummary: "Price Summary in Your Language",
    localizedPriceBody: "Package pricing follows the language you selected during checkout. Payment is still processed in IDR.",
    adultPrice: "Adult Price",
    childPrice: "Child Price",
    displaySubtotal: "Displayed Subtotal",
    exchangeRateDate: "Exchange Rate Date",
    bookingDetail: "Booking Details",
    name: "Name",
    email: "Email",
    phone: "Phone Number",
    participantCount: "Participant Count",
    adult: "Adult",
    child: "Child",
    paymentType: "Payment Type",
    fullPayment: "Full payment",
    billNow: "Amount Due Now",
    settlementDeadline: "Final Payment Deadline",
    journeyPhase: "Journey Phase",
    participantData: "Participant Data",
    participantDataBody: "All travelers must be fully recorded before payment can be opened.",
    editParticipantData: "Edit participant data",
    fillParticipantData: "Fill participant data",
    participantStatus: "Participant data status:",
    participantsComplete: "participants complete",
    participantsFilled: "participants filled",
    identityNumber: "ID / passport number",
    nationality: "Nationality",
    age: "Age",
    noParticipantData: "No participant data has been saved for this booking yet.",
    bookingActions: "Booking Actions",
    payDpNow: "Pay DP Now",
    payFullNow: "Pay Full Payment",
    draftCancelledRedirect: "/customer/dashboard?info=Draft%20booking%20was%20cancelled%20because%20payment%20was%20not%20continued",
    completeParticipants: "Complete Participant Data",
    cancelAndDeleteBooking: "Cancel & Delete Booking",
    paySettlement: "Pay Final Payment",
    settlementExpiredOn: "The final payment deadline passed on",
  },
  zh: {
    loginRequired: "请先登录以查看您的订单。",
    bookingNotFound: "未找到订单",
    waitingSettlement: "等待尾款",
    paid: "已付款",
    awaitingPayment: "等待付款",
    refundReview: "退款审核中",
    paidOut: "已结算",
    readyForFinance: "待财务处理",
    goConfirmed: "已确认 Go",
    pickedUp: "已接送",
    awaitingPickup: "等待接送",
    fullyPaid: "已全额付款",
    financeProcessing: "财务处理中",
    confirmed: "已确认",
    cancelled: "已取消",
    escrowHeld: "资金已托管",
    escrowPartialHold: "部分资金托管中",
    bookingConfirmation: "订单确认",
    bookingSuccess: "订单已创建",
    confirmationIntro: "请先检查所有参团人资料、订单详情和费用金额。如无误，请在此页面继续付款。",
    successIntro: "客户资金已进入 RedFeng 账户，并将在商家和客户确认接送前保持托管。",
    checkoutAlert: "订单已创建。请先完善参团人资料，并核对金额和订单详情后再打开 Midtrans 弹窗。",
    participantsIncomplete: "参团人资料尚未完整。请先填写所有参团人信息后再继续付款。",
    bookingCode: "订单编号",
    total: "总额",
    paymentStatus: "付款状态",
    escrowStatus: "托管状态",
    packageSubtotal: "套餐小计",
    adminFee: "管理费",
    tax: "税费",
    remainingSettlement: "剩余尾款",
    localizedPriceSummary: "按您语言显示的价格摘要",
    localizedPriceBody: "套餐价格显示会跟随您在结账时选择的语言，付款仍以印尼盾处理。",
    adultPrice: "成人价格",
    childPrice: "儿童价格",
    displaySubtotal: "显示小计",
    exchangeRateDate: "汇率日期",
    bookingDetail: "订单详情",
    name: "姓名",
    email: "邮箱",
    phone: "电话号码",
    participantCount: "参团人数",
    adult: "成人",
    child: "儿童",
    paymentType: "付款方式",
    fullPayment: "全额付款",
    billNow: "当前应付",
    settlementDeadline: "尾款截止时间",
    journeyPhase: "行程阶段",
    participantData: "参团人资料",
    participantDataBody: "所有出行人员资料必须完整后才能开启付款。",
    editParticipantData: "修改参团人资料",
    fillParticipantData: "填写参团人资料",
    participantStatus: "参团人资料状态：",
    participantsComplete: "位参团人资料已完整",
    participantsFilled: "位参团人资料已填写",
    identityNumber: "证件号 / 护照号",
    nationality: "国籍",
    age: "年龄",
    noParticipantData: "该订单尚未保存任何参团人资料。",
    bookingActions: "订单操作",
    payDpNow: "立即支付定金",
    payFullNow: "立即全额付款",
    draftCancelledRedirect: "/customer/dashboard?info=%E8%8D%89%E7%A8%BF%E8%AE%A2%E5%8D%95%E5%9B%A0%E6%9C%AA%E7%BB%A7%E7%BB%AD%E4%BB%98%E6%AC%BE%E8%80%8C%E5%B7%B2%E5%8F%96%E6%B6%88",
    completeParticipants: "完善参团人资料",
    cancelAndDeleteBooking: "取消并删除订单",
    paySettlement: "支付尾款",
    settlementExpiredOn: "尾款截止时间已过：",
  },
} satisfies Record<Locale, Record<string, string>>

const bookingPageCopyZh = {
  loginRequired: "请先登录以查看您的订单。",
  bookingNotFound: "未找到订单",
  waitingSettlement: "等待尾款",
  paid: "已付款",
  awaitingPayment: "等待付款",
  refundReview: "退款审核中",
  paidOut: "已结算",
  readyForFinance: "待财务处理",
  goConfirmed: "已确认 Go",
  pickedUp: "已接送",
  awaitingPickup: "等待接送",
  fullyPaid: "已全额付款",
  financeProcessing: "财务处理中",
  confirmed: "已确认",
  cancelled: "已取消",
  escrowHeld: "资金已托管",
  escrowPartialHold: "部分资金托管中",
  bookingConfirmation: "订单确认",
  bookingSuccess: "订单已创建",
  confirmationIntro: "请先检查所有参团人资料、订单详情和费用金额。如无误，请在此页面继续付款。",
  successIntro: "客户资金已进入 RedFeng 账户，并会在商家和客户都确认接送前保持托管。",
  checkoutAlert: "订单已创建。请先完善参团人资料，并核对金额和订单详情后再打开 Midtrans 弹窗。",
  participantsIncomplete: "参团人资料尚未完整。请先填写所有参团人信息后再继续付款。",
  bookingCode: "订单编号",
  total: "总额",
  paymentStatus: "付款状态",
  escrowStatus: "托管状态",
  packageSubtotal: "套餐小计",
  adminFee: "手续费",
  tax: "税费",
  remainingSettlement: "剩余尾款",
  localizedPriceSummary: "按您语言显示的价格摘要",
  localizedPriceBody: "套餐价格会跟随您在结账时选择的语言显示，付款网关仍以 IDR 处理。",
  adultPrice: "成人价格",
  childPrice: "儿童价格",
  displaySubtotal: "显示小计",
  exchangeRateDate: "汇率日期",
  bookingDetail: "订单详情",
  name: "姓名",
  email: "邮箱",
  phone: "电话号码",
  participantCount: "参团人数",
  adult: "成人",
  child: "儿童",
  paymentType: "付款方式",
  fullPayment: "全额付款",
  billNow: "当前应付",
  settlementDeadline: "尾款截止时间",
  journeyPhase: "行程阶段",
  participantData: "参团人资料",
  participantDataBody: "所有出行人员资料必须完整后才能开启付款。",
  editParticipantData: "修改参团人资料",
  fillParticipantData: "填写参团人资料",
  participantStatus: "参团人资料状态：",
  participantsComplete: "位参团人资料已完整",
  participantsFilled: "位参团人资料已填写",
  identityNumber: "证件号 / 护照号",
  nationality: "国籍",
  age: "年龄",
  noParticipantData: "该订单尚未保存任何参团人资料。",
  bookingActions: "订单操作",
  payDpNow: "立即支付定金",
  payFullNow: "立即全额付款",
  draftCancelledRedirect:
    "/customer/dashboard?info=%E8%8D%89%E7%A8%BF%E8%AE%A2%E5%8D%95%E5%9B%A0%E6%9C%AA%E7%BB%A7%E7%BB%AD%E4%BB%98%E6%AC%BE%E8%80%8C%E5%B7%B2%E5%8F%96%E6%B6%88",
  completeParticipants: "完善参团人资料",
  cancelAndDeleteBooking: "取消并删除订单",
  paySettlement: "支付尾款",
  settlementExpiredOn: "尾款截止时间已过：",
} satisfies Record<string, string>

function getBookingPageCopy(locale: Locale) {
  return locale === "zh" ? bookingPageCopyZh : bookingPageCopy[locale]
}

function resolvePaymentStatusLabel(status: string | null, locale: Locale) {
  const t = getBookingPageCopy(locale)
  const normalized = normalizeStatus(status)
  if (normalized === "dp_paid") return t.waitingSettlement
  if (normalized === "paid") return t.paid
  if (normalized === "pending") return t.awaitingPayment
  if (normalized === "refund_pending_review") return t.refundReview
  return titleCaseStatus(status)
}

function resolveEscrowStatusLabel(status: string | null, locale: Locale) {
  const normalized = normalizeStatus(status)
  const t = getBookingPageCopy(locale)
  if (normalized === "held") return t.escrowHeld
  if (normalized === "partial_hold") return t.escrowPartialHold
  if (normalized === "awaiting_admin_handoff" || normalized === "finance_review") return t.readyForFinance
  if (normalized === "payout_processing") return t.financeProcessing
  if (normalized === "paid_out") return t.paidOut
  if (normalized === "refund_pending_review") return t.refundReview
  return titleCaseStatus(status)
}

function resolveBookingStatusLabel(status: string | null, locale: Locale) {
  const normalized = normalizeStatus(status)
  const t = getBookingPageCopy(locale)
  if (isTripCompletedStatus(status)) return getTripCompletedLabel(locale)
  if (normalized === "merchant_arrived") return t.awaitingPickup
  if (normalized === "customer_picked_up") return t.pickedUp
  if (normalized === "customer_picked_up_pending_final_payment") return t.pickedUp
  if (normalized === "awaiting_admin_handoff" || normalized === "finance_review") return t.readyForFinance
  if (normalized === "finance_processing" || normalized === "payout_processing") return t.financeProcessing
  if (normalized === "payout_completed") return t.paidOut
  if (normalized === "confirmed") return t.confirmed
  if (normalized.startsWith("cancelled")) return t.cancelled
  return titleCaseStatus(status)
}

function badgeTone(status: string | null) {
  const normalized = normalizeStatus(status)
  if (normalized === "paid") return "border-emerald-200 bg-emerald-50 text-emerald-700"
  if (normalized === "dp_paid") return "border-amber-200 bg-amber-50 text-amber-700"
  if (normalized === "cancelled") return "border-rose-200 bg-rose-50 text-rose-700"
  return "border-slate-200 bg-slate-100 text-slate-700"
}

function escrowBadgeTone(status: string | null) {
  const normalized = normalizeStatus(status)
  if (normalized === "held" || normalized === "partial_hold") return "border-orange-200 bg-orange-50 text-orange-700"
  if (normalized === "awaiting_admin_handoff" || normalized === "ready_for_payout") {
    return "border-sky-200 bg-sky-50 text-sky-700"
  }
  if (normalized === "paid_out") return "border-violet-200 bg-violet-50 text-violet-700"
  return "border-slate-200 bg-slate-100 text-slate-700"
}

function resolveJourneyPhase(booking: BookingDetailRow, locale: Locale) {
  const t = getBookingPageCopy(locale)
  if (normalizeStatus(booking.escrow_status) === "paid_out") {
    return { label: t.paidOut, tone: "border-violet-200 bg-violet-50 text-violet-700" }
  }
  if (normalizeStatus(booking.booking_status) === "payout_completed") {
    return { label: t.paidOut, tone: "border-violet-200 bg-violet-50 text-violet-700" }
  }
  if (isTripCompletedStatus(booking.booking_status)) {
    return { label: getTripCompletedLabel(locale), tone: "border-emerald-200 bg-emerald-50 text-emerald-700" }
  }
  if (
    normalizeStatus(booking.booking_status) === "awaiting_admin_handoff" ||
    normalizeStatus(booking.escrow_status) === "awaiting_admin_handoff"
  ) {
    return { label: t.readyForFinance, tone: "border-sky-200 bg-sky-50 text-sky-700" }
  }
  if (booking.merchant_picked_up_at) {
    return { label: t.goConfirmed, tone: "border-emerald-200 bg-emerald-50 text-emerald-700" }
  }
  if (booking.customer_picked_up_at) {
    return { label: t.pickedUp, tone: "border-emerald-200 bg-emerald-50 text-emerald-700" }
  }
  if (booking.merchant_arrived_at) {
    return { label: t.awaitingPickup, tone: "border-amber-200 bg-amber-50 text-amber-700" }
  }
  if (normalizeStatus(booking.payment_status) === "paid") {
    return { label: t.fullyPaid, tone: "border-emerald-200 bg-emerald-50 text-emerald-700" }
  }
  if (normalizeStatus(booking.payment_status) === "dp_paid") {
    return { label: t.waitingSettlement, tone: "border-amber-200 bg-amber-50 text-amber-700" }
  }
  return { label: resolveBookingStatusLabel(booking.booking_status, locale), tone: "border-slate-200 bg-slate-100 text-slate-700" }
}

function formatIdr(value: number | null | undefined) {
  return `Rp ${Number(value || 0).toLocaleString("id-ID")}`
}

export default async function BookingPage({ params, searchParams }: BookingPageProps) {
  const { id } = await params
  const resolvedSearchParams = await searchParams
  const authSupabase = await createClient("customer")
  const adminSupabase = createAdminClient()
  const locale = normalizeLocale(await getCurrentLocale())
  const t = getBookingPageCopy(locale)
  const {
    data: { user },
  } = await authSupabase.auth.getUser()

  if (!user) {
    return <div className="p-10">{t.loginRequired}</div>
  }

  const { data: booking, error } = await adminSupabase
    .from("bookings")
    .select("id, booking_code, customer_name, customer_email, customer_phone, pickup_date, adult_count, child_count, payment_type, dp_amount, total_amount, subtotal_amount, customer_admin_fee_amount, customer_tax_amount, customer_admin_fee_percent, customer_tax_percent, final_payment_amount, display_currency, display_subtotal_amount, display_price_adult, display_price_child, exchange_rate_date, booking_status, payment_status, expiry_time, booking_product_type, package_id, escrow_status, merchant_arrived_at, merchant_picked_up_at, customer_picked_up_at, promo_code, promo_discount_amount, promo_snapshot, user_id")
    .eq("id", id)
    .single<BookingDetailRow>()

  const signedInEmail = String(user.email || "").trim().toLowerCase()
  const bookingOwnerEmail = String(booking?.customer_email || "").trim().toLowerCase()
  const isOwnedBooking = Boolean(
    booking &&
      ((booking.user_id && booking.user_id === user.id) ||
        (!booking.user_id && signedInEmail && bookingOwnerEmail === signedInEmail)),
  )

  if (error || !booking || !isOwnedBooking) {
    return <div className="p-10">{t.bookingNotFound}</div>
  }

  const { data: participantRows } = await adminSupabase
    .from("booking_participants")
    .select("id, participant_type, sequence_no, full_name, identity_number, nationality, age")
    .eq("booking_id", booking.id)
    .order("participant_type", { ascending: true })
    .order("sequence_no", { ascending: true })

  const participants = (participantRows as BookingParticipantRow[] | null) || []
  const isFlightBooking = normalizeStatus(booking.booking_product_type || null) === "flight"
  const isHotelBooking = normalizeStatus(booking.booking_product_type || null) === "hotel"
  const { data: flightPaymentGate } = isFlightBooking
    ? await adminSupabase
        .from("flight_booking_details")
        .select("lifecycle_status, issue_status, booking_hold_expires_at, ticket_number, pnr_code")
        .eq("booking_id", booking.id)
        .maybeSingle<FlightPaymentGateRow>()
    : { data: null }
  const canOpenFlightPayment =
    !isFlightBooking ||
    Boolean(
        flightPaymentGate &&
        isFlightPaymentReadyStatus(flightPaymentGate.lifecycle_status) &&
        !isExpiredDateTime(flightPaymentGate.booking_hold_expires_at) &&
        !isExpiredDateTime(booking.expiry_time),
    )
  const canOpenHotelPayment =
    !isHotelBooking ||
    !isExpiredDateTime(booking.expiry_time)
  const adultCount = Math.max(Number(booking.adult_count || 0), 0)
  const childCount = Math.max(Number(booking.child_count || 0), 0)
  const expectedParticipantCount = adultCount + childCount
  const hasCompleteParticipants = hasExpectedParticipants(participants, {
    adult: adultCount,
    child: childCount,
  })

  const canConfirmPickup =
    normalizeStatus(booking.payment_status) === "paid" &&
    Boolean(booking.merchant_arrived_at) &&
    !booking.customer_picked_up_at
  const canPayRemaining =
    normalizeStatus(booking.payment_status) === "dp_paid" &&
    !isFinalPaymentOverdue(booking.pickup_date || null)
  const isRemainingPaymentOverdue =
    normalizeStatus(booking.payment_status) === "dp_paid" &&
    isFinalPaymentOverdue(booking.pickup_date || null)
  const canStartInitialPayment =
    ["pending", "unpaid", ""].includes(normalizeStatus(booking.payment_status)) && canOpenFlightPayment && canOpenHotelPayment
  const isWaitingFlightPaymentGate =
    isFlightBooking &&
    ["pending", "unpaid", ""].includes(normalizeStatus(booking.payment_status)) &&
    !canOpenFlightPayment
  const flightPaymentGateNotice = isFlightBooking ? getFlightPaymentGateNotice(flightPaymentGate || null, locale) : null
  const phase = resolveJourneyPhase(booking, locale)
  const flightStatus = isFlightBooking ? getFlightStatusForBooking(booking, flightPaymentGate || null, locale) : null
  const openedFromCheckout = resolvedSearchParams.from_checkout === "1"
  const normalizedPaymentType = normalizeStatus(booking.payment_type) === "dp" ? "dp" : "full"
  const amountDueNow = normalizedPaymentType === "dp" ? Number(booking.dp_amount || 0) : Number(booking.total_amount || 0)
  const displayCurrency = booking.display_currency || "IDR"
  const displaySubtotal = Number(booking.display_subtotal_amount || 0)
  const displayAdminFee = Math.round(
    displaySubtotal * (Number(booking.customer_admin_fee_percent || 0) / 100),
  )
  const displayTax = Math.round(
    (displaySubtotal + displayAdminFee) * (Number(booking.customer_tax_percent || 0) / 100),
  )
  const displayTotal = displaySubtotal + displayAdminFee + displayTax
  const displayDpAmount = Math.round(displayTotal * 0.3)
  const displayFinalPaymentAmount = Math.max(displayTotal - displayDpAmount, 0)
  const displayAmountDueNow =
    normalizedPaymentType === "dp" ? displayDpAmount : displayTotal
  const promoSnapshot = parsePromoSnapshot(booking.promo_snapshot)
  const displayDiscountAmount = Math.max(
    Number(promoSnapshot?.display_discount_amount ?? booking.promo_discount_amount ?? 0),
    0,
  )
  const displaySubtotalBeforeDiscount = Math.max(
    Number(promoSnapshot?.display_subtotal_before_discount ?? displaySubtotal + displayDiscountAmount),
    displaySubtotal,
  )

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)] p-6 md:p-10">
      <div className="mx-auto max-w-4xl">
        <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm sm:rounded-[32px] sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="max-w-2xl">
              <p className="inline-flex rounded-full border border-orange-200 bg-orange-50 px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-orange-600">
                {openedFromCheckout ? t.bookingConfirmation : t.bookingSuccess}
              </p>
              <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                {formatBookingCode(booking.booking_code, booking.id)}
              </h1>
              <p className="mt-3 text-sm leading-7 text-slate-500 sm:text-base">
                {openedFromCheckout ? t.confirmationIntro : t.successIntro}
              </p>
            </div>
            <div className="rounded-[22px] border border-slate-200 bg-slate-50/80 px-4 py-4 sm:min-w-[220px]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">{t.journeyPhase}</p>
              <span className={`mt-3 inline-flex rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] ${phase.tone}`}>
                {phase.label}
              </span>
              <p className="mt-3 text-xs leading-6 text-slate-500">
                {locale === "en"
                  ? "Customer funds remain in escrow until the trip checkpoints are fully completed."
                  : locale === "zh"
                    ? "在行程检查点全部完成之前，客户资金会继续保留在托管账户中。"
                    : "Dana customer tetap berada di escrow sampai checkpoint perjalanan selesai sepenuhnya."}
              </p>
            </div>
          </div>
        </section>

        {flightStatus ? (
          <section className={`mt-6 rounded-[28px] border p-6 shadow-sm ${flightStatus.tone}`}>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em]">{flightStatus.label}</p>
            <h2 className="mt-3 text-xl font-semibold">{flightStatus.headline}</h2>
            <p className="mt-2 text-sm leading-7">{flightStatus.body}</p>
            {(flightPaymentGate?.pnr_code || flightPaymentGate?.ticket_number) ? (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {flightPaymentGate?.pnr_code ? (
                  <div className="rounded-[18px] border border-white/60 bg-white/70 p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] opacity-70">PNR</p>
                    <p className="mt-2 text-base font-semibold">{flightPaymentGate.pnr_code}</p>
                  </div>
                ) : null}
                {flightPaymentGate?.ticket_number ? (
                  <div className="rounded-[18px] border border-white/60 bg-white/70 p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] opacity-70">Ticket</p>
                    <p className="mt-2 text-base font-semibold">{flightPaymentGate.ticket_number}</p>
                  </div>
                ) : null}
              </div>
            ) : null}
            {flightStatus.code === "issued" && (flightPaymentGate?.pnr_code || flightPaymentGate?.ticket_number) ? (
              <div className="mt-5">
                <a
                  href={`/booking/${booking.id}/e-ticket`}
                  className="inline-flex rounded-2xl border border-emerald-300 bg-white/80 px-5 py-3 text-sm font-semibold transition hover:bg-white"
                >
                  Lihat E-ticket Red Feng
                </a>
              </div>
            ) : null}
          </section>
        ) : null}

        {openedFromCheckout ? (
          <div className="mt-6 rounded-2xl border border-orange-200 bg-orange-50 p-4 text-sm text-orange-700">
            {t.checkoutAlert}
          </div>
        ) : null}

        {!hasCompleteParticipants ? (
          <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            {t.participantsIncomplete}
          </div>
        ) : null}

        {resolvedSearchParams.success ? (
          <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
            {resolvedSearchParams.success}
          </div>
        ) : null}

        {resolvedSearchParams.error ? (
          <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
            {resolvedSearchParams.error}
          </div>
        ) : null}

        <section className="mt-6 grid gap-4 md:grid-cols-4">
          <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">{t.bookingCode}</p>
            <p className="mt-2 text-xl font-bold text-slate-900">{formatBookingCode(booking.booking_code, booking.id)}</p>
          </div>
          <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">{t.total}</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">
              {formatPackageMoney(displayTotal, displayCurrency, locale)}
            </p>
            <p className="mt-2 text-xs text-slate-500">{formatIdr(booking.total_amount)}</p>
          </div>
          <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">{t.paymentStatus}</p>
            <span className={`mt-3 inline-flex rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] ${badgeTone(booking.payment_status)}`}>
              {resolvePaymentStatusLabel(booking.payment_status, locale)}
            </span>
          </div>
          <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">{t.escrowStatus}</p>
            <span className={`mt-3 inline-flex rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] ${escrowBadgeTone(booking.escrow_status)}`}>
              {resolveEscrowStatusLabel(booking.escrow_status, locale)}
            </span>
          </div>
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-4">
          <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">{t.packageSubtotal}</p>
            <p className="mt-2 text-xl font-bold text-slate-900">
              {formatPackageMoney(displaySubtotal, displayCurrency, locale)}
            </p>
            <p className="mt-2 text-xs text-slate-500">{formatIdr(booking.subtotal_amount)}</p>
          </div>
          <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">{t.adminFee}</p>
            <p className="mt-2 text-xl font-bold text-slate-900">
              {formatPackageMoney(displayAdminFee, displayCurrency, locale)}
            </p>
            <p className="mt-2 text-xs text-slate-500">{formatIdr(booking.customer_admin_fee_amount)}</p>
          </div>
          <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">{t.tax}</p>
            <p className="mt-2 text-xl font-bold text-slate-900">
              {formatPackageMoney(displayTax, displayCurrency, locale)}
            </p>
            <p className="mt-2 text-xs text-slate-500">{formatIdr(booking.customer_tax_amount)}</p>
          </div>
          <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">{t.remainingSettlement}</p>
            <p className="mt-2 text-xl font-bold text-slate-900">
              {formatPackageMoney(displayFinalPaymentAmount, displayCurrency, locale)}
            </p>
            <p className="mt-2 text-xs text-slate-500">{formatIdr(booking.final_payment_amount)}</p>
          </div>
        </section>

        {(booking.promo_code || displayDiscountAmount > 0 || promoSnapshot?.rule_name) ? (
          <section className="mt-6 rounded-[28px] border border-emerald-200 bg-emerald-50 p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">
              {locale === "en" ? "Promo Applied" : locale === "zh" ? "已应用优惠" : "Promo Dipakai"}
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              {locale === "en"
                ? `Mode: ${getPromoSourceLabel(locale, promoSnapshot, booking.promo_code)}`
                : locale === "zh"
                  ? `方式：${getPromoSourceLabel(locale, promoSnapshot, booking.promo_code)}`
                  : `Mode: ${getPromoSourceLabel(locale, promoSnapshot, booking.promo_code)}`}
            </p>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <div className="rounded-[20px] border border-emerald-100 bg-white p-4">
                <p className="text-sm text-slate-500">{locale === "en" ? "Promo" : locale === "zh" ? "优惠名称" : "Nama promo"}</p>
                <p className="mt-2 text-lg font-semibold text-slate-900">{promoSnapshot?.rule_name || booking.promo_code || "-"}</p>
              </div>
              <div className="rounded-[20px] border border-emerald-100 bg-white p-4">
                <p className="text-sm text-slate-500">{locale === "en" ? "Code" : locale === "zh" ? "优惠码" : "Kode"}</p>
                <p className="mt-2 text-lg font-semibold uppercase text-slate-900">{booking.promo_code || promoSnapshot?.code || "-"}</p>
              </div>
              <div className="rounded-[20px] border border-emerald-100 bg-white p-4">
                <p className="text-sm text-slate-500">{locale === "en" ? "Discount" : locale === "zh" ? "优惠金额" : "Potongan"}</p>
                <p className="mt-2 text-lg font-semibold text-emerald-700">
                  -{formatPackageMoney(displayDiscountAmount, displayCurrency, locale)}
                </p>
                <p className="mt-2 text-xs text-slate-500">{formatIdr(booking.promo_discount_amount)}</p>
              </div>
            </div>
            <div className="mt-4 rounded-[20px] border border-emerald-100 bg-white p-4 text-sm text-slate-600">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span>{locale === "en" ? "Subtotal before promo" : locale === "zh" ? "优惠前小计" : "Subtotal sebelum promo"}</span>
                <span className="font-semibold text-slate-900">{formatPackageMoney(displaySubtotalBeforeDiscount, displayCurrency, locale)}</span>
              </div>
              <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
                <span>{locale === "en" ? "Subtotal after promo" : locale === "zh" ? "优惠后小计" : "Subtotal sesudah promo"}</span>
                <span className="font-semibold text-slate-900">{formatPackageMoney(displaySubtotal, displayCurrency, locale)}</span>
              </div>
            </div>
            {(promoSnapshot?.marketing_approved_at || promoSnapshot?.finance_approved_at) ? (
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div className="rounded-[20px] border border-emerald-100 bg-white p-4">
                  <p className="text-sm text-slate-500">
                    {locale === "en" ? "Marketing approval" : locale === "zh" ? "营销审批" : "Approval marketing"}
                  </p>
                  <p className="mt-2 text-base font-semibold text-slate-900">{formatPromoApprovalTime(promoSnapshot?.marketing_approved_at)}</p>
                  <p className="mt-1 text-xs text-slate-500">{promoSnapshot?.marketing_approved_by_name || "-"}</p>
                </div>
                <div className="rounded-[20px] border border-emerald-100 bg-white p-4">
                  <p className="text-sm text-slate-500">
                    {locale === "en" ? "Finance approval" : locale === "zh" ? "财务审批" : "Approval finance"}
                  </p>
                  <p className="mt-2 text-base font-semibold text-slate-900">{formatPromoApprovalTime(promoSnapshot?.finance_approved_at || promoSnapshot?.approved_at)}</p>
                  <p className="mt-1 text-xs text-slate-500">{promoSnapshot?.finance_approved_by_name || promoSnapshot?.approved_by_name || "-"}</p>
                </div>
              </div>
            ) : null}
          </section>
        ) : null}

        {booking.display_currency || booking.display_subtotal_amount || booking.exchange_rate_date ? (
          <section className="mt-6 rounded-[28px] border border-blue-100 bg-blue-50 p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">{t.localizedPriceSummary}</h2>
            <p className="mt-2 text-sm text-slate-600">
              {t.localizedPriceBody}
            </p>
            <div className="mt-4 rounded-[20px] border border-blue-200 bg-white px-4 py-3 text-sm text-slate-600">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span>{t.billNow}</span>
                <span className="font-semibold text-slate-900">
                  {formatPackageMoney(displayAmountDueNow, displayCurrency, locale)}
                </span>
              </div>
              <div className="mt-2 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
                <span>Payment gateway IDR</span>
                <span className="font-semibold text-slate-700">{formatIdr(amountDueNow)}</span>
              </div>
            </div>
            <div className="mt-5 grid gap-4 md:grid-cols-4">
              <div className="rounded-[20px] border border-blue-100 bg-white p-4">
                <p className="text-sm text-slate-500">{t.adultPrice}</p>
                <p className="mt-2 text-lg font-semibold text-slate-900">
                  {formatPackageMoney(booking.display_price_adult, booking.display_currency, locale)}
                </p>
              </div>
              <div className="rounded-[20px] border border-blue-100 bg-white p-4">
                <p className="text-sm text-slate-500">{t.childPrice}</p>
                <p className="mt-2 text-lg font-semibold text-slate-900">
                  {formatPackageMoney(booking.display_price_child, booking.display_currency, locale)}
                </p>
              </div>
              <div className="rounded-[20px] border border-blue-100 bg-white p-4">
                <p className="text-sm text-slate-500">{t.displaySubtotal}</p>
                <p className="mt-2 text-lg font-semibold text-slate-900">
                  {formatPackageMoney(booking.display_subtotal_amount, booking.display_currency, locale)}
                </p>
              </div>
              <div className="rounded-[20px] border border-blue-100 bg-white p-4">
                <p className="text-sm text-slate-500">{t.exchangeRateDate}</p>
                <p className="mt-2 text-lg font-semibold text-slate-900">{booking.exchange_rate_date || "-"}</p>
              </div>
            </div>
          </section>
        ) : null}

        <section className="mt-8 rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">{t.bookingDetail}</h2>
          <div className="mt-5 grid gap-5 md:grid-cols-2">
            <div>
              <p className="text-sm text-slate-500">{t.name}</p>
              <p className="mt-2 font-medium text-slate-900">{booking.customer_name || "-"}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500">{t.email}</p>
              <p className="mt-2 font-medium text-slate-900">{booking.customer_email || "-"}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500">{t.phone}</p>
              <p className="mt-2 font-medium text-slate-900">{booking.customer_phone || "-"}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500">{t.participantCount}</p>
              <p className="mt-2 font-medium text-slate-900">{`${t.adult} ${adultCount} / ${t.child} ${childCount}`}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500">{t.paymentType}</p>
              <p className="mt-2 font-medium text-slate-900">{normalizedPaymentType === "dp" ? "DP 30%" : t.fullPayment}</p>
            </div>
              <div>
                <p className="text-sm text-slate-500">{t.billNow}</p>
                <p className="mt-2 font-medium text-slate-900">
                  {formatPackageMoney(displayAmountDueNow, displayCurrency, locale)}
                </p>
                <p className="mt-1 text-xs text-slate-500">{formatIdr(amountDueNow)}</p>
              </div>
            {normalizedPaymentType === "dp" ? (
              <div>
                <p className="text-sm text-slate-500">{t.settlementDeadline}</p>
                <p className="mt-2 font-medium text-slate-900">{formatFinalPaymentDueLabel(booking.pickup_date || null)}</p>
              </div>
            ) : null}
            <div>
              <p className="text-sm text-slate-500">{t.journeyPhase}</p>
              <span className={`mt-2 inline-flex rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] ${phase.tone}`}>
                {phase.label}
              </span>
            </div>
            <div>
              <p className="text-sm text-slate-500">{t.paymentStatus}</p>
              <span className={`mt-2 inline-flex rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] ${badgeTone(booking.payment_status)}`}>
                {resolvePaymentStatusLabel(booking.payment_status, locale)}
              </span>
            </div>
          </div>
        </section>

        <section className="mt-8 rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">{t.participantData}</h2>
              <p className="mt-2 text-sm text-slate-500">
                {t.participantDataBody}
              </p>
            </div>
            <a
              href={`/booking/${booking.id}/participants`}
              className="rounded-2xl border border-orange-300 bg-orange-50 px-5 py-3 text-sm font-semibold text-orange-700 transition hover:bg-orange-100"
            >
              {hasCompleteParticipants ? t.editParticipantData : t.fillParticipantData}
            </a>
          </div>

          <div className="mt-5 rounded-[20px] border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            {t.participantStatus}{" "}
            <span className={`font-semibold ${hasCompleteParticipants ? "text-emerald-700" : "text-amber-700"}`}>
              {hasCompleteParticipants
                ? `${participants.length} / ${expectedParticipantCount} ${t.participantsComplete}`
                : `${participants.length} / ${expectedParticipantCount} ${t.participantsFilled}`}
            </span>
          </div>

          {participants.length > 0 ? (
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {participants.map((participant) => (
                <div key={participant.id} className="rounded-[20px] border border-slate-200 bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    {participant.participant_type === "adult" ? `${t.adult} ${participant.sequence_no}` : `${t.child} ${participant.sequence_no}`}
                  </p>
                  <p className="mt-3 text-lg font-semibold text-slate-900">{participant.full_name || "-"}</p>
                  <dl className="mt-3 space-y-2 text-sm text-slate-600">
                    <div className="flex items-center justify-between gap-4">
                      <dt>{t.identityNumber}</dt>
                      <dd className="font-medium text-slate-900">{participant.identity_number || "-"}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <dt>{t.nationality}</dt>
                      <dd className="font-medium text-slate-900">{participant.nationality || "-"}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <dt>{t.age}</dt>
                      <dd className="font-medium text-slate-900">{participant.age ?? "-"}</dd>
                    </div>
                  </dl>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-5 rounded-[20px] border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500">
              {t.noParticipantData}
            </div>
          )}
        </section>

        <section className="mt-8 rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-2">
            <h2 className="text-xl font-semibold text-slate-900">{t.bookingActions}</h2>
          </div>

          {isWaitingFlightPaymentGate && flightPaymentGateNotice ? (
            <div className={`mt-5 rounded-[22px] border p-5 text-sm leading-7 ${flightPaymentGateNotice.tone}`}>
              <p className="font-semibold">{flightPaymentGateNotice.title}</p>
              <p className="mt-1">{flightPaymentGateNotice.body}</p>
            </div>
          ) : null}
          {canStartInitialPayment && hasCompleteParticipants && (isFlightBooking || isHotelBooking) ? (
            <FlightPaymentCountdown deadline={booking.expiry_time} locale={locale} refreshOnExpire className="mt-5 max-w-sm" />
          ) : null}

          <div className="mt-6 flex flex-wrap gap-3">
            {canStartInitialPayment && hasCompleteParticipants ? (
              <BookingPaymentButton
                bookingId={booking.id}
                locale={locale}
                label={normalizedPaymentType === "dp" ? t.payDpNow : t.payFullNow}
                className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                cleanupOnAbandon={!isFlightBooking}
                redirectOnCleanup={t.draftCancelledRedirect}
              />
            ) : null}
            {canStartInitialPayment && !hasCompleteParticipants ? (
              <a
                href={`/booking/${booking.id}/participants`}
                className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                {t.completeParticipants}
              </a>
            ) : null}
            {canStartInitialPayment ? (
              <form action={cancelDraftBooking}>
                <input type="hidden" name="booking_id" value={booking.id} />
                <button
                  type="submit"
                  className="rounded-2xl border border-rose-300 bg-rose-50 px-5 py-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-100"
                >
                  {t.cancelAndDeleteBooking}
                </button>
              </form>
            ) : null}
            {canConfirmPickup ? (
              <form action={confirmCustomerPickedUp}>
                <input type="hidden" name="booking_id" value={booking.id} />
                <button
                  type="submit"
                  className="rounded-2xl bg-orange-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-orange-600"
                >
                  Picked up
                </button>
              </form>
            ) : null}
            {canPayRemaining ? (
              <BookingPaymentButton
                bookingId={booking.id}
                locale={locale}
                label={t.paySettlement}
                className="rounded-2xl border border-orange-300 bg-orange-50 px-5 py-3 text-sm font-semibold text-orange-700 transition hover:bg-orange-100"
              />
            ) : null}
            {isRemainingPaymentOverdue ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-3 text-sm font-semibold text-rose-700">
                {t.settlementExpiredOn} {formatFinalPaymentDueLabel(booking.pickup_date || null)}.
              </div>
            ) : null}
          </div>
        </section>

      </div>
    </main>
  )
}
