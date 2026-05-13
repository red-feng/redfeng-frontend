import Link from "next/link"
import { createAdminClient } from "@/lib/supabase/admin"

export default async function MarketingDashboardPage({
  searchParams,
}: {
  searchParams?: Promise<{ success?: string; error?: string }>
}) {
  const params = searchParams ? await searchParams : {}
  const adminSupabase = createAdminClient()
  const now = new Date()
  const todayIso = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
  const last7Iso = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000).toISOString()

  const [activeSubscribersResult, todaySubscribersResult, weekSubscribersResult, promoCountResult, articleCountResult, recentSubscribersResult] = await Promise.all([
    adminSupabase.from("newsletter_subscribers").select("id", { count: "exact", head: true }).eq("status", "active"),
    adminSupabase.from("newsletter_subscribers").select("id", { count: "exact", head: true }).gte("subscribed_at", todayIso),
    adminSupabase.from("newsletter_subscribers").select("id", { count: "exact", head: true }).gte("subscribed_at", last7Iso),
    adminSupabase.from("marketing_promos").select("id", { count: "exact", head: true }).eq("is_active", true),
    adminSupabase.from("marketing_inspiration_articles").select("id", { count: "exact", head: true }).eq("is_active", true),
    adminSupabase
      .from("newsletter_subscribers")
      .select("id, email, locale, source_path, subscribed_at, status")
      .order("subscribed_at", { ascending: false })
      .limit(6),
  ])

  const stats = [
    { label: "Subscriber aktif", value: String(activeSubscribersResult.count || 0), note: "Audience newsletter yang siap dipakai untuk campaign." },
    { label: "Subscriber hari ini", value: String(todaySubscribersResult.count || 0), note: "Pertumbuhan audience yang masuk sejak pukul 00:00 hari ini." },
    { label: "Subscriber 7 hari", value: String(weekSubscribersResult.count || 0), note: "Momentum akuisisi audience dalam 7 hari terakhir." },
    { label: "Promo aktif", value: String(promoCountResult.count || 0), note: "Jumlah promo yang sedang aktif dipakai halaman publik." },
    { label: "Artikel inspirasi aktif", value: String(articleCountResult.count || 0), note: "Jumlah artikel yang mengisi blok inspirasi homepage." },
  ]

  const recentSubscribers =
    (recentSubscribersResult.data as Array<{
      id: string
      email: string
      locale: string | null
      source_path: string | null
      subscribed_at: string | null
      status: string | null
    }> | null) || []

  return (
    <main className="min-h-screen px-6 py-8 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-7xl space-y-8">
        <section className="rounded-[32px] border border-orange-200/60 bg-[linear-gradient(135deg,#7c2d12_0%,#c2410c_38%,#f97316_72%,#fdba74_100%)] px-8 py-10 text-white shadow-[0_30px_100px_rgba(146,64,14,0.18)]">
          <p className="inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.34em] text-orange-50">
            Marketing Overview
          </p>
          <h1 className="mt-5 text-4xl font-semibold tracking-tight sm:text-5xl">
            Marketing sekarang memegang audience, promo, dan inspirasi.
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-8 text-orange-50/90">
            Workspace ini dibuat agar subscriber newsletter, kartu promo, dan blok inspirasi homepage tidak lagi tersebar sebagai konten statis tanpa owner.
          </p>
        </section>

        {params.success ? <div className="rounded-[24px] border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-700">{params.success}</div> : null}
        {params.error ? <div className="rounded-[24px] border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">{params.error}</div> : null}

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {stats.map((item) => (
            <article key={item.label} className="rounded-[28px] border border-[#f0ddc7] bg-white p-5 shadow-[0_18px_44px_rgba(15,23,42,0.06)]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-orange-500">{item.label}</p>
              <p className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-slate-950">{item.value}</p>
              <p className="mt-3 text-sm leading-7 text-slate-600">{item.note}</p>
            </article>
          ))}
        </section>

        <section className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <article className="rounded-[32px] border border-[#f3dbc3] bg-white p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-orange-500">Next actions</p>
            <div className="mt-5 grid gap-3">
              <Link href="/marketing/newsletters" className="rounded-[22px] border border-[#efe1cf] bg-[#fffaf3] px-5 py-4 text-sm font-semibold text-slate-900 transition hover:border-orange-200 hover:bg-orange-50/40">
                Kelola subscriber newsletter
              </Link>
              <Link href="/marketing/promos" className="rounded-[22px] border border-[#efe1cf] bg-[#fffaf3] px-5 py-4 text-sm font-semibold text-slate-900 transition hover:border-orange-200 hover:bg-orange-50/40">
                Edit promo yang tampil di homepage, halaman promo, dan wishlist
              </Link>
              <Link href="/marketing/inspiration" className="rounded-[22px] border border-[#efe1cf] bg-[#fffaf3] px-5 py-4 text-sm font-semibold text-slate-900 transition hover:border-orange-200 hover:bg-orange-50/40">
                Atur blok “Temukan ide perjalanan…” di homepage
              </Link>
            </div>
          </article>

          <article className="rounded-[32px] border border-[#f3dbc3] bg-white p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-orange-500">Recent subscribers</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950">Subscriber terbaru</h2>
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
                          {item.source_path || "/"} • {String(item.locale || "id").toUpperCase()}
                        </p>
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
      </div>
    </main>
  )
}
