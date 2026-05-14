import { deleteMarketingPromo, upsertMarketingPromo } from "@/app/marketing/(protected)/actions"
import { getMarketingPromoPlacementLabel, marketingPromoPlacementKeys, marketingPromoPlacements } from "@/lib/marketing-promo-placements"
import { getMarketingPromoEffectiveState, getMarketingPromoEffectiveStateLabel, getMarketingPromoStatusLabel, marketingPromoStatuses } from "@/lib/marketing-promo-status"
import { createAdminClient } from "@/lib/supabase/admin"

type MarketingPromoSearchParams = {
  success?: string
  error?: string
  q?: string
  status?: string
}

type MarketingPromoPortal = "marketing" | "superadmin"

type PromoEditorRecord = {
  id: string
  slug: string
  title_id: string | null
  title_en: string | null
  title_zh: string | null
  badge_id: string | null
  badge_en: string | null
  badge_zh: string | null
  eyebrow_id: string | null
  eyebrow_en: string | null
  eyebrow_zh: string | null
  price_id: string | null
  price_en: string | null
  price_zh: string | null
  cta_id: string | null
  cta_en: string | null
  cta_zh: string | null
  image: string | null
  gradient: string | null
  image_class: string | null
  overlay_class: string | null
  glow_class: string | null
  target_href: string | null
  is_active: boolean | null
  status: string | null
  starts_at: string | null
  ends_at: string | null
  sort_order: number | null
  placement_keys: string[]
}

