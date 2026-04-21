import Link from "next/link"
import { getCurrentLocale } from "@/lib/locale"
import { getMerchantShellText } from "@/lib/merchant-shell-i18n"
import { toneClass } from "@/lib/status-tones"
import { createClient } from "@/lib/supabase/server"
import { formatTravelStyleLabel } from "@/lib/travelStyles"
import { deletePackage, pullPackageToDraft, togglePackageStatus } from "./actions"

type PackageRow = {
  id: string
  package_code: string | null
  title: string | null
  slug: string | null
  price_adult: number | null
  status: string | null
  travel_style: string | null
  created_at: string | null
  updated_at: string | null
  rejection_reason: string | null
}

function formatMoney(value: number | null) {
  return `Rp ${(value ?? 0).toLocaleString("id-ID")}`
}

function formatStatus(value: string | null, pendingReviewStatus: string, rejectedLabel: string, activeLabel: string, draftLabel: string, inactiveLabel: string) {
  const status = (value || "").toLowerCase()
  if (status === "approved") return activeLabel
  if (status === "pending") return pendingReviewStatus
  if (status === "rejected") return rejectedLabel
  if (status === "draft") return draftLabel
  if (status === "inactive") return inactiveLabel
  return value || "-"
}

function statusClasses(value: string | null) {
  const status = (value || "").toLowerCase()
  if (status === "approved") return toneClass("success")
  if (status === "pending") return toneClass("pending")
  if (status === "rejected") return toneClass("danger")
  if (status === "draft") return toneClass("neutral")
  return toneClass("neutral")
}

function formatDate(value: string | null) {
  if (!value) return "-"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  })
}

