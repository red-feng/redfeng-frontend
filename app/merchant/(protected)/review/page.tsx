import { createClient } from "@/lib/supabase/server"

type MerchantReviewRow = {
  id: string
  rating: number | null
  comment: string | null
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

export default async function MerchantReviewPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const reviewResult = await supabase
    .from("package_reviews")
    .select("id, rating, comment, created_at, packages!inner(title, merchant_id)")
    .eq("packages.merchant_id", user.id)
    .order("created_at", { ascending: false })

  const tableMissing = Boolean(
    reviewResult.error && reviewResult.error.message.toLowerCase().includes("does not exist"),
  )
  const reviews = (reviewResult.data as MerchantReviewRow[] | null) || []
  const totalRating = reviews.reduce((sum, review) => sum + (review.rating ?? 0), 0)
  const averageRating = reviews.length > 0 ? totalRating / reviews.length : 0

  return (
    <div className="p-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Review</h1>
        <p className="text-sm text-slate-500">Merchant dapat melihat rating paket dan komentar customer.</p>
      </div>

      {tableMissing ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-700">
          Data review customer belum tersedia karena tabel `package_reviews` belum ada di database.
        </div>
      ) : reviewResult.error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
          Gagal memuat review customer.
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">Rating paket</p>
              <p className="mt-2 text-3xl font-bold text-slate-900">
                {reviews.length > 0 ? averageRating.toFixed(1) : "-"}
              </p>
              <p className="mt-1 text-xs text-slate-500">Rata-rata dari {reviews.length} review</p>
            </div>
            <div className="rounded-2xl border bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">Komentar customer</p>
              <p className="mt-2 text-3xl font-bold text-slate-900">{reviews.length}</p>
              <p className="mt-1 text-xs text-slate-500">Total review yang masuk</p>
            </div>
          </div>

          <section className="mt-8 rounded-2xl border bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">Daftar komentar customer</h2>

            {reviews.length === 0 ? (
              <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                Belum ada review customer untuk paket merchant ini.
              </div>
            ) : (
              <div className="mt-5 space-y-4">
                {reviews.map((review) => (
                  <article key={review.id} className="rounded-xl border border-slate-200 p-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="font-semibold text-slate-900">{review.packages?.title || "Paket"}</p>
                        <p className="text-xs text-slate-500">{formatDate(review.created_at)}</p>
                      </div>
                      <div className="rounded-full bg-orange-100 px-3 py-1 text-sm font-semibold text-orange-700">
                        {review.rating ?? "-"} / 5
                      </div>
                    </div>
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
