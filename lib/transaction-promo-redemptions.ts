import type { SupabaseClient } from "@supabase/supabase-js"

export async function markTransactionPromoRedemptionsApplied(
  supabase: SupabaseClient,
  bookingId: string,
) {
  return supabase
    .from("transaction_promo_redemptions")
    .update({
      status: "applied",
      updated_at: new Date().toISOString(),
    })
    .eq("booking_id", bookingId)
    .eq("status", "reserved")
}

