import Link from "next/link"
import { notFound } from "next/navigation"
import { createAdminClient } from "@/lib/supabase/admin"
import AdminMerchantPackageBulkClient from "./AdminMerchantPackageBulkClient"

type PackageRow = {
  id: string
  title: string | null
  status: string | null
  currency: string | null
  price_adult: number | null
  created_at: string | null
  reviewed_at: string | null
  rejection_reason: string | null
}

const FILTERS = [
  { key: "all", label: "Semua Paket" },
  { key: "pending", label: "Pending Review" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" },
  { key: "draft", label: "Draft" },
  { key: "inactive", label: "Inactive" },
] as const

export default async function AdminMerchantPackagesPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams?: Promise<{ status?: string; q?: string; sort?: string; success?: string; error?: string }>
}) {
  const { id } = await params
  const resolvedSearchParams = (await searchParams) || {}
  const activeFilter = FILTERS.some((item) => item.key === resolvedSearchParams.status) ? resolvedSearchParams.status || "all" : "all"
  const query = (resolvedSearchParams.q || "").trim().toLowerCase()
  const sortMode = (resolvedSearchParams.sort || "created_desc").trim().toLowerCase()
  const supabase = createAdminClient()

  const { data: merchant } = await supabase
    .from("merchants")
    .select("id, brand_name, company_name, email, city, province, verification_status, onboarding_completed")
    .eq("id", id)
    .maybeSingle()

  if (!merchant) {
    notFound()
  }

  const { data: packagesData } = await supabase
    .from("packages")
    .select("id, title, status, currency, price_adult, created_at, reviewed_at, rejection_reason")
    .eq("merchant_id", id)
    .order("created_at", { ascending: false })

  const packages = (packagesData as PackageRow[] | null) || []
  const filteredPackages = packages
    .filter((pkg) => (activeFilter === "all" ? true : pkg.status === activeFilter))
    .filter((pkg) => {
      if (!query) return true
      return [pkg.title || "", pkg.id, pkg.rejection_reason || ""].some((value) => value.toLowerCase().includes(query))
    })
    .sort((a, b) => {
      if (sortMode === "reviewed_desc") {
        const timeB = b.reviewed_at ? new Date(b.reviewed_at).getTime() : 0
        const timeA = a.reviewed_at ? new Date(a.reviewed_at).getTime() : 0
        if (timeB !== timeA) return timeB - timeA
      } else if (sortMode === "title_asc") {
        return (a.title || "").localeCompare(b.title || "")
      } else {
        const timeB = b.created_at ? new Date(b.created_at).getTime() : 0
        const timeA = a.created_at ? new Date(a.created_at).getTime() : 0
        if (timeB !== timeA) return timeB - timeA
      }
      return (a.title || "").localeCompare(b.title || "")
    })

  const statusCounts = {
    all: packages.length,
    pending: packages.filter((pkg) => pkg.status === "pending").length,
    approved: packages.filter((pkg) => pkg.status === "approved").length,
    rejected: packages.filter((pkg) => pkg.status === "rejected").length,
    draft: packages.filter((pkg) => pkg.status === "draft").length,
    inactive: packages.filter((pkg) => pkg.status === "inactive").length,
  }

  const merchantName = merchant.brand_name || merchant.company_name || merchant.id

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 bg-[linear-gradient(135deg,#fff7ed_0%,#ffffff_45%,#f8fafc_100%)] px-8 py-7">
            <div className="flex flex-wrap items-start justify-between gap-6">
              <div className="max-w-3xl">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orange-500">Merchant Package Workspace</p>
                <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">{merchantName}</h1>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Audit semua paket merchant dalam satu konteks agar admin tidak perlu membedakan paket merchant ini dengan merchant lain.
                </p>
              </div>
              <Link
                href="/admin/merchants"
                className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-800 transition hover:border-orange-300 hover:text-orange-600"
              >
                Kembali ke Merchant Directory
              </Link>
            </div>
          </div>

          <div className="grid gap-4 px-8 py-5 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Email</p>
              <p className="mt-2 text-sm font-medium text-slate-900">{merchant.email || "-"}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Lokasi</p>
              <p className="mt-2 text-sm font-medium text-slate-900">{[merchant.city, merchant.province].filter(Boolean).join(", ") || "-"}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Status Merchant</p>
              <p className="mt-2 text-sm font-medium text-slate-900">{merchant.verification_status || "-"}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Onboarding</p>
              <p className="mt-2 text-sm font-medium text-slate-900">{merchant.onboarding_completed ? "Completed" : "Belum selesai"}</p>
            </div>
          </div>
        </div>

        {resolvedSearchParams.success ? (
          <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-medium text-emerald-800">
            {resolvedSearchParams.success}
          </div>
        ) : null}

        {resolvedSearchParams.error ? (
          <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-medium text-rose-800">
            {resolvedSearchParams.error}
          </div>
        ) : null}

        <div className="mt-6 overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-8 py-6">
            <div className="flex flex-wrap items-center gap-3">
              {FILTERS.map((filter) => {
                const isActive = activeFilter === filter.key
                const nextParams = new URLSearchParams()
                if (filter.key !== "all") nextParams.set("status", filter.key)
                if (resolvedSearchParams.q) nextParams.set("q", resolvedSearchParams.q)
                if (resolvedSearchParams.sort) nextParams.set("sort", resolvedSearchParams.sort)
                const href = nextParams.toString() ? `/admin/merchants/${id}?${nextParams.toString()}` : `/admin/merchants/${id}`
                const count = statusCounts[filter.key]
                return (
                  <Link
                    key={filter.key}
                    href={href}
                    className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition ${
                      isActive
                        ? "border-orange-300 bg-orange-500 text-white shadow-[0_10px_30px_rgba(249,115,22,0.24)]"
                        : "border-slate-200 bg-white text-slate-700 hover:border-orange-200 hover:text-orange-600"
                    }`}
                  >
                    {filter.label}
                    <span className={`rounded-full px-2 py-0.5 text-xs ${isActive ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"}`}>
                      {count}
                    </span>
                  </Link>
                )
              })}
            </div>

            <form className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_240px_auto]">
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Cari paket</label>
                <input
                  type="text"
                  name="q"
                  defaultValue={resolvedSearchParams.q || ""}
                  placeholder="Judul paket, package ID, atau catatan revisi"
                  className="mt-2 w-full rounded-[18px] border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Urutkan</label>
                <select
                  name="sort"
                  defaultValue={sortMode}
                  className="mt-2 w-full rounded-[18px] border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                >
                  <option value="created_desc">Paket terbaru</option>
                  <option value="reviewed_desc">Review terbaru</option>
                  <option value="title_asc">Judul A-Z</option>
                </select>
              </div>

              <div className="flex items-end gap-3">
                {activeFilter !== "all" ? <input type="hidden" name="status" value={activeFilter} /> : null}
                <button className="inline-flex items-center justify-center rounded-[18px] bg-orange-500 px-5 py-3 text-sm font-semibold text-white shadow-[0_12px_28px_rgba(249,115,22,0.22)] transition hover:bg-orange-600">
                  Terapkan
                </button>
                <Link
                  href={`/admin/merchants/${id}${activeFilter !== "all" ? `?status=${activeFilter}` : ""}`}
                  className="inline-flex items-center justify-center rounded-[18px] border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400"
                >
                  Reset
                </Link>
              </div>
            </form>
          </div>

          <div className="p-6">
            {!filteredPackages.length ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-6 py-12 text-center text-slate-500">
                Tidak ada paket pada tab ini.
              </div>
            ) : (
              <AdminMerchantPackageBulkClient packages={filteredPackages} />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
