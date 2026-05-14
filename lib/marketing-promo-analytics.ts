import type { MarketingPromoPlacementKey } from "@/lib/marketing-promo-placements"
import { createAdminClient } from "@/lib/supabase/admin"

export type MarketingPromoEventType = "impression" | "click"

export type MarketingPromoEventInput = {
  promoId?: string | null
  promoSlug: string
  eventType: MarketingPromoEventType
  placementKey?: MarketingPromoPlacementKey | null
  sourcePath?: string | null
}

export function buildMarketingPromoClickHref(input: {
  slug: string
  placement?: MarketingPromoPlacementKey | null
  sourcePath?: string | null
}) {
  const params = new URLSearchParams({ slug: input.slug })
  if (input.placement) params.set("placement", input.placement)
  if (input.sourcePath) params.set("source", input.sourcePath)
  return `/promo/go?${params.toString()}`
}

export async function logMarketingPromoEvents(events: MarketingPromoEventInput[]) {
  if (!events.length) return

  const adminSupabase = createAdminClient()
  const rows = events.map((event) => ({
    promo_id: event.promoId || null,
    promo_slug: event.promoSlug,
    event_type: event.eventType,
    placement_key: event.placementKey || null,
    source_path: event.sourcePath || null,
    occurred_at: new Date().toISOString(),
  }))

  await adminSupabase.from("marketing_promo_events").insert(rows)
}
