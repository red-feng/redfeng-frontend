import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { isAdminExecutionRole } from "@/lib/internal-roles"
import { toneClass } from "@/lib/status-tones"
import Link from "next/link"
import ConfirmSubmitButton from "./ConfirmSubmitButton"
import MerchantReasonActionCard from "./MerchantReasonActionCard"
import MerchantReviewRequestActionCard from "./MerchantReviewRequestActionCard"
import CrossTabRefreshSignal from "@/app/components/CrossTabRefreshSignal"
import {
  approveMerchantReviewRequest,
  approveMerchantDeletion,
  finalizeMerchantDeletionCancellation,
  rejectMerchantReviewRequest,
  reactivateMerchant,
  rejectMerchantDeletion,
  requestMerchantDeletion,
} from "./actions"

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
  rejection_reason: string | null
  manager_rejection_reason: string | null
  revision_deadline_at: string | null
  manager_review_requested_at: string | null
  created_at: string | null
}

type OrphanMerchantProfileRow = {
  id: string
  role: string | null
  email: string | null
  created_at: string | null
}

type MerchantDeletionRequestRow = {
  id: string
  merchant_id: string | null
  profile_id: string | null
  merchant_email: string | null
  merchant_name: string | null
  reason: string
  status: string | null
  review_note: string | null
  requested_at: string | null
  reviewed_at: string | null
  requested_by: string | null
  reviewed_by: string | null
}

type MerchantReviewRequestRow = {
  id: string
  merchant_id: string
  request_type: string | null
  status: string | null
  admin_note: string | null
  manager_reason: string | null
  requested_at: string | null
  reviewed_at: string | null
  requested_by: string | null
  reviewed_by: string | null
}

function isMissingMerchantReviewRequestsTableError(error: { message?: string | null; code?: string | null } | null | undefined) {
  const message = String(error?.message || "").toLowerCase()
  return message.includes("merchant_review_requests") && message.includes("schema cache")
}

function fieldValue(value: string | null) {
  return value && value.trim() ? value : "-"
}

function fieldValueClassName(compact = false) {
  return compact
    ? "mt-2 break-words text-sm font-medium leading-6 text-slate-800"
    : "mt-2 break-words text-sm font-medium text-slate-800"
}

