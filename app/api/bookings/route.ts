import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { resolveActiveCustomerPaymentMethod } from "@/lib/finance/settings"
import { validateBookingWindow } from "@/lib/booking/bookingWindow"
import { createClient as createServerClient } from "@/lib/supabase/server"
import { getRequiredEnv } from "@/lib/env"
import { isQuotaTravelStyle } from "@/lib/travelStyles"
import { normalizeLocale } from "@/lib/i18n"
import { logTransactionPromoEvent } from "@/lib/transaction-promo-events"
import { deleteDraftBooking, isDraftBookingDeletable } from "@/lib/bookings/draft-cleanup"
import { resolveBookingProductType } from "@/lib/booking-products"
import { resolvePackageCheckoutPromoPricing } from "@/lib/transaction-promo-checkout"

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
      promo_code,
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

    const bookingProductType = resolveBookingProductType({ packageId: package_id })
    const normalizedPaymentMethod = resolveActiveCustomerPaymentMethod(payment_method)
    const normalizedPaymentType = String(payment_type || "full").trim().toLowerCase() === "dp" ? "dp" : "full"
    const pricingWithPromo = await resolvePackageCheckoutPromoPricing({
      supabase,
      packageId: package_id,
      locale: activeLocale,
      adultCount: Number(adult_count || 0),
      childCount: Number(child_count || 0),
      paymentMethod: normalizedPaymentMethod,
      promoCode: promo_code,
      customerId: user.id,
      customerEmail: user.email || customer_email,
    })

    if (String(promo_code || "").trim() && !pricingWithPromo.promo.applied) {
      return NextResponse.json(
        { error: pricingWithPromo.promo.message || "Kode promo tidak dapat dipakai." },
        { status: 400 },
      )
    }

    const priceBreakdown = pricingWithPromo.paymentBreakdown

    const windowCheck = validateBookingWindow(pickup_date)
    if (!windowCheck.allowed) {
      return NextResponse.json({ error: windowCheck.reason }, { status: 400 })
    }

    const { data: staleDrafts } = await supabase
      .from("bookings")
      .select("id, payment_status, booking_status")
      .eq("package_id", package_id)
      .eq("pickup_date", pickup_date)
      .eq("customer_email", user.email || customer_email)

    for (const staleDraft of staleDrafts || []) {
      if (isDraftBookingDeletable(staleDraft)) {
        await deleteDraftBooking(supabase, staleDraft.id)
      }
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
        customer_locale: activeLocale,
        booking_product_type: bookingProductType,
        expiry_time: expiry.toISOString(),
        payment_type: normalizedPaymentType,
        payment_status: "pending",
        escrow_status: "pending_payment",
        display_currency: pricingWithPromo.displayBreakdown.currency,
        display_subtotal_amount: pricingWithPromo.displayBreakdown.subtotalAmount,
        display_price_adult: Number(pricingWithPromo.localizedPricing.priceAdult || 0),
        display_price_child: Number(pricingWithPromo.localizedPricing.priceChild || 0),
        exchange_rate_date: pricingWithPromo.paymentPricing.exchangeDate,
        subtotal_amount: priceBreakdown.subtotalAmount,
        customer_admin_fee_amount: priceBreakdown.customerAdminFeeAmount,
        customer_tax_amount: priceBreakdown.customerTaxAmount,
        customer_admin_fee_percent: priceBreakdown.customerAdminFeePercent,
        customer_tax_percent: priceBreakdown.customerTaxPercent,
        total_amount: priceBreakdown.totalAmount,
        final_payment_amount: priceBreakdown.finalPaymentAmount,
        dp_amount: priceBreakdown.dpAmount,
        payment_method: priceBreakdown.paymentMethod,
        promo_rule_id: pricingWithPromo.promo.rule?.id || null,
        promo_code: pricingWithPromo.promo.normalizedCode,
        promo_discount_amount: pricingWithPromo.promo.applied
          ? pricingWithPromo.beforePromo.paymentSubtotalAmount - pricingWithPromo.paymentBreakdown.subtotalAmount
          : 0,
        promo_snapshot: pricingWithPromo.promoSnapshot || {},
      })
      .select()
      .single()

    if (insertError || !booking) {
      return NextResponse.json(
        { error: insertError?.message || "Gagal menyimpan data booking" },
        { status: 500 },
      )
    }

    if (pricingWithPromo.promo.applied && pricingWithPromo.promo.rule?.id) {
      const { error: redemptionError } = await supabase.from("transaction_promo_redemptions").insert({
        rule_id: pricingWithPromo.promo.rule.id,
        booking_id: booking.id,
        user_id: user.id,
        email: user.email || customer_email || null,
        product_type: bookingProductType,
        product_id: package_id,
        discount_amount: pricingWithPromo.beforePromo.paymentSubtotalAmount - pricingWithPromo.paymentBreakdown.subtotalAmount,
        currency: "IDR",
        status: "reserved",
        metadata: {
          source: "package_checkout",
          promoCode: pricingWithPromo.promo.normalizedCode,
          paymentMethod: normalizedPaymentMethod,
          paymentType: normalizedPaymentType,
          subtotalBeforeDiscount: pricingWithPromo.beforePromo.paymentSubtotalAmount,
          subtotalAfterDiscount: pricingWithPromo.paymentBreakdown.subtotalAmount,
        },
      })

      if (redemptionError) {
        await deleteDraftBooking(supabase, booking.id)
        return NextResponse.json(
          { error: redemptionError.message || "Gagal mengunci kuota promo untuk booking ini." },
          { status: 500 },
        )
      }

      await logTransactionPromoEvent({
        supabase,
        ruleId: pricingWithPromo.promo.rule.id,
        bookingId: booking.id,
        customerId: user.id,
        eventType: "reserved",
        metadata: {
          source: "package_booking_create",
          promoCode: pricingWithPromo.promo.normalizedCode,
          paymentMethod: normalizedPaymentMethod,
          paymentType: normalizedPaymentType,
          productType: bookingProductType,
          productId: package_id,
          subtotalBeforeDiscount: pricingWithPromo.beforePromo.paymentSubtotalAmount,
          subtotalAfterDiscount: pricingWithPromo.paymentBreakdown.subtotalAmount,
          discountAmount:
            pricingWithPromo.beforePromo.paymentSubtotalAmount - pricingWithPromo.paymentBreakdown.subtotalAmount,
        },
      })
    }

    return NextResponse.json({
      booking_id: booking.id,
      payment_type: booking.payment_type,
      dp_amount: booking.dp_amount,
      total_amount: booking.total_amount,
      promo_applied: Boolean(pricingWithPromo.promo.applied),
      promo_discount_amount: booking.promo_discount_amount || 0,
    })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
