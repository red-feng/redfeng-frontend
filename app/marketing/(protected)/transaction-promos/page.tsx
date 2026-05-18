import type { ReactNode } from "react"
import { createClient } from "@/lib/supabase/server"
import { getBookingProductLabel, normalizeBookingProductType, type BookingProductType } from "@/lib/booking-products"
import { approveTransactionPromoForMarketing, deleteTransactionPromoRule, upsertTransactionPromoRule } from "@/app/marketing/(protected)/actions"
import {
  getTransactionPromoChannelLabel,
  getTransactionPromoDiscountTypeLabel,
  getTransactionPromoModeLabel,
  getTransactionPromoStatusLabel,
  transactionPromoChannels,
  transactionPromoDiscountTypes,
  transactionPromoStatuses,
} from "@/lib/transaction-promos"
import { getTransactionPromoTargetBadgeClass, getTransactionPromoTargetBadges } from "@/lib/transaction-promo-targeting"
import { createAdminClient } from "@/lib/supabase/admin"
import { getTransactionPromoAnalyticsSummary } from "@/lib/transaction-promo-analytics"

type TransactionPromoSearchParams = {
  success?: string
  error?: string
  q?: string
  status?: string
  product_type?: string
  mode?: string
  payment_method?: string
  merchant_id?: string
}

type TransactionPromoTarget = {
  product_type: string | null
  product_id: string | null
  product_reference: string | null
  merchant_id: string | null
  payment_method: string | null
  customer_locale: string | null
  channel: string | null
  origin_airport_code: string | null
  destination_airport_code: string | null
  airline_code: string | null
  cabin_class: string | null
  trip_type: string | null
  departure_starts_at: string | null
  departure_ends_at: string | null
  return_starts_at: string | null
  return_ends_at: string | null
  hotel_city_code: string | null
  hotel_country_code: string | null
  hotel_star_rating: number | string | null
  hotel_checkin_starts_at: string | null
  hotel_checkin_ends_at: string | null
  hotel_checkout_starts_at: string | null
  hotel_checkout_ends_at: string | null
  hotel_min_night_count: number | string | null
  hotel_max_night_count: number | string | null
}

type TransactionPromoRule = {
  id: string
  code: string | null
  name: string | null
  description: string | null
  discount_type: string | null
  discount_value: number | string | null
  max_discount_amount: number | string | null
  minimum_order_amount: number | string | null
  quota_total: number | null
  quota_per_user: number | null
  starts_at: string | null
  ends_at: string | null
  status: string | null
  is_auto_apply: boolean | null
  new_user_only: boolean | null
  approved_at: string | null
  marketing_approved_by: string | null
  marketing_approved_at: string | null
  finance_approved_by: string | null
  finance_approved_at: string | null
  updated_at: string | null
  created_at: string | null
  transaction_promo_rule_targets: TransactionPromoTarget[] | null
  marketing_promo_transaction_rules:
    | Array<{
        marketing_promos:
          | {
              id: string | null
              slug: string | null
              title_id: string | null
              status: string | null
            }
          | null
      }>
    | null
}

type TransactionPromoLiveState = "draft" | "approved" | "paused" | "expired" | "live" | "waiting"

const transactionProductTypes: BookingProductType[] = ["package_tour", "flight", "hotel", "train", "bus", "sea", "cruise"]

