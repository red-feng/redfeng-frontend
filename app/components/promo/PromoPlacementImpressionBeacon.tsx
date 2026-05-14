"use client"

import { useEffect } from "react"
import type { MarketingPromoPlacementKey } from "@/lib/marketing-promo-placements"

type PromoPlacementImpressionBeaconProps = {
  placement: MarketingPromoPlacementKey
  sourcePath: string
  promos: Array<{ id: string; slug: string }>
}

function sendEvents(body: string) {
  if (navigator.sendBeacon) {
    navigator.sendBeacon("/api/marketing/promo-events", body)
    return
  }

  void fetch("/api/marketing/promo-events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true,
  })
}

export default function PromoPlacementImpressionBeacon({
  placement,
  sourcePath,
  promos,
}: PromoPlacementImpressionBeaconProps) {
  useEffect(() => {
    if (!promos.length) return
    if (typeof window === "undefined") return

    const storageKey = `promo-impression:${placement}:${sourcePath}:${promos.map((promo) => promo.slug).join(",")}`
    if (window.sessionStorage.getItem(storageKey)) return

    window.sessionStorage.setItem(storageKey, "1")
    sendEvents(
      JSON.stringify({
        events: promos.map((promo) => ({
          promoId: promo.id,
          promoSlug: promo.slug,
          eventType: "impression",
          placementKey: placement,
          sourcePath,
        })),
      }),
    )
  }, [placement, promos, sourcePath])

  return null
}
