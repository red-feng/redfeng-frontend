import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { createClient as createServerClient } from "@/lib/supabase/server"
import { getRequiredEnv } from "@/lib/env"
import { getMidtransTransactionStatus } from "@/lib/refunds/midtrans"

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
        "id, booking_code, customer_email, payment_type, payment_status, booking_status, escrow_status, merchant_arrived_at, customer_picked_up_at, merchant_picked_up_at",
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
