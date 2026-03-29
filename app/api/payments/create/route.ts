import { NextResponse } from "next/server"
import midtransClient from "midtrans-client"
import { createClient } from "@supabase/supabase-js"
import { getRequiredEnv } from "@/lib/env"
import { createClient as createServerClient } from "@/lib/supabase/server"
import { normalizePaymentMethod } from "@/lib/finance/settings"

function resolveEnabledPayments(paymentMethod: string | null | undefined) {
  const normalizedMethod = normalizePaymentMethod(paymentMethod)
  if (normalizedMethod === "qris") return ["qris"]
  if (normalizedMethod === "credit_card") return ["credit_card"]
  return ["bank_transfer"]
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
    const financePaymentMethod = normalizePaymentMethod(booking.payment_method)

    if (hasPaidDp) {
      paymentType = "full"
      amount = Math.max(Number(booking.final_payment_amount || 0), 0)
    } else if (booking.payment_type === "dp") {
      amount = booking.dp_amount
    }

    // ===============================
    // 3️⃣ Generate Order ID
    // ===============================
    const orderId = `${booking.booking_code}-${paymentType}`

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
    { error: "Gagal membuat payment record" },
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

    const transaction = await snap.createTransaction(parameter)

    return NextResponse.json({
      snap_token: transaction.token
    })

  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    )
  }
}
