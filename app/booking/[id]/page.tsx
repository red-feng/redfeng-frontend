import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import Link from "next/link"
import BookingPaymentButton from "@/app/components/BookingPaymentButton"
import { cancelDraftBooking, confirmCustomerPickedUp } from "./actions"
import { getCurrentLocale } from "@/lib/locale"
import { formatPackageMoney } from "@/lib/package-pricing"
import { normalizeLocale, type Locale } from "@/lib/i18n"
import {
  formatFinalPaymentDueLabel,
  isFinalPaymentOverdue,
} from "@/lib/booking/final-payment-deadline"
import { getCustomerTargetUnreadCount } from "@/lib/chat/customer-target-unread"

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
  package_id: string | null
  escrow_status: string | null
  merchant_arrived_at: string | null
  merchant_picked_up_at: string | null
  customer_picked_up_at: string | null
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
  const authSupabase = await createClient()
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
    .select("id, booking_code, customer_name, customer_email, customer_phone, pickup_date, adult_count, child_count, payment_type, dp_amount, total_amount, subtotal_amount, customer_admin_fee_amount, customer_tax_amount, customer_admin_fee_percent, customer_tax_percent, final_payment_amount, display_currency, display_subtotal_amount, display_price_adult, display_price_child, exchange_rate_date, booking_status, payment_status, package_id, escrow_status, merchant_arrived_at, merchant_picked_up_at, customer_picked_up_at")
    .eq("id", id)
    .single<BookingDetailRow>()

  if (error || !booking || !user.email || booking.customer_email !== user.email) {
    return <div className="p-10">{t.bookingNotFound}</div>
  }

  const { data: participantRows } = await adminSupabase
    .from("booking_participants")
    .select("id, participant_type, sequence_no, full_name, identity_number, nationality, age")
    .eq("booking_id", booking.id)
    .order("participant_type", { ascending: true })
    .order("sequence_no", { ascending: true })

  const participants = (participantRows as BookingParticipantRow[] | null) || []
  const bookingChatBadgeCount = await getCustomerTargetUnreadCount(adminSupabase, {
    customerId: user.id,
    bookingId: booking.id,
    packageId: booking.package_id,
  })
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
  const canStartInitialPayment = ["pending", "unpaid", ""].includes(normalizeStatus(booking.payment_status))
  const phase = resolveJourneyPhase(booking, locale)
  const openedFromCheckout = resolvedSearchParams.from_checkout === "1"
  const normalizedPaymentType = normalizeStatus(booking.payment_type) === "dp" ? "dp" : "full"
  const chatLabel = locale === "en" ? "Chat Merchant" : locale === "zh" ? "联系商家" : "Chat Merchant"
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

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)] p-6 md:p-10">
      <div className="mx-auto max-w-4xl">
        <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-3xl font-bold text-slate-900">{openedFromCheckout ? t.bookingConfirmation : t.bookingSuccess}</h1>
          <p className="mt-2 text-sm text-slate-500">
            {openedFromCheckout
              ? t.confirmationIntro
              : t.successIntro}
          </p>
        </section>

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
            <p className="mt-2 text-xl font-bold text-slate-900">{booking.booking_code || booking.id}</p>
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

          <div className="mt-6 flex flex-wrap gap-3">
            {canStartInitialPayment && hasCompleteParticipants ? (
              <BookingPaymentButton
                bookingId={booking.id}
                locale={locale}
                label={normalizedPaymentType === "dp" ? t.payDpNow : t.payFullNow}
                className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                cleanupOnAbandon
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
            <Link
              href={`/chat?booking_id=${encodeURIComponent(booking.id)}&portal=customer`}
              className="inline-flex items-center gap-3 rounded-2xl border border-sky-200 bg-sky-50 px-5 py-3 text-sm font-semibold text-sky-700 transition hover:border-sky-300 hover:bg-sky-100"
            >
              <span>{chatLabel}</span>
              {bookingChatBadgeCount > 0 ? (
                <span className="inline-flex min-w-6 items-center justify-center rounded-full bg-rose-500 px-2 py-1 text-[11px] font-semibold leading-none text-white">
                  {bookingChatBadgeCount > 99 ? "99+" : bookingChatBadgeCount}
                </span>
              ) : null}
            </Link>
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
