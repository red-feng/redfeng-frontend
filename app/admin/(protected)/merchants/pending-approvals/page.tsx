import CrossTabRefreshSignal from "@/app/components/CrossTabRefreshSignal"
import {
  canDecideMerchantDeletionReview,
  canDecideMerchantRegistrationReview,
  canRequestMerchantRegistrationReview,
  MERCHANT_REVIEW_BUTTONS,
} from "@/lib/merchant-review-policy"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { toneClass } from "@/lib/status-tones"
import Link from "next/link"
import ConfirmSubmitButton from "../ConfirmSubmitButton"
import MerchantReviewRequestActionCard from "../MerchantReviewRequestActionCard"
import {
  approveMerchantReviewRequest,
  rejectMerchantReviewRequest,
} from "../actions"

type MerchantRow = {
  id: string
  brand_name: string | null
  company_name: string | null
  email: string | null
  business_type: string | null
  address: string | null
  city: string | null
  province: string | null
  pic_name: string | null
  pic_position: string | null
  ktp_number: string | null
  npwp_personal: string | null
  npwp_company: string | null
  nib: string | null
  bank_name: string | null
  bank_account_number: string | null
  bank_account_holder: string | null
  bank_branch: string | null
  ktp_file_url: string | null
  npwp_file_url: string | null
  nib_file_url: string | null
  logo_url: string | null
  onboarding_step: number | null
  onboarding_completed: boolean | null
  verification_status: string | null
  created_at: string | null
}

type MerchantReviewRequestRow = {
  id: string
  merchant_id: string
  request_type: string | null
  status: string | null
  admin_note: string | null
  requested_at: string | null
}

type MerchantDeletionRequestRow = {
  id: string
  merchant_id: string | null
  profile_id: string | null
  merchant_email: string | null
  merchant_name: string | null
  reason: string
  status: string | null
  requested_at: string | null
}

function fieldValue(value: string | null) {
  return value && value.trim() ? value : "-"
}

function fieldValueClassName() {
  return "mt-2 break-words text-sm font-medium text-slate-800"
}

function DocumentLink({ href, label }: { href: string | null; label: string }) {
  if (!href) {
    return (
      <div className="rounded-[18px] border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
        {label}: belum upload
      </div>
    )
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="rounded-[18px] border border-orange-200 bg-orange-50 px-4 py-3 text-sm font-medium text-orange-700 transition hover:border-orange-300 hover:bg-orange-100"
    >
      Lihat {label}
    </a>
  )
}

function getStatusBadge(status: string | null) {
  if (status === "approved") return toneClass("success", "bordered")
  if (status === "awaiting_manager_approval" || status === "awaiting_manager_rejection") return toneClass("progress", "bordered")
  if (status === "rejected") return toneClass("danger", "bordered")
  if (status === "inactive") return toneClass("pending", "bordered")
  if (status === "deleted") return toneClass("danger", "bordered")
  return toneClass("neutral", "bordered")
}

function getStatusLabel(status: string | null) {
  if (status === "approved") return "Aktif"
  if (status === "awaiting_manager_approval") return "Admin sudah ajukan, menunggu approval manager"
  if (status === "awaiting_manager_rejection") return "Admin sudah ajukan, menunggu keputusan reject manager"
  if (status === "rejected") return "Ditolak manager, menunggu revisi merchant"
  if (status === "inactive") return "Nonaktif sementara"
  if (status === "deleted") return "Dihapus"
  return status || "Tidak diketahui"
}

function normalizeText(value: string | null) {
  return (value || "").trim().toLowerCase()
}

function sanitizePostgrestSearchTerm(value: string) {
  return value.replace(/[,%]/g, " ").trim()
}

function isMissingMerchantReviewRequestsTableError(error: { message?: string | null; code?: string | null } | null | undefined) {
  const message = String(error?.message || "").toLowerCase()
  return message.includes("merchant_review_requests") && message.includes("schema cache")
}

export default async function AdminMerchantPendingApprovalsPage({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string; city?: string; queue?: string; sort?: string; success?: string; error?: string }>
}) {
  const resolvedSearchParams = (await searchParams) || {}
  const searchQuery = (resolvedSearchParams.q || "").trim().toLowerCase()
  const cityFilter = (resolvedSearchParams.city || "").trim().toLowerCase()
  const queueFilter = (resolvedSearchParams.queue || "all").trim().toLowerCase()
  const sortMode = (resolvedSearchParams.sort || "pending_desc").trim().toLowerCase()
  const supabase = await createClient("admin")
  const adminSupabase = createAdminClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const { data: currentProfile } = user
    ? await supabase.from("profiles").select("role").eq("id", user.id).single()
    : { data: null }
  const currentRole = String(currentProfile?.role || "").trim().toLowerCase()
  const canRequestMerchantReview = canRequestMerchantRegistrationReview(currentRole)
  const canReviewMerchantRequests = canDecideMerchantRegistrationReview(currentRole)
  const canReviewMerchantDeletion = canDecideMerchantDeletionReview(currentRole)

  let pendingQuery = adminSupabase
    .from("merchants")
    .select("*")
    .in("verification_status", ["pending", "pending_admin_review", "awaiting_manager_approval", "awaiting_manager_rejection"])

  const safeSearchQuery = sanitizePostgrestSearchTerm(searchQuery)
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(safeSearchQuery)) {
    pendingQuery = pendingQuery.eq("id", safeSearchQuery)
  } else if (safeSearchQuery) {
    pendingQuery = pendingQuery.or(
      `brand_name.ilike.%${safeSearchQuery}%,company_name.ilike.%${safeSearchQuery}%,email.ilike.%${safeSearchQuery}%`,
    )
  }

  const safeCityFilter = sanitizePostgrestSearchTerm(cityFilter)
  if (safeCityFilter) {
    pendingQuery = pendingQuery.or(`city.ilike.${safeCityFilter},province.ilike.${safeCityFilter}`)
  }

  const [{ data: pendingMerchants }, { data: pendingDeletionRequestsData }, { data: merchantReviewRequestsData, error: merchantReviewRequestsError }] =
    await Promise.all([
      pendingQuery.order("created_at", { ascending: false }),
      adminSupabase
        .from("merchant_deletion_requests")
        .select("id, merchant_id, profile_id, merchant_email, merchant_name, reason, status, requested_at")
        .eq("status", "pending"),
      adminSupabase
        .from("merchant_review_requests")
        .select("id, merchant_id, request_type, status, admin_note, requested_at")
        .eq("status", "pending")
        .order("requested_at", { ascending: true }),
    ])

  const pending = (pendingMerchants || []) as MerchantRow[]
  const pendingDeletionQueue = ((pendingDeletionRequestsData as MerchantDeletionRequestRow[] | null) || []) as MerchantDeletionRequestRow[]
  const merchantReviewRequestsUnavailable = isMissingMerchantReviewRequestsTableError(merchantReviewRequestsError)
  if (merchantReviewRequestsError && !merchantReviewRequestsUnavailable) {
    console.error("Load merchant review requests error:", merchantReviewRequestsError)
  }
  const pendingMerchantReviewRequests = merchantReviewRequestsUnavailable
    ? ([] as MerchantReviewRequestRow[])
    : (((merchantReviewRequestsData as MerchantReviewRequestRow[] | null) || []) as MerchantReviewRequestRow[])
  const pendingMerchantReviewMap = new Map<string, MerchantReviewRequestRow>()
  for (const request of pendingMerchantReviewRequests) {
    if (request.merchant_id) pendingMerchantReviewMap.set(request.merchant_id, request)
  }

  const reviewMerchantIds = [...new Set(pendingMerchantReviewRequests.map((request) => request.merchant_id).filter(Boolean))]
  const alreadyLoadedMerchantIds = new Set(pending.map((merchant) => merchant.id))
  const missingReviewMerchantIds = reviewMerchantIds.filter((merchantId) => !alreadyLoadedMerchantIds.has(merchantId))
  const { data: reviewMerchantsData } = missingReviewMerchantIds.length
    ? await adminSupabase.from("merchants").select("*").in("id", missingReviewMerchantIds)
    : { data: [] as MerchantRow[] }
  const reviewMerchants = ((reviewMerchantsData as MerchantRow[] | null) || []) as MerchantRow[]
  const merchantById = new Map([...pending, ...reviewMerchants].map((merchant) => [merchant.id, merchant]))

  const allMerchantIds = [...new Set([...pending, ...reviewMerchants].map((merchant) => merchant.id))]
  const { data: packagesData } = allMerchantIds.length
    ? await adminSupabase.from("packages").select("merchant_id, status").in("merchant_id", allMerchantIds)
    : { data: [] as Array<{ merchant_id: string | null; status: string | null }> }
  const packageStatsMap = new Map<
    string,
    { total: number; pending: number; approved: number; rejected: number; draft: number; inactive: number }
  >()

  for (const item of (packagesData as Array<{ merchant_id: string | null; status: string | null }> | null) || []) {
    if (!item.merchant_id) continue
    const current = packageStatsMap.get(item.merchant_id) || {
      total: 0,
      pending: 0,
      approved: 0,
      rejected: 0,
      draft: 0,
      inactive: 0,
    }
    current.total += 1
    if (item.status === "pending") current.pending += 1
    if (item.status === "approved") current.approved += 1
    if (item.status === "rejected") current.rejected += 1
    if (item.status === "draft") current.draft += 1
    if (item.status === "inactive") current.inactive += 1
    packageStatsMap.set(item.merchant_id, current)
  }

  const allCities = [...new Set(pending.map((merchant) => merchant.city).filter(Boolean))]
    .map((item) => String(item))
    .sort((a, b) => a.localeCompare(b))

  function matchesMerchant(merchant: MerchantRow) {
    const stats = packageStatsMap.get(merchant.id) || { total: 0, pending: 0 }
    const matchesSearch =
      !searchQuery ||
      [normalizeText(merchant.brand_name), normalizeText(merchant.company_name), normalizeText(merchant.email), merchant.id.toLowerCase()].some((value) =>
        value.includes(searchQuery),
      )
    const matchesCity =
      !cityFilter ||
      normalizeText(merchant.city) === cityFilter ||
      normalizeText(merchant.province) === cityFilter
    const matchesQueue =
      queueFilter === "all" ||
      (queueFilter === "with_pending" && stats.pending > 0) ||
      (queueFilter === "without_pending" && stats.pending === 0)

    return matchesSearch && matchesCity && matchesQueue
  }

  function sortMerchants(a: MerchantRow, b: MerchantRow) {
    const statsA = packageStatsMap.get(a.id) || { total: 0, pending: 0 }
    const statsB = packageStatsMap.get(b.id) || { total: 0, pending: 0 }
    if (sortMode === "total_desc") {
      if (statsB.total !== statsA.total) return statsB.total - statsA.total
    } else if (sortMode === "newest") {
      const timeB = b.created_at ? new Date(b.created_at).getTime() : 0
      const timeA = a.created_at ? new Date(a.created_at).getTime() : 0
      if (timeB !== timeA) return timeB - timeA
    } else {
      if (statsB.pending !== statsA.pending) return statsB.pending - statsA.pending
      if (statsB.total !== statsA.total) return statsB.total - statsA.total
    }

    return (a.brand_name || a.company_name || "").localeCompare(b.brand_name || b.company_name || "")
  }

  const filteredPending = pending.filter(matchesMerchant).sort(sortMerchants)

  return (
    <main className="min-h-screen bg-[#fbfaf8] px-4 py-6 sm:px-6 lg:px-9">
      <div className="mx-auto max-w-[1680px] space-y-6">
        <section>
          <span className="inline-flex rounded-full border border-[#efd8c8] bg-[#fff7f1] px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.28em] text-orange-600">
            Pending approvals
          </span>
          <h1 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-slate-950 sm:text-4xl">Pending approvals</h1>
          <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-500">
            Review merchant baru, keputusan final operations manager, dan pengajuan hapus merchant dari satu antrian.
          </p>
        </section>

        <section className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-[18px] border border-[#eee3d9] bg-white p-5 shadow-[0_14px_34px_rgba(15,23,42,0.04)]">
            <p className="text-sm font-medium text-slate-500">Merchant Baru</p>
            <p className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-orange-600">{filteredPending.length}</p>
          </div>
          <div className="rounded-[18px] border border-[#eee3d9] bg-white p-5 shadow-[0_14px_34px_rgba(15,23,42,0.04)]">
            <p className="text-sm font-medium text-slate-500">Manager Decision</p>
            <p className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-emerald-600">{pendingMerchantReviewRequests.length}</p>
          </div>
          <div className="rounded-[18px] border border-[#eee3d9] bg-white p-5 shadow-[0_14px_34px_rgba(15,23,42,0.04)]">
            <p className="text-sm font-medium text-slate-500">Deletion Request</p>
            <p className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-amber-600">{pendingDeletionQueue.length}</p>
          </div>
        </section>

        <section className="rounded-[20px] border border-[#eee3d9] bg-white p-4 shadow-[0_14px_34px_rgba(15,23,42,0.04)]">
          <form className="grid gap-4 xl:grid-cols-[minmax(260px,1.4fr)_220px_220px_220px_auto]">
            <div className="relative">
              <label className="sr-only">Cari merchant</label>
              <input
                type="text"
                name="q"
                defaultValue={resolvedSearchParams.q || ""}
                placeholder="Cari merchant, company, email, atau ID..."
                className="w-full rounded-[14px] border border-[#eadfd5] bg-white px-4 py-3 pr-10 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-orange-300 focus:ring-4 focus:ring-orange-100"
              />
              <span className="pointer-events-none absolute right-4 top-3.5 text-slate-400">/</span>
            </div>
            <select
              name="city"
              defaultValue={resolvedSearchParams.city || ""}
              className="w-full rounded-[14px] border border-[#eadfd5] bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-orange-300 focus:ring-4 focus:ring-orange-100"
            >
              <option value="">Semua kota</option>
              {allCities.map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </select>
            <select
              name="queue"
              defaultValue={queueFilter}
              className="w-full rounded-[14px] border border-[#eadfd5] bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-orange-300 focus:ring-4 focus:ring-orange-100"
            >
              <option value="all">Akses Paket: Semua</option>
              <option value="with_pending">Punya paket pending</option>
              <option value="without_pending">Tanpa paket pending</option>
            </select>
            <select
              name="sort"
              defaultValue={sortMode}
              className="w-full rounded-[14px] border border-[#eadfd5] bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-orange-300 focus:ring-4 focus:ring-orange-100"
            >
              <option value="pending_desc">Pending terbanyak</option>
              <option value="total_desc">Total paket terbanyak</option>
              <option value="newest">Merchant terbaru</option>
            </select>
            <div className="flex flex-wrap items-center gap-3">
              <button className="inline-flex items-center justify-center rounded-[14px] bg-orange-500 px-5 py-3 text-sm font-semibold text-white shadow-[0_12px_28px_rgba(249,115,22,0.18)] transition hover:bg-orange-600">
                Terapkan
              </button>
              <Link
                href="/admin/merchants/pending-approvals"
                className="inline-flex items-center justify-center rounded-[14px] border border-[#eadfd5] bg-white px-5 py-3 text-sm font-semibold text-slate-600 transition hover:border-orange-200 hover:text-orange-600"
              >
                Reset Filter
              </Link>
            </div>
          </form>
        </section>

        {resolvedSearchParams.success || resolvedSearchParams.error ? (
          <CrossTabRefreshSignal
            storageKey="redfeng-admin-merchants-refresh"
            value={resolvedSearchParams.success || resolvedSearchParams.error || "merchant-refresh"}
          />
        ) : null}
        {resolvedSearchParams.success ? (
          <div className="rounded-[20px] border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-700">
            {resolvedSearchParams.success}
          </div>
        ) : null}
        {resolvedSearchParams.error ? (
          <div className="rounded-[20px] border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
            {resolvedSearchParams.error}
          </div>
        ) : null}

        {canReviewMerchantRequests ? (
          <section className="rounded-[24px] border border-emerald-200 bg-[linear-gradient(135deg,#f4fff7_0%,#ebfff3_100%)] p-5 shadow-[0_18px_50px_rgba(5,150,105,0.08)] sm:rounded-[28px] sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="max-w-3xl">
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-700">Manager approval queue</p>
                <h2 className="mt-2 text-2xl font-semibold text-slate-950">Queue keputusan final operations manager</h2>
                <p className="mt-3 text-sm leading-7 text-slate-600">
                  Queue ini menampilkan merchant yang sudah diajukan admin dan sekarang menunggu keputusan final approve atau reject dari operations manager.
                </p>
              </div>
              <div className="rounded-[18px] border border-emerald-200 bg-white/80 px-4 py-3 text-sm font-semibold text-emerald-700">
                {pendingMerchantReviewRequests.length} merchant menunggu keputusan
              </div>
            </div>

            {!pendingMerchantReviewRequests.length ? (
              <div className="mt-5 rounded-[20px] border border-emerald-200 bg-white/80 px-5 py-4 text-sm leading-7 text-emerald-700">
                Tidak ada merchant yang menunggu keputusan final manager saat ini.
              </div>
            ) : (
              <div className="mt-5 grid gap-5">
                {pendingMerchantReviewRequests.map((request) => {
                  const merchant = merchantById.get(request.merchant_id)
                  if (!merchant) return null

                  return (
                    <article key={request.id} className="rounded-[24px] border border-emerald-200 bg-white p-5 shadow-[0_14px_36px_rgba(15,23,42,0.06)]">
                      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
                        <div className="space-y-4">
                          <div className="flex flex-wrap items-center gap-3">
                            <h3 className="text-xl font-semibold text-slate-950">{merchant.brand_name || merchant.company_name || merchant.email || merchant.id}</h3>
                            <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">
                              {request.request_type === "reject" ? "Admin merekomendasikan reject" : "Admin merekomendasikan approve"}
                            </span>
                          </div>
                          <div className="grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-4">
                            {[
                              { label: "Email", value: fieldValue(merchant.email) },
                              { label: "Company", value: fieldValue(merchant.company_name) },
                              { label: "NIB", value: fieldValue(merchant.nib) },
                              { label: "Status", value: getStatusLabel(merchant.verification_status) },
                            ].map((item) => (
                              <div key={item.label} className="min-w-0 rounded-[18px] border border-[#f0e6da] bg-[#fffaf4] px-4 py-3">
                                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">{item.label}</p>
                                <p className={fieldValueClassName()}>{item.value}</p>
                              </div>
                            ))}
                          </div>
                          <div className="rounded-[18px] border border-slate-200 bg-slate-50 p-4 text-sm leading-7 text-slate-700">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">Catatan admin</p>
                            <p className="mt-3 break-words">{request.admin_note || "Admin tidak menambahkan catatan tambahan."}</p>
                          </div>
                          <div className="flex flex-wrap gap-3">
                            <Link href={`/admin/merchants/${merchant.id}/profile`} className="inline-flex items-center justify-center rounded-[16px] border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-orange-200 hover:text-orange-700">
                              Profil
                            </Link>
                            <Link href={`/admin/merchants/${merchant.id}`} className="inline-flex items-center justify-center rounded-[16px] border border-orange-200 bg-orange-50 px-4 py-3 text-sm font-semibold text-orange-700 transition hover:border-orange-300 hover:bg-orange-100">
                              Paket
                            </Link>
                          </div>
                        </div>
                        <div className="space-y-4 rounded-[22px] border border-[#f2dcc1] bg-[#fffdfa] p-5">
                          <form action={approveMerchantReviewRequest} className="space-y-3">
                            <input type="hidden" name="requestId" value={request.id} />
                            <ConfirmSubmitButton confirmMessage="Setujui merchant ini sebagai keputusan final operations manager?" pendingLabel="Sedang menyetujui merchant..." className="inline-flex w-full items-center justify-center gap-2 rounded-[18px] bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700">
                              {MERCHANT_REVIEW_BUTTONS.approve}
                            </ConfirmSubmitButton>
                          </form>
                          <form action={rejectMerchantReviewRequest} className="space-y-3">
                            <input type="hidden" name="requestId" value={request.id} />
                            <textarea name="reviewNote" placeholder="Alasan penolakan final dari operations manager. Alasan ini akan dikirim ke merchant dan admin..." required className="min-h-[120px] w-full rounded-[18px] border border-rose-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-rose-400 focus:ring-4 focus:ring-rose-100" />
                            <ConfirmSubmitButton confirmMessage="Tolak merchant ini sebagai keputusan final operations manager?" pendingLabel="Sedang menolak merchant..." className="inline-flex w-full items-center justify-center gap-2 rounded-[18px] border border-rose-300 bg-white px-5 py-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-50">
                              {MERCHANT_REVIEW_BUTTONS.reject}
                            </ConfirmSubmitButton>
                          </form>
                        </div>
                      </div>
                    </article>
                  )
                })}
              </div>
            )}
          </section>
        ) : null}

        {canReviewMerchantDeletion ? (
          <section className="rounded-[24px] border border-amber-200 bg-[linear-gradient(135deg,#fff9eb_0%,#fff4d6_100%)] p-5 shadow-[0_18px_50px_rgba(146,64,14,0.08)] sm:rounded-[28px] sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="max-w-3xl">
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-amber-700">Deletion review queue</p>
                <h2 className="mt-2 text-2xl font-semibold text-slate-950">Pengajuan hapus merchant dari admin</h2>
                <p className="mt-3 text-sm leading-7 text-slate-600">
                  Review data merchant, alasan admin, dan dampak penghapusan sebelum menyetujui atau membatalkan request.
                </p>
              </div>
              <div className="rounded-[20px] border border-amber-200 bg-white/80 px-5 py-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-amber-700">Pending request</p>
                <p className="mt-2 text-3xl font-semibold text-slate-950">{pendingDeletionQueue.length}</p>
              </div>
            </div>
            {pendingDeletionQueue.length > 0 ? (
              <div className="mt-5 grid gap-3 lg:grid-cols-2">
                {pendingDeletionQueue.slice(0, 4).map((request) => (
                  <div key={request.id} className="rounded-[18px] border border-amber-200 bg-white/85 px-4 py-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          {request.merchant_name || request.merchant_email || request.merchant_id || request.profile_id || request.id}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {request.requested_at ? new Date(request.requested_at).toLocaleString("id-ID") : "Waktu request tidak tersedia"}
                        </p>
                      </div>
                      <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-700">
                        Menunggu review
                      </span>
                    </div>
                    <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-600">{request.reason}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-5 rounded-[18px] border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm leading-7 text-emerald-700">
                Belum ada pengajuan hapus merchant yang menunggu review dari admin.
              </div>
            )}
          </section>
        ) : null}

        <section className="space-y-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-orange-600">Pending approvals</p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-950">Antrian merchant baru</h2>
            </div>
            <p className="text-sm text-slate-500">{filteredPending.length} merchant cocok dengan filter saat ini.</p>
          </div>

          {!filteredPending.length ? (
            <section className="rounded-[24px] border border-slate-200 bg-white p-8 text-center shadow-[0_18px_60px_rgba(15,23,42,0.06)] sm:rounded-[30px] sm:p-10">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-orange-100 text-orange-700">
                <span className="text-2xl font-semibold">OK</span>
              </div>
              <h2 className="mt-5 text-2xl font-semibold text-slate-950">Tidak ada merchant pending yang cocok</h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                Coba ubah kata kunci, kota, atau filter queue untuk melihat merchant lain.
              </p>
            </section>
          ) : (
            <section className="grid gap-6">
              {filteredPending.map((merchant) => {
                const pendingMerchantReviewRequest = pendingMerchantReviewMap.get(merchant.id) || null
                return (
                  <article key={merchant.id} className="overflow-hidden rounded-[24px] border border-orange-100 bg-white shadow-[0_20px_70px_rgba(15,23,42,0.06)] sm:rounded-[30px]">
                    <div className="grid gap-0 lg:grid-cols-[1.1fr_0.9fr]">
                      <div className="border-b border-orange-100/80 p-5 sm:p-7 lg:border-b-0 lg:border-r">
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-100 text-orange-700">
                              <span className="text-xl font-semibold">M</span>
                            </div>
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">Merchant profile</p>
                              <h2 className="mt-1 text-2xl font-semibold text-slate-950">
                                {merchant.brand_name || merchant.company_name || "Merchant tanpa nama"}
                              </h2>
                            </div>
                          </div>
                          <span className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] ${getStatusBadge(merchant.verification_status)}`}>
                            {getStatusLabel(merchant.verification_status)}
                          </span>
                        </div>

                        <div className="mt-7 grid gap-4 sm:grid-cols-2">
                          <div className="rounded-[22px] border border-slate-200 bg-slate-50/80 p-4">
                            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Email</p>
                            <p className="mt-2 text-sm font-medium text-slate-800">{fieldValue(merchant.email)}</p>
                          </div>
                          <div className="rounded-[22px] border border-slate-200 bg-slate-50/80 p-4">
                            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Company</p>
                            <p className="mt-2 text-sm font-medium text-slate-800">{fieldValue(merchant.company_name)}</p>
                          </div>
                        </div>

                        <div className="mt-4 grid gap-4 sm:grid-cols-3">
                          <div className="rounded-[22px] border border-slate-200 bg-white p-4">
                            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Business Type</p>
                            <p className="mt-2 text-sm text-slate-800">{fieldValue(merchant.business_type)}</p>
                          </div>
                          <div className="rounded-[22px] border border-slate-200 bg-white p-4">
                            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Created</p>
                            <p className="mt-2 text-sm text-slate-800">{merchant.created_at ? new Date(merchant.created_at).toLocaleString("id-ID") : "-"}</p>
                          </div>
                          <div className="rounded-[22px] border border-slate-200 bg-white p-4">
                            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Onboarding</p>
                            <p className="mt-2 text-sm text-slate-800">
                              Step {merchant.onboarding_step ?? "-"} / completed: {merchant.onboarding_completed ? "yes" : "no"}
                            </p>
                          </div>
                        </div>

                        <div className="mt-4 grid gap-4 sm:grid-cols-2">
                          <div className="rounded-[22px] border border-slate-200 bg-white p-5">
                            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Business details</p>
                            <div className="mt-4 space-y-3 text-sm text-slate-700">
                              <p>Alamat: <span className="font-medium text-slate-900">{fieldValue(merchant.address)}</span></p>
                              <p>Kota: <span className="font-medium text-slate-900">{fieldValue(merchant.city)}</span></p>
                              <p>Provinsi: <span className="font-medium text-slate-900">{fieldValue(merchant.province)}</span></p>
                            </div>
                          </div>
                          <div className="rounded-[22px] border border-slate-200 bg-white p-5">
                            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">PIC & legal identity</p>
                            <div className="mt-4 space-y-3 text-sm text-slate-700">
                              <p>PIC: <span className="font-medium text-slate-900">{fieldValue(merchant.pic_name)}</span></p>
                              <p>Jabatan: <span className="font-medium text-slate-900">{fieldValue(merchant.pic_position)}</span></p>
                              <p>KTP: <span className="font-medium text-slate-900">{fieldValue(merchant.ktp_number)}</span></p>
                              <p>NPWP Personal: <span className="font-medium text-slate-900">{fieldValue(merchant.npwp_personal)}</span></p>
                              <p>NPWP Badan Usaha: <span className="font-medium text-slate-900">{fieldValue(merchant.npwp_company)}</span></p>
                              <p>NIB: <span className="font-medium text-slate-900">{fieldValue(merchant.nib)}</span></p>
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 grid gap-4 sm:grid-cols-2">
                          <div className="rounded-[22px] border border-slate-200 bg-white p-5">
                            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Banking details</p>
                            <div className="mt-4 space-y-3 text-sm text-slate-700">
                              <p>Bank: <span className="font-medium text-slate-900">{fieldValue(merchant.bank_name)}</span></p>
                              <p>Nomor rekening: <span className="font-medium text-slate-900">{fieldValue(merchant.bank_account_number)}</span></p>
                              <p>Atas nama: <span className="font-medium text-slate-900">{fieldValue(merchant.bank_account_holder)}</span></p>
                              <p>Cabang: <span className="font-medium text-slate-900">{fieldValue(merchant.bank_branch)}</span></p>
                            </div>
                          </div>
                          <div className="rounded-[22px] border border-slate-200 bg-white p-5">
                            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Uploaded documents</p>
                            <div className="mt-4 grid gap-3 sm:grid-cols-2">
                              <DocumentLink href={merchant.ktp_file_url} label="KTP" />
                              <DocumentLink href={merchant.npwp_file_url} label="NPWP Badan Usaha" />
                              <DocumentLink href={merchant.nib_file_url} label="NIB" />
                              <DocumentLink href={merchant.logo_url} label="Logo Brand" />
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 rounded-[22px] border border-slate-200 bg-white p-5">
                          <div className="flex flex-wrap items-center justify-between gap-4">
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Konteks paket merchant</p>
                              <p className="mt-2 text-sm text-slate-700">
                                Admin bisa langsung masuk ke workspace paket merchant ini agar review tidak bercampur dengan merchant lain.
                              </p>
                            </div>
                            <Link href={`/admin/merchants/${merchant.id}`} className="inline-flex items-center justify-center rounded-[18px] border border-orange-200 bg-orange-50 px-4 py-3 text-sm font-semibold text-orange-700 transition hover:border-orange-300 hover:bg-orange-100">
                              Lihat paket merchant
                            </Link>
                          </div>
                          <div className="mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
                            {(() => {
                              const stats = packageStatsMap.get(merchant.id) || {
                                total: 0,
                                pending: 0,
                                approved: 0,
                                rejected: 0,
                                draft: 0,
                                inactive: 0,
                              }
                              const items = [
                                { label: "Total", value: stats.total },
                                { label: "Pending", value: stats.pending },
                                { label: "Approved", value: stats.approved },
                                { label: "Rejected", value: stats.rejected },
                                { label: "Draft", value: stats.draft },
                                { label: "Inactive", value: stats.inactive },
                              ]
                              return items.map((item) => (
                                <div key={item.label} className="rounded-[18px] border border-slate-200 bg-slate-50/80 p-3">
                                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{item.label}</p>
                                  <p className="mt-2 text-lg font-semibold text-slate-950">{item.value}</p>
                                </div>
                              ))
                            })()}
                          </div>
                        </div>
                      </div>

                      <div className="grid gap-5 bg-[linear-gradient(180deg,#fffdfa_0%,#fff8f1_100%)] p-7">
                        {pendingMerchantReviewRequest ? (
                          <div className="rounded-[24px] border border-amber-200 bg-amber-50/80 p-5">
                            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-amber-700">Sudah diajukan admin ke manager</p>
                            <p className="mt-3 text-sm leading-7 text-slate-700">
                              Merchant ini sudah diajukan admin dan sedang menunggu keputusan final operations manager.
                            </p>
                            <div className="mt-4 rounded-[18px] border border-amber-200 bg-white p-4 text-sm leading-7 text-slate-700">
                              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-amber-700">Rekomendasi admin</p>
                              <p className="mt-3">
                                {pendingMerchantReviewRequest.request_type === "reject"
                                  ? "Admin merekomendasikan reject merchant ini."
                                  : "Admin merekomendasikan approve merchant ini."}
                              </p>
                              <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.22em] text-amber-700">Catatan admin</p>
                              <p className="mt-3 break-words">{pendingMerchantReviewRequest.admin_note || "Tidak ada catatan tambahan dari admin."}</p>
                            </div>
                          </div>
                        ) : canRequestMerchantReview ? (
                          <>
                            <MerchantReviewRequestActionCard merchantId={merchant.id} variant="approve" />
                            <MerchantReviewRequestActionCard merchantId={merchant.id} variant="reject" />
                          </>
                        ) : canReviewMerchantRequests ? (
                          <div className="rounded-[24px] border border-sky-200 bg-sky-50 p-5 text-sm leading-7 text-sky-700">
                            Operations Manager dapat memonitor dokumen dan konteks review merchant di sini. Keputusan final dilakukan dari queue manager review di atas.
                          </div>
                        ) : (
                          <div className="rounded-[24px] border border-sky-200 bg-sky-50 p-5 text-sm leading-7 text-sky-700">
                            Merchant ini hanya bisa diajukan ke operations manager oleh admin operasional atau superadmin sebagai pengaju review.
                          </div>
                        )}
                      </div>
                    </div>
                  </article>
                )
              })}
            </section>
          )}
        </section>
      </div>
    </main>
  )
}