export default async function MarketingPromosPage({
  searchParams,
  portal = "marketing",
}: {
  searchParams?: Promise<MarketingPromoSearchParams>
  portal?: MarketingPromoPortal
}) {
  const params = searchParams ? await searchParams : {}
  const isSuperadminPreview = portal === "superadmin"
  const query = String(params.q || "").trim().toLowerCase()
  const statusFilter = String(params.status || "all").trim()
  const adminSupabase = createAdminClient()
  const basePath = isSuperadminPreview ? "/superadmin/marketing-promos" : "/marketing/promos"
  const nowIso = new Date().toISOString()

  let promoQuery = adminSupabase
    .from("marketing_promos")
    .select("id, slug, title_id, title_en, title_zh, badge_id, badge_en, badge_zh, eyebrow_id, eyebrow_en, eyebrow_zh, price_id, price_en, price_zh, cta_id, cta_en, cta_zh, image, gradient, image_class, overlay_class, glow_class, target_href, is_active, status, starts_at, ends_at, sort_order")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true })

  if (statusFilter === "active") {
    promoQuery = promoQuery.eq("status", "active")
  }

  if (statusFilter === "draft" || statusFilter === "scheduled" || statusFilter === "paused") {
    promoQuery = promoQuery.eq("status", statusFilter)
  }

  const [{ data }, { count: activeCount }, { count: draftCount }, { count: scheduledCount }, { count: pausedCount }, { data: placementRows }] = await Promise.all([
    promoQuery,
    adminSupabase.from("marketing_promos").select("id", { count: "exact", head: true }).eq("status", "active"),
    adminSupabase.from("marketing_promos").select("id", { count: "exact", head: true }).eq("status", "draft"),
    adminSupabase.from("marketing_promos").select("id", { count: "exact", head: true }).eq("status", "scheduled"),
    adminSupabase.from("marketing_promos").select("id", { count: "exact", head: true }).eq("status", "paused"),
    adminSupabase
      .from("marketing_promo_placements")
      .select("promo_id, placement_key")
      .eq("is_active", true),
  ])

  const placementsByPromoId = new Map<string, string[]>()
  for (const row of ((placementRows as Array<{ promo_id: string | null; placement_key: string | null }> | null) || [])) {
    const promoId = String(row.promo_id || "")
    const placementKey = String(row.placement_key || "")
    if (!promoId || !placementKey) continue
    const current = placementsByPromoId.get(promoId) || []
    current.push(placementKey)
    placementsByPromoId.set(promoId, current)
  }

  const promos = (((data as Array<Omit<PromoEditorRecord, "placement_keys">> | null) || [])
    .map((promo) => ({
      ...promo,
      placement_keys: placementsByPromoId.get(String(promo.id || "")) || [],
    }))
    .filter((promo) => {
      if (!query) return true

      const haystack = [promo.slug, promo.title_id, promo.title_en, promo.title_zh, promo.target_href, ...(promo.placement_keys || [])]
        .map((value) => String(value || "").toLowerCase())
        .join(" ")

      return haystack.includes(query)
    })) as PromoEditorRecord[]

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fff8f1_0%,#f7f1e8_100%)] px-4 py-5 sm:px-6 sm:py-6 md:px-8 md:py-8 lg:px-10">
      <div className="mx-auto max-w-7xl space-y-5 sm:space-y-6 lg:space-y-8">
        <section className="overflow-hidden rounded-[28px] border border-orange-200/60 bg-[linear-gradient(135deg,#7c2d12_0%,#c2410c_38%,#f97316_72%,#fdba74_100%)] px-5 py-6 text-white shadow-[0_30px_100px_rgba(146,64,14,0.18)] sm:rounded-[32px] sm:px-8 sm:py-8 lg:px-10">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_320px]">
            <div className="max-w-3xl">
              <span className="inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.34em] text-orange-50">
                Promo Control
              </span>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:mt-5 sm:text-4xl lg:text-5xl">
                Kelola promo publik dari satu panel marketing.
              </h1>
            </div>
            <div className="rounded-[22px] border border-white/20 bg-white/10 px-4 py-4 backdrop-blur sm:rounded-[24px] sm:px-5 sm:py-5">
              <p className="text-[11px] uppercase tracking-[0.28em] text-orange-100/80">Promo snapshot</p>
              <div className="mt-5 grid gap-4">
                <div>
                  <p className="text-sm text-orange-50/80">Active promo</p>
                  <p className="mt-1 text-2xl font-semibold text-white sm:text-3xl">{(activeCount || 0).toLocaleString("id-ID")}</p>
                </div>
                <div>
                  <p className="text-sm text-orange-50/80">Scheduled promo</p>
                  <p className="mt-1 text-2xl font-semibold text-white sm:text-3xl">{(scheduledCount || 0).toLocaleString("id-ID")}</p>
                </div>
                <div>
                  <p className="text-sm text-orange-50/80">Filtered result</p>
                  <p className="mt-1 text-2xl font-semibold text-white sm:text-3xl">{promos.length.toLocaleString("id-ID")}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {params.success ? <div className="rounded-[24px] border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-700">{params.success}</div> : null}
        {params.error ? <div className="rounded-[24px] border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">{params.error}</div> : null}

        <section className="grid gap-3 sm:gap-4 md:grid-cols-3">
          <article className="rounded-[22px] border border-[#f0ddc7] bg-white px-4 py-4 shadow-[0_18px_44px_rgba(15,23,42,0.06)] sm:rounded-[26px] sm:px-5 sm:py-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-orange-500">Active promo</p>
            <p className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-slate-950 sm:text-3xl">{(activeCount || 0).toLocaleString("id-ID")}</p>
            <p className="mt-2 text-xs leading-6 text-slate-500">Promo yang sedang hidup di halaman publik.</p>
          </article>
          <article className="rounded-[22px] border border-[#f0ddc7] bg-white px-4 py-4 shadow-[0_18px_44px_rgba(15,23,42,0.06)] sm:rounded-[26px] sm:px-5 sm:py-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-orange-500">Draft promo</p>
            <p className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-slate-950 sm:text-3xl">{(draftCount || 0).toLocaleString("id-ID")}</p>
            <p className="mt-2 text-xs leading-6 text-slate-500">Stok campaign yang belum dipublikasikan.</p>
          </article>
          <article className="rounded-[22px] border border-[#f0ddc7] bg-white px-4 py-4 shadow-[0_18px_44px_rgba(15,23,42,0.06)] sm:rounded-[26px] sm:px-5 sm:py-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-orange-500">Paused promo</p>
            <p className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-slate-950 sm:text-3xl">{(pausedCount || 0).toLocaleString("id-ID")}</p>
            <p className="mt-2 text-xs leading-6 text-slate-500">Campaign yang dihentikan sementara tanpa dihapus.</p>
          </article>
        </section>

        <section className="rounded-[24px] border border-[#f3dbc3] bg-white/85 p-5 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur-sm sm:rounded-[32px] sm:p-6 lg:p-7">
          <form className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="xl:col-span-3">
              <label className="mb-2 block text-sm font-medium text-slate-700">Cari promo</label>
              <input
                name="q"
                defaultValue={String(params.q || "")}
                placeholder="Cari berdasarkan slug, judul, atau target href"
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
                <option value="draft">Draft</option>
                <option value="scheduled">Scheduled</option>
                <option value="paused">Paused</option>
              </select>
            </div>
            <div className="flex gap-3 xl:col-span-4">
              <button className="rounded-[18px] bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800">
                Terapkan filter
              </button>
              <a
                href={basePath}
                className="rounded-[18px] border border-[#e6d8c2] bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Reset
              </a>
            </div>
          </form>
        </section>

        <section className="rounded-[24px] border border-[#f3dbc3] bg-white/85 p-5 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur-sm sm:rounded-[32px] sm:p-6 lg:p-7">
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-orange-500">
            {isSuperadminPreview ? "Promo template preview" : "Create promo"}
          </p>
          <div className="mt-5">
            <PromoForm portal={portal} />
          </div>
        </section>

        <section className="space-y-4">
          {!promos.length ? (
            <div className="rounded-[24px] border border-dashed border-[#e8d7c1] bg-[#fffaf3] px-5 py-6 text-sm text-slate-500">
              Belum ada promo yang cocok dengan filter saat ini.
            </div>
          ) : null}
          {promos.map((promo) => (
            <article key={String(promo.id)} className="rounded-[24px] border border-[#f3dbc3] bg-white/85 p-5 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur-sm sm:rounded-[32px] sm:p-6 lg:p-7">
              <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-orange-500">Existing promo</p>
                  <h2 className="mt-2 text-xl font-semibold text-slate-950">{String(promo.slug)}</h2>
                  <p className="mt-2 text-sm text-slate-500">
                    Status: {getMarketingPromoStatusLabel(String(promo.status || "draft"))} | Sort: {String(promo.sort_order || 0)}
                  </p>
                  <p className="mt-2 text-sm text-slate-500">
                    Effective state: {getMarketingPromoEffectiveStateLabel(getMarketingPromoEffectiveState(promo, nowIso))}
                  </p>
                  <p className="mt-2 text-sm text-slate-500">
                    Window: {formatDateWindow(promo.starts_at, promo.ends_at)}
                  </p>
                  <p className="mt-2 text-sm text-slate-500">
                    Placements: {(promo.placement_keys || []).length ? (promo.placement_keys || []).map((value) => getMarketingPromoPlacementLabel(String(value))).join(", ") : "Belum dipilih"}
                  </p>
                </div>
                <form action={deleteMarketingPromo}>
                  <input type="hidden" name="promo_id" value={String(promo.id)} />
                  <input type="hidden" name="slug" value={String(promo.slug)} />
                  <input type="hidden" name="return_to" value={basePath} />
                  <button className="rounded-[16px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-100">
                    Hapus promo
                  </button>
                </form>
              </div>
              <PromoForm promo={promo} portal={portal} />
            </article>
          ))}
        </section>
      </div>
    </main>
  )
}

