import { NextResponse } from "next/server"
import crypto from "crypto"
import { createClient } from "@supabase/supabase-js"
import { getRequiredEnv } from "@/lib/env"

function resolveOrder(orderId: string) {
  const match = orderId.match(/^(.*?)-(dp|full)$/i)
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
    const body = await req.json()

    const {
      order_id,
      status_code,
      gross_amount,
      signature_key,
      transaction_status,
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
      .select("id, payment_type")
      .or(`booking_code.eq.${bookingCode},id.eq.${order_id}`)
      .maybeSingle()

    if (!booking) {
      return NextResponse.json({ error: "Booking tidak ditemukan" }, { status: 404 })
    }

    await supabase
      .from("payments")
      .update({ transaction_status })
      .eq("booking_id", booking.id)
      .eq("order_id", order_id)

    if (transaction_status === "settlement") {
      const resolvedPaymentType = paymentType || booking.payment_type || "full"
      const bookingPatch =
        resolvedPaymentType === "dp"
          ? {
              payment_status: "dp_paid",
              booking_status: "awaiting_final_payment",
              escrow_status: "partial_hold",
            }
          : {
              payment_status: "paid",
              booking_status: "confirmed",
              escrow_status: "held",
            }

      await supabase.from("bookings").update(bookingPatch).eq("id", booking.id)
    }

    if (transaction_status === "expire" || transaction_status === "cancel") {
      await supabase
        .from("bookings")
        .update({ payment_status: "cancelled", booking_status: "cancelled" })
        .eq("id", booking.id)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
