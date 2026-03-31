import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { createClient as createServerClient } from "@/lib/supabase/server"
import { getRequiredEnv } from "@/lib/env"
import { getMidtransTransactionStatus } from "@/lib/refunds/midtrans"
import { formatMerchantCode } from "@/lib/merchant-code"
import { sendCustomerPaymentEmail } from "@/lib/payments/customerEmails"

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

function resolveSettlementDueLabel(pickupDate: string | null) {
  if (!pickupDate) return null
  const parsed = new Date(`${pickupDate}T00:00:00`)
  if (Number.isNaN(parsed.getTime())) return formatDateLabel(pickupDate)
  parsed.setDate(parsed.getDate() - 3)
  return formatDateLabel(parsed.toISOString())
}

export async function POST(req: Request) {
  try {
    const { booking_id, order_id } = await req.json()
    const authSupabase = await createServerClient()
    const {
      data: { user },
    } = await authSupabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Silakan login terlebih dahulu" }, { status: 401 })
    }

    const supabase = createClient(
      getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
      getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY"),
    )

    const { data: booking } = await supabase
      .from("bookings")
      .select(
        "id, package_id, booking_code, customer_name, customer_email, pickup_date, total_amount, dp_amount, subtotal_amount, customer_admin_fee_amount, customer_tax_amount, final_payment_amount, payment_type, payment_status, booking_status, escrow_status, merchant_arrived_at, customer_picked_up_at, merchant_picked_up_at",
      )
      .eq("id", booking_id)
      .maybeSingle()

    if (!booking) {
      return NextResponse.json({ error: "Booking tidak ditemukan" }, { status: 404 })
    }

    const bookingOwnerEmail = String(booking.customer_email || "").trim().toLowerCase()
    const signedInEmail = String(user.email || "").trim().toLowerCase()

    if (bookingOwnerEmail && signedInEmail && bookingOwnerEmail !== signedInEmail) {
      return NextResponse.json({ error: "Booking ini bukan milik akun Anda" }, { status: 403 })
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
      return NextResponse.json({ error: "Status transaksi Midtrans belum tersedia" }, { status: 409 })
    }

    await supabase
      .from("payments")
      .update({
        transaction_status: transactionStatus,
        gateway_payment_method: gatewayPaymentMethod,
      })
      .eq("booking_id", booking.id)
      .eq("order_id", resolvedOrderId)

    if (transactionStatus === "settlement") {
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
          resolvedPaymentType === "dp" ? resolveSettlementDueLabel(booking.pickup_date || null) : null
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
          console.error("Failed to send payment email from sync route:", emailError)
        }
      }
    }

    if (transactionStatus === "pending") {
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
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Server error" },
      { status: 500 },
    )
  }
}
