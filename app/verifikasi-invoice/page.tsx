import Link from "next/link"
import PublicHeader from "@/app/components/PublicHeader"
import { homeLayoutLock } from "@/app/components/home/shared/homeLayoutLock"
import { getCurrentLocale } from "@/lib/locale"
import { formatBookingCode, formatMerchantCode } from "@/lib/merchant-code"
import { normalizeLocale } from "@/lib/i18n"
import { formatPackageMoney, resolvePackageTranslation } from "@/lib/package-pricing"
import { createAdminClient } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"

const verificationCopy = {
  id: {
    heroBadge: "Booking Verification Desk",
    heroTitle: "Verifikasi Booking ID dan pastikan invoice sesuai dengan paket yang dipesan.",
    heroBody:
      "Masukkan Booking ID dari invoice Red Feng untuk mengecek validitas booking, status pembayaran, status escrow, detail paket, merchant, dan progress pickup customer.",
    bookingId: "Booking ID",
    bookingIdPlaceholder: "Contoh: RF-2026-0001",
    verifyNow: "Verifikasi Sekarang",
    bookingIdHint:
      "Booking ID tersedia di invoice PDF dan di barcode invoice. Anda juga dapat menempel hasil scan barcode ke kolom ini.",
    invoiceValidation: "Validasi Invoice",
    checkAuthenticity: "Cek keaslian booking",
    validationBody:
      "Sistem akan memvalidasi Booking ID yang tercetak di invoice Red Feng dan memastikan booking itu benar ada di sistem.",
    relatedPackage: "Paket Terkait",
    seeOrderedPackage: "Lihat paket yang dipesan",
    packageBody:
      "Halaman ini menampilkan nama paket, operator merchant, tanggal perjalanan, dan status operasional pickup yang relevan.",
    escrowStatus: "Escrow Status",
    monitorFunds: "Pantau status dana",
    escrowBody:
      "Informasi pembayaran, escrow, dan kesiapan payout merchant bisa dicek langsung dari hasil verifikasi booking.",
    bookingNotFoundBadge: "Booking Tidak Ditemukan",
    bookingNotFoundTitle: "Booking ID tidak terverifikasi.",
    bookingNotFoundBody:
      "Pastikan Booking ID sama persis dengan yang tercetak pada invoice Red Feng. Jika masalah tetap terjadi, hubungi tim support dengan melampirkan invoice PDF Anda.",
    verificationResult: "Verification Result",
    valid: "Valid",
    bookingIdMatches: "Booking ID cocok dengan invoice Red Feng.",
    createdOn: "Dibuat {date}",
    paymentStatus: "Payment Status",
    journeyPhase: "Journey Phase",
    bookingDetail: "Booking Detail",
    linkedPackageFallback: "Paket terhubung di sistem",
    customer: "Customer",
    merchantOperator: "Merchant / Operator",
    packageLocation: "Lokasi Paket",
    travelDate: "Tanggal Perjalanan",
    viewPackage: "Lihat Detail Paket",
    paymentBreakdown: "Payment Breakdown",
    packageSubtotal: "Subtotal Paket",
    adminFee: "Admin Fee",
    tax: "Pajak",
    totalCustomerPayment: "Total Customer Payment",
    remainingSettlement: "Sisa pelunasan",
    localizedCustomerPrice: "Harga sesuai bahasa customer",
    adult: "Adult",
    child: "Child",
    exchangeRate: "Kurs",
    pickupTimeline: "Pickup Timeline",
    pickupStatusTitle: "Status operasional customer dan merchant",
    merchantArrived: "Merchant Arrived",
    customerPickedUp: "Customer Picked up",
    merchantGo: "Merchant Go",
    validated: "Tervalidasi",
    waiting: "Menunggu",
    paidOut: "Paid Out",
    paidOutDescription: "Dana merchant sudah ditransfer oleh finance.",
    readyForFinance: "Ready for Finance",
    readyForFinanceDescription: "Pickup tervalidasi dan booking sudah masuk atau siap masuk queue finance.",
    goConfirmed: "Go Confirmed",
    goConfirmedDescription: "Merchant sudah klik Go setelah customer naik kendaraan.",
    pickedUp: "Picked Up",
    pickedUpDescription: "Customer sudah klik Picked up dan menunggu konfirmasi Go dari merchant.",
    awaitingPickup: "Awaiting Pickup",
    awaitingPickupDescription: "Merchant sudah tiba di meeting point dan menunggu customer naik.",
    fullyPaid: "Fully Paid",
    fullyPaidDescription: "Pembayaran lunas, menunggu proses pickup di hari H.",
    dpPaid: "DP Paid",
    dpPaidDescription: "DP sudah diterima, booking menunggu pelunasan.",
    pendingDescription: "Booking tercatat di sistem dan menunggu progres berikutnya.",
    pickupDateFallback: "Pickup {date}",
    paymentPending: "Menunggu Pembayaran",
    paymentCancelled: "Dibatalkan",
    escrowHeld: "Dana ditahan",
    escrowPartialHold: "Dana ditahan sebagian",
    escrowAwaitingHandoff: "Menunggu handoff finance",
    escrowReadyForPayout: "Siap payout merchant",
    escrowUnknown: "Escrow diproses",
  },
  en: {
    heroBadge: "Booking Verification Desk",
    heroTitle: "Verify the Booking ID and make sure the invoice matches the booked package.",
    heroBody:
      "Enter the Booking ID from the Red Feng invoice to check booking validity, payment status, escrow status, package details, merchant, and the customer pickup progress.",
    bookingId: "Booking ID",
    bookingIdPlaceholder: "Example: RF-2026-0001",
    verifyNow: "Verify Now",
    bookingIdHint:
      "The Booking ID is available in the PDF invoice and in the invoice barcode. You can also paste the barcode scan result into this field.",
    invoiceValidation: "Invoice Validation",
    checkAuthenticity: "Check booking authenticity",
    validationBody:
      "The system validates the Booking ID printed on the Red Feng invoice and confirms that the booking truly exists in the system.",
    relatedPackage: "Related Package",
    seeOrderedPackage: "See the booked package",
    packageBody:
      "This page shows the package name, merchant operator, travel date, and the relevant pickup operational status.",
    escrowStatus: "Escrow Status",
    monitorFunds: "Monitor fund status",
    escrowBody:
      "Payment, escrow, and merchant payout readiness can be checked directly from the verification result.",
    bookingNotFoundBadge: "Booking Not Found",
    bookingNotFoundTitle: "The Booking ID could not be verified.",
    bookingNotFoundBody:
      "Make sure the Booking ID exactly matches the one printed on the Red Feng invoice. If the problem persists, contact support and attach your PDF invoice.",
    verificationResult: "Verification Result",
    valid: "Valid",
    bookingIdMatches: "The Booking ID matches the Red Feng invoice.",
    createdOn: "Created on {date}",
    paymentStatus: "Payment Status",
    journeyPhase: "Journey Phase",
    bookingDetail: "Booking Detail",
    linkedPackageFallback: "Package linked in the system",
    customer: "Customer",
    merchantOperator: "Merchant / Operator",
    packageLocation: "Package Location",
    travelDate: "Travel Date",
    viewPackage: "View Package Detail",
    paymentBreakdown: "Payment Breakdown",
    packageSubtotal: "Package Subtotal",
    adminFee: "Admin Fee",
    tax: "Tax",
    totalCustomerPayment: "Total Customer Payment",
    remainingSettlement: "Remaining final payment",
    localizedCustomerPrice: "Customer language price",
    adult: "Adult",
    child: "Child",
    exchangeRate: "Exchange rate",
    pickupTimeline: "Pickup Timeline",
    pickupStatusTitle: "Customer and merchant operational status",
    merchantArrived: "Merchant Arrived",
    customerPickedUp: "Customer Picked up",
    merchantGo: "Merchant Go",
    validated: "Validated",
    waiting: "Waiting",
    paidOut: "Paid Out",
    paidOutDescription: "Merchant funds have already been transferred by finance.",
    readyForFinance: "Ready for Finance",
    readyForFinanceDescription: "Pickup is validated and the booking is already in, or ready for, the finance queue.",
    goConfirmed: "Go Confirmed",
    goConfirmedDescription: "The merchant already clicked Go after the customer boarded the vehicle.",
    pickedUp: "Picked Up",
    pickedUpDescription: "The customer already clicked Picked up and is waiting for Go confirmation from the merchant.",
    awaitingPickup: "Awaiting Pickup",
    awaitingPickupDescription: "The merchant has arrived at the meeting point and is waiting for the customer to board.",
    fullyPaid: "Fully Paid",
    fullyPaidDescription: "Payment is complete and the booking is waiting for pickup on the travel date.",
    dpPaid: "DP Paid",
    dpPaidDescription: "The deposit has been received and the booking is awaiting final payment.",
    pendingDescription: "The booking is recorded in the system and waiting for the next progress update.",
    pickupDateFallback: "Pickup {date}",
    paymentPending: "Awaiting Payment",
    paymentCancelled: "Cancelled",
    escrowHeld: "Funds on Hold",
    escrowPartialHold: "Partially Held",
    escrowAwaitingHandoff: "Awaiting Finance Handoff",
    escrowReadyForPayout: "Ready for Merchant Payout",
    escrowUnknown: "Escrow in Progress",
  },
  zh: {
    heroBadge: "订单验证中心",
    heroTitle: "验证 Booking ID，并确认发票与所预订的套餐一致。",
    heroBody:
      "输入 Red Feng 发票中的 Booking ID，以检查订单有效性、付款状态、托管状态、套餐详情、商家信息以及客户接送进度。",
    bookingId: "Booking ID",
    bookingIdPlaceholder: "例如：RF-2026-0001",
    verifyNow: "立即验证",
    bookingIdHint: "Booking ID 可在 PDF 发票和发票条码中找到。您也可以将条码扫描结果粘贴到此栏位。",
    invoiceValidation: "发票验证",
    checkAuthenticity: "检查订单真实性",
    validationBody: "系统会验证 Red Feng 发票上打印的 Booking ID，并确认该订单确实存在于系统中。",
    relatedPackage: "关联套餐",
    seeOrderedPackage: "查看已预订套餐",
    packageBody: "此页面会显示套餐名称、商家运营方、出行日期，以及相关的接送运营状态。",
    escrowStatus: "托管状态",
    monitorFunds: "查看资金状态",
    escrowBody: "付款、托管状态以及商家 payout 准备情况都可以直接在验证结果中查看。",
    bookingNotFoundBadge: "未找到订单",
    bookingNotFoundTitle: "Booking ID 未通过验证。",
    bookingNotFoundBody: "请确认 Booking ID 与 Red Feng 发票上打印的内容完全一致。如果问题仍然存在，请联系支持团队并附上您的 PDF 发票。",
    verificationResult: "验证结果",
    valid: "有效",
    bookingIdMatches: "Booking ID 与 Red Feng 发票一致。",
    createdOn: "创建于 {date}",
    paymentStatus: "付款状态",
    journeyPhase: "行程阶段",
    bookingDetail: "订单详情",
    linkedPackageFallback: "系统中关联的套餐",
    customer: "客户",
    merchantOperator: "商家 / 运营方",
    packageLocation: "套餐地点",
    travelDate: "出行日期",
    viewPackage: "查看套餐详情",
    paymentBreakdown: "付款明细",
    packageSubtotal: "套餐小计",
    adminFee: "手续费",
    tax: "税费",
    totalCustomerPayment: "客户付款总额",
    remainingSettlement: "剩余尾款",
    localizedCustomerPrice: "客户语言价格",
    adult: "成人",
    child: "儿童",
    exchangeRate: "汇率",
    pickupTimeline: "接送时间线",
    pickupStatusTitle: "客户与商家的运营状态",
    merchantArrived: "商家已到达",
    customerPickedUp: "客户已上车",
    merchantGo: "商家已确认 Go",
    validated: "已验证",
    waiting: "等待中",
    paidOut: "已结算",
    paidOutDescription: "商家资金已由财务转出。",
    readyForFinance: "待财务处理",
    readyForFinanceDescription: "接送已验证，订单已经进入或已准备进入财务队列。",
    goConfirmed: "已确认 Go",
    goConfirmedDescription: "客户上车后，商家已点击 Go。",
    pickedUp: "已接送",
    pickedUpDescription: "客户已点击 Picked up，正在等待商家确认 Go。",
    awaitingPickup: "等待接送",
    awaitingPickupDescription: "商家已到达集合点，正在等待客户上车。",
    fullyPaid: "已全额付款",
    fullyPaidDescription: "付款已完成，正在等待出行日当天的接送流程。",
    dpPaid: "定金已支付",
    dpPaidDescription: "定金已收到，订单正在等待尾款。",
    pendingDescription: "订单已记录在系统中，正在等待下一步进展。",
    pickupDateFallback: "接送日期 {date}",
  },
} satisfies Record<string, Record<string, string>>

