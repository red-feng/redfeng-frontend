import { NextResponse } from "next/server"
import { getPromoBySlug } from "@/app/components/promo/promoCatalog"
import { logMarketingPromoEvents } from "@/lib/marketing-promo-analytics"
import { isMarketingPromoPlacementKey } from "@/lib/marketing-promo-placements"
import { createAdminClient } from "@/lib/supabase/admin"

export async function GET(request: Request) {
  const url = new URL(request.url)
  const slug = String(url.searchParams.get("slug") || "").trim()
  const sourcePath = String(url.searchParams.get("source") || "").trim() || null
  const placementParam = String(url.searchParams.get("placement") || "").trim()
  const placementKey = isMarketingPromoPlacementKey(placementParam) ? placementParam : null

  if (!slug) {
    return NextResponse.redirect(new URL("/promo", url))
  }

  const adminSupabase = createAdminClient()
  const { data } = await adminSupabase
    .from("marketing_promos")
    .select("id, slug, target_href")
    .eq("slug", slug)
    .maybeSingle()

  const fallbackPromo = getPromoBySlug(slug)
  const targetHref = String(data?.target_href || fallbackPromo?.targetHref || `/promo/${slug}`)

  await logMarketingPromoEvents([
    {
      promoId: data?.id || null,
      promoSlug: slug,
      eventType: "click",
      placementKey,
      sourcePath,
    },
  ])

  return NextResponse.redirect(new URL(targetHref, url))
}
