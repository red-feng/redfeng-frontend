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
  canDecideMerchantDeletionReview,
  canDecideMerchantRegistrationReview,
  canRequestMerchantDeletionReview,
  canRequestMerchantRegistrationReview,
  MERCHANT_REVIEW_BUTTONS,
} from "@/lib/merchant-review-policy"
import { formatInternalUserCode } from "@/lib/merchant-code"
import {
  approveMerchantReviewRequest,
  approveMerchantDeletion,
  finalizeMerchantDeletionCancellation,
  rejectMerchantReviewRequest,
  reactivateMerchant,
  rejectMerchantDeletion,
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

const MANAGED_MERCHANT_PAGE_SIZE = 20

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

function sanitizePostgrestSearchTerm(value: string) {
  return value.replace(/[,%]/g, " ").trim()
}

function getDeletionRequestKey(input: { merchantId?: string | null; profileId?: string | null }) {
  if (input.merchantId) return `merchant:${input.merchantId}`
  if (input.profileId) return `profile:${input.profileId}`
  return null
}

function getPositiveInteger(value: string | null | undefined, fallback: number) {
  const parsed = Number.parseInt(String(value || ""), 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

function buildMerchantPageHref(
  params: { q?: string; city?: string; queue?: string; sort?: string; selected?: string; success?: string; error?: string },
  page: number,
) {
  const query = new URLSearchParams()
  if (params.q) query.set("q", params.q)
  if (params.city) query.set("city", params.city)
  if (params.queue) query.set("queue", params.queue)
  if (params.sort) query.set("sort", params.sort)
  if (params.selected) query.set("selected", params.selected)
  if (page > 1) query.set("page", String(page))
  const suffix = query.toString()
  return suffix ? `/admin/merchants?${suffix}` : "/admin/merchants"
}

function buildMerchantSelectionHref(
  params: { q?: string; city?: string; queue?: string; sort?: string; page?: string; selected?: string },
  selected: string,
) {
  const query = new URLSearchParams()
  if (params.q) query.set("q", params.q)
  if (params.city) query.set("city", params.city)
  if (params.queue) query.set("queue", params.queue)
  if (params.sort) query.set("sort", params.sort)
  if (params.page) query.set("page", params.page)
  query.set("selected", selected)
  return `/admin/merchants?${query.toString()}`
}

function formatAdminDateTime(value: string | null) {
  if (!value) return "-"
  return new Date(value).toLocaleString("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function getMerchantInitials(merchant: MerchantRow) {
  const source = merchant.brand_name || merchant.company_name || merchant.email || "Merchant"
  return source
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((item) => item[0]?.toUpperCase())
    .join("") || "M"
}

export default async function AdminMerchantsPage({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string; city?: string; queue?: string; sort?: string; page?: string; selected?: string; success?: string; error?: string }>
}) {
  const resolvedSearchParams = (await searchParams) || {}
  const searchQuery = (resolvedSearchParams.q || "").trim().toLowerCase()
  const cityFilter = (resolvedSearchParams.city || "").trim().toLowerCase()
  const queueFilter = (resolvedSearchParams.queue || "all").trim().toLowerCase()
  const sortMode = (resolvedSearchParams.sort || "pending_desc").trim().toLowerCase()
  const requestedManagedPage = getPositiveInteger(resolvedSearchParams.page, 1)
  const supabase = await createClient("admin")
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
  const canRequestMerchantReview = canRequestMerchantRegistrationReview(currentRole)
  const canReviewMerchantRequests = canDecideMerchantRegistrationReview(currentRole)
  const canRequestMerchantDeletion = canRequestMerchantDeletionReview(currentRole)
  const canReviewMerchantDeletion = canDecideMerchantDeletionReview(currentRole)
  const managedRangeStart = (requestedManagedPage - 1) * MANAGED_MERCHANT_PAGE_SIZE
  const managedRangeEnd = managedRangeStart + MANAGED_MERCHANT_PAGE_SIZE - 1
  let managedQuery = adminSupabase
    .from("merchants")
    .select("*", { count: "exact" })
    .in("verification_status", ["approved", "inactive", "deleted", "rejected"])

  const safeSearchQuery = sanitizePostgrestSearchTerm(searchQuery)
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(safeSearchQuery)) {
    managedQuery = managedQuery.eq("id", safeSearchQuery)
  } else if (safeSearchQuery) {
    managedQuery = managedQuery.or(
      `brand_name.ilike.%${safeSearchQuery}%,company_name.ilike.%${safeSearchQuery}%,email.ilike.%${safeSearchQuery}%`,
    )
  }

  const safeCityFilter = sanitizePostgrestSearchTerm(cityFilter)
  if (safeCityFilter) {
    managedQuery = managedQuery.or(`city.ilike.${safeCityFilter},province.ilike.${safeCityFilter}`)
  }

  const [{ data: pendingMerchants }, managedMerchantsResult] = await Promise.all([
    adminSupabase
      .from("merchants")
      .select("*")
      .in("verification_status", ["pending", "pending_admin_review", "awaiting_manager_approval", "awaiting_manager_rejection"])
      .order("created_at", { ascending: false }),
    managedQuery
      .order("created_at", { ascending: false })
      .range(managedRangeStart, managedRangeEnd),
  ])

  const pending = (pendingMerchants || []) as MerchantRow[]
  const managed = (managedMerchantsResult.data || []) as MerchantRow[]
  const managedTotalCount = managedMerchantsResult.count || 0
  const [activeMerchantCountResult, inactiveMerchantCountResult, deletedMerchantCountResult, rejectedMerchantCountResult] = await Promise.all([
    adminSupabase
      .from("merchants")
      .select("id", { count: "exact", head: true })
      .eq("verification_status", "approved"),
    adminSupabase
      .from("merchants")
      .select("id", { count: "exact", head: true })
      .eq("verification_status", "inactive"),
    adminSupabase
      .from("merchants")
      .select("id", { count: "exact", head: true })
      .eq("verification_status", "deleted"),
    adminSupabase
      .from("merchants")
      .select("id", { count: "exact", head: true })
      .eq("verification_status", "rejected"),
  ])
  const activeMerchantCount = activeMerchantCountResult.count || 0
  const inactiveMerchantCount = inactiveMerchantCountResult.count || 0
  const deletedMerchantCount = deletedMerchantCountResult.count || 0
  const rejectedMerchantCount = rejectedMerchantCountResult.count || 0
  const allMerchantIds = [...new Set([...pending, ...managed].map((merchant) => merchant.id))]
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

  const { data: legacyMerchantProfilesData } = await adminSupabase
    .from("profiles")
    .select("id, role, created_at")
    .eq("role", "merchant")

  const { data: merchantAccessRows } = await adminSupabase
    .from("account_roles")
    .select("user_id")
    .eq("role", "merchant")
    .eq("status", "active")

  const merchantProfileIds = [
    ...new Set([
      ...(((legacyMerchantProfilesData as Array<{ id: string; role: string | null; created_at: string | null }> | null) || []).map((profile) => profile.id)),
      ...(((merchantAccessRows as Array<{ user_id: string | null }> | null) || []).map((row) => row.user_id).filter(Boolean) as string[]),
    ]),
  ]
  const { data: merchantProfilesData } = merchantProfileIds.length
    ? await adminSupabase.from("profiles").select("id, role, created_at").in("id", merchantProfileIds)
    : { data: [] as Array<{ id: string; role: string | null; created_at: string | null }> }
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

  const { data: pendingDeletionRequestsData } = await adminSupabase
    .from("merchant_deletion_requests")
    .select(
      "id, merchant_id, profile_id, merchant_email, merchant_name, reason, status, review_note, requested_at, reviewed_at, requested_by, reviewed_by",
    )
    .in("status", ["pending", "manager_rejected"])
  const pendingDeletionRequestMap = new Map<string, MerchantDeletionRequestRow>()
  const pendingDeletionRequests = (((pendingDeletionRequestsData as MerchantDeletionRequestRow[] | null) || []) as MerchantDeletionRequestRow[])
  const pendingDeletionQueue = pendingDeletionRequests.filter((request) => request.status === "pending")
  for (const request of pendingDeletionRequests) {
    const key = getDeletionRequestKey({ merchantId: request.merchant_id, profileId: request.profile_id })
    if (key) {
      pendingDeletionRequestMap.set(key, request)
    }
  }

  const { data: merchantReviewRequestsData, error: merchantReviewRequestsError } = await adminSupabase
    .from("merchant_review_requests")
    .select("id, merchant_id, request_type, status, admin_note, manager_reason, requested_at, reviewed_at, requested_by, reviewed_by")
    .eq("status", "pending")
    .order("requested_at", { ascending: true })
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
  const reviewMerchantIds = [...new Set(pendingMerchantReviewRequests.map((request) => request.merchant_id).filter(Boolean))]
  const alreadyLoadedMerchantIds = new Set([...pending, ...managed].map((merchant) => merchant.id))
  const missingReviewMerchantIds = reviewMerchantIds.filter((merchantId) => !alreadyLoadedMerchantIds.has(merchantId))
  const { data: reviewMerchantsData } = missingReviewMerchantIds.length
    ? await adminSupabase.from("merchants").select("*").in("id", missingReviewMerchantIds)
    : { data: [] as MerchantRow[] }
  const reviewMerchants = ((reviewMerchantsData as MerchantRow[] | null) || []) as MerchantRow[]
  const merchantById = new Map([...pending, ...managed, ...reviewMerchants].map((merchant) => [merchant.id, merchant]))

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
  const managedPageCount = Math.max(1, Math.ceil(managedTotalCount / MANAGED_MERCHANT_PAGE_SIZE))
  const managedPage = requestedManagedPage
  const paginatedManaged = filteredManaged
  const managedEndIndex = managedTotalCount
    ? Math.min(managedRangeStart + paginatedManaged.length, managedTotalCount)
    : 0
  const selectedManagedMerchant =
    paginatedManaged.find((merchant) => merchant.id === resolvedSearchParams.selected) ||
    paginatedManaged[0] ||
    null
  const selectedPackageStats = selectedManagedMerchant
    ? packageStatsMap.get(selectedManagedMerchant.id) || {
        total: 0,
        pending: 0,
        approved: 0,
        rejected: 0,
        draft: 0,
        inactive: 0,
      }
    : null
  const selectedDeletionRequest = selectedManagedMerchant
    ? pendingDeletionRequestMap.get(getDeletionRequestKey({ merchantId: selectedManagedMerchant.id }) || "") || null
    : null
  const totalMerchantCount = activeMerchantCount + inactiveMerchantCount + deletedMerchantCount + rejectedMerchantCount
  const activeMerchantRatio = totalMerchantCount ? Math.round((activeMerchantCount / totalMerchantCount) * 1000) / 10 : 0
  const inactiveMerchantRatio = totalMerchantCount ? Math.round((inactiveMerchantCount / totalMerchantCount) * 1000) / 10 : 0
  const deletionRequestRatio = totalMerchantCount ? Math.round((pendingDeletionQueue.length / totalMerchantCount) * 1000) / 10 : 0

  return (
    <main className="min-h-screen bg-[#fbfaf8] px-4 py-6 sm:px-6 lg:px-9">
      <div className="mx-auto max-w-[1680px] space-y-6">
        <section>
          <span className="inline-flex rounded-full border border-[#efd8c8] bg-[#fff7f1] px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.28em] text-orange-600">
            Admin Workspace
          </span>
          <h1 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-slate-950 sm:text-4xl">Merchants Directory</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">Kelola dan monitor semua merchant dalam sistem RedFeng.</p>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
          {[
            { label: "Total Merchant", value: totalMerchantCount, note: "Semua merchant terdaftar", tone: "text-slate-950", chip: "bg-sky-50 text-sky-600" },
            { label: "Aktif", value: activeMerchantCount, note: `${activeMerchantRatio}% dari total`, tone: "text-emerald-600", chip: "bg-emerald-50 text-emerald-600" },
            { label: "Nonaktif", value: inactiveMerchantCount, note: `${inactiveMerchantRatio}% dari total`, tone: "text-orange-600", chip: "bg-orange-50 text-orange-600" },
            { label: "Temporary Block", value: inactiveMerchantCount, note: "Merchant diblok sementara", tone: "text-orange-600", chip: "bg-orange-50 text-orange-600" },
            { label: "Deletion Request", value: pendingDeletionQueue.length, note: `${deletionRequestRatio}% dari total`, tone: "text-rose-600", chip: "bg-rose-50 text-rose-600" },
            { label: "Anomalis", value: orphanMerchantProfiles.length, note: "Perlu ditindaklanjuti", tone: "text-violet-600", chip: "bg-violet-50 text-violet-600" },
          ].map((item) => (
            <div key={item.label} className="rounded-[18px] border border-[#eee3d9] bg-white px-5 py-5 shadow-[0_14px_34px_rgba(15,23,42,0.04)]">
              <div className="flex items-start gap-3">
                <span className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-black ${item.chip}`}>{item.label[0]}</span>
                <div>
                  <p className="text-sm font-medium text-slate-500">{item.label}</p>
                  <p className={`mt-1 text-3xl font-semibold tracking-[-0.04em] ${item.tone}`}>{item.value}</p>
                  <p className="mt-1 text-xs text-slate-400">{item.note}</p>
                </div>
              </div>
            </div>
          ))}
        </section>

        <section className="rounded-[20px] border border-[#eee3d9] bg-white p-4 shadow-[0_14px_34px_rgba(15,23,42,0.04)]">
          {merchantReviewRequestsUnavailable ? (
            <div className="mb-4 rounded-[20px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-7 text-amber-800">
              Fitur review manager merchant belum aktif di database production karena migration `merchant_review_requests` belum dijalankan di Supabase.
            </div>
          ) : null}
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

            <div>
              <label className="sr-only">Kota</label>
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
            </div>

            <div>
              <label className="sr-only">Queue paket</label>
              <select
                name="queue"
                defaultValue={queueFilter}
                className="w-full rounded-[14px] border border-[#eadfd5] bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-orange-300 focus:ring-4 focus:ring-orange-100"
              >
                <option value="all">Akses Paket: Semua</option>
                <option value="with_pending">Punya paket pending</option>
                <option value="without_pending">Tanpa paket pending</option>
              </select>
            </div>

            <div>
              <label className="sr-only">Urutkan</label>
              <select
                name="sort"
                defaultValue={sortMode}
                className="w-full rounded-[14px] border border-[#eadfd5] bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-orange-300 focus:ring-4 focus:ring-orange-100"
              >
                <option value="pending_desc">Workspace: Semua</option>
                <option value="total_desc">Total paket terbanyak</option>
                <option value="newest">Merchant terbaru</option>
              </select>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button className="inline-flex items-center justify-center rounded-[14px] bg-orange-500 px-5 py-3 text-sm font-semibold text-white shadow-[0_12px_28px_rgba(249,115,22,0.18)] transition hover:bg-orange-600">
                Terapkan
              </button>
              <Link
                href="/admin/merchants"
                className="inline-flex items-center justify-center rounded-[14px] border border-[#eadfd5] bg-white px-5 py-3 text-sm font-semibold text-slate-600 transition hover:border-orange-200 hover:text-orange-600"
              >
                Reset Filter
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
                              {MERCHANT_REVIEW_BUTTONS.approve}
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

        <section className="grid gap-5 2xl:grid-cols-[minmax(0,1fr)_440px]">
          <div className="overflow-hidden rounded-[20px] border border-[#eee3d9] bg-white shadow-[0_18px_44px_rgba(15,23,42,0.05)]">
            <div className="overflow-x-auto">
              <table className="min-w-[980px] w-full border-separate border-spacing-0 text-left">
                <thead>
                  <tr className="text-xs font-semibold text-slate-500">
                    <th className="border-b border-[#f0e6dd] px-5 py-4"><span className="sr-only">Pilih</span></th>
                    <th className="border-b border-[#f0e6dd] px-4 py-4">Merchant</th>
                    <th className="border-b border-[#f0e6dd] px-4 py-4">Company</th>
                    <th className="border-b border-[#f0e6dd] px-4 py-4">Status</th>
                    <th className="border-b border-[#f0e6dd] px-4 py-4">Paket</th>
                    <th className="border-b border-[#f0e6dd] px-4 py-4">Akses Paket</th>
                    <th className="border-b border-[#f0e6dd] px-4 py-4">Terakhir Update</th>
                    <th className="border-b border-[#f0e6dd] px-5 py-4">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {!paginatedManaged.length ? (
                    <tr>
                      <td colSpan={8} className="px-5 py-14 text-center">
                        <h2 className="text-xl font-semibold text-slate-950">Belum ada merchant aktif</h2>
                        <p className="mt-2 text-sm text-slate-500">Tidak ada merchant managed yang cocok dengan filter saat ini.</p>
                      </td>
                    </tr>
                  ) : (
                    paginatedManaged.map((merchant) => {
                      const stats = packageStatsMap.get(merchant.id) || {
                        total: 0,
                        pending: 0,
                        approved: 0,
                        rejected: 0,
                        draft: 0,
                        inactive: 0,
                      }
                      const isSelected = selectedManagedMerchant?.id === merchant.id
                      return (
                        <tr key={merchant.id} className={isSelected ? "bg-[#fff7ef] outline outline-1 outline-orange-300" : "bg-white"}>
                          <td className="border-b border-[#f4eee7] px-5 py-4">
                            <span className={`inline-flex h-4 w-4 rounded border ${isSelected ? "border-orange-500 bg-orange-500" : "border-[#eadfd5] bg-white"}`} />
                          </td>
                          <td className="border-b border-[#f4eee7] px-4 py-4">
                            <div className="flex items-center gap-3">
                              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
                                {getMerchantInitials(merchant)}
                              </span>
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-slate-900">{merchant.brand_name || merchant.company_name || "Merchant tanpa nama"}</p>
                                <p className="mt-1 max-w-[220px] truncate text-xs text-slate-500">{fieldValue(merchant.email)}</p>
                              </div>
                            </div>
                          </td>
                          <td className="border-b border-[#f4eee7] px-4 py-4 text-sm font-medium text-slate-700">{fieldValue(merchant.company_name)}</td>
                          <td className="border-b border-[#f4eee7] px-4 py-4">
                            <span className={`inline-flex rounded-[9px] border px-2.5 py-1 text-xs font-semibold ${getStatusBadge(merchant.verification_status)}`}>
                              {getStatusLabel(merchant.verification_status)}
                            </span>
                          </td>
                          <td className="border-b border-[#f4eee7] px-4 py-4 text-sm font-semibold text-slate-700">{stats.total} Total</td>
                          <td className="border-b border-[#f4eee7] px-4 py-4">
                            <div className="grid grid-cols-2 gap-1.5 text-[11px] font-semibold">
                              <span className="rounded-lg bg-emerald-50 px-2 py-1 text-emerald-700">{stats.approved} Approved</span>
                              <span className="rounded-lg bg-slate-50 px-2 py-1 text-slate-500">{stats.pending} Pending</span>
                              <span className="rounded-lg bg-orange-50 px-2 py-1 text-orange-600">{stats.rejected} Rejected</span>
                              <span className="rounded-lg bg-slate-50 px-2 py-1 text-slate-500">{stats.draft} Draft</span>
                            </div>
                          </td>
                          <td className="border-b border-[#f4eee7] px-4 py-4 text-xs leading-5 text-slate-500">{formatAdminDateTime(merchant.created_at)}</td>
                          <td className="border-b border-[#f4eee7] px-5 py-4">
                            <Link
                              href={buildMerchantSelectionHref(resolvedSearchParams, merchant.id)}
                              className="inline-flex items-center justify-center rounded-[12px] border border-orange-200 bg-white px-5 py-2.5 text-xs font-semibold text-orange-600 transition hover:bg-orange-50"
                            >
                              Detail
                            </Link>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
            <div className="flex flex-col gap-3 border-t border-[#f0e6dd] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-slate-500">
                Menampilkan {filteredManaged.length ? managedRangeStart + 1 : 0} - {managedEndIndex} dari {managedTotalCount} data
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href={buildMerchantPageHref(resolvedSearchParams, Math.max(1, managedPage - 1))}
                  aria-disabled={managedPage <= 1}
                  className={`inline-flex h-10 items-center justify-center rounded-[12px] border px-4 text-sm font-semibold transition ${
                    managedPage <= 1
                      ? "pointer-events-none border-slate-200 bg-slate-50 text-slate-300"
                      : "border-[#eadfd5] bg-white text-slate-600 hover:border-orange-200 hover:text-orange-600"
                  }`}
                >
                  Prev
                </Link>
                <span className="inline-flex h-10 min-w-10 items-center justify-center rounded-[12px] border border-orange-300 bg-white px-3 text-sm font-semibold text-orange-600">
                  {managedPage}
                </span>
                <span className="px-2 text-sm text-slate-400">/ {managedPageCount}</span>
                <Link
                  href={buildMerchantPageHref(resolvedSearchParams, Math.min(managedPageCount, managedPage + 1))}
                  aria-disabled={managedPage >= managedPageCount}
                  className={`inline-flex h-10 items-center justify-center rounded-[12px] border px-4 text-sm font-semibold transition ${
                    managedPage >= managedPageCount
                      ? "pointer-events-none border-slate-200 bg-slate-50 text-slate-300"
                      : "border-[#eadfd5] bg-white text-slate-600 hover:border-orange-200 hover:text-orange-600"
                  }`}
                >
                  Next
                </Link>
              </div>
            </div>
          </div>

          <aside className="rounded-[20px] border border-[#eee3d9] bg-white p-5 shadow-[0_18px_44px_rgba(15,23,42,0.05)] 2xl:sticky 2xl:top-6 2xl:max-h-[calc(100vh-48px)] 2xl:overflow-auto">
            {selectedManagedMerchant && selectedPackageStats ? (
              <div className="space-y-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="text-2xl font-semibold tracking-[-0.04em] text-slate-950">{selectedManagedMerchant.brand_name || selectedManagedMerchant.company_name || "Merchant tanpa nama"}</h2>
                      <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getStatusBadge(selectedManagedMerchant.verification_status)}`}>
                        {getStatusLabel(selectedManagedMerchant.verification_status)}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-slate-500">ID Merchant: {formatInternalUserCode(selectedManagedMerchant.id)}</p>
                    <p className="mt-1 text-sm text-slate-500">Terdaftar: {formatAdminDateTime(selectedManagedMerchant.created_at)}</p>
                  </div>
                  <Link href={buildMerchantPageHref(resolvedSearchParams, managedPage)} className="text-2xl leading-none text-slate-400 hover:text-slate-700">x</Link>
                </div>

                <div className="flex gap-7 border-b border-[#f0e6dd] text-sm font-semibold text-slate-500">
                  <span className="border-b-2 border-orange-500 px-1 pb-4 text-orange-600">Detail</span>
                  <Link href={`/admin/merchants/${selectedManagedMerchant.id}`} className="px-1 pb-4 transition hover:text-orange-600">Paket</Link>
                  <span className="px-1 pb-4">Aktivitas</span>
                  <Link href="/admin/audit-log" className="px-1 pb-4 transition hover:text-orange-600">Audit Log</Link>
                </div>

                <div className="rounded-[18px] border border-[#eee3d9] p-5">
                  <h3 className="text-sm font-semibold text-slate-950">Informasi Perusahaan</h3>
                  <div className="mt-5 grid gap-4 sm:grid-cols-2">
                    {[
                      { label: "Company", value: fieldValue(selectedManagedMerchant.company_name) },
                      { label: "NPWP Badan Usaha", value: fieldValue(selectedManagedMerchant.npwp_company) },
                      { label: "Email", value: fieldValue(selectedManagedMerchant.email) },
                      { label: "PIC", value: fieldValue(selectedManagedMerchant.pic_name) },
                      { label: "NIB", value: fieldValue(selectedManagedMerchant.nib) },
                      { label: "PIC Position", value: fieldValue(selectedManagedMerchant.pic_position) },
                    ].map((item) => (
                      <div key={item.label} className="min-w-0">
                        <p className="text-xs font-medium text-slate-400">{item.label}</p>
                        <p className="mt-1 break-words text-sm font-semibold text-slate-700">{item.value}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-[18px] border border-[#eee3d9] p-5">
                  <h3 className="text-sm font-semibold text-slate-950">Status & Akses Paket</h3>
                  <div className="mt-5 grid gap-x-8 gap-y-3 text-sm sm:grid-cols-2">
                    <p className="text-slate-500">Status Merchant <span className="float-right font-semibold text-slate-800">{getStatusLabel(selectedManagedMerchant.verification_status)}</span></p>
                    <p className="text-slate-500">Total Paket <span className="float-right font-semibold text-slate-800">{selectedPackageStats.total}</span></p>
                    <p className="text-slate-500">Temporary Block <span className="float-right font-semibold text-slate-800">{selectedManagedMerchant.verification_status === "inactive" ? "Ya" : "-"}</span></p>
                    <p className="text-slate-500">Approved <span className="float-right font-semibold text-emerald-600">{selectedPackageStats.approved}</span></p>
                    <p className="text-slate-500">Deletion Request <span className="float-right font-semibold text-rose-500">{selectedDeletionRequest ? "Ada" : "-"}</span></p>
                    <p className="text-slate-500">Pending Review <span className="float-right font-semibold text-orange-600">{selectedPackageStats.pending}</span></p>
                    <p className="text-slate-500">Draft <span className="float-right font-semibold text-slate-700">{selectedPackageStats.draft}</span></p>
                    <p className="text-slate-500">Inactive <span className="float-right font-semibold text-slate-700">{selectedPackageStats.inactive}</span></p>
                  </div>
                </div>

                <div className="rounded-[18px] border border-[#eee3d9] p-5">
                  <h3 className="text-sm font-semibold text-slate-950">Aksi Cepat</h3>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <Link href={`/admin/merchants/${selectedManagedMerchant.id}/profile`} className="inline-flex items-center justify-center rounded-[14px] border border-[#eadfd5] bg-white px-4 py-2.5 text-xs font-semibold text-slate-600 transition hover:border-orange-200 hover:text-orange-600">
                      Lihat Profil Merchant
                    </Link>
                    <Link href={`/admin/merchants/${selectedManagedMerchant.id}`} className="inline-flex items-center justify-center rounded-[14px] border border-orange-200 bg-orange-50 px-4 py-2.5 text-xs font-semibold text-orange-600 transition hover:bg-orange-100">
                      Buka Paket Merchant
                    </Link>
                    <Link href="/admin/audit-log" className="inline-flex items-center justify-center rounded-[14px] border border-[#eadfd5] bg-white px-4 py-2.5 text-xs font-semibold text-slate-600 transition hover:border-orange-200 hover:text-orange-600">
                      Lihat Audit Log
                    </Link>
                    {selectedManagedMerchant.verification_status === "approved" && canExecuteAdminOps ? (
                      <MerchantReasonActionCard merchantId={selectedManagedMerchant.id} variant="deactivate" compact />
                    ) : null}
                    {selectedManagedMerchant.verification_status === "inactive" && canExecuteAdminOps ? (
                      <form action={reactivateMerchant}>
                        <input type="hidden" name="merchantId" value={selectedManagedMerchant.id} />
                        <button className="inline-flex items-center justify-center rounded-[14px] border border-emerald-300 bg-white px-4 py-2.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-50">
                          Aktifkan Merchant
                        </button>
                      </form>
                    ) : null}
                    {selectedManagedMerchant.verification_status !== "deleted" && canRequestMerchantDeletion && !selectedDeletionRequest ? (
                      <MerchantReasonActionCard merchantId={selectedManagedMerchant.id} variant="delete" compact />
                    ) : null}
                  </div>
                </div>

                {selectedDeletionRequest ? (
                  <div className="rounded-[18px] border border-amber-200 bg-amber-50 p-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-700">Deletion request aktif</p>
                    <p className="mt-3 text-sm leading-6 text-slate-700">{selectedDeletionRequest.reason}</p>
                    {selectedDeletionRequest.status === "pending" && canReviewMerchantDeletion ? (
                      <div className="mt-4 grid gap-3">
                        <form action={approveMerchantDeletion} className="space-y-3">
                          <input type="hidden" name="requestId" value={selectedDeletionRequest.id} />
                          <textarea name="reviewNote" placeholder="Alasan final penghapusan..." className="min-h-[88px] w-full rounded-[14px] border border-emerald-200 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100" />
                          <ConfirmSubmitButton confirmMessage="Yakin ingin menyetujui penghapusan merchant ini?" pendingLabel="Sedang menghapus..." className="w-full rounded-[14px] bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700">
                            {MERCHANT_REVIEW_BUTTONS.approve}
                          </ConfirmSubmitButton>
                        </form>
                        <form action={rejectMerchantDeletion} className="space-y-3">
                          <input type="hidden" name="requestId" value={selectedDeletionRequest.id} />
                          <textarea name="reviewNote" placeholder="Alasan operations manager menolak..." className="min-h-[88px] w-full rounded-[14px] border border-rose-200 bg-white px-4 py-3 text-sm outline-none focus:border-rose-400 focus:ring-4 focus:ring-rose-100" />
                          <ConfirmSubmitButton confirmMessage="Tolak pengajuan penghapusan merchant ini?" pendingLabel="Sedang menolak..." className="w-full rounded-[14px] border border-rose-300 bg-white px-4 py-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-50">
                            {MERCHANT_REVIEW_BUTTONS.reject}
                          </ConfirmSubmitButton>
                        </form>
                      </div>
                    ) : null}
                    {selectedDeletionRequest.status === "manager_rejected" && canRequestMerchantDeletion && currentUserId === selectedDeletionRequest.requested_by ? (
                      <form action={finalizeMerchantDeletionCancellation} className="mt-4">
                        <input type="hidden" name="requestId" value={selectedDeletionRequest.id} />
                        <ConfirmSubmitButton confirmMessage="Tutup pengajuan penghapusan merchant ini sebagai dibatalkan?" pendingLabel="Sedang menutup pengajuan..." className="w-full rounded-[14px] border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
                          {MERCHANT_REVIEW_BUTTONS.cancel}
                        </ConfirmSubmitButton>
                      </form>
                    ) : null}
                  </div>
                ) : null}

                <div className="rounded-[18px] border border-[#eee3d9] p-5">
                  <h3 className="text-sm font-semibold text-slate-950">Catatan Admin</h3>
                  <p className="mt-4 text-sm leading-6 text-slate-500">
                    {selectedManagedMerchant.rejection_reason || "Merchant aktif dan tidak memiliki catatan khusus."}
                  </p>
                  <div className="mt-5 border-t border-[#f0e6dd] pt-4 text-xs text-slate-500">
                    Terakhir updated oleh <span className="font-semibold text-slate-800">Admin Red Feng</span>
                    <span className="float-right">{formatAdminDateTime(selectedManagedMerchant.created_at)}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-14 text-center">
                <h2 className="text-xl font-semibold text-slate-950">Pilih merchant</h2>
                <p className="mt-2 text-sm text-slate-500">Detail merchant akan tampil di panel ini.</p>
              </div>
            )}
          </aside>
        </section>
      </div>
    </main>
  )
}
