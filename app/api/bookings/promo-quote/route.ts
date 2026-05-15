import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { getRequiredEnv } from "@/lib/env"
import { normalizeLocale } from "@/lib/i18n"
import { resolvePackageCheckoutPromoPricing } from "@/lib/transaction-promo-checkout"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const packageId = String(body.package_id || "").trim()
    if (!packageId) {
      return NextResponse.json({ error: "Paket tidak valid" }, { status: 400 })
    }

    const supabase = createClient(
      getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
      getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY"),
    )

    const result = await resolvePackageCheckoutPromoPricing({
      supabase,
      packageId,
      locale: normalizeLocale(body.locale),
      adultCount: Number(body.adult_count || 0),
      childCount: Number(body.child_count || 0),
      paymentMethod: body.payment_method,
      promoCode: body.promo_code,
    })

    return NextResponse.json({
      ok: true,
      promo: {
        applied: result.promo.applied,
        source: result.promo.source,
        message: result.promo.message,
        rule_id: result.promo.rule?.id || null,
        rule_name: result.promo.rule?.name || null,
        code: result.promo.normalizedCode,
        discount_amount: result.paymentBreakdown.subtotalAmount < result.beforePromo.paymentSubtotalAmount
          ? result.beforePromo.paymentSubtotalAmount - result.paymentBreakdown.subtotalAmount
          : 0,
        display_discount_amount: result.displayBreakdown.discountAmount,
      },
      pricing: {
        subtotal_amount: result.paymentBreakdown.subtotalAmount,
        subtotal_before_discount: result.beforePromo.paymentSubtotalAmount,
        total_amount: result.paymentBreakdown.totalAmount,
        dp_amount: result.paymentBreakdown.dpAmount,
        final_payment_amount: result.paymentBreakdown.finalPaymentAmount,
        display_currency: result.displayBreakdown.currency,
        display_subtotal_amount: result.displayBreakdown.subtotalAmount,
        display_subtotal_before_discount: result.displayBreakdown.subtotalBeforeDiscount,
        display_admin_fee_amount: result.displayBreakdown.adminFeeAmount,
        display_tax_amount: result.displayBreakdown.taxAmount,
        display_total_amount: result.displayBreakdown.totalAmount,
        display_dp_amount: result.displayBreakdown.dpAmount,
        display_final_payment_amount: result.displayBreakdown.finalPaymentAmount,
      },
    })
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Server error" },
      { status: 500 },
    )
  }
}
