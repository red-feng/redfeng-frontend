import { deleteMarketingInspiration, upsertMarketingInspiration } from "@/app/marketing/(protected)/actions"
import { createAdminClient } from "@/lib/supabase/admin"

type MarketingInspirationSearchParams = {
  success?: string
  error?: string
  q?: string
  status?: string
}

export default async function MarketingInspirationPage({
  searchParams,
}: {
  searchParams?: Promise<MarketingInspirationSearchParams>
}) {
  const params = searchParams ? await searchParams : {}
  const query = String(params.q || "").trim().toLowerCase()
  const statusFilter = String(params.status || "all").trim()
  const adminSupabase = createAdminClient()

  let articleQuery = adminSupabase
    .from("marketing_inspiration_articles")
    .select("id, slug, category_id, category_en, category_zh, title_id, title_en, title_zh, read_time_id, read_time_en, read_time_zh, body_intro_id, body_intro_en, body_intro_zh, section_one_id, section_one_en, section_one_zh, section_two_id, section_two_en, section_two_zh, section_three_id, section_three_en, section_three_zh, image, href, is_active, sort_order")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true })

  if (statusFilter === "active") {
    articleQuery = articleQuery.eq("is_active", true)
  }

  if (statusFilter === "inactive") {
    articleQuery = articleQuery.eq("is_active", false)
  }

  const [{ data }, { count: activeCount }, { count: inactiveCount }] = await Promise.all([
    articleQuery,
    adminSupabase.from("marketing_inspiration_articles").select("id", { count: "exact", head: true }).eq("is_active", true),
    adminSupabase.from("marketing_inspiration_articles").select("id", { count: "exact", head: true }).eq("is_active", false),
  ])

  const articles = ((data as Array<Record<string, string | number | boolean | null>> | null) || []).filter((article) => {
    if (!query) return true

    const haystack = [
      article.slug,
      article.category_id,
      article.category_en,
      article.category_zh,
      article.title_id,
      article.title_en,
      article.title_zh,
      article.href,
    ]
      .map((value) => String(value || "").toLowerCase())
      .join(" ")

    return haystack.includes(query)
  })

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fff8f1_0%,#f7f1e8_100%)] px-4 py-5 sm:px-6 sm:py-6 md:px-8 md:py-8 lg:px-10">
      <div className="mx-auto max-w-7xl space-y-5 sm:space-y-6 lg:space-y-8">
        <section className="overflow-hidden rounded-[28px] border border-orange-200/60 bg-[linear-gradient(135deg,#7c2d12_0%,#c2410c_38%,#f97316_72%,#fdba74_100%)] px-5 py-6 text-white shadow-[0_30px_100px_rgba(146,64,14,0.18)] sm:rounded-[32px] sm:px-8 sm:py-8 lg:px-10">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_320px]">
            <div className="max-w-3xl">
              <span className="inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.34em] text-orange-50">
                Inspiration Content
              </span>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:mt-5 sm:text-4xl lg:text-5xl">
                Kelola blok &quot;Temukan ide perjalanan untuk petualangan berikutnya&quot; dari satu panel.
              </h1>
              <p className="mt-3 text-sm leading-7 text-orange-50/90 sm:mt-4 sm:text-base sm:leading-8">
                Marketing memegang artikel inspirasi dan isi detailnya agar homepage, discovery, dan momentum campaign
                tetap terarah tanpa bergantung pada hardcoded content.
              </p>
            </div>
            <div className="rounded-[22px] border border-white/20 bg-white/10 px-4 py-4 backdrop-blur sm:rounded-[24px] sm:px-5 sm:py-5">
              <p className="text-[11px] uppercase tracking-[0.28em] text-orange-100/80">Content snapshot</p>
              <div className="mt-5 grid gap-4">
                <div>
                  <p className="text-sm text-orange-50/80">Active article</p>
                  <p className="mt-1 text-2xl font-semibold text-white sm:text-3xl">{(activeCount || 0).toLocaleString("id-ID")}</p>
                </div>
                <div>
                  <p className="text-sm text-orange-50/80">Inactive article</p>
                  <p className="mt-1 text-2xl font-semibold text-white sm:text-3xl">{(inactiveCount || 0).toLocaleString("id-ID")}</p>
                </div>
                <div>
                  <p className="text-sm text-orange-50/80">Filtered result</p>
                  <p className="mt-1 text-2xl font-semibold text-white sm:text-3xl">{articles.length.toLocaleString("id-ID")}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {params.success ? <div className="rounded-[24px] border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-700">{params.success}</div> : null}
        {params.error ? <div className="rounded-[24px] border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">{params.error}</div> : null}

        <section className="grid gap-3 sm:gap-4 md:grid-cols-3">
          <article className="rounded-[22px] border border-[#f0ddc7] bg-white px-4 py-4 shadow-[0_18px_44px_rgba(15,23,42,0.06)] sm:rounded-[26px] sm:px-5 sm:py-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-orange-500">Active article</p>
            <p className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-slate-950 sm:text-3xl">{(activeCount || 0).toLocaleString("id-ID")}</p>
            <p className="mt-2 text-xs leading-6 text-slate-500">Artikel yang sedang dipakai di area publik.</p>
          </article>
          <article className="rounded-[22px] border border-[#f0ddc7] bg-white px-4 py-4 shadow-[0_18px_44px_rgba(15,23,42,0.06)] sm:rounded-[26px] sm:px-5 sm:py-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-orange-500">Inactive article</p>
            <p className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-slate-950 sm:text-3xl">{(inactiveCount || 0).toLocaleString("id-ID")}</p>
            <p className="mt-2 text-xs leading-6 text-slate-500">Stok ide yang masih disimpan untuk momentum berikutnya.</p>
          </article>
          <article className="rounded-[22px] border border-[#f0ddc7] bg-white px-4 py-4 shadow-[0_18px_44px_rgba(15,23,42,0.06)] sm:rounded-[26px] sm:px-5 sm:py-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-orange-500">Current result</p>
            <p className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-slate-950 sm:text-3xl">{articles.length.toLocaleString("id-ID")}</p>
            <p className="mt-2 text-xs leading-6 text-slate-500">Artikel yang sedang tampil sesuai filter sekarang.</p>
          </article>
        </section>

        <section className="rounded-[24px] border border-[#f3dbc3] bg-white/85 p-5 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur-sm sm:rounded-[32px] sm:p-6 lg:p-7">
          <form className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="xl:col-span-3">
              <label className="mb-2 block text-sm font-medium text-slate-700">Cari artikel</label>
              <input
                name="q"
                defaultValue={String(params.q || "")}
                placeholder="Cari berdasarkan slug, kategori, judul, atau href"
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
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <div className="flex gap-3 xl:col-span-4">
              <button className="rounded-[18px] bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800">
                Terapkan filter
              </button>
              <a
                href="/marketing/inspiration"
                className="rounded-[18px] border border-[#e6d8c2] bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Reset
              </a>
            </div>
          </form>
        </section>

        <section className="rounded-[24px] border border-[#f3dbc3] bg-white/85 p-5 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur-sm sm:rounded-[32px] sm:p-6 lg:p-7">
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-orange-500">Create article</p>
          <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-500">
            Gunakan panel ini untuk menulis artikel baru atau menyegarkan isi blok inspirasi yang sedang berjalan.
          </p>
          <div className="mt-5">
            <InspirationForm />
          </div>
        </section>

        <section className="space-y-4">
          {!articles.length ? (
            <div className="rounded-[24px] border border-dashed border-[#e8d7c1] bg-[#fffaf3] px-5 py-6 text-sm text-slate-500">
              Belum ada artikel yang cocok dengan filter saat ini.
            </div>
          ) : null}
          {articles.map((article) => (
            <article key={String(article.id)} className="rounded-[24px] border border-[#f3dbc3] bg-white/85 p-5 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur-sm sm:rounded-[32px] sm:p-6 lg:p-7">
              <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-orange-500">Existing article</p>
                  <h2 className="mt-2 text-xl font-semibold text-slate-950">{String(article.slug)}</h2>
                  <p className="mt-2 text-sm text-slate-500">
                    Status: {Boolean(article.is_active) ? "Active" : "Inactive"} | Sort: {String(article.sort_order || 0)}
                  </p>
                </div>
                <form action={deleteMarketingInspiration}>
                  <input type="hidden" name="article_id" value={String(article.id)} />
                  <input type="hidden" name="slug" value={String(article.slug)} />
                  <input type="hidden" name="return_to" value="/marketing/inspiration" />
                  <button className="rounded-[16px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-100">
                    Hapus artikel
                  </button>
                </form>
              </div>
              <InspirationForm article={article} />
            </article>
          ))}
        </section>
      </div>
    </main>
  )
}

