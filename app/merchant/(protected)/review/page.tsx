import { createAdminClient } from "@/lib/supabase/admin"
import { type Locale, normalizeLocale } from "@/lib/i18n"
import { getCurrentLocale } from "@/lib/locale"
import { createClient } from "@/lib/supabase/server"

type MerchantReviewRow = {
  id: string
  rating: number | null
  comment: string | null
  customer_name: string | null
  created_at: string | null
  packages: {
    title: string | null
    merchant_id: string | null
  } | null
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return "-"
  const date = new Date(dateStr)
  if (Number.isNaN(date.getTime())) return dateStr
  return date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  })
}

function renderStars(rating: number) {
  const rounded = Math.max(0, Math.min(5, Math.round(rating)))
  return `${"*".repeat(rounded)}${"-".repeat(5 - rounded)}`
}

export default async function MerchantReviewPage() {
  const locale = normalizeLocale(await getCurrentLocale())
  const t = getReviewText(locale)
  const supabase = await createClient()
  const adminSupabase = createAdminClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data: merchant } = await adminSupabase
    .from("merchants")
    .select("id")
    .eq("user_id", user.id)
    .single()

  if (!merchant) return <div className="p-10">{t.merchantMissing}</div>

  const reviewResult = await adminSupabase
    .from("package_reviews")
    .select("id, rating, comment, customer_name, created_at, packages!inner(title, merchant_id)")
    .eq("packages.merchant_id", merchant.id)
    .order("created_at", { ascending: false })

  const reviews = (reviewResult.data as MerchantReviewRow[] | null) || []
  const totalRating = reviews.reduce((sum, review) => sum + (review.rating ?? 0), 0)
  const averageRating = reviews.length > 0 ? totalRating / reviews.length : 0
  const commentedReviews = reviews.filter((review) => Boolean(review.comment?.trim())).length
  const topRatedPackage =
    Array.from(
      reviews.reduce((map, review) => {
        const key = review.packages?.title || t.packageFallback
        const current = map.get(key) || { total: 0, count: 0 }
        map.set(key, {
          total: current.total + (review.rating ?? 0),
          count: current.count + 1,
        })
        return map
      }, new Map<string, { total: number; count: number }>()),
    )
      .map(([title, stats]) => ({
        title,
        average: stats.count > 0 ? stats.total / stats.count : 0,
      }))
      .sort((a, b) => b.average - a.average)[0]?.title || "-"

  const metricCards = [
    {
      label: "Rating rata-rata",
      label: t.averageRating,
      value: reviews.length > 0 ? averageRating.toFixed(1) : "-",
      note: t.averageRatingNote(reviews.length),
    },
    {
      label: t.customerComments,
      value: String(commentedReviews),
      note: t.customerCommentsNote,
    },
    {
      label: t.totalReviews,
      value: String(reviews.length),
      note: t.totalReviewsNote,
    },
    {
      label: t.topPackage,
      value: topRatedPackage,
      note: t.topPackageNote,
    },
  ]

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fff8f1_0%,#f7f1e8_38%,#f3eee7_100%)] p-6 md:p-10">
      <section className="overflow-hidden rounded-[34px] border border-orange-100 bg-[linear-gradient(135deg,#983108_0%,#f76707_52%,#ffb357_100%)] text-white shadow-[0_28px_80px_rgba(194,65,12,0.24)]">
        <div className="grid gap-6 px-7 py-8 lg:grid-cols-[minmax(0,1.4fr)_420px] lg:px-10 lg:py-10">
          <div>
            <div className="inline-flex rounded-full border border-white/25 bg-white/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-white/90">
              {t.heroBadge}
            </div>
            <h1 className="mt-5 max-w-3xl text-4xl font-semibold leading-[1.05] tracking-[-0.04em] text-white md:text-5xl">
              {t.heroTitle}
            </h1>
            <p className="mt-5 max-w-3xl text-sm leading-7 text-white/90 md:text-base">
              {t.heroDescription}
            </p>
          </div>

          <div className="grid gap-4">
            <div className="rounded-[28px] border border-white/30 bg-white/12 p-5 backdrop-blur-sm">
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-white/75">{t.snapshotBadge}</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                <div className="rounded-[20px] border border-white/20 bg-white/10 px-4 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/70">{t.rating}</p>
                  <p className="mt-2 text-2xl font-semibold text-white">
                    {reviews.length > 0 ? averageRating.toFixed(1) : "-"}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-white/70">{t.ratingSnapshotNote}</p>
                </div>
                <div className="rounded-[20px] border border-white/20 bg-white/10 px-4 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/70">{t.featuredPackage}</p>
                  <p className="mt-2 text-base font-semibold text-white">{topRatedPackage}</p>
                  <p className="mt-1 text-xs leading-5 text-white/70">{t.featuredPackageNote}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {reviewResult.error ? (
        <div className="mt-6 rounded-[24px] border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
          {t.loadError}
        </div>
      ) : (
        <>
          <section className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {metricCards.map((card) => (
              <div
                key={card.label}
                className="rounded-[26px] border border-[#f0ddc7] bg-white px-5 py-5 shadow-[0_18px_44px_rgba(15,23,42,0.06)]"
              >
                <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-orange-500">{card.label}</p>
                <p className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-slate-950">{card.value}</p>
                <p className="mt-2 text-xs leading-6 text-slate-500">{card.note}</p>
              </div>
            ))}
          </section>

          <section className="mt-8 rounded-[32px] border border-[#f3dbc3] bg-white/85 p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur-sm lg:p-7">
            <div className="flex flex-col gap-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-orange-500">{t.feedbackBadge}</p>
              <h2 className="text-2xl font-semibold tracking-[-0.03em] text-slate-950">{t.feedbackTitle}</h2>
              <p className="text-sm leading-6 text-slate-500">
                {t.feedbackDescription}
              </p>
            </div>

            {reviews.length === 0 ? (
              <div className="mt-5 rounded-[22px] border border-[#eadfce] bg-[#fffaf3] p-5 text-sm text-slate-600">
                {t.emptyState}
              </div>
            ) : (
              <div className="mt-6 grid gap-4 xl:grid-cols-2">
                {reviews.map((review) => (
                  <article
                    key={review.id}
                    className="rounded-[26px] border border-[#eadfce] bg-[linear-gradient(180deg,#fffdf9_0%,#fff8ef_100%)] p-5"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                          <p className="text-lg font-semibold text-slate-950">{review.packages?.title || t.packageFallback}</p>
                          <p className="mt-1 text-xs text-slate-500">
                          {review.customer_name || t.customerFallback} | {formatDate(review.created_at)}
                          </p>
                        </div>
                      <div className="rounded-full bg-orange-50 px-3 py-1 text-sm font-semibold text-orange-700">
                        {(review.rating ?? 0).toFixed(1)} / 5
                      </div>
                    </div>
                    <p className="mt-4 text-xs font-semibold uppercase tracking-[0.26em] text-orange-500">
                      {renderStars(review.rating ?? 0)}
                    </p>
                    <p className="mt-3 text-sm leading-7 text-slate-700">{review.comment || "-"}</p>
                  </article>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </main>
  )
}

function getReviewText(locale: Locale) {
  const dict = {
    id: {
      merchantMissing: "Data merchant tidak ditemukan.",
      packageFallback: "Paket",
      customerFallback: "Customer",
      averageRating: "Rating rata-rata",
      averageRatingNote: (count: number) => `Rata-rata dari ${count} review`,
      customerComments: "Komentar customer",
      customerCommentsNote: "Review yang berisi komentar",
      totalReviews: "Total review",
      totalReviewsNote: "Semua rating yang sudah masuk",
      topPackage: "Paket terbaik",
      topPackageNote: "Rata-rata rating tertinggi",
      heroBadge: "Merchant Reviews",
      heroTitle: "Reputasi merchant yang lebih jelas untuk menjaga kualitas pengalaman customer.",
      heroDescription:
        "Pantau rating paket, baca komentar customer, dan identifikasi paket yang paling kuat secara service quality dalam satu review workspace yang lebih rapi.",
      snapshotBadge: "Review Snapshot",
      rating: "Rating",
      ratingSnapshotNote: "Rerata semua review customer",
      featuredPackage: "Paket unggulan",
      featuredPackageNote: "Berdasarkan rerata rating tertinggi",
      loadError: "Gagal memuat review customer.",
      feedbackBadge: "Customer Feedback",
      feedbackTitle: "Daftar komentar customer",
      feedbackDescription: "Review terbaru dari customer untuk setiap paket merchant.",
      emptyState: "Belum ada review customer untuk paket merchant ini.",
    },
    en: {
      merchantMissing: "Merchant data not found.",
      packageFallback: "Package",
      customerFallback: "Customer",
      averageRating: "Average rating",
      averageRatingNote: (count: number) => `Average from ${count} reviews`,
      customerComments: "Customer comments",
      customerCommentsNote: "Reviews that contain comments",
      totalReviews: "Total reviews",
      totalReviewsNote: "All incoming ratings",
      topPackage: "Top package",
      topPackageNote: "Highest average rating",
      heroBadge: "Merchant Reviews",
      heroTitle: "A clearer merchant reputation view to protect customer experience quality.",
      heroDescription:
        "Track package ratings, read customer comments, and identify your strongest service-quality packages in one cleaner review workspace.",
      snapshotBadge: "Review Snapshot",
      rating: "Rating",
      ratingSnapshotNote: "Average across all customer reviews",
      featuredPackage: "Featured package",
      featuredPackageNote: "Based on the highest average rating",
      loadError: "Failed to load customer reviews.",
      feedbackBadge: "Customer Feedback",
      feedbackTitle: "Customer comment list",
      feedbackDescription: "Latest customer reviews for each merchant package.",
      emptyState: "There are no customer reviews for this merchant package yet.",
    },
    zh: {
      merchantMissing: "未找到商家数据。",
      packageFallback: "套餐",
      customerFallback: "客户",
      averageRating: "平均评分",
      averageRatingNote: (count: number) => `来自 ${count} 条评价的平均值`,
      customerComments: "客户评论",
      customerCommentsNote: "包含留言的评价",
      totalReviews: "评价总数",
      totalReviewsNote: "所有已收到的评分",
      topPackage: "最佳套餐",
      topPackageNote: "平均评分最高",
      heroBadge: "商家评价",
      heroTitle: "更清晰地查看商家口碑，持续守住客户体验质量。",
      heroDescription: "在一个更整洁的评价工作台中查看套餐评分、客户评论，并识别服务质量表现最强的套餐。",
      snapshotBadge: "评价概览",
      rating: "评分",
      ratingSnapshotNote: "所有客户评价的平均值",
      featuredPackage: "热门套餐",
      featuredPackageNote: "基于最高平均评分",
      loadError: "加载客户评价失败。",
      feedbackBadge: "客户反馈",
      feedbackTitle: "客户评论列表",
      feedbackDescription: "每个商家套餐的最新客户评价。",
      emptyState: "该商家套餐暂时还没有客户评价。",
    },
  } satisfies Record<Locale, Record<string, unknown>>

  return dict[locale] as typeof dict.id
}
