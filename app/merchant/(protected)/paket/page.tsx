import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { formatTravelStyleLabel } from "@/lib/travelStyles"

type PackageRow = {
  id: string
  title: string | null
  slug: string | null
  price_adult: number | null
  status: string | null
  travel_style: string | null
  created_at: string | null
}

const packageMenus = [
  { label: "Semua Paket", key: "all" },
  { label: "Tambah Paket", key: "add", href: "/merchant/paket/tambah" },
  { label: "Draft Paket", key: "draft" },
  { label: "Paket Aktif", key: "approved" },
  { label: "Paket Nonaktif", key: "inactive" },
  { label: "Paket Pending Review", key: "pending" },
  { label: "Paket Ditolak", key: "rejected" },
]

function formatMoney(value: number | null) {
  return `Rp ${(value ?? 0).toLocaleString("id-ID")}`
}

function formatStatus(value: string | null) {
  const status = (value || "").toLowerCase()
  if (status === "approved") return "Aktif"
  if (status === "pending") return "Pending Review"
  if (status === "rejected") return "Ditolak"
  if (status === "draft") return "Draft"
  if (status === "inactive") return "Nonaktif"
  return value || "-"
}

function statusClasses(value: string | null) {
  const status = (value || "").toLowerCase()
  if (status === "approved") return "bg-emerald-50 text-emerald-700"
  if (status === "pending") return "bg-amber-50 text-amber-700"
  if (status === "rejected") return "bg-rose-50 text-rose-700"
  if (status === "draft") return "bg-slate-100 text-slate-700"
  return "bg-slate-100 text-slate-700"
}

export default async function MerchantPackagePage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const params = await searchParams
  const activeStatus = params.status || "all"
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data: merchant } = await supabase
    .from("merchants")
    .select("id")
    .eq("user_id", user.id)
    .single()

  if (!merchant) return <div className="p-10">Data merchant tidak ditemukan.</div>

  let query = supabase
    .from("packages")
    .select("id, title, slug, price_adult, status, travel_style, created_at")
    .eq("merchant_id", merchant.id)
    .order("created_at", { ascending: false })

  if (activeStatus !== "all" && activeStatus !== "add") {
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

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)] p-6 md:p-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Kelola Paket</h1>
        <p className="mt-1 text-sm text-slate-500">Kelola paket merchant berdasarkan status dan kesiapan publikasi.</p>
      </div>

      <div className="mb-8 grid gap-4 md:grid-cols-4">
        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Total Paket</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{summary.all}</p>
        </div>
        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Aktif</p>
          <p className="mt-2 text-3xl font-bold text-emerald-700">{summary.approved}</p>
        </div>
        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Pending Review</p>
          <p className="mt-2 text-3xl font-bold text-amber-700">{summary.pending}</p>
        </div>
        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Draft</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{summary.draft}</p>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap gap-3">
        {packageMenus.map((menu) => {
          if (menu.key === "add" && menu.href) {
            return (
              <Link
                key={menu.key}
                href={menu.href}
                className="rounded-full bg-orange-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-orange-600"
              >
                {menu.label}
              </Link>
            )
          }

          const active = activeStatus === menu.key || (menu.key === "all" && activeStatus === "all")
          return (
            <Link
              key={menu.key}
              href={`/merchant/paket${menu.key === "all" ? "" : `?status=${menu.key}`}`}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                active
                  ? "bg-slate-900 text-white"
                  : "border border-slate-300 bg-white text-slate-700 hover:border-orange-300 hover:text-orange-600"
              }`}
            >
              {menu.label}
            </Link>
          )
        })}
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
          Gagal memuat data paket merchant.
        </div>
      ) : packages.length === 0 ? (
        <div className="rounded-2xl border bg-white p-5 text-slate-600 shadow-sm">
          Belum ada paket pada kategori ini.
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {packages.map((pkg) => (
            <article key={pkg.id} className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">{pkg.title || "Paket tanpa judul"}</h2>
                  <p className="mt-1 text-sm text-slate-500">{formatTravelStyleLabel(pkg.travel_style)}</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClasses(pkg.status)}`}>
                  {formatStatus(pkg.status)}
                </span>
              </div>
              <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-400">Harga Dewasa</p>
                  <p className="mt-1 text-xl font-bold text-slate-900">{formatMoney(pkg.price_adult)}</p>
                </div>
                {pkg.slug ? (
                  <Link
                    href={`/packages/${encodeURIComponent(pkg.slug)}`}
                    className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-orange-300 hover:text-orange-600"
                  >
                    Lihat Paket
                  </Link>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
