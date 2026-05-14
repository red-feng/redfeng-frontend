import { updateNewsletterSubscriberStatus } from "@/app/marketing/(protected)/actions"
import { createAdminClient } from "@/lib/supabase/admin"

type MarketingNewsletterSearchParams = {
  success?: string
  error?: string
  q?: string
  status?: string
  source?: string
}

type SubscriberRow = {
  id: string
  email: string
  locale: string | null
  source_path: string | null
  status: string | null
  subscribed_at: string | null
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

export default async function MarketingNewslettersPage({
  searchParams,
}: {
  searchParams?: Promise<MarketingNewsletterSearchParams>
}) {
  const params = searchParams ? await searchParams : {}
  const query = String(params.q || "").trim()
  const statusFilter = String(params.status || "all").trim()
  const sourceFilter = String(params.source || "all").trim()
  const adminSupabase = createAdminClient()

  let subscriberQuery = adminSupabase
    .from("newsletter_subscribers")
    .select("id, email, locale, source_path, status, subscribed_at")
    .order("subscribed_at", { ascending: false })
    .limit(200)

  if (query) {
    subscriberQuery = subscriberQuery.ilike("email", `%${query}%`)
  }

  if (statusFilter !== "all") {
    subscriberQuery = subscriberQuery.eq("status", statusFilter)
  }

  if (sourceFilter !== "all") {
    subscriberQuery = subscriberQuery.eq("source_path", sourceFilter)
  }

  const [{ data }, { count: activeCount }, { count: unsubscribedCount }] = await Promise.all([
    subscriberQuery,
    adminSupabase.from("newsletter_subscribers").select("id", { count: "exact", head: true }).eq("status", "active"),
    adminSupabase.from("newsletter_subscribers").select("id", { count: "exact", head: true }).eq("status", "unsubscribed"),
  ])

  const subscribers = (data as SubscriberRow[] | null) || []
  const exportQuery = new URLSearchParams()
  if (query) exportQuery.set("q", query)
  if (statusFilter !== "all") exportQuery.set("status", statusFilter)
  if (sourceFilter !== "all") exportQuery.set("source", sourceFilter)
  const exportHref = `/marketing/newsletters/export${exportQuery.toString() ? `?${exportQuery.toString()}` : ""}`

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fff8f1_0%,#f7f1e8_100%)] px-4 py-5 sm:px-6 sm:py-6 md:px-8 md:py-8 lg:px-10">
      <div className="mx-auto max-w-7xl space-y-5 sm:space-y-6 lg:space-y-8">
        <section className="overflow-hidden rounded-[28px] border border-orange-200/60 bg-[linear-gradient(135deg,#7c2d12_0%,#c2410c_38%,#f97316_72%,#fdba74_100%)] px-5 py-6 text-white shadow-[0_30px_100px_rgba(146,64,14,0.18)] sm:rounded-[32px] sm:px-8 sm:py-8 lg:px-10">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_320px]">
            <div className="max-w-3xl">
              <span className="inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.34em] text-orange-50">
                Newsletter Audience
              </span>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:mt-5 sm:text-4xl lg:text-5xl">
                Kelola audience email yang masuk dari homepage dan landing packages.
              </h1>
              <p className="mt-3 text-sm leading-7 text-orange-50/90 sm:mt-4 sm:text-base sm:leading-8">
                Halaman ini dipakai untuk memantau pertumbuhan subscriber, membersihkan audience, dan menyiapkan basis
                campaign marketing berikutnya.
              </p>
            </div>
            <div className="rounded-[22px] border border-white/20 bg-white/10 px-4 py-4 backdrop-blur sm:rounded-[24px] sm:px-5 sm:py-5">
              <p className="text-[11px] uppercase tracking-[0.28em] text-orange-100/80">Audience snapshot</p>
              <div className="mt-5 grid gap-4">
                <div>
                  <p className="text-sm text-orange-50/80">Active subscribers</p>
                  <p className="mt-1 text-2xl font-semibold text-white sm:text-3xl">{(activeCount || 0).toLocaleString("id-ID")}</p>
                </div>
                <div>
                  <p className="text-sm text-orange-50/80">Unsubscribed</p>
                  <p className="mt-1 text-2xl font-semibold text-white sm:text-3xl">{(unsubscribedCount || 0).toLocaleString("id-ID")}</p>
                </div>
                <div>
                  <p className="text-sm text-orange-50/80">Filtered result</p>
                  <p className="mt-1 text-2xl font-semibold text-white sm:text-3xl">{subscribers.length.toLocaleString("id-ID")}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {params.success ? <div className="rounded-[24px] border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-700">{params.success}</div> : null}
        {params.error ? <div className="rounded-[24px] border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">{params.error}</div> : null}

        <section className="grid gap-3 sm:gap-4 md:grid-cols-3">
          <article className="rounded-[22px] border border-[#f0ddc7] bg-white px-4 py-4 shadow-[0_18px_44px_rgba(15,23,42,0.06)] sm:rounded-[26px] sm:px-5 sm:py-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-orange-500">Active</p>
            <p className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-slate-950 sm:text-3xl">{(activeCount || 0).toLocaleString("id-ID")}</p>
            <p className="mt-2 text-xs leading-6 text-slate-500">Subscriber yang masih bisa dipakai untuk campaign.</p>
          </article>
          <article className="rounded-[22px] border border-[#f0ddc7] bg-white px-4 py-4 shadow-[0_18px_44px_rgba(15,23,42,0.06)] sm:rounded-[26px] sm:px-5 sm:py-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-orange-500">Unsubscribed</p>
            <p className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-slate-950 sm:text-3xl">{(unsubscribedCount || 0).toLocaleString("id-ID")}</p>
            <p className="mt-2 text-xs leading-6 text-slate-500">Audience yang sudah dihentikan dari status aktif.</p>
          </article>
          <article className="rounded-[22px] border border-[#f0ddc7] bg-white px-4 py-4 shadow-[0_18px_44px_rgba(15,23,42,0.06)] sm:rounded-[26px] sm:px-5 sm:py-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-orange-500">Current result</p>
            <p className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-slate-950 sm:text-3xl">{subscribers.length.toLocaleString("id-ID")}</p>
            <p className="mt-2 text-xs leading-6 text-slate-500">Hasil yang sedang tampil sesuai filter pencarian.</p>
          </article>
        </section>

        <section className="rounded-[24px] border border-[#f3dbc3] bg-white/85 p-5 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur-sm sm:rounded-[32px] sm:p-6 lg:p-7">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <form className="grid flex-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="xl:col-span-2">
                <label className="mb-2 block text-sm font-medium text-slate-700">Cari email</label>
                <input
                  name="q"
                  defaultValue={query}
                  placeholder="mis: gmail.com atau nama@domain.com"
                  className="w-full rounded-[18px] border border-[#e6d8c2] bg-[#fffdf9] px-4 py-3 text-sm outline-none ring-orange-500 transition focus:ring-2"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Status</label>
                <select
                  name="status"
                  defaultValue={statusFilter}
                  className="w-full rounded-[18px] border border-[#e6d8c2] bg-[#fffdf9] px-4 py-3 text-sm outline-none ring-orange-500 transition focus:ring-2"
                >
                  <option value="all">Semua status</option>
                  <option value="active">Active</option>
                  <option value="unsubscribed">Unsubscribed</option>
                </select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Sumber</label>
                <select
                  name="source"
                  defaultValue={sourceFilter}
                  className="w-full rounded-[18px] border border-[#e6d8c2] bg-[#fffdf9] px-4 py-3 text-sm outline-none ring-orange-500 transition focus:ring-2"
                >
                  <option value="all">Semua sumber</option>
                  <option value="/">Homepage</option>
                  <option value="/packages">Packages</option>
                </select>
              </div>
              <div className="flex gap-3 xl:col-span-4">
                <button className="rounded-[18px] bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800">
                  Terapkan filter
                </button>
                <a
                  href="/marketing/newsletters"
                  className="rounded-[18px] border border-[#e6d8c2] bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Reset
                </a>
              </div>
            </form>
            <a
              href={exportHref}
              className="rounded-[18px] border border-orange-200 bg-orange-50 px-5 py-3 text-sm font-semibold text-orange-700 transition hover:bg-orange-100"
            >
              Export CSV
            </a>
          </div>
        </section>

        <section className="space-y-4">
          {!subscribers.length ? (
            <div className="rounded-[24px] border border-dashed border-[#e8d7c1] bg-[#fffaf3] px-5 py-6 text-sm text-slate-500">
              Belum ada subscriber newsletter.
            </div>
          ) : (
            subscribers.map((item) => (
              <article key={item.id} className="rounded-[24px] border border-[#f3dbc3] bg-white/85 p-5 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur-sm sm:rounded-[28px] sm:p-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="text-lg font-semibold text-slate-950">{item.email}</p>
                    <p className="mt-2 text-sm text-slate-500">
                      Sumber: {item.source_path || "/"} | Locale: {String(item.locale || "id").toUpperCase()}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">Subscribe: {formatDateTime(item.subscribed_at)}</p>
                  </div>
                  <div className="flex flex-col items-start gap-3 md:items-end">
                    <span className={`inline-flex rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] ${item.status === "active" ? "border border-emerald-200 bg-emerald-50 text-emerald-700" : "border border-slate-200 bg-slate-100 text-slate-600"}`}>
                      {item.status || "active"}
                    </span>
                    <form action={updateNewsletterSubscriberStatus}>
                      <input type="hidden" name="subscriber_id" value={item.id} />
                      <input type="hidden" name="return_to" value="/marketing/newsletters" />
                      <input type="hidden" name="next_status" value={item.status === "active" ? "unsubscribed" : "active"} />
                      <button className="rounded-[16px] border border-orange-200 bg-orange-50 px-4 py-3 text-sm font-semibold text-orange-700 transition hover:bg-orange-100">
                        {item.status === "active" ? "Tandai unsubscribed" : "Aktifkan kembali"}
                      </button>
                    </form>
                  </div>
                </div>
              </article>
            ))
          )}
        </section>
      </div>
    </main>
  )
}