function PromoForm({
  promo,
  portal,
}: {
  promo?: PromoEditorRecord
  portal: MarketingPromoPortal
}) {
  const returnTo = portal === "superadmin" ? "/superadmin/marketing-promos" : "/marketing/promos"
  const selectedPlacements = promo?.placement_keys?.length ? promo.placement_keys : [...marketingPromoPlacementKeys]
  return (
    <form action={upsertMarketingPromo} className="grid gap-4">
      <input type="hidden" name="promo_id" value={promo ? String(promo.id) : ""} />
      <input type="hidden" name="return_to" value={returnTo} />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Field label="Slug" name="slug" defaultValue={promo ? String(promo.slug || "") : ""} />
        <Field label="Target href" name="target_href" defaultValue={promo ? String(promo.target_href || "") : "/promo"} />
        <Field label="Sort order" name="sort_order" type="number" defaultValue={promo ? String(promo.sort_order || 0) : "0"} />
        <SelectField
          label="Status promo"
          name="status"
          defaultValue={promo ? String(promo.status || "draft") : "active"}
          options={marketingPromoStatuses.map((status) => ({ value: status, label: getMarketingPromoStatusLabel(status) }))}
        />
        <Field label="Mulai tayang" name="starts_at" type="datetime-local" defaultValue={toDateTimeLocalInput(promo?.starts_at)} required={false} />
        <Field label="Selesai tayang" name="ends_at" type="datetime-local" defaultValue={toDateTimeLocalInput(promo?.ends_at)} required={false} />
        <Field label="Title ID" name="title_id" defaultValue={promo ? String(promo.title_id || "") : ""} />
        <Field label="Title EN" name="title_en" defaultValue={promo ? String(promo.title_en || "") : ""} />
        <Field label="Title ZH" name="title_zh" defaultValue={promo ? String(promo.title_zh || "") : ""} />
        <Field label="Badge ID" name="badge_id" defaultValue={promo ? String(promo.badge_id || "") : ""} />
        <Field label="Badge EN" name="badge_en" defaultValue={promo ? String(promo.badge_en || "") : ""} />
        <Field label="Badge ZH" name="badge_zh" defaultValue={promo ? String(promo.badge_zh || "") : ""} />
        <Field label="Eyebrow ID" name="eyebrow_id" defaultValue={promo ? String(promo.eyebrow_id || "") : ""} />
        <Field label="Eyebrow EN" name="eyebrow_en" defaultValue={promo ? String(promo.eyebrow_en || "") : ""} />
        <Field label="Eyebrow ZH" name="eyebrow_zh" defaultValue={promo ? String(promo.eyebrow_zh || "") : ""} />
        <Field label="Price ID" name="price_id" defaultValue={promo ? String(promo.price_id || "") : ""} />
        <Field label="Price EN" name="price_en" defaultValue={promo ? String(promo.price_en || "") : ""} />
        <Field label="Price ZH" name="price_zh" defaultValue={promo ? String(promo.price_zh || "") : ""} />
        <Field label="CTA ID" name="cta_id" defaultValue={promo ? String(promo.cta_id || "") : ""} />
        <Field label="CTA EN" name="cta_en" defaultValue={promo ? String(promo.cta_en || "") : ""} />
        <Field label="CTA ZH" name="cta_zh" defaultValue={promo ? String(promo.cta_zh || "") : ""} />
        <Field label="Image" name="image" defaultValue={promo ? String(promo.image || "") : ""} />
        <Field label="Gradient" name="gradient" defaultValue={promo ? String(promo.gradient || "") : ""} />
        <Field label="Image class" name="image_class" defaultValue={promo ? String(promo.image_class || "") : ""} />
        <Field label="Overlay class" name="overlay_class" defaultValue={promo ? String(promo.overlay_class || "") : ""} />
        <Field label="Glow class" name="glow_class" defaultValue={promo ? String(promo.glow_class || "") : ""} />
      </div>
      <div className="space-y-3">
        <p className="text-sm font-medium text-slate-700">Placement publik</p>
        <div className="grid gap-3 md:grid-cols-2">
          {marketingPromoPlacements.map((placement) => (
            <label key={placement.key} className="rounded-[18px] border border-[#e6d8c2] bg-[#fffdf9] px-4 py-3 text-sm text-slate-700">
              <span className="flex items-start gap-3">
                <input type="checkbox" name="placements" value={placement.key} defaultChecked={selectedPlacements.includes(placement.key)} className="mt-1" />
                <span>
                  <span className="block font-semibold text-slate-900">{placement.label}</span>
                  <span className="mt-1 block text-xs leading-6 text-slate-500">{placement.description}</span>
                </span>
              </span>
            </label>
          ))}
        </div>
      </div>
      <label className="inline-flex items-center gap-3 text-sm font-medium text-slate-700">
        <input type="checkbox" name="is_active" defaultChecked={promo ? Boolean(promo.is_active) : true} />
        Izinkan promo masuk ke placement publik
      </label>
      <button className="w-fit rounded-[18px] bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800">
        {promo ? "Simpan perubahan promo" : "Buat promo"}
      </button>
    </form>
  )
}

