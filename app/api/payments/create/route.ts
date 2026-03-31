import { NextResponse } from "next/server"
import midtransClient from "midtrans-client"
import { createClient } from "@supabase/supabase-js"
import { getRequiredEnv } from "@/lib/env"
import { createClient as createServerClient } from "@/lib/supabase/server"
import { resolveActiveCustomerPaymentMethod } from "@/lib/finance/settings"
import { deleteDraftBooking, isDraftBookingDeletable } from "@/lib/bookings/draft-cleanup"

function resolveEnabledPayments(paymentMethod: string | null | undefined) {
  const normalizedMethod = resolveActiveCustomerPaymentMethod(paymentMethod)
  if (normalizedMethod === "qris") return ["qris", "gopay"]
  if (normalizedMethod === "credit_card") return ["credit_card"]
  return ["bank_transfer"]
}

function createOrderId(bookingCode: string | null | undefined, paymentType: string) {
  const baseCode = String(bookingCode || "").trim()
  const fallbackCode = `booking-${Date.now()}`
  return `${baseCode || fallbackCode}-${paymentType}-${Date.now()}`
}

export async function POST(req: Request) {
  try {
    const { booking_id } = await req.json()
    const authSupabase = await createServerClient()
    const {
      data: { user },
    } = await authSupabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Silakan login terlebih dahulu" }, { status: 401 })
    }

    const supabase = createClient(
      getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
      getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY")
    )

    // ===============================
    // 1️⃣ Ambil booking
    // ===============================
    const { data: booking, error } = await supabase
      .from("bookings")
      .select("*")
      .eq("id", booking_id)
      .single()

    if (error || !booking) {
      return NextResponse.json(
        { error: "Booking tidak ditemukan" },
        { status: 404 }
      )
    }

    if (booking.payment_status === "paid") {
      return NextResponse.json(
        { error: "Booking ini sudah lunas" },
        { status: 400 }
      )
    }

    const bookingOwnerEmail = String(booking.customer_email || "").trim().toLowerCase()
    const signedInEmail = String(user.email || "").trim().toLowerCase()

    if (booking.user_id && booking.user_id !== user.id) {
      return NextResponse.json(
        { error: "Booking ini bukan milik akun Anda" },
        { status: 403 }
      )
    }

    if (!booking.user_id && bookingOwnerEmail && signedInEmail && bookingOwnerEmail !== signedInEmail) {
      return NextResponse.json(
        { error: "Booking ini bukan milik akun Anda" },
        { status: 403 }
      )
    }

    // ===============================
    // 2️⃣ Tentukan amount
    // ===============================
    const hasPaidDp = booking.payment_type === "dp" && booking.payment_status === "dp_paid"
    let amount = booking.total_amount
    let paymentType = booking.payment_type || "full"
    const financePaymentMethod = resolveActiveCustomerPaymentMethod(booking.payment_method)

    if (hasPaidDp) {
      paymentType = "full"
      amount = Math.max(Number(booking.final_payment_amount || 0), 0)
    } else if (booking.payment_type === "dp") {
      amount = booking.dp_amount
    }

    // ===============================
    // 3️⃣ Generate Order ID
    // ===============================
    const orderId = createOrderId(booking.booking_code, paymentType)

    // ===============================
    // 4️⃣ Simpan ke table payments
    // ===============================
    const { error: paymentError } = await supabase
  .from("payments")
  .insert({
    booking_id: booking.id,
    order_id: orderId,
    payment_type: paymentType,
    finance_payment_method: financePaymentMethod,
    gross_amount: amount,
    transaction_status: "pending"
  })

    if (paymentError) {
      return NextResponse.json(
        { error: paymentError.message || "Gagal membuat payment record" },
        { status: 500 }
      )
    }

    // ===============================
    // 5️⃣ Create Midtrans Snap
    // ===============================
    const snap = new midtransClient.Snap({
      isProduction: true,
      serverKey: getRequiredEnv("MIDTRANS_SERVER_KEY")
    })

    const parameter = {
      transaction_details: {
        order_id: orderId,
        gross_amount: amount
      },
      enabled_payments: resolveEnabledPayments(financePaymentMethod),
      customer_details: {
        first_name: booking.customer_name,
        email: booking.customer_email,
        phone: booking.customer_phone
      }
    }

    let transaction: { token: string }

    try {
      transaction = await snap.createTransaction(parameter)
    } catch (gatewayError) {
      if (!hasPaidDp && isDraftBookingDeletable(booking)) {
        await deleteDraftBooking(supabase, booking.id)
      } else {
        await supabase.from("payments").delete().eq("booking_id", booking.id).eq("order_id", orderId)
      }

      return NextResponse.json(
        {
          error:
            gatewayError instanceof Error
              ? gatewayError.message
              : "Popup pembayaran belum bisa dibuka. Draft booking dibersihkan otomatis.",
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      snap_token: transaction.token,
      snap_mode: financePaymentMethod === "qris" ? "qr" : "auto",
      order_id: orderId,
    })

  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Server error" },
      { status: 500 }
    )
  }
}
