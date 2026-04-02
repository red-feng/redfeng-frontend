import { NextResponse } from "next/server"
import crypto from "crypto"
import { createClient } from "@supabase/supabase-js"
import { getRequiredEnv } from "@/lib/env"
import { formatMerchantCode } from "@/lib/merchant-code"
import { sendCustomerPaymentEmail } from "@/lib/payments/customerEmails"
import { deleteDraftBooking, isDraftBookingDeletable } from "@/lib/bookings/draft-cleanup"
import { formatFinalPaymentDueLabel } from "@/lib/booking/final-payment-deadline"
import { queueBookingToFinance } from "@/lib/payouts/finance-handoff"

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

function formatDateLabel(value: string | null) {
  if (!value) return "-"
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return parsed.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  })
}

function normalizeStatus(value: string | null | undefined) {
  return String(value || "").trim().toLowerCase()
}

function isSuccessfulMidtransStatus(status: string | null | undefined) {
  return ["settlement", "capture"].includes(normalizeStatus(status))
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
        "id, package_id, booking_code, customer_name, customer_email, pickup_date, total_amount, dp_amount, subtotal_amount, customer_admin_fee_amount, customer_tax_amount, final_payment_amount, payment_type, payment_status, booking_status, merchant_arrived_at, customer_picked_up_at, merchant_picked_up_at",
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

      if (resolvedPaymentType !== "dp") {
        const queueResult = await queueBookingToFinance({
          adminSupabase: supabase,
          bookingId: booking.id,
          source: "payment_settlement_auto",
        })

        if (!queueResult.ok && queueResult.error !== "Booking belum siap masuk queue finance") {
          console.error("AUTO FINANCE QUEUE ERROR (webhook):", queueResult.error)
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
      const invoiceSubtotalAmount =
        resolvedPaymentType === "dp"
          ? Number(booking.subtotal_amount || 0)
          : normalizeStatus(booking.payment_status) === "dp_paid"
            ? Number(booking.final_payment_amount || 0)
            : Number(booking.subtotal_amount || 0)
      const invoiceAdminFeeAmount =
        resolvedPaymentType === "dp"
          ? Number(booking.customer_admin_fee_amount || 0)
          : normalizeStatus(booking.payment_status) === "dp_paid"
            ? 0
            : Number(booking.customer_admin_fee_amount || 0)
      const invoiceTaxAmount =
        resolvedPaymentType === "dp"
          ? Number(booking.customer_tax_amount || 0)
          : normalizeStatus(booking.payment_status) === "dp_paid"
            ? 0
            : Number(booking.customer_tax_amount || 0)

      try {
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

        await sendCustomerPaymentEmail({
          bookingCode: booking.booking_code || booking.id,
          customerName: booking.customer_name || null,
          customerEmail: booking.customer_email || null,
          packageTitle: packageRow?.title || null,
          pickupDateLabel: formatDateLabel(booking.pickup_date || null),
          merchantName: merchantRow?.brand_name || merchantRow?.company_name || null,
          merchantCode: packageRow?.merchant_id ? formatMerchantCode(packageRow.merchant_id) : null,
          verificationUrl,
          totalAmount: amountPaid,
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
