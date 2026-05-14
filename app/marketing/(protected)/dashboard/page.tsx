import Link from "next/link"
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
}: {
  searchParams?: Promise<DashboardSearchParams>
}) {
  const params = searchParams ? await searchParams : {}
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
    { count: activePromos },
    { count: inactivePromos },
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
    adminSupabase.from("marketing_promos").select("id", { count: "exact", head: true }).eq("is_active", true),
    adminSupabase.from("marketing_promos").select("id", { count: "exact", head: true }).eq("is_active", false),
    adminSupabase.from("marketing_inspiration_articles").select("id", { count: "exact", head: true }).eq("is_active", true),
    adminSupabase.from("marketing_inspiration_articles").select("id", { count: "exact", head: true }).eq("is_active", false),
    adminSupabase
      .from("newsletter_subscribers")
      .select("id, email, locale, source_path, subscribed_at, status")
      .order("subscribed_at", { ascending: false })
      .limit(5),
    adminSupabase
      .from("marketing_promos")
      .select("id, slug, title_id, target_href, is_active, updated_at")
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
  const weekGrowth = Math.max((last7Subscribers || 0) - (previous7Subscribers || 0), 0)

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
      label: "Promo aktif",
      value: formatCompactCount(activePromos || 0),
      note: `${formatCompactCount(inactivePromos || 0)} promo nonaktif masih tersimpan sebagai stok campaign.`,
    },
    {
      label: "Inspirasi aktif",
      value: formatCompactCount(activeArticles || 0),
      note: `${formatCompactCount(inactiveArticles || 0)} artikel nonaktif siap dirapikan atau dihidupkan ulang.`,
    },
  ]

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fff8f1_0%,#f7f1e8_100%)] px-4 py-5 sm:px-6 sm:py-6 md:px-8 md:py-8 lg:px-10">
      <div className="mx-auto max-w-7xl space-y-5 sm:space-y-6 lg:space-y-8">
        <section className="overflow-hidden rounded-[28px] border border-orange-200/60 bg-[linear-gradient(135deg,#7c2d12_0%,#c2410c_38%,#f97316_72%,#fdba74_100%)] px-5 py-6 text-white shadow-[0_30px_100px_rgba(146,64,14,0.18)] sm:rounded-[32px] sm:px-8 sm:py-8 lg:px-10">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_320px]">
            <div className="max-w-3xl">
              <span className="inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.34em] text-orange-50">
                Marketing Control Center
              </span>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:mt-5 sm:text-4xl lg:text-5xl">
                Audience, promo, dan konten inspirasi sekarang bergerak dari satu workspace.
              </h1>
              <p className="mt-3 text-sm leading-7 text-orange-50/90 sm:mt-4 sm:text-base sm:leading-8">
                Dashboard ini dibuat untuk menjaga ritme akuisisi subscriber, memastikan promo publik tetap hidup, dan
                merapikan blok inspirasi homepage tanpa bergantung pada konten statis.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link
                  href="/marketing/promos"
                  className="inline-flex rounded-full bg-white px-5 py-3 text-sm font-semibold text-orange-700 transition hover:bg-orange-50"
                >
                  Kelola promo
                </Link>
                <Link
                  href="/marketing/inspiration"
                  className="inline-flex rounded-full border border-white/20 bg-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/15"
                >
                  Kelola inspirasi
                </Link>
              </div>
            </div>

            <div className="rounded-[22px] border border-white/20 bg-white/10 px-4 py-4 backdrop-blur sm:rounded-[24px] sm:px-5 sm:py-5">
              <p className="text-[11px] uppercase tracking-[0.28em] text-orange-100/80">Live campaign snapshot</p>
              <div className="mt-5 grid gap-4">
                <div>
                  <p className="text-sm text-orange-50/80">Active subscribers</p>
                  <p className="mt-1 text-2xl font-semibold text-white sm:text-3xl">
                    {formatCompactCount(activeSubscribers || 0)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-orange-50/80">Promo live</p>
                  <p className="mt-1 text-2xl font-semibold text-white sm:text-3xl">
                    {formatCompactCount(activePromos || 0)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-orange-50/80">Artikel live</p>
                  <p className="mt-1 text-2xl font-semibold text-white sm:text-3xl">
                    {formatCompactCount(activeArticles || 0)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {params.success ? <div className="rounded-[24px] border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-700">{params.success}</div> : null}
        {params.error ? <div className="rounded-[24px] border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">{params.error}</div> : null}

        <section className="grid gap-3 sm:gap-4 md:grid-cols-2 xl:grid-cols-5">
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

        <section className="grid gap-4 sm:gap-6 xl:grid-cols-[0.92fr_1.08fr]">
          <article className="rounded-[24px] border border-[#f3dbc3] bg-white/85 p-5 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur-sm sm:rounded-[32px] sm:p-6 lg:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-orange-500">Quick actions</p>
                <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-slate-950 sm:text-2xl">
                  Jalur kerja marketing hari ini
                </h2>
              </div>
            </div>
            <div className="mt-5 grid gap-3">
              <Link
                href="/marketing/newsletters"
                className="rounded-[22px] border border-[#efe1cf] bg-[#fffaf3] px-5 py-4 text-sm font-semibold text-slate-900 transition hover:border-orange-200 hover:bg-orange-50/40"
              >
                Buka audience newsletter dan cek subscriber baru
              </Link>
              <Link
                href="/marketing/promos"
                className="rounded-[22px] border border-[#efe1cf] bg-[#fffaf3] px-5 py-4 text-sm font-semibold text-slate-900 transition hover:border-orange-200 hover:bg-orange-50/40"
              >
                Update promo publik di homepage, promo page, dan wishlist
              </Link>
              <Link
                href="/marketing/inspiration"
                className="rounded-[22px] border border-[#efe1cf] bg-[#fffaf3] px-5 py-4 text-sm font-semibold text-slate-900 transition hover:border-orange-200 hover:bg-orange-50/40"
              >
                Atur blok &quot;Temukan ide perjalanan untuk petualangan berikutnya&quot;
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
                  {formatCompactCount(inactivePromos || 0)} promo nonaktif
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  {formatCompactCount(inactiveArticles || 0)} artikel nonaktif
                </p>
              </div>
            </div>
          </article>

          <article className="rounded-[24px] border border-[#f3dbc3] bg-white/85 p-5 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur-sm sm:rounded-[32px] sm:p-6 lg:p-7">
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-orange-500">Recent audience</p>
            <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-slate-950 sm:text-2xl">Subscriber terbaru</h2>
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
                <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-orange-500">Promo pulse</p>
                <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-slate-950 sm:text-2xl">
                  Promo yang paling baru disentuh
                </h2>
              </div>
              <Link href="/marketing/promos" className="text-sm font-semibold text-orange-600">
                Buka semua
              </Link>
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
                      </div>
                      <div className="text-right">
                        <span className={`inline-flex rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] ${promo.is_active ? "border border-emerald-200 bg-emerald-50 text-emerald-700" : "border border-slate-200 bg-slate-100 text-slate-600"}`}>
                          {promo.is_active ? "Active" : "Inactive"}
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
                <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-orange-500">Inspiration pulse</p>
                <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-slate-950 sm:text-2xl">
                  Artikel inspirasi terbaru
                </h2>
              </div>
              <Link href="/marketing/inspiration" className="text-sm font-semibold text-orange-600">
                Buka semua
              </Link>
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
