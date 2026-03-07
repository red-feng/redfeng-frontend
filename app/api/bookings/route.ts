import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { validateBookingWindow } from "@/lib/booking/bookingWindow"
import { createClient as createServerClient } from "@/lib/supabase/server"

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
    const authSupabase = await createServerClient()
    const {
      data: { user },
    } = await authSupabase.auth.getUser()

    const body = await req.json()
    const {
      package_id,
      pickup_date,
      adult_count,
      child_count,
      customer_name,
      customer_email,
      customer_phone,
    } = body

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    )

    const windowCheck = validateBookingWindow(pickup_date)
    if (!windowCheck.allowed) {
      return NextResponse.json({ error: windowCheck.reason }, { status: 400 })
    }

    const { data: bookingData, error: rpcError } = await supabase.rpc(
      "create_booking_atomic_v2",
      {
        p_user_id: user?.id ?? null,
        p_package_id: package_id,
        p_adult: adult_count,
        p_child: child_count,
      },
    )

    if (rpcError || !bookingData) {
      return NextResponse.json(
        { error: rpcError?.message || "Booking gagal" },
        { status: 400 },
      )
    }

    const bookingCode = generateBookingCode()
    const expiry = new Date()
    expiry.setMinutes(expiry.getMinutes() + 30)

    const { data: booking, error: updateError } = await supabase
      .from("bookings")
      .update({
        booking_code: bookingCode,
        pickup_date,
        customer_name,
        customer_email,
        customer_phone,
        expiry_time: expiry.toISOString(),
      })
      .eq("id", bookingData.id)
      .select()
      .single()

    if (updateError || !booking) {
      return NextResponse.json(
        { error: "Gagal menyimpan data booking" },
        { status: 500 },
      )
    }

    if (user?.id) {
      const { data: pkg } = await supabase
        .from("packages")
        .select("merchant_id")
        .eq("id", package_id)
        .maybeSingle()

      if (pkg?.merchant_id) {
        const { data: merchantOwner } = await supabase
          .from("merchants")
          .select("user_id")
          .eq("id", pkg.merchant_id)
          .maybeSingle()

        if (merchantOwner?.user_id) {
          const { data: existingRoom } = await supabase
            .from("package_chat_rooms")
            .select("id")
            .eq("package_id", package_id)
            .eq("customer_id", user.id)
            .eq("merchant_user_id", merchantOwner.user_id)
            .maybeSingle()

          if (existingRoom?.id) {
            const { error: linkError } = await supabase
              .from("package_chat_rooms")
              .update({
                booking_id: booking.id,
                updated_at: new Date().toISOString(),
              })
              .eq("id", existingRoom.id)

            if (linkError && !linkError.message.includes("booking_id")) {
              console.error("Gagal link chat room ke booking:", linkError.message)
            }
          } else {
            const { error: createRoomError } = await supabase
              .from("package_chat_rooms")
              .insert({
                package_id,
                customer_id: user.id,
                merchant_user_id: merchantOwner.user_id,
                booking_id: booking.id,
              })

            if (createRoomError) {
              if (createRoomError.message.includes("booking_id")) {
                await supabase.from("package_chat_rooms").insert({
                  package_id,
                  customer_id: user.id,
                  merchant_user_id: merchantOwner.user_id,
                })
              } else {
                console.error("Gagal membuat chat room booking:", createRoomError.message)
              }
            }
          }
        }
      }
    }

    return NextResponse.json({
      booking_id: booking.id,
      payment_type: booking.payment_type,
      dp_amount: booking.dp_amount,
      total_amount: booking.total_amount,
    })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
