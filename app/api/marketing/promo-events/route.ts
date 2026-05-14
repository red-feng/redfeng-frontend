import { NextResponse } from "next/server"
import { isMarketingPromoPlacementKey } from "@/lib/marketing-promo-placements"
import { logMarketingPromoEvents, type MarketingPromoEventInput } from "@/lib/marketing-promo-analytics"

type PromoEventBody = {
  events?: Array<{
    promoId?: string | null
    promoSlug?: string | null
    eventType?: string | null
    placementKey?: string | null
    sourcePath?: string | null
  }>
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as PromoEventBody | null
  const rawEvents = body?.events || []

  const events: MarketingPromoEventInput[] = rawEvents
    .map((event) => {
      const promoSlug = String(event.promoSlug || "").trim()
      const eventType = String(event.eventType || "").trim()
      const placementKey = String(event.placementKey || "").trim()

      if (!promoSlug || (eventType !== "impression" && eventType !== "click")) {
        return null
      }

      return {
        promoId: event.promoId ? String(event.promoId) : null,
        promoSlug,
        eventType,
        placementKey: isMarketingPromoPlacementKey(placementKey) ? placementKey : null,
        sourcePath: event.sourcePath ? String(event.sourcePath) : null,
      }
    })
    .filter(Boolean) as MarketingPromoEventInput[]

  if (events.length) {
    await logMarketingPromoEvents(events)
  }

  return NextResponse.json({ ok: true })
}
