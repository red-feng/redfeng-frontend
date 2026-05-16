import { approveTransactionPromoForFinance } from "@/app/marketing/(protected)/actions"
import { getBookingProductLabel, normalizeBookingProductType, type BookingProductType } from "@/lib/booking-products"
import {
  getTransactionPromoChannelLabel,
  getTransactionPromoDiscountTypeLabel,
  getTransactionPromoStatusLabel,
} from "@/lib/transaction-promos"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

type TransactionPromoSearchParams = {
  success?: string
  error?: string
  q?: string
  status?: string
}

type TransactionPromoTarget = {
  product_type: string | null
  payment_method: string | null
  customer_locale: string | null
  channel: string | null
}

type TransactionPromoRule = {
  id: string
  code: string | null
  name: string | null
  discount_type: string | null
  discount_value: number | string | null
  minimum_order_amount: number | string | null
  max_discount_amount: number | string | null
  status: string | null
  is_auto_apply: boolean | null
  marketing_approved_by: string | null
  starts_at: string | null
  ends_at: string | null
  marketing_approved_at: string | null
  finance_approved_by: string | null
  finance_approved_at: string | null
  transaction_promo_rule_targets: TransactionPromoTarget[] | null
}

export default async function FinanceTransactionPromosPage({
  searchParams,
}: {
  searchParams?: Promise<TransactionPromoSearchParams>
}) {
  const params = searchParams ? await searchParams : {}
  const query = String(params.q || "").trim().toLowerCase()
  const statusFilter = String(params.status || "all").trim().toLowerCase()
  const adminSupabase = createAdminClient()
  const supabase = await createClient("finance")
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const { data: currentProfile } = user ? await supabase.from("profiles").select("role").eq("id", user.id).single() : { data: null }
  const canApproveFinance = ["finance_manager", "superadmin"].includes(String(currentProfile?.role || "").trim().toLowerCase())

  let rulesQuery = adminSupabase
    .from("transaction_promo_rules")
    .select("id, code, name, discount_type, discount_value, minimum_order_amount, max_discount_amount, status, is_auto_apply, marketing_approved_by, starts_at, ends_at, marketing_approved_at, finance_approved_by, finance_approved_at, transaction_promo_rule_targets(product_type, payment_method, customer_locale, channel)")
    .order("updated_at", { ascending: false })

  if (statusFilter !== "all") {
    rulesQuery = rulesQuery.eq("status", statusFilter)
  }

  const [{ data: ruleData }, { count: readyFinanceCount }, { count: activeCount }] = await Promise.all([
    rulesQuery,
    adminSupabase.from("transaction_promo_rules").select("id", { count: "exact", head: true }).eq("status", "approved"),
    adminSupabase.from("transaction_promo_rules").select("id", { count: "exact", head: true }).eq("status", "active"),
  ])

  const rules = ((ruleData as TransactionPromoRule[] | null) || [])
    .map((rule) => {
      const targets = Array.isArray(rule.transaction_promo_rule_targets) ? rule.transaction_promo_rule_targets : []
      const productTypes = Array.from(
        new Set(
          targets
            .map((target) => normalizeBookingProductType(target.product_type))
            .filter((value): value is BookingProductType => Boolean(value)),
        ),
      )
      return { ...rule, targets, productTypes }
    })
    .filter((rule) => {
      if (!query) return true
      const haystack = [rule.name, rule.code, rule.status, ...rule.productTypes].map((value) => String(value || "").toLowerCase()).join(" ")
      return haystack.includes(query)
    })

  const approverIds = Array.from(
    new Set(
      rules.flatMap((rule) => [
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
  const pendingMarketingRules = rules.filter((rule) => !rule.marketing_approved_at)
  const fullyApprovedRules = rules.filter((rule) => Boolean(rule.marketing_approved_at) && Boolean(rule.finance_approved_at))

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fff8f1_0%,#f7f1e8_100%)] px-4 py-6 sm:px-8 sm:py-8 lg:px-10">
      <div className="mx-auto max-w-7xl space-y-8">
        <section className="overflow-hidden rounded-[28px] border border-orange-200/60 bg-[linear-gradient(135deg,#7c2d12_0%,#c2410c_38%,#f97316_72%,#fdba74_100%)] px-5 py-6 text-white shadow-[0_30px_100px_rgba(146,64,14,0.18)] sm:rounded-[32px] sm:px-8 sm:py-8 lg:px-10">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_340px]">
            <div className="max-w-3xl">
              <span className="inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.34em] text-orange-50">
                Review Promo Transaksi
              </span>
              <h1 className="mt-5 text-3xl font-semibold tracking-tight sm:text-5xl">
                Tinjau angka promo transaksi sebelum rule aktif di checkout.
              </h1>
              <p className="mt-4 text-base leading-8 text-orange-50/90">
                Workspace ini membantu finance manager membaca rule yang sudah lolos marketing, memeriksa dampak diskon
                ke margin, lalu mengaktifkan promo transaksi hanya jika angkanya sudah aman.
              </p>
            </div>
            <div className="rounded-[24px] border border-white/20 bg-white/10 px-4 py-4 backdrop-blur sm:px-5 sm:py-5">
              <p className="text-[11px] uppercase tracking-[0.28em] text-orange-100/80">Pulse approval</p>
              <div className="mt-5 grid gap-4">
                <div>
                  <p className="text-sm text-orange-50/80">Siap direview finance</p>
                  <p className="mt-1 text-3xl font-semibold text-white">{readyFinanceCount || 0}</p>
                </div>
                <div>
                  <p className="text-sm text-orange-50/80">Sudah aktif</p>
                  <p className="mt-1 text-3xl font-semibold text-white">{activeCount || 0}</p>
                </div>
                <div>
                  <p className="text-sm text-orange-50/80">Hasil filter</p>
                  <p className="mt-1 text-3xl font-semibold text-white">{rules.length}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-3 sm:gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Siap direview finance" value={readyFinanceCount || 0} />
          <MetricCard label="Menunggu marketing" value={pendingMarketingRules.length} />
          <MetricCard label="Sudah aktif" value={activeCount || 0} />
          <MetricCard label="Lolos dua approval" value={fullyApprovedRules.length} />
        </section>

        <section className="grid gap-4 sm:gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="rounded-[24px] border border-[#ecd9c2] bg-white/90 px-5 py-5 shadow-[0_18px_44px_rgba(15,23,42,0.06)] backdrop-blur-sm sm:rounded-[32px] sm:px-6 sm:py-6">
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-orange-500">Filter review</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950">Saring antrean approval promo transaksi</h2>
            <form className="mt-5 grid gap-4 md:grid-cols-3">
              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-medium text-slate-700">Cari promo transaksi</label>
                <input
                  name="q"
                  defaultValue={String(params.q || "")}
                  placeholder="Cari nama, kode, status, atau jenis transaksi"
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
                  <option value="draft">Draft</option>
                  <option value="approved">Approved</option>
                  <option value="active">Active</option>
                  <option value="paused">Paused</option>
                  <option value="expired">Expired</option>
                </select>
              </div>
              <div className="flex gap-3 md:col-span-3">
                <button className="rounded-[18px] bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800">
                  Terapkan filter
                </button>
                <a
                  href="/finance/transaction-promos"
                  className="rounded-[18px] border border-[#e6d8c2] bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Reset
                </a>
              </div>
            </form>
          </div>

          <div className="rounded-[24px] border border-[#ecd9c2] bg-white/90 px-5 py-5 shadow-[0_18px_44px_rgba(15,23,42,0.06)] backdrop-blur-sm sm:rounded-[32px] sm:px-6 sm:py-6">
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-orange-500">Jalur keputusan</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950">Peran finance dalam approval promo</h2>
            <div className="mt-5 grid gap-3">
              <div className="rounded-[22px] border border-slate-950 bg-slate-950 px-5 py-4 text-sm font-semibold text-white">
                <span className="block">Approved dari marketing</span>
                <span className="mt-1 block text-xs leading-6 text-white/80">
                  Hanya rule yang sudah lolos marketing yang masuk ke review finance.
                </span>
              </div>
              <div className="rounded-[22px] border border-[#efe1cf] bg-[#fffaf3] px-5 py-4 text-sm font-semibold text-slate-900">
                <span className="block">Review angka dan margin</span>
                <span className="mt-1 block text-xs leading-6 text-slate-500">
                  Cek minimum order, jenis diskon, cap diskon, dan target transaksi sebelum aktivasi.
                </span>
              </div>
              <div className="rounded-[22px] border border-[#efe1cf] bg-[#fffaf3] px-5 py-4 text-sm font-semibold text-slate-900">
                <span className="block">Aktifkan rule di checkout</span>
                <span className="mt-1 block text-xs leading-6 text-slate-500">
                  Setelah finance approve, rule baru boleh hidup di checkout package dan layanan lain yang nanti disambungkan.
                </span>
              </div>
            </div>
          </div>
        </section>

        {params.success ? <div className="rounded-[24px] border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-700">{params.success}</div> : null}
        {params.error ? <div className="rounded-[24px] border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">{params.error}</div> : null}

        <section className="space-y-4">
          {!rules.length ? (
            <div className="rounded-[24px] border border-dashed border-[#ecd9c2] bg-[#fffaf3] px-5 py-6 text-sm text-slate-500">
              Belum ada promo transaksi yang cocok dengan filter saat ini.
            </div>
          ) : null}
          {rules.map((rule) => (
            <article key={rule.id} className="rounded-[24px] border border-[#ecd9c2] bg-white px-5 py-5 shadow-[0_18px_44px_rgba(15,23,42,0.06)] sm:rounded-[28px] sm:px-6 sm:py-6">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-orange-500">Finance review</p>
                  <h2 className="mt-2 text-xl font-semibold text-slate-950">{String(rule.name || "Untitled")}</h2>
                  <p className="mt-2 text-sm text-slate-500">
                    Status: {getTransactionPromoStatusLabel(rule.status)} | Tipe: {getTransactionPromoDiscountTypeLabel(rule.discount_type)} | Mode: {rule.is_auto_apply ? "Auto apply" : `Kode ${String(rule.code || "-")}`}
                  </p>
                  <p className="mt-2 text-sm text-slate-500">
                    Target: {rule.productTypes.map((productType) => getBookingProductLabel(productType)).join(", ") || "Belum dipilih"}
                  </p>
                  <p className="mt-2 text-sm text-slate-500">
                    Window: {formatDateWindow(rule.starts_at, rule.ends_at)}
                  </p>
                  <p className="mt-2 text-sm text-slate-500">
                    Marketing approval:{" "}
                    {rule.marketing_approved_at
                      ? `${approverMap.get(String(rule.marketing_approved_by || "").trim()) || "Marketing Manager"} pada ${formatDateTime(rule.marketing_approved_at)}`
                      : "belum"}{" "}
                    | Finance approval:{" "}
                    {rule.finance_approved_at
                      ? `${approverMap.get(String(rule.finance_approved_by || "").trim()) || "Finance Manager"} pada ${formatDateTime(rule.finance_approved_at)}`
                      : "belum"}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {rule.targets[0]?.channel ? (
                      <span className="rounded-full bg-sky-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-sky-700">
                        {getTransactionPromoChannelLabel(rule.targets[0].channel)}
                      </span>
                    ) : null}
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-700">
                      Min order {formatCurrency(rule.minimum_order_amount)}
                    </span>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-700">
                      Diskon {formatDiscount(rule.discount_type, rule.discount_value, rule.max_discount_amount)}
                    </span>
                  </div>
                </div>
                {canApproveFinance && rule.marketing_approved_at && !rule.finance_approved_at ? (
                  <form action={approveTransactionPromoForFinance}>
                    <input type="hidden" name="rule_id" value={rule.id} />
                    <input type="hidden" name="return_to" value="/finance/transaction-promos" />
                    <button className="rounded-[16px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100">
                      Setujui angka dan aktifkan
                    </button>
                  </form>
                ) : null}
              </div>
            </article>
          ))}
        </section>
      </div>
    </main>
  )
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <article className="rounded-[20px] border border-[#ecd9c2] bg-[#fffaf3] px-4 py-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-slate-950">{value.toLocaleString("id-ID")}</p>
    </article>
  )
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

function formatCurrency(value: number | string | null | undefined) {
  const amount = Number(value || 0)
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(Number.isFinite(amount) ? amount : 0)
}

function formatDiscount(discountType: string | null, discountValue: number | string | null, maxDiscountAmount: number | string | null) {
  const value = Number(discountValue || 0)
  const max = Number(maxDiscountAmount || 0)
  if (String(discountType || "").toLowerCase() === "percentage") {
    return `${value}%${max > 0 ? `, max ${formatCurrency(max)}` : ""}`
  }
  return formatCurrency(value)
}
