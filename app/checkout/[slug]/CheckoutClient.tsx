"use client"

import Image from "next/image"
import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { dictionaries, type Locale } from "@/lib/i18n"
import { getMinimumBookingDate } from "@/lib/booking/bookingWindow"
import { formatPackageMoney } from "@/lib/package-pricing"
import { getScheduleQuotaLabel, isQuotaTravelStyle } from "@/lib/travelStyles"
import {
  activeCustomerPaymentMethods,
  resolveActiveCustomerPaymentMethod,
  resolveCustomerAdminFeePercent,
  type FinancePaymentMethod,
} from "@/lib/finance/settings"

function formatIdrMoney(value: number | null | undefined) {
  return `Rp ${Number(value || 0).toLocaleString("id-ID")}`
}

const checkoutUiCopy = {
  id: {
    checkoutLabel: "Checkout",
    paymentDetailFallback: "Detail Payment",
    intro: "Lengkapi data customer dan tanggal wisata untuk melanjutkan ke detail payment.",
    loginRequired: "Anda harus login terlebih dahulu sebelum bisa membuat booking dan melanjutkan pembayaran.",
    requiredName: "Nama",
    requiredEmail: "Email",
    requiredPhone: "Nomor Telepon",
    departureDate: "Tanggal keberangkatan",
    travelDate: "Tanggal wisata",
    departureDateRequired: "Tanggal keberangkatan wajib tersedia.",
    travelDateRequired: "Tanggal wisata wajib dipilih.",
    adultParticipants: "Peserta dewasa",
    childParticipants: "Peserta anak",
    nameRequired: "Nama wajib diisi.",
    emailRequired: "Email wajib diisi.",
    phoneRequired: "Nomor telepon wajib diisi.",
    minimumParticipantsMessage: "Minimal peserta untuk paket ini {count} orang. Total dewasa dan anak harus mencapai minimal tersebut sebelum booking bisa dilanjutkan.",
    participantProgress: "Total peserta saat ini: {current} / {minimum} orang",
    minimumBookingDate: "Booking paling cepat hanya bisa dibuat untuk tanggal {date} atau setelahnya.",
    fixedDepartureTooSoon: "Tanggal keberangkatan paket ini lebih cepat dari batas booking minimum H+3, sehingga booking belum bisa dilanjutkan hari ini.",
    paymentType: "Jenis pembayaran",
    fullPayment: "Full payment",
    fullPaymentHint: "Customer membayar penuh sekarang dan email akan membawa invoice PDF.",
    dpPayment: "DP 30%",
    dpPaymentHint: "Customer bayar DP dulu. Email konfirmasi dikirim tanpa invoice PDF, lalu sisa pembayaran wajib lunas maksimal H-3.",
    dpSummary: "Customer bayar DP {dpAmount} sekarang, lalu sisa pelunasan {remainingAmount} wajib lunas maksimal H-3 dari tanggal wisata.",
    paymentMethod: "Metode pembayaran",
    bankTransfer: "Bank transfer",
    bankTransferHint: "Cocok untuk VA / transfer bank dan biasanya jadi jalur paling umum.",
    qrisHint: "Untuk customer yang ingin scan QR dan bayar cepat dari aplikasi bank / e-wallet.",
    creditCard: "Kartu kredit",
    creditCardHint: "Fee customer biasanya lebih tinggi karena biaya channel kartu.",
    adminFee: "Admin fee",
    paymentMethodFootnote: "Total customer akan dihitung mengikuti metode yang Anda pilih di sini, lalu sistem hanya membuka channel pembayaran yang sesuai.",
    paymentSummary: "Ringkasan Payment",
    durationDays: "{count} hari",
    participantTotal: "{count} orang",
    selectedParticipants: "Total peserta dipilih",
    fixedDepartureHint: "Jadwal keberangkatan untuk paket ini sudah tetap dan mengikuti tanggal yang ditentukan merchant.",
    localizedNotice: "Harga, currency, email, dan invoice mengikuti bahasa yang Anda pilih. Pembayaran gateway tetap diproses dalam {currency}.{exchangeDate}",
    localizedExchangeDate: " Kurs acuan: {date}.",
    localizedSnapshot: "Nilai final booking akan dikunci saat checkout dibuat, jadi tidak berubah mengikuti kurs setelah booking tercatat.",
    packageSubtotal: "Subtotal paket ({currency})",
    paymentSubtotal: "Subtotal pembayaran ({currency})",
    adminFeeMethod: "Admin fee {method} ({percent}%)",
    tax: "Pajak ({percent}%)",
    payNow: "Bayar sekarang",
    gatewayProcessed: "Diproses payment gateway ({currency})",
    gatewayRemaining: "Sisa pelunasan gateway",
    loginForBooking: "Login untuk Booking",
    notBookableToday: "Belum bisa dibooking hari ini",
    minimumParticipantsShort: "Minimal {count} peserta",
    processing: "Memproses...",
    completeRequiredFields: "Lengkapi kolom wajib terlebih dahulu: {fields}.",
    chooseTravelDate: "Pilih tanggal wisata terlebih dahulu",
    bookingAvailableFrom: "Booking untuk paket ini hanya bisa dilakukan mulai {date}.",
    minimumParticipantsError: "Minimal peserta untuk paket ini {count} orang.",
    bookingCreationIssue: "Terjadi gangguan saat membuat booking",
  },
  en: {
    checkoutLabel: "Checkout",
    paymentDetailFallback: "Payment Details",
    intro: "Complete customer details and travel date to continue to payment details.",
    loginRequired: "Please log in first before creating a booking and continuing to payment.",
    requiredName: "Name",
    requiredEmail: "Email",
    requiredPhone: "Phone Number",
    departureDate: "Departure date",
    travelDate: "Travel date",
    departureDateRequired: "Departure date must be available.",
    travelDateRequired: "Travel date is required.",
    adultParticipants: "Adult participants",
    childParticipants: "Child participants",
    nameRequired: "Name is required.",
    emailRequired: "Email is required.",
    phoneRequired: "Phone number is required.",
    minimumParticipantsMessage: "This package requires at least {count} participants. The combined number of adults and children must reach that minimum before booking can continue.",
    participantProgress: "Current participants: {current} / {minimum} people",
    minimumBookingDate: "The earliest booking date available is {date} or later.",
    fixedDepartureTooSoon: "This package departure date is earlier than the minimum H+3 booking window, so booking cannot continue today.",
    paymentType: "Payment type",
    fullPayment: "Full payment",
    fullPaymentHint: "The customer pays in full now and the email will include the invoice PDF.",
    dpPayment: "DP 30%",
    dpPaymentHint: "The customer pays the deposit first. The confirmation email is sent without the invoice PDF, and the remaining balance must be settled by H-3.",
    dpSummary: "The customer pays {dpAmount} now, and the remaining balance of {remainingAmount} must be settled no later than H-3 before travel.",
    paymentMethod: "Payment method",
    bankTransfer: "Bank transfer",
    bankTransferHint: "Best for VA / bank transfer and usually the most common route.",
    qrisHint: "For customers who want to scan a QR and pay quickly from a banking or e-wallet app.",
    creditCard: "Credit card",
    creditCardHint: "Customer fees are usually higher because of card channel charges.",
    adminFee: "Admin fee",
    paymentMethodFootnote: "Customer totals are calculated based on the method selected here, and the system only opens matching payment channels.",
    paymentSummary: "Payment Summary",
    durationDays: "{count} days",
    participantTotal: "{count} people",
    selectedParticipants: "Selected participants",
    fixedDepartureHint: "The departure schedule for this package is fixed and follows the date set by the merchant.",
    localizedNotice: "Price, currency, email, and invoice follow the language you selected. The payment gateway still processes in {currency}.{exchangeDate}",
    localizedExchangeDate: " Reference rate date: {date}.",
    localizedSnapshot: "The final booking amount is locked when checkout is created, so it will not keep changing with later exchange-rate movement.",
    packageSubtotal: "Package subtotal ({currency})",
    paymentSubtotal: "Payment subtotal ({currency})",
    adminFeeMethod: "Admin fee {method} ({percent}%)",
    tax: "Tax ({percent}%)",
    payNow: "Pay now",
    gatewayProcessed: "Processed by payment gateway ({currency})",
    gatewayRemaining: "Gateway remaining balance",
    loginForBooking: "Log in to book",
    notBookableToday: "Not bookable today",
    minimumParticipantsShort: "Minimum {count} participants",
    processing: "Processing...",
    completeRequiredFields: "Please complete the required fields first: {fields}.",
    chooseTravelDate: "Please choose the travel date first",
    bookingAvailableFrom: "This package can only be booked starting from {date}.",
    minimumParticipantsError: "This package requires at least {count} participants.",
    bookingCreationIssue: "There was a problem while creating the booking",
  },
  zh: {
    checkoutLabel: "结账",
    paymentDetailFallback: "付款详情",
    intro: "请填写客户资料和出行日期，然后继续查看付款详情。",
    loginRequired: "请先登录，然后才能创建订单并继续付款。",
    requiredName: "姓名",
    requiredEmail: "邮箱",
    requiredPhone: "电话号码",
    departureDate: "出发日期",
    travelDate: "出行日期",
    departureDateRequired: "必须提供出发日期。",
    travelDateRequired: "请选择出行日期。",
    adultParticipants: "成人人数",
    childParticipants: "儿童人数",
    nameRequired: "姓名为必填项。",
    emailRequired: "邮箱为必填项。",
    phoneRequired: "电话号码为必填项。",
    minimumParticipantsMessage: "此套餐至少需要 {count} 位参加者。成人与儿童总人数达到该数量后才能继续预订。",
    participantProgress: "当前参加人数：{current} / {minimum} 人",
    minimumBookingDate: "最早可预订日期为 {date} 或之后。",
    fixedDepartureTooSoon: "此套餐的出发日期早于最短 H+3 预订窗口，因此今天无法继续预订。",
    paymentType: "付款方式",
    fullPayment: "全额付款",
    fullPaymentHint: "客户现在一次付清，邮件将附上发票 PDF。",
    dpPayment: "定金 30%",
    dpPaymentHint: "客户先支付定金。确认邮件不会附带发票 PDF，剩余款项必须在出行前 H-3 之前结清。",
    dpSummary: "客户现在支付 {dpAmount}，剩余 {remainingAmount} 必须最迟在出行前 H-3 结清。",
    paymentMethod: "支付渠道",
    bankTransfer: "银行转账",
    bankTransferHint: "适合 VA / 银行转账，也是最常用的支付路径。",
    qrisHint: "适合希望通过银行或电子钱包扫码快速付款的客户。",
    creditCard: "信用卡",
    creditCardHint: "由于卡支付通道费用，客户手续费通常更高。",
    adminFee: "手续费",
    paymentMethodFootnote: "客户总金额会根据这里选择的支付方式计算，系统也只会打开对应的支付渠道。",
    paymentSummary: "付款摘要",
    durationDays: "{count} 天",
    participantTotal: "{count} 人",
    selectedParticipants: "已选人数",
    fixedDepartureHint: "此套餐的出发日期已固定，并遵循商家设定的日期。",
    localizedNotice: "价格、货币、邮件和发票都会跟随您选择的语言显示。支付网关仍以 {currency} 处理。{exchangeDate}",
    localizedExchangeDate: " 汇率日期：{date}。",
    localizedSnapshot: "最终预订金额会在创建结账时锁定，因此不会在订单生成后继续随汇率波动而变化。",
    packageSubtotal: "套餐小计 ({currency})",
    paymentSubtotal: "付款小计 ({currency})",
    adminFeeMethod: "{method} 手续费 ({percent}%)",
    tax: "税费 ({percent}%)",
    payNow: "立即支付",
    gatewayProcessed: "支付网关处理金额 ({currency})",
    gatewayRemaining: "网关剩余尾款",
    loginForBooking: "登录后预订",
    notBookableToday: "今天暂时无法预订",
    minimumParticipantsShort: "至少 {count} 位参加者",
    processing: "处理中...",
    completeRequiredFields: "请先补全必填字段：{fields}。",
    chooseTravelDate: "请先选择出行日期",
    bookingAvailableFrom: "此套餐仅可从 {date} 开始预订。",
    minimumParticipantsError: "此套餐至少需要 {count} 位参加者。",
    bookingCreationIssue: "创建订单时出现问题",
  },
} satisfies Record<Locale, Record<string, string>>