const verificationCopyZh = {
  heroBadge: "订单验证中心",
  heroTitle: "验证 Booking ID，并确认发票与所预订的套餐一致。",
  heroBody:
    "输入 Red Feng 发票中的 Booking ID，以检查订单有效性、付款状态、托管状态、套餐详情、商家信息以及客户接送进度。",
  bookingId: "Booking ID",
  bookingIdPlaceholder: "例如：RF-2026-0001",
  verifyNow: "立即验证",
  bookingIdHint: "Booking ID 可在 PDF 发票和发票条码中找到。您也可以将条码扫描结果粘贴到此栏位。",
  invoiceValidation: "发票验证",
  checkAuthenticity: "检查订单真实性",
  validationBody: "系统会验证 Red Feng 发票上打印的 Booking ID，并确认该订单确实存在于系统中。",
  relatedPackage: "关联套餐",
  seeOrderedPackage: "查看已预订套餐",
  packageBody: "此页面会显示套餐名称、商家运营方、出行日期，以及相关的接送运营状态。",
  escrowStatus: "托管状态",
  monitorFunds: "查看资金状态",
  escrowBody: "付款、托管状态以及商家 payout 准备情况都可以直接在验证结果中查看。",
  bookingNotFoundBadge: "未找到订单",
  bookingNotFoundTitle: "Booking ID 未通过验证。",
  bookingNotFoundBody:
    "请确认 Booking ID 与 Red Feng 发票上打印的内容完全一致。如果问题仍然存在，请联系支持团队并附上您的 PDF 发票。",
  verificationResult: "验证结果",
  valid: "有效",
  bookingIdMatches: "Booking ID 与 Red Feng 发票一致。",
  createdOn: "创建于 {date}",
  paymentStatus: "付款状态",
  journeyPhase: "行程阶段",
  bookingDetail: "订单详情",
  linkedPackageFallback: "系统中关联的套餐",
  customer: "客户",
  merchantOperator: "商家 / 运营方",
  packageLocation: "套餐地点",
  travelDate: "出行日期",
  viewPackage: "查看套餐详情",
  paymentBreakdown: "付款明细",
  packageSubtotal: "套餐小计",
  adminFee: "手续费",
  tax: "税费",
  totalCustomerPayment: "客户付款总额",
  remainingSettlement: "剩余尾款",
  localizedCustomerPrice: "客户语言价格",
  adult: "成人",
  child: "儿童",
  exchangeRate: "汇率",
  paymentGatewayIdr: "支付网关处理金额（印尼盾）",
  pickupTimeline: "接送时间线",
  pickupStatusTitle: "客户与商家的运营状态",
  merchantArrived: "商家已到达",
  customerPickedUp: "客户已上车",
  merchantGo: "商家已确认 Go",
  validated: "已验证",
  waiting: "等待中",
  paidOut: "已结算",
  paidOutDescription: "商家资金已由财务转出。",
  readyForFinance: "待财务处理",
  readyForFinanceDescription: "接送已验证，订单已经进入或已准备进入财务队列。",
  goConfirmed: "已确认 Go",
  goConfirmedDescription: "客户上车后，商家已点击 Go。",
  pickedUp: "已接送",
  pickedUpDescription: "客户已点击 Picked up，正在等待商家确认 Go。",
  awaitingPickup: "等待接送",
  awaitingPickupDescription: "商家已到达集合点，正在等待客户上车。",
  fullyPaid: "已全额付款",
  fullyPaidDescription: "付款已完成，正在等待出行日当天的接送流程。",
  dpPaid: "定金已支付",
  dpPaidDescription: "定金已收到，订单正在等待尾款。",
  pendingDescription: "订单已记录在系统中，正在等待下一步进展。",
  pickupDateFallback: "接送日期 {date}",
  paymentPending: "待付款",
  paymentCancelled: "已取消",
  escrowHeld: "资金托管中",
  escrowPartialHold: "部分托管",
  escrowAwaitingHandoff: "待转交财务",
  escrowReadyForPayout: "待付款给商家",
  escrowUnknown: "托管处理中",
} satisfies Record<string, string>

