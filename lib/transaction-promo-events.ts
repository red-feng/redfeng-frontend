import type { SupabaseClient } from "@supabase/supabase-js"

export type TransactionPromoEventType = "quoted" | "rejected" | "reserved" | "applied" | "reverted"

type LogTransactionPromoEventParams = {
  supabase: SupabaseClient
  ruleId?: string | null
  bookingId?: string | null
  customerId?: string | null
  eventType: TransactionPromoEventType
  reason?: string | null
  metadata?: Record<string, unknown> | null
}

function normalizeText(value: string | null | undefined) {
  const normalized = String(value || "").trim()
  return normalized || null
}

export async function logTransactionPromoEvent({
  supabase,
  ruleId,
  bookingId,
  customerId,
  eventType,
  reason,
  metadata,
}: LogTransactionPromoEventParams) {
  const { error } = await supabase.from("transaction_promo_events").insert({
    rule_id: normalizeText(ruleId),
    booking_id: normalizeText(bookingId),
    customer_id: normalizeText(customerId),
    event_type: eventType,
    reason: normalizeText(reason),
    metadata: metadata || {},
  })

  if (error) {
    console.error("Failed to log transaction promo event:", error.message)
  }
}
