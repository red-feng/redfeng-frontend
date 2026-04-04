import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { createClient as createServerClient } from "@/lib/supabase/server"
import { getRequiredEnv } from "@/lib/env"
import { getMidtransTransactionStatus } from "@/lib/refunds/midtrans"
import { formatMerchantCode } from "@/lib/merchant-code"
import { sendCustomerPaymentEmail } from "@/lib/payments/customerEmails"
import { deleteDraftBooking, isDraftBookingDeletable } from "@/lib/bookings/draft-cleanup"
import { formatFinalPaymentDueLabel } from "@/lib/booking/final-payment-deadline"
import { queueBookingToFinance } from "@/lib/payouts/finance-handoff"
import { normalizeLocale, type Locale } from "@/lib/i18n"
import { resolvePackageTranslation } from "@/lib/package-pricing"

function resolveOrder(orderId: string) {
  const match = orderId.match(/^(.*?)-(dp|full)(?:-.+)?$/i)
  if (match) {
    return {
      bookingCode: match[1],
      paymentType: match[2].toLowerCase(),
    }
  }

  return {
    bookingCode: orderId,
    paymentType: null as string | null,
  }
}

function normalizeStatus(value: string | null | undefined) {
  return String(value || "").trim().toLowerCase()
}

function isSuccessfulMidtransStatus(status: string | null | undefined) {
  return ["settlement", "capture"].includes(normalizeStatus(status))
}

function isPendingMidtransStatus(status: string | null | undefined) {
  return ["pending", "authorize"].includes(normalizeStatus(status))
}

function formatDateLabel(value: string | null, locale: Locale) {
  if (!value) return "-"
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  const localeCode = locale === "en" ? "en-US" : locale === "zh" ? "zh-CN" : "id-ID"
  return parsed.toLocaleDateString(localeCode, {
    day: "2-digit",
    month: "long",
    year: "numeric",
  })
}

function inferCustomerLocaleFromBooking(input: { customer_locale?: string | null; display_currency?: string | null }) {
  if (input.customer_locale === "en" || input.customer_locale === "zh" || input.customer_locale === "id") {
    return input.customer_locale
  }
  const currency = String(input.display_currency || "").trim().toUpperCase()
  if (currency === "USD") return "en"
  if (currency === "CNY" || currency === "RMB") return "zh"
  return "id"
}

function calculateLocalizedDisplayBreakdown(input: {
  displaySubtotalAmount?: number | null
  displayCurrency?: string | null
  adminFeePercent?: number | null
  taxPercent?: number | null
}) {
  const subtotalAmount = Math.max(Number(input.displaySubtotalAmount || 0), 0)
  const adminFeePercent = Math.max(Number(input.adminFeePercent || 0), 0)
  const taxPercent = Math.max(Number(input.taxPercent || 0), 0)
  const adminFeeAmount = Math.round(subtotalAmount * (adminFeePercent / 100))
  const taxAmount = Math.round((subtotalAmount + adminFeeAmount) * (taxPercent / 100))
  return {
    currency: String(input.displayCurrency || "IDR").trim().toUpperCase(),
    subtotalAmount,
    adminFeeAmount,
    taxAmount,
    totalAmount: subtotalAmount + adminFeeAmount + taxAmount,
  }
}

function paymentSyncCopy(locale: Locale) {
  if (locale === "en") {
    return {
      loginRequired: "Please log in first.",
      bookingNotFound: "Booking not found.",
      notOwner: "This booking does not belong to your account.",
      midtransUnavailable: "Midtrans transaction status is not available yet.",
      serverError: "Server error.",
    }
  }
  if (locale === "zh") {
    return {
      loginRequired: "请先登录。",
      bookingNotFound: "未找到订单。",
      notOwner: "该订单不属于您的账号。",
      midtransUnavailable: "Midtrans 交易状态暂时不可用。",
      serverError: "服务器错误。",
    }
  }
  return {
    loginRequired: "Silakan login terlebih dahulu",
    bookingNotFound: "Booking tidak ditemukan",
    notOwner: "Booking ini bukan milik akun Anda",
    midtransUnavailable: "Status transaksi Midtrans belum tersedia",
    serverError: "Server error",
  }
}

