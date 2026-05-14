import Link from "next/link"
import { isMarketingPromoPlacementKey, marketingPromoPlacements, type MarketingPromoPlacementKey } from "@/lib/marketing-promo-placements"
import { getMarketingPromoEffectiveState, getMarketingPromoEffectiveStateLabel } from "@/lib/marketing-promo-status"
import { createAdminClient } from "@/lib/supabase/admin"

type DashboardSearchParams = {
  success?: string
  error?: string
}

type SubscriberRow = {
  id: string
  email: string
  locale: string | null
  source_path: string | null
  subscribed_at: string | null
  status: string | null
}

type PromoRow = {
  id: string
  slug: string
  title_id: string | null
  target_href: string | null
  is_active: boolean | null
  status: string | null
  starts_at: string | null
  ends_at: string | null
  updated_at: string | null
}

type ArticleRow = {
  id: string
  slug: string
  title_id: string | null
  href: string | null
  is_active: boolean | null
  updated_at: string | null
}

type PlacementRow = {
  promo_id: string | null
  placement_key: string | null
}

type PromoEventRow = {
  event_type: string | null
  placement_key: string | null
  promo_id: string | null
  promo_slug: string | null
}

type NewsletterCampaignStatusRow = {
  status: string | null
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "-"
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return "-"
  return parsed.toLocaleString("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  })
}

function formatCompactCount(value: number | null | undefined) {
  const amount = Number(value || 0)
  if (amount >= 1000000) return `${(amount / 1000000).toFixed(2)} M`
  if (amount >= 1000) return `${(amount / 1000).toFixed(1)} K`
  return amount.toLocaleString("id-ID")
}

export default async function MarketingDashboardPage({
  searchParams,
  portal = "marketing",
}: {
  searchParams?: Promise<DashboardSearchParams>
  portal?: "marketing" | "superadmin"
}) {
  const params = searchParams ? await searchParams : {}
  const isSuperadminPreview = portal === "superadmin"
  const adminSupabase = createAdminClient()
  const now = new Date()
  const startOfTodayIso = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
  const last7Iso = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000).toISOString()
  const previous7Iso = new Date(now.getTime() - 13 * 24 * 60 * 60 * 1000).toISOString()

  const [
    { count: activeSubscribers },
    { count: unsubscribedSubscribers },
    { count: todaySubscribers },
    { count: last7Subscribers },
    { count: previous7Subscribers },
    newsletterCampaignStatusResult,
    allPromosResult,
    placementRowsResult,
    todayPromoEventsResult,
    { count: activeArticles },
    { count: inactiveArticles },
    recentSubscribersResult,
    recentPromosResult,
    recentArticlesResult,
  ] = await Promise.all([
    adminSupabase.from("newsletter_subscribers").select("id", { count: "exact", head: true }).eq("status", "active"),
    adminSupabase.from("newsletter_subscribers").select("id", { count: "exact", head: true }).eq("status", "unsubscribed"),
    adminSupabase.from("newsletter_subscribers").select("id", { count: "exact", head: true }).gte("subscribed_at", startOfTodayIso),
    adminSupabase.from("newsletter_subscribers").select("id", { count: "exact", head: true }).gte("subscribed_at", last7Iso),
    adminSupabase
      .from("newsletter_subscribers")
      .select("id", { count: "exact", head: true })
      .gte("subscribed_at", previous7Iso)
      .lt("subscribed_at", last7Iso),
    adminSupabase.from("marketing_newsletter_campaigns").select("status"),
    adminSupabase.from("marketing_promos").select("id, is_active, status, starts_at, ends_at"),
    adminSupabase.from("marketing_promo_placements").select("promo_id, placement_key").eq("is_active", true),
    adminSupabase.from("marketing_promo_events").select("event_type, placement_key, promo_id, promo_slug").gte("occurred_at", startOfTodayIso),
    adminSupabase.from("marketing_inspiration_articles").select("id", { count: "exact", head: true }).eq("is_active", true),
    adminSupabase.from("marketing_inspiration_articles").select("id", { count: "exact", head: true }).eq("is_active", false),
    adminSupabase
      .from("newsletter_subscribers")
      .select("id, email, locale, source_path, subscribed_at, status")
      .order("subscribed_at", { ascending: false })
      .limit(5),
    adminSupabase
      .from("marketing_promos")
      .select("id, slug, title_id, target_href, is_active, status, starts_at, ends_at, updated_at")
      .order("updated_at", { ascending: false })
      .limit(4),
    adminSupabase
      .from("marketing_inspiration_articles")
      .select("id, slug, title_id, href, is_active, updated_at")
      .order("updated_at", { ascending: false })
      .limit(4),
  ])

  const recentSubscribers = (recentSubscribersResult.data as SubscriberRow[] | null) || []
  const recentPromos = (recentPromosResult.data as PromoRow[] | null) || []
  const recentArticles = (recentArticlesResult.data as ArticleRow[] | null) || []
  const newsletterCampaignStatuses = (newsletterCampaignStatusResult.data as NewsletterCampaignStatusRow[] | null) || []
  const weekGrowth = Math.max((last7Subscribers || 0) - (previous7Subscribers || 0), 0)
  const newsletterCampaignCounts = newsletterCampaignStatuses.reduce(
    (acc, campaign) => {
      const status = String(campaign.status || "draft")
      if (status === "approved") acc.approved += 1
      else if (status === "sent") acc.sent += 1
      else acc.draft += 1
      return acc
    },
    { draft: 0, approved: 0, sent: 0 },
  )
  const allPromos = (allPromosResult.data as Array<Pick<PromoRow, "id" | "is_active" | "status" | "starts_at" | "ends_at">> | null) || []
  const placementRows = (placementRowsResult.data as PlacementRow[] | null) || []
  const todayPromoEvents = (todayPromoEventsResult.data as PromoEventRow[] | null) || []
  const nowIso = now.toISOString()
  const promoStateCounts = allPromos.reduce(
    (acc, promo) => {
      const state = getMarketingPromoEffectiveState(promo, nowIso)
      acc[state] += 1
      return acc
    },
    { live: 0, waiting: 0, expired: 0, hidden: 0 },
  )
  const promoStateById = new Map(allPromos.map((promo) => [promo.id, getMarketingPromoEffectiveState(promo, nowIso)]))
  const placementAnalytics = marketingPromoPlacements.map((placement) => {
    const counts = { live: 0, waiting: 0, expired: 0, hidden: 0 }
    for (const row of placementRows) {
      if (row.placement_key !== placement.key || !row.promo_id) continue
      const state = promoStateById.get(row.promo_id)
      if (!state) continue
      counts[state] += 1
    }
    return {
      ...placement,
      counts,
      total: counts.live + counts.waiting + counts.expired + counts.hidden,
    }
  })
  const eventCounts = todayPromoEvents.reduce(
    (acc, event) => {
      if (event.event_type === "impression") acc.impressions += 1
      if (event.event_type === "click") acc.clicks += 1
      return acc
    },
    { impressions: 0, clicks: 0 },
  )
  const placementEventMap = new Map<MarketingPromoPlacementKey, { impressions: number; clicks: number }>(
    marketingPromoPlacements.map((placement) => [placement.key, { impressions: 0, clicks: 0 }]),
  )
  for (const event of todayPromoEvents) {
    const placementKey = String(event.placement_key || "")
    if (!isMarketingPromoPlacementKey(placementKey)) continue
    const bucket = placementEventMap.get(placementKey)
    if (!bucket) continue
    if (event.event_type === "impression") bucket.impressions += 1
    if (event.event_type === "click") bucket.clicks += 1
  }
  const promoMetaMap = new Map(
    recentPromos.map((promo) => [
      promo.id,
      {
        slug: promo.slug,
        title: promo.title_id || promo.slug,
        state: getMarketingPromoEffectiveStateLabel(getMarketingPromoEffectiveState(promo, nowIso)),
      },
    ]),
  )
  for (const promo of allPromos) {
    if (!promoMetaMap.has(promo.id)) {
      promoMetaMap.set(promo.id, {
        slug: promo.id,
        title: promo.id,
        state: getMarketingPromoEffectiveStateLabel(getMarketingPromoEffectiveState(promo, nowIso)),
      })
    }
  }
  const promoPerformanceMap = new Map<
    string,
    {
      promoId: string | null
      promoSlug: string
      title: string
      state: string
      impressions: number
      clicks: number
    }
  >()
  for (const event of todayPromoEvents) {
    const promoSlug = String(event.promo_slug || "").trim()
    const promoId = String(event.promo_id || "").trim() || null
    const key = promoId || promoSlug
    if (!key || !promoSlug) continue
    const meta = promoId ? promoMetaMap.get(promoId) : null
    const current = promoPerformanceMap.get(key) || {
      promoId,
      promoSlug,
      title: meta?.title || promoSlug,
      state: meta?.state || "Unknown",
      impressions: 0,
      clicks: 0,
    }
    if (event.event_type === "impression") current.impressions += 1
    if (event.event_type === "click") current.clicks += 1
    promoPerformanceMap.set(key, current)
  }
  const topPerformingPromos = Array.from(promoPerformanceMap.values())
    .map((promo) => ({
      ...promo,
      ctr: promo.impressions > 0 ? (promo.clicks / promo.impressions) * 100 : 0,
    }))
    .sort((a, b) => {
      if (b.clicks !== a.clicks) return b.clicks - a.clicks
      if (b.ctr !== a.ctr) return b.ctr - a.ctr
      return b.impressions - a.impressions
    })
    .slice(0, 5)

  const metricCards = [
    {
      label: "Audience aktif",
      value: formatCompactCount(activeSubscribers || 0),
      note: "Subscriber yang siap dipakai untuk campaign newsletter.",
    },
    {
      label: "Masuk hari ini",
      value: formatCompactCount(todaySubscribers || 0),
      note: "Lead baru yang masuk sejak pukul 00:00 hari ini.",
    },
    {
      label: "7 hari terakhir",
      value: formatCompactCount(last7Subscribers || 0),
      note: `Naik ${formatCompactCount(weekGrowth)} dibanding gelombang 7 hari sebelumnya.`,
    },
    {
      label: "Campaign approval",
      value: formatCompactCount(newsletterCampaignCounts.draft),
      note: `${formatCompactCount(newsletterCampaignCounts.approved)} siap kirim, ${formatCompactCount(newsletterCampaignCounts.sent)} sudah terkirim.`,
    },
    {
      label: "Promo live",
      value: formatCompactCount(promoStateCounts.live),
      note: `${formatCompactCount(promoStateCounts.waiting)} waiting, ${formatCompactCount(promoStateCounts.expired)} expired, ${formatCompactCount(promoStateCounts.hidden)} hidden.`,
    },
    {
      label: "Impresi hari ini",
      value: formatCompactCount(eventCounts.impressions),
      note: "Tercatat dari beacon slot promo publik yang sedang aktif.",
    },
    {
      label: "Klik CTA hari ini",
      value: formatCompactCount(eventCounts.clicks),
      note: "Klik menuju target promo yang melewati redirect logger.",
    },
    {
      label: "Inspirasi aktif",
      value: formatCompactCount(activeArticles || 0),
      note: `${formatCompactCount(inactiveArticles || 0)} artikel nonaktif siap dirapikan atau dihidupkan ulang.`,
    },
  ]

  const heroEyebrow = isSuperadminPreview ? "Marketing Manager" : "Marketing Control Center"
  const heroTitle = isSuperadminPreview
    ? "Pantau audience, promo, dan blok inspirasi marketing dari overview lintas tim."
    : "Audience, promo, dan konten inspirasi sekarang bergerak dari satu workspace."
  const heroBody = isSuperadminPreview
    ? "Preview ini membantu superadmin membaca pertumbuhan subscriber, stok campaign aktif, dan kesehatan konten inspirasi tanpa berpindah ke portal marketing utama."
    : "Dashboard ini dibuat untuk menjaga ritme akuisisi subscriber, memastikan promo publik tetap hidup, dan merapikan blok inspirasi homepage tanpa bergantung pada konten statis."
  const actionHeading = isSuperadminPreview ? "Fokus manajer" : "Aksi cepat"
  const actionTitle = isSuperadminPreview ? "Titik kontrol domain marketing" : "Jalur kerja marketing hari ini"
  const audienceTitle = isSuperadminPreview ? "Audience terbaru" : "Subscriber terbaru"
  const snapshotLabel = isSuperadminPreview ? "Snapshot marketing live" : "Snapshot campaign live"
  const promoPulseHeading = isSuperadminPreview ? "Preview promo" : "Denyut promo"
  const inspirationPulseHeading = isSuperadminPreview ? "Preview inspirasi" : "Denyut inspirasi"

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fff8f1_0%,#f7f1e8_100%)] px-4 py-5 sm:px-6 sm:py-6 md:px-8 md:py-8 lg:px-10">
      <div className="mx-auto max-w-7xl space-y-5 sm:space-y-6 lg:space-y-8">
        <section className="overflow-hidden rounded-[28px] border border-orange-200/60 bg-[linear-gradient(135deg,#7c2d12_0%,#c2410c_38%,#f97316_72%,#fdba74_100%)] px-5 py-6 text-white shadow-[0_30px_100px_rgba(146,64,14,0.18)] sm:rounded-[32px] sm:px-8 sm:py-8 lg:px-10">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_320px]">
            <div className="max-w-3xl">
              <span className="inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.34em] text-orange-50">
                {heroEyebrow}
              </span>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:mt-5 sm:text-4xl lg:text-5xl">
                {heroTitle}
              </h1>
              <p className="mt-3 text-sm leading-7 text-orange-50/90 sm:mt-4 sm:text-base sm:leading-8">
                {heroBody}
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link
                  href={isSuperadminPreview ? "/superadmin/marketing-newsletters" : "/marketing/newsletters"}
                  className="inline-flex rounded-full bg-white px-5 py-3 text-sm font-semibold text-orange-700 transition hover:bg-orange-50"
                >
                  {isSuperadminPreview ? "Preview audience" : "Buka newsletter"}
                </Link>
                <Link
                  href={isSuperadminPreview ? "/superadmin/marketing-promos" : "/marketing/promos"}
                  className="inline-flex rounded-full border border-white/20 bg-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/15"
                >
                  {isSuperadminPreview ? "Preview promo" : "Kelola promo"}
                </Link>
                {!isSuperadminPreview ? (
                  <Link
                    href="/marketing/email-campaigns"
                    className="inline-flex rounded-full border border-white/20 bg-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/15"
                  >
                    Kelola email campaign
                  </Link>
                ) : null}
                <Link
                  href={isSuperadminPreview ? "/superadmin/marketing-inspiration" : "/marketing/inspiration"}
                  className="inline-flex rounded-full border border-white/20 bg-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/15"
                >
                  {isSuperadminPreview ? "Preview inspirasi" : "Kelola inspirasi"}
                </Link>
              </div>
            </div>

            <div className="rounded-[22px] border border-white/20 bg-white/10 px-4 py-4 backdrop-blur sm:rounded-[24px] sm:px-5 sm:py-5">
              <p className="text-[11px] uppercase tracking-[0.28em] text-orange-100/80">{snapshotLabel}</p>
              <div className="mt-5 grid gap-4">
                <div>
                  <p className="text-sm text-orange-50/80">Subscriber aktif</p>
                  <p className="mt-1 text-2xl font-semibold text-white sm:text-3xl">
                    {formatCompactCount(activeSubscribers || 0)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-orange-50/80">Promo live</p>
                  <p className="mt-1 text-2xl font-semibold text-white sm:text-3xl">
                    {formatCompactCount(promoStateCounts.live)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-orange-50/80">Artikel live</p>
                  <p className="mt-1 text-2xl font-semibold text-white sm:text-3xl">
                    {formatCompactCount(activeArticles || 0)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-orange-50/80">Pertumbuhan 7 hari</p>
                  <p className="mt-1 text-2xl font-semibold text-white sm:text-3xl">
                    {formatCompactCount(weekGrowth)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {params.success ? <div className="rounded-[24px] border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-700">{params.success}</div> : null}
        {params.error ? <div className="rounded-[24px] border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">{params.error}</div> : null}

        <section className="grid gap-3 sm:gap-4 md:grid-cols-2 xl:grid-cols-7">
          {metricCards.map((card) => (
            <article
              key={card.label}
              className="rounded-[22px] border border-[#f0ddc7] bg-white px-4 py-4 shadow-[0_18px_44px_rgba(15,23,42,0.06)] sm:rounded-[26px] sm:px-5 sm:py-5"
            >
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-orange-500">{card.label}</p>
              <p className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-slate-950 sm:text-3xl">{card.value}</p>
              <p className="mt-2 text-xs leading-6 text-slate-500">{card.note}</p>
            </article>
          ))}
        </section>

        <section className="rounded-[24px] border border-[#f3dbc3] bg-white/85 p-5 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur-sm sm:rounded-[32px] sm:p-6 lg:p-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-orange-500">Analitik placement</p>
              <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-slate-950 sm:text-2xl">Kesehatan promo per slot publik</h2>
            </div>
            {!isSuperadminPreview ? <Link href="/marketing/promos" className="text-sm font-semibold text-orange-600">Kelola placement</Link> : null}
          </div>
          <div className="mt-5 grid gap-3 lg:grid-cols-2 2xl:grid-cols-4">
            {placementAnalytics.map((placement) => (
              <article key={placement.key} className="rounded-[22px] border border-[#efe1cf] bg-[#fffaf3] px-4 py-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-orange-500">{placement.label}</p>
                <p className="mt-2 text-sm text-slate-500">{placement.description}</p>
                <p className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-slate-950">{formatCompactCount(placement.counts.live)}</p>
                <p className="mt-1 text-xs text-emerald-700">Live</p>
                <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-[16px] border border-amber-200 bg-amber-50 px-2 py-2">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-amber-700">Waiting</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">{formatCompactCount(placement.counts.waiting)}</p>
                  </div>
                  <div className="rounded-[16px] border border-rose-200 bg-rose-50 px-2 py-2">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-rose-700">Expired</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">{formatCompactCount(placement.counts.expired)}</p>
                  </div>
                  <div className="rounded-[16px] border border-slate-200 bg-slate-100 px-2 py-2">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-600">Hidden</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">{formatCompactCount(placement.counts.hidden)}</p>
                  </div>
                </div>
                <p className="mt-3 text-xs text-slate-500">Total mapping aktif: {formatCompactCount(placement.total)}</p>
                <p className="mt-2 text-xs text-slate-500">
                  Hari ini: {formatCompactCount(placementEventMap.get(placement.key)?.impressions || 0)} impresi / {formatCompactCount(placementEventMap.get(placement.key)?.clicks || 0)} klik
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-[24px] border border-[#f3dbc3] bg-white/85 p-5 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur-sm sm:rounded-[32px] sm:p-6 lg:p-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-orange-500">Promo berkinerja terbaik</p>
              <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-slate-950 sm:text-2xl">Promo dengan performa terbaik hari ini</h2>
            </div>
            {!isSuperadminPreview ? <Link href="/marketing/promos" className="text-sm font-semibold text-orange-600">Lihat semua promo</Link> : null}
          </div>
          <div className="mt-5 space-y-3">
            {!topPerformingPromos.length ? (
              <div className="rounded-[24px] border border-dashed border-[#e8d7c1] bg-[#fffaf3] px-5 py-6 text-sm text-slate-500">
                Belum ada impresi atau klik promo yang tercatat hari ini.
              </div>
            ) : (
              topPerformingPromos.map((promo, index) => (
                <article key={`${promo.promoId || promo.promoSlug}-${index}`} className="rounded-[22px] border border-[#efe1cf] bg-[#fffaf3] px-5 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-orange-500">Rank #{index + 1}</p>
                      <p className="mt-2 text-sm font-semibold text-slate-950">{promo.title}</p>
                      <p className="mt-1 text-xs font-semibold uppercase tracking-[0.18em] text-orange-600">{promo.promoSlug}</p>
                      <p className="mt-2 text-xs text-slate-500">State: {promo.state}</p>
                    </div>
                    <div className="grid min-w-[200px] grid-cols-3 gap-2 text-center">
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
                        <p className="mt-1 text-sm font-semibold text-slate-950">{promo.ctr.toFixed(1)}%</p>
                      </div>
                    </div>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>

        <section className="grid gap-4 sm:gap-6 xl:grid-cols-[0.92fr_1.08fr]">
          <article className="rounded-[24px] border border-[#f3dbc3] bg-white/85 p-5 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur-sm sm:rounded-[32px] sm:p-6 lg:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-orange-500">{actionHeading}</p>
                <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-slate-950 sm:text-2xl">{actionTitle}</h2>
              </div>
            </div>
            <div className="mt-5 grid gap-3">
              <Link
                href={isSuperadminPreview ? "/superadmin/marketing-newsletters" : "/marketing/newsletters"}
                className="rounded-[22px] border border-[#efe1cf] bg-[#fffaf3] px-5 py-4 text-sm font-semibold text-slate-900 transition hover:border-orange-200 hover:bg-orange-50/40"
              >
                {isSuperadminPreview ? "Preview audience newsletter" : "Buka audience newsletter dan cek subscriber baru"}
              </Link>
              <Link
                href={isSuperadminPreview ? "/superadmin/marketing-promos" : "/marketing/promos"}
                className="rounded-[22px] border border-[#efe1cf] bg-[#fffaf3] px-5 py-4 text-sm font-semibold text-slate-900 transition hover:border-orange-200 hover:bg-orange-50/40"
              >
                {isSuperadminPreview ? "Preview promo publik" : "Update promo publik di homepage, promo page, dan wishlist"}
              </Link>
              {!isSuperadminPreview ? (
                <Link
                  href="/marketing/email-campaigns"
                  className="rounded-[22px] border border-[#efe1cf] bg-[#fffaf3] px-5 py-4 text-sm font-semibold text-slate-900 transition hover:border-orange-200 hover:bg-orange-50/40"
                >
                  <span className="flex items-center justify-between gap-3">
                    <span>Siapkan dan kirim campaign email ke subscriber aktif</span>
                    <span className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-orange-700">
                      {formatCompactCount(newsletterCampaignCounts.draft)} review
                      <span className="text-orange-400">/</span>
                      {formatCompactCount(newsletterCampaignCounts.approved)} ready
                    </span>
                  </span>
                </Link>
              ) : null}
              <Link
                href={isSuperadminPreview ? "/superadmin/marketing-inspiration" : "/marketing/inspiration"}
                className="rounded-[22px] border border-[#efe1cf] bg-[#fffaf3] px-5 py-4 text-sm font-semibold text-slate-900 transition hover:border-orange-200 hover:bg-orange-50/40"
              >
                {isSuperadminPreview ? "Preview blok inspirasi" : "Atur blok &quot;Temukan ide perjalanan untuk petualangan berikutnya&quot;"}
              </Link>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <div className="rounded-[22px] border border-[#efe1cf] bg-[#fffaf3] px-4 py-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-orange-500">Subscriber status</p>
                <p className="mt-2 text-lg font-semibold text-slate-950">
                  {formatCompactCount(activeSubscribers || 0)} active
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  {formatCompactCount(unsubscribedSubscribers || 0)} unsubscribed
                </p>
              </div>
              <div className="rounded-[22px] border border-[#efe1cf] bg-[#fffaf3] px-4 py-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-orange-500">Content backlog</p>
                <p className="mt-2 text-lg font-semibold text-slate-950">
                  {formatCompactCount(promoStateCounts.hidden)} promo hidden
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  {formatCompactCount(promoStateCounts.waiting)} waiting, {formatCompactCount(inactiveArticles || 0)} artikel nonaktif
                </p>
              </div>
              <div className="rounded-[22px] border border-[#efe1cf] bg-[#fffaf3] px-4 py-4 sm:col-span-2">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-orange-500">Campaign approval lane</p>
                <p className="mt-2 text-lg font-semibold text-slate-950">
                  {formatCompactCount(newsletterCampaignCounts.draft)} menunggu approval
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  {formatCompactCount(newsletterCampaignCounts.approved)} siap kirim, {formatCompactCount(newsletterCampaignCounts.sent)} sudah terkirim
                </p>
              </div>
            </div>
          </article>

          <article className="rounded-[24px] border border-[#f3dbc3] bg-white/85 p-5 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur-sm sm:rounded-[32px] sm:p-6 lg:p-7">
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-orange-500">Audience terbaru</p>
            <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-slate-950 sm:text-2xl">{audienceTitle}</h2>
            <div className="mt-5 space-y-3">
              {!recentSubscribers.length ? (
                <div className="rounded-[24px] border border-dashed border-[#e8d7c1] bg-[#fffaf3] px-5 py-6 text-sm text-slate-500">
                  Belum ada subscriber newsletter yang masuk.
                </div>
              ) : (
                recentSubscribers.map((item) => (
                  <div key={item.id} className="rounded-[22px] border border-[#efe1cf] bg-[#fffaf3] px-5 py-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-950">{item.email}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {item.source_path || "/"} | {String(item.locale || "id").toUpperCase()}
                        </p>
                        <p className="mt-1 text-xs text-slate-400">{formatDateTime(item.subscribed_at)}</p>
                      </div>
                      <span className={`inline-flex rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] ${item.status === "active" ? "border border-emerald-200 bg-emerald-50 text-emerald-700" : "border border-slate-200 bg-slate-100 text-slate-600"}`}>
                        {item.status || "active"}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </article>
        </section>

        <section className="grid gap-4 sm:gap-6 xl:grid-cols-2">
          <article className="rounded-[24px] border border-[#f3dbc3] bg-white/85 p-5 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur-sm sm:rounded-[32px] sm:p-6 lg:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-orange-500">{promoPulseHeading}</p>
                <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-slate-950 sm:text-2xl">
                  Promo yang paling baru disentuh
                </h2>
              </div>
              {!isSuperadminPreview ? <Link href="/marketing/promos" className="text-sm font-semibold text-orange-600">Buka semua</Link> : null}
            </div>
            <div className="mt-5 space-y-3">
              {!recentPromos.length ? (
                <div className="rounded-[24px] border border-dashed border-[#e8d7c1] bg-[#fffaf3] px-5 py-6 text-sm text-slate-500">
                  Belum ada promo yang tersimpan di workspace marketing.
                </div>
              ) : (
                recentPromos.map((promo) => (
                  <div key={promo.id} className="rounded-[22px] border border-[#efe1cf] bg-[#fffaf3] px-5 py-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-950">{promo.title_id || promo.slug}</p>
                        <p className="mt-1 text-xs font-semibold uppercase tracking-[0.18em] text-orange-600">{promo.slug}</p>
                        <p className="mt-2 text-xs text-slate-500">Target: {promo.target_href || "/promo"}</p>
                        <p className="mt-2 text-xs text-slate-500">
                          State: {getMarketingPromoEffectiveStateLabel(getMarketingPromoEffectiveState(promo, nowIso))}
                        </p>
                      </div>
                      <div className="text-right">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] ${
                            getMarketingPromoEffectiveState(promo, nowIso) === "live"
                              ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
                              : getMarketingPromoEffectiveState(promo, nowIso) === "waiting"
                                ? "border border-amber-200 bg-amber-50 text-amber-700"
                                : getMarketingPromoEffectiveState(promo, nowIso) === "expired"
                                  ? "border border-rose-200 bg-rose-50 text-rose-700"
                                  : "border border-slate-200 bg-slate-100 text-slate-600"
                          }`}
                        >
                          {getMarketingPromoEffectiveStateLabel(getMarketingPromoEffectiveState(promo, nowIso))}
                        </span>
                        <p className="mt-2 text-xs text-slate-400">{formatDateTime(promo.updated_at)}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </article>

          <article className="rounded-[24px] border border-[#f3dbc3] bg-white/85 p-5 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur-sm sm:rounded-[32px] sm:p-6 lg:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-orange-500">{inspirationPulseHeading}</p>
                <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-slate-950 sm:text-2xl">
                  Artikel inspirasi terbaru
                </h2>
              </div>
              {!isSuperadminPreview ? <Link href="/marketing/inspiration" className="text-sm font-semibold text-orange-600">Buka semua</Link> : null}
            </div>
            <div className="mt-5 space-y-3">
              {!recentArticles.length ? (
                <div className="rounded-[24px] border border-dashed border-[#e8d7c1] bg-[#fffaf3] px-5 py-6 text-sm text-slate-500">
                  Belum ada artikel inspirasi yang tersimpan.
                </div>
              ) : (
                recentArticles.map((article) => (
                  <div key={article.id} className="rounded-[22px] border border-[#efe1cf] bg-[#fffaf3] px-5 py-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-950">{article.title_id || article.slug}</p>
                        <p className="mt-1 text-xs font-semibold uppercase tracking-[0.18em] text-orange-600">{article.slug}</p>
                        <p className="mt-2 text-xs text-slate-500">Target: {article.href || "/packages"}</p>
                      </div>
                      <div className="text-right">
                        <span className={`inline-flex rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] ${article.is_active ? "border border-emerald-200 bg-emerald-50 text-emerald-700" : "border border-slate-200 bg-slate-100 text-slate-600"}`}>
                          {article.is_active ? "Active" : "Inactive"}
                        </span>
                        <p className="mt-2 text-xs text-slate-400">{formatDateTime(article.updated_at)}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </article>
        </section>
      </div>
    </main>
  )
}