export default async function MarketingTransactionPromosPage({
  searchParams,
}: {
  searchParams?: Promise<TransactionPromoSearchParams>
}) {
  const params = searchParams ? await searchParams : {}
  const query = String(params.q || "").trim().toLowerCase()
  const statusFilter = String(params.status || "all").trim().toLowerCase()
  const productTypeFilter = normalizeBookingProductType(String(params.product_type || "").trim()) || "all"
  const modeFilter = String(params.mode || "all").trim().toLowerCase()
  const paymentMethodFilter = String(params.payment_method || "").trim().toLowerCase()
  const merchantFilter = String(params.merchant_id || "").trim().toLowerCase()
  const adminSupabase = createAdminClient()
  const supabase = await createClient("marketing")
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const { data: currentProfile } = user ? await supabase.from("profiles").select("role").eq("id", user.id).single() : { data: null }
  const canApproveMarketing = ["marketing_manager", "superadmin"].includes(String(currentProfile?.role || "").trim().toLowerCase())
  const nowIso = new Date().toISOString()

  let rulesQuery = adminSupabase
    .from("transaction_promo_rules")
    .select("id, code, name, description, discount_type, discount_value, max_discount_amount, minimum_order_amount, quota_total, quota_per_user, starts_at, ends_at, status, is_auto_apply, new_user_only, approved_at, marketing_approved_by, marketing_approved_at, finance_approved_by, finance_approved_at, updated_at, created_at, transaction_promo_rule_targets(product_type, product_id, product_reference, merchant_id, payment_method, customer_locale, channel, origin_airport_code, destination_airport_code, airline_code, cabin_class, trip_type, departure_starts_at, departure_ends_at, return_starts_at, return_ends_at, hotel_city_code, hotel_country_code, hotel_star_rating, hotel_checkin_starts_at, hotel_checkin_ends_at, hotel_checkout_starts_at, hotel_checkout_ends_at, hotel_min_night_count, hotel_max_night_count), marketing_promo_transaction_rules(marketing_promos(id, slug, title_id, status))")
    .order("updated_at", { ascending: false })

  if (statusFilter !== "all") {
    rulesQuery = rulesQuery.eq("status", statusFilter)
  }

  const [
    { data: rulesData },
    { count: activeCount },
    { count: approvedCount },
    { count: draftCount },
    { count: autoApplyCount },
    analytics,
  ] = await Promise.all([
    rulesQuery,
    adminSupabase.from("transaction_promo_rules").select("id", { count: "exact", head: true }).eq("status", "active"),
    adminSupabase.from("transaction_promo_rules").select("id", { count: "exact", head: true }).eq("status", "approved"),
    adminSupabase.from("transaction_promo_rules").select("id", { count: "exact", head: true }).eq("status", "draft"),
    adminSupabase.from("transaction_promo_rules").select("id", { count: "exact", head: true }).eq("is_auto_apply", true),
    getTransactionPromoAnalyticsSummary(adminSupabase),
  ])

  const approverIds = Array.from(
    new Set(
      (((rulesData as TransactionPromoRule[] | null) || [])).flatMap((rule) => [
        String(rule.marketing_approved_by || "").trim(),
        String(rule.finance_approved_by || "").trim(),
      ]).filter(Boolean),
    ),
  )
  const { data: approverProfiles } = approverIds.length
    ? await adminSupabase.from("profiles").select("id, username").in("id", approverIds)
    : { data: [] as Array<{ id: string | null; username: string | null }> }
  const approverMap = new Map(
    (((approverProfiles as Array<{ id: string | null; username: string | null }> | null) || []))
      .map((profile) => [String(profile.id || "").trim(), String(profile.username || "").trim()] as const)
      .filter(([id]) => Boolean(id)),
  )

  const rules = ((rulesData as TransactionPromoRule[] | null) || [])
    .map((rule) => {
      const targets = Array.isArray(rule.transaction_promo_rule_targets) ? rule.transaction_promo_rule_targets : []
      const primaryTarget = targets[0] || null
      const productTypes = Array.from(
        new Set(
          targets
            .map((target) => normalizeBookingProductType(target.product_type))
            .filter((value): value is BookingProductType => Boolean(value)),
        ),
      )
      const liveState = getTransactionPromoLiveState(rule, nowIso)
      const linkedCampaigns = (((rule.marketing_promo_transaction_rules || []) as Array<{
        marketing_promos?: { id?: string | null; slug?: string | null; title_id?: string | null; status?: string | null } | null
      }>)
        .map((entry) => entry.marketing_promos || null)
        .filter((campaign): campaign is { id: string | null; slug: string | null; title_id: string | null; status: string | null } => Boolean(campaign)))
      const targetBadges = getTransactionPromoTargetBadges(primaryTarget, {
        includePaymentMethod: true,
        includeMerchant: true,
        includeLocale: true,
      })
      return { ...rule, targets, primaryTarget, productTypes, liveState, linkedCampaigns, targetBadges }
    })
    .filter((rule) => {
      if (productTypeFilter === "all") return true
      return rule.productTypes.includes(productTypeFilter)
    })
    .filter((rule) => {
      if (modeFilter === "all") return true
      if (modeFilter === "auto") return Boolean(rule.is_auto_apply)
      if (modeFilter === "code") return !rule.is_auto_apply
      return true
    })
    .filter((rule) => {
      if (!paymentMethodFilter) return true
      return rule.targets.some((target) => String(target.payment_method || "").trim().toLowerCase().includes(paymentMethodFilter))
    })
    .filter((rule) => {
      if (!merchantFilter) return true
      return rule.targets.some((target) => String(target.merchant_id || "").trim().toLowerCase().includes(merchantFilter))
    })
    .filter((rule) => {
      if (!query) return true
      const haystack = [
        rule.name,
        rule.code,
        rule.description,
        rule.status,
        ...rule.productTypes,
        ...rule.targets.map((target) => target.payment_method),
        ...rule.targets.map((target) => target.product_reference),
      ]
        .map((value) => String(value || "").toLowerCase())
        .join(" ")
      return haystack.includes(query)
    })

  const liveCount = rules.filter((rule) => rule.liveState === "live").length
  const waitingCount = rules.filter((rule) => rule.liveState === "waiting").length
  const expiredCount = rules.filter((rule) => rule.liveState === "expired").length
  const needsCodeCount = rules.filter((rule) => !rule.is_auto_apply && !String(rule.code || "").trim()).length
  const needsWindowCount = rules.filter((rule) => String(rule.status || "").toLowerCase() === "active" && !rule.starts_at).length
  const launchReadyCount = rules.filter((rule) => rule.liveState === "live" || String(rule.status || "").toLowerCase() === "approved").length
  const newUserOnlyCount = rules.filter((rule) => Boolean(rule.new_user_only)).length
  const perUserQuotaCount = rules.filter((rule) => Number(rule.quota_per_user || 0) > 0).length
  const paymentMethodTargetCount = rules.filter((rule) => rule.targets.some((target) => Boolean(String(target.payment_method || "").trim()))).length
  const merchantTargetCount = rules.filter((rule) => rule.targets.some((target) => Boolean(String(target.merchant_id || "").trim()))).length

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fff8f1_0%,#f7f1e8_100%)] px-4 py-5 sm:px-6 sm:py-6 md:px-8 md:py-8 lg:px-10">
      <div className="mx-auto max-w-7xl space-y-5 sm:space-y-6 lg:space-y-8">
        <section className="overflow-hidden rounded-[28px] border border-orange-200/60 bg-[linear-gradient(135deg,#111827_0%,#1f2937_34%,#0f766e_72%,#5eead4_100%)] px-5 py-6 text-white shadow-[0_30px_100px_rgba(15,23,42,0.18)] sm:rounded-[32px] sm:px-8 sm:py-8 lg:px-10">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_320px]">
            <div className="max-w-3xl">
              <span className="inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.34em] text-teal-50">
                Voucher, Kupon, dan Auto-apply
              </span>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:mt-5 sm:text-4xl lg:text-5xl">
                Kelola aturan diskon checkout untuk paket, pesawat, kereta, dan layanan berikutnya.
              </h1>
            </div>
            <div className="rounded-[22px] border border-white/20 bg-white/10 px-4 py-4 backdrop-blur sm:rounded-[24px] sm:px-5 sm:py-5">
              <p className="text-[11px] uppercase tracking-[0.28em] text-teal-100/80">Promo snapshot</p>
              <div className="mt-5 grid gap-4">
                <div>
                  <p className="text-sm text-teal-50/80">Promo aktif</p>
                  <p className="mt-1 text-2xl font-semibold text-white sm:text-3xl">{(activeCount || 0).toLocaleString("id-ID")}</p>
                </div>
                <div>
                  <p className="text-sm text-teal-50/80">Siap review finance</p>
                  <p className="mt-1 text-2xl font-semibold text-white sm:text-3xl">{(approvedCount || 0).toLocaleString("id-ID")}</p>
                </div>
                <div>
                  <p className="text-sm text-teal-50/80">Hasil filter</p>
                  <p className="mt-1 text-2xl font-semibold text-white sm:text-3xl">{rules.length.toLocaleString("id-ID")}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {params.success ? <div className="rounded-[24px] border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-700">{params.success}</div> : null}
        {params.error ? <div className="rounded-[24px] border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">{params.error}</div> : null}

        <section className="grid gap-3 sm:gap-4 md:grid-cols-4">
          <MetricCard label="Promo aktif" value={activeCount || 0} note="Sudah masuk window tayang dan siap dipakai checkout." />
          <MetricCard label="Draft antrean" value={draftCount || 0} note="Masih menunggu penguncian angka dan target transaksi." />
          <MetricCard label="Auto-apply" value={autoApplyCount || 0} note="Promo yang menempel otomatis tanpa input voucher atau kupon." />
          <MetricCard label="Live sekarang" value={liveCount} note="Promo yang secara efektif sedang hidup pada saat ini." />
        </section>

        <section className="grid gap-3 sm:gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Campaign terkait" value={analytics.linkedCampaignCount} note="Jumlah campaign publik yang sudah ditautkan ke rule promo checkout." />
          <MetricCard label="Impresi" value={analytics.impressionEvents} note="Tampilan campaign publik yang tercatat pada placement marketing." />
          <MetricCard label="Click" value={analytics.clickEvents} note="Klik dari campaign publik yang menuju landing target promo." />
          <MetricCard label="Quote lolos" value={analytics.quotedEvents} note="Jumlah quote promo yang lolos dan tercatat dari checkout." />
        </section>

        <section className="grid gap-3 sm:gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Quote ditolak" value={analytics.rejectedEvents} note="Percobaan kode promo yang ditolak saat quote checkout." />
          <MetricCard label="Kuota dikembalikan" value={analytics.revertedEvents} note="Reserved quota yang dilepas lagi karena booking expired, dihapus, atau dibatalkan." />
          <MetricCard label="Reserved menunggu bayar" value={analytics.reservedRedemptions} note="Kuota promo yang masih menunggu pembayaran." />
          <MetricCard label="Applied berbayar" value={analytics.appliedRedemptions} note="Promo yang sudah benar-benar dipakai pada booking berbayar." />
        </section>

        <section className="grid gap-3 sm:gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="GMV terdampak" value={analytics.appliedGmv} note="Nilai booking dari promo yang sudah applied." currency />
          <MetricCard label="Biaya diskon" value={analytics.appliedDiscountCost} note="Total biaya diskon dari redemption applied." currency />
          <MetricCard label="Customer baru saja" value={newUserOnlyCount} note="Promo yang hanya boleh dipakai customer baru." />
          <MetricCard label="Kuota per user" value={perUserQuotaCount} note="Promo yang sudah membatasi pemakaian per customer." />
        </section>

        <section className="grid gap-3 sm:gap-4 md:grid-cols-2">
          <MetricCard label="Target metode bayar" value={paymentMethodTargetCount} note="Rule yang menempel ke payment method tertentu." />
          <MetricCard label="Target merchant" value={merchantTargetCount} note="Rule yang hanya hidup untuk merchant tertentu." />
        </section>

        <section className="grid gap-4 sm:gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <article className="rounded-[24px] border border-[#d7ece7] bg-white/85 p-5 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur-sm sm:rounded-[32px] sm:p-6 lg:p-7">
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-teal-600">Workflow lanes</p>
            <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-slate-950 sm:text-2xl">Baca kesiapan promo checkout dengan cepat</h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <LaneCard label="Siap launch" value={launchReadyCount} note="Sudah lolos review finance atau sudah hidup di checkout." />
              <LaneCard label="Menunggu live" value={waitingCount} note="Sudah aktif tetapi masih menunggu window waktu mulai." />
              <LaneCard label="Berakhir" value={expiredCount} note="Window tayang selesai atau status sudah ditutup." />
              <LaneCard label="Butuh voucher" value={needsCodeCount} note="Promo manual yang belum memiliki kode voucher atau kupon yang valid." />
              <LaneCard label="Butuh window" value={needsWindowCount} note="Promo live checkout tanpa waktu mulai yang jelas." />
              <LaneCard label="Layanan siap" value={transactionProductTypes.length} note="Paket, pesawat, hotel, kereta, bus, laut, dan cruise." />
            </div>
          </article>

          <article className="rounded-[24px] border border-[#d7ece7] bg-white/85 p-5 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur-sm sm:rounded-[32px] sm:p-6 lg:p-7">
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-teal-600">Action queue</p>
            <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-slate-950 sm:text-2xl">Titik kontrol yang paling sering dibutuhkan manager</h2>
            <div className="mt-5 space-y-3">
              <QueueCard title="Isu voucher / kupon" body={needsCodeCount ? `${needsCodeCount.toLocaleString("id-ID")} promo manual masih perlu kode voucher atau kupon yang akan diketik customer saat checkout.` : "Semua promo manual pada hasil filter ini sudah memiliki kode voucher atau kupon."} />
              <QueueCard title="Isu window" body={needsWindowCount ? `${needsWindowCount.toLocaleString("id-ID")} promo aktif masih belum punya window mulai yang tegas.` : "Tidak ada promo aktif yang kehilangan window dasar."} />
              <QueueCard title="Cakupan layanan" body={summarizeProductCoverage(rules)} />
              <QueueCard title="Catatan targeting" body="Satu rule bisa disiapkan untuk paket sekarang, lalu tinggal disambungkan ke pesawat, kereta, hotel, bus, laut, atau cruise saat katalog menyusul." />
            </div>
          </article>
        </section>

        <section className="rounded-[24px] border border-[#d7ece7] bg-white/85 p-5 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur-sm sm:rounded-[32px] sm:p-6 lg:p-7">
          <form className="grid gap-4 md:grid-cols-2 xl:grid-cols-7">
            <div className="xl:col-span-2">
              <label className="mb-2 block text-sm font-medium text-slate-700">Cari promo transaksi</label>
              <input
                name="q"
                defaultValue={String(params.q || "")}
                placeholder="Cari berdasarkan nama promo, voucher, kupon, deskripsi, atau target"
                className="w-full rounded-[18px] border border-[#d8e6e1] bg-[#fbfefc] px-4 py-3 text-sm outline-none ring-teal-500 transition focus:ring-2"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Status</label>
              <select
                name="status"
                defaultValue={statusFilter}
                className="w-full rounded-[18px] border border-[#d8e6e1] bg-[#fbfefc] px-4 py-3 text-sm outline-none ring-teal-500 transition focus:ring-2"
              >
                <option value="all">Semua status</option>
                {transactionPromoStatuses.map((status) => (
                  <option key={status} value={status}>
                    {getTransactionPromoStatusLabel(status)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Jenis transaksi</label>
              <select
                name="product_type"
                defaultValue={productTypeFilter}
                className="w-full rounded-[18px] border border-[#d8e6e1] bg-[#fbfefc] px-4 py-3 text-sm outline-none ring-teal-500 transition focus:ring-2"
              >
                <option value="all">Semua jenis</option>
                {transactionProductTypes.map((productType) => (
                  <option key={productType} value={productType}>
                    {getBookingProductLabel(productType)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Mode</label>
              <select
                name="mode"
                defaultValue={modeFilter}
                className="w-full rounded-[18px] border border-[#d8e6e1] bg-[#fbfefc] px-4 py-3 text-sm outline-none ring-teal-500 transition focus:ring-2"
              >
                <option value="all">Semua mode</option>
                 <option value="auto">Auto-apply</option>
                 <option value="code">Voucher / kupon</option>
              </select>
            </div>
            <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Metode pembayaran</label>
              <input
                name="payment_method"
                defaultValue={paymentMethodFilter}
                placeholder="mis: bank_transfer"
                className="w-full rounded-[18px] border border-[#d8e6e1] bg-[#fbfefc] px-4 py-3 text-sm outline-none ring-teal-500 transition focus:ring-2"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Merchant ID</label>
              <input
                name="merchant_id"
                defaultValue={merchantFilter}
                placeholder="uuid merchant"
                className="w-full rounded-[18px] border border-[#d8e6e1] bg-[#fbfefc] px-4 py-3 text-sm outline-none ring-teal-500 transition focus:ring-2"
              />
            </div>
            <div className="flex gap-3 xl:col-span-7">
              <button className="rounded-[18px] bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800">
                Terapkan filter
              </button>
              <a
                href="/marketing/transaction-promos"
                className="rounded-[18px] border border-[#d8e6e1] bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Reset
              </a>
            </div>
          </form>
        </section>

        <section className="rounded-[24px] border border-[#d7ece7] bg-white/85 p-5 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur-sm sm:rounded-[32px] sm:p-6 lg:p-7">
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-teal-600">Buat promo transaksi</p>
          <div className="mt-5">
            <TransactionPromoForm />
          </div>
        </section>

        <section className="grid gap-4 sm:gap-6 xl:grid-cols-2">
          <article className="rounded-[24px] border border-[#d7ece7] bg-white/85 p-5 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur-sm sm:rounded-[32px] sm:p-6 lg:p-7">
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-teal-600">Analitik per payment method</p>
            <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-slate-950 sm:text-2xl">Metode pembayaran paling efektif</h2>
            <div className="mt-5 space-y-3">
              {!analytics.topPaymentMethodsByApplied.length ? (
                <div className="rounded-[24px] border border-dashed border-[#d7ece7] bg-[#f7fcfa] px-5 py-6 text-sm text-slate-500">
                  Belum ada promo applied dengan target payment method tunggal.
                </div>
              ) : (
                analytics.topPaymentMethodsByApplied.map((item, index) => (
                  <article key={`pay-${item.paymentMethod}`} className="rounded-[22px] border border-[#d7ece7] bg-[#f7fcfa] px-5 py-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-teal-600">Rank #{index + 1}</p>
                        <p className="mt-2 text-sm font-semibold text-slate-950">{item.paymentMethod}</p>
                      </div>
                      <div className="grid min-w-[240px] grid-cols-3 gap-2 text-center">
                        <StatPill label="Applied" value={item.appliedRedemptions.toLocaleString("id-ID")} />
                        <StatPill label="GMV" value={formatCompactCurrency(item.appliedGmv)} />
                        <StatPill label="Biaya" value={formatCompactCurrency(item.appliedDiscountCost)} />
                      </div>
                    </div>
                  </article>
                ))
              )}
            </div>
          </article>

          <article className="rounded-[24px] border border-[#d7ece7] bg-white/85 p-5 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur-sm sm:rounded-[32px] sm:p-6 lg:p-7">
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-teal-600">Analitik per merchant</p>
            <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-slate-950 sm:text-2xl">Merchant paling terdampak promo</h2>
            <div className="mt-5 space-y-3">
              {!analytics.topMerchantsByApplied.length ? (
                <div className="rounded-[24px] border border-dashed border-[#d7ece7] bg-[#f7fcfa] px-5 py-6 text-sm text-slate-500">
                  Belum ada promo applied dengan target merchant tunggal.
                </div>
              ) : (
                analytics.topMerchantsByApplied.map((item, index) => (
                  <article key={`merchant-${item.merchantId}`} className="rounded-[22px] border border-[#d7ece7] bg-[#f7fcfa] px-5 py-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-teal-600">Rank #{index + 1}</p>
                        <p className="mt-2 text-sm font-semibold text-slate-950">Merchant {shortId(item.merchantId)}</p>
                        <p className="mt-1 text-xs text-slate-500">{item.merchantId}</p>
                      </div>
                      <div className="grid min-w-[240px] grid-cols-3 gap-2 text-center">
                        <StatPill label="Applied" value={item.appliedRedemptions.toLocaleString("id-ID")} />
                        <StatPill label="GMV" value={formatCompactCurrency(item.appliedGmv)} />
                        <StatPill label="Biaya" value={formatCompactCurrency(item.appliedDiscountCost)} />
                      </div>
                    </div>
                  </article>
                ))
              )}
            </div>
          </article>
        </section>

        <section className="rounded-[24px] border border-[#d7ece7] bg-white/85 p-5 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur-sm sm:rounded-[32px] sm:p-6 lg:p-7">
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-teal-600">Alasan reject checkout</p>
          <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-slate-950 sm:text-2xl">Penyebab voucher, kupon, atau auto-apply paling sering gagal</h2>
          <div className="mt-5 space-y-3">
            {!analytics.topRejectReasons.length ? (
              <div className="rounded-[24px] border border-dashed border-[#d7ece7] bg-[#f7fcfa] px-5 py-6 text-sm text-slate-500">
                Belum ada data reject yang cukup untuk dibaca.
              </div>
            ) : (
              analytics.topRejectReasons.map((item, index) => (
                <article key={`reject-${item.reason}`} className="rounded-[22px] border border-[#d7ece7] bg-[#f7fcfa] px-5 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-teal-600">Rank #{index + 1}</p>
                      <p className="mt-2 text-sm font-semibold text-slate-950">{item.label}</p>
                      <p className="mt-1 text-xs text-slate-500">{item.reason}</p>
                    </div>
                    <StatPill label="Reject" value={item.count.toLocaleString("id-ID")} />
                  </div>
                </article>
              ))
            )}
          </div>
        </section>

        <section className="space-y-4">
          {!rules.length ? (
            <div className="rounded-[24px] border border-dashed border-[#d7ece7] bg-[#f7fcfa] px-5 py-6 text-sm text-slate-500">
              Belum ada promo transaksi yang cocok dengan filter saat ini.
            </div>
          ) : null}
          {rules.map((rule) => (
            <article key={rule.id} className="rounded-[24px] border border-[#d7ece7] bg-white/85 p-5 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur-sm sm:rounded-[32px] sm:p-6 lg:p-7">
              <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-teal-600">Existing rule</p>
                  <h2 className="mt-2 text-xl font-semibold text-slate-950">{String(rule.name || "Untitled")}</h2>
                  <p className="mt-2 text-sm text-slate-500">
                    Status: {getTransactionPromoStatusLabel(rule.status)} | Tipe diskon: {getTransactionPromoDiscountTypeLabel(rule.discount_type)}
                  </p>
                  <p className="mt-2 text-sm text-slate-500">Mode: {getTransactionPromoModeLabel(rule.is_auto_apply, rule.code)}</p>
                  <p className="mt-2 text-sm text-slate-500">Audience: {rule.new_user_only ? "Customer baru saja" : "Semua customer"}</p>
                  <p className="mt-2 text-sm text-slate-500">Target: {rule.productTypes.map((productType) => getBookingProductLabel(productType)).join(", ") || "Belum dipilih"}</p>
                  <p className="mt-2 text-sm text-slate-500">Window: {formatDateWindow(rule.starts_at, rule.ends_at)}</p>
                  {rule.linkedCampaigns.length ? (
                    <p className="mt-2 text-sm text-slate-500">
                      Campaign: {rule.linkedCampaigns.map((campaign) => campaign.title_id || campaign.slug || campaign.id || "-").join(", ")}
                    </p>
                  ) : null}
                  <p className="mt-2 text-sm text-slate-500">
                    Approval: marketing{" "}
                    {rule.marketing_approved_at
                      ? `${approverMap.get(String(rule.marketing_approved_by || "").trim()) || "Manager"} pada ${formatDateTime(rule.marketing_approved_at)}`
                      : "belum"}{" "}
                    | finance{" "}
                    {rule.finance_approved_at
                      ? `${approverMap.get(String(rule.finance_approved_by || "").trim()) || "Finance Manager"} pada ${formatDateTime(rule.finance_approved_at)}`
                      : "belum"}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {rule.linkedCampaigns.length ? (
                      <span className="rounded-full bg-teal-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-teal-700">
                        {rule.linkedCampaigns.length} campaign terkait
                      </span>
                    ) : null}
                    <span className={`rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${getStateBadgeClass(rule.liveState)}`}>
                      {getStateLabel(rule.liveState)}
                    </span>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-700">
                      {rule.targets.length} target
                    </span>
                    {rule.targetBadges.map((badge) => (
                      <span
                        key={badge.key}
                        className={`rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${getTransactionPromoTargetBadgeClass(badge.tone)}`}
                      >
                        {badge.label}
                      </span>
                    ))}
                    {rule.new_user_only ? (
                      <span className="rounded-full bg-amber-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-amber-700">
                        Customer baru saja
                      </span>
                    ) : null}
                    {rule.primaryTarget?.channel ? (
                      <span className="rounded-full bg-sky-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-sky-700">
                        {getTransactionPromoChannelLabel(rule.primaryTarget.channel)}
                      </span>
                    ) : null}
                  </div>
                </div>
                <form action={deleteTransactionPromoRule}>
                  <input type="hidden" name="rule_id" value={rule.id} />
                  <input type="hidden" name="name" value={String(rule.name || "")} />
                  <input type="hidden" name="return_to" value="/marketing/transaction-promos" />
                  <button className="rounded-[16px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-100">
                    Hapus rule
                  </button>
                </form>
              </div>
              {canApproveMarketing && !rule.marketing_approved_at ? (
                <form action={approveTransactionPromoForMarketing} className="mb-5">
                  <input type="hidden" name="rule_id" value={rule.id} />
                  <input type="hidden" name="return_to" value="/marketing/transaction-promos" />
                  <button className="rounded-[16px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100">
                    Setujui dari sisi marketing
                  </button>
                </form>
              ) : null}
              <TransactionPromoForm rule={rule} />
            </article>
          ))}
        </section>

        <section className="rounded-[24px] border border-[#d7ece7] bg-white/85 p-5 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur-sm sm:rounded-[32px] sm:p-6 lg:p-7">
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-teal-600">Funnel campaign ke redemption</p>
          <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-slate-950 sm:text-2xl">Baca perjalanan campaign publik sampai voucher atau auto-apply benar-benar terpakai</h2>
          <div className="mt-5 grid gap-3 md:grid-cols-6">
            <LaneCard label="Campaign terkait" value={analytics.linkedCampaignCount} note="Campaign publik yang sudah tersambung ke rule checkout." />
            <LaneCard label="Impresi" value={analytics.impressionEvents} note="View pada placement promo publik." />
            <LaneCard label="Click" value={analytics.clickEvents} note="Klik yang mendorong user menuju landing promo." />
            <LaneCard label="Quote lolos" value={analytics.quotedEvents} note="Quote promo yang berhasil tercatat saat checkout." />
            <LaneCard label="Reserved quota" value={analytics.reservedRedemptions} note="Promo yang sempat mengunci kuota pada booking." />
            <LaneCard label="Applied berbayar" value={analytics.appliedRedemptions} note="Promo yang berakhir sukses setelah payment settle." />
          </div>
        </section>

        <section className="rounded-[24px] border border-[#d7ece7] bg-white/85 p-5 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur-sm sm:rounded-[32px] sm:p-6 lg:p-7">
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-teal-600">Analytics promo transaksi</p>
          <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-slate-950 sm:text-2xl">Promo yang paling sering terpakai di checkout</h2>
          <div className="mt-5 space-y-3">
            {!analytics.topPromosByApplied.length ? (
              <div className="rounded-[24px] border border-dashed border-[#d7ece7] bg-[#f7fcfa] px-5 py-6 text-sm text-slate-500">
                Belum ada redemption applied untuk promo transaksi.
              </div>
            ) : (
              analytics.topPromosByApplied.map((promo, index) => (
                <article key={promo.ruleId} className="rounded-[22px] border border-[#d7ece7] bg-[#f7fcfa] px-5 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-teal-600">Rank #{index + 1}</p>
                      <p className="mt-2 text-sm font-semibold text-slate-950">{promo.name}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {promo.code ? `Voucher / kupon ${promo.code.toUpperCase()}` : "Auto-apply"} | Status {promo.status || "draft"}
                      </p>
                    </div>
                    <div className="grid min-w-[240px] grid-cols-4 gap-2 text-center">
                      <StatPill label="Impresi" value={promo.impressionEvents.toLocaleString("id-ID")} />
                      <StatPill label="Click" value={promo.clickEvents.toLocaleString("id-ID")} />
                      <StatPill label="Quote" value={promo.quotedEvents.toLocaleString("id-ID")} />
                      <StatPill label="Campaign" value={promo.linkedCampaignCount.toLocaleString("id-ID")} />
                    </div>
                  </div>
                  <div className="mt-3 grid min-w-[240px] grid-cols-4 gap-2 text-center">
                    <StatPill label="Reserved" value={promo.reservedRedemptions.toLocaleString("id-ID")} />
                    <StatPill label="Applied" value={promo.appliedRedemptions.toLocaleString("id-ID")} />
                    <StatPill label="Ditolak" value={promo.rejectedEvents.toLocaleString("id-ID")} />
                    <StatPill label="Kembali" value={promo.revertedEvents.toLocaleString("id-ID")} />
                  </div>
                  <div className="mt-3 grid min-w-[240px] grid-cols-2 gap-2 text-center">
                    <StatPill label="GMV" value={formatCompactCurrency(promo.appliedGmv)} />
                    <StatPill label="Biaya" value={formatCompactCurrency(promo.appliedDiscountCost)} />
                  </div>
                </article>
              ))
            )}
          </div>
        </section>
      </div>
    </main>
  )
}

function TransactionPromoForm({
  rule,
}: {
  rule?: TransactionPromoRule & { targets: TransactionPromoTarget[]; productTypes: BookingProductType[]; liveState: TransactionPromoLiveState }
}) {
  const selectedProductTypes = rule?.productTypes?.length ? rule.productTypes : ["package_tour"]
  const primaryTarget = rule?.targets?.[0]
  return (
    <form action={upsertTransactionPromoRule} className="grid gap-4">
      <input type="hidden" name="rule_id" value={rule?.id || ""} />
      <input type="hidden" name="return_to" value="/marketing/transaction-promos" />

      <FormSection
        eyebrow={rule ? "Edit transaction promo" : "Create transaction promo"}
        title="Mulai dari identitas dan logika diskon"
        description="Bagian ini menentukan nama campaign, kode voucher atau kupon, dan tipe diskon. Setiap penyimpanan dari portal marketing akan kembali ke draft sampai disetujui marketing manager lalu finance manager."
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Field label="Nama promo" name="name" defaultValue={String(rule?.name || "")} />
          <Field label="Kode voucher / kupon" name="code" defaultValue={String(rule?.code || "")} required={false} />
          <ReadOnlyField label="Status saat ini" value={getTransactionPromoStatusLabel(rule?.status || "draft")} />
          <SelectField
            label="Jenis diskon"
            name="discount_type"
            defaultValue={String(rule?.discount_type || "percentage")}
            options={transactionPromoDiscountTypes.map((type) => ({ value: type, label: getTransactionPromoDiscountTypeLabel(type) }))}
          />
          <Field label="Nilai diskon" name="discount_value" type="number" defaultValue={String(rule?.discount_value || "")} />
          <Field label="Max discount" name="max_discount_amount" type="number" defaultValue={String(rule?.max_discount_amount || "")} required={false} />
        </div>
        <div className="mt-4">
          <TextAreaField label="Deskripsi internal" name="description" defaultValue={String(rule?.description || "")} required={false} />
        </div>
      </FormSection>

      <FormSection
        eyebrow="Quota & schedule"
        title="Atur minimum transaksi, jendela aktif, dan mode pemakaian"
        description="Manager bisa memakai bagian ini untuk menjaga rule tetap sehat saat nanti promo masuk ke checkout package dan layanan lain."
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Field label="Minimum order" name="minimum_order_amount" type="number" defaultValue={String(rule?.minimum_order_amount || "0")} required={false} />
          <Field label="Kuota total" name="quota_total" type="number" defaultValue={String(rule?.quota_total || "")} required={false} />
          <Field label="Kuota per user" name="quota_per_user" type="number" defaultValue={String(rule?.quota_per_user || "")} required={false} />
          <Field label="Mulai aktif" name="starts_at" type="datetime-local" defaultValue={toDateTimeLocalInput(rule?.starts_at)} required={false} />
          <Field label="Selesai aktif" name="ends_at" type="datetime-local" defaultValue={toDateTimeLocalInput(rule?.ends_at)} required={false} />
          <SelectField
            label="Channel"
            name="channel"
            defaultValue={String(primaryTarget?.channel || "public_web")}
            options={transactionPromoChannels.map((channel) => ({ value: channel, label: getTransactionPromoChannelLabel(channel) }))}
          />
        </div>
        <label className="mt-4 flex items-center rounded-[18px] border border-[#d8e6e1] bg-[#fbfefc] px-4 py-3 text-sm font-medium text-slate-700">
          <input type="checkbox" name="is_auto_apply" defaultChecked={Boolean(rule?.is_auto_apply)} className="mr-3" />
          Auto-apply tanpa perlu input voucher atau kupon dari customer
        </label>
        <label className="mt-4 flex items-center rounded-[18px] border border-[#d8e6e1] bg-[#fbfefc] px-4 py-3 text-sm font-medium text-slate-700">
          <input type="checkbox" name="new_user_only" defaultChecked={Boolean(rule?.new_user_only)} className="mr-3" />
          Batasi promo ini hanya untuk customer baru
        </label>
      </FormSection>

      <FormSection
        eyebrow="Targeting"
        title="Pilih jenis transaksi dan target lanjutan"
        description="Untuk fase awal, satu rule bisa ditempel ke beberapa jenis transaksi sekaligus, lalu disaring lagi dengan product, merchant, payment method, atau locale bila perlu."
      >
        <div className="space-y-3">
          <p className="text-sm font-medium text-slate-700">Jenis transaksi</p>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {transactionProductTypes.map((productType) => (
              <label key={productType} className="rounded-[18px] border border-[#d8e6e1] bg-[#fbfefc] px-4 py-3 text-sm text-slate-700">
                <span className="flex items-start gap-3">
                  <input type="checkbox" name="product_types" value={productType} defaultChecked={selectedProductTypes.includes(productType)} className="mt-1" />
                  <span>
                    <span className="block font-semibold text-slate-900">{getBookingProductLabel(productType)}</span>
                    <span className="mt-1 block text-xs leading-6 text-slate-500">Siapkan sekarang, sambungkan checkout-nya menyusul bila katalog belum ada.</span>
                  </span>
                </span>
              </label>
            ))}
          </div>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Field label="Product ID" name="product_id" defaultValue={String(primaryTarget?.product_id || "")} required={false} />
          <Field label="Product reference" name="product_reference" defaultValue={String(primaryTarget?.product_reference || "")} required={false} />
          <Field label="Merchant ID" name="merchant_id" defaultValue={String(primaryTarget?.merchant_id || "")} required={false} />
          <Field label="Payment method" name="payment_method" defaultValue={String(primaryTarget?.payment_method || "")} required={false} />
          <Field label="Customer locale" name="customer_locale" defaultValue={String(primaryTarget?.customer_locale || "")} required={false} />
        </div>
        <div className="mt-5 rounded-[20px] border border-cyan-200 bg-cyan-50/80 p-4">
          <p className="text-sm font-semibold text-slate-900">Flight-ready contract</p>
          <p className="mt-1 text-xs leading-6 text-slate-600">
            Isi bagian ini bila rule sudah ingin disiapkan untuk katalog pesawat nanti. Belum membuat promo flight live, tetapi kontraknya akan siap saat checkout flight disambungkan.
          </p>
          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <Field label="Origin airport code" name="origin_airport_code" defaultValue={String(primaryTarget?.origin_airport_code || "")} required={false} />
            <Field label="Destination airport code" name="destination_airport_code" defaultValue={String(primaryTarget?.destination_airport_code || "")} required={false} />
            <Field label="Airline code" name="airline_code" defaultValue={String(primaryTarget?.airline_code || "")} required={false} />
            <Field label="Cabin class" name="cabin_class" defaultValue={String(primaryTarget?.cabin_class || "")} required={false} />
            <SelectField
              label="Trip type"
              name="trip_type"
              defaultValue={String(primaryTarget?.trip_type || "")}
              options={[
                { value: "", label: "Semua trip type" },
                { value: "one_way", label: "One way" },
                { value: "round_trip", label: "Round trip" },
                { value: "multi_city", label: "Multi-city" },
              ]}
            />
            <div />
            <Field label="Departure window start" name="departure_starts_at" type="date" defaultValue={toDateInput(primaryTarget?.departure_starts_at)} required={false} />
            <Field label="Departure window end" name="departure_ends_at" type="date" defaultValue={toDateInput(primaryTarget?.departure_ends_at)} required={false} />
            <Field label="Return window start" name="return_starts_at" type="date" defaultValue={toDateInput(primaryTarget?.return_starts_at)} required={false} />
            <Field label="Return window end" name="return_ends_at" type="date" defaultValue={toDateInput(primaryTarget?.return_ends_at)} required={false} />
          </div>
        </div>
        <div className="mt-5 rounded-[20px] border border-emerald-200 bg-emerald-50/80 p-4">
          <p className="text-sm font-semibold text-slate-900">Hotel-ready contract</p>
          <p className="mt-1 text-xs leading-6 text-slate-600">
            Isi bagian ini bila rule sudah ingin disiapkan untuk katalog hotel nanti. Belum membuat promo hotel live, tetapi kontraknya akan siap saat result page dan checkout hotel disambungkan.
          </p>
          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <Field label="Hotel city code" name="hotel_city_code" defaultValue={String(primaryTarget?.hotel_city_code || "")} required={false} />
            <Field label="Hotel country code" name="hotel_country_code" defaultValue={String(primaryTarget?.hotel_country_code || "")} required={false} />
            <Field label="Hotel star rating" name="hotel_star_rating" type="number" defaultValue={String(primaryTarget?.hotel_star_rating || "")} required={false} />
            <Field label="Check-in window start" name="hotel_checkin_starts_at" type="date" defaultValue={toDateInput(primaryTarget?.hotel_checkin_starts_at)} required={false} />
            <Field label="Check-in window end" name="hotel_checkin_ends_at" type="date" defaultValue={toDateInput(primaryTarget?.hotel_checkin_ends_at)} required={false} />
            <div />
            <Field label="Check-out window start" name="hotel_checkout_starts_at" type="date" defaultValue={toDateInput(primaryTarget?.hotel_checkout_starts_at)} required={false} />
            <Field label="Check-out window end" name="hotel_checkout_ends_at" type="date" defaultValue={toDateInput(primaryTarget?.hotel_checkout_ends_at)} required={false} />
            <div />
            <Field label="Minimum night count" name="hotel_min_night_count" type="number" defaultValue={String(primaryTarget?.hotel_min_night_count || "")} required={false} />
            <Field label="Maximum night count" name="hotel_max_night_count" type="number" defaultValue={String(primaryTarget?.hotel_max_night_count || "")} required={false} />
          </div>
        </div>
      </FormSection>

      <button className="w-fit rounded-[18px] bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800">
        {rule ? "Simpan perubahan promo transaksi" : "Buat promo transaksi"}
      </button>
    </form>
  )
}

function MetricCard({ label, value, note, currency = false }: { label: string; value: number; note: string; currency?: boolean }) {
  return (
    <article className="rounded-[22px] border border-[#d7ece7] bg-white px-4 py-4 shadow-[0_18px_44px_rgba(15,23,42,0.06)] sm:rounded-[26px] sm:px-5 sm:py-5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-teal-600">{label}</p>
      <p className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-slate-950 sm:text-3xl">{currency ? formatCompactCurrency(value) : value.toLocaleString("id-ID")}</p>
      <p className="mt-2 text-xs leading-6 text-slate-500">{note}</p>
    </article>
  )
}

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[16px] border border-slate-200 bg-white px-3 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-950">{value}</p>
    </div>
  )
}

function LaneCard({ label, value, note }: { label: string; value: number; note: string }) {
  return (
    <article className="rounded-[20px] border border-[#d7ece7] bg-[#f7fcfa] px-4 py-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-slate-950">{value.toLocaleString("id-ID")}</p>
      <p className="mt-2 text-xs leading-6 text-slate-500">{note}</p>
    </article>
  )
}

function QueueCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-[20px] border border-[#d7ece7] bg-[#f7fcfa] px-4 py-4">
      <p className="text-sm font-semibold text-slate-950">{title}</p>
      <p className="mt-2 text-sm text-slate-600">{body}</p>
    </div>
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
    <section className="rounded-[24px] border border-[#d7ece7] bg-white px-5 py-5 shadow-[0_18px_44px_rgba(15,23,42,0.04)]">
      <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-teal-600">{eyebrow}</p>
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
        required={required}
        defaultValue={defaultValue}
        className="w-full rounded-[18px] border border-[#d8e6e1] bg-[#fbfefc] px-4 py-3 text-sm outline-none ring-teal-500 transition focus:ring-2"
      />
    </div>
  )
}

function TextAreaField({
  label,
  name,
  defaultValue,
  required = true,
}: {
  label: string
  name: string
  defaultValue: string
  required?: boolean
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-slate-700">{label}</label>
      <textarea
        name={name}
        required={required}
        defaultValue={defaultValue}
        rows={4}
        className="w-full rounded-[18px] border border-[#d8e6e1] bg-[#fbfefc] px-4 py-3 text-sm outline-none ring-teal-500 transition focus:ring-2"
      />
    </div>
  )
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-slate-700">{label}</label>
      <div className="w-full rounded-[18px] border border-[#d8e6e1] bg-slate-50 px-4 py-3 text-sm text-slate-700">{value}</div>
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
        className="w-full rounded-[18px] border border-[#d8e6e1] bg-[#fbfefc] px-4 py-3 text-sm outline-none ring-teal-500 transition focus:ring-2"
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

function toDateInput(value: string | null | undefined) {
  if (!value) return ""
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return ""
  const year = parsed.getFullYear()
  const month = String(parsed.getMonth() + 1).padStart(2, "0")
  const day = String(parsed.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function formatDateWindow(startsAt: string | null, endsAt: string | null) {
  if (!startsAt && !endsAt) return "Tanpa jadwal"
  const format = (value: string | null) => (value ? new Date(value).toLocaleString("id-ID") : "sekarang")
  return `${format(startsAt)} - ${endsAt ? format(endsAt) : "tanpa batas"}`
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "-"
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return "-"
  return parsed.toLocaleString("id-ID")
}

function getTransactionPromoLiveState(rule: Pick<TransactionPromoRule, "status" | "starts_at" | "ends_at">, nowIso: string): TransactionPromoLiveState {
  const status = String(rule.status || "").toLowerCase()
  if (status === "expired") return "expired"
  if (status === "paused") return "paused"
  if (status === "draft") return "draft"
  if (status === "approved") return "approved"
  const nowTime = new Date(nowIso).getTime()
  const startsTime = rule.starts_at ? new Date(rule.starts_at).getTime() : null
  const endsTime = rule.ends_at ? new Date(rule.ends_at).getTime() : null
  if (status === "active" && (!startsTime || startsTime <= nowTime) && (!endsTime || endsTime >= nowTime)) return "live"
  if (status === "active" && rule.starts_at && new Date(rule.starts_at).getTime() > new Date(nowIso).getTime()) return "waiting"
  if (rule.ends_at && new Date(rule.ends_at).getTime() < new Date(nowIso).getTime()) return "expired"
  return "approved"
}

function getStateLabel(value: TransactionPromoLiveState) {
  if (value === "live") return "Live checkout"
  if (value === "waiting") return "Menunggu live"
  if (value === "expired") return "Berakhir"
  if (value === "paused") return "Dijeda"
  if (value === "draft") return "Draft / revisi"
  return "Siap review finance"
}

function getStateBadgeClass(value: TransactionPromoLiveState) {
  if (value === "live") return "bg-emerald-50 text-emerald-700"
  if (value === "waiting") return "bg-sky-50 text-sky-700"
  if (value === "expired") return "bg-orange-50 text-orange-700"
  if (value === "paused") return "bg-slate-100 text-slate-700"
  if (value === "draft") return "bg-amber-50 text-amber-700"
  return "bg-teal-50 text-teal-700"
}

function summarizeProductCoverage(rules: Array<{ productTypes: BookingProductType[] }>) {
  const seen = new Set<BookingProductType>()
  for (const rule of rules) {
    for (const productType of rule.productTypes) {
      seen.add(productType)
    }
  }

  if (!seen.size) {
    return "Belum ada rule pada hasil filter ini yang mencakup jenis transaksi tertentu."
  }

  return Array.from(seen).map((productType) => getBookingProductLabel(productType)).join(", ")
}

function formatCompactCurrency(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    notation: value >= 1000000 ? "compact" : "standard",
    maximumFractionDigits: 1,
  }).format(value)
}

function shortId(value: string | null | undefined) {
  const normalized = String(value || "").trim()
  if (!normalized) return "-"
  return normalized.slice(0, 8)
}
