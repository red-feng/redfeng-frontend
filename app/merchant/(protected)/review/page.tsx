import { createAdminClient } from "@/lib/supabase/admin"
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

  if (!merchant) return <div className="p-10">Data merchant tidak ditemukan.</div>

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
        const key = review.packages?.title || "Paket"
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
      value: reviews.length > 0 ? averageRating.toFixed(1) : "-",
      note: `Rata-rata dari ${reviews.length} review`,
    },
    {
      label: "Komentar customer",
      value: String(commentedReviews),
      note: "Review yang berisi komentar",
    },
    {
      label: "Total review",
      value: String(reviews.length),
      note: "Semua rating yang sudah masuk",
    },
    {
      label: "Paket terbaik",
      value: topRatedPackage,
      note: "Rata-rata rating tertinggi",
    },
  ]

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fff8f1_0%,#f7f1e8_38%,#f3eee7_100%)] p-6 md:p-10">
      <section className="overflow-hidden rounded-[34px] border border-orange-100 bg-[linear-gradient(135deg,#983108_0%,#f76707_52%,#ffb357_100%)] text-white shadow-[0_28px_80px_rgba(194,65,12,0.24)]">
        <div className="grid gap-6 px-7 py-8 lg:grid-cols-[minmax(0,1.4fr)_420px] lg:px-10 lg:py-10">
          <div>
            <div className="inline-flex rounded-full border border-white/25 bg-white/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-white/90">
              Merchant Reviews
            </div>
            <h1 className="mt-5 max-w-3xl text-4xl font-semibold leading-[1.05] tracking-[-0.04em] text-white md:text-5xl">
              Reputasi merchant yang lebih jelas untuk menjaga kualitas pengalaman customer.
            </h1>
            <p className="mt-5 max-w-3xl text-sm leading-7 text-white/90 md:text-base">
              Pantau rating paket, baca komentar customer, dan identifikasi paket yang paling kuat secara
              service quality dalam satu review workspace yang lebih rapi.
            </p>
          </div>

          <div className="grid gap-4">
            <div className="rounded-[28px] border border-white/30 bg-white/12 p-5 backdrop-blur-sm">
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-white/75">Review Snapshot</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                <div className="rounded-[20px] border border-white/20 bg-white/10 px-4 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/70">Rating</p>
                  <p className="mt-2 text-2xl font-semibold text-white">
                    {reviews.length > 0 ? averageRating.toFixed(1) : "-"}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-white/70">Rerata semua review customer</p>
                </div>
                <div className="rounded-[20px] border border-white/20 bg-white/10 px-4 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/70">Paket unggulan</p>
                  <p className="mt-2 text-base font-semibold text-white">{topRatedPackage}</p>
                  <p className="mt-1 text-xs leading-5 text-white/70">Berdasarkan rerata rating tertinggi</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {reviewResult.error ? (
        <div className="mt-6 rounded-[24px] border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
          Gagal memuat review customer.
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
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-orange-500">Customer Feedback</p>
              <h2 className="text-2xl font-semibold tracking-[-0.03em] text-slate-950">Daftar komentar customer</h2>
              <p className="text-sm leading-6 text-slate-500">
                Review terbaru dari customer untuk setiap paket merchant.
              </p>
            </div>

            {reviews.length === 0 ? (
              <div className="mt-5 rounded-[22px] border border-[#eadfce] bg-[#fffaf3] p-5 text-sm text-slate-600">
                Belum ada review customer untuk paket merchant ini.
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
                        <p className="text-lg font-semibold text-slate-950">{review.packages?.title || "Paket"}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {review.customer_name || "Customer"} | {formatDate(review.created_at)}
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