function InspirationForm({ article }: { article?: Record<string, string | number | boolean | null> }) {
  return (
    <form action={upsertMarketingInspiration} className="grid gap-4">
      <input type="hidden" name="article_id" value={article ? String(article.id) : ""} />
      <input type="hidden" name="return_to" value="/marketing/inspiration" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Field label="Slug" name="slug" defaultValue={article ? String(article.slug || "") : ""} />
        <Field label="Href" name="href" defaultValue={article ? String(article.href || "") : "/packages"} />
        <Field label="Sort order" name="sort_order" type="number" defaultValue={article ? String(article.sort_order || 0) : "0"} />
        <Field label="Category ID" name="category_id" defaultValue={article ? String(article.category_id || "") : ""} />
        <Field label="Category EN" name="category_en" defaultValue={article ? String(article.category_en || "") : ""} />
        <Field label="Category ZH" name="category_zh" defaultValue={article ? String(article.category_zh || "") : ""} />
        <Field label="Title ID" name="title_id" defaultValue={article ? String(article.title_id || "") : ""} />
        <Field label="Title EN" name="title_en" defaultValue={article ? String(article.title_en || "") : ""} />
        <Field label="Title ZH" name="title_zh" defaultValue={article ? String(article.title_zh || "") : ""} />
        <Field label="Read time ID" name="read_time_id" defaultValue={article ? String(article.read_time_id || "") : ""} />
        <Field label="Read time EN" name="read_time_en" defaultValue={article ? String(article.read_time_en || "") : ""} />
        <Field label="Read time ZH" name="read_time_zh" defaultValue={article ? String(article.read_time_zh || "") : ""} />
        <Field label="Image" name="image" defaultValue={article ? String(article.image || "") : ""} />
      </div>
      <TextArea label="Body intro ID" name="body_intro_id" defaultValue={article ? String(article.body_intro_id || "") : ""} />
      <TextArea label="Body intro EN" name="body_intro_en" defaultValue={article ? String(article.body_intro_en || "") : ""} />
      <TextArea label="Body intro ZH" name="body_intro_zh" defaultValue={article ? String(article.body_intro_zh || "") : ""} />
      <TextArea label="Section 1 ID" name="section_one_id" defaultValue={article ? String(article.section_one_id || "") : ""} />
      <TextArea label="Section 1 EN" name="section_one_en" defaultValue={article ? String(article.section_one_en || "") : ""} />
      <TextArea label="Section 1 ZH" name="section_one_zh" defaultValue={article ? String(article.section_one_zh || "") : ""} />
      <TextArea label="Section 2 ID" name="section_two_id" defaultValue={article ? String(article.section_two_id || "") : ""} />
      <TextArea label="Section 2 EN" name="section_two_en" defaultValue={article ? String(article.section_two_en || "") : ""} />
      <TextArea label="Section 2 ZH" name="section_two_zh" defaultValue={article ? String(article.section_two_zh || "") : ""} />
      <TextArea label="Section 3 ID" name="section_three_id" defaultValue={article ? String(article.section_three_id || "") : ""} />
      <TextArea label="Section 3 EN" name="section_three_en" defaultValue={article ? String(article.section_three_en || "") : ""} />
      <TextArea label="Section 3 ZH" name="section_three_zh" defaultValue={article ? String(article.section_three_zh || "") : ""} />
      <label className="inline-flex items-center gap-3 text-sm font-medium text-slate-700">
        <input type="checkbox" name="is_active" defaultChecked={article ? Boolean(article.is_active) : true} />
        Artikel aktif
      </label>
      <button className="w-fit rounded-[18px] bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800">
        {article ? "Simpan perubahan artikel" : "Buat artikel"}
      </button>
    </form>
  )
}

function Field({
  label,
  name,
  defaultValue,
  type = "text",
}: {
  label: string
  name: string
  defaultValue: string
  type?: string
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-slate-700">{label}</label>
      <input
        name={name}
        type={type}
        required
        defaultValue={defaultValue}
        className="w-full rounded-[18px] border border-[#e6d8c2] bg-[#fffdf9] px-4 py-3 text-sm outline-none ring-orange-500 transition focus:ring-2"
      />
    </div>
  )
}

function TextArea({ label, name, defaultValue }: { label: string; name: string; defaultValue: string }) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-slate-700">{label}</label>
      <textarea
        name={name}
        required
        defaultValue={defaultValue}
        rows={3}
        className="w-full rounded-[18px] border border-[#e6d8c2] bg-[#fffdf9] px-4 py-3 text-sm outline-none ring-orange-500 transition focus:ring-2"
      />
    </div>
  )
}
