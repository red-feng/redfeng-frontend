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
  return "★★★★★".slice(0, rounded) + "☆☆☆☆☆".slice(0, 5 - rounded)
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
  const topRatedPackage = Array.from(
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
      label: "Rating paket",
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
    <div className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)] p-6 md:p-10">
      <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">Review</h1>
        <p className="mt-1 text-sm text-slate-500">
          Pantau rating paket dan komentar customer untuk menjaga kualitas layanan merchant.
        </p>
      </section>

      {reviewResult.error ? (
        <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
          Gagal memuat review customer.
        </div>
      ) : (
        <>
          <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {metricCards.map((card) => (
              <div key={card.label} className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-sm text-slate-500">{card.label}</p>
                <p className="mt-2 text-3xl font-bold text-slate-900">{card.value}</p>
                <p className="mt-2 text-xs text-slate-500">{card.note}</p>
              </div>
            ))}
          </section>

          <section className="mt-8 rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-2">
              <h2 className="text-xl font-semibold text-slate-900">Daftar komentar customer</h2>
              <p className="text-sm text-slate-500">
                Review terbaru dari customer untuk setiap paket merchant.
              </p>
            </div>

            {reviews.length === 0 ? (
              <div className="mt-5 rounded-[20px] border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600">
                Belum ada review customer untuk paket merchant ini.
              </div>
            ) : (
              <div className="mt-5 grid gap-4 xl:grid-cols-2">
                {reviews.map((review) => (
                  <article key={review.id} className="rounded-[24px] border border-slate-200 bg-slate-50/60 p-5">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-base font-semibold text-slate-900">
                          {review.packages?.title || "Paket"}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {review.customer_name || "Customer"} | {formatDate(review.created_at)}
                        </p>
                      </div>
                      <div className="rounded-full bg-amber-50 px-3 py-1 text-sm font-semibold text-amber-700">
                        {(review.rating ?? 0).toFixed(1)} / 5
                      </div>
                    </div>
                    <p className="mt-4 text-sm tracking-[0.18em] text-amber-500">
                      {renderStars(review.rating ?? 0)}
                    </p>
                    <p className="mt-3 text-sm leading-6 text-slate-700">{review.comment || "-"}</p>
                  </article>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  )
}