function copy(locale: string): Record<string, string> {
  const normalized = normalizeLocale(locale)
  return normalized === "zh" ? verificationCopyZh : verificationCopy[normalized]
}

function formatText(template: string, values: Record<string, string>) {
  return Object.entries(values).reduce(
    (result, [key, value]) => result.replaceAll(`{${key}}`, value),
    template,
  )
}

type VerificationPageProps = {
  searchParams?: Promise<{ booking_id?: string }>
}

type BookingVerificationRow = {
  id: string
  booking_code: string | null
  customer_name: string | null
  pickup_date: string | null
  total_amount: number | null
  subtotal_amount: number | null
  customer_admin_fee_amount: number | null
  customer_tax_amount: number | null
  customer_admin_fee_percent: number | null
  customer_tax_percent: number | null
  final_payment_amount: number | null
  display_currency?: string | null
  display_subtotal_amount?: number | null
  display_price_adult?: number | null
  display_price_child?: number | null
  exchange_rate_date?: string | null
  booking_status: string | null
  payment_status: string | null
  escrow_status: string | null
  merchant_arrived_at: string | null
  customer_picked_up_at: string | null
  merchant_picked_up_at: string | null
  package_id: string | null
  created_at: string | null
}

function formatMoney(value: number | null | undefined, currency = "IDR", locale = "id") {
  return formatPackageMoney(value, currency, normalizeLocale(locale))
}

