import Link from "next/link"
import { isMarketingPromoPlacementKey, marketingPromoPlacements } from "@/lib/marketing-promo-placements"
import { getMarketingPromoEffectiveState, getMarketingPromoEffectiveStateLabel } from "@/lib/marketing-promo-status"
import { createAdminClient } from "@/lib/supabase/admin"

type PromoAnalyticsSearchParams = {
  range?: string
  placement?: string
  promo?: string
}

type PromoEventRow = {
  promo_id: string | null
  promo_slug: string | null
  event_type: string | null
  placement_key: string | null
  occurred_at: string | null
}

type PromoMetaRow = {
  id: string
  slug: string
  title_id: string | null
  target_href: string | null
  is_active: boolean | null
  status: string | null
  starts_at: string | null
  ends_at: string | null
}

function resolveRangeDays(range: string) {
  if (range === "today") return 0
  if (range === "30d") return 29
  return 6
}

function formatCompactCount(value: number | null | undefined) {
  const amount = Number(value || 0)
  if (amount >= 1000000) return `${(amount / 1000000).toFixed(2)} M`
  if (amount >= 1000) return `${(amount / 1000).toFixed(1)} K`
  return amount.toLocaleString("id-ID")
}

function formatPercent(value: number) {
  return `${value.toFixed(1)}%`
}

function formatTrendDate(value: string) {
  const date = new Date(`${value}T00:00:00`)
  return date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
  })
}

function formatSignedDelta(value: number, formatter: (value: number) => string) {
  const prefix = value > 0 ? "+" : ""
  return `${prefix}${formatter(value)}`
}

export default async function MarketingPromoAnalyticsPage({
  searchParams,
}: {
  searchParams?: Promise<PromoAnalyticsSearchParams>
}) {
  const params = searchParams ? await searchParams : {}
  const range = String(params.range || "7d").trim()
  const selectedPlacement = String(params.placement || "").trim()
  const selectedPromoSlug = String(params.promo || "").trim()
  const days = resolveRangeDays(range)
  const now = new Date()
  const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
  const startIso = days === 0 ? new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString() : startDate.toISOString()
  const comparisonLengthDays = range === "today" ? 1 : days + 1
  const previousPeriodEndDate = new Date(new Date(startIso).getTime() - 1)
  const previousPeriodStartDate = new Date(previousPeriodEndDate.getTime() - (comparisonLengthDays - 1) * 24 * 60 * 60 * 1000)
  const previousStartIso = new Date(
    previousPeriodStartDate.getFullYear(),
    previousPeriodStartDate.getMonth(),
    previousPeriodStartDate.getDate(),
  ).toISOString()
  const previousEndIso = previousPeriodEndDate.toISOString()
  const adminSupabase = createAdminClient()

  const [eventsResult, previousEventsResult, promosResult] = await Promise.all([
    adminSupabase
      .from("marketing_promo_events")
      .select("promo_id, promo_slug, event_type, placement_key, occurred_at")
      .gte("occurred_at", startIso)
      .order("occurred_at", { ascending: false }),
    adminSupabase
      .from("marketing_promo_events")
      .select("promo_id, promo_slug, event_type, placement_key, occurred_at")
      .gte("occurred_at", previousStartIso)
      .lte("occurred_at", previousEndIso)
      .order("occurred_at", { ascending: false }),
    adminSupabase
      .from("marketing_promos")
      .select("id, slug, title_id, target_href, is_active, status, starts_at, ends_at"),
  ])

  const events = (eventsResult.data as PromoEventRow[] | null) || []
  const previousEvents = (previousEventsResult.data as PromoEventRow[] | null) || []
  const promos = (promosResult.data as PromoMetaRow[] | null) || []
  const promoOptions = promos
    .map((promo) => ({
      value: promo.slug,
      label: promo.title_id || promo.slug,
    }))
    .sort((a, b) => a.label.localeCompare(b.label, "id"))
  const effectivePlacement = isMarketingPromoPlacementKey(selectedPlacement) ? selectedPlacement : ""
  const effectivePromoSlug = selectedPromoSlug && promoOptions.some((promo) => promo.value === selectedPromoSlug) ? selectedPromoSlug : ""
  const selectedPromoMeta = effectivePromoSlug
    ? promos.find((promo) => promo.slug === effectivePromoSlug) || null
    : null
  const filteredEvents = events.filter((event) => {
    const eventPlacement = String(event.placement_key || "").trim()
    const eventPromoSlug = String(event.promo_slug || "").trim()
    if (effectivePlacement && eventPlacement !== effectivePlacement) return false
    if (effectivePromoSlug && eventPromoSlug !== effectivePromoSlug) return false
    return true
  })
  const filteredPreviousEvents = previousEvents.filter((event) => {
    const eventPlacement = String(event.placement_key || "").trim()
    const eventPromoSlug = String(event.promo_slug || "").trim()
    if (effectivePlacement && eventPlacement !== effectivePlacement) return false
    if (effectivePromoSlug && eventPromoSlug !== effectivePromoSlug) return false
    return true
  })
  const nowIso = now.toISOString()
  const promoMap = new Map(
    promos.map((promo) => [
      promo.id,
      {
        slug: promo.slug,
        title: promo.title_id || promo.slug,
        targetHref: promo.target_href || "/promo",
        state: getMarketingPromoEffectiveStateLabel(getMarketingPromoEffectiveState(promo, nowIso)),
      },
    ]),
  )

  const totals = filteredEvents.reduce(
    (acc, event) => {
      if (event.event_type === "impression") acc.impressions += 1
      if (event.event_type === "click") acc.clicks += 1
      return acc
    },
    { impressions: 0, clicks: 0 },
  )
  const previousTotals = filteredPreviousEvents.reduce(
    (acc, event) => {
      if (event.event_type === "impression") acc.impressions += 1
      if (event.event_type === "click") acc.clicks += 1
      return acc
    },
    { impressions: 0, clicks: 0 },
  )

  const promoStatsMap = new Map<
    string,
    {
      promoId: string | null
      promoSlug: string
      title: string
      targetHref: string
      state: string
      impressions: number
      clicks: number
      placements: Set<string>
    }
  >()
  const previousPromoStatsMap = new Map<
    string,
    {
      promoId: string | null
      promoSlug: string
      title: string
      targetHref: string
      state: string
      impressions: number
      clicks: number
      placements: Set<string>
    }
  >()

  const placementStatsMap = new Map(
    marketingPromoPlacements.map((placement) => [
      placement.key,
      {
        ...placement,
        impressions: 0,
        clicks: 0,
        promos: new Set<string>(),
      },
    ]),
  )
  const previousPlacementStatsMap = new Map(
    marketingPromoPlacements.map((placement) => [
      placement.key,
      {
        ...placement,
        impressions: 0,
        clicks: 0,
        promos: new Set<string>(),
      },
    ]),
  )

  for (const event of filteredEvents) {
    const promoSlug = String(event.promo_slug || "").trim()
    const promoId = String(event.promo_id || "").trim() || null
    const key = promoId || promoSlug
    if (!key || !promoSlug) continue

    const promoMeta = promoId ? promoMap.get(promoId) : null
    const promoEntry = promoStatsMap.get(key) || {
      promoId,
      promoSlug,
      title: promoMeta?.title || promoSlug,
      targetHref: promoMeta?.targetHref || "/promo",
      state: promoMeta?.state || "Unknown",
      impressions: 0,
      clicks: 0,
      placements: new Set<string>(),
    }

    if (event.event_type === "impression") promoEntry.impressions += 1
    if (event.event_type === "click") promoEntry.clicks += 1
    if (event.placement_key) promoEntry.placements.add(String(event.placement_key))
    promoStatsMap.set(key, promoEntry)

    const placementKey = String(event.placement_key || "")
    if (placementKey && isMarketingPromoPlacementKey(placementKey)) {
      const placementEntry = placementStatsMap.get(placementKey)
      if (placementEntry) {
        if (event.event_type === "impression") placementEntry.impressions += 1
        if (event.event_type === "click") placementEntry.clicks += 1
        placementEntry.promos.add(promoSlug)
      }
    }
  }

  for (const event of filteredPreviousEvents) {
    const promoSlug = String(event.promo_slug || "").trim()
    const promoId = String(event.promo_id || "").trim() || null
    const key = promoId || promoSlug
    if (!key || !promoSlug) continue

    const promoMeta = promoId ? promoMap.get(promoId) : null
    const promoEntry = previousPromoStatsMap.get(key) || {
      promoId,
      promoSlug,
      title: promoMeta?.title || promoSlug,
      targetHref: promoMeta?.targetHref || "/promo",
      state: promoMeta?.state || "Unknown",
      impressions: 0,
      clicks: 0,
      placements: new Set<string>(),
    }

    if (event.event_type === "impression") promoEntry.impressions += 1
    if (event.event_type === "click") promoEntry.clicks += 1
    if (event.placement_key) promoEntry.placements.add(String(event.placement_key))
    previousPromoStatsMap.set(key, promoEntry)

    const placementKey = String(event.placement_key || "")
    if (placementKey && isMarketingPromoPlacementKey(placementKey)) {
      const placementEntry = previousPlacementStatsMap.get(placementKey)
      if (placementEntry) {
        if (event.event_type === "impression") placementEntry.impressions += 1
        if (event.event_type === "click") placementEntry.clicks += 1
        placementEntry.promos.add(promoSlug)
      }
    }
  }

  const promoStats = Array.from(promoStatsMap.values())
    .map((promo) => ({
      ...promo,
      ctr: promo.impressions > 0 ? (promo.clicks / promo.impressions) * 100 : 0,
      placementCount: promo.placements.size,
    }))
    .sort((a, b) => {
      if (b.clicks !== a.clicks) return b.clicks - a.clicks
      if (b.ctr !== a.ctr) return b.ctr - a.ctr
      return b.impressions - a.impressions
    })

  const topCtrPromos = [...promoStats]
    .filter((promo) => promo.impressions > 0)
    .sort((a, b) => {
      if (b.ctr !== a.ctr) return b.ctr - a.ctr
      if (b.clicks !== a.clicks) return b.clicks - a.clicks
      return b.impressions - a.impressions
    })
    .slice(0, 4)

  const previousPromoStats = Array.from(previousPromoStatsMap.values()).map((promo) => ({
    ...promo,
    ctr: promo.impressions > 0 ? (promo.clicks / promo.impressions) * 100 : 0,
    placementCount: promo.placements.size,
  }))
  const previousPromoStatsByKey = new Map(
    previousPromoStats.map((promo) => [promo.promoId || promo.promoSlug, promo]),
  )
  const promoComparison = promoStats
    .map((promo) => {
      const previousPromo = previousPromoStatsByKey.get(promo.promoId || promo.promoSlug)
      return {
        ...promo,
        clicksDelta: promo.clicks - (previousPromo?.clicks || 0),
        impressionsDelta: promo.impressions - (previousPromo?.impressions || 0),
        ctrDelta: promo.ctr - (previousPromo?.ctr || 0),
      }
    })
    .sort((a, b) => {
      if (b.clicksDelta !== a.clicksDelta) return b.clicksDelta - a.clicksDelta
      if (b.ctrDelta !== a.ctrDelta) return b.ctrDelta - a.ctrDelta
      return b.impressionsDelta - a.impressionsDelta
    })
  const risingPromos = promoComparison.filter((promo) => promo.clicksDelta > 0 || promo.ctrDelta > 0).slice(0, 4)
  const fallingPromos = [...promoComparison]
    .filter((promo) => promo.clicksDelta < 0 || promo.ctrDelta < 0)
    .sort((a, b) => {
      if (a.clicksDelta !== b.clicksDelta) return a.clicksDelta - b.clicksDelta
      if (a.ctrDelta !== b.ctrDelta) return a.ctrDelta - b.ctrDelta
      return a.impressionsDelta - b.impressionsDelta
    })
    .slice(0, 4)

  const placementStats = Array.from(placementStatsMap.values())
    .map((placement) => ({
      ...placement,
      ctr: placement.impressions > 0 ? (placement.clicks / placement.impressions) * 100 : 0,
      promoCount: placement.promos.size,
    }))
    .sort((a, b) => {
      if (b.clicks !== a.clicks) return b.clicks - a.clicks
      return b.impressions - a.impressions
    })

  const topCtrPlacements = [...placementStats]
    .filter((placement) => placement.impressions > 0)
    .sort((a, b) => {
      if (b.ctr !== a.ctr) return b.ctr - a.ctr
      if (b.clicks !== a.clicks) return b.clicks - a.clicks
      return b.impressions - a.impressions
    })
    .slice(0, 4)

  const previousPlacementStats = Array.from(previousPlacementStatsMap.values()).map((placement) => ({
    ...placement,
    ctr: placement.impressions > 0 ? (placement.clicks / placement.impressions) * 100 : 0,
    promoCount: placement.promos.size,
  }))
  const previousPlacementStatsByKey = new Map(previousPlacementStats.map((placement) => [placement.key, placement]))
  const placementComparison = placementStats
    .map((placement) => {
      const previousPlacement = previousPlacementStatsByKey.get(placement.key)
      return {
        ...placement,
        clicksDelta: placement.clicks - (previousPlacement?.clicks || 0),
        impressionsDelta: placement.impressions - (previousPlacement?.impressions || 0),
        ctrDelta: placement.ctr - (previousPlacement?.ctr || 0),
      }
    })
    .sort((a, b) => {
      if (b.clicksDelta !== a.clicksDelta) return b.clicksDelta - a.clicksDelta
      if (b.ctrDelta !== a.ctrDelta) return b.ctrDelta - a.ctrDelta
      return b.impressionsDelta - a.impressionsDelta
    })
  const risingPlacements = placementComparison.filter((placement) => placement.clicksDelta > 0 || placement.ctrDelta > 0).slice(0, 4)
  const fallingPlacements = [...placementComparison]
    .filter((placement) => placement.clicksDelta < 0 || placement.ctrDelta < 0)
    .sort((a, b) => {
      if (a.clicksDelta !== b.clicksDelta) return a.clicksDelta - b.clicksDelta
      if (a.ctrDelta !== b.ctrDelta) return a.ctrDelta - b.ctrDelta
      return a.impressionsDelta - b.impressionsDelta
    })
    .slice(0, 4)

  const overallCtr = totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0
  const previousOverallCtr = previousTotals.impressions > 0 ? (previousTotals.clicks / previousTotals.impressions) * 100 : 0
  const touchedPromos = promoStats.length
  const touchedPlacements = placementStats.filter((placement) => placement.impressions > 0 || placement.clicks > 0).length
  const comparisonLabel =
    range === "today" ? "dibanding kemarin" : `${comparisonLengthDays} hari sebelumnya`
  const impressionsDelta = totals.impressions - previousTotals.impressions
  const clicksDelta = totals.clicks - previousTotals.clicks
  const ctrDelta = overallCtr - previousOverallCtr
  const trendDaysCount = range === "today" ? 1 : range === "30d" ? 30 : 7
  const trendSeed = Array.from({ length: trendDaysCount }, (_, index) => {
    const date = new Date(now.getTime() - (trendDaysCount - index - 1) * 24 * 60 * 60 * 1000)
    const dayKey = new Date(date.getFullYear(), date.getMonth(), date.getDate()).toISOString().slice(0, 10)
    return {
      dayKey,
      label: formatTrendDate(dayKey),
      impressions: 0,
      clicks: 0,
    }
  })
  const trendMap = new Map(trendSeed.map((entry) => [entry.dayKey, entry]))

  for (const event of filteredEvents) {
    const dayKey = String(event.occurred_at || "").slice(0, 10)
    const trendEntry = trendMap.get(dayKey)
    if (!trendEntry) continue
    if (event.event_type === "impression") trendEntry.impressions += 1
    if (event.event_type === "click") trendEntry.clicks += 1
  }

  const dailyTrend = trendSeed.map((entry) => ({
    ...entry,
    ctr: entry.impressions > 0 ? (entry.clicks / entry.impressions) * 100 : 0,
  }))
  const bestTrendDay = [...dailyTrend].sort((a, b) => {
    if (b.clicks !== a.clicks) return b.clicks - a.clicks
    if (b.ctr !== a.ctr) return b.ctr - a.ctr
    return b.impressions - a.impressions
  })[0]
  const latestTrend = dailyTrend[dailyTrend.length - 1] || null
  const previousTrend = dailyTrend[dailyTrend.length - 2] || null
  const latestClicksDelta = latestTrend ? latestTrend.clicks - (previousTrend?.clicks || 0) : 0
  const latestImpressionsDelta = latestTrend ? latestTrend.impressions - (previousTrend?.impressions || 0) : 0
  const latestCtrDelta = latestTrend ? latestTrend.ctr - (previousTrend?.ctr || 0) : 0
  const livePromoWithoutClicks = promoStats
    .filter((promo) => promo.state === "Live" && promo.impressions > 0 && promo.clicks === 0)
    .slice(0, 4)
  const sharpCtrDropPromos = [...promoComparison]
    .filter((promo) => promo.ctrDelta <= -5)
    .sort((a, b) => a.ctrDelta - b.ctrDelta)
    .slice(0, 4)
  const lostImpressionPlacements = [...placementComparison]
    .filter((placement) => placement.impressionsDelta < 0)
    .sort((a, b) => a.impressionsDelta - b.impressionsDelta)
    .slice(0, 4)
  const alertCount = livePromoWithoutClicks.length + sharpCtrDropPromos.length + lostImpressionPlacements.length
  const recommendedActions = [
    ...livePromoWithoutClicks.map((promo) => ({
      key: `no-clicks-${promo.promoId || promo.promoSlug}`,
      tone: "amber" as const,
      title: `Periksa CTA dan target link untuk ${promo.title}`,
      detail: `${formatCompactCount(promo.impressions)} impresi tanpa klik. Tinjau copy CTA, target landing, atau relevansi placement.`,
      href: `/marketing/promos?search=${encodeURIComponent(promo.promoSlug)}`,
      cta: "Review promo",
    })),
    ...sharpCtrDropPromos.map((promo) => ({
      key: `ctr-drop-${promo.promoId || promo.promoSlug}`,
      tone: "rose" as const,
      title: `Segarkan creative promo ${promo.title}`,
      detail: `CTR turun ${formatSignedDelta(promo.ctrDelta, (value) => `${value.toFixed(1)} pts`)}. Pertimbangkan ganti visual, headline, atau penawaran.`,
      href: `/marketing/promos?search=${encodeURIComponent(promo.promoSlug)}`,
      cta: "Edit creative",
    })),
    ...lostImpressionPlacements.map((placement) => ({
      key: `placement-drop-${placement.key}`,
      tone: "sky" as const,
      title: `Audit slot ${placement.label}`,
      detail: `Impresi turun ${formatSignedDelta(placement.impressionsDelta, formatCompactCount)}. Cek apakah slot masih terisi promo live atau perlu prioritas campaign baru.`,
      href: `/marketing/promo-analytics?range=${encodeURIComponent(range)}&placement=${encodeURIComponent(placement.key)}`,
      cta: "Buka slot",
    })),
  ].slice(0, 6)
  const strongestPromo = promoStats[0] || null
  const strongestPlacement = placementStats[0] || null
  const strongestRiserPromo = risingPromos[0] || null
  const sharpestFallerPromo = fallingPromos[0] || null
  const managerSummaryLines = [
    `Periode ${range === "today" ? "hari ini" : range === "7d" ? "7 hari terakhir" : "30 hari terakhir"} mencatat ${formatCompactCount(
      totals.impressions,
    )} impresi, ${formatCompactCount(totals.clicks)} klik, dan CTR ${formatPercent(overallCtr)}.`,
    `${formatSignedDelta(impressionsDelta, formatCompactCount)} impresi, ${formatSignedDelta(clicksDelta, formatCompactCount)} klik, dan ${formatSignedDelta(
      ctrDelta,
      (value) => `${value.toFixed(1)} pts`,
    )} CTR ${comparisonLabel}.`,
    strongestPromo
      ? `Promo terkuat saat ini adalah ${strongestPromo.title} dengan ${formatCompactCount(strongestPromo.clicks)} klik dan CTR ${formatPercent(
          strongestPromo.ctr,
        )}.`
      : "Belum ada promo yang menghasilkan event pada periode ini.",
    strongestPlacement
      ? `Placement dengan traffic tertinggi adalah ${strongestPlacement.label} dengan ${formatCompactCount(
          strongestPlacement.impressions,
        )} impresi dan ${formatCompactCount(strongestPlacement.clicks)} klik.`
      : "Belum ada placement yang menerima traffic pada periode ini.",
    strongestRiserPromo
      ? `Promo yang naik paling cepat adalah ${strongestRiserPromo.title} dengan delta ${formatSignedDelta(
          strongestRiserPromo.clicksDelta,
          formatCompactCount,
        )} klik.`
      : "Belum ada promo yang menunjukkan kenaikan signifikan pada periode ini.",
    sharpestFallerPromo
      ? `Promo yang perlu perhatian paling cepat adalah ${sharpestFallerPromo.title} dengan delta ${formatSignedDelta(
          sharpestFallerPromo.clicksDelta,
          formatCompactCount,
        )} klik dan ${formatSignedDelta(sharpestFallerPromo.ctrDelta, (value) => `${value.toFixed(1)} pts`)} CTR.`
      : "Tidak ada promo dengan penurunan yang menonjol pada periode ini.",
    `Total alert aktif: ${formatCompactCount(alertCount)}. Fokus utama ada pada ${
      livePromoWithoutClicks.length
        ? `${formatCompactCount(livePromoWithoutClicks.length)} promo live tanpa klik`
        : sharpCtrDropPromos.length
          ? `${formatCompactCount(sharpCtrDropPromos.length)} promo dengan penurunan CTR`
          : lostImpressionPlacements.length
            ? `${formatCompactCount(lostImpressionPlacements.length)} placement yang kehilangan impresi`
            : "stabilitas campaign yang masih terjaga"
    }.`,
  ]
  const managerSummaryTitle = effectivePromoSlug
    ? `Ringkasan manajer untuk promo ${selectedPromoMeta?.title_id || effectivePromoSlug}`
    : effectivePlacement
      ? `Ringkasan manajer untuk placement ${marketingPromoPlacements.find((placement) => placement.key === effectivePlacement)?.label || effectivePlacement}`
      : "Ringkasan manajer untuk performa promo"
  const exportParams = new URLSearchParams()
  exportParams.set("range", range)
  if (effectivePlacement) exportParams.set("placement", effectivePlacement)
  if (effectivePromoSlug) exportParams.set("promo", effectivePromoSlug)

  const rangeOptions = [
    { value: "today", label: "Hari ini" },
    { value: "7d", label: "7 hari" },
    { value: "30d", label: "30 hari" },
  ]

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fff8f1_0%,#f7f1e8_100%)] px-4 py-5 sm:px-6 sm:py-6 md:px-8 md:py-8 lg:px-10">
      <div className="mx-auto max-w-7xl space-y-5 sm:space-y-6 lg:space-y-8">
        <section className="overflow-hidden rounded-[28px] border border-orange-200/60 bg-[linear-gradient(135deg,#7c2d12_0%,#c2410c_38%,#f97316_72%,#fdba74_100%)] px-5 py-6 text-white shadow-[0_30px_100px_rgba(146,64,14,0.18)] sm:rounded-[32px] sm:px-8 sm:py-8 lg:px-10">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_320px]">
            <div className="max-w-3xl">
              <span className="inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.34em] text-orange-50">
                Promo Analytics
              </span>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:mt-5 sm:text-4xl lg:text-5xl">
                Baca performa promo dari impresi, klik, dan CTR.
              </h1>
              <p className="mt-3 text-sm leading-7 text-orange-50/90 sm:mt-4 sm:text-base sm:leading-8">
                Halaman ini membantu tim marketing membandingkan performa campaign berdasarkan rentang waktu, slot tayang, dan respons pengguna yang benar-benar terjadi.
              </p>
            </div>
            <div className="rounded-[22px] border border-white/20 bg-white/10 px-4 py-4 backdrop-blur sm:rounded-[24px] sm:px-5 sm:py-5">
              <p className="text-[11px] uppercase tracking-[0.28em] text-orange-100/80">Analytics snapshot</p>
              <div className="mt-5 grid gap-4">
                <div>
                  <p className="text-sm text-orange-50/80">Impresi</p>
                  <p className="mt-1 text-2xl font-semibold text-white sm:text-3xl">{formatCompactCount(totals.impressions)}</p>
                </div>
                <div>
                  <p className="text-sm text-orange-50/80">Klik</p>
                  <p className="mt-1 text-2xl font-semibold text-white sm:text-3xl">{formatCompactCount(totals.clicks)}</p>
                </div>
                <div>
                  <p className="text-sm text-orange-50/80">CTR</p>
                  <p className="mt-1 text-2xl font-semibold text-white sm:text-3xl">{formatPercent(overallCtr)}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[24px] border border-[#f3dbc3] bg-white/85 p-5 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur-sm sm:rounded-[32px] sm:p-6 lg:p-7">
          <form className="flex flex-wrap items-end gap-4">
            <div className="min-w-[220px]">
              <label className="mb-2 block text-sm font-medium text-slate-700">Rentang waktu</label>
              <select
                name="range"
                defaultValue={range}
                className="w-full rounded-[18px] border border-[#e6d8c2] bg-[#fffdf9] px-4 py-3 text-sm outline-none ring-orange-500 transition focus:ring-2"
              >
                {rangeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="min-w-[220px]">
              <label className="mb-2 block text-sm font-medium text-slate-700">Placement</label>
              <select
                name="placement"
                defaultValue={effectivePlacement}
                className="w-full rounded-[18px] border border-[#e6d8c2] bg-[#fffdf9] px-4 py-3 text-sm outline-none ring-orange-500 transition focus:ring-2"
              >
                <option value="">Semua placement</option>
                {marketingPromoPlacements.map((placement) => (
                  <option key={placement.key} value={placement.key}>
                    {placement.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="min-w-[220px]">
              <label className="mb-2 block text-sm font-medium text-slate-700">Promo</label>
              <select
                name="promo"
                defaultValue={effectivePromoSlug}
                className="w-full rounded-[18px] border border-[#e6d8c2] bg-[#fffdf9] px-4 py-3 text-sm outline-none ring-orange-500 transition focus:ring-2"
              >
                <option value="">Semua promo</option>
                {promoOptions.map((promo) => (
                  <option key={promo.value} value={promo.value}>
                    {promo.label}
                  </option>
                ))}
              </select>
            </div>
            <button className="rounded-[18px] bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800">
              Terapkan filter
            </button>
            <Link
              href={`/marketing/promo-analytics/export?${exportParams.toString()}`}
              className="rounded-[18px] border border-orange-200 bg-orange-50 px-5 py-3 text-sm font-semibold text-orange-700 transition hover:border-orange-300 hover:bg-orange-100"
            >
              Export CSV
            </Link>
          </form>
        </section>

        <section className="grid gap-3 sm:gap-4 md:grid-cols-2 xl:grid-cols-5">
          {[
            { label: "Impresi", value: formatCompactCount(totals.impressions), note: "Jumlah tampil promo yang tercatat pada slot publik." },
            { label: "Klik", value: formatCompactCount(totals.clicks), note: "Klik CTA promo yang mengarah ke target campaign." },
            { label: "CTR", value: formatPercent(overallCtr), note: "Rasio klik dibanding impresi untuk rentang waktu ini." },
            { label: "Promo tersentuh", value: formatCompactCount(touchedPromos), note: "Promo yang menerima impresi atau klik pada periode ini." },
            { label: "Placement aktif", value: formatCompactCount(touchedPlacements), note: "Slot publik yang benar-benar menerima traffic promo." },
          ].map((card) => (
            <article key={card.label} className="rounded-[22px] border border-[#f0ddc7] bg-white px-4 py-4 shadow-[0_18px_44px_rgba(15,23,42,0.06)] sm:rounded-[26px] sm:px-5 sm:py-5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-orange-500">{card.label}</p>
              <p className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-slate-950 sm:text-3xl">{card.value}</p>
              <p className="mt-2 text-xs leading-6 text-slate-500">{card.note}</p>
            </article>
          ))}
        </section>

        <section className="rounded-[24px] border border-[#f3dbc3] bg-white/85 p-5 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur-sm sm:rounded-[32px] sm:p-6 lg:p-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-orange-500">Manager report summary</p>
              <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-slate-950 sm:text-2xl">{managerSummaryTitle}</h2>
              <p className="mt-2 text-sm text-slate-500">
                Blok ini disusun untuk dibaca cepat oleh marketing manager dan cukup ringkas untuk diteruskan ke superadmin sebagai executive summary.
              </p>
            </div>
            <div className="rounded-[20px] border border-[#efe1cf] bg-[#fffaf3] px-4 py-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Executive lines</p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">{formatCompactCount(managerSummaryLines.length)}</p>
            </div>
          </div>

          <div className="mt-5 grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
            <article className="rounded-[22px] border border-[#efe1cf] bg-[#fffaf3] px-5 py-4">
              <p className="text-sm font-semibold text-slate-950">Poin utama</p>
              <div className="mt-3 space-y-3">
                {managerSummaryLines.map((line, index) => (
                  <div key={`summary-${index}`} className="rounded-[16px] border border-white bg-white px-4 py-3 text-sm leading-6 text-slate-600">
                    {index + 1}. {line}
                  </div>
                ))}
              </div>
            </article>

            <article className="rounded-[22px] border border-[#efe1cf] bg-[#fffaf3] px-5 py-4">
              <p className="text-sm font-semibold text-slate-950">Versi siap kirim</p>
              <div className="mt-3 rounded-[18px] border border-slate-200 bg-white px-4 py-4">
                <pre className="whitespace-pre-wrap break-words font-sans text-sm leading-6 text-slate-600">
{`${managerSummaryTitle}

${managerSummaryLines.map((line, index) => `${index + 1}. ${line}`).join("\n")}`}
                </pre>
              </div>
            </article>
          </div>
        </section>

        <section className="rounded-[24px] border border-[#f3dbc3] bg-white/85 p-5 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur-sm sm:rounded-[32px] sm:p-6 lg:p-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-orange-500">Alert summary</p>
              <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-slate-950 sm:text-2xl">Sinyal yang butuh perhatian cepat</h2>
              <p className="mt-2 text-sm text-slate-500">
                Alert ini membaca promo live tanpa klik, penurunan CTR yang tajam, dan placement yang kehilangan impresi dibanding periode sebelumnya.
              </p>
            </div>
            <div className="rounded-[20px] border border-[#efe1cf] bg-[#fffaf3] px-4 py-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Alert count</p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">{formatCompactCount(alertCount)}</p>
            </div>
          </div>

          <div className="mt-5 grid gap-4 xl:grid-cols-3">
            <article className="rounded-[22px] border border-[#f3e1c7] bg-[#fffaf3] px-5 py-4">
              <p className="text-sm font-semibold text-amber-700">Promo live tanpa klik</p>
              <div className="mt-3 space-y-3">
                {!livePromoWithoutClicks.length ? (
                  <p className="text-sm text-slate-500">Tidak ada promo live yang tampil tanpa klik pada periode ini.</p>
                ) : (
                  livePromoWithoutClicks.map((promo) => (
                    <div key={`alert-live-${promo.promoId || promo.promoSlug}`} className="rounded-[16px] border border-amber-100 bg-white px-4 py-3">
                      <p className="text-sm font-semibold text-slate-950">{promo.title}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {formatCompactCount(promo.impressions)} impresi, {formatCompactCount(promo.clicks)} klik
                      </p>
                    </div>
                  ))
                )}
              </div>
            </article>

            <article className="rounded-[22px] border border-[#f3e1c7] bg-[#fffaf3] px-5 py-4">
              <p className="text-sm font-semibold text-rose-700">CTR turun tajam</p>
              <div className="mt-3 space-y-3">
                {!sharpCtrDropPromos.length ? (
                  <p className="text-sm text-slate-500">Tidak ada promo dengan penurunan CTR 5 poin atau lebih.</p>
                ) : (
                  sharpCtrDropPromos.map((promo) => (
                    <div key={`alert-ctr-${promo.promoId || promo.promoSlug}`} className="rounded-[16px] border border-rose-100 bg-white px-4 py-3">
                      <p className="text-sm font-semibold text-slate-950">{promo.title}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        Delta CTR {formatSignedDelta(promo.ctrDelta, (value) => `${value.toFixed(1)} pts`)}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </article>

            <article className="rounded-[22px] border border-[#f3e1c7] bg-[#fffaf3] px-5 py-4">
              <p className="text-sm font-semibold text-sky-700">Placement kehilangan impresi</p>
              <div className="mt-3 space-y-3">
                {!lostImpressionPlacements.length ? (
                  <p className="text-sm text-slate-500">Tidak ada placement yang kehilangan impresi pada periode ini.</p>
                ) : (
                  lostImpressionPlacements.map((placement) => (
                    <div key={`alert-placement-${placement.key}`} className="rounded-[16px] border border-sky-100 bg-white px-4 py-3">
                      <p className="text-sm font-semibold text-slate-950">{placement.label}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        Delta impresi {formatSignedDelta(placement.impressionsDelta, formatCompactCount)}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </article>
          </div>
        </section>

        <section className="rounded-[24px] border border-[#f3dbc3] bg-white/85 p-5 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur-sm sm:rounded-[32px] sm:p-6 lg:p-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-orange-500">Recommended actions</p>
              <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-slate-950 sm:text-2xl">Saran tindak lanjut berdasarkan alert</h2>
              <p className="mt-2 text-sm text-slate-500">
                Blok ini tidak mengubah campaign secara otomatis. Ia hanya menyarankan langkah yang paling masuk akal dari sinyal yang sedang muncul.
              </p>
            </div>
            <div className="rounded-[20px] border border-[#efe1cf] bg-[#fffaf3] px-4 py-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Action queue</p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">{formatCompactCount(recommendedActions.length)}</p>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {!recommendedActions.length ? (
              <div className="rounded-[24px] border border-dashed border-[#e8d7c1] bg-[#fffaf3] px-5 py-6 text-sm text-slate-500">
                Belum ada tindakan yang direkomendasikan. Alert utama saat ini terlihat stabil.
              </div>
            ) : (
              recommendedActions.map((action) => {
                const toneClasses =
                  action.tone === "rose"
                    ? "border-rose-100 bg-[#fff8f8] text-rose-700"
                    : action.tone === "sky"
                      ? "border-sky-100 bg-[#f7fcff] text-sky-700"
                      : "border-amber-100 bg-[#fffaf3] text-amber-700"

                return (
                  <article key={action.key} className="rounded-[22px] border border-[#efe1cf] bg-white px-5 py-4">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="max-w-3xl">
                        <span className={`inline-flex rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${toneClasses}`}>
                          Action
                        </span>
                        <p className="mt-3 text-sm font-semibold text-slate-950">{action.title}</p>
                        <p className="mt-2 text-sm leading-6 text-slate-500">{action.detail}</p>
                      </div>
                      <Link
                        href={action.href}
                        className="rounded-[18px] border border-orange-200 bg-orange-50 px-4 py-3 text-sm font-semibold text-orange-700 transition hover:border-orange-300 hover:bg-orange-100"
                      >
                        {action.cta}
                      </Link>
                    </div>
                  </article>
                )
              })
            )}
          </div>
        </section>

        <section className="rounded-[24px] border border-[#f3dbc3] bg-white/85 p-5 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur-sm sm:rounded-[32px] sm:p-6 lg:p-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-orange-500">Comparison mode</p>
              <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-slate-950 sm:text-2xl">Bandingkan periode aktif dengan periode sebelumnya</h2>
              <p className="mt-2 text-sm text-slate-500">
                Pembacaan ini memakai window yang sama panjang, {comparisonLabel}, lalu mengikuti filter placement dan promo yang sedang aktif.
              </p>
            </div>
            <div className="rounded-[20px] border border-[#efe1cf] bg-[#fffaf3] px-4 py-4 text-sm text-slate-500">
              Basis banding: {range === "today" ? "hari ini vs kemarin" : `${comparisonLengthDays} hari ini vs ${comparisonLengthDays} hari sebelumnya`}
            </div>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <article className="rounded-[20px] border border-[#efe1cf] bg-[#fffaf3] px-4 py-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Impresi</p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">{formatCompactCount(totals.impressions)}</p>
              <p className="mt-1 text-xs text-slate-500">
                {formatSignedDelta(impressionsDelta, formatCompactCount)} {comparisonLabel}
              </p>
            </article>
            <article className="rounded-[20px] border border-[#efe1cf] bg-[#fffaf3] px-4 py-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Klik</p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">{formatCompactCount(totals.clicks)}</p>
              <p className="mt-1 text-xs text-slate-500">
                {formatSignedDelta(clicksDelta, formatCompactCount)} {comparisonLabel}
              </p>
            </article>
            <article className="rounded-[20px] border border-[#efe1cf] bg-[#fffaf3] px-4 py-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">CTR</p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">{formatPercent(overallCtr)}</p>
              <p className="mt-1 text-xs text-slate-500">
                {formatSignedDelta(ctrDelta, (value) => `${value.toFixed(1)} pts`)} {comparisonLabel}
              </p>
            </article>
          </div>
        </section>

        <section className="grid gap-4 sm:gap-6 xl:grid-cols-2">
          <article className="rounded-[24px] border border-[#f3dbc3] bg-white/85 p-5 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur-sm sm:rounded-[32px] sm:p-6 lg:p-7">
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-orange-500">Promo comparison leaderboard</p>
            <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-slate-950 sm:text-2xl">Promo yang naik dan turun paling terasa</h2>
            <div className="mt-5 grid gap-4 xl:grid-cols-2">
              <div className="space-y-3">
                <p className="text-sm font-semibold text-emerald-700">Rising promos</p>
                {!risingPromos.length ? (
                  <div className="rounded-[20px] border border-dashed border-[#d7eadf] bg-[#f8fffb] px-4 py-5 text-sm text-slate-500">
                    Belum ada promo yang menunjukkan kenaikan pada periode ini.
                  </div>
                ) : (
                  risingPromos.map((promo) => (
                    <article key={`rise-${promo.promoId || promo.promoSlug}`} className="rounded-[20px] border border-[#d7eadf] bg-[#f8fffb] px-4 py-4">
                      <p className="text-sm font-semibold text-slate-950">{promo.title}</p>
                      <p className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">{promo.promoSlug}</p>
                      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                        <div className="rounded-[14px] border border-emerald-100 bg-white px-3 py-2">
                          <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">Klik</p>
                          <p className="mt-1 text-sm font-semibold text-slate-950">{formatSignedDelta(promo.clicksDelta, formatCompactCount)}</p>
                        </div>
                        <div className="rounded-[14px] border border-emerald-100 bg-white px-3 py-2">
                          <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">CTR</p>
                          <p className="mt-1 text-sm font-semibold text-slate-950">{formatSignedDelta(promo.ctrDelta, (value) => `${value.toFixed(1)} pts`)}</p>
                        </div>
                        <div className="rounded-[14px] border border-emerald-100 bg-white px-3 py-2">
                          <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">Impresi</p>
                          <p className="mt-1 text-sm font-semibold text-slate-950">{formatSignedDelta(promo.impressionsDelta, formatCompactCount)}</p>
                        </div>
                      </div>
                    </article>
                  ))
                )}
              </div>

              <div className="space-y-3">
                <p className="text-sm font-semibold text-rose-700">Falling promos</p>
                {!fallingPromos.length ? (
                  <div className="rounded-[20px] border border-dashed border-[#f1d5d8] bg-[#fff8f8] px-4 py-5 text-sm text-slate-500">
                    Belum ada promo yang menunjukkan penurunan pada periode ini.
                  </div>
                ) : (
                  fallingPromos.map((promo) => (
                    <article key={`fall-${promo.promoId || promo.promoSlug}`} className="rounded-[20px] border border-[#f1d5d8] bg-[#fff8f8] px-4 py-4">
                      <p className="text-sm font-semibold text-slate-950">{promo.title}</p>
                      <p className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-rose-700">{promo.promoSlug}</p>
                      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                        <div className="rounded-[14px] border border-rose-100 bg-white px-3 py-2">
                          <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">Klik</p>
                          <p className="mt-1 text-sm font-semibold text-slate-950">{formatSignedDelta(promo.clicksDelta, formatCompactCount)}</p>
                        </div>
                        <div className="rounded-[14px] border border-rose-100 bg-white px-3 py-2">
                          <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">CTR</p>
                          <p className="mt-1 text-sm font-semibold text-slate-950">{formatSignedDelta(promo.ctrDelta, (value) => `${value.toFixed(1)} pts`)}</p>
                        </div>
                        <div className="rounded-[14px] border border-rose-100 bg-white px-3 py-2">
                          <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">Impresi</p>
                          <p className="mt-1 text-sm font-semibold text-slate-950">{formatSignedDelta(promo.impressionsDelta, formatCompactCount)}</p>
                        </div>
                      </div>
                    </article>
                  ))
                )}
              </div>
            </div>
          </article>

          <article className="rounded-[24px] border border-[#f3dbc3] bg-white/85 p-5 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur-sm sm:rounded-[32px] sm:p-6 lg:p-7">
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-orange-500">Placement comparison leaderboard</p>
            <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-slate-950 sm:text-2xl">Slot yang naik dan turun paling cepat</h2>
            <div className="mt-5 grid gap-4 xl:grid-cols-2">
              <div className="space-y-3">
                <p className="text-sm font-semibold text-emerald-700">Rising placements</p>
                {!risingPlacements.length ? (
                  <div className="rounded-[20px] border border-dashed border-[#d7eadf] bg-[#f8fffb] px-4 py-5 text-sm text-slate-500">
                    Belum ada placement yang menunjukkan kenaikan pada periode ini.
                  </div>
                ) : (
                  risingPlacements.map((placement) => (
                    <article key={`rise-placement-${placement.key}`} className="rounded-[20px] border border-[#d7eadf] bg-[#f8fffb] px-4 py-4">
                      <p className="text-sm font-semibold text-slate-950">{placement.label}</p>
                      <p className="mt-1 text-xs text-slate-500">{placement.description}</p>
                      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                        <div className="rounded-[14px] border border-emerald-100 bg-white px-3 py-2">
                          <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">Klik</p>
                          <p className="mt-1 text-sm font-semibold text-slate-950">{formatSignedDelta(placement.clicksDelta, formatCompactCount)}</p>
                        </div>
                        <div className="rounded-[14px] border border-emerald-100 bg-white px-3 py-2">
                          <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">CTR</p>
                          <p className="mt-1 text-sm font-semibold text-slate-950">{formatSignedDelta(placement.ctrDelta, (value) => `${value.toFixed(1)} pts`)}</p>
                        </div>
                        <div className="rounded-[14px] border border-emerald-100 bg-white px-3 py-2">
                          <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">Impresi</p>
                          <p className="mt-1 text-sm font-semibold text-slate-950">{formatSignedDelta(placement.impressionsDelta, formatCompactCount)}</p>
                        </div>
                      </div>
                    </article>
                  ))
                )}
              </div>

              <div className="space-y-3">
                <p className="text-sm font-semibold text-rose-700">Falling placements</p>
                {!fallingPlacements.length ? (
                  <div className="rounded-[20px] border border-dashed border-[#f1d5d8] bg-[#fff8f8] px-4 py-5 text-sm text-slate-500">
                    Belum ada placement yang menunjukkan penurunan pada periode ini.
                  </div>
                ) : (
                  fallingPlacements.map((placement) => (
                    <article key={`fall-placement-${placement.key}`} className="rounded-[20px] border border-[#f1d5d8] bg-[#fff8f8] px-4 py-4">
                      <p className="text-sm font-semibold text-slate-950">{placement.label}</p>
                      <p className="mt-1 text-xs text-slate-500">{placement.description}</p>
                      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                        <div className="rounded-[14px] border border-rose-100 bg-white px-3 py-2">
                          <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">Klik</p>
                          <p className="mt-1 text-sm font-semibold text-slate-950">{formatSignedDelta(placement.clicksDelta, formatCompactCount)}</p>
                        </div>
                        <div className="rounded-[14px] border border-rose-100 bg-white px-3 py-2">
                          <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">CTR</p>
                          <p className="mt-1 text-sm font-semibold text-slate-950">{formatSignedDelta(placement.ctrDelta, (value) => `${value.toFixed(1)} pts`)}</p>
                        </div>
                        <div className="rounded-[14px] border border-rose-100 bg-white px-3 py-2">
                          <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">Impresi</p>
                          <p className="mt-1 text-sm font-semibold text-slate-950">{formatSignedDelta(placement.impressionsDelta, formatCompactCount)}</p>
                        </div>
                      </div>
                    </article>
                  ))
                )}
              </div>
            </div>
          </article>
        </section>

        <section className="rounded-[24px] border border-[#f3dbc3] bg-white/85 p-5 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur-sm sm:rounded-[32px] sm:p-6 lg:p-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-orange-500">Focused campaign trend</p>
              <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-slate-950 sm:text-2xl">
                {selectedPromoMeta ? selectedPromoMeta.title_id || selectedPromoMeta.slug : "Pilih satu promo untuk mode fokus"}
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                {selectedPromoMeta
                  ? `Trend di bawah ini sudah terkunci ke promo ${selectedPromoMeta.slug}, sehingga perubahan impresi, klik, dan CTR bisa dibaca sebagai ritme campaign tunggal.`
                  : "Gunakan filter promo di atas agar halaman ini menampilkan pembacaan harian yang khusus untuk satu campaign."}
              </p>
            </div>
            {selectedPromoMeta ? (
              <Link
                href={`/marketing/promos?search=${encodeURIComponent(selectedPromoMeta.slug)}`}
                className="rounded-[18px] border border-orange-200 bg-orange-50 px-5 py-3 text-sm font-semibold text-orange-700 transition hover:border-orange-300 hover:bg-orange-100"
              >
                Buka promo
              </Link>
            ) : null}
          </div>

          {selectedPromoMeta ? (
            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <article className="rounded-[20px] border border-[#efe1cf] bg-[#fffaf3] px-4 py-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Total impresi</p>
                <p className="mt-2 text-2xl font-semibold text-slate-950">{formatCompactCount(totals.impressions)}</p>
              </article>
              <article className="rounded-[20px] border border-[#efe1cf] bg-[#fffaf3] px-4 py-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Total klik</p>
                <p className="mt-2 text-2xl font-semibold text-slate-950">{formatCompactCount(totals.clicks)}</p>
              </article>
              <article className="rounded-[20px] border border-[#efe1cf] bg-[#fffaf3] px-4 py-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">CTR campaign</p>
                <p className="mt-2 text-2xl font-semibold text-slate-950">{formatPercent(overallCtr)}</p>
              </article>
              <article className="rounded-[20px] border border-[#efe1cf] bg-[#fffaf3] px-4 py-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Placement tersentuh</p>
                <p className="mt-2 text-2xl font-semibold text-slate-950">{formatCompactCount(touchedPlacements)}</p>
              </article>
            </div>
          ) : (
            <div className="mt-5 rounded-[24px] border border-dashed border-[#e8d7c1] bg-[#fffaf3] px-5 py-6 text-sm text-slate-500">
              Belum ada promo yang dipilih. Setelah satu promo dipilih, blok ini akan menampilkan ringkasan campaign tunggal beserta tren hariannya.
            </div>
          )}
        </section>

        <section className="grid gap-4 sm:gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <article className="rounded-[24px] border border-[#f3dbc3] bg-white/85 p-5 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur-sm sm:rounded-[32px] sm:p-6 lg:p-7">
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-orange-500">Daily trend</p>
            <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-slate-950 sm:text-2xl">Arah performa per hari</h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <div className="rounded-[20px] border border-[#efe1cf] bg-[#fffaf3] px-4 py-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Hari terbaru</p>
                <p className="mt-2 text-sm font-semibold text-slate-950">{latestTrend ? latestTrend.label : "-"}</p>
                <p className="mt-1 text-xs text-slate-500">
                  Klik {latestClicksDelta >= 0 ? "+" : ""}
                  {formatCompactCount(latestClicksDelta)} vs hari sebelumnya
                </p>
              </div>
              <div className="rounded-[20px] border border-[#efe1cf] bg-[#fffaf3] px-4 py-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Impresi terbaru</p>
                <p className="mt-2 text-sm font-semibold text-slate-950">{latestTrend ? formatCompactCount(latestTrend.impressions) : "0"}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {latestImpressionsDelta >= 0 ? "+" : ""}
                  {formatCompactCount(latestImpressionsDelta)} vs hari sebelumnya
                </p>
              </div>
              <div className="rounded-[20px] border border-[#efe1cf] bg-[#fffaf3] px-4 py-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">CTR terbaru</p>
                <p className="mt-2 text-sm font-semibold text-slate-950">{latestTrend ? formatPercent(latestTrend.ctr) : "0.0%"}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {latestCtrDelta >= 0 ? "+" : ""}
                  {latestCtrDelta.toFixed(1)} pts vs hari sebelumnya
                </p>
              </div>
            </div>
            <div className="mt-4 rounded-[20px] border border-[#efe1cf] bg-[#fffaf3] px-4 py-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Hari performa terkuat</p>
              <p className="mt-2 text-sm font-semibold text-slate-950">{bestTrendDay ? bestTrendDay.label : "-"}</p>
              <p className="mt-1 text-xs text-slate-500">
                {bestTrendDay
                  ? `${formatCompactCount(bestTrendDay.clicks)} klik, ${formatCompactCount(bestTrendDay.impressions)} impresi, CTR ${formatPercent(bestTrendDay.ctr)}`
                  : "Belum ada data harian pada rentang ini."}
              </p>
            </div>
          </article>

          <article className="rounded-[24px] border border-[#f3dbc3] bg-white/85 p-5 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur-sm sm:rounded-[32px] sm:p-6 lg:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-orange-500">Trend table</p>
                <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-slate-950 sm:text-2xl">Impresi, klik, dan CTR per hari</h2>
              </div>
              <p className="text-xs text-slate-500">{trendDaysCount} hari terakhir</p>
            </div>
            <div className="mt-5 overflow-x-auto">
              <table className="min-w-full border-separate border-spacing-y-2">
                <thead>
                  <tr>
                    <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Tanggal</th>
                    <th className="px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Impresi</th>
                    <th className="px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Klik</th>
                    <th className="px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">CTR</th>
                  </tr>
                </thead>
                <tbody>
                  {dailyTrend.map((day) => (
                    <tr key={day.dayKey} className="rounded-[18px] bg-[#fffaf3]">
                      <td className="rounded-l-[18px] border-y border-l border-[#efe1cf] px-3 py-3 text-sm font-semibold text-slate-950">
                        {day.label}
                      </td>
                      <td className="border-y border-[#efe1cf] px-3 py-3 text-right text-sm text-slate-700">
                        {formatCompactCount(day.impressions)}
                      </td>
                      <td className="border-y border-[#efe1cf] px-3 py-3 text-right text-sm text-slate-700">
                        {formatCompactCount(day.clicks)}
                      </td>
                      <td className="rounded-r-[18px] border-y border-r border-[#efe1cf] px-3 py-3 text-right text-sm font-semibold text-slate-950">
                        {formatPercent(day.ctr)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>
        </section>

        <section className="grid gap-4 sm:gap-6 xl:grid-cols-2">
          <article className="rounded-[24px] border border-[#f3dbc3] bg-white/85 p-5 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur-sm sm:rounded-[32px] sm:p-6 lg:p-7">
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-orange-500">Top promo CTR</p>
            <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-slate-950 sm:text-2xl">Promo dengan rasio klik paling kuat</h2>
            <div className="mt-5 space-y-3">
              {!topCtrPromos.length ? (
                <div className="rounded-[24px] border border-dashed border-[#e8d7c1] bg-[#fffaf3] px-5 py-6 text-sm text-slate-500">
                  Belum ada promo dengan impresi untuk dihitung CTR-nya.
                </div>
              ) : (
                topCtrPromos.map((promo, index) => (
                  <article key={`ctr-${promo.promoId || promo.promoSlug}-${index}`} className="rounded-[22px] border border-[#efe1cf] bg-[#fffaf3] px-5 py-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-orange-500">CTR rank #{index + 1}</p>
                        <p className="mt-2 text-sm font-semibold text-slate-950">{promo.title}</p>
                        <p className="mt-1 text-xs font-semibold uppercase tracking-[0.18em] text-orange-600">{promo.promoSlug}</p>
                        <p className="mt-2 text-xs text-slate-500">State: {promo.state}</p>
                      </div>
                      <div className="grid min-w-[180px] grid-cols-3 gap-2 text-center">
                        <div className="rounded-[16px] border border-slate-200 bg-white px-3 py-3">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">CTR</p>
                          <p className="mt-1 text-sm font-semibold text-slate-950">{formatPercent(promo.ctr)}</p>
                        </div>
                        <div className="rounded-[16px] border border-slate-200 bg-white px-3 py-3">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Klik</p>
                          <p className="mt-1 text-sm font-semibold text-slate-950">{formatCompactCount(promo.clicks)}</p>
                        </div>
                        <div className="rounded-[16px] border border-slate-200 bg-white px-3 py-3">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Impresi</p>
                          <p className="mt-1 text-sm font-semibold text-slate-950">{formatCompactCount(promo.impressions)}</p>
                        </div>
                      </div>
                    </div>
                  </article>
                ))
              )}
            </div>
          </article>

          <article className="rounded-[24px] border border-[#f3dbc3] bg-white/85 p-5 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur-sm sm:rounded-[32px] sm:p-6 lg:p-7">
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-orange-500">Top placement CTR</p>
            <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-slate-950 sm:text-2xl">Slot publik dengan respons klik terbaik</h2>
            <div className="mt-5 space-y-3">
              {!topCtrPlacements.length ? (
                <div className="rounded-[24px] border border-dashed border-[#e8d7c1] bg-[#fffaf3] px-5 py-6 text-sm text-slate-500">
                  Belum ada placement dengan impresi untuk dihitung CTR-nya.
                </div>
              ) : (
                topCtrPlacements.map((placement, index) => (
                  <article key={`placement-ctr-${placement.key}-${index}`} className="rounded-[22px] border border-[#efe1cf] bg-[#fffaf3] px-5 py-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-orange-500">Slot rank #{index + 1}</p>
                        <p className="mt-2 text-sm font-semibold text-slate-950">{placement.label}</p>
                        <p className="mt-1 text-xs text-slate-500">{placement.description}</p>
                      </div>
                      <div className="grid min-w-[180px] grid-cols-3 gap-2 text-center">
                        <div className="rounded-[16px] border border-slate-200 bg-white px-3 py-3">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">CTR</p>
                          <p className="mt-1 text-sm font-semibold text-slate-950">{formatPercent(placement.ctr)}</p>
                        </div>
                        <div className="rounded-[16px] border border-slate-200 bg-white px-3 py-3">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Klik</p>
                          <p className="mt-1 text-sm font-semibold text-slate-950">{formatCompactCount(placement.clicks)}</p>
                        </div>
                        <div className="rounded-[16px] border border-slate-200 bg-white px-3 py-3">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Impresi</p>
                          <p className="mt-1 text-sm font-semibold text-slate-950">{formatCompactCount(placement.impressions)}</p>
                        </div>
                      </div>
                    </div>
                  </article>
                ))
              )}
            </div>
          </article>
        </section>

        <section className="grid gap-4 sm:gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <article className="rounded-[24px] border border-[#f3dbc3] bg-white/85 p-5 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur-sm sm:rounded-[32px] sm:p-6 lg:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-orange-500">Top promos</p>
                <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-slate-950 sm:text-2xl">Performa promo per campaign</h2>
              </div>
              <Link href="/marketing/promos" className="text-sm font-semibold text-orange-600">Kelola promo</Link>
            </div>
            <div className="mt-5 space-y-3">
              {!promoStats.length ? (
                <div className="rounded-[24px] border border-dashed border-[#e8d7c1] bg-[#fffaf3] px-5 py-6 text-sm text-slate-500">
                  Belum ada event promo untuk rentang waktu ini.
                </div>
              ) : (
                promoStats.slice(0, 12).map((promo, index) => (
                  <article key={`${promo.promoId || promo.promoSlug}-${index}`} className="rounded-[22px] border border-[#efe1cf] bg-[#fffaf3] px-5 py-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-orange-500">Rank #{index + 1}</p>
                        <p className="mt-2 text-sm font-semibold text-slate-950">{promo.title}</p>
                        <p className="mt-1 text-xs font-semibold uppercase tracking-[0.18em] text-orange-600">{promo.promoSlug}</p>
                        <p className="mt-2 text-xs text-slate-500">State: {promo.state}</p>
                        <p className="mt-1 text-xs text-slate-500">Target: {promo.targetHref}</p>
                      </div>
                      <div className="grid min-w-[240px] grid-cols-4 gap-2 text-center">
                        <div className="rounded-[16px] border border-slate-200 bg-white px-3 py-3">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Impresi</p>
                          <p className="mt-1 text-sm font-semibold text-slate-950">{formatCompactCount(promo.impressions)}</p>
                        </div>
                        <div className="rounded-[16px] border border-slate-200 bg-white px-3 py-3">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Klik</p>
                          <p className="mt-1 text-sm font-semibold text-slate-950">{formatCompactCount(promo.clicks)}</p>
                        </div>
                        <div className="rounded-[16px] border border-slate-200 bg-white px-3 py-3">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">CTR</p>
                          <p className="mt-1 text-sm font-semibold text-slate-950">{formatPercent(promo.ctr)}</p>
                        </div>
                        <div className="rounded-[16px] border border-slate-200 bg-white px-3 py-3">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Slot</p>
                          <p className="mt-1 text-sm font-semibold text-slate-950">{formatCompactCount(promo.placementCount)}</p>
                        </div>
                      </div>
                    </div>
                  </article>
                ))
              )}
            </div>
          </article>

          <article className="rounded-[24px] border border-[#f3dbc3] bg-white/85 p-5 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur-sm sm:rounded-[32px] sm:p-6 lg:p-7">
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-orange-500">Placement breakdown</p>
            <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-slate-950 sm:text-2xl">Performa per slot publik</h2>
            <div className="mt-5 space-y-3">
              {placementStats.map((placement) => (
                <article key={placement.key} className="rounded-[22px] border border-[#efe1cf] bg-[#fffaf3] px-5 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-950">{placement.label}</p>
                      <p className="mt-1 text-xs text-slate-500">{placement.description}</p>
                    </div>
                    <div className="grid min-w-[220px] grid-cols-3 gap-2 text-center">
                      <div className="rounded-[16px] border border-slate-200 bg-white px-3 py-3">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Impresi</p>
                        <p className="mt-1 text-sm font-semibold text-slate-950">{formatCompactCount(placement.impressions)}</p>
                      </div>
                      <div className="rounded-[16px] border border-slate-200 bg-white px-3 py-3">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Klik</p>
                        <p className="mt-1 text-sm font-semibold text-slate-950">{formatCompactCount(placement.clicks)}</p>
                      </div>
                      <div className="rounded-[16px] border border-slate-200 bg-white px-3 py-3">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">CTR</p>
                        <p className="mt-1 text-sm font-semibold text-slate-950">{formatPercent(placement.ctr)}</p>
                      </div>
                    </div>
                  </div>
                  <p className="mt-3 text-xs text-slate-500">Promo tersentuh: {formatCompactCount(placement.promoCount)}</p>
                </article>
              ))}
            </div>
          </article>
        </section>
      </div>
    </main>
  )
}