export default async function MerchantPackagePage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; success?: string; error?: string }>
}) {
  const params = await searchParams
  const activeStatus = params.status || "draft"
  const successMessage = params.success || ""
  const errorMessage = params.error || ""
  const supabase = await createClient("merchant")
  const locale = await getCurrentLocale()
  const t = getMerchantShellText(locale).packages
  const packageMenus = [
    { label: t.addPackage, key: "add", href: "/merchant/paket/tambah" },
    { label: t.draftPackages, key: "draft" },
    { label: t.activePackages, key: "approved" },
    { label: t.inactivePackages, key: "inactive" },
    { label: t.pendingPackages, key: "pending" },
    { label: t.rejectedPackages, key: "rejected" },
  ]
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data: merchant } = await supabase.from("merchants").select("id").eq("user_id", user.id).single()

  if (!merchant) return <div className="p-10">{t.merchantMissing}</div>

  let query = supabase
    .from("packages")
    .select("id, package_code, title, slug, price_adult, status, travel_style, created_at, updated_at, rejection_reason")
    .eq("merchant_id", merchant.id)
    .order("created_at", { ascending: false })

  if (activeStatus !== "add") {
    query = query.eq("status", activeStatus)
  }

  const { data, error } = await query
  const packages = (data as PackageRow[] | null) || []

  const summary = {
    all: packages.length,
    approved: packages.filter((pkg) => pkg.status === "approved").length,
    pending: packages.filter((pkg) => pkg.status === "pending").length,
    draft: packages.filter((pkg) => pkg.status === "draft").length,
    rejected: packages.filter((pkg) => pkg.status === "rejected").length,
  }

  const heroStats = [
    { label: t.activePackageStat, value: summary.approved, note: t.activePackageNote },
    { label: t.pendingReviewStat, value: summary.pending, note: t.pendingReviewNote },
    { label: t.draftRejectedStat, value: summary.draft + summary.rejected, note: t.draftRejectedNote },
  ]

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#fff8f1_0%,#f7f1e8_38%,#f3eee7_100%)] p-6 md:p-10">
      <section className="overflow-hidden rounded-[32px] bg-[linear-gradient(135deg,#9a3412_0%,#ea580c_45%,#fb923c_100%)] text-white shadow-[0_32px_90px_-40px_rgba(154,52,18,0.85)]">
        <div className="grid gap-6 px-7 py-8 lg:grid-cols-[minmax(0,1.65fr)_420px] lg:px-10 lg:py-10">
          <div>
            <span className="inline-flex rounded-full border border-white/30 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-orange-50">
              {t.heroBadge}
            </span>
            <h1 className="mt-4 max-w-3xl text-3xl font-semibold leading-tight md:text-5xl">
              {t.heroTitle}
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-orange-50/92 md:text-base">
              {t.heroDescription}
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
            {heroStats.map((card) => (
              <div key={card.label} className="rounded-[28px] border border-white/30 bg-white/12 p-5 backdrop-blur">
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-orange-100/90">{card.label}</p>
                <p className="mt-3 text-3xl font-semibold">{card.value}</p>
                <p className="mt-2 text-sm text-orange-50/85">{card.note}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {successMessage && (
        <div className="mt-6 rounded-[24px] border border-emerald-200 bg-emerald-50/90 p-4 text-sm text-emerald-700 shadow-sm">
          {successMessage}
        </div>
      )}

      {errorMessage && (
        <div className="mt-6 rounded-[24px] border border-rose-200 bg-rose-50/90 p-4 text-sm text-rose-700 shadow-sm">
          {errorMessage}
        </div>
      )}

      <section className="mt-6 grid gap-4 md:grid-cols-4">
        <div className="rounded-[28px] border border-orange-100/70 bg-white/90 p-5 shadow-[0_24px_60px_-40px_rgba(15,23,42,0.35)] backdrop-blur">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">{t.totalPackages}</p>
          <p className="mt-3 text-3xl font-semibold text-slate-950">{summary.all}</p>
        </div>
        <div className="rounded-[28px] border border-orange-100/70 bg-white/90 p-5 shadow-[0_24px_60px_-40px_rgba(15,23,42,0.35)] backdrop-blur">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">{t.active}</p>
          <p className="mt-3 text-3xl font-semibold text-emerald-700">{summary.approved}</p>
        </div>
        <div className="rounded-[28px] border border-orange-100/70 bg-white/90 p-5 shadow-[0_24px_60px_-40px_rgba(15,23,42,0.35)] backdrop-blur">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">{t.pendingReviewStatus}</p>
          <p className="mt-3 text-3xl font-semibold text-amber-700">{summary.pending}</p>
        </div>
        <div className="rounded-[28px] border border-orange-100/70 bg-white/90 p-5 shadow-[0_24px_60px_-40px_rgba(15,23,42,0.35)] backdrop-blur">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">{t.draft}</p>
          <p className="mt-3 text-3xl font-semibold text-slate-950">{summary.draft}</p>
        </div>
      </section>

      <section className="mt-8 rounded-[32px] border border-orange-100/80 bg-white/90 p-6 shadow-[0_28px_70px_-45px_rgba(15,23,42,0.35)] backdrop-blur">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <span className="inline-flex rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-orange-700">
              {t.packageWorkflow}
            </span>
            <h2 className="mt-4 text-2xl font-semibold text-slate-950">{t.workflowTitle}</h2>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600">
              {t.workflowDescription}
            </p>
          </div>
          <div className="rounded-[28px] border border-orange-100 bg-[linear-gradient(180deg,#fffaf5_0%,#fff4ea_100%)] p-5 xl:w-[320px]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">{t.quickSummary}</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              <div>
                <p className="text-xs text-slate-500">{t.draft}</p>
                <p className="mt-1 text-2xl font-semibold text-slate-950">{summary.draft}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">{t.rejected}</p>
                <p className="mt-1 text-2xl font-semibold text-slate-950">{summary.rejected}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          {packageMenus.map((menu) => {
            if (menu.key === "add" && menu.href) {
              return (
                <Link
                  key={menu.key}
                  href={menu.href}
                  className="rounded-full bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-600"
                >
                  {menu.label}
                </Link>
              )
            }

            const active = activeStatus === menu.key
            return (
              <Link
                key={menu.key}
                href={`/merchant/paket?status=${menu.key}`}
                className={`rounded-full px-4 py-2.5 text-sm font-medium transition ${
                  active
                    ? "bg-slate-950 text-white shadow-lg"
                    : "border border-slate-200 bg-white text-slate-700 hover:border-orange-300 hover:bg-orange-50 hover:text-orange-700"
                }`}
              >
                {menu.label}
              </Link>
            )
          })}
        </div>

        {error ? (
          <div className="mt-6 rounded-[24px] border border-red-200 bg-red-50 p-4 text-red-700">{t.loadError}</div>
        ) : packages.length === 0 ? (
          <div className="mt-6 rounded-[24px] border border-slate-200 bg-[linear-gradient(180deg,#fffaf5_0%,#f8fafc_100%)] p-5 text-slate-600">
            {t.emptyState}
          </div>
        ) : (
          <div className="mt-6 grid gap-5 xl:grid-cols-2">
            {packages.map((pkg) => (
              <article
                key={pkg.id}
                className="rounded-[28px] border border-orange-100/80 bg-white p-6 shadow-[0_24px_60px_-42px_rgba(15,23,42,0.35)]"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-950">{pkg.title || t.untitledPackage}</h2>
                    <p className="mt-1 text-sm text-slate-500">{formatTravelStyleLabel(pkg.travel_style, locale)}</p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClasses(pkg.status)}`}>
                    {formatStatus(pkg.status, t.pendingReviewStatus, t.rejected, t.active, t.draft, t.inactivePackages)}
                  </span>
                </div>

                {pkg.status === "rejected" && (
                  <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-rose-600">{t.adminReason}</p>
                    <p className="mt-2 text-sm leading-6 text-rose-800">
                      {pkg.rejection_reason || t.rejectedWithoutNote}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-rose-800">
                      {t.rejectedHelp}
                    </p>
                  </div>
                )}

                {pkg.status === "pending" && (
                  <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">{t.reviewStatus}</p>
                    <p className="mt-2 text-sm font-medium text-amber-900">{t.underReview}</p>
                    <p className="mt-2 text-sm text-amber-800">{t.submitDate}: {formatDate(pkg.updated_at || pkg.created_at)}</p>
                    <p className="mt-2 text-sm leading-6 text-amber-800">
                      {t.pendingHelp}
                    </p>
                  </div>
                )}

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
                  <div className="rounded-[22px] bg-[linear-gradient(180deg,#fffaf5_0%,#ffffff_100%)] p-4">
                    <p className="text-xs uppercase tracking-wide text-slate-400">{t.adultPrice}</p>
                    <p className="mt-1 text-xl font-bold text-slate-900">{formatMoney(pkg.price_adult)}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(pkg.status === "pending" || pkg.status === "rejected") && (
                      <form action={pullPackageToDraft}>
                        <input type="hidden" name="package_id" value={pkg.id} />
                        <input type="hidden" name="return_status" value={activeStatus} />
                        <button
                          type="submit"
                          className="rounded-xl border border-amber-200 px-4 py-2 text-sm font-medium text-amber-700 transition hover:bg-amber-50"
                        >
                          {t.pullToDraft}
                        </button>
                      </form>
                    )}
                    {pkg.status === "inactive" && (
                      <form action={togglePackageStatus}>
                        <input type="hidden" name="package_id" value={pkg.id} />
                        <input type="hidden" name="target_status" value="approved" />
                        <input type="hidden" name="return_status" value={activeStatus} />
                        <button
                          type="submit"
                          className="rounded-xl border border-emerald-200 px-4 py-2 text-sm font-medium text-emerald-700 transition hover:bg-emerald-50"
                        >
                          {t.activatePackage}
                        </button>
                      </form>
                    )}
                    {pkg.status === "approved" && (
                      <form action={togglePackageStatus}>
                        <input type="hidden" name="package_id" value={pkg.id} />
                        <input type="hidden" name="target_status" value="inactive" />
                        <input type="hidden" name="return_status" value={activeStatus} />
                        <button
                          type="submit"
                          className="rounded-xl border border-amber-200 px-4 py-2 text-sm font-medium text-amber-700 transition hover:bg-amber-50"
                        >
                          {t.deactivatePackage}
                        </button>
                      </form>
                    )}
                    {pkg.status !== "pending" && pkg.status !== "rejected" && (
                      <Link
                        href={`/merchant/paket/${encodeURIComponent(pkg.package_code || pkg.id)}/edit`}
                        className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-orange-300 hover:text-orange-600"
                      >
                        {t.editPackage}
                      </Link>
                    )}
                    <form action={deletePackage}>
                      <input type="hidden" name="package_id" value={pkg.id} />
                      <input type="hidden" name="return_status" value={activeStatus} />
                      <button
                        type="submit"
                        className="rounded-xl border border-rose-200 px-4 py-2 text-sm font-medium text-rose-700 transition hover:bg-rose-50"
                      >
                        {t.deletePackage}
                      </button>
                    </form>
                    {pkg.id ? (
                      <Link
                        href={`/merchant/paket/${encodeURIComponent(pkg.package_code || pkg.id)}?portal=merchant`}
                        className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-orange-300 hover:text-orange-600"
                      >
                        {t.viewPackage}
                      </Link>
                    ) : null}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
