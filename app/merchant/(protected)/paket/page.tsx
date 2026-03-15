import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { formatTravelStyleLabel } from "@/lib/travelStyles"
import { deletePackage, pullPackageToDraft, togglePackageStatus } from "./actions"

type PackageRow = {
  id: string
  title: string | null
  slug: string | null
  price_adult: number | null
  status: string | null
  travel_style: string | null
  created_at: string | null
  updated_at: string | null
  rejection_reason: string | null
}

const packageMenus = [
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
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data: merchant } = await supabase.from("merchants").select("id").eq("user_id", user.id).single()

  if (!merchant) return <div className="p-10">Data merchant tidak ditemukan.</div>

  let query = supabase
    .from("packages")
    .select("id, title, slug, price_adult, status, travel_style, created_at, updated_at, rejection_reason")
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
    { label: "Paket Aktif", value: summary.approved, note: "Sudah live untuk customer." },
    { label: "Pending Review", value: summary.pending, note: "Sedang dinilai admin." },
    { label: "Draft & Ditolak", value: summary.draft + summary.rejected, note: "Butuh perapihan lanjutan." },
  ]

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#fff8f1_0%,#f7f1e8_38%,#f3eee7_100%)] p-6 md:p-10">
      <section className="overflow-hidden rounded-[32px] bg-[linear-gradient(135deg,#9a3412_0%,#ea580c_45%,#fb923c_100%)] text-white shadow-[0_32px_90px_-40px_rgba(154,52,18,0.85)]">
        <div className="grid gap-6 px-7 py-8 lg:grid-cols-[minmax(0,1.65fr)_420px] lg:px-10 lg:py-10">
          <div>
            <span className="inline-flex rounded-full border border-white/30 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-orange-50">
              Merchant Packages
            </span>
            <h1 className="mt-4 max-w-3xl text-3xl font-semibold leading-tight md:text-5xl">
              Atur seluruh siklus paket merchant dari draft sampai live.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-orange-50/92 md:text-base">
              Pantau kesehatan listing, status review admin, dan tindakan cepat untuk mengaktifkan, merevisi, atau menonaktifkan paket.
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
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">Total Paket</p>
          <p className="mt-3 text-3xl font-semibold text-slate-950">{summary.all}</p>
        </div>
        <div className="rounded-[28px] border border-orange-100/70 bg-white/90 p-5 shadow-[0_24px_60px_-40px_rgba(15,23,42,0.35)] backdrop-blur">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">Aktif</p>
          <p className="mt-3 text-3xl font-semibold text-emerald-700">{summary.approved}</p>
        </div>
        <div className="rounded-[28px] border border-orange-100/70 bg-white/90 p-5 shadow-[0_24px_60px_-40px_rgba(15,23,42,0.35)] backdrop-blur">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">Pending Review</p>
          <p className="mt-3 text-3xl font-semibold text-amber-700">{summary.pending}</p>
        </div>
        <div className="rounded-[28px] border border-orange-100/70 bg-white/90 p-5 shadow-[0_24px_60px_-40px_rgba(15,23,42,0.35)] backdrop-blur">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">Draft</p>
          <p className="mt-3 text-3xl font-semibold text-slate-950">{summary.draft}</p>
        </div>
      </section>

      <section className="mt-8 rounded-[32px] border border-orange-100/80 bg-white/90 p-6 shadow-[0_28px_70px_-45px_rgba(15,23,42,0.35)] backdrop-blur">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <span className="inline-flex rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-orange-700">
              Package Workflow
            </span>
            <h2 className="mt-4 text-2xl font-semibold text-slate-950">Kelola pipeline paket merchant</h2>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600">
              Pilih kategori listing yang ingin Anda kerjakan, lalu lanjutkan dengan edit, aktivasi, atau submit ulang sesuai status masing-masing paket.
            </p>
          </div>
          <div className="rounded-[28px] border border-orange-100 bg-[linear-gradient(180deg,#fffaf5_0%,#fff4ea_100%)] p-5 xl:w-[320px]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">Quick Summary</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              <div>
                <p className="text-xs text-slate-500">Draft</p>
                <p className="mt-1 text-2xl font-semibold text-slate-950">{summary.draft}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Ditolak</p>
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
          <div className="mt-6 rounded-[24px] border border-red-200 bg-red-50 p-4 text-red-700">Gagal memuat data paket merchant.</div>
        ) : packages.length === 0 ? (
          <div className="mt-6 rounded-[24px] border border-slate-200 bg-[linear-gradient(180deg,#fffaf5_0%,#f8fafc_100%)] p-5 text-slate-600">
            Belum ada paket pada kategori ini.
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
                    <h2 className="text-lg font-semibold text-slate-950">{pkg.title || "Paket tanpa judul"}</h2>
                    <p className="mt-1 text-sm text-slate-500">{formatTravelStyleLabel(pkg.travel_style)}</p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClasses(pkg.status)}`}>
                    {formatStatus(pkg.status)}
                  </span>
                </div>

                {pkg.status === "rejected" && (
                  <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-rose-600">Alasan Admin</p>
                    <p className="mt-2 text-sm leading-6 text-rose-800">
                      {pkg.rejection_reason || "Paket ditolak tanpa catatan tambahan dari admin."}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-rose-800">
                      Perbaiki paket lewat tombol edit, lalu kirim ulang ke review admin. Paket yang ditolak tidak bisa langsung diaktifkan.
                    </p>
                  </div>
                )}

                {pkg.status === "pending" && (
                  <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Status Review</p>
                    <p className="mt-2 text-sm font-medium text-amber-900">Sedang direview admin</p>
                    <p className="mt-2 text-sm text-amber-800">Tanggal submit: {formatDate(pkg.updated_at || pkg.created_at)}</p>
                    <p className="mt-2 text-sm leading-6 text-amber-800">
                      Paket belum tampil ke customer selama proses review. Tarik ke draft jika Anda ingin membatalkan review dan melanjutkan revisi.
                    </p>
                  </div>
                )}

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
                  <div className="rounded-[22px] bg-[linear-gradient(180deg,#fffaf5_0%,#ffffff_100%)] p-4">
                    <p className="text-xs uppercase tracking-wide text-slate-400">Harga Dewasa</p>
                    <p className="mt-1 text-xl font-bold text-slate-900">{formatMoney(pkg.price_adult)}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {pkg.status === "pending" && (
                      <form action={pullPackageToDraft}>
                        <input type="hidden" name="package_id" value={pkg.id} />
                        <input type="hidden" name="return_status" value={activeStatus} />
                        <button
                          type="submit"
                          className="rounded-xl border border-amber-200 px-4 py-2 text-sm font-medium text-amber-700 transition hover:bg-amber-50"
                        >
                          Tarik ke Draft
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
                          Aktifkan Paket
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
                          Nonaktifkan Paket
                        </button>
                      </form>
                    )}
                    <Link
                      href={`/merchant/paket/${pkg.id}/edit`}
                      className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-orange-300 hover:text-orange-600"
                    >
                      Edit Paket
                    </Link>
                    <form action={deletePackage}>
                      <input type="hidden" name="package_id" value={pkg.id} />
                      <input type="hidden" name="return_status" value={activeStatus} />
                      <button
                        type="submit"
                        className="rounded-xl border border-rose-200 px-4 py-2 text-sm font-medium text-rose-700 transition hover:bg-rose-50"
                      >
                        Hapus Paket
                      </button>
                    </form>
                    {pkg.slug ? (
                      <Link
                        href={`/packages/${encodeURIComponent(pkg.slug)}`}
                        className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-orange-300 hover:text-orange-600"
                      >
                        Lihat Paket
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