function DocumentLink({
  href,
  label,
}: {
  href: string | null
  label: string
}) {
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

function getDeletionRequestKey(input: { merchantId?: string | null; profileId?: string | null }) {
  if (input.merchantId) return `merchant:${input.merchantId}`
  if (input.profileId) return `profile:${input.profileId}`
  return null
}

export default async function AdminMerchantsPage({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string; city?: string; queue?: string; sort?: string; success?: string; error?: string }>
}) {
  const resolvedSearchParams = (await searchParams) || {}
  const searchQuery = (resolvedSearchParams.q || "").trim().toLowerCase()
  const cityFilter = (resolvedSearchParams.city || "").trim().toLowerCase()
  const queueFilter = (resolvedSearchParams.queue || "all").trim().toLowerCase()
  const sortMode = (resolvedSearchParams.sort || "pending_desc").trim().toLowerCase()
  const supabase = await createClient()
  const adminSupabase = createAdminClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const { data: currentProfile } = user
    ? await supabase.from("profiles").select("role").eq("id", user.id).single()
    : { data: null }
  const currentRole = String(currentProfile?.role || "").trim().toLowerCase()
  const currentUserId = user?.id || null
  const canExecuteAdminOps = isAdminExecutionRole(currentProfile?.role)
  const canRequestMerchantReview = ["admin", "superadmin"].includes(currentRole)
  const canReviewMerchantRequests = ["operations_manager", "superadmin"].includes(currentRole)
  const canRequestMerchantDeletion = ["admin", "superadmin"].includes(currentRole)
  const canReviewMerchantDeletion = ["operations_manager", "superadmin"].includes(currentRole)
  const [{ data: pendingMerchants }, { data: managedMerchants }] = await Promise.all([
    adminSupabase
      .from("merchants")
      .select("*")
      .in("verification_status", ["pending", "pending_admin_review", "awaiting_manager_approval", "awaiting_manager_rejection"])
      .order("created_at", { ascending: false }),
    adminSupabase
      .from("merchants")
      .select("*")
      .in("verification_status", ["approved", "inactive", "deleted", "rejected"])
      .order("created_at", { ascending: false }),
  ])

  const pending = (pendingMerchants || []) as MerchantRow[]
  const managed = (managedMerchants || []) as MerchantRow[]
  const activeMerchants = managed.filter((merchant) => merchant.verification_status === "approved")
  const allMerchantIds = [...new Set([...pending, ...managed].map((merchant) => merchant.id))]
  const merchantById = new Map([...pending, ...managed].map((merchant) => [merchant.id, merchant]))
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

  const allCities = [...new Set([...pending, ...managed].map((merchant) => merchant.city).filter(Boolean))]
    .map((item) => String(item))
    .sort((a, b) => a.localeCompare(b))

  const { data: merchantProfilesData } = await adminSupabase
    .from("profiles")
    .select("id, role, created_at")
    .eq("role", "merchant")

  const merchantProfileIds = [...new Set(((merchantProfilesData as Array<{ id: string; role: string | null; created_at: string | null }> | null) || []).map((profile) => profile.id))]
  const { data: linkedMerchantRows } = merchantProfileIds.length
    ? await adminSupabase.from("merchants").select("id, user_id").in("user_id", merchantProfileIds)
    : { data: [] as Array<{ id: string; user_id: string | null }> }
  const linkedMerchantUserIds = new Set(
    (((linkedMerchantRows as Array<{ id: string; user_id: string | null }> | null) || []) as Array<{ id: string; user_id: string | null }>)
      .map((item) => item.user_id)
      .filter(Boolean),
  )

  const orphanMerchantProfilesRaw = (((merchantProfilesData as Array<{ id: string; role: string | null; created_at: string | null }> | null) || []) as Array<{
    id: string
    role: string | null
    created_at: string | null
  }>).filter((profile) => !linkedMerchantUserIds.has(profile.id))

  const { data: authUsersData, error: authUsersError } = orphanMerchantProfilesRaw.length
    ? await adminSupabase.auth.admin.listUsers({ page: 1, perPage: 1000 })
    : { data: { users: [] as Array<{ id: string; email?: string | null; created_at?: string | null }> }, error: null }

  if (authUsersError) {
    console.error("Load auth users for orphan merchants error:", authUsersError)
  }

  const authUserMap = new Map(
    (((authUsersData?.users as Array<{ id: string; email?: string | null; created_at?: string | null }> | undefined) || [])).map((userRow) => [
      userRow.id,
      {
        email: userRow.email || null,
        created_at: userRow.created_at || null,
      },
    ]),
  )

  const orphanMerchantProfiles: OrphanMerchantProfileRow[] = orphanMerchantProfilesRaw.map((profile) => ({
    id: profile.id,
    role: profile.role,
    email: authUserMap.get(profile.id)?.email || null,
    created_at: profile.created_at || authUserMap.get(profile.id)?.created_at || null,
  }))

  const pendingDeletionRequestTargets = [
    ...new Set(
      [
        ...managed.map((merchant) => merchant.id),
        ...orphanMerchantProfiles.map((profile) => profile.id),
      ].filter(Boolean),
    ),
  ]
  const { data: pendingDeletionRequestsData } = pendingDeletionRequestTargets.length
    ? await adminSupabase
        .from("merchant_deletion_requests")
        .select(
          "id, merchant_id, profile_id, merchant_email, merchant_name, reason, status, review_note, requested_at, reviewed_at, requested_by, reviewed_by",
        )
        .in("status", ["pending", "manager_rejected"])
    : { data: [] as MerchantDeletionRequestRow[] }
  const pendingDeletionRequestMap = new Map<string, MerchantDeletionRequestRow>()
  const pendingDeletionRequests = (((pendingDeletionRequestsData as MerchantDeletionRequestRow[] | null) || []) as MerchantDeletionRequestRow[])
  const pendingDeletionQueue = pendingDeletionRequests.filter((request) => request.status === "pending")
  for (const request of pendingDeletionRequests) {
    const key = getDeletionRequestKey({ merchantId: request.merchant_id, profileId: request.profile_id })
    if (key) {
      pendingDeletionRequestMap.set(key, request)
    }
  }

  const { data: merchantReviewRequestsData, error: merchantReviewRequestsError } = allMerchantIds.length
    ? await adminSupabase
        .from("merchant_review_requests")
        .select("id, merchant_id, request_type, status, admin_note, manager_reason, requested_at, reviewed_at, requested_by, reviewed_by")
        .in("merchant_id", allMerchantIds)
        .eq("status", "pending")
        .order("requested_at", { ascending: true })
    : { data: [] as MerchantReviewRequestRow[], error: null }
  const merchantReviewRequestsUnavailable = isMissingMerchantReviewRequestsTableError(merchantReviewRequestsError)
  if (merchantReviewRequestsError && !merchantReviewRequestsUnavailable) {
    console.error("Load merchant review requests error:", merchantReviewRequestsError)
  }
  const pendingMerchantReviewRequests =
    merchantReviewRequestsUnavailable
      ? ([] as MerchantReviewRequestRow[])
      : ((((merchantReviewRequestsData as MerchantReviewRequestRow[] | null) || []) as MerchantReviewRequestRow[]))
  const pendingMerchantReviewMap = new Map<string, MerchantReviewRequestRow>()
  for (const request of pendingMerchantReviewRequests) {
    if (request.merchant_id) {
      pendingMerchantReviewMap.set(request.merchant_id, request)
    }
  }

  function matchesMerchant(merchant: MerchantRow) {
    const stats = packageStatsMap.get(merchant.id) || {
      total: 0,
      pending: 0,
      approved: 0,
      rejected: 0,
      draft: 0,
      inactive: 0,
    }

    const matchesSearch =
      !searchQuery ||
      [
        normalizeText(merchant.brand_name),
        normalizeText(merchant.company_name),
        normalizeText(merchant.email),
        merchant.id.toLowerCase(),
      ].some((value) => value.includes(searchQuery))

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
  const filteredManaged = managed.filter(matchesMerchant).sort(sortMerchants)

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fff8f1_0%,#f7f1e8_100%)] px-4 py-5 sm:px-6 sm:py-6 md:px-8 md:py-8 lg:px-10">
      <div className="mx-auto max-w-7xl space-y-5 sm:space-y-6 lg:space-y-8">
        <section className="overflow-hidden rounded-[28px] border border-orange-200/60 bg-[linear-gradient(135deg,#7c2d12_0%,#c2410c_38%,#f97316_72%,#fdba74_100%)] px-5 py-6 text-white shadow-[0_30px_100px_rgba(146,64,14,0.18)] sm:rounded-[32px] sm:px-8 sm:py-8 lg:px-10">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div className="max-w-3xl">
              <span className="inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.34em] text-orange-50">
                Admin Merchant Review
              </span>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:mt-5 sm:text-4xl lg:text-5xl">
                Review merchant baru dan kelola merchant aktif dari satu halaman.
              </h1>
              <p className="mt-3 text-sm leading-7 text-orange-50/90 sm:mt-4 sm:text-base sm:leading-8">
                Admin kini mereview dan mengajukan keputusan merchant ke operations manager, sementara manager memegang keputusan final approve atau reject.
              </p>
            </div>
            <div className="grid gap-3 rounded-[22px] border border-white/20 bg-white/10 px-4 py-4 backdrop-blur sm:rounded-[24px] sm:px-5">
              <div>
                <p className="text-[11px] uppercase tracking-[0.28em] text-orange-100/80">Admin review queue</p>
                <p className="mt-2 text-2xl font-semibold text-white sm:text-3xl">{pending.length}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.28em] text-orange-100/80">Manager decision queue</p>
                <p className="mt-2 text-2xl font-semibold text-white sm:text-3xl">{pendingMerchantReviewRequests.length}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.28em] text-orange-100/80">Merchant aktif</p>
                <p className="mt-2 text-2xl font-semibold text-white sm:text-3xl">{activeMerchants.length}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_18px_60px_rgba(15,23,42,0.06)] sm:rounded-[30px] sm:p-6">
          {merchantReviewRequestsUnavailable ? (
            <div className="mb-4 rounded-[20px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-7 text-amber-800">
              Fitur review manager merchant belum aktif di database production karena migration `merchant_review_requests` belum dijalankan di Supabase.
            </div>
          ) : null}
          <form className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_220px_220px_220px_auto]">
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Cari merchant</label>
              <input
                type="text"
                name="q"
                defaultValue={resolvedSearchParams.q || ""}
                placeholder="Nama brand, company, email, atau merchant ID"
                className="mt-2 w-full rounded-[18px] border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Kota</label>
              <select
                name="city"
                defaultValue={resolvedSearchParams.city || ""}
                className="mt-2 w-full rounded-[18px] border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
              >
                <option value="">Semua kota</option>
                {allCities.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Queue paket</label>
              <select
                name="queue"
                defaultValue={queueFilter}
                className="mt-2 w-full rounded-[18px] border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
              >
                <option value="all">Semua merchant</option>
                <option value="with_pending">Punya paket pending</option>
                <option value="without_pending">Tanpa paket pending</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Urutkan</label>
              <select
                name="sort"
                defaultValue={sortMode}
                className="mt-2 w-full rounded-[18px] border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
              >
                <option value="pending_desc">Pending terbanyak</option>
                <option value="total_desc">Total paket terbanyak</option>
                <option value="newest">Merchant terbaru</option>
              </select>
            </div>

            <div className="flex flex-wrap items-end gap-3">
              <button className="inline-flex items-center justify-center rounded-[18px] bg-orange-500 px-5 py-3 text-sm font-semibold text-white shadow-[0_12px_28px_rgba(249,115,22,0.22)] transition hover:bg-orange-600">
                Terapkan
              </button>
              <Link
                href="/admin/merchants"
                className="inline-flex items-center justify-center rounded-[18px] border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400"
              >
                Reset
              </Link>
            </div>
          </form>
        </section>

      <section className="space-y-5">
        {resolvedSearchParams.success || resolvedSearchParams.error ? (
          <CrossTabRefreshSignal
            storageKey="redfeng-admin-merchants-refresh"
            value={resolvedSearchParams.success || resolvedSearchParams.error || "merchant-refresh"}
          />
        ) : null}
        {resolvedSearchParams.success ? (
          <div className="rounded-[24px] border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-700">
            {resolvedSearchParams.success}
          </div>
        ) : null}
        {resolvedSearchParams.error ? (
          <div className="rounded-[24px] border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
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
                    <article
                      key={request.id}
                      className="rounded-[24px] border border-emerald-200 bg-white p-5 shadow-[0_14px_36px_rgba(15,23,42,0.06)]"
                    >
                      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
                        <div className="space-y-4">
                          <div className="flex flex-wrap items-center gap-3">
                            <h3 className="text-xl font-semibold text-slate-950">
                              {merchant.brand_name || merchant.company_name || merchant.email || merchant.id}
                            </h3>
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
                            <Link
                              href={`/admin/merchants/${merchant.id}/profile`}
                              className="inline-flex items-center justify-center rounded-[16px] border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-orange-200 hover:text-orange-700"
                            >
                              Profil
                            </Link>
                            <Link
                              href={`/admin/merchants/${merchant.id}`}
                              className="inline-flex items-center justify-center rounded-[16px] border border-orange-200 bg-orange-50 px-4 py-3 text-sm font-semibold text-orange-700 transition hover:border-orange-300 hover:bg-orange-100"
                            >
                              Paket
                            </Link>
                          </div>
                        </div>

                        <div className="space-y-4 rounded-[22px] border border-[#f2dcc1] bg-[#fffdfa] p-5">
                          <form action={approveMerchantReviewRequest} className="space-y-3">
                            <input type="hidden" name="requestId" value={request.id} />
                            <ConfirmSubmitButton
                              confirmMessage="Setujui merchant ini sebagai keputusan final operations manager?"
                              pendingLabel="Sedang menyetujui merchant..."
                              className="inline-flex w-full items-center justify-center gap-2 rounded-[18px] bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
                            >
                              Setujui
                            </ConfirmSubmitButton>
                          </form>

                          <form action={rejectMerchantReviewRequest} className="space-y-3">
                            <input type="hidden" name="requestId" value={request.id} />
                            <textarea
                              name="reviewNote"
                              placeholder="Alasan penolakan final dari operations manager. Alasan ini akan dikirim ke merchant dan admin..."
                              required
                              className="min-h-[120px] w-full rounded-[18px] border border-rose-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-rose-400 focus:ring-4 focus:ring-rose-100"
                            />
                            <ConfirmSubmitButton
                              confirmMessage="Tolak merchant ini sebagai keputusan final operations manager?"
                              pendingLabel="Sedang menolak merchant..."
                              className="inline-flex w-full items-center justify-center gap-2 rounded-[18px] border border-rose-300 bg-white px-5 py-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-50"
                            >
                              Tolak
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
                <article
                  key={merchant.id}
                  className="overflow-hidden rounded-[24px] border border-orange-100 bg-white shadow-[0_20px_70px_rgba(15,23,42,0.06)] sm:rounded-[30px]"
                >
                  <div className="grid gap-0 lg:grid-cols-[1.1fr_0.9fr]">
                    <div className="border-b border-orange-100/80 p-5 sm:p-7 lg:border-b-0 lg:border-r">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-100 text-orange-700">
                            <span className="text-xl font-semibold">M</span>
                          </div>
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
                              Merchant profile
                            </p>
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
                          <p className="mt-2 text-sm text-slate-800">
                            {merchant.created_at ? new Date(merchant.created_at).toLocaleString("id-ID") : "-"}
                          </p>
                        </div>
                        <div className="rounded-[22px] border border-slate-200 bg-white p-4">
                          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Onboarding</p>
                          <p className="mt-2 text-sm text-slate-800">
                            Step {merchant.onboarding_step ?? "-"} / completed:{" "}
                            {merchant.onboarding_completed ? "yes" : "no"}
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
                          <Link
                            href={`/admin/merchants/${merchant.id}`}
                            className="inline-flex items-center justify-center rounded-[18px] border border-orange-200 bg-orange-50 px-4 py-3 text-sm font-semibold text-orange-700 transition hover:border-orange-300 hover:bg-orange-100"
                          >
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
                        <>
                          <div className="rounded-[24px] border border-amber-200 bg-amber-50/80 p-5">
                            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-amber-700">
                              Sudah diajukan admin ke manager
                            </p>
                            <p className="mt-3 text-sm leading-7 text-slate-700">
                              Merchant ini sudah diajukan admin dan sedang menunggu keputusan final operations manager. Admin tidak bisa mengubah keputusan sampai request selesai diproses.
                            </p>
                            <div className="mt-4 rounded-[18px] border border-amber-200 bg-white p-4 text-sm leading-7 text-slate-700">
                              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-amber-700">Rekomendasi admin</p>
                              <p className="mt-3">
                                {pendingMerchantReviewRequest.request_type === "reject"
                                  ? "Admin merekomendasikan reject merchant ini."
                                  : "Admin merekomendasikan approve merchant ini."}
                              </p>
                              <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.22em] text-amber-700">Catatan admin</p>
                              <p className="mt-3 break-words">
                                {pendingMerchantReviewRequest.admin_note || "Tidak ada catatan tambahan dari admin."}
                              </p>
                            </div>
                          </div>
                        </>
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

        <section className="space-y-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Merchant controls</p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-950">Merchant aktif, nonaktif, dan hapus</h2>
            </div>
            <p className="max-w-2xl text-sm leading-7 text-slate-500">
              Nonaktif sementara memblok akses merchant ke dashboard. Penghapusan merchant memakai alur maker-checker:
              admin mengajukan, lalu operations manager menyetujui atau membatalkan sebelum hard delete dijalankan.
            </p>
          </div>

          {!filteredManaged.length ? (
            <section className="rounded-[24px] border border-slate-200 bg-white p-8 text-center shadow-[0_18px_60px_rgba(15,23,42,0.06)] sm:rounded-[30px] sm:p-10">
              <h2 className="text-2xl font-semibold text-slate-950">Belum ada merchant aktif</h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                Tidak ada merchant managed yang cocok dengan filter saat ini.
              </p>
            </section>
          ) : (
            <section className="grid gap-6">
              {filteredManaged.map((merchant) => {
                const pendingDeletionRequest =
                  pendingDeletionRequestMap.get(getDeletionRequestKey({ merchantId: merchant.id }) || "") || null
                return (
                <article
                  key={merchant.id}
                  className="rounded-[22px] border border-[#ece3d7] bg-[#fffdfa] p-5 shadow-[0_16px_44px_rgba(15,23,42,0.05)] sm:rounded-[26px] sm:p-6"
                >
                  <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px] xl:items-start">
                    <div className="min-w-0 flex-1 space-y-4">
                      <div className="flex flex-wrap items-center gap-3">
                        <h3 className="text-xl font-semibold text-slate-950 sm:text-2xl">
                          {merchant.brand_name || merchant.company_name || "Merchant tanpa nama"}
                        </h3>
                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${getStatusBadge(merchant.verification_status)}`}
                        >
                          {getStatusLabel(merchant.verification_status)}
                        </span>
                      </div>
                      <div className="grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-4">
                        {[
                          { label: "Email", value: fieldValue(merchant.email) },
                          { label: "Company", value: fieldValue(merchant.company_name) },
                          { label: "NIB", value: fieldValue(merchant.nib) },
                          { label: "NPWP Badan Usaha", value: fieldValue(merchant.npwp_company) },
                        ].map((item) => (
                          <div key={item.label} className="min-w-0 rounded-[18px] border border-[#f0e6da] bg-white px-4 py-3">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">{item.label}</p>
                            <p className={fieldValueClassName()}>{item.value}</p>
                          </div>
                        ))}
                      </div>
                      {merchant.rejection_reason ? (
                        <div className="rounded-[18px] border border-[#efe3d5] bg-[#fff7ef] px-4 py-3 text-sm text-slate-600">
                          {merchant.verification_status === "rejected" ? "Alasan penolakan final dari operations manager" : "Catatan review"}: {merchant.rejection_reason}
                        </div>
                      ) : null}
                      {merchant.verification_status === "rejected" && merchant.revision_deadline_at ? (
                        <div className="rounded-[18px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                          Merchant punya waktu revisi 7 hari sampai: {new Date(merchant.revision_deadline_at).toLocaleString("id-ID")}
                        </div>
                      ) : null}

                      <div className="rounded-[20px] border border-[#efe3d5] bg-white px-4 py-4">
                        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#f2e8dd] pb-4">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Merchant package workspace</p>
                            <p className="mt-2 text-sm text-slate-600">Masuk ke detail merchant untuk melihat seluruh paket tanpa tercampur merchant lain.</p>
                          </div>
                          <div className="flex flex-wrap gap-3">
                            <Link
                              href={`/admin/merchants/${merchant.id}/profile`}
                              className="inline-flex items-center justify-center rounded-[16px] border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-orange-200 hover:text-orange-700"
                            >
                              Profil
                            </Link>
                            <Link
                              href={`/admin/merchants/${merchant.id}`}
                              className="inline-flex items-center justify-center rounded-[16px] border border-[#f2dcc1] bg-[#fff7ef] px-4 py-3 text-sm font-semibold text-orange-700 transition hover:border-orange-300 hover:bg-orange-50"
                            >
                              Buka paket merchant
                            </Link>
                          </div>
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
                              <div key={item.label} className="rounded-[16px] border border-[#f0e6da] bg-[#fffaf4] p-3">
                                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">{item.label}</p>
                                <p className="mt-2 text-lg font-semibold text-slate-950">{item.value}</p>
                              </div>
                            ))
                          })()}
                        </div>
                      </div>
                    </div>

                    <div className="flex min-w-0 w-full flex-col gap-3 xl:w-[340px] xl:pt-[58px]">
                      {pendingDeletionRequest ? (
                        <div className="overflow-hidden rounded-[24px] border border-amber-200 bg-amber-50/80 shadow-[0_14px_36px_rgba(15,23,42,0.06)]">
                          <div className="space-y-4 px-5 py-4">
                            <details className="group rounded-[18px] border border-amber-200 bg-white/80 p-4">
                              <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
                                <div>
                                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-amber-700">Alasan admin</p>
                                  <p className="mt-2 text-sm text-slate-600">Buka untuk melihat alasan lengkap pengajuan hapus merchant dari admin.</p>
                                </div>
                                <span className="inline-flex h-8 min-w-8 items-center justify-center rounded-full border border-amber-200 bg-amber-50 px-2 text-amber-700 transition group-open:rotate-180">
                                  v
                                </span>
                              </summary>
                              <p className="mt-4 break-words text-sm leading-7 text-slate-700">{pendingDeletionRequest.reason}</p>
                            </details>
                            <details className="group rounded-[18px] border border-slate-200 bg-white/90 p-4">
                              <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
                                <div>
                                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">Ringkasan merchant</p>
                                  <p className="mt-2 text-sm text-slate-600">Buka detail merchant sebelum mengambil keputusan penghapusan.</p>
                                </div>
                                <span className="inline-flex h-8 min-w-8 items-center justify-center rounded-full border border-slate-200 bg-slate-50 px-2 text-slate-500 transition group-open:rotate-180">
                                  v
                                </span>
                              </summary>
                              <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                                <div className="min-w-0 rounded-[14px] border border-slate-200 bg-slate-50 px-3 py-3">
                                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Brand</p>
                                  <p className={fieldValueClassName(true)}>{fieldValue(merchant.brand_name || merchant.company_name)}</p>
                                </div>
                                <div className="min-w-0 rounded-[14px] border border-slate-200 bg-slate-50 px-3 py-3">
                                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Email</p>
                                  <p className={fieldValueClassName(true)}>{fieldValue(merchant.email)}</p>
                                </div>
                                <div className="min-w-0 rounded-[14px] border border-slate-200 bg-slate-50 px-3 py-3">
                                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Company</p>
                                  <p className={fieldValueClassName(true)}>{fieldValue(merchant.company_name)}</p>
                                </div>
                                <div className="min-w-0 rounded-[14px] border border-slate-200 bg-slate-50 px-3 py-3">
                                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Status</p>
                                  <p className={fieldValueClassName(true)}>{getStatusLabel(merchant.verification_status)}</p>
                                </div>
                                <div className="min-w-0 rounded-[14px] border border-slate-200 bg-slate-50 px-3 py-3">
                                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">NIB</p>
                                  <p className={fieldValueClassName(true)}>{fieldValue(merchant.nib)}</p>
                                </div>
                                <div className="min-w-0 rounded-[14px] border border-slate-200 bg-slate-50 px-3 py-3">
                                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">NPWP</p>
                                  <p className={fieldValueClassName(true)}>{fieldValue(merchant.npwp_company)}</p>
                                </div>
                              </div>
                              <div className="mt-4 flex flex-wrap gap-3">
                                <Link
                                  href={`/admin/merchants/${merchant.id}/profile`}
                                  className="inline-flex min-w-0 flex-1 items-center justify-center rounded-[14px] border border-slate-200 bg-white px-4 py-2.5 text-center text-sm font-semibold text-slate-700 transition hover:border-orange-200 hover:text-orange-700"
                                >
                                  Profil
                                </Link>
                                <Link
                                  href={`/admin/merchants/${merchant.id}`}
                                  className="inline-flex min-w-0 flex-1 items-center justify-center rounded-[14px] border border-orange-200 bg-orange-50 px-4 py-2.5 text-center text-sm font-semibold text-orange-700 transition hover:border-orange-300 hover:bg-orange-100"
                                >
                                  Paket
                                </Link>
                              </div>
                            </details>
                            <details className="group rounded-[18px] border border-slate-200 bg-white/90 p-4">
                              <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
                                <div>
                                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">Dampak penghapusan</p>
                                  <p className="mt-2 text-sm text-slate-600">Buka untuk melihat paket yang terdampak dan konsekuensi hard delete.</p>
                                </div>
                                <span className="inline-flex h-8 min-w-8 items-center justify-center rounded-full border border-slate-200 bg-slate-50 px-2 text-slate-500 transition group-open:rotate-180">
                                  v
                                </span>
                              </summary>
                              {(() => {
                                const stats = packageStatsMap.get(merchant.id) || {
                                  total: 0,
                                  pending: 0,
                                  approved: 0,
                                  rejected: 0,
                                  draft: 0,
                                  inactive: 0,
                                }
                                const impactItems = [
                                  { label: "Total paket", value: `${stats.total}` },
                                  { label: "Paket approved", value: `${stats.approved}` },
                                  { label: "Paket pending", value: `${stats.pending}` },
                                  { label: "Paket draft", value: `${stats.draft}` },
                                ]
                                return (
                                  <div className="mt-4">
                                    <div className="grid gap-3 sm:grid-cols-2">
                                      {impactItems.map((item) => (
                                        <div key={item.label} className="rounded-[14px] border border-slate-200 bg-slate-50 px-3 py-3">
                                          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">{item.label}</p>
                                          <p className="mt-2 font-medium text-slate-800">{item.value}</p>
                                        </div>
                                      ))}
                                    </div>
                                    <div className="mt-4 rounded-[16px] border border-rose-200 bg-rose-50 px-4 py-4 text-sm leading-7 text-rose-700">
                                      Jika disetujui, merchant ini akan dihapus permanen dari database beserta paket, profile merchant, akun login, payout request, dan data turunan yang terhubung.
                                    </div>
                                  </div>
                                )
                              })()}
                            </details>
                            {pendingDeletionRequest.status === "pending" && canReviewMerchantDeletion ? (
                              <>
                                <form action={approveMerchantDeletion} className="space-y-3">
                                  <input type="hidden" name="requestId" value={pendingDeletionRequest.id} />
                                  <textarea
                                    name="reviewNote"
                                    placeholder="Alasan final penghapusan yang akan dikirim ke email merchant..."
                                    className="min-h-[96px] w-full rounded-[18px] border border-emerald-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
                                  />
                                  <ConfirmSubmitButton
                                    confirmMessage="Yakin ingin menyetujui penghapusan merchant ini? Semua data merchant dan paket terkait akan dihapus permanen."
                                    pendingLabel="Sedang menghapus merchant..."
                                    className="inline-flex w-full items-center justify-center gap-2 rounded-[18px] bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
                                  >
                                    Setujui
                                  </ConfirmSubmitButton>
                                </form>
                                <form action={rejectMerchantDeletion} className="space-y-3">
                                  <input type="hidden" name="requestId" value={pendingDeletionRequest.id} />
                                  <textarea
                                    name="reviewNote"
                                    placeholder="Alasan operations manager menolak penghapusan. Alasan ini akan dikirim ke admin..."
                                    className="min-h-[96px] w-full rounded-[18px] border border-rose-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-rose-400 focus:ring-4 focus:ring-rose-100"
                                  />
                                  <ConfirmSubmitButton
                                    confirmMessage="Tolak pengajuan penghapusan merchant ini dan kirim alasan ke admin?"
                                    pendingLabel="Sedang menolak..."
                                    className="inline-flex w-full items-center justify-center gap-2 rounded-[18px] border border-rose-300 bg-white px-5 py-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-50"
                                  >
                                    Tolak
                                  </ConfirmSubmitButton>
                                </form>
                              </>
                            ) : pendingDeletionRequest.status === "manager_rejected" && canRequestMerchantDeletion && (currentUserId === pendingDeletionRequest.requested_by || currentRole === "superadmin") ? (
                              <div className="space-y-3">
                                <div className="rounded-[18px] border border-rose-200 bg-rose-50 p-4 text-sm leading-7 text-rose-700">
                                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-rose-700">Alasan manager</p>
                                  <p className="mt-3 break-words">{pendingDeletionRequest.review_note || "Operations manager menolak penghapusan tanpa catatan tambahan."}</p>
                                </div>
                                <form action={finalizeMerchantDeletionCancellation}>
                                  <input type="hidden" name="requestId" value={pendingDeletionRequest.id} />
                                  <ConfirmSubmitButton
                                    confirmMessage="Tutup pengajuan penghapusan merchant ini sebagai dibatalkan?"
                                    pendingLabel="Sedang menutup pengajuan..."
                                    className="inline-flex w-full items-center justify-center gap-2 rounded-[18px] border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                                  >
                                    Batalkan
                                  </ConfirmSubmitButton>
                                </form>
                              </div>
                            ) : (
                              <div className="rounded-[18px] border border-sky-200 bg-sky-50 p-4 text-sm leading-7 text-sky-700">
                                {pendingDeletionRequest.status === "manager_rejected"
                                  ? "Pengajuan ini sudah ditolak operations manager dan sedang menunggu admin menutup request."
                                  : "Menunggu keputusan operations manager. Admin tidak bisa menghapus merchant ini sebelum request direview."}
                              </div>
                            )}
                          </div>
                        </div>
                      ) : null}
                      {merchant.verification_status === "approved" && canExecuteAdminOps ? (
                        <MerchantReasonActionCard merchantId={merchant.id} variant="deactivate" />
                      ) : null}

                      {merchant.verification_status === "inactive" && canExecuteAdminOps ? (
                        <div className="flex h-full flex-col overflow-hidden rounded-[24px] border border-[#f2dcc1] bg-[#fffdfa] shadow-[0_14px_36px_rgba(15,23,42,0.06)]">
                          <div className="border-b border-[#f3e4d2] px-5 py-4">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-emerald-700">Restore Access</p>
                            <h4 className="mt-2 text-base font-semibold text-slate-950">Aktifkan kembali</h4>
                            <p className="mt-2 text-sm leading-6 text-slate-600">
                              Merchant akan kembali bisa login dan melanjutkan operasional di workspace merchant.
                            </p>
                          </div>
                          <div className="flex h-full flex-col px-5 pb-5 pt-4">
                            <div className="rounded-[18px] border border-[#f3e4d2] bg-[#fffaf4] p-4">
                              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-emerald-700">Access impact</p>
                              <p className="mt-3 text-sm leading-7 text-slate-600">
                                Merchant kembali aktif tanpa mengubah histori booking, payout, atau package review sebelumnya.
                              </p>
                            </div>
                            <form action={reactivateMerchant} className="mt-auto pt-4">
                              <input type="hidden" name="merchantId" value={merchant.id} />
                              <button className="inline-flex w-full items-center justify-center gap-2 rounded-[18px] bg-[linear-gradient(135deg,#059669_0%,#10b981_100%)] px-5 py-3 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(16,185,129,0.24)] transition hover:brightness-105">
                                Aktifkan
                              </button>
                            </form>
                          </div>
                        </div>
                      ) : null}

                      {merchant.verification_status !== "deleted" && canRequestMerchantDeletion && !pendingDeletionRequest ? (
                        <MerchantReasonActionCard merchantId={merchant.id} variant="delete" />
                      ) : null}
                      {!canExecuteAdminOps && !canReviewMerchantDeletion ? (
                        <div className="rounded-[24px] border border-sky-200 bg-sky-50 p-5 text-sm leading-7 text-sky-700">
                          Operations Manager hanya memonitor status merchant. Nonaktif, aktifkan kembali, dan hapus akses tetap dijalankan admin operasional.
                        </div>
                      ) : null}
                    </div>
                  </div>
                </article>
                )
              })}
            </section>
          )}
        </section>

        <section className="space-y-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Merchant anomalies</p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-950">Role merchant tanpa data merchant</h2>
            </div>
            <p className="max-w-2xl text-sm leading-7 text-slate-500">
              Akun di bawah ini punya role `merchant` di profiles, tetapi belum memiliki row di tabel merchants.
              Admin dapat mencabut akses merchant-nya langsung dari sini.
            </p>
          </div>

          {!orphanMerchantProfiles.length ? (
            <section className="rounded-[24px] border border-slate-200 bg-white p-8 text-center shadow-[0_18px_60px_rgba(15,23,42,0.06)] sm:rounded-[30px] sm:p-10">
              <h2 className="text-2xl font-semibold text-slate-950">Tidak ada merchant tanpa profil merchant</h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                Semua akun merchant saat ini sudah punya data merchant yang valid.
              </p>
            </section>
          ) : (
            <section className="grid gap-6">
              {orphanMerchantProfiles.map((profile) => {
                const pendingDeletionRequest =
                  pendingDeletionRequestMap.get(getDeletionRequestKey({ profileId: profile.id }) || "") || null
                return (
                <article
                  key={profile.id}
                  className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_20px_70px_rgba(15,23,42,0.06)] sm:rounded-[30px] sm:p-7"
                >
                  <div className="flex flex-wrap items-start justify-between gap-6">
                    <div className="space-y-4">
                      <div className="flex flex-wrap items-center gap-3">
                        <h3 className="text-xl font-semibold text-slate-950 sm:text-2xl">{fieldValue(profile.email)}</h3>
                        <span className="inline-flex rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-red-700">
                          Merchant tanpa row merchants
                        </span>
                      </div>
                      <div className="grid gap-3 text-sm text-slate-600 sm:grid-cols-2 lg:grid-cols-3">
                        <p>Profile ID: <span className="font-medium text-slate-800">{profile.id}</span></p>
                        <p>Role: <span className="font-medium text-slate-800">{fieldValue(profile.role)}</span></p>
                        <p>Dibuat: <span className="font-medium text-slate-800">{profile.created_at ? new Date(profile.created_at).toLocaleString("id-ID") : "-"}</span></p>
                      </div>
                    </div>

                    <div className="flex h-full w-full min-w-0 flex-col rounded-[24px] border border-red-200 bg-red-50/80 p-5 lg:min-w-[320px]">
                      {pendingDeletionRequest ? (
                        <>
                          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-amber-700">
                            Menunggu review penghapusan
                          </p>
                          <p className="mt-3 text-sm leading-7 text-slate-700">
                            Akun merchant tanpa row merchants ini sudah diajukan untuk dihapus. Operations manager perlu menyetujui atau membatalkan request ini.
                          </p>
                          <div className="mt-4 rounded-[18px] border border-amber-200 bg-white/80 p-4 text-sm leading-7 text-slate-700">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-amber-700">Alasan admin</p>
                            <p className="mt-3">{pendingDeletionRequest.reason}</p>
                          </div>
                          <div className="mt-4 rounded-[18px] border border-slate-200 bg-white/90 p-4 text-sm leading-7 text-slate-700">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">Dampak penghapusan</p>
                            <div className="mt-3 rounded-[14px] border border-rose-200 bg-rose-50 px-4 py-4 text-rose-700">
                              Jika disetujui, akun anomali ini akan dihapus permanen dengan menghapus profile merchant dan auth user yang terkait.
                            </div>
                          </div>
                          {pendingDeletionRequest.status === "pending" && canReviewMerchantDeletion ? (
                            <div className="mt-4 space-y-4">
                              <form action={approveMerchantDeletion} className="space-y-3">
                                <input type="hidden" name="requestId" value={pendingDeletionRequest.id} />
                                <textarea
                                  name="reviewNote"
                                  placeholder="Alasan final penghapusan yang akan dikirim ke email merchant..."
                                  className="min-h-[96px] w-full rounded-[18px] border border-emerald-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
                                />
                                <ConfirmSubmitButton
                                  confirmMessage="Yakin ingin menyetujui penghapusan akun merchant ini? Profile dan auth user akan dihapus permanen."
                                  pendingLabel="Sedang menghapus..."
                                  className="inline-flex w-full items-center justify-center gap-2 rounded-[18px] bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
                                >
                                  Setujui
                                </ConfirmSubmitButton>
                              </form>
                              <form action={rejectMerchantDeletion} className="space-y-3">
                                <input type="hidden" name="requestId" value={pendingDeletionRequest.id} />
                                <textarea
                                  name="reviewNote"
                                  placeholder="Alasan operations manager menolak penghapusan. Alasan ini akan dikirim ke admin..."
                                  className="min-h-[96px] w-full rounded-[18px] border border-rose-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-rose-400 focus:ring-4 focus:ring-rose-100"
                                />
                                <ConfirmSubmitButton
                                  confirmMessage="Tolak pengajuan penghapusan akun merchant ini dan kirim alasan ke admin?"
                                  pendingLabel="Sedang menolak..."
                                  className="inline-flex w-full items-center justify-center gap-2 rounded-[18px] border border-rose-300 bg-white px-5 py-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-50"
                                >
                                  Tolak
                                </ConfirmSubmitButton>
                              </form>
                            </div>
                          ) : pendingDeletionRequest.status === "manager_rejected" && canRequestMerchantDeletion && (currentUserId === pendingDeletionRequest.requested_by || currentRole === "superadmin") ? (
                            <div className="mt-4 space-y-3">
                              <div className="rounded-[18px] border border-rose-200 bg-rose-50 p-4 text-sm leading-7 text-rose-700">
                                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-rose-700">Alasan manager</p>
                                <p className="mt-3 break-words">{pendingDeletionRequest.review_note || "Operations manager menolak penghapusan tanpa catatan tambahan."}</p>
                              </div>
                              <form action={finalizeMerchantDeletionCancellation}>
                                <input type="hidden" name="requestId" value={pendingDeletionRequest.id} />
                                <ConfirmSubmitButton
                                  confirmMessage="Tutup pengajuan penghapusan akun merchant ini sebagai dibatalkan?"
                                  pendingLabel="Sedang menutup pengajuan..."
                                  className="inline-flex w-full items-center justify-center gap-2 rounded-[18px] border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                                >
                                  Batalkan
                                </ConfirmSubmitButton>
                              </form>
                            </div>
                          ) : (
                            <div className="mt-4 text-sm leading-7 text-sky-700">
                              {pendingDeletionRequest.status === "manager_rejected"
                                ? "Pengajuan ini sudah ditolak operations manager dan sedang menunggu admin menutup request."
                                : "Menunggu keputusan operations manager. Admin tidak bisa menghapus akun ini sebelum request direview."}
                            </div>
                          )}
                        </>
                      ) : canRequestMerchantDeletion ? (
                        <>
                          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-red-700">
                            Ajukan
                          </p>
                          <p className="mt-3 text-sm leading-7 text-slate-700">
                            Action ini mengirim pengajuan ke operations manager. Jika disetujui, akun auth dan profile merchant akan dihapus permanen dari database.
                          </p>
                          <form action={requestMerchantDeletion} className="mt-4 flex h-full flex-col space-y-4">
                            <input type="hidden" name="profileId" value={profile.id} />
                            <textarea
                              name="reason"
                              placeholder="Alasan pengajuan penghapusan merchant..."
                              required
                              className="min-h-[96px] w-full rounded-[18px] border border-red-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-red-400 focus:ring-4 focus:ring-red-100"
                            />
                            <ConfirmSubmitButton
                              confirmMessage="Kirim pengajuan hapus akun merchant ini ke operations manager?"
                              pendingLabel="Mengirim pengajuan..."
                              className="mt-auto inline-flex items-center justify-center gap-2 rounded-[18px] bg-red-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-700"
                            >
                              Ajukan
                            </ConfirmSubmitButton>
                          </form>
                        </>
                      ) : (
                        <div className="text-sm leading-7 text-sky-700">
                          Operations Manager dapat mereview pengajuan hapus akun merchant jika request sudah dibuat admin.
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
