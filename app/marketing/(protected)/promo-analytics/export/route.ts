import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { isMarketingPortalRole, normalizeRole } from "@/lib/internal-roles"
import { isMarketingPromoPlacementKey } from "@/lib/marketing-promo-placements"
import { createAdminClient } from "@/lib/supabase/admin"

type PromoEventRow = {
  promo_id: string | null
  promo_slug: string | null
  event_type: string | null
  placement_key: string | null
}

type PromoMetaRow = {
  id: string
  slug: string
  title_id: string | null
  target_href: string | null
}

function resolveRangeDays(range: string) {
  if (range === "today") return 0
  if (range === "30d") return 29
  return 6
}

function escapeCsvValue(value: string | null | undefined) {
  const normalized = String(value || "")
  if (normalized.includes(",") || normalized.includes("\"") || normalized.includes("\n")) {
    return `"${normalized.replace(/"/g, "\"\"")}"`
  }
  return normalized
}

export async function GET(request: Request) {
  const supabase = await createClient("marketing")
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return new NextResponse("Unauthorized", { status: 401 })
  }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle()
  const role = normalizeRole(profile?.role)

  if (!(isMarketingPortalRole(role) || role === "superadmin")) {
    return new NextResponse("Forbidden", { status: 403 })
  }

  const url = new URL(request.url)
  const range = String(url.searchParams.get("range") || "7d").trim()
  const selectedPlacement = String(url.searchParams.get("placement") || "").trim()
  const selectedPromoSlug = String(url.searchParams.get("promo") || "").trim()
  const days = resolveRangeDays(range)
  const now = new Date()
  const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
  const startIso = days === 0 ? new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString() : startDate.toISOString()

  const adminSupabase = createAdminClient()
  const [eventsResult, promosResult] = await Promise.all([
    adminSupabase
      .from("marketing_promo_events")
      .select("promo_id, promo_slug, event_type, placement_key")
      .gte("occurred_at", startIso),
    adminSupabase
      .from("marketing_promos")
      .select("id, slug, title_id, target_href"),
  ])

  if (eventsResult.error) {
    return new NextResponse(eventsResult.error.message, { status: 500 })
  }

  if (promosResult.error) {
    return new NextResponse(promosResult.error.message, { status: 500 })
  }

  const events = (eventsResult.data as PromoEventRow[] | null) || []
  const promos = (promosResult.data as PromoMetaRow[] | null) || []
  const effectivePlacement = isMarketingPromoPlacementKey(selectedPlacement) ? selectedPlacement : ""
  const effectivePromoSlug = selectedPromoSlug && promos.some((promo) => promo.slug === selectedPromoSlug) ? selectedPromoSlug : ""
  const filteredEvents = events.filter((event) => {
    const eventPlacement = String(event.placement_key || "").trim()
    const eventPromoSlug = String(event.promo_slug || "").trim()
    if (effectivePlacement && eventPlacement !== effectivePlacement) return false
    if (effectivePromoSlug && eventPromoSlug !== effectivePromoSlug) return false
    return true
  })
  const promoMap = new Map(promos.map((promo) => [promo.id, promo]))

  const promoStatsMap = new Map<
    string,
    {
      promo_id: string | null
      promo_slug: string
      title_id: string
      target_href: string
      impressions: number
      clicks: number
      placements: Set<string>
    }
  >()

  for (const event of filteredEvents) {
    const promoSlug = String(event.promo_slug || "").trim()
    const promoId = String(event.promo_id || "").trim() || null
    const key = promoId || promoSlug
    if (!key || !promoSlug) continue

    const promoMeta = promoId ? promoMap.get(promoId) : null
    const entry = promoStatsMap.get(key) || {
      promo_id: promoId,
      promo_slug: promoSlug,
      title_id: promoMeta?.title_id || promoSlug,
      target_href: promoMeta?.target_href || "/promo",
      impressions: 0,
      clicks: 0,
      placements: new Set<string>(),
    }

    if (event.event_type === "impression") entry.impressions += 1
    if (event.event_type === "click") entry.clicks += 1
    if (event.placement_key) entry.placements.add(String(event.placement_key))
    promoStatsMap.set(key, entry)
  }

  const rows = Array.from(promoStatsMap.values())
    .map((row) => ({
      ...row,
      ctr: row.impressions > 0 ? ((row.clicks / row.impressions) * 100).toFixed(2) : "0.00",
      placement_count: row.placements.size,
      placement_keys: Array.from(row.placements).join(" | "),
    }))
    .sort((a, b) => {
      if (b.clicks !== a.clicks) return b.clicks - a.clicks
      return b.impressions - a.impressions
    })

  const header = ["promo_id", "promo_slug", "title_id", "target_href", "impressions", "clicks", "ctr_percent", "placement_count", "placement_keys"]
  const lines = [
    header.join(","),
    ...rows.map((row) =>
      [
        escapeCsvValue(row.promo_id),
        escapeCsvValue(row.promo_slug),
        escapeCsvValue(row.title_id),
        escapeCsvValue(row.target_href),
        escapeCsvValue(String(row.impressions)),
        escapeCsvValue(String(row.clicks)),
        escapeCsvValue(row.ctr),
        escapeCsvValue(String(row.placement_count)),
        escapeCsvValue(row.placement_keys),
      ].join(","),
    ),
  ]

  return new NextResponse(lines.join("\n"), {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="marketing-promo-analytics-${range}-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "no-store",
    },
  })
}
