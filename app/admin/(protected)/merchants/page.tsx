import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { isAdminExecutionRole } from "@/lib/internal-roles"
import { toneClass } from "@/lib/status-tones"
import Link from "next/link"
import ConfirmSubmitButton from "./ConfirmSubmitButton"
import MerchantReasonActionCard from "./MerchantReasonActionCard"
import {
  approveMerchant,
  reactivateMerchant,
  rejectMerchant,
  deleteMerchant,
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
  created_at: string | null
}

type OrphanMerchantProfileRow = {
  id: string
  role: string | null
  email: string | null
  created_at: string | null
}

function fieldValue(value: string | null) {
  return value && value.trim() ? value : "-"
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
  if (status === "inactive") return toneClass("pending", "bordered")
  if (status === "deleted") return toneClass("danger", "bordered")
  return toneClass("neutral", "bordered")
}

function getStatusLabel(status: string | null) {
  if (status === "approved") return "Aktif"
  if (status === "inactive") return "Nonaktif sementara"
  if (status === "deleted") return "Dihapus"
  return status || "Tidak diketahui"
}

function normalizeText(value: string | null) {
  return (value || "").trim().toLowerCase()
}

export default async function AdminMerchantsPage({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string; city?: string; queue?: string; sort?: string }>
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
  const canExecuteAdminOps = isAdminExecutionRole(currentProfile?.role)
  const [{ data: pendingMerchants }, { data: managedMerchants }] = await Promise.all([
    supabase
      .from("merchants")
      .select("*")
      .eq("verification_status", "pending")
      .order("created_at", { ascending: false }),
    supabase
      .from("merchants")
      .select("*")
      .in("verification_status", ["approved", "inactive", "deleted"])
      .order("created_at", { ascending: false }),
  ])

  const pending = (pendingMerchants || []) as MerchantRow[]
  const managed = (managedMerchants || []) as MerchantRow[]
  const activeMerchants = managed.filter((merchant) => merchant.verification_status === "approved")
  const allMerchantIds = [...new Set([...pending, ...managed].map((merchant) => merchant.id))]
  const { data: packagesData } = allMerchantIds.length
    ? await supabase.from("packages").select("merchant_id, status").in("merchant_id", allMerchantIds)
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
    <main className="min-h-screen bg-[linear-gradient(180deg,#fff8f1_0%,#f7f1e8_100%)] px-6 py-8 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-7xl space-y-8">
        <section className="overflow-hidden rounded-[32px] border border-orange-200/60 bg-[linear-gradient(135deg,#7c2d12_0%,#c2410c_38%,#f97316_72%,#fdba74_100%)] px-8 py-10 text-white shadow-[0_30px_100px_rgba(146,64,14,0.18)] sm:px-10">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div className="max-w-3xl">
              <span className="inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.34em] text-orange-50">
                Admin Merchant Review
              </span>
              <h1 className="mt-5 text-4xl font-semibold tracking-tight sm:text-5xl">
                Review merchant baru dan kelola merchant aktif dari satu halaman.
              </h1>
              <p className="mt-4 text-base leading-8 text-orange-50/90">
                Admin dapat approve merchant baru, menonaktifkan merchant aktif sementara, lalu
                menghapus akses merchant tanpa menyentuh data transaksi historis.
              </p>
            </div>
            <div className="grid gap-3 rounded-[24px] border border-white/20 bg-white/10 px-5 py-4 backdrop-blur">
              <div>
                <p className="text-[11px] uppercase tracking-[0.28em] text-orange-100/80">Pending queue</p>
                <p className="mt-2 text-3xl font-semibold text-white">{pending.length}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.28em] text-orange-100/80">Merchant aktif</p>
                <p className="mt-2 text-3xl font-semibold text-white">{activeMerchants.length}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-[0_18px_60px_rgba(15,23,42,0.06)]">
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

            <div className="flex items-end gap-3">
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
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-orange-600">Pending approvals</p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-950">Antrian merchant baru</h2>
            </div>
            <p className="text-sm text-slate-500">{filteredPending.length} merchant cocok dengan filter saat ini.</p>
          </div>

          {!filteredPending.length ? (
            <section className="rounded-[30px] border border-slate-200 bg-white p-10 text-center shadow-[0_18px_60px_rgba(15,23,42,0.06)]">
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
              {filteredPending.map((merchant) => (
                <article
                  key={merchant.id}
                  className="overflow-hidden rounded-[30px] border border-orange-100 bg-white shadow-[0_20px_70px_rgba(15,23,42,0.06)]"
                >
                  <div className="grid gap-0 lg:grid-cols-[1.1fr_0.9fr]">
                    <div className="border-b border-orange-100/80 p-7 lg:border-b-0 lg:border-r">
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
                        <span className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-amber-700">
                          Pending review
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
                      {canExecuteAdminOps ? (
                        <>
                          <div className="rounded-[24px] border border-emerald-200 bg-emerald-50/80 p-5">
                            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-700">
                              Approve merchant
                            </p>
                            <p className="mt-3 text-sm leading-7 text-slate-700">
                              Setujui merchant jika data bisnis dan dokumen sudah sesuai standar internal Red Feng.
                            </p>
                            <form action={approveMerchant} className="mt-5">
                              <input type="hidden" name="merchantId" value={merchant.id} />
                              <button className="inline-flex items-center gap-2 rounded-[18px] bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-[0_12px_28px_rgba(5,150,105,0.22)] transition hover:bg-emerald-700">
                                Approve merchant
                              </button>
                            </form>
                          </div>

                          <div className="rounded-[24px] border border-red-200 bg-red-50/80 p-5">
                            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-red-700">
                              Reject merchant
                            </p>
                            <p className="mt-3 text-sm leading-7 text-slate-700">
                              Berikan alasan yang jelas agar merchant dapat memperbaiki dan mengajukan ulang.
                            </p>
                            <form action={rejectMerchant} className="mt-5 space-y-4">
                              <input type="hidden" name="merchantId" value={merchant.id} />
                              <textarea
                                name="reason"
                                placeholder="Tuliskan alasan penolakan dengan jelas..."
                                required
                                className="min-h-[132px] w-full rounded-[18px] border border-red-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-red-400 focus:ring-4 focus:ring-red-100"
                              />
                              <button className="inline-flex items-center gap-2 rounded-[18px] bg-red-600 px-5 py-3 text-sm font-semibold text-white shadow-[0_12px_28px_rgba(220,38,38,0.22)] transition hover:bg-red-700">
                                Reject merchant
                              </button>
                            </form>
                          </div>
                        </>
                      ) : (
                        <div className="rounded-[24px] border border-sky-200 bg-sky-50 p-5 text-sm leading-7 text-sky-700">
                          Operations Manager dapat memonitor dokumen dan konteks review merchant, tetapi approve / reject tetap dijalankan admin operasional.
                        </div>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </section>
          )}
        </section>

        <section className="space-y-5">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Merchant controls</p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-950">Merchant aktif, nonaktif, dan hapus</h2>
            </div>
            <p className="max-w-2xl text-sm leading-7 text-slate-500">
              Nonaktif sementara memblok akses merchant ke dashboard. Hapus merchant di sini adalah soft delete:
              akses merchant dihentikan, tetapi histori booking dan payout tidak dihapus dari database.
            </p>
          </div>

          {!filteredManaged.length ? (
            <section className="rounded-[30px] border border-slate-200 bg-white p-10 text-center shadow-[0_18px_60px_rgba(15,23,42,0.06)]">
              <h2 className="text-2xl font-semibold text-slate-950">Belum ada merchant aktif</h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                Tidak ada merchant managed yang cocok dengan filter saat ini.
              </p>
            </section>
          ) : (
            <section className="grid gap-6">
              {filteredManaged.map((merchant) => (
                <article
                  key={merchant.id}
                  className="rounded-[26px] border border-[#ece3d7] bg-[#fffdfa] p-6 shadow-[0_16px_44px_rgba(15,23,42,0.05)]"
                >
                  <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_272px] lg:items-start">
                    <div className="min-w-0 flex-1 space-y-4">
                      <div className="flex flex-wrap items-center gap-3">
                        <h3 className="text-2xl font-semibold text-slate-950">
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
                          <div key={item.label} className="rounded-[18px] border border-[#f0e6da] bg-white px-4 py-3">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">{item.label}</p>
                            <p className="mt-2 text-sm font-medium text-slate-800">{item.value}</p>
                          </div>
                        ))}
                      </div>
                      {merchant.rejection_reason ? (
                        <div className="rounded-[18px] border border-[#efe3d5] bg-[#fff7ef] px-4 py-3 text-sm text-slate-600">
                          Catatan admin: {merchant.rejection_reason}
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
                              Profil merchant
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

                    <div className="flex w-full flex-col gap-3 lg:w-[272px] lg:pt-[58px]">
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
                                Aktifkan merchant
                              </button>
                            </form>
                          </div>
                        </div>
                      ) : null}

                      {merchant.verification_status !== "deleted" && canExecuteAdminOps ? (
                        <MerchantReasonActionCard merchantId={merchant.id} variant="delete" />
                      ) : null}
                      {!canExecuteAdminOps ? (
                        <div className="rounded-[24px] border border-sky-200 bg-sky-50 p-5 text-sm leading-7 text-sky-700">
                          Operations Manager hanya memonitor status merchant. Nonaktif, aktifkan kembali, dan hapus akses tetap dijalankan admin operasional.
                        </div>
                      ) : null}
                    </div>
                  </div>
                </article>
              ))}
            </section>
          )}
        </section>

        <section className="space-y-5">
          <div className="flex items-end justify-between gap-4">
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
            <section className="rounded-[30px] border border-slate-200 bg-white p-10 text-center shadow-[0_18px_60px_rgba(15,23,42,0.06)]">
              <h2 className="text-2xl font-semibold text-slate-950">Tidak ada merchant tanpa profil merchant</h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                Semua akun merchant saat ini sudah punya data merchant yang valid.
              </p>
            </section>
          ) : (
            <section className="grid gap-6">
              {orphanMerchantProfiles.map((profile) => (
                <article
                  key={profile.id}
                  className="rounded-[30px] border border-slate-200 bg-white p-7 shadow-[0_20px_70px_rgba(15,23,42,0.06)]"
                >
                  <div className="flex flex-wrap items-start justify-between gap-6">
                    <div className="space-y-4">
                      <div className="flex flex-wrap items-center gap-3">
                        <h3 className="text-2xl font-semibold text-slate-950">{fieldValue(profile.email)}</h3>
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

                    <div className="flex h-full min-w-[320px] flex-col rounded-[24px] border border-red-200 bg-red-50/80 p-5">
                      {canExecuteAdminOps ? (
                        <>
                          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-red-700">
                            Hapus akses merchant
                          </p>
                          <p className="mt-3 text-sm leading-7 text-slate-700">
                            Action ini akan mengubah role akun ini dari `merchant` menjadi `customer` karena data merchant-nya tidak ada.
                          </p>
                          <form action={deleteMerchant} className="mt-4 flex h-full flex-col space-y-4">
                            <input type="hidden" name="profileId" value={profile.id} />
                            <textarea
                              name="reason"
                              placeholder="Alasan pencabutan akses merchant..."
                              required
                              className="min-h-[96px] w-full rounded-[18px] border border-red-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-red-400 focus:ring-4 focus:ring-red-100"
                            />
                            <ConfirmSubmitButton
                              confirmMessage="Yakin ingin menghapus akses merchant ini? Role merchant akan dicabut karena data merchant tidak ditemukan."
                              className="mt-auto inline-flex items-center justify-center gap-2 rounded-[18px] bg-red-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-700"
                            >
                              Hapus akses merchant
                            </ConfirmSubmitButton>
                          </form>
                        </>
                      ) : (
                        <div className="text-sm leading-7 text-sky-700">
                          Operations Manager dapat menandai anomali role merchant, tetapi pencabutan akses tetap dijalankan admin operasional.
                        </div>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </section>
          )}
        </section>
      </div>
    </main>
  )
}
