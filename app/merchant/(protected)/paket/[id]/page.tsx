import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import Gallery from "@/app/packages/[slug]/Gallery"
import PackageTabs from "@/app/packages/[slug]/PackageTabs"
import MerchantSidebarInfo from "./MerchantSidebarInfo"
import { createAdminClient } from "@/lib/supabase/admin"
import { getFacilityLabel } from "@/lib/facility-labels"
import { normalizeLocale, type Locale } from "@/lib/i18n"
import { getCurrentLocale } from "@/lib/locale"
import { getLiveLocalizedPackagePricing } from "@/lib/currency-rates"
import { formatPackageMoney, resolvePackageTranslation } from "@/lib/package-pricing"
import { parseHighlights } from "@/lib/packages/highlights"
import { formatPackageCode } from "@/lib/merchant-code"
import { formatTravelStyleLabel, getScheduleQuotaLabel, isQuotaTravelStyle } from "@/lib/travelStyles"
import { createClient } from "@/lib/supabase/server"

type MerchantPackageDetailPageProps = {
  params: Promise<{ id: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

type PackageRow = {
  id: string
  package_code: string | null
  slug: string | null
  title: string | null
  status: string | null
  travel_style: string | null
  departure_date: string | null
  duration: number | null
  minimal_peserta: number | null
  price_adult: number | null
  price_child: number | null
  currency: string | null
  default_language: string | null
  published_languages: string[] | null
  cover_image: string | null
  origin_country_id: string | null
  origin_province: string | null
  destination_country_id: string | null
  destination_province: string | null
  created_at: string | null
  updated_at: string | null
}

type PackageTranslationRow = {
  language_code: string | null
  title: string | null
  description: string | null
  about_tour: string | null
  service_standard: string | null
  include: string | null
  exclude: string | null
  preparation: string | null
  terms_conditions: string | null
  meeting_point: string | null
  highlights: string | null
  currency: string | null
  price_adult: number | null
  price_child: number | null
}

type PackageDetailRow = {
  meeting_point: string | null
  map_embed: string | null
  location_label: string | null
  location_type: string | null
  primary_lat: number | null
  primary_lng: number | null
  viewport_radius_km: number | null
}

type PackageImageRow = {
  id: string
  image_url: string
}

type FacilityRelation = {
  name: string
}

type PackageFacilityRow = {
  facility_id: string
  facilities: FacilityRelation | FacilityRelation[] | null
}

type TagRow = {
  id: string
  tag: string
}

type ItineraryRouteRow = {
  id: string
  pickup_time: string | null
  route: string | null
  description: string | null
}

type ItineraryDayRow = {
  id: string
  day_number: number
  day_title: string | null
  package_itinerary_routes: ItineraryRouteRow[]
}

type CountryRow = {
  id: string
  name: string
}

type PackageRevisionHistoryRow = {
  id: string
  status: string | null
  summary: string | null
  changed_fields: string[] | null
  submitted_at: string | null
  reviewed_at: string | null
  approved_at: string | null
  rejection_reason: string | null
  created_at: string | null
  updated_at: string | null
}

function toSupportedLocale(input: string | null | undefined): Locale | null {
  if (input === "id" || input === "en" || input === "zh") return input
  return null
}

function getFacilityName(relation: PackageFacilityRow["facilities"]): string {
  if (Array.isArray(relation)) return relation[0]?.name || "-"
  return relation?.name || "-"
}

function formatDate(value: string | null, locale: Locale) {
  if (!value) return "-"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  const lang = locale === "zh" ? "zh-CN" : locale === "en" ? "en-US" : "id-ID"
  return date.toLocaleDateString(lang, { day: "2-digit", month: "long", year: "numeric" })
}

function formatRevisionStatus(value: string | null, locale: Locale) {
  const status = (value || "").toLowerCase()
  if (locale === "en") {
    if (status === "draft") return "Revision Draft"
    if (status === "pending") return "Pending Review"
    if (status === "approved") return "Approved"
    if (status === "rejected") return "Rejected"
    if (status === "superseded") return "Superseded"
    if (status === "cancelled") return "Cancelled"
    return value || "-"
  }
  if (locale === "zh") {
    if (status === "draft") return "修订草稿"
    if (status === "pending") return "待审核"
    if (status === "approved") return "已通过"
    if (status === "rejected") return "已拒绝"
    if (status === "superseded") return "已替换"
    if (status === "cancelled") return "已取消"
    return value || "-"
  }
  if (status === "draft") return "Draft Revisi"
  if (status === "pending") return "Pending Review"
  if (status === "approved") return "Disetujui"
  if (status === "rejected") return "Ditolak"
  if (status === "superseded") return "Digantikan"
  if (status === "cancelled") return "Dibatalkan"
  return value || "-"
}

function revisionStatusClasses(value: string | null) {
  const status = (value || "").toLowerCase()
  if (status === "pending") return "border-amber-200 bg-amber-50 text-amber-700"
  if (status === "approved") return "border-emerald-200 bg-emerald-50 text-emerald-700"
  if (status === "rejected") return "border-rose-200 bg-rose-50 text-rose-700"
  if (status === "draft") return "border-slate-200 bg-slate-50 text-slate-700"
  return "border-slate-200 bg-slate-50 text-slate-700"
}

function getCopy(locale: Locale) {
  if (locale === "en") {
    return {
      title: "Merchant Package Detail",
      packageId: "Package ID",
      packageStatus: "Package status",
      duration: "Duration",
      participant: "Minimum participant",
      createdAt: "Created",
      updatedAt: "Last updated",
      route: "Route",
      day: "day",
      people: "people",
      backToList: "Back to package list",
      editPackage: "Edit package",
      packageNotFound: "Package not found or no longer belongs to this merchant.",
      gallery: "Gallery",
      quickActions: "Quick actions",
      revisionHistory: "Revision history",
      revisionEmpty: "There is no revision history for this package yet.",
      revisionStatus: "Revision status",
      revisionSummary: "Revision summary",
      revisionSubmittedAt: "Submitted",
      revisionReviewedAt: "Reviewed",
      revisionChangedFields: "Changed fields",
      revisionAdminNote: "Admin note",
      revisionLiveNote: "Live package status",
      continueRevision: "Continue revision",
      pendingRevisionHint: "This revision is being reviewed by admin. The live package remains unchanged until approval.",
      approvedRevisionHint: "This revision has been approved and applied to the live package.",
      rejectedRevisionHint: "This revision was rejected. Review the admin note, then continue the revision if you want to resubmit.",
    }
  }
  if (locale === "zh") {
    return {
      title: "Merchant Package Detail",
      packageId: "Package ID",
      packageStatus: "Package status",
      duration: "Duration",
      participant: "Minimum participant",
      createdAt: "Created",
      updatedAt: "Last updated",
      route: "Route",
      day: "day",
      people: "people",
      backToList: "Back to package list",
      editPackage: "Edit package",
      packageNotFound: "Package not found or no longer belongs to this merchant.",
      gallery: "Gallery",
      quickActions: "Quick actions",
      revisionHistory: "修订历史",
      revisionEmpty: "该套餐还没有修订记录。",
      revisionStatus: "修订状态",
      revisionSummary: "修订摘要",
      revisionSubmittedAt: "提交时间",
      revisionReviewedAt: "审核时间",
      revisionChangedFields: "变更字段",
      revisionAdminNote: "管理员备注",
      revisionLiveNote: "在线套餐状态",
      continueRevision: "继续修订",
      pendingRevisionHint: "该修订正在由管理员审核。在通过之前，在线套餐不会被更新。",
      approvedRevisionHint: "该修订已通过，并已应用到在线套餐。",
      rejectedRevisionHint: "该修订已被拒绝。请先查看管理员备注，再继续修订后重新提交。",
    }
  }
  return {
    title: "Detail Paket Merchant",
    packageId: "ID Paket",
    packageStatus: "Status paket",
    duration: "Durasi",
    participant: "Minimal peserta",
    createdAt: "Dibuat",
    updatedAt: "Update terakhir",
    route: "Rute",
    day: "hari",
    people: "orang",
    backToList: "Kembali ke daftar paket",
    editPackage: "Edit paket",
    packageNotFound: "Paket tidak ditemukan atau bukan milik merchant ini.",
    gallery: "Galeri",
    quickActions: "Aksi cepat",
    revisionHistory: "Histori revisi",
    revisionEmpty: "Belum ada histori revisi untuk paket ini.",
    revisionStatus: "Status revisi",
    revisionSummary: "Ringkasan revisi",
    revisionSubmittedAt: "Tanggal submit",
    revisionReviewedAt: "Tanggal review",
    revisionChangedFields: "Field yang berubah",
    revisionAdminNote: "Catatan admin",
    revisionLiveNote: "Status paket live",
    continueRevision: "Lanjutkan revisi",
    pendingRevisionHint: "Revisi ini sedang direview admin. Paket live belum berubah sampai revisi disetujui.",
    approvedRevisionHint: "Revisi ini sudah disetujui dan diterapkan ke paket live.",
    rejectedRevisionHint: "Revisi ini ditolak. Baca catatan admin lalu lanjutkan revisi jika ingin mengirim ulang.",
  }
}

export const dynamic = "force-dynamic"

export default async function MerchantPackageDetailPage({ params, searchParams }: MerchantPackageDetailPageProps) {
  const [{ id }, sp] = await Promise.all([params, searchParams])
  const locale = normalizeLocale(await getCurrentLocale())
  const copy = getCopy(locale)
  const supabase = await createClient("merchant")
  const adminSupabase = createAdminClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) notFound()

  const { data: merchant } = await supabase.from("merchants").select("id").eq("user_id", user.id).maybeSingle()
  if (!merchant?.id) notFound()

  const packageSelect =
    "id, package_code, slug, title, status, travel_style, departure_date, duration, minimal_peserta, price_adult, price_child, currency, default_language, published_languages, cover_image, origin_country_id, origin_province, destination_country_id, destination_province, created_at, updated_at"

  const { data: pkgByCode } = await adminSupabase
    .from("packages")
    .select(packageSelect)
    .eq("package_code", id)
    .eq("merchant_id", merchant.id)
    .maybeSingle<PackageRow>()

  const { data: pkgById } = pkgByCode
    ? { data: null as PackageRow | null }
    : await adminSupabase
        .from("packages")
        .select(packageSelect)
        .eq("id", id)
        .eq("merchant_id", merchant.id)
        .maybeSingle<PackageRow>()

  const pkg = pkgByCode || pkgById

  if (!pkg) {
    return (
      <main className="mx-auto max-w-4xl p-6 md:p-10">
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{copy.packageNotFound}</div>
      </main>
    )
  }

  if (pkg.package_code && id !== pkg.package_code) {
    const qs = new URLSearchParams()
    Object.entries(sp).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        value.forEach((v) => {
          if (v) qs.append(key, v)
        })
      } else if (value) {
        qs.set(key, value)
      }
    })
    const query = qs.toString()
    redirect(`/merchant/paket/${encodeURIComponent(pkg.package_code)}${query ? `?${query}` : ""}`)
  }

  const defaultLocale = toSupportedLocale(pkg.default_language) || "id"
  const allowedLocalesRaw = (pkg.published_languages || [])
    .map((lang) => toSupportedLocale(lang))
    .filter((lang): lang is Locale => Boolean(lang))
  const allowedLocales = [...new Set([...allowedLocalesRaw, defaultLocale])]
  const activeLocale = allowedLocales.includes(locale) ? locale : allowedLocales[0] || defaultLocale
  const localeFallbacks = [...new Set([activeLocale, defaultLocale, "id"])]

  const [
    translationResult,
    localizedPricing,
    detailResult,
    galleryResult,
    facilitiesResult,
    tagsResult,
    itineraryDaysResult,
    countriesResult,
    revisionsResult,
  ] = await Promise.all([
    adminSupabase
      .from("package_translations")
      .select(
        "language_code, title, description, about_tour, service_standard, include, exclude, preparation, terms_conditions, meeting_point, highlights, currency, price_adult, price_child",
      )
      .eq("package_id", pkg.id)
      .in("language_code", localeFallbacks),
    getLiveLocalizedPackagePricing({
      locale: activeLocale,
      defaultLanguage: pkg.default_language,
      publishedLanguages: pkg.published_languages,
      baseCurrency: pkg.currency,
      baseAdultPrice: pkg.price_adult,
      baseChildPrice: pkg.price_child,
    }),
    adminSupabase
      .from("package_details")
      .select("meeting_point, map_embed, location_label, location_type, primary_lat, primary_lng, viewport_radius_km")
      .eq("package_id", pkg.id)
      .maybeSingle<PackageDetailRow>(),
    adminSupabase.from("package_images").select("id, image_url").eq("package_id", pkg.id),
    adminSupabase
      .from("package_facilities")
      .select(
        `
        facility_id,
        facilities ( name )
      `,
      )
      .eq("package_id", pkg.id),
    adminSupabase.from("package_tags").select("id, tag").eq("package_id", pkg.id),
    adminSupabase
      .from("package_itinerary_days")
      .select(
        `
        id,
        day_number,
        day_title,
        package_itinerary_routes (
          id,
          pickup_time,
          route,
          description
        )
      `,
      )
      .eq("package_id", pkg.id)
      .order("day_number", { ascending: true }),
    adminSupabase
      .from("countries")
      .select("id, name")
      .in("id", [pkg.origin_country_id, pkg.destination_country_id].filter(Boolean)),
    adminSupabase
      .from("package_revisions")
      .select("id, status, summary, changed_fields, submitted_at, reviewed_at, approved_at, rejection_reason, created_at, updated_at")
      .eq("package_id", pkg.id)
      .eq("merchant_id", merchant.id)
      .order("created_at", { ascending: false })
      .limit(6),
  ])

  const translations = (translationResult.data || []) as PackageTranslationRow[]
  const translation = resolvePackageTranslation(translations, activeLocale, pkg.default_language, pkg.published_languages)
  const detail = detailResult.data || null
  const galleryImages = (galleryResult.data as PackageImageRow[] | null) || []
  const facilities = (facilitiesResult.data as PackageFacilityRow[] | null) || []
  const tags = (tagsResult.data as TagRow[] | null) || []
  const itineraryDays = (itineraryDaysResult.data as ItineraryDayRow[] | null) || []
  const countries = (countriesResult.data as CountryRow[] | null) || []
  const revisions = (revisionsResult.data as PackageRevisionHistoryRow[] | null) || []
  const countryMap = new Map(countries.map((country) => [country.id, country.name]))
  const editableRevision = revisions.find((revision) => revision.status === "draft" || revision.status === "rejected") || null
  const editHref = editableRevision
    ? `/merchant/paket/${encodeURIComponent(pkg.package_code || pkg.id)}/edit?revision=${encodeURIComponent(editableRevision.id)}`
    : `/merchant/paket/${encodeURIComponent(pkg.package_code || pkg.id)}/edit`

  const displayTitle = translation?.title || pkg.title || "Detail Paket"
  const coverImage = pkg.cover_image || galleryImages[0]?.image_url || "/placeholder.png"
  const packageIdLabel = formatPackageCode(pkg.package_code, pkg.id)
  const routeText = `${countryMap.get(pkg.origin_country_id || "") || "-"} - ${pkg.origin_province || "-"} to ${
    countryMap.get(pkg.destination_country_id || "") || "-"
  } - ${pkg.destination_province || "-"}`
  const highlightTags =
    parseHighlights(translation?.highlights).length > 0
      ? parseHighlights(translation?.highlights)
      : tags.map((tag) => tag.tag).slice(0, 6)

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fff8f1_0%,#f7f1e8_38%,#f3eee7_100%)] p-6 md:p-10">
      <div className="mx-auto max-w-6xl">
        <section className="rounded-[28px] bg-[linear-gradient(135deg,#9a3412_0%,#ea580c_48%,#fb923c_100%)] p-6 text-white shadow-[0_22px_60px_-36px_rgba(154,52,18,0.9)] md:p-8">
          <h1 className="text-3xl font-semibold tracking-[-0.03em]">{copy.title}</h1>
          <p className="mt-4 text-lg font-semibold">{displayTitle}</p>
          <p className="mt-1 text-sm text-orange-50/95">{routeText}</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/merchant/paket" className="rounded-full border border-white/30 bg-white/10 px-4 py-2 text-sm font-semibold hover:bg-white/20">
              {copy.backToList}
            </Link>
            <Link
              href={editHref}
              className="rounded-full border border-white/30 bg-white/10 px-4 py-2 text-sm font-semibold hover:bg-white/20"
            >
              {editableRevision ? copy.continueRevision : copy.editPackage}
            </Link>
          </div>
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-4">
          <div className="rounded-2xl border border-orange-100 bg-white p-5 md:col-span-2">
            <p className="text-xs uppercase tracking-[0.22em] text-slate-500">{copy.packageId}</p>
            <p className="mt-2 text-sm font-semibold text-slate-900">{packageIdLabel}</p>
            <p className="mt-4 text-xs uppercase tracking-[0.22em] text-slate-500">{copy.packageStatus}</p>
            <p className="mt-2 text-sm font-semibold text-slate-900">{pkg.status || "-"}</p>
            <p className="mt-4 text-xs uppercase tracking-[0.22em] text-slate-500">{copy.duration}</p>
            <p className="mt-2 text-sm font-semibold text-slate-900">
              {(pkg.duration || 0).toString()} {copy.day}
            </p>
          </div>
          <div className="rounded-2xl border border-orange-100 bg-white p-5">
            <p className="text-xs uppercase tracking-[0.22em] text-slate-500">{copy.participant}</p>
            <p className="mt-2 text-sm font-semibold text-slate-900">
              {getScheduleQuotaLabel(pkg.travel_style, activeLocale)}: {(pkg.minimal_peserta || 0).toString()} {copy.people}
            </p>
            {isQuotaTravelStyle(pkg.travel_style) && pkg.departure_date ? (
              <p className="mt-2 text-sm text-slate-600">{pkg.departure_date}</p>
            ) : null}
          </div>
          <div className="rounded-2xl border border-orange-100 bg-white p-5">
            <p className="text-xs uppercase tracking-[0.22em] text-slate-500">{copy.createdAt}</p>
            <p className="mt-2 text-sm font-semibold text-slate-900">{formatDate(pkg.created_at, activeLocale)}</p>
            <p className="mt-3 text-xs uppercase tracking-[0.22em] text-slate-500">{copy.updatedAt}</p>
            <p className="mt-2 text-sm font-semibold text-slate-900">{formatDate(pkg.updated_at, activeLocale)}</p>
          </div>
        </section>

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,2fr)_320px]">
          <div className="space-y-6">
            <section className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{copy.gallery}</p>
              <Gallery
                locale={activeLocale}
                images={
                  galleryImages.length > 0
                    ? galleryImages
                    : [{ id: `cover-${pkg.id}`, image_url: coverImage }]
                }
              />
            </section>

            <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full border border-orange-200 bg-orange-50 px-3 py-1.5 text-xs font-semibold text-orange-700">
                  {formatTravelStyleLabel(pkg.travel_style, activeLocale)}
                </span>
                {highlightTags.map((tag) => (
                  <span key={tag} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700">
                    {tag}
                  </span>
                ))}
              </div>
            </section>

            <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{copy.revisionHistory}</p>
                {editableRevision ? (
                  <Link
                    href={editHref}
                    className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-orange-300 hover:text-orange-600"
                  >
                    {copy.continueRevision}
                  </Link>
                ) : null}
              </div>
              {revisions.length === 0 ? (
                <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                  {copy.revisionEmpty}
                </div>
              ) : (
                <div className="mt-4 space-y-4">
                  {revisions.map((revision) => {
                    const changedFields = (revision.changed_fields || []).filter(Boolean)
                    const hint =
                      revision.status === "pending"
                        ? copy.pendingRevisionHint
                        : revision.status === "approved"
                          ? copy.approvedRevisionHint
                          : revision.status === "rejected"
                            ? copy.rejectedRevisionHint
                            : null
                    const reviewDate = revision.reviewed_at || revision.approved_at
                    const continueHref = `/merchant/paket/${encodeURIComponent(pkg.package_code || pkg.id)}/edit?revision=${encodeURIComponent(revision.id)}`
                    return (
                      <article key={revision.id} className="rounded-[22px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-slate-900">
                              {copy.revisionStatus}: {formatRevisionStatus(revision.status, activeLocale)}
                            </p>
                            {revision.summary ? (
                              <p className="mt-2 text-sm text-slate-600">
                                {copy.revisionSummary}: {revision.summary}
                              </p>
                            ) : null}
                          </div>
                          <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${revisionStatusClasses(revision.status)}`}>
                            {formatRevisionStatus(revision.status, activeLocale)}
                          </span>
                        </div>
                        <div className="mt-4 grid gap-3 md:grid-cols-2">
                          <div className="rounded-2xl border border-slate-200 bg-white p-3">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">{copy.revisionSubmittedAt}</p>
                            <p className="mt-2 text-sm font-medium text-slate-900">{formatDate(revision.submitted_at || revision.created_at, activeLocale)}</p>
                          </div>
                          <div className="rounded-2xl border border-slate-200 bg-white p-3">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">{copy.revisionReviewedAt}</p>
                            <p className="mt-2 text-sm font-medium text-slate-900">{formatDate(reviewDate, activeLocale)}</p>
                          </div>
                        </div>
                        <div className="mt-4 grid gap-3 md:grid-cols-2">
                          <div className="rounded-2xl border border-slate-200 bg-white p-3">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">{copy.revisionLiveNote}</p>
                            <p className="mt-2 text-sm font-medium text-slate-900">{pkg.status || "-"}</p>
                          </div>
                          <div className="rounded-2xl border border-slate-200 bg-white p-3">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">{copy.revisionChangedFields}</p>
                            <div className="mt-2 flex flex-wrap gap-2">
                              {changedFields.length > 0 ? (
                                changedFields.slice(0, 6).map((field) => (
                                  <span key={field} className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-700">
                                    {field}
                                  </span>
                                ))
                              ) : (
                                <span className="text-sm text-slate-500">-</span>
                              )}
                            </div>
                          </div>
                        </div>
                        {hint ? (
                          <p className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm leading-6 text-slate-700">
                            {hint}
                          </p>
                        ) : null}
                        {revision.rejection_reason ? (
                          <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-3">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-rose-600">{copy.revisionAdminNote}</p>
                            <p className="mt-2 text-sm leading-6 text-rose-800">{revision.rejection_reason}</p>
                          </div>
                        ) : null}
                        {(revision.status === "draft" || revision.status === "rejected") ? (
                          <div className="mt-4">
                            <Link
                              href={continueHref}
                              className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-orange-300 hover:text-orange-600"
                            >
                              {copy.continueRevision}
                            </Link>
                          </div>
                        ) : null}
                      </article>
                    )
                  })}
                </div>
              )}
            </section>

            <PackageTabs
              locale={activeLocale}
              data={{
                aboutTour: translation?.about_tour || null,
                serviceStandard: translation?.service_standard || null,
                include: translation?.include || null,
                exclude: translation?.exclude || null,
                meetingPoint: translation?.meeting_point || detail?.meeting_point || null,
                mapEmbed: detail?.map_embed || null,
                facilities: facilities.map((facility) => ({
                  id: facility.facility_id,
                  name: getFacilityLabel(getFacilityName(facility.facilities), activeLocale),
                })),
                tags:
                  highlightTags.length > 0
                    ? highlightTags.map((tag, index) => ({ id: `hl-${index}`, tag }))
                    : tags.map((tag) => ({ id: tag.id, tag: tag.tag })),
                itineraryDays: itineraryDays.map((day) => ({
                  id: day.id,
                  day_number: day.day_number,
                  day_title: day.day_title,
                  routes: day.package_itinerary_routes,
                })),
              }}
            />
          </div>

          <aside className="space-y-4 lg:sticky lg:top-6 lg:h-fit">
            <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{copy.quickActions}</p>
              <p className="mt-3 text-3xl font-semibold text-slate-900">
                {formatPackageMoney(localizedPricing.priceAdult, localizedPricing.currency, activeLocale)}
              </p>
              <p className="mt-2 text-sm text-slate-600">
                Child: {formatPackageMoney(localizedPricing.priceChild, localizedPricing.currency, activeLocale)}
              </p>
              <div className="mt-4 space-y-2 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                <p>{copy.route}: {routeText}</p>
                <p>{copy.duration}: {(pkg.duration || 0).toString()} {copy.day}</p>
                <p>{copy.participant}: {(pkg.minimal_peserta || 0).toString()} {copy.people}</p>
              </div>
            </section>
            <MerchantSidebarInfo
              locale={activeLocale}
              preparation={translation?.preparation || null}
              termsConditions={translation?.terms_conditions || null}
            />
          </aside>
        </div>
      </div>
    </main>
  )
}
