import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { defaultFinanceSettings } from "@/lib/finance/settings"
import { validateBookingWindow } from "@/lib/booking/bookingWindow"
import { createClient as createServerClient } from "@/lib/supabase/server"
import { getRequiredEnv } from "@/lib/env"

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

    if (!user) {
      return NextResponse.json(
        { error: "Silakan login terlebih dahulu untuk melakukan booking" },
        { status: 401 },
      )
    }

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
      getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
      getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY"),
    )

    const { data: packagePricing } = await supabase
      .from("packages")
      .select("price_adult, price_child")
      .eq("id", package_id)
      .single()

    if (!packagePricing) {
      return NextResponse.json({ error: "Paket tidak ditemukan" }, { status: 404 })
    }

    const settingsResult = await ((supabase
      .from("finance_settings")
      .select("customer_admin_fee_percent, customer_tax_percent")
      .eq("id", "default")
      .maybeSingle()) as unknown as Promise<{
      data: {
        customer_admin_fee_percent?: number | string | null
        customer_tax_percent?: number | string | null
      } | null
      error: { message?: string } | null
    }>)

    const customerAdminFeePercent = Number(
      settingsResult.data?.customer_admin_fee_percent ?? defaultFinanceSettings.customerAdminFeePercent,
    )
    const customerTaxPercent = Number(
      settingsResult.data?.customer_tax_percent ?? defaultFinanceSettings.customerTaxPercent,
    )
    const subtotalAmount =
      Number(packagePricing.price_adult || 0) * Number(adult_count || 0) +
      Number(packagePricing.price_child || 0) * Number(child_count || 0)
    const customerAdminFeeAmount = Math.round(subtotalAmount * (customerAdminFeePercent / 100))
    const customerTaxAmount = Math.round((subtotalAmount + customerAdminFeeAmount) * (customerTaxPercent / 100))
    const totalAmount = subtotalAmount + customerAdminFeeAmount + customerTaxAmount
    const dpAmount = Math.round(totalAmount * 0.3)

    const windowCheck = validateBookingWindow(pickup_date)
    if (!windowCheck.allowed) {
      return NextResponse.json({ error: windowCheck.reason }, { status: 400 })
    }

    const { data: bookingData, error: rpcError } = await supabase.rpc(
      "create_booking_atomic_v2",
      {
        p_user_id: user.id,
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
        subtotal_amount: subtotalAmount,
        customer_admin_fee_amount: customerAdminFeeAmount,
        customer_tax_amount: customerTaxAmount,
        customer_admin_fee_percent: customerAdminFeePercent,
        customer_tax_percent: customerTaxPercent,
        total_amount: totalAmount,
        final_payment_amount: Math.max(totalAmount - dpAmount, 0),
        dp_amount: dpAmount,
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
