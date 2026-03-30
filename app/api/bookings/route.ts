import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { calculateBookingAmounts, getFinanceSettings, normalizePaymentMethod } from "@/lib/finance/settings"
import { convertCurrencyAmount, getLiveLocalizedPackagePricing } from "@/lib/currency-rates"
import { validateBookingWindow } from "@/lib/booking/bookingWindow"
import { createClient as createServerClient } from "@/lib/supabase/server"
import { getRequiredEnv } from "@/lib/env"
import { isQuotaTravelStyle } from "@/lib/travelStyles"
import { normalizeLocale } from "@/lib/i18n"

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
      locale,
      pickup_date,
      adult_count,
      child_count,
      customer_name,
      customer_email,
      customer_phone,
      payment_method,
      payment_type,
    } = body

    const supabase = createClient(
      getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
      getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY"),
    )

    const { data: packagePricing } = await supabase
      .from("packages")
      .select("price_adult, price_child, currency, travel_style, minimal_peserta, departure_date, default_language, published_languages, package_translations(language_code, currency, price_adult, price_child)")
      .eq("id", package_id)
      .single()

    if (!packagePricing) {
      return NextResponse.json({ error: "Paket tidak ditemukan" }, { status: 404 })
    }

    const requestedParticipants = Number(adult_count || 0) + Number(child_count || 0)
    const minimumParticipants = Math.max(Number(packagePricing.minimal_peserta || 0), 1)
    if (requestedParticipants <= 0) {
      return NextResponse.json({ error: "Jumlah peserta tidak valid" }, { status: 400 })
    }

    if (requestedParticipants < minimumParticipants) {
      return NextResponse.json(
        {
          error: `Minimal peserta untuk paket ini ${minimumParticipants} orang. Total peserta dewasa dan anak harus mencapai jumlah tersebut.`,
        },
        { status: 400 },
      )
    }

    const activeLocale = normalizeLocale(locale)
    const localizedPricing = await getLiveLocalizedPackagePricing({
      locale: activeLocale,
      defaultLanguage: packagePricing.default_language,
      publishedLanguages: packagePricing.published_languages,
      baseCurrency: packagePricing.currency,
      baseAdultPrice: packagePricing.price_adult,
      baseChildPrice: packagePricing.price_child,
    })
    const adultPriceCharge = await convertCurrencyAmount({
      amount: Number(packagePricing.price_adult || 0),
      fromCurrency: packagePricing.currency || "IDR",
      toCurrency: "IDR",
    })
    const childPriceCharge = await convertCurrencyAmount({
      amount: Number(packagePricing.price_child || 0),
      fromCurrency: packagePricing.currency || "IDR",
      toCurrency: "IDR",
    })

    if (isQuotaTravelStyle(packagePricing.travel_style)) {
      if (!packagePricing.departure_date) {
        return NextResponse.json({ error: "Tanggal keberangkatan paket belum diatur." }, { status: 400 })
      }

      if (pickup_date !== packagePricing.departure_date) {
        return NextResponse.json(
          { error: "Tanggal booking harus mengikuti tanggal keberangkatan paket." },
          { status: 400 },
        )
      }

      const { data: existingBookings, error: bookingLookupError } = await supabase
        .from("bookings")
        .select("adult_count, child_count, booking_status, payment_status")
        .eq("package_id", package_id)
        .eq("pickup_date", pickup_date)

      if (bookingLookupError) {
        return NextResponse.json({ error: "Gagal memeriksa kuota paket" }, { status: 500 })
      }

      const reservedParticipants = (existingBookings || []).reduce((sum, booking) => {
        const bookingStatus = String(booking.booking_status || "").trim().toLowerCase()
        const paymentStatus = String(booking.payment_status || "").trim().toLowerCase()
        const isInactive =
          bookingStatus === "cancelled" ||
          bookingStatus === "rejected" ||
          paymentStatus === "cancelled" ||
          paymentStatus === "refund" ||
          paymentStatus === "expired"

        if (isInactive) return sum

        return sum + Number(booking.adult_count || 0) + Number(booking.child_count || 0)
      }, 0)

      const quota = Number(packagePricing.minimal_peserta || 0)
      const remainingQuota = Math.max(quota - reservedParticipants, 0)

      if (remainingQuota < requestedParticipants) {
        return NextResponse.json(
          {
            error:
              remainingQuota > 0
                ? `Sisa kuota hanya ${remainingQuota} peserta untuk tanggal tersebut.`
                : "Kuota untuk tanggal tersebut sudah penuh.",
          },
          { status: 400 },
        )
      }
    }

    const financeSettings = await getFinanceSettings(
      supabase as unknown as Parameters<typeof getFinanceSettings>[0],
    )
    const subtotalAmount =
      Number(adultPriceCharge.amount || 0) * Number(adult_count || 0) +
      Number(childPriceCharge.amount || 0) * Number(child_count || 0)
    const normalizedPaymentMethod = normalizePaymentMethod(payment_method)
    const normalizedPaymentType = String(payment_type || "full").trim().toLowerCase() === "dp" ? "dp" : "full"
    const priceBreakdown = calculateBookingAmounts(subtotalAmount, normalizedPaymentMethod, financeSettings)

    const windowCheck = validateBookingWindow(pickup_date)
    if (!windowCheck.allowed) {
      return NextResponse.json({ error: windowCheck.reason }, { status: 400 })
    }

    const bookingCode = generateBookingCode()
    const expiry = new Date()
    expiry.setMinutes(expiry.getMinutes() + 30)

    const { data: booking, error: insertError } = await supabase
      .from("bookings")
      .insert({
        package_id,
        adult_count: Number(adult_count || 0),
        child_count: Number(child_count || 0),
        booking_code: bookingCode,
        pickup_date,
        customer_name,
        customer_email,
        customer_phone,
        expiry_time: expiry.toISOString(),
        payment_type: normalizedPaymentType,
        payment_status: "pending",
        escrow_status: "pending_payment",
        display_currency: localizedPricing.currency,
        display_subtotal_amount:
          Number(localizedPricing.priceAdult || 0) * Number(adult_count || 0) +
          Number(localizedPricing.priceChild || 0) * Number(child_count || 0),
        display_price_adult: Number(localizedPricing.priceAdult || 0),
        display_price_child: Number(localizedPricing.priceChild || 0),
        exchange_rate_date: adultPriceCharge.date || childPriceCharge.date,
        subtotal_amount: priceBreakdown.subtotalAmount,
        customer_admin_fee_amount: priceBreakdown.customerAdminFeeAmount,
        customer_tax_amount: priceBreakdown.customerTaxAmount,
        customer_admin_fee_percent: priceBreakdown.customerAdminFeePercent,
        customer_tax_percent: priceBreakdown.customerTaxPercent,
        total_amount: priceBreakdown.totalAmount,
        final_payment_amount: priceBreakdown.finalPaymentAmount,
        dp_amount: priceBreakdown.dpAmount,
        payment_method: priceBreakdown.paymentMethod,
      })
      .select()
      .single()

    if (insertError || !booking) {
      return NextResponse.json(
        { error: insertError?.message || "Gagal menyimpan data booking" },
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
        const { data: existingPostRoom } = await supabase
          .from("package_chat_rooms")
          .select("id")
          .eq("booking_id", booking.id)
          .eq("customer_id", user.id)
          .eq("merchant_user_id", merchantOwner.user_id)
          .maybeSingle()

        if (!existingPostRoom?.id) {
          const { data: preBookingRoom } = await supabase
            .from("package_chat_rooms")
            .select("id")
            .eq("package_id", package_id)
            .eq("customer_id", user.id)
            .eq("merchant_user_id", merchantOwner.user_id)
            .is("booking_id", null)
            .maybeSingle()

          let { error: createRoomError } = await supabase
            .from("package_chat_rooms")
            .insert({
              package_id,
              customer_id: user.id,
              merchant_user_id: merchantOwner.user_id,
              booking_id: booking.id,
              source_room_id: preBookingRoom?.id || null,
            })

          if (createRoomError && createRoomError.message.includes("source_room_id")) {
            const fallbackCreate = await supabase.from("package_chat_rooms").insert({
              package_id,
              customer_id: user.id,
              merchant_user_id: merchantOwner.user_id,
              booking_id: booking.id,
            })
            createRoomError = fallbackCreate.error
          }

          if (createRoomError) {
            if (createRoomError.message.includes("booking_id")) {
              console.error("Chat post-booking butuh migration terbaru:", createRoomError.message)
            } else {
              console.error("Gagal membuat chat room booking:", createRoomError.message)
            }
          }
        }
        const { data: existingRoom } = await supabase
          .from("package_chat_rooms")
          .select("id")
          .eq("package_id", package_id)
          .eq("customer_id", user.id)
          .eq("merchant_user_id", merchantOwner.user_id)
          .is("booking_id", null)
          .maybeSingle()

        if (existingRoom?.id) {
          const { error: linkError } = await supabase
            .from("package_chat_rooms")
            .update({
              updated_at: new Date().toISOString(),
            })
            .eq("id", existingRoom.id)

          if (linkError) {
            console.error("Gagal refresh room pre-booking:", linkError.message)
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
