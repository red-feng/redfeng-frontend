import { updateNewsletterSubscriberStatus } from "@/app/marketing/(protected)/actions"
import { createAdminClient } from "@/lib/supabase/admin"

export default async function MarketingNewslettersPage({
  searchParams,
}: {
  searchParams?: Promise<{ success?: string; error?: string }>
}) {
  const params = searchParams ? await searchParams : {}
  const adminSupabase = createAdminClient()
  const { data } = await adminSupabase
    .from("newsletter_subscribers")
    .select("id, email, locale, source_path, status, subscribed_at")
    .order("subscribed_at", { ascending: false })
    .limit(200)

  const subscribers =
    (data as Array<{
      id: string
      email: string
      locale: string | null
      source_path: string | null
      status: string | null
      subscribed_at: string | null
    }> | null) || []

  return (
    <main className="min-h-screen px-6 py-8 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="rounded-[32px] border border-[#f3dbc3] bg-white p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-orange-500">Newsletter audience</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-slate-950">Kelola subscriber newsletter</h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
            Semua email yang masuk dari form newsletter homepage dan landing packages terkumpul di sini untuk dipakai tim marketing.
          </p>
        </section>

        {params.success ? <div className="rounded-[24px] border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-700">{params.success}</div> : null}
        {params.error ? <div className="rounded-[24px] border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">{params.error}</div> : null}

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
                      Sumber: {item.source_path || "/"} • Locale: {String(item.locale || "id").toUpperCase()}
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
