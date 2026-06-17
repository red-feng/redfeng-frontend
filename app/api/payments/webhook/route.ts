import { NextResponse } from "next/server"
import crypto from "crypto"
import { createClient } from "@supabase/supabase-js"
import type { SupabaseClient } from "@supabase/supabase-js"
import { getRequiredEnv } from "@/lib/env"
import { formatBookingCode, formatMerchantCode } from "@/lib/merchant-code"
import { sendCustomerPaymentEmail } from "@/lib/payments/customerEmails"
import { deleteDraftBooking, isDraftBookingDeletable } from "@/lib/bookings/draft-cleanup"
import { formatFinalPaymentDueLabel } from "@/lib/booking/final-payment-deadline"
import { queueBookingToFinance } from "@/lib/payouts/finance-handoff"
import { resolvePackageTranslation } from "@/lib/package-pricing"
import { normalizeLocale, type Locale } from "@/lib/i18n"
import { buildAppUrl } from "@/lib/site-config"
import { markTransactionPromoRedemptionsApplied, revertReservedTransactionPromoRedemptions } from "@/lib/transaction-promo-redemptions"

type LocalizedPackageEmailRow = {
  title?: string | null
  merchant_id?: string | null
  default_language?: string | null
  published_languages?: string[] | null
  package_translations?: Array<{ language_code?: string | null; title?: string | null }> | null
}

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

function normalizeStatus(value: string | null | undefined) {
  return String(value || "").trim().toLowerCase()
}

function isSuccessfulMidtransStatus(status: string | null | undefined) {
  return ["settlement", "capture"].includes(normalizeStatus(status))
}

function isFlightBooking(booking: { booking_product_type?: string | null }) {
  return normalizeStatus(booking.booking_product_type) === "flight"
}

async function markFlightPaymentVerified(
  supabase: SupabaseClient,
  bookingId: string,
) {
  const { data: flightDetail } = await supabase
    .from("flight_booking_details")
    .select("lifecycle_status")
    .eq("booking_id", bookingId)
    .maybeSingle<{ lifecycle_status: string | null }>()

  const currentStatus = normalizeStatus(flightDetail?.lifecycle_status)
  if (["ticketing", "issued", "issue_failed", "cancelled", "refund_required"].includes(currentStatus)) {
    return
  }

  await supabase
    .from("flight_booking_details")
    .update({
      lifecycle_status: "payment_verified",
      updated_at: new Date().toISOString(),
    })
    .eq("booking_id", bookingId)
}

export async function POST(req: Request) {
  try {
    const body = await req.json()

    const {
      order_id,
      status_code,
      gross_amount,
      signature_key,
      transaction_status,
      payment_type: gatewayPaymentMethod,
    } = body

    const serverKey = getRequiredEnv("MIDTRANS_SERVER_KEY")
    const hash = crypto
      .createHash("sha512")
      .update(order_id + status_code + gross_amount + serverKey)
      .digest("hex")

    if (hash !== signature_key) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 403 })
    }

    const supabase = createClient(
      getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
      getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY"),
    )

    const { bookingCode, paymentType } = resolveOrder(order_id)
    const { data: booking } = await supabase
      .from("bookings")
      .select(
        "id, package_id, booking_product_type, booking_code, customer_name, customer_email, pickup_date, total_amount, dp_amount, subtotal_amount, customer_admin_fee_amount, customer_tax_amount, customer_admin_fee_percent, customer_tax_percent, final_payment_amount, payment_type, payment_status, booking_status, merchant_arrived_at, customer_picked_up_at, merchant_picked_up_at, display_currency, display_subtotal_amount, customer_locale",
      )
      .or(`booking_code.eq.${bookingCode},id.eq.${order_id}`)
      .maybeSingle()

    if (!booking) {
      return NextResponse.json({ error: "Booking tidak ditemukan" }, { status: 404 })
    }

    await supabase
      .from("payments")
      .update({
        transaction_status,
        gateway_payment_method: gatewayPaymentMethod || null,
      })
      .eq("booking_id", booking.id)
      .eq("order_id", order_id)

    if (isSuccessfulMidtransStatus(transaction_status)) {
      const resolvedPaymentType = paymentType || booking.payment_type || "full"
      const bookingPatch =
        resolvedPaymentType === "dp"
          ? {
              payment_status: "dp_paid",
              booking_status: "awaiting_final_payment",
              escrow_status: "partial_hold",
            }
          : (() => {
              if (isFlightBooking(booking)) {
                return {
                  payment_status: "paid",
                  booking_status: "payment_verified",
                  escrow_status: "payment_verified",
                }
              }

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
          gateway_payment_method: gatewayPaymentMethod || null,
        })
        .eq("id", booking.id)

      await markTransactionPromoRedemptionsApplied(supabase, booking.id)

      if (isFlightBooking(booking)) {
        await markFlightPaymentVerified(supabase, booking.id)
      }

      if (resolvedPaymentType !== "dp" && !isFlightBooking(booking)) {
        const queueResult = await queueBookingToFinance({
          adminSupabase: supabase,
          bookingId: booking.id,
          source: "payment_settlement_auto",
        })

        if (!queueResult.ok && queueResult.error !== "Booking belum siap masuk queue finance") {
          console.error("AUTO FINANCE QUEUE ERROR (webhook):", queueResult.error)
        }
      }

      if (!isFlightBooking(booking)) {
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
      }

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

      try {
        const emailLocale = normalizeLocale(booking.customer_locale || inferCustomerLocaleFromBooking(booking))
        const bookingCode = formatBookingCode(booking.booking_code, booking.id)
        const verificationUrl = buildAppUrl(`/verifikasi-invoice/?booking_id=${encodeURIComponent(bookingCode)}`)
        const { data: packageRow } = booking.package_id
          ? await supabase.from("packages").select("title, merchant_id").eq("id", booking.package_id).maybeSingle()
          : { data: null as { title?: string | null; merchant_id?: string | null } | null }
        const { data: localizedPackageRow } = booking.package_id
          ? await supabase
              .from("packages")
              .select("title, merchant_id, default_language, published_languages, package_translations(language_code, title)")
              .eq("id", booking.package_id)
              .maybeSingle<LocalizedPackageEmailRow>()
          : {
              data: null as LocalizedPackageEmailRow | null,
            }
        const { data: merchantRow } = packageRow?.merchant_id
          ? await supabase
              .from("merchants")
              .select("brand_name, company_name")
              .eq("id", packageRow.merchant_id)
              .maybeSingle()
          : { data: null as { brand_name?: string | null; company_name?: string | null } | null }

        const localizedTranslation = resolvePackageTranslation(
          localizedPackageRow?.package_translations,
          emailLocale,
          localizedPackageRow?.default_language,
          localizedPackageRow?.published_languages,
        )
        await sendCustomerPaymentEmail({
          bookingCode,
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
        console.error("Failed to send payment email:", emailError)
      }
    }

    if (transaction_status === "expire" || transaction_status === "cancel") {
      if (isDraftBookingDeletable(booking)) {
        await deleteDraftBooking(supabase, booking.id)
      } else {
        await revertReservedTransactionPromoRedemptions(supabase, booking.id, "payment_expired_or_cancelled")
        await supabase
          .from("bookings")
          .update({ payment_status: "cancelled", booking_status: "cancelled" })
          .eq("id", booking.id)
      }
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
