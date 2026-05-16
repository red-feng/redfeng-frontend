import type { ReactNode } from "react"
import {
  applyRecommendedMarketingPromoPlacements,
  applyRecommendedMarketingPromoPlacementsBulk,
  bulkAssignMarketingPromoPlacement,
  bulkRemoveMarketingPromoPlacement,
  deleteMarketingPromo,
  keepOnlyRecommendedMarketingPromoPlacements,
  keepOnlyRecommendedMarketingPromoPlacementsBulk,
  toggleMarketingPromoPlacement,
  upsertMarketingPromo,
} from "@/app/marketing/(protected)/actions"
import { getBookingProductLabel, normalizeBookingProductType, type BookingProductType } from "@/lib/booking-products"
import { getMarketingPromoPlacementLabel, marketingPromoPlacements, type MarketingPromoPlacementKey } from "@/lib/marketing-promo-placements"
import { getMarketingPromoEffectiveState, getMarketingPromoEffectiveStateLabel, getMarketingPromoStatusLabel, marketingPromoStatuses } from "@/lib/marketing-promo-status"
import { createAdminClient } from "@/lib/supabase/admin"
import { getTransactionPromoModeLabel, getTransactionPromoStatusLabel } from "@/lib/transaction-promos"

type MarketingPromoSearchParams = {
  success?: string
  error?: string
  q?: string
  status?: string
  workflow?: string
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
  updated_at: string | null
  placement_keys: string[]
  linked_transaction_promos: TransactionPromoPickerRecord[]
}

