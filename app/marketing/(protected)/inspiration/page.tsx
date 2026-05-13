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

  const { data } = await articleQuery
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
    <main className="min-h-screen px-6 py-8 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="rounded-[32px] border border-[#f3dbc3] bg-white p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-orange-500">Inspiration block</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-slate-950">
            Kelola blok &quot;Temukan ide perjalanan untuk petualangan berikutnya&quot;
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
            Marketing sekarang memegang kartu artikel dan isi detail yang tampil di homepage serta halaman inspirasi.
          </p>
        </section>

        {params.success ? <div className="rounded-[24px] border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-700">{params.success}</div> : null}
        {params.error ? <div className="rounded-[24px] border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">{params.error}</div> : null}

        <section className="rounded-[32px] border border-[#f3dbc3] bg-white p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
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

        <section className="rounded-[32px] border border-[#f3dbc3] bg-white p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-orange-500">Create article</p>
          <InspirationForm />
        </section>

        <section className="space-y-4">
          {!articles.length ? (
            <div className="rounded-[24px] border border-dashed border-[#e8d7c1] bg-[#fffaf3] px-5 py-6 text-sm text-slate-500">
              Belum ada artikel yang cocok dengan filter saat ini.
            </div>
          ) : null}
          {articles.map((article) => (
            <article key={String(article.id)} className="rounded-[32px] border border-[#f3dbc3] bg-white p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
              <div className="mb-5 flex items-center justify-between gap-3">
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
