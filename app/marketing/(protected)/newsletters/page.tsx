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
    <main className="min-h-screen px-6 py-8 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="rounded-[32px] border border-[#f3dbc3] bg-white p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-orange-500">Newsletter audience</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-slate-950">Kelola subscriber newsletter</h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
            Semua email yang masuk dari form newsletter homepage dan landing packages terkumpul di sini untuk dipakai tim marketing.
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-[22px] border border-[#efe1cf] bg-[#fffaf3] px-4 py-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-orange-500">Active</p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">{(activeCount || 0).toLocaleString("id-ID")}</p>
            </div>
            <div className="rounded-[22px] border border-[#efe1cf] bg-[#fffaf3] px-4 py-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-orange-500">Unsubscribed</p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">{(unsubscribedCount || 0).toLocaleString("id-ID")}</p>
            </div>
            <div className="rounded-[22px] border border-[#efe1cf] bg-[#fffaf3] px-4 py-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-orange-500">Current result</p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">{subscribers.length.toLocaleString("id-ID")}</p>
            </div>
          </div>
        </section>

        {params.success ? <div className="rounded-[24px] border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-700">{params.success}</div> : null}
        {params.error ? <div className="rounded-[24px] border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">{params.error}</div> : null}

        <section className="rounded-[32px] border border-[#f3dbc3] bg-white p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
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
              <article key={item.id} className="rounded-[28px] border border-[#f0ddc7] bg-white p-5 shadow-[0_18px_44px_rgba(15,23,42,0.06)]">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="text-lg font-semibold text-slate-950">{item.email}</p>
                    <p className="mt-2 text-sm text-slate-500">
                      Sumber: {item.source_path || "/"} | Locale: {String(item.locale || "id").toUpperCase()}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      Subscribe: {item.subscribed_at ? new Date(item.subscribed_at).toLocaleString("id-ID") : "-"}
                    </p>
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
