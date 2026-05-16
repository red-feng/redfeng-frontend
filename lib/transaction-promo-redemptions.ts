import type { SupabaseClient } from "@supabase/supabase-js"
import { logTransactionPromoEvent } from "@/lib/transaction-promo-events"

export async function markTransactionPromoRedemptionsApplied(
  supabase: SupabaseClient,
  bookingId: string,
) {
  const { data: reservedRows, error: selectError } = await supabase
    .from("transaction_promo_redemptions")
    .select("id, rule_id, booking_id, user_id, email, product_type, product_id, discount_amount, currency, metadata")
    .eq("booking_id", bookingId)
    .eq("status", "reserved")

  if (selectError) {
    return { data: null, error: selectError }
  }

  if (!reservedRows?.length) {
    return { data: [], error: null }
  }

  const updateResult = await supabase
    .from("transaction_promo_redemptions")
    .update({
      status: "applied",
      updated_at: new Date().toISOString(),
    })
    .eq("booking_id", bookingId)
    .eq("status", "reserved")

  if (updateResult.error) {
    return updateResult
  }

  await Promise.all(
    reservedRows.map((row) =>
      logTransactionPromoEvent({
        supabase,
        ruleId: row.rule_id,
        bookingId: row.booking_id,
        customerId: row.user_id,
        eventType: "applied",
        metadata: {
          source: "payment_settlement",
          email: row.email || null,
          productType: row.product_type || null,
          productId: row.product_id || null,
          discountAmount: Number(row.discount_amount || 0),
          currency: row.currency || null,
          redemptionMetadata: row.metadata || {},
        },
      }),
    ),
  )

  return updateResult
}