export async function POST(req: Request) {
  let activeLocale: Locale = "id"
  try {
    const { booking_id, order_id, locale } = await req.json()
    activeLocale = normalizeLocale(locale)
    const t = paymentSyncCopy(activeLocale)
    const authSupabase = await createServerClient()
    const {
      data: { user },
    } = await authSupabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: t.loginRequired }, { status: 401 })
    }

    const supabase = createClient(
      getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
      getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY"),
    )

    const { data: booking } = await supabase
      .from("bookings")
      .select(
        "id, package_id, booking_code, customer_name, customer_email, pickup_date, total_amount, dp_amount, subtotal_amount, customer_admin_fee_amount, customer_tax_amount, customer_admin_fee_percent, customer_tax_percent, final_payment_amount, payment_type, payment_status, booking_status, escrow_status, merchant_arrived_at, customer_picked_up_at, merchant_picked_up_at, display_currency, display_subtotal_amount, customer_locale",
      )
      .eq("id", booking_id)
      .maybeSingle()

    if (!booking) {
      return NextResponse.json({ error: t.bookingNotFound }, { status: 404 })
    }

    const bookingOwnerEmail = String(booking.customer_email || "").trim().toLowerCase()
    const signedInEmail = String(user.email || "").trim().toLowerCase()

    if (bookingOwnerEmail && signedInEmail && bookingOwnerEmail !== signedInEmail) {
      return NextResponse.json({ error: t.notOwner }, { status: 403 })
    }

    const statusResponse = (await getMidtransTransactionStatus(String(order_id || booking.booking_code || booking.id))) as {
      transaction_status?: string | null
      payment_type?: string | null
      order_id?: string | null
    }

    const transactionStatus = String(statusResponse?.transaction_status || "").trim().toLowerCase()
    const gatewayPaymentMethod = String(statusResponse?.payment_type || "").trim() || null
    const resolvedOrderId = String(statusResponse?.order_id || order_id || "").trim()

    if (!resolvedOrderId || !transactionStatus) {
      return NextResponse.json({ error: t.midtransUnavailable }, { status: 409 })
    }

    await supabase
      .from("payments")
      .update({
        transaction_status: transactionStatus,
        gateway_payment_method: gatewayPaymentMethod,
      })
      .eq("booking_id", booking.id)
      .eq("order_id", resolvedOrderId)

    if (isSuccessfulMidtransStatus(transactionStatus)) {
      const { paymentType } = resolveOrder(resolvedOrderId)
      const resolvedPaymentType = paymentType || booking.payment_type || "full"
      const nextPaymentStatus = resolvedPaymentType === "dp" ? "dp_paid" : "paid"
      const shouldSendEmail = normalizeStatus(booking.payment_status) !== nextPaymentStatus
      const bookingPatch =
        resolvedPaymentType === "dp"
          ? {
              payment_status: "dp_paid",
              booking_status: "awaiting_final_payment",
              escrow_status: "partial_hold",
            }
          : (() => {
              if (booking.merchant_picked_up_at) {
                return {
                  payment_status: "paid",
                  booking_status: "awaiting_admin_handoff",
                  escrow_status: "awaiting_admin_handoff",
                }
              }

              if (booking.customer_picked_up_at) {
                return {
                  payment_status: "paid",
                  booking_status: "customer_picked_up",
                  escrow_status: "held",
                }
              }

              if (booking.merchant_arrived_at) {
                return {
                  payment_status: "paid",
                  booking_status: "merchant_arrived",
                  escrow_status: "held",
                }
              }

              return {
                payment_status: "paid",
                booking_status: "confirmed",
                escrow_status: "held",
              }
            })()

      await supabase
        .from("bookings")
        .update({
          ...bookingPatch,
          gateway_payment_method: gatewayPaymentMethod,
        })
        .eq("id", booking.id)

      if (resolvedPaymentType !== "dp") {
        const queueResult = await queueBookingToFinance({
          adminSupabase: supabase,
          bookingId: booking.id,
          source: "payment_settlement_auto",
        })

        if (!queueResult.ok && queueResult.error !== "Booking belum siap masuk queue finance") {
          console.error("AUTO FINANCE QUEUE ERROR (sync):", queueResult.error)
        }
      }

      const { data: siblingDrafts } = await supabase
        .from("bookings")
        .select("id, payment_status, booking_status")
        .eq("customer_email", booking.customer_email)
        .eq("package_id", booking.package_id)
        .eq("pickup_date", booking.pickup_date)
        .neq("id", booking.id)

      for (const siblingDraft of siblingDrafts || []) {
        if (isDraftBookingDeletable(siblingDraft)) {
          await deleteDraftBooking(supabase, siblingDraft.id)
        }
      }

      if (shouldSendEmail) {
        const amountPaid =
          resolvedPaymentType === "dp"
            ? Number(booking.dp_amount || 0)
            : normalizeStatus(booking.payment_status) === "dp_paid"
              ? Number(booking.final_payment_amount || 0)
              : Number(booking.total_amount || 0)
        const paymentTypeLabel =
          resolvedPaymentType === "dp"
            ? "DP Payment"
            : normalizeStatus(booking.payment_status) === "dp_paid"
              ? "Final Payment"
              : "Full Payment"
        const paymentStatusLabel =
          resolvedPaymentType === "dp"
            ? "DP Paid"
            : normalizeStatus(booking.payment_status) === "dp_paid"
              ? "Final Payment Settled"
              : "Fully Paid"
        const settlementDueLabel =
          resolvedPaymentType === "dp" ? formatFinalPaymentDueLabel(booking.pickup_date || null) : null
        const localizedDisplay = calculateLocalizedDisplayBreakdown({
          displaySubtotalAmount: booking.display_subtotal_amount,
          displayCurrency: booking.display_currency,
          adminFeePercent: booking.customer_admin_fee_percent,
          taxPercent: booking.customer_tax_percent,
        })
        const localizedPaidRatio = Number(booking.total_amount || 0) > 0 ? amountPaid / Number(booking.total_amount || 0) : 0
        const localizedPaidAmount = Math.round(localizedDisplay.totalAmount * localizedPaidRatio)
        const invoiceSubtotalAmount =
          resolvedPaymentType === "dp"
            ? localizedPaidAmount
            : normalizeStatus(booking.payment_status) === "dp_paid"
              ? localizedPaidAmount
              : localizedDisplay.subtotalAmount
        const invoiceAdminFeeAmount =
          resolvedPaymentType === "dp"
            ? 0
            : normalizeStatus(booking.payment_status) === "dp_paid"
              ? 0
              : localizedDisplay.adminFeeAmount
        const invoiceTaxAmount =
          resolvedPaymentType === "dp"
            ? 0
            : normalizeStatus(booking.payment_status) === "dp_paid"
              ? 0
              : localizedDisplay.taxAmount
        const invoiceTotalAmount =
          resolvedPaymentType === "dp"
            ? localizedPaidAmount
            : normalizeStatus(booking.payment_status) === "dp_paid"
              ? localizedPaidAmount
              : localizedDisplay.totalAmount
        const verificationUrl = `https://app.redfeng.co/verifikasi-invoice/?booking_id=${encodeURIComponent(booking.booking_code || booking.id)}`
        const { data: packageRow } = booking.package_id
          ? await supabase.from("packages").select("title, merchant_id").eq("id", booking.package_id).maybeSingle()
          : { data: null as { title?: string | null; merchant_id?: string | null } | null }
        const { data: merchantRow } = packageRow?.merchant_id
          ? await supabase
              .from("merchants")
              .select("brand_name, company_name")
              .eq("id", packageRow.merchant_id)
              .maybeSingle()
          : { data: null as { brand_name?: string | null; company_name?: string | null } | null }

        try {
          const emailLocale = normalizeLocale(locale || booking.customer_locale || inferCustomerLocaleFromBooking(booking))
          const { data: localizedPackageRow } = booking.package_id
            ? await supabase
                .from("packages")
                .select("title, merchant_id, default_language, published_languages, package_translations(language_code, title)")
                .eq("id", booking.package_id)
                .maybeSingle()
            : {
                data: null as {
                  title?: string | null
                  merchant_id?: string | null
                  default_language?: string | null
                  published_languages?: string[] | null
                  package_translations?: Array<{ language_code?: string | null; title?: string | null }> | null
                } | null,
              }
          const localizedTranslation = resolvePackageTranslation(
            localizedPackageRow?.package_translations,
            emailLocale,
            localizedPackageRow?.default_language,
            localizedPackageRow?.published_languages,
          )
          await sendCustomerPaymentEmail({
            bookingCode: booking.booking_code || booking.id,
            customerName: booking.customer_name || null,
            customerEmail: booking.customer_email || null,
            locale: emailLocale,
            packageTitle: localizedTranslation?.title?.trim() || localizedPackageRow?.title || packageRow?.title || null,
            pickupDateLabel: formatDateLabel(booking.pickup_date || null, emailLocale),
            merchantName: merchantRow?.brand_name || merchantRow?.company_name || null,
            merchantCode: packageRow?.merchant_id ? formatMerchantCode(packageRow.merchant_id) : null,
            verificationUrl,
            currency: localizedDisplay.currency,
            totalAmount: invoiceTotalAmount,
            subtotalAmount: invoiceSubtotalAmount,
            adminFeeAmount: invoiceAdminFeeAmount,
            taxAmount: invoiceTaxAmount,
            finalPaymentAmount: Number(booking.final_payment_amount || 0),
            paymentTypeLabel,
            paymentStatusLabel,
            sendInvoicePdf: resolvedPaymentType !== "dp",
            settlementDueLabel,
          })
        } catch (emailError) {
          console.error("Failed to send payment email from sync route:", emailError)
        }
      }
    }

    if (isPendingMidtransStatus(transactionStatus)) {
      await supabase
        .from("bookings")
        .update({
          payment_status: "pending",
          gateway_payment_method: gatewayPaymentMethod,
        })
        .eq("id", booking.id)
    }

    return NextResponse.json({ ok: true, transaction_status: transactionStatus })
  } catch (error) {
    console.error(error)
    const t = paymentSyncCopy(activeLocale)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : t.serverError },
      { status: 500 },
    )
  }
}