function formatDate(value: string | null, locale: string) {
  if (!value) return "-"
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  const localeCode = normalizeLocale(locale) === "en" ? "en-US" : normalizeLocale(locale) === "zh" ? "zh-CN" : "id-ID"
  return parsed.toLocaleDateString(localeCode, {
    day: "2-digit",
    month: "long",
    year: "numeric",
  })
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

function resolvePaymentStatusLabel(status: string | null, locale: string) {
  const normalized = normalizeStatus(status)
  const t = copy(locale)
  if (normalized === "paid") return t.fullyPaid
  if (normalized === "dp_paid") return t.dpPaid
  if (normalized === "pending" || normalized === "unpaid") return t.paymentPending
  if (normalized === "cancelled" || normalized === "rejected" || normalized === "expired") return t.paymentCancelled
  return titleCaseStatus(status)
}

function resolveEscrowStatusLabel(status: string | null, locale: string) {
  const normalized = normalizeStatus(status)
  const t = copy(locale)
  if (normalized === "paid_out") return t.paidOut
  if (normalized === "held") return t.escrowHeld
  if (normalized === "partial_hold") return t.escrowPartialHold
  if (normalized === "awaiting_admin_handoff") return t.escrowAwaitingHandoff
  if (normalized === "ready_for_payout") return t.escrowReadyForPayout
  return normalized ? titleCaseStatus(status) : t.escrowUnknown
}

function calculateDisplayBreakdown(booking: BookingVerificationRow) {
  const subtotalAmount = Math.max(Number(booking.display_subtotal_amount || 0), 0)
  const adminFeePercent = Math.max(Number(booking.customer_admin_fee_percent || 0), 0)
  const taxPercent = Math.max(Number(booking.customer_tax_percent || 0), 0)
  const adminFeeAmount = Math.round(subtotalAmount * (adminFeePercent / 100))
  const taxAmount = Math.round((subtotalAmount + adminFeeAmount) * (taxPercent / 100))
  return {
    currency: String(booking.display_currency || "IDR").trim().toUpperCase(),
    subtotalAmount,
    adminFeeAmount,
    taxAmount,
    totalAmount: subtotalAmount + adminFeeAmount + taxAmount,
  }
}

function statusBadgeTone(status: string | null) {
  const normalized = normalizeStatus(status)
  if (normalized === "paid") return "border-emerald-200 bg-emerald-50 text-emerald-700"
  if (normalized === "dp_paid") return "border-amber-200 bg-amber-50 text-amber-700"
  if (normalized === "cancelled" || normalized === "rejected") return "border-rose-200 bg-rose-50 text-rose-700"
  return "border-slate-200 bg-slate-100 text-slate-700"
}

function escrowBadgeTone(status: string | null) {
  const normalized = normalizeStatus(status)
  if (normalized === "ready_for_payout" || normalized === "awaiting_admin_handoff") {
    return "border-sky-200 bg-sky-50 text-sky-700"
  }
  if (normalized === "held" || normalized === "partial_hold") return "border-orange-200 bg-orange-50 text-orange-700"
  if (normalized === "paid_out") return "border-violet-200 bg-violet-50 text-violet-700"
  return "border-slate-200 bg-slate-100 text-slate-700"
}

function resolveJourneyPhase(booking: BookingVerificationRow, locale: string) {
  const t = copy(locale)
  const paymentStatus = normalizeStatus(booking.payment_status)
  const bookingStatus = normalizeStatus(booking.booking_status)
  const escrowStatus = normalizeStatus(booking.escrow_status)

  if (escrowStatus === "paid_out") {
    return {
      label: t.paidOut,
      tone: "border-violet-200 bg-violet-50 text-violet-700",
      description: t.paidOutDescription,
    }
  }

  if (bookingStatus === "awaiting_admin_handoff" || escrowStatus === "awaiting_admin_handoff") {
    return {
      label: t.readyForFinance,
      tone: "border-sky-200 bg-sky-50 text-sky-700",
      description: t.readyForFinanceDescription,
    }
  }

  if (booking.merchant_picked_up_at) {
    return {
      label: t.goConfirmed,
      tone: "border-emerald-200 bg-emerald-50 text-emerald-700",
      description: t.goConfirmedDescription,
    }
  }

  if (booking.customer_picked_up_at) {
    return {
      label: t.pickedUp,
      tone: "border-emerald-200 bg-emerald-50 text-emerald-700",
      description: t.pickedUpDescription,
    }
  }

  if (booking.merchant_arrived_at) {
    return {
      label: t.awaitingPickup,
      tone: "border-amber-200 bg-amber-50 text-amber-700",
      description: t.awaitingPickupDescription,
    }
  }

  if (paymentStatus === "paid") {
    return {
      label: t.fullyPaid,
      tone: "border-emerald-200 bg-emerald-50 text-emerald-700",
      description: t.fullyPaidDescription,
    }
  }

  if (paymentStatus === "dp_paid") {
    return {
      label: t.dpPaid,
      tone: "border-amber-200 bg-amber-50 text-amber-700",
      description: t.dpPaidDescription,
    }
  }

  return {
    label: titleCaseStatus(bookingStatus) || t.paymentPending,
    tone: "border-slate-200 bg-slate-100 text-slate-700",
    description: t.pendingDescription,
  }
}

function maskName(value: string | null) {
  if (!value) return "-"
  return value
    .split(" ")
    .filter(Boolean)
    .map((part) => {
      if (part.length <= 2) return `${part.charAt(0)}*`
      return `${part.slice(0, 2)}${"*".repeat(Math.max(2, part.length - 2))}`
    })
    .join(" ")
}

async function getBookingForVerification(bookingId: string, locale: string) {
  const supabase = createAdminClient()

  const baseQuery = "id, booking_code, customer_name, pickup_date, total_amount, subtotal_amount, customer_admin_fee_amount, customer_tax_amount, customer_admin_fee_percent, customer_tax_percent, final_payment_amount, display_currency, display_subtotal_amount, display_price_adult, display_price_child, exchange_rate_date, booking_status, payment_status, escrow_status, merchant_arrived_at, customer_picked_up_at, merchant_picked_up_at, package_id, created_at"

  let booking: BookingVerificationRow | null = null

  const { data: bookingByCode } = await supabase
    .from("bookings")
    .select(baseQuery)
    .eq("booking_code", bookingId)
    .maybeSingle<BookingVerificationRow>()

  booking = bookingByCode || null

  if (!booking) {
    const { data: bookingById } = await supabase
      .from("bookings")
      .select(baseQuery)
      .eq("id", bookingId)
      .maybeSingle<BookingVerificationRow>()

    booking = bookingById || null
  }

  if (!booking) {
    return null
  }

  const { data: packageRow } = booking.package_id
    ? await supabase
        .from("packages")
        .select("slug, title, city, country, merchant_id, default_language, published_languages, package_translations(language_code, title)")
        .eq("id", booking.package_id)
        .maybeSingle()
    : { data: null }

  const { data: merchantRow } = packageRow?.merchant_id
    ? await supabase
        .from("merchants")
        .select("id, brand_name, company_name")
        .eq("id", packageRow.merchant_id)
        .maybeSingle()
    : { data: null }

  return {
    booking,
    packageRow,
    packageTitle:
      resolvePackageTranslation(
        packageRow?.package_translations,
        normalizeLocale(locale),
        packageRow?.default_language,
        packageRow?.published_languages,
      )?.title?.trim() || packageRow?.title || "-",
    merchantName: merchantRow?.brand_name || merchantRow?.company_name || "-",
    merchantCode: merchantRow?.id ? formatMerchantCode(merchantRow.id) : "-",
  }
}

export default async function VerificationPage({ searchParams }: VerificationPageProps) {
  const locale = await getCurrentLocale()
  const normalizedLocale = normalizeLocale(locale)
  const t = copy(locale)
  const resolvedSearchParams = (await searchParams) || {}
  const bookingId = (resolvedSearchParams.booking_id || "").trim()
  const verification = bookingId ? await getBookingForVerification(bookingId, locale) : null
  const journeyPhase = verification ? resolveJourneyPhase(verification.booking, locale) : null
  const displayBreakdown = verification ? calculateDisplayBreakdown(verification.booking) : null

  const timeline = verification
    ? [
          {
          label: t.merchantArrived,
          done: Boolean(verification.booking.merchant_arrived_at),
        },
        {
          label: t.customerPickedUp,
          done: Boolean(verification.booking.customer_picked_up_at),
        },
        {
          label: t.merchantGo,
          done: Boolean(verification.booking.merchant_picked_up_at),
        },
      ]
    : []

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#fff7ed_0%,#fffbf5_24%,#f5f5f4_100%)]">
      <PublicHeader locale={locale} />

      <main className={`${homeLayoutLock.pageXClass} py-10 md:py-14`}>
        <div className={homeLayoutLock.contentWidthClass}>
        <section
          className={`${homeLayoutLock.cardRadiusClass} overflow-hidden border border-orange-200/80 bg-[linear-gradient(135deg,#8a2d0a_0%,#f76707_62%,#ffb55a_100%)] p-8 text-white shadow-[0_32px_80px_-40px_rgba(124,45,18,0.7)] md:p-10`}
        >
          <p className="inline-flex rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-orange-50">
            {t.heroBadge}
          </p>
          <div className="mt-5 grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
            <div>
              <h1 className="max-w-3xl text-3xl font-semibold leading-tight md:text-5xl">
                {t.heroTitle}
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-orange-50/90 md:text-base">
                {t.heroBody}
              </p>
            </div>

            <form className="rounded-[28px] border border-white/20 bg-white/12 p-5 backdrop-blur">
              <label htmlFor="booking_id" className="text-[11px] font-semibold uppercase tracking-[0.24em] text-orange-50/80">
                 {t.bookingId}
              </label>
              <input
                id="booking_id"
                name="booking_id"
                defaultValue={bookingId}
                 placeholder={t.bookingIdPlaceholder}
                className="mt-3 w-full rounded-2xl border border-white/20 bg-white/95 px-4 py-3 text-sm font-medium text-slate-900 outline-none ring-0 placeholder:text-slate-400"
              />
              <button
                type="submit"
                className="mt-4 inline-flex w-full items-center justify-center rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                 {t.verifyNow}
              </button>
              <p className="mt-3 text-xs leading-6 text-orange-50/80">
                 {t.bookingIdHint}
              </p>
            </form>
          </div>
        </section>

        {!bookingId && (
          <section className="mt-8 grid gap-4 md:grid-cols-3">
            <div className="rounded-[28px] border border-orange-100 bg-white/90 p-6 shadow-sm">
               <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-orange-500">{t.invoiceValidation}</p>
               <h2 className="mt-3 text-xl font-semibold text-slate-900">{t.checkAuthenticity}</h2>
               <p className="mt-3 text-sm leading-7 text-slate-600">
                 {t.validationBody}
               </p>
            </div>
            <div className="rounded-[28px] border border-orange-100 bg-white/90 p-6 shadow-sm">
               <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-orange-500">{t.relatedPackage}</p>
               <h2 className="mt-3 text-xl font-semibold text-slate-900">{t.seeOrderedPackage}</h2>
               <p className="mt-3 text-sm leading-7 text-slate-600">
                 {t.packageBody}
               </p>
            </div>
            <div className="rounded-[28px] border border-orange-100 bg-white/90 p-6 shadow-sm">
               <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-orange-500">{t.escrowStatus}</p>
               <h2 className="mt-3 text-xl font-semibold text-slate-900">{t.monitorFunds}</h2>
               <p className="mt-3 text-sm leading-7 text-slate-600">
                 {t.escrowBody}
               </p>
            </div>
          </section>
        )}

        {bookingId && !verification && (
          <section className="mt-8 rounded-[30px] border border-rose-200 bg-rose-50 p-8 shadow-sm">
             <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-rose-500">{t.bookingNotFoundBadge}</p>
             <h2 className="mt-3 text-2xl font-semibold text-slate-900">{t.bookingNotFoundTitle}</h2>
             <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
               {t.bookingNotFoundBody}
             </p>
          </section>
        )}

        {verification && (
          <>
            <section className="mt-8 grid gap-4 md:grid-cols-4">
              <div className="rounded-[28px] border border-orange-100 bg-white p-5 shadow-sm">
                 <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-orange-500">{t.verificationResult}</p>
                 <span className="mt-3 inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold uppercase tracking-[0.18em] text-emerald-700">
                   {t.valid}
                 </span>
                 <p className="mt-2 text-sm text-slate-500">{t.bookingIdMatches}</p>
              </div>
              <div className="rounded-[28px] border border-orange-100 bg-white p-5 shadow-sm">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-orange-500">Booking ID</p>
                <p className="mt-3 text-xl font-semibold text-slate-900">{formatBookingCode(verification.booking.booking_code, verification.booking.id)}</p>
                 <p className="mt-2 text-sm text-slate-500">
                   {formatText(t.createdOn, { date: formatDate(verification.booking.created_at, locale) })}
                 </p>
              </div>
              <div className="rounded-[28px] border border-orange-100 bg-white p-5 shadow-sm">
                 <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-orange-500">{t.paymentStatus}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className={`inline-flex rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] ${statusBadgeTone(verification.booking.payment_status)}`}>
                    {resolvePaymentStatusLabel(verification.booking.payment_status, locale)}
                  </span>
                  <span className={`inline-flex rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] ${escrowBadgeTone(verification.booking.escrow_status)}`}>
                     {t.escrowStatus} {resolveEscrowStatusLabel(verification.booking.escrow_status, locale)}
                  </span>
                </div>
              </div>
              <div className="rounded-[28px] border border-orange-100 bg-white p-5 shadow-sm">
                 <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-orange-500">{t.journeyPhase}</p>
                <span className={`mt-3 inline-flex rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] ${journeyPhase?.tone || "border-slate-200 bg-slate-100 text-slate-700"}`}>
                  {journeyPhase?.label || "-"}
                </span>
                 <p className="mt-3 text-sm text-slate-500">
                   {journeyPhase?.description || formatText(t.pickupDateFallback, { date: formatDate(verification.booking.pickup_date, locale) })}
                 </p>
              </div>
            </section>

            <section className="mt-8 grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
              <div className="rounded-[32px] border border-orange-100 bg-white p-7 shadow-sm">
                 <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-orange-500">{t.bookingDetail}</p>
                 <h2 className="mt-3 text-2xl font-semibold text-slate-900">
                    {verification.packageTitle || t.linkedPackageFallback}
                  </h2>
                <div className="mt-6 grid gap-5 md:grid-cols-2">
                  <div>
                     <p className="text-sm text-slate-500">{t.customer}</p>
                    <p className="mt-2 font-medium text-slate-900">{maskName(verification.booking.customer_name)}</p>
                  </div>
                  <div>
                     <p className="text-sm text-slate-500">{t.merchantOperator}</p>
                    <p className="mt-2 font-medium text-slate-900">{verification.merchantName}</p>
                    <p className="mt-1 text-xs font-semibold uppercase tracking-[0.22em] text-orange-600">{verification.merchantCode}</p>
                  </div>
                  <div>
                     <p className="text-sm text-slate-500">{t.packageLocation}</p>
                    <p className="mt-2 font-medium text-slate-900">
                      {[verification.packageRow?.city, verification.packageRow?.country].filter(Boolean).join(", ") || "-"}
                    </p>
                  </div>
                  <div>
                     <p className="text-sm text-slate-500">{t.travelDate}</p>
                     <p className="mt-2 font-medium text-slate-900">{formatDate(verification.booking.pickup_date, locale)}</p>
                  </div>
                </div>

                {verification.packageRow?.slug && (
                  <Link
                    href={`/packages/${verification.packageRow.slug}`}
                    className="mt-6 inline-flex rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm font-semibold text-orange-700 transition hover:bg-orange-100"
                  >
                     {t.viewPackage}
                  </Link>
                )}
              </div>

              <div className="rounded-[32px] border border-orange-100 bg-white p-7 shadow-sm">
                 <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-orange-500">{t.paymentBreakdown}</p>
                <div className="mt-5 space-y-4">
                  <div className="rounded-[22px] border border-stone-200 bg-stone-50 px-5 py-4">
                     <p className="text-xs uppercase tracking-[0.22em] text-slate-400">{t.packageSubtotal}</p>
                    <p className="mt-2 text-2xl font-semibold text-slate-900">
                      {displayBreakdown
                        ? formatMoney(displayBreakdown.subtotalAmount, displayBreakdown.currency, locale)
                        : formatMoney(verification.booking.subtotal_amount, "IDR", locale)}
                    </p>
                    {displayBreakdown && displayBreakdown.currency !== "IDR" && (
                      <p className="mt-2 text-xs text-slate-500">
                        {formatMoney(verification.booking.subtotal_amount, "IDR", locale)}
                      </p>
                    )}
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-[22px] border border-stone-200 bg-stone-50 px-5 py-4">
                       <p className="text-xs uppercase tracking-[0.22em] text-slate-400">{t.adminFee}</p>
                      <p className="mt-2 text-xl font-semibold text-slate-900">
                        {displayBreakdown
                          ? formatMoney(displayBreakdown.adminFeeAmount, displayBreakdown.currency, locale)
                          : formatMoney(verification.booking.customer_admin_fee_amount, "IDR", locale)}
                      </p>
                      {displayBreakdown && displayBreakdown.currency !== "IDR" && (
                        <p className="mt-2 text-xs text-slate-500">
                          {formatMoney(verification.booking.customer_admin_fee_amount, "IDR", locale)}
                        </p>
                      )}
                    </div>
                    <div className="rounded-[22px] border border-stone-200 bg-stone-50 px-5 py-4">
                       <p className="text-xs uppercase tracking-[0.22em] text-slate-400">{t.tax}</p>
                      <p className="mt-2 text-xl font-semibold text-slate-900">
                        {displayBreakdown
                          ? formatMoney(displayBreakdown.taxAmount, displayBreakdown.currency, locale)
                          : formatMoney(verification.booking.customer_tax_amount, "IDR", locale)}
                      </p>
                      {displayBreakdown && displayBreakdown.currency !== "IDR" && (
                        <p className="mt-2 text-xs text-slate-500">
                          {formatMoney(verification.booking.customer_tax_amount, "IDR", locale)}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="rounded-[22px] border border-orange-200 bg-[linear-gradient(135deg,#fff7ed_0%,#ffffff_100%)] px-5 py-4">
                      <p className="text-xs uppercase tracking-[0.22em] text-orange-500">{t.totalCustomerPayment}</p>
                    <p className="mt-2 text-3xl font-semibold text-slate-950">
                      {displayBreakdown
                        ? formatMoney(displayBreakdown.totalAmount, displayBreakdown.currency, locale)
                        : formatMoney(verification.booking.total_amount, "IDR", locale)}
                    </p>
                    <p className="mt-2 text-sm text-slate-500">
                       {t.remainingSettlement}:{" "}
                      {displayBreakdown && Number(verification.booking.total_amount || 0) > 0
                        ? formatMoney(
                            Math.max(
                              displayBreakdown.totalAmount -
                                Math.round(
                                  displayBreakdown.totalAmount *
                                    (Number(verification.booking.total_amount || 0) -
                                      Number(verification.booking.final_payment_amount || 0)) /
                                    Number(verification.booking.total_amount || 0),
                                ),
                              0,
                            ),
                            displayBreakdown.currency,
                            locale,
                          )
                        : formatMoney(verification.booking.final_payment_amount, "IDR", locale)}
                    </p>
                    {displayBreakdown && displayBreakdown.currency !== "IDR" && (
                      <p className="mt-2 text-xs text-slate-500">
                        {t.paymentGatewayIdr}: {formatMoney(verification.booking.total_amount, "IDR", locale)}
                      </p>
                    )}
                  </div>
                  {verification.booking.display_currency && (
                    <div className="rounded-[22px] border border-sky-200 bg-sky-50 px-5 py-4">
                       <p className="text-xs uppercase tracking-[0.22em] text-sky-600">{t.localizedCustomerPrice}</p>
                      <p className="mt-2 text-sm font-semibold text-slate-900">
                        {formatPackageMoney(
                          verification.booking.display_subtotal_amount,
                          verification.booking.display_currency,
                          normalizedLocale,
                        )}
                      </p>
                      <p className="mt-2 text-xs text-slate-500">
                         {t.adult}:{" "}
                        {formatPackageMoney(
                          verification.booking.display_price_adult,
                          verification.booking.display_currency,
                          normalizedLocale,
                        )}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                         {t.child}:{" "}
                        {formatPackageMoney(
                          verification.booking.display_price_child,
                          verification.booking.display_currency,
                          normalizedLocale,
                        )}
                      </p>
                      <p className="mt-2 text-xs text-slate-500">
                         {t.exchangeRate}: {verification.booking.exchange_rate_date || "-"}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </section>

            <section className={`mt-8 ${homeLayoutLock.cardRadiusClass} border border-orange-100 bg-white p-7 shadow-sm`}>
               <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-orange-500">{t.pickupTimeline}</p>
               <h2 className="mt-3 text-2xl font-semibold text-slate-900">{t.pickupStatusTitle}</h2>
              <div className="mt-6 grid gap-4 md:grid-cols-3">
                {timeline.map((item) => (
                  <div
                    key={item.label}
                    className={`rounded-[24px] border px-5 py-5 ${
                      item.done ? "border-emerald-200 bg-emerald-50" : "border-stone-200 bg-stone-50"
                    }`}
                  >
                    <p className="text-sm font-semibold text-slate-900">{item.label}</p>
                    <p className={`mt-3 text-sm font-semibold ${item.done ? "text-emerald-600" : "text-slate-500"}`}>
                       {item.done ? t.validated : t.waiting}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}
        </div>
      </main>
    </div>
  )
}