function formatCopy(template: string, values: Record<string, string | number>) {
  return Object.entries(values).reduce(
    (result, [key, value]) => result.replaceAll(`{${key}}`, String(value)),
    template,
  )
}

type CheckoutPackageData = {
  id: string
  slug: string
  title: string | null
  departure_date: string | null
  price_adult: number | null
  price_child: number | null
  currency: string | null
  duration: number | null
  minimal_peserta: number | null
  travel_style: string | null
  cover_image: string | null
}

type CheckoutFinanceSettings = {
  customerTaxPercent: number
  customerAdminFeeRules: Record<FinancePaymentMethod, number>
}

type CheckoutPaymentPricing = {
  currency: string
  adultPrice: number
  childPrice: number
  exchangeDate: string | null
}

export default function CheckoutClient({
  data,
  locale = "id",
  financeSettings,
  paymentPricing,
}: {
  data: CheckoutPackageData
  locale?: Locale
  financeSettings: CheckoutFinanceSettings
  paymentPricing: CheckoutPaymentPricing
}) {
  const supabase = createClient()
  const router = useRouter()
  const t = dictionaries[locale].checkout
  const ui = checkoutUiCopy[locale]
  const participantLabel = getScheduleQuotaLabel(data.travel_style, locale)
  const usesFixedDeparture = isQuotaTravelStyle(data.travel_style)
  const minimumBookingDate = getMinimumBookingDate()
  const fixedDepartureDate = data.departure_date || ""

  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [checkingSession, setCheckingSession] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState("")
  const [showValidation, setShowValidation] = useState(false)

  const [nama, setNama] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [pickupDate, setPickupDate] = useState("")
  const [adultCount, setAdultCount] = useState(1)
  const [childCount, setChildCount] = useState(0)
  const [paymentMethod, setPaymentMethod] = useState<FinancePaymentMethod>("bank_transfer")
  const [paymentType, setPaymentType] = useState<"dp" | "full">("full")
  const minimumParticipants = Math.max(Number(data.minimal_peserta || 0), 1)
  const totalParticipants = adultCount + childCount
  const hasMetMinimumParticipants = totalParticipants >= minimumParticipants

  const adultPrice = data.price_adult ?? 0
  const childPrice = data.price_child ?? 0
  const localizedSubtotal = useMemo(
    () => adultPrice * adultCount + childPrice * childCount,
    [adultCount, adultPrice, childCount, childPrice],
  )
  const paymentAdultPrice = paymentPricing.adultPrice ?? 0
  const paymentChildPrice = paymentPricing.childPrice ?? 0
  const subtotal = useMemo(
    () => paymentAdultPrice * adultCount + paymentChildPrice * childCount,
    [adultCount, childCount, paymentAdultPrice, paymentChildPrice],
  )
  const customerAdminFeePercent = resolveCustomerAdminFeePercent(paymentMethod, {
    redfengCommissionPercent: 0,
    customerAdminFeePercent: 0,
    customerTaxPercent: financeSettings.customerTaxPercent,
    merchantTransferFee: 0,
    customerAdminFeeRules: financeSettings.customerAdminFeeRules,
    merchantTransferFeeRules: { default: 0 },
  })
  const adminFee = Math.round(subtotal * (customerAdminFeePercent / 100))
  const ppn = Math.round((subtotal + adminFee) * (financeSettings.customerTaxPercent / 100))
  const total = subtotal + adminFee + ppn
  const dpAmount = Math.round(total * 0.3)
  const remainingAmount = Math.max(total - dpAmount, 0)
  const localizedAdminFee = Math.round(localizedSubtotal * (customerAdminFeePercent / 100))
  const localizedTax = Math.round(
    (localizedSubtotal + localizedAdminFee) * (financeSettings.customerTaxPercent / 100),
  )
  const localizedTotal = localizedSubtotal + localizedAdminFee + localizedTax
  const localizedDpAmount = Math.round(localizedTotal * 0.3)
  const localizedRemainingAmount = Math.max(localizedTotal - localizedDpAmount, 0)
  const allPaymentMethodOptions: Array<{ value: FinancePaymentMethod; label: string; hint: string }> = [
    {
      value: "bank_transfer",
      label: "Bank transfer",
      hint: "Cocok untuk VA / transfer bank dan biasanya jadi jalur paling umum.",
    },
    {
      value: "qris",
      label: "QRIS",
      hint: "Untuk customer yang ingin scan QR dan bayar cepat dari aplikasi bank / e-wallet.",
    },
    {
      value: "credit_card",
      label: "Kartu kredit",
      hint: "Fee customer biasanya lebih tinggi karena biaya channel kartu.",
    },
  ]
  const paymentMethodOptions = allPaymentMethodOptions.filter((option) =>
    activeCustomerPaymentMethods.includes(option.value),
  ).map((option) => {
    if (option.value === "bank_transfer") {
      return { ...option, label: ui.bankTransfer, hint: ui.bankTransferHint }
    }
    if (option.value === "credit_card") {
      return { ...option, label: ui.creditCard, hint: ui.creditCardHint }
    }
    return { ...option, hint: ui.qrisHint }
  })
  useEffect(() => {
    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      setIsAuthenticated(Boolean(session?.user))
      setCheckingSession(false)

      if (session?.user?.email) {
        setEmail(session.user.email)
      }

      const fullName = (session?.user?.user_metadata?.full_name as string | undefined) || ""
      const phoneNumber = (session?.user?.user_metadata?.phone_number as string | undefined) || ""
      if (fullName) {
        setNama(fullName)
      }
      if (phoneNumber) {
        setPhone(phoneNumber)
      }
    }

    checkSession()
  }, [supabase])

  const effectivePickupDate = usesFixedDeparture ? fixedDepartureDate : pickupDate
  const fixedDepartureTooSoon = usesFixedDeparture && Boolean(fixedDepartureDate) && fixedDepartureDate < minimumBookingDate
  const primaryButtonLabel =
    !checkingSession && !isAuthenticated
      ? ui.loginForBooking
      : fixedDepartureTooSoon
        ? ui.notBookableToday
        : !hasMetMinimumParticipants
          ? formatCopy(ui.minimumParticipantsShort, { count: minimumParticipants })
          : submitting
            ? ui.processing
            : t.createBookingPay
  const trimmedNama = nama.trim()
  const trimmedEmail = email.trim()
  const trimmedPhone = phone.trim()
  const missingRequiredFields = [
    !trimmedNama ? ui.requiredName : null,
    !trimmedEmail ? ui.requiredEmail : null,
    !trimmedPhone ? ui.requiredPhone : null,
    !effectivePickupDate ? (usesFixedDeparture ? ui.departureDate : ui.travelDate) : null,
  ].filter(Boolean) as string[]
  const minimumParticipantsMessage =
    minimumParticipants > 1
      ? formatCopy(ui.minimumParticipantsMessage, { count: minimumParticipants })
      : ""

  const handleBooking = async () => {
    setShowValidation(true)

    if (!isAuthenticated) {
      router.push(`/login?next=${encodeURIComponent(`/checkout/${data.slug}`)}`)
      return
    }

    if (missingRequiredFields.length > 0) {
      setErrorMsg(formatCopy(ui.completeRequiredFields, { fields: missingRequiredFields.join(", ") }))
      return
    }

    if (!effectivePickupDate) {
      setErrorMsg(ui.chooseTravelDate)
      return
    }

    if (fixedDepartureTooSoon) {
      setErrorMsg(formatCopy(ui.bookingAvailableFrom, { date: minimumBookingDate }))
      return
    }

    if (!hasMetMinimumParticipants) {
      setErrorMsg(formatCopy(ui.minimumParticipantsError, { count: minimumParticipants }))
      return
    }

    setSubmitting(true)
    setErrorMsg("")

    try {
      const bookingRes = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          package_id: data.id,
          locale,
          pickup_date: effectivePickupDate,
          adult_count: adultCount,
          child_count: childCount,
          customer_name: nama,
          customer_email: email,
          customer_phone: phone,
          payment_method: resolveActiveCustomerPaymentMethod(paymentMethod),
          payment_type: paymentType,
        }),
      })

      const bookingPayload = await bookingRes.json()

      if (!bookingRes.ok || !bookingPayload.booking_id) {
        setErrorMsg(bookingPayload.error || t.saveBookingFailed)
        setSubmitting(false)
        return
      }

      router.push(`/booking/${bookingPayload.booking_id}/participants`)
    } catch {
      setErrorMsg(ui.bookingCreationIssue)
      setSubmitting(false)
    }
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)] p-4 pb-36 sm:p-6 sm:pb-36 md:p-10 md:pb-10">
      <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm sm:rounded-[28px] sm:p-6 md:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-orange-500">{ui.checkoutLabel}</p>
          <h1 className="mt-3 text-[28px] font-bold text-slate-900 sm:text-3xl">{data.title || ui.paymentDetailFallback}</h1>
          <p className="mt-2 text-sm text-slate-500">
            {ui.intro}
          </p>

          {!checkingSession && !isAuthenticated && (
            <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              {ui.loginRequired}
            </div>
          )}

          {errorMsg && (
            <div className="mt-6 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
              {errorMsg}
            </div>
          )}

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">{t.name}</label>
              <input
                value={nama}
                onChange={(event) => setNama(event.target.value)}
                className={`w-full rounded-2xl border px-4 py-3 text-sm outline-none ring-orange-500 transition focus:ring-2 ${
                  showValidation && !trimmedNama ? "border-rose-300 bg-rose-50" : "border-slate-300"
                }`}
              />
              {showValidation && !trimmedNama ? (
                <p className="mt-2 text-xs text-rose-600">{ui.nameRequired}</p>
              ) : null}
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">{t.email}</label>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className={`w-full rounded-2xl border px-4 py-3 text-sm outline-none ring-orange-500 transition focus:ring-2 ${
                  showValidation && !trimmedEmail ? "border-rose-300 bg-rose-50" : "border-slate-300"
                }`}
              />
              {showValidation && !trimmedEmail ? (
                <p className="mt-2 text-xs text-rose-600">{ui.emailRequired}</p>
              ) : null}
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">{t.phone}</label>
              <input
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                className={`w-full rounded-2xl border px-4 py-3 text-sm outline-none ring-orange-500 transition focus:ring-2 ${
                  showValidation && !trimmedPhone ? "border-rose-300 bg-rose-50" : "border-slate-300"
                }`}
              />
              {showValidation && !trimmedPhone ? (
                <p className="mt-2 text-xs text-rose-600">{ui.phoneRequired}</p>
              ) : null}
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                  {usesFixedDeparture ? ui.departureDate : ui.travelDate}
              </label>
              <input
                type="date"
                value={effectivePickupDate}
                onChange={(event) => setPickupDate(event.target.value)}
                className={`w-full rounded-2xl border px-4 py-3 text-sm outline-none ring-orange-500 transition focus:ring-2 ${
                  showValidation && !effectivePickupDate ? "border-rose-300 bg-rose-50" : "border-slate-300"
                }`}
                min={usesFixedDeparture && fixedDepartureDate ? fixedDepartureDate : minimumBookingDate}
                max={usesFixedDeparture && fixedDepartureDate ? fixedDepartureDate : undefined}
                readOnly={usesFixedDeparture}
              />
              {usesFixedDeparture && (
                <p className="mt-2 text-xs text-slate-500">
                  {ui.fixedDepartureHint}
                </p>
              )}
              {showValidation && !effectivePickupDate ? (
                <p className="mt-2 text-xs text-rose-600">
                    {usesFixedDeparture ? ui.departureDateRequired : ui.travelDateRequired}
                </p>
              ) : null}
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">{ui.adultParticipants}</label>
              <input
                type="number"
                min="1"
                value={adultCount}
                onChange={(event) => setAdultCount(Math.max(Number(event.target.value) || 1, 1))}
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none ring-orange-500 transition focus:ring-2"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">{ui.childParticipants}</label>
              <input
                type="number"
                min="0"
                value={childCount}
                onChange={(event) => setChildCount(Math.max(Number(event.target.value) || 0, 0))}
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none ring-orange-500 transition focus:ring-2"
              />
            </div>
          </div>

          {minimumParticipantsMessage ? (
            <div
              className={`mt-4 rounded-2xl border px-4 py-3 text-sm ${
                hasMetMinimumParticipants
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-amber-200 bg-amber-50 text-amber-800"
              }`}
            >
              <p>{minimumParticipantsMessage}</p>
              <p className="mt-1 font-semibold">
                {formatCopy(ui.participantProgress, {
                  current: totalParticipants,
                  minimum: minimumParticipants,
                })}
              </p>
            </div>
          ) : null}

          <div className="mt-4 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm leading-7 text-sky-800">
            {formatCopy(ui.minimumBookingDate, { date: minimumBookingDate }).split(minimumBookingDate)[0]}
            <span className="font-semibold">{minimumBookingDate}</span>
            {formatCopy(ui.minimumBookingDate, { date: minimumBookingDate }).split(minimumBookingDate)[1]}
          </div>

          {fixedDepartureTooSoon ? (
            <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-7 text-rose-700">
              {ui.fixedDepartureTooSoon}
            </div>
          ) : null}

          <div className="mt-6">
            <label className="mb-3 block text-sm font-medium text-slate-700">{ui.paymentType}</label>
            <div className="grid gap-3 md:grid-cols-2">
              <label
                className={`cursor-pointer rounded-2xl border px-4 py-4 transition ${
                  paymentType === "full"
                    ? "border-orange-300 bg-orange-50"
                    : "border-slate-200 bg-slate-50 hover:border-orange-200"
                }`}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                  <div>
                     <p className="text-sm font-semibold text-slate-900">{ui.fullPayment}</p>
                     <p className="mt-1 text-xs leading-6 text-slate-500">
                      {ui.fullPaymentHint}
                     </p>
                  </div>
                     <p className="text-sm font-semibold text-slate-900">
                       {formatPackageMoney(localizedTotal, data.currency, locale)}
                     </p>
                </div>
                <input
                  type="radio"
                  name="payment_type"
                  value="full"
                  checked={paymentType === "full"}
                  onChange={() => setPaymentType("full")}
                  className="sr-only"
                />
              </label>
              <label
                className={`cursor-pointer rounded-2xl border px-4 py-4 transition ${
                  paymentType === "dp"
                    ? "border-orange-300 bg-orange-50"
                    : "border-slate-200 bg-slate-50 hover:border-orange-200"
                }`}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                  <div>
                     <p className="text-sm font-semibold text-slate-900">{ui.dpPayment}</p>
                     <p className="mt-1 text-xs leading-6 text-slate-500">
                      {ui.dpPaymentHint}
                     </p>
                  </div>
                     <p className="text-sm font-semibold text-slate-900">
                       {formatPackageMoney(localizedDpAmount, data.currency, locale)}
                     </p>
                </div>
                <input
                  type="radio"
                  name="payment_type"
                  value="dp"
                  checked={paymentType === "dp"}
                  onChange={() => setPaymentType("dp")}
                  className="sr-only"
                />
              </label>
            </div>
            {paymentType === "dp" ? (
              <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                 {formatCopy(ui.dpSummary, {
                   dpAmount: formatPackageMoney(localizedDpAmount, data.currency, locale),
                   remainingAmount: formatPackageMoney(localizedRemainingAmount, data.currency, locale),
                 })}
              </div>
            ) : null}
          </div>

          <div className="mt-6">
            <label className="mb-3 block text-sm font-medium text-slate-700">{ui.paymentMethod}</label>
            <div className="grid gap-3">
              {paymentMethodOptions.map((option) => {
                const optionFeePercent = resolveCustomerAdminFeePercent(option.value, {
                  redfengCommissionPercent: 0,
                  customerAdminFeePercent: 0,
                  customerTaxPercent: financeSettings.customerTaxPercent,
                  merchantTransferFee: 0,
                  customerAdminFeeRules: financeSettings.customerAdminFeeRules,
                  merchantTransferFeeRules: { default: 0 },
                })

                return (
                  <label
                    key={option.value}
                    className={`cursor-pointer rounded-2xl border px-4 py-4 transition ${
                      paymentMethod === option.value
                        ? "border-orange-300 bg-orange-50"
                        : "border-slate-200 bg-slate-50 hover:border-orange-200"
                    }`}
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{option.label}</p>
                        <p className="mt-1 text-xs leading-6 text-slate-500">{option.hint}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs uppercase tracking-[0.18em] text-slate-400">{ui.adminFee}</p>
                        <p className="mt-1 text-sm font-semibold text-slate-900">{optionFeePercent}%</p>
                      </div>
                    </div>
                    <input
                      type="radio"
                      name="payment_method"
                      value={option.value}
                      checked={paymentMethod === option.value}
                      onChange={() => setPaymentMethod(option.value)}
                      className="sr-only"
                    />
                  </label>
                )
              })}
            </div>
            <p className="mt-3 text-xs leading-6 text-slate-500">
              {ui.paymentMethodFootnote}
            </p>
          </div>
        </section>

        <aside className="space-y-6 lg:sticky lg:top-6 lg:h-fit">
          <section className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm sm:rounded-[28px]">
            {data.cover_image ? (
              <Image
                src={data.cover_image}
                alt={data.title || ui.paymentDetailFallback}
                width={1200}
                height={800}
                unoptimized
                className="h-48 w-full object-cover sm:h-56"
              />
            ) : (
              <div className="h-48 bg-slate-100 sm:h-56" />
            )}
            <div className="p-4 sm:p-6">
              <h2 className="text-xl font-semibold text-slate-900">{ui.paymentSummary}</h2>
              <div className="mt-4 space-y-3 text-sm text-slate-600">
                <div className="flex items-center justify-between">
                  <span>Harga dewasa</span>
                  <span className="font-semibold text-slate-900">{formatPackageMoney(adultPrice, data.currency, locale)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Harga anak</span>
                  <span className="font-semibold text-slate-900">{formatPackageMoney(childPrice, data.currency, locale)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Durasi</span>
                    <span className="font-semibold text-slate-900">
                      {formatCopy(ui.durationDays, { count: data.duration || 0 })}
                    </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>{participantLabel} total</span>
                    <span className="font-semibold text-slate-900">
                      {formatCopy(ui.participantTotal, { count: data.minimal_peserta || 0 })}
                    </span>
                </div>
                <div className="flex items-center justify-between">
                    <span>{ui.selectedParticipants}</span>
                  <span className={`font-semibold ${hasMetMinimumParticipants ? "text-emerald-700" : "text-rose-700"}`}>
                    {formatCopy(ui.participantTotal, { count: totalParticipants })}
                  </span>
                </div>
                {usesFixedDeparture && data.departure_date && (
                  <div className="flex items-center justify-between">
                    <span>{ui.departureDate}</span>
                    <span className="font-semibold text-slate-900">{data.departure_date}</span>
                  </div>
                )}
                <div className="border-t border-slate-200 pt-3">
                  <div className="mb-3 rounded-xl border border-blue-100 bg-blue-50 p-3 text-xs text-blue-800">
                     {formatCopy(ui.localizedNotice, {
                       currency: paymentPricing.currency,
                       exchangeDate: paymentPricing.exchangeDate
                         ? formatCopy(ui.localizedExchangeDate, { date: paymentPricing.exchangeDate })
                         : "",
                     })}
                     <p className="mt-2">{ui.localizedSnapshot}</p>
                  </div>
                  <div className="flex items-center justify-between">
                     <span>{formatCopy(ui.packageSubtotal, { currency: data.currency || "IDR" })}</span>
                    <span className="font-semibold text-slate-900">{formatPackageMoney(localizedSubtotal, data.currency, locale)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                     <span>{formatCopy(ui.paymentSubtotal, { currency: data.currency || "IDR" })}</span>
                     <span className="font-semibold text-slate-900">
                       {formatPackageMoney(localizedSubtotal, data.currency, locale)}
                     </span>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                     <span>
                       {formatCopy(ui.adminFeeMethod, {
                         method:
                           paymentMethod === "credit_card"
                             ? ui.creditCard
                             : paymentMethod === "qris"
                               ? "QRIS"
                               : ui.bankTransfer.toLowerCase(),
                         percent: customerAdminFeePercent,
                       })}
                     </span>
                     <span className="font-semibold text-slate-900">
                       {formatPackageMoney(localizedAdminFee, data.currency, locale)}
                     </span>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                     <span>{formatCopy(ui.tax, { percent: financeSettings.customerTaxPercent })}</span>
                     <span className="font-semibold text-slate-900">
                       {formatPackageMoney(localizedTax, data.currency, locale)}
                     </span>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-base font-bold text-slate-900">
                     <span>{paymentType === "dp" ? ui.payNow : t.totalPay}</span>
                     <span>
                       {formatPackageMoney(
                         paymentType === "dp" ? localizedDpAmount : localizedTotal,
                         data.currency,
                         locale,
                       )}
                     </span>
                   </div>
                   {paymentType === "dp" ? (
                     <div className="mt-2 flex items-center justify-between text-sm text-slate-600">
                        <span>
                          {locale === "id"
                            ? "Sisa pelunasan"
                            : locale === "en"
                              ? "Remaining final payment"
                              : "剩余尾款"}
                        </span>
                       <span className="font-semibold text-slate-900">
                         {formatPackageMoney(localizedRemainingAmount, data.currency, locale)}
                       </span>
                     </div>
                   ) : null}
                   <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
                     <div className="flex items-center justify-between gap-4">
                       <span>{formatCopy(ui.gatewayProcessed, { currency: paymentPricing.currency })}</span>
                       <span className="font-semibold text-slate-900">
                         {formatIdrMoney(paymentType === "dp" ? dpAmount : total)}
                       </span>
                     </div>
                     {paymentType === "dp" ? (
                       <div className="mt-2 flex items-center justify-between gap-4">
                         <span>{ui.gatewayRemaining}</span>
                         <span className="font-semibold text-slate-900">
                           {formatIdrMoney(remainingAmount)}
                         </span>
                       </div>
                     ) : null}
                   </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleBooking}
                disabled={submitting || !hasMetMinimumParticipants || fixedDepartureTooSoon}
                className="mt-6 hidden w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300 lg:block"
              >
                {primaryButtonLabel}
              </button>
            </div>
          </section>
        </aside>
      </div>
      <div className="fixed inset-x-0 bottom-0 z-[85] border-t border-slate-200/80 bg-white/95 px-4 pb-[calc(env(safe-area-inset-bottom)+10px)] pt-3 shadow-[0_-20px_45px_-30px_rgba(15,23,42,0.35)] backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-xl items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
              {paymentType === "dp" ? ui.payNow : t.totalPay}
            </p>
            <p className="mt-1 truncate text-lg font-bold text-slate-950">
              {formatPackageMoney(
                paymentType === "dp" ? localizedDpAmount : localizedTotal,
                data.currency,
                locale,
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={handleBooking}
            disabled={submitting || !hasMetMinimumParticipants || fixedDepartureTooSoon}
            className="shrink-0 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {primaryButtonLabel}
          </button>
        </div>
      </div>
    </main>
  )
}
