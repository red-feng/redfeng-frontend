// app/api/bookings/route.ts

import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { validateBookingWindow } from "@/lib/booking/bookingWindow"

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

    const totalPax = adult_count + child_count

    // 🔹 Validate booking window
    const windowCheck = validateBookingWindow(pickup_date)
    if (!windowCheck.allowed) {
      return NextResponse.json(
        { error: windowCheck.reason },
        { status: 400 }
      )
    }

    // 🔥 CALL ATOMIC FUNCTION
    const { data: bookingData, error: rpcError } = await supabase.rpc(
      "create_booking_atomic_v2",
      {
        p_user_id: null, // guest booking
        p_package_id: package_id,
        p_adult: adult_count,
        p_child: child_count
      }
    )

    if (rpcError || !bookingData) {
      return NextResponse.json(
        { error: rpcError?.message || "Booking gagal" },
        { status: 400 }
      )
    }

    const bookingCode = generateBookingCode()

    // 🔹 Update booking dengan data customer
    const { data: booking, error: updateError } = await supabase
      .from("bookings")
      .update({
        booking_code: bookingCode,
        pickup_date,
        customer_name,
        customer_email,
        customer_phone
      })
      .eq("id", bookingData.id)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json(
        { error: "Gagal menyimpan data booking" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      booking_id: booking.id,
      payment_type: booking.payment_type,
      dp_amount: booking.dp_amount,
      total_amount: booking.total_price
    })

  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    )
  }
}