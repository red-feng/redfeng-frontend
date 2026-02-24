// app/api/bookings/route.ts

import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { validateBookingWindow } from "@/lib/booking/bookingWindow"

// ===============================
// DP CALCULATION (DI LUAR POST)
// ===============================
function calculateDP(totalAmount: number, totalPax: number) {
  let dpPercent = 0.5

  if (totalPax >= 11 && totalPax <= 20) {
    dpPercent = 0.4
  }

  if (totalPax >= 21) {
    dpPercent = 0.3
  }

  return totalAmount * dpPercent
}




function generateBookingCode() {
  const random = Math.floor(1000 + Math.random() * 9000)
  const date = new Date()

  const year = date.getFullYear().toString().slice(-2)
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")

  return `RF${year}${month}${day}${random}`
}





export async function POST(req: Request) {
  try {
    const body = await req.json()

    const {
      package_id,
      pickup_date,
      adult_count,
      child_count,
      customer_name,
      customer_email,
      customer_phone
    } = body

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // ===============================
    // 1️⃣ HITUNG TOTAL PAX
    // ===============================
    const totalPax = adult_count + child_count

    // ===============================
    // 2️⃣ VALIDASI BOOKING WINDOW
    // ===============================
    const windowCheck = validateBookingWindow(pickup_date)

    if (!windowCheck.allowed) {
      return NextResponse.json(
        { error: windowCheck.reason },
        { status: 400 }
      )
    }

    // ===============================
    // 3️⃣ AMBIL DATA PACKAGE
    // ===============================
    const { data: paket, error: paketError } = await supabase
      .from("packages")
      .select("*")
      .eq("id", package_id)
      .single()

    if (paketError || !paket) {
      return NextResponse.json(
        { error: "Paket tidak ditemukan" },
        { status: 404 }
      )
    }

    // ===============================
    // 4️⃣ VALIDASI MIN/MAX PAX
    // ===============================
    if (
      totalPax < paket.min_participants ||
      totalPax > paket.max_participants
    ) {
      return NextResponse.json(
        { error: "Jumlah peserta tidak sesuai ketentuan paket" },
        { status: 400 }
      )
    }

    // ===============================
    // 5️⃣ HITUNG TOTAL HARGA
    // ===============================
    const totalAmount =
      adult_count * paket.price_adult +
      child_count * paket.price_child

    // ===============================
    // 6️⃣ TENTUKAN PAYMENT TYPE
    // ===============================
    let paymentType = "full"
    let dpAmount = null

let fullPaymentDueDate = null

if (windowCheck.paymentMode === "dp_allowed") {
  paymentType = "dp"
  dpAmount = calculateDP(totalAmount, totalPax)

  const pickup = new Date(pickup_date)
  pickup.setDate(pickup.getDate() - 3)

  fullPaymentDueDate = pickup.toISOString().split("T")[0]
}


    // ===============================
    // 7️⃣ SIMPAN BOOKING
    // ===============================
    
    const bookingCode = generateBookingCode()
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .insert({
  booking_code: bookingCode,
  package_id,
  pickup_date,
  adult_count,
  child_count,
  total_pax: totalPax,
  total_amount: totalAmount,
  dp_amount: dpAmount,
  payment_type: paymentType,
  payment_status: "pending",
  booking_status: "waiting_payment",
  full_payment_due_date: fullPaymentDueDate,
  customer_name,
  customer_email,
  customer_phone
})
      .select()
      .single()

    if (bookingError) {
      return NextResponse.json(
        { error: "Gagal membuat booking" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      booking_id: booking.id,
      payment_type: paymentType
    })

  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    )
  }
}