type TransactionPromoPickerRecord = {
  id: string
  name: string
  code: string | null
  status: string | null
  is_auto_apply: boolean | null
  product_types: BookingProductType[]
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
  const workflowFilter = String(params.workflow || "all").trim()
  const adminSupabase = createAdminClient()
  const basePath = isSuperadminPreview ? "/superadmin/marketing-promos" : "/marketing/promos"
  const nowIso = new Date().toISOString()

  let promoQuery = adminSupabase
    .from("marketing_promos")
    .select("id, slug, title_id, title_en, title_zh, badge_id, badge_en, badge_zh, eyebrow_id, eyebrow_en, eyebrow_zh, price_id, price_en, price_zh, cta_id, cta_en, cta_zh, image, gradient, image_class, overlay_class, glow_class, target_href, is_active, status, starts_at, ends_at, sort_order, updated_at")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true })

  if (statusFilter === "active") {
    promoQuery = promoQuery.eq("status", "active")
  }

  if (statusFilter === "draft" || statusFilter === "scheduled" || statusFilter === "paused") {
    promoQuery = promoQuery.eq("status", statusFilter)
  }

  const [{ data }, { count: activeCount }, { count: draftCount }, { count: scheduledCount }, { count: pausedCount }, { data: placementRows }, { data: marketingPromoLinks }, { data: transactionPromoRules }] = await Promise.all([
    promoQuery,
    adminSupabase.from("marketing_promos").select("id", { count: "exact", head: true }).eq("status", "active"),
    adminSupabase.from("marketing_promos").select("id", { count: "exact", head: true }).eq("status", "draft"),
    adminSupabase.from("marketing_promos").select("id", { count: "exact", head: true }).eq("status", "scheduled"),
    adminSupabase.from("marketing_promos").select("id", { count: "exact", head: true }).eq("status", "paused"),
    adminSupabase
      .from("marketing_promo_placements")
      .select("promo_id, placement_key")
      .eq("is_active", true),
    adminSupabase
      .from("marketing_promo_transaction_rules")
      .select("marketing_promo_id, transaction_promo_rule_id"),
    adminSupabase
      .from("transaction_promo_rules")
      .select("id, name, code, status, is_auto_apply, transaction_promo_rule_targets(product_type)")
      .order("updated_at", { ascending: false }),
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

  const promoRuleMap = new Map<string, TransactionPromoPickerRecord>()
  for (const rule of ((transactionPromoRules as Array<{
    id: string | null
    name?: string | null
    code?: string | null
    status?: string | null
    is_auto_apply?: boolean | null
    transaction_promo_rule_targets?: Array<{ product_type?: string | null }> | null
  }> | null) || [])) {
    const ruleId = String(rule.id || "")
    if (!ruleId) continue
    const productTypes = Array.from(
      new Set(
        (rule.transaction_promo_rule_targets || [])
          .map((target) => normalizeBookingProductType(target.product_type))
          .filter((value): value is BookingProductType => Boolean(value)),
      ),
    )

    promoRuleMap.set(ruleId, {
      id: ruleId,
      name: String(rule.name || "Promo transaksi tanpa nama"),
      code: rule.code || null,
      status: rule.status || null,
      is_auto_apply: rule.is_auto_apply || false,
      product_types: productTypes,
    })
  }

  const linkedRulesByPromoId = new Map<string, TransactionPromoPickerRecord[]>()
  for (const row of ((marketingPromoLinks as Array<{ marketing_promo_id?: string | null; transaction_promo_rule_id?: string | null }> | null) || [])) {
    const promoId = String(row.marketing_promo_id || "")
    const ruleId = String(row.transaction_promo_rule_id || "")
    const rule = promoRuleMap.get(ruleId)
    if (!promoId || !rule) continue
    const current = linkedRulesByPromoId.get(promoId) || []
    current.push(rule)
    linkedRulesByPromoId.set(promoId, current)
  }

  const availableTransactionPromos = Array.from(promoRuleMap.values())

  const promos = (((data as Array<Omit<PromoEditorRecord, "placement_keys" | "linked_transaction_promos">> | null) || [])
    .map((promo) => ({
      ...promo,
      placement_keys: placementsByPromoId.get(String(promo.id || "")) || [],
      linked_transaction_promos: linkedRulesByPromoId.get(String(promo.id || "")) || [],
    }))
    .map((promo) => {
      const effectiveState = getMarketingPromoEffectiveState(promo, nowIso)
      return {
        ...promo,
        effectiveState,
        effectiveStateLabel: getMarketingPromoEffectiveStateLabel(effectiveState),
        workflowState: getPromoWorkflowState(promo, effectiveState),
      }
    })
    .filter((promo) => {
      if (!query) return true

      const haystack = [promo.slug, promo.title_id, promo.title_en, promo.title_zh, promo.target_href, ...(promo.placement_keys || [])]
        .map((value) => String(value || "").toLowerCase())
        .join(" ")

      return haystack.includes(query)
    })
    .filter((promo) => {
      if (workflowFilter === "all") return true
      return promo.workflowState === workflowFilter
    })) as Array<
    PromoEditorRecord & {
      effectiveState: ReturnType<typeof getMarketingPromoEffectiveState>
      effectiveStateLabel: string
      workflowState: ReturnType<typeof getPromoWorkflowState>
    }
  >

  const liveCount = promos.filter((promo) => promo.effectiveState === "live").length
  const waitingCount = promos.filter((promo) => promo.effectiveState === "waiting").length
  const hiddenCount = promos.filter((promo) => promo.effectiveState === "hidden").length
  const expiredCount = promos.filter((promo) => promo.effectiveState === "expired").length
  const needsPlacement = promos.filter((promo) => promo.workflowState === "needs-placement")
  const needsSchedule = promos.filter((promo) => promo.workflowState === "needs-schedule")
  const nextLaunchPromo = [...promos]
    .filter((promo) => promo.effectiveState === "waiting" && promo.starts_at)
    .sort((a, b) => new Date(String(a.starts_at)).getTime() - new Date(String(b.starts_at)).getTime())[0]
  const recentlyTouched = [...promos]
    .filter((promo) => promo.updated_at)
    .sort((a, b) => new Date(String(b.updated_at)).getTime() - new Date(String(a.updated_at)).getTime())
    .slice(0, 4)

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
                  <p className="text-sm text-orange-50/80">Promo aktif</p>
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
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-orange-500">Promo aktif</p>
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

        <section className="grid gap-4 sm:gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <article className="rounded-[24px] border border-[#f3dbc3] bg-white/85 p-5 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur-sm sm:rounded-[32px] sm:p-6 lg:p-7">
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-orange-500">Workflow lanes</p>
            <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-slate-950 sm:text-2xl">Baca antrian promo dari draft sampai live</h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {[
                { label: "Live", value: liveCount, note: "Promo sedang tayang ke publik.", tone: "emerald" },
                { label: "Waiting", value: waitingCount, note: "Sudah siap tapi menunggu jadwal mulai.", tone: "sky" },
                { label: "Needs placement", value: needsPlacement.length, note: "Butuh slot publik sebelum bisa efektif.", tone: "amber" },
                { label: "Needs schedule", value: needsSchedule.length, note: "Butuh jadwal atau aktivasi sebelum launch.", tone: "rose" },
                { label: "Hidden", value: hiddenCount, note: "Tidak tampil karena draft, pause, atau indexing off.", tone: "slate" },
                { label: "Expired", value: expiredCount, note: "Window tayang sudah selesai.", tone: "orange" },
              ].map((lane) => (
                <article key={lane.label} className="rounded-[20px] border border-[#efe1cf] bg-[#fffaf3] px-4 py-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">{lane.label}</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-950">{lane.value.toLocaleString("id-ID")}</p>
                  <p className="mt-2 text-xs leading-6 text-slate-500">{lane.note}</p>
                </article>
              ))}
            </div>
          </article>

          <article className="rounded-[24px] border border-[#f3dbc3] bg-white/85 p-5 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur-sm sm:rounded-[32px] sm:p-6 lg:p-7">
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-orange-500">Action queue</p>
            <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-slate-950 sm:text-2xl">Titik kerja paling dekat untuk tim marketing</h2>
            <div className="mt-5 space-y-3">
              <div className="rounded-[20px] border border-[#efe1cf] bg-[#fffaf3] px-4 py-4">
                <p className="text-sm font-semibold text-slate-950">Next launch</p>
                <p className="mt-2 text-sm text-slate-600">
                  {nextLaunchPromo
                    ? `${nextLaunchPromo.title_id || nextLaunchPromo.slug} dijadwalkan mulai ${formatDateWindow(nextLaunchPromo.starts_at, null)}`
                    : "Belum ada promo scheduled yang menunggu waktu tayang."}
                </p>
              </div>
              <div className="rounded-[20px] border border-[#efe1cf] bg-[#fffaf3] px-4 py-4">
                <p className="text-sm font-semibold text-slate-950">Placement issues</p>
                <p className="mt-2 text-sm text-slate-600">
                  {needsPlacement.length
                    ? `${needsPlacement.length.toLocaleString("id-ID")} promo belum punya placement aktif.`
                    : "Semua promo pada hasil filter ini sudah punya placement publik."}
                </p>
              </div>
              <div className="rounded-[20px] border border-[#efe1cf] bg-[#fffaf3] px-4 py-4">
                <p className="text-sm font-semibold text-slate-950">Scheduling issues</p>
                <p className="mt-2 text-sm text-slate-600">
                  {needsSchedule.length
                    ? `${needsSchedule.length.toLocaleString("id-ID")} promo masih butuh jadwal atau aktivasi.`
                    : "Tidak ada promo yang tertahan hanya karena jadwal atau aktivasi."}
                </p>
              </div>
              <div className="rounded-[20px] border border-[#efe1cf] bg-[#fffaf3] px-4 py-4">
                <p className="text-sm font-semibold text-slate-950">Recently touched</p>
                <p className="mt-2 text-sm text-slate-600">
                  {recentlyTouched.length
                    ? recentlyTouched.map((promo) => promo.title_id || promo.slug).join(", ")
                    : "Belum ada update promo terbaru pada hasil filter ini."}
                </p>
              </div>
            </div>
          </article>
        </section>

        <section className="rounded-[24px] border border-[#f3dbc3] bg-white/85 p-5 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur-sm sm:rounded-[32px] sm:p-6 lg:p-7">
          <form className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
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
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Workflow</label>
              <select
                name="workflow"
                defaultValue={workflowFilter}
                className="w-full rounded-[18px] border border-[#e6d8c2] bg-[#fffdf9] px-4 py-3 text-sm outline-none ring-orange-500 transition focus:ring-2"
              >
                <option value="all">Semua workflow</option>
                <option value="launch-ready">Launch ready</option>
                <option value="needs-placement">Needs placement</option>
                <option value="needs-schedule">Needs schedule</option>
                <option value="paused">Paused</option>
                <option value="expired">Expired</option>
              </select>
            </div>
            <div className="flex gap-3 xl:col-span-5">
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

        {promos.length ? (
          <section className="rounded-[24px] border border-[#f3dbc3] bg-white/85 p-5 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur-sm sm:rounded-[32px] sm:p-6 lg:p-7">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-orange-500">Bulk quick assign</p>
                <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-slate-950 sm:text-2xl">Jalankan aksi rekomendasi untuk hasil filter saat ini</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {promos.length.toLocaleString("id-ID")} promo sedang terlihat. Gunakan bulk action untuk mengaktifkan atau merapikan slot rekomendasi tanpa membuka kartu satu per satu.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <form action={applyRecommendedMarketingPromoPlacementsBulk}>
                  {promos.map((promo) => (
                    <input key={`${promo.id}-bulk-apply`} type="hidden" name="promo_ids" value={String(promo.id)} />
                  ))}
                  <input type="hidden" name="return_to" value={buildPromoFilterReturnTo(basePath, params)} />
                  <button className="rounded-[18px] border border-orange-200 bg-white px-5 py-3 text-sm font-semibold text-orange-700 transition hover:bg-orange-50">
                    Apply recommended for visible promos
                  </button>
                </form>
                <form action={keepOnlyRecommendedMarketingPromoPlacementsBulk}>
                  {promos.map((promo) => (
                    <input key={`${promo.id}-bulk-keep`} type="hidden" name="promo_ids" value={String(promo.id)} />
                  ))}
                  <input type="hidden" name="return_to" value={buildPromoFilterReturnTo(basePath, params)} />
                  <button className="rounded-[18px] border border-rose-200 bg-white px-5 py-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-50">
                    Keep only recommended for visible promos
                  </button>
                </form>
              </div>
            </div>
            <div className="mt-5 rounded-[20px] border border-[#efe1cf] bg-[#fffaf3] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Bulk assign selected slot</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Hasil filter saat ini memuat{" "}
                <span className="font-semibold text-slate-900">{promos.length.toLocaleString("id-ID")} promo</span>. Gunakan ringkasan di bawah untuk
                membaca slot mana yang sudah banyak dipakai sebelum menjalankan aksi massal.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {marketingPromoPlacements.map((placement) => {
                  const activeCount = promos.filter((promo) => (promo.placement_keys || []).includes(placement.key)).length
                  return (
                    <span
                      key={`${placement.key}-bulk-summary`}
                      className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-600"
                    >
                      {placement.label}: {activeCount.toLocaleString("id-ID")}
                    </span>
                  )
                })}
              </div>
              <div className="mt-3 grid gap-3 lg:grid-cols-2">
                <form action={bulkAssignMarketingPromoPlacement} className="flex flex-col gap-3">
                  <div className="min-w-0 flex-1">
                    <label className="mb-2 block text-sm font-medium text-slate-700">Placement tujuan</label>
                    <select
                      name="placement_key"
                      defaultValue="homepage_feed"
                      className="w-full rounded-[18px] border border-[#e6d8c2] bg-white px-4 py-3 text-sm outline-none ring-orange-500 transition focus:ring-2"
                    >
                      {marketingPromoPlacements.map((placement) => (
                        <option key={placement.key} value={placement.key}>
                          {placement.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  {promos.map((promo) => (
                    <input key={`${promo.id}-bulk-selected-slot`} type="hidden" name="promo_ids" value={String(promo.id)} />
                  ))}
                  <input type="hidden" name="return_to" value={buildPromoFilterReturnTo(basePath, params)} />
                  <button className="rounded-[18px] border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
                    Assign selected slot for visible promos
                  </button>
                </form>
                <form action={bulkRemoveMarketingPromoPlacement} className="flex flex-col gap-3">
                  <div className="min-w-0 flex-1">
                    <label className="mb-2 block text-sm font-medium text-slate-700">Placement yang dilepas</label>
                    <select
                      name="placement_key"
                      defaultValue="homepage_feed"
                      className="w-full rounded-[18px] border border-[#e6d8c2] bg-white px-4 py-3 text-sm outline-none ring-orange-500 transition focus:ring-2"
                    >
                      {marketingPromoPlacements.map((placement) => (
                        <option key={placement.key} value={placement.key}>
                          {placement.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  {promos.map((promo) => (
                    <input key={`${promo.id}-bulk-remove-slot`} type="hidden" name="promo_ids" value={String(promo.id)} />
                  ))}
                  <input type="hidden" name="return_to" value={buildPromoFilterReturnTo(basePath, params)} />
                  <button className="rounded-[18px] border border-rose-200 bg-white px-5 py-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-50">
                    Remove selected slot for visible promos
                  </button>
                </form>
              </div>
            </div>
          </section>
        ) : null}

        <section className="rounded-[24px] border border-[#f3dbc3] bg-white/85 p-5 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur-sm sm:rounded-[32px] sm:p-6 lg:p-7">
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-orange-500">
            {isSuperadminPreview ? "Preview template promo" : "Buat promo"}
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
                    Effective state: {promo.effectiveStateLabel}
                  </p>
                  <p className="mt-2 text-sm text-slate-500">
                    Window: {formatDateWindow(promo.starts_at, promo.ends_at)}
                  </p>
                  <p className="mt-2 text-sm text-slate-500">
                    Placements: {(promo.placement_keys || []).length ? (promo.placement_keys || []).map((value) => getMarketingPromoPlacementLabel(String(value))).join(", ") : "Belum dipilih"}
                  </p>
                    <div className="mt-4 space-y-3">
                      <div className="space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Recommended slots</p>
                        <p className="text-xs leading-6 text-slate-500">
                          Keep only recommended akan menyisakan:{" "}
                          <span className="font-medium text-slate-700">
                            {getRecommendedQuickAssignPlacements(promo.target_href)
                              .map((placement) => placement.shortLabel)
                              .join(", ")}
                          </span>
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {getRecommendedQuickAssignPlacements(promo.target_href).map((placement) => {
                            const enabled = (promo.placement_keys || []).includes(placement.key)
                            return (
                              <span
                                key={`${promo.id}-${placement.key}-recommended`}
                                className={`rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${
                                  enabled
                                    ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
                                    : "border border-amber-200 bg-amber-50 text-amber-700"
                                }`}
                              >
                                {placement.shortLabel} {enabled ? "Matched" : "Recommended"}
                              </span>
                            )
                          })}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <form action={applyRecommendedMarketingPromoPlacements}>
                            <input type="hidden" name="promo_id" value={String(promo.id)} />
                            <input type="hidden" name="slug" value={String(promo.slug)} />
                            <input type="hidden" name="return_to" value={basePath} />
                            <button className="rounded-full border border-orange-200 bg-white px-3 py-2 text-xs font-semibold text-orange-700 transition hover:bg-orange-50">
                              Apply recommended slots
                            </button>
                          </form>
                          <form action={keepOnlyRecommendedMarketingPromoPlacements}>
                            <input type="hidden" name="promo_id" value={String(promo.id)} />
                            <input type="hidden" name="slug" value={String(promo.slug)} />
                            <input type="hidden" name="return_to" value={basePath} />
                            <button className="rounded-full border border-rose-200 bg-white px-3 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-50">
                              Keep only recommended
                            </button>
                          </form>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Core slot summary</p>
                        <div className="flex flex-wrap gap-2">
                          {getEnabledCoreQuickAssignPlacements(promo.placement_keys || []).length ? (
                            getEnabledCoreQuickAssignPlacements(promo.placement_keys || []).map((placement) => (
                              <span
                                key={`${promo.id}-${placement.key}-summary`}
                                className="rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-orange-700"
                              >
                                {placement.shortLabel}
                              </span>
                            ))
                          ) : (
                            <span className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-600">
                              No core slot
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Service slot summary</p>
                        <div className="flex flex-wrap gap-2">
                          {getEnabledServiceQuickAssignPlacements(promo.placement_keys || []).length ? (
                            getEnabledServiceQuickAssignPlacements(promo.placement_keys || []).map((placement) => (
                              <span
                                key={`${promo.id}-${placement.key}-summary`}
                                className="rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-orange-700"
                              >
                                {placement.shortLabel}
                              </span>
                            ))
                          ) : (
                            <span className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-600">
                              No service slot
                            </span>
                          )}
                        </div>
                      </div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Quick assign core slots</p>
                      <div className="flex flex-wrap gap-2">
                        {getQuickAssignableCorePlacements().map((placement) => {
                          const enabled = (promo.placement_keys || []).includes(placement.key)
                          return (
                            <form key={`${promo.id}-${placement.key}`} action={toggleMarketingPromoPlacement}>
                              <input type="hidden" name="promo_id" value={String(promo.id)} />
                              <input type="hidden" name="slug" value={String(promo.slug)} />
                              <input type="hidden" name="placement_key" value={placement.key} />
                              <input type="hidden" name="mode" value={enabled ? "disable" : "enable"} />
                              <input type="hidden" name="return_to" value={basePath} />
                              <button
                                className={`rounded-full px-3 py-2 text-xs font-semibold transition ${
                                  enabled
                                    ? "border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                                    : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                                }`}
                              >
                                {placement.shortLabel}: {enabled ? "On" : "Off"}
                              </button>
                            </form>
                          )
                        })}
                      </div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Quick assign service slots</p>
                      <div className="flex flex-wrap gap-2">
                        {getQuickAssignableServicePlacements().map((placement) => {
                          const enabled = (promo.placement_keys || []).includes(placement.key)
                          return (
                            <form key={`${promo.id}-${placement.key}`} action={toggleMarketingPromoPlacement}>
                            <input type="hidden" name="promo_id" value={String(promo.id)} />
                            <input type="hidden" name="slug" value={String(promo.slug)} />
                            <input type="hidden" name="placement_key" value={placement.key} />
                            <input type="hidden" name="mode" value={enabled ? "disable" : "enable"} />
                            <input type="hidden" name="return_to" value={basePath} />
                            <button
                              className={`rounded-full px-3 py-2 text-xs font-semibold transition ${
                                enabled
                                  ? "border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                                  : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                              }`}
                            >
                              {placement.shortLabel}: {enabled ? "On" : "Off"}
                            </button>
                          </form>
                        )
                      })}
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className={`rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${getWorkflowBadgeClass(promo.workflowState)}`}>
                      {getWorkflowLabel(promo.workflowState)}
                    </span>
                    {promo.is_active ? (
                      <span className="rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-700">
                        Placement enabled
                      </span>
                    ) : (
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-600">
                        Placement blocked
                      </span>
                    )}
                  </div>
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
              <PromoForm promo={promo} portal={portal} availableTransactionPromos={availableTransactionPromos} />
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
  availableTransactionPromos,
}: {
  promo?: PromoEditorRecord
  portal: MarketingPromoPortal
  availableTransactionPromos: TransactionPromoPickerRecord[]
}) {
  const returnTo = portal === "superadmin" ? "/superadmin/marketing-promos" : "/marketing/promos"
  const selectedPlacements = promo?.placement_keys?.length ? promo.placement_keys : getDefaultMarketingPromoPlacements(promo?.target_href)
  const recommendedPlacements = getDefaultMarketingPromoPlacements(promo?.target_href)
  const selectedTransactionPromoRuleIds = new Set((promo?.linked_transaction_promos || []).map((linkedPromo) => linkedPromo.id))
  const formTitle = promo ? "Edit promo" : "Buat promo"
  const formSubtitle = promo
    ? "Rapikan identitas, jadwal, placement, dan visual promo dari panel yang lebih terstruktur."
    : "Mulai dari identitas campaign, lanjut ke copy penawaran, lalu tentukan jadwal dan placement publik."
  return (
    <form action={upsertMarketingPromo} className="grid gap-4">
      <input type="hidden" name="promo_id" value={promo ? String(promo.id) : ""} />
      <input type="hidden" name="return_to" value={returnTo} />
      <div className="rounded-[24px] border border-[#efe1cf] bg-[#fffaf3] px-5 py-5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-orange-500">{formTitle}</p>
        <p className="mt-3 text-sm leading-6 text-slate-600">{formSubtitle}</p>
      </div>

      <FormSection
        eyebrow="Campaign identity"
        title="Mulai dari identitas dan tujuan landing"
        description="Bagian ini menentukan slug, target link, urutan tampil, dan status dasar campaign."
      >
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
        </div>
      </FormSection>

      <FormSection
        eyebrow="Offer copy"
        title="Isi copy promo untuk tiga bahasa"
        description="Judul, eyebrow, harga, CTA, dan badge menjadi inti pesan yang dibaca user di slot publik."
      >
        <div className="grid gap-6 xl:grid-cols-2">
          <div className="space-y-4 rounded-[22px] border border-[#efe1cf] bg-white px-4 py-4">
            <p className="text-sm font-semibold text-slate-950">Headline & badge</p>
            <div className="grid gap-4 md:grid-cols-3">
              <Field label="Title ID" name="title_id" defaultValue={promo ? String(promo.title_id || "") : ""} />
              <Field label="Title EN" name="title_en" defaultValue={promo ? String(promo.title_en || "") : ""} />
              <Field label="Title ZH" name="title_zh" defaultValue={promo ? String(promo.title_zh || "") : ""} />
              <Field label="Badge ID" name="badge_id" defaultValue={promo ? String(promo.badge_id || "") : ""} />
              <Field label="Badge EN" name="badge_en" defaultValue={promo ? String(promo.badge_en || "") : ""} />
              <Field label="Badge ZH" name="badge_zh" defaultValue={promo ? String(promo.badge_zh || "") : ""} />
            </div>
          </div>

          <div className="space-y-4 rounded-[22px] border border-[#efe1cf] bg-white px-4 py-4">
            <p className="text-sm font-semibold text-slate-950">Eyebrow, price, CTA</p>
            <div className="grid gap-4 md:grid-cols-3">
              <Field label="Eyebrow ID" name="eyebrow_id" defaultValue={promo ? String(promo.eyebrow_id || "") : ""} />
              <Field label="Eyebrow EN" name="eyebrow_en" defaultValue={promo ? String(promo.eyebrow_en || "") : ""} />
              <Field label="Eyebrow ZH" name="eyebrow_zh" defaultValue={promo ? String(promo.eyebrow_zh || "") : ""} />
              <Field label="Price ID" name="price_id" defaultValue={promo ? String(promo.price_id || "") : ""} />
              <Field label="Price EN" name="price_en" defaultValue={promo ? String(promo.price_en || "") : ""} />
              <Field label="Price ZH" name="price_zh" defaultValue={promo ? String(promo.price_zh || "") : ""} />
              <Field label="CTA ID" name="cta_id" defaultValue={promo ? String(promo.cta_id || "") : ""} />
              <Field label="CTA EN" name="cta_en" defaultValue={promo ? String(promo.cta_en || "") : ""} />
              <Field label="CTA ZH" name="cta_zh" defaultValue={promo ? String(promo.cta_zh || "") : ""} />
            </div>
          </div>
        </div>
      </FormSection>

      <FormSection
        eyebrow="Schedule & delivery"
        title="Atur kapan promo aktif dan di mana ia boleh hidup"
        description="Jadwal tayang dan izin placement publik menentukan apakah promo siap launch atau masih tertahan."
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Field label="Mulai tayang" name="starts_at" type="datetime-local" defaultValue={toDateTimeLocalInput(promo?.starts_at)} required={false} />
          <Field label="Selesai tayang" name="ends_at" type="datetime-local" defaultValue={toDateTimeLocalInput(promo?.ends_at)} required={false} />
          <label className="flex items-center rounded-[18px] border border-[#e6d8c2] bg-[#fffdf9] px-4 py-3 text-sm font-medium text-slate-700">
            <input type="checkbox" name="is_active" defaultChecked={promo ? Boolean(promo.is_active) : true} className="mr-3" />
            Izinkan promo masuk ke placement publik
          </label>
        </div>
        <div className="mt-4 space-y-3">
          <p className="text-sm font-medium text-slate-700">Placement publik</p>
          <div className="rounded-[18px] border border-[#efe1cf] bg-[#fff7ef] px-4 py-4 text-sm text-slate-700">
            <p className="font-semibold text-slate-900">Saran cepat berdasarkan target landing</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {recommendedPlacements.map((value) => getMarketingPromoPlacementLabel(String(value))).join(", ")}
            </p>
          </div>
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
      </FormSection>

      <FormSection
        eyebrow="Checkout linkage"
        title="Hubungkan campaign publik ke promo checkout"
        description="Tautkan campaign ini ke kupon atau auto-apply promo transaksi agar campaign publik bisa dibaca sampai ke promo checkout."
      >
        <div className="space-y-3">
          <div className="rounded-[18px] border border-[#efe1cf] bg-[#fff7ef] px-4 py-4 text-sm text-slate-700">
            <p className="font-semibold text-slate-900">Link promo checkout</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {promo?.linked_transaction_promos?.length
                ? promo.linked_transaction_promos.map((linkedPromo) => linkedPromo.name).join(", ")
                : "Belum ada promo transaksi yang ditautkan ke campaign ini."}
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {availableTransactionPromos.length ? (
              availableTransactionPromos.map((transactionPromo) => (
                <label key={transactionPromo.id} className="rounded-[18px] border border-[#e6d8c2] bg-[#fffdf9] px-4 py-3 text-sm text-slate-700">
                  <span className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      name="linked_transaction_promo_rule_ids"
                      value={transactionPromo.id}
                      defaultChecked={selectedTransactionPromoRuleIds.has(transactionPromo.id)}
                      className="mt-1"
                    />
                    <span>
                      <span className="block font-semibold text-slate-900">{transactionPromo.name}</span>
                      <span className="mt-1 block text-xs leading-6 text-slate-500">
                        {getTransactionPromoModeLabel(transactionPromo.is_auto_apply, transactionPromo.code)} · {getTransactionPromoStatusLabel(transactionPromo.status)}
                      </span>
                      <span className="mt-1 block text-xs leading-6 text-slate-500">
                        Target: {transactionPromo.product_types.length ? transactionPromo.product_types.map((productType) => getBookingProductLabel(productType)).join(", ") : "Target layanan belum ditentukan"}
                      </span>
                    </span>
                  </span>
                </label>
              ))
            ) : (
              <div className="rounded-[18px] border border-dashed border-[#e6d8c2] bg-[#fffdf9] px-4 py-4 text-sm text-slate-500">
                Belum ada promo transaksi yang bisa ditautkan. Buat dulu draft atau promo aktif dari panel promo transaksi.
              </div>
            )}
          </div>
        </div>
      </FormSection>

      <FormSection
        eyebrow="Visual style"
        title="Atur asset dan class visual promo"
        description="Gunakan bagian ini untuk menghubungkan asset gambar serta class visual yang membentuk banner publik."
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Field label="Image" name="image" defaultValue={promo ? String(promo.image || "") : ""} />
          <Field label="Gradient" name="gradient" defaultValue={promo ? String(promo.gradient || "") : ""} />
          <Field label="Image class" name="image_class" defaultValue={promo ? String(promo.image_class || "") : ""} />
          <Field label="Overlay class" name="overlay_class" defaultValue={promo ? String(promo.overlay_class || "") : ""} />
          <Field label="Glow class" name="glow_class" defaultValue={promo ? String(promo.glow_class || "") : ""} />
        </div>
      </FormSection>

      <button className="w-fit rounded-[18px] bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800">
        {promo ? "Simpan perubahan promo" : "Buat promo"}
      </button>
    </form>
  )
}

function FormSection({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string
  title: string
  description: string
  children: ReactNode
}) {
  return (
    <section className="rounded-[24px] border border-[#efe1cf] bg-white px-5 py-5 shadow-[0_18px_44px_rgba(15,23,42,0.04)]">
      <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-orange-500">{eyebrow}</p>
      <h3 className="mt-2 text-lg font-semibold text-slate-950">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
      <div className="mt-5">{children}</div>
    </section>
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

function getPromoWorkflowState(
  promo: Pick<PromoEditorRecord, "placement_keys" | "status" | "is_active" | "starts_at">,
  effectiveState: ReturnType<typeof getMarketingPromoEffectiveState>,
) {
  const placementCount = promo.placement_keys?.length || 0
  const status = String(promo.status || "draft")

  if (effectiveState === "expired") return "expired"
  if (status === "paused") return "paused"
  if (!promo.is_active || placementCount === 0) return "needs-placement"
  if (status === "scheduled" && !promo.starts_at) return "needs-schedule"
  if (status === "draft") return "needs-schedule"
  return "launch-ready"
}

function getWorkflowLabel(value: ReturnType<typeof getPromoWorkflowState>) {
  switch (value) {
    case "launch-ready":
      return "Launch ready"
    case "needs-placement":
      return "Needs placement"
    case "needs-schedule":
      return "Needs schedule"
    case "paused":
      return "Paused"
    case "expired":
      return "Expired"
    default:
      return value
  }
}

function getWorkflowBadgeClass(value: ReturnType<typeof getPromoWorkflowState>) {
  switch (value) {
    case "launch-ready":
      return "bg-emerald-50 text-emerald-700"
    case "needs-placement":
      return "bg-amber-50 text-amber-700"
    case "needs-schedule":
      return "bg-rose-50 text-rose-700"
    case "paused":
      return "bg-slate-100 text-slate-700"
    case "expired":
      return "bg-orange-50 text-orange-700"
    default:
      return "bg-slate-100 text-slate-700"
  }
}

function getDefaultMarketingPromoPlacements(targetHref?: string | null) {
  const href = String(targetHref || "").trim().toLowerCase()

  if (href.startsWith("/packages")) return ["packages_featured", "promo_listing"]
  if (href.startsWith("/pesawat")) return ["flights_featured", "promo_listing"]
  if (href.startsWith("/hotel")) return ["hotels_featured", "promo_listing"]
  if (href.startsWith("/kereta")) return ["trains_featured", "promo_listing"]
  if (href.startsWith("/bus")) return ["buses_featured", "promo_listing"]
  if (href.startsWith("/kapal-pesiar")) return ["cruises_featured", "promo_listing"]
  if (href.startsWith("/kapal")) return ["ships_featured", "promo_listing"]
  if (href.startsWith("/aktivitas")) return ["activities_featured", "promo_listing"]
  if (href.startsWith("/promo")) return ["promo_listing"]

  return ["homepage_feed", "promo_listing"]
}

function getQuickAssignableCorePlacements(): Array<{
  key: MarketingPromoPlacementKey
  shortLabel: string
}> {
  return [
    { key: "homepage_feed", shortLabel: "Homepage" },
    { key: "promo_listing", shortLabel: "Promo Listing" },
    { key: "wishlist_suggestions", shortLabel: "Wishlist" },
  ]
}

function getQuickAssignableServicePlacements(): Array<{
  key: MarketingPromoPlacementKey
  shortLabel: string
}> {
  return [
    { key: "packages_featured", shortLabel: "Packages" },
    { key: "flights_featured", shortLabel: "Flights" },
    { key: "hotels_featured", shortLabel: "Hotels" },
    { key: "trains_featured", shortLabel: "Trains" },
    { key: "buses_featured", shortLabel: "Buses" },
    { key: "ships_featured", shortLabel: "Ships" },
    { key: "cruises_featured", shortLabel: "Cruises" },
    { key: "activities_featured", shortLabel: "Activities" },
  ]
}

function getEnabledCoreQuickAssignPlacements(placementKeys: string[]) {
  const enabledPlacementSet = new Set(placementKeys.map((value) => String(value)))
  return getQuickAssignableCorePlacements().filter((placement) => enabledPlacementSet.has(placement.key))
}

function getEnabledServiceQuickAssignPlacements(placementKeys: string[]) {
  const enabledPlacementSet = new Set(placementKeys.map((value) => String(value)))
  return getQuickAssignableServicePlacements().filter((placement) => enabledPlacementSet.has(placement.key))
}

function getRecommendedQuickAssignPlacements(targetHref?: string | null) {
  const recommended = new Set(getDefaultMarketingPromoPlacements(targetHref))
  return [...getQuickAssignableCorePlacements(), ...getQuickAssignableServicePlacements()].filter((placement) => recommended.has(placement.key))
}

function buildPromoFilterReturnTo(basePath: string, params: MarketingPromoSearchParams) {
  const searchParams = new URLSearchParams()
  const q = String(params.q || "").trim()
  const status = String(params.status || "").trim()
  const workflow = String(params.workflow || "").trim()

  if (q) searchParams.set("q", q)
  if (status && status !== "all") searchParams.set("status", status)
  if (workflow && workflow !== "all") searchParams.set("workflow", workflow)

  const query = searchParams.toString()
  return query ? `${basePath}?${query}` : basePath
}