function Field({
  label,
  name,
  defaultValue,
  type = "text",
  required = true,
}: {
  label: string
  name: string
  defaultValue: string
  type?: string
  required?: boolean
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-slate-700">{label}</label>
      <input
        name={name}
        type={type}
        required={required && !name.startsWith("badge_")}
        defaultValue={defaultValue}
        className="w-full rounded-[18px] border border-[#e6d8c2] bg-[#fffdf9] px-4 py-3 text-sm outline-none ring-orange-500 transition focus:ring-2"
      />
    </div>
  )
}

function SelectField({
  label,
  name,
  defaultValue,
  options,
}: {
  label: string
  name: string
  defaultValue: string
  options: Array<{ value: string; label: string }>
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-slate-700">{label}</label>
      <select
        name={name}
        defaultValue={defaultValue}
        className="w-full rounded-[18px] border border-[#e6d8c2] bg-[#fffdf9] px-4 py-3 text-sm outline-none ring-orange-500 transition focus:ring-2"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  )
}

function toDateTimeLocalInput(value: string | null | undefined) {
  if (!value) return ""
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return ""
  const year = parsed.getFullYear()
  const month = String(parsed.getMonth() + 1).padStart(2, "0")
  const day = String(parsed.getDate()).padStart(2, "0")
  const hours = String(parsed.getHours()).padStart(2, "0")
  const minutes = String(parsed.getMinutes()).padStart(2, "0")
  return `${year}-${month}-${day}T${hours}:${minutes}`
}

function formatDateWindow(startsAt: string | null, endsAt: string | null) {
  if (!startsAt && !endsAt) return "Tanpa jadwal"
  const format = (value: string | null) => (value ? new Date(value).toLocaleString("id-ID") : "sekarang")
  return `${format(startsAt)} - ${endsAt ? format(endsAt) : "tanpa batas"}`
}
