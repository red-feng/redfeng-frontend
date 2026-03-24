import Link from "next/link"
import { createAdminClient } from "@/lib/supabase/admin"
import { approvePackage, deletePackage, rejectPackage } from "./actions"

type PackageRow = {
  id: string
  merchant_id: string | null
  title: string | null
  status: string | null
  price_adult: number | null
  currency: string | null
  created_at: string | null
  reviewed_at: string | null
  rejection_reason: string | null
}

type MerchantRow = {
  id: string
  company_name: string | null
  brand_name: string | null
}

function formatStatus(status: string | null) {
  if (status === "approved") return "Approved"
  if (status === "pending") return "Pending"
  if (status === "rejected") return "Rejected"
  if (status === "draft") return "Draft"
  if (status === "inactive") return "Inactive"
  return status || "Unknown"
}

function statusTone(status: string | null) {
  if (status === "approved") return "border-emerald-200 bg-emerald-50 text-emerald-700"
  if (status === "pending") return "border-amber-200 bg-amber-50 text-amber-700"
  if (status === "rejected") return "border-rose-200 bg-rose-50 text-rose-700"
  return "border-slate-200 bg-slate-100 text-slate-700"
}

function formatMoney(value: number | null, currency: string | null) {
  return `${currency || "IDR"} ${(value || 0).toLocaleString("id-ID")}`
}

function formatDate(value: string | null) {
  if (!value) return "-"
  return new Date(value).toLocaleString("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  })
}

export default async function AdminPackagesPage({
  searchParams,
}: {
  searchParams?: Promise<{ success?: string; error?: string }>
}) {
  const resolvedSearchParams = (await searchParams) || {}
  const supabase = createAdminClient()

  const { data: packagesData } = await supabase
    .from("packages")
    .select("id, merchant_id, title, status, price_adult, currency, created_at, reviewed_at, rejection_reason")
    .eq("status", "pending")
    .order("created_at", { ascending: false })

  const packages = (packagesData as PackageRow[] | null) || []
  const merchantIds = [...new Set(packages.map((pkg) => pkg.merchant_id).filter(Boolean))] as string[]

  const { data: merchantsData } = merchantIds.length
    ? await supabase.from("merchants").select("id, company_name, brand_name").in("id", merchantIds)
    : { data: [] as MerchantRow[] }

  const merchantMap = new Map(
    (((merchantsData as MerchantRow[] | null) || []) as MerchantRow[]).map((merchant) => [
      merchant.id,
      merchant.brand_name || merchant.company_name || merchant.id,
    ]),
  )

  const pendingCount = packages.length

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 bg-[linear-gradient(135deg,#fff7ed_0%,#ffffff_45%,#f8fafc_100%)] px-8 py-7">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orange-500">Admin Package Control</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">Global pending queue</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Halaman ini khusus untuk paket yang benar-benar menunggu review admin. Untuk melihat semua paket satu merchant secara rapi,
              masuk lewat merchant directory lalu buka workspace paket merchant tersebut.
            </p>
          </div>

          <div className="grid gap-4 px-8 py-5 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Pending</p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">{pendingCount}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Arah kerja</p>
              <p className="mt-2 text-sm font-medium leading-6 text-slate-900">Review cepat di sini, audit lengkap per merchant di Merchant Directory.</p>
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

        <div className="mt-6 space-y-4">
          {!packages.length ? (
            <div className="rounded-2xl border border-slate-200 bg-white px-6 py-12 text-center text-slate-500 shadow-sm">
              Belum ada paket yang menunggu review.
            </div>
          ) : null}

          {packages.map((pkg) => (
            <div
              key={pkg.id}
              className="grid gap-5 rounded-[26px] border border-slate-200 bg-white p-6 shadow-sm xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,0.9fr)]"
            >
              <div>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="max-w-3xl">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusTone(pkg.status)}`}>
                        {formatStatus(pkg.status)}
                      </span>
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
                        Merchant: {pkg.merchant_id ? merchantMap.get(pkg.merchant_id) || pkg.merchant_id : "-"}
                      </span>
                      {pkg.merchant_id ? (
                        <Link
                          href={`/admin/merchants/${pkg.merchant_id}`}
                          className="rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-700 transition hover:border-orange-300 hover:bg-orange-100"
                        >
                          Buka workspace merchant
                        </Link>
                      ) : null}
                    </div>

                    <h2 className="mt-4 text-2xl font-semibold tracking-tight text-slate-950">{pkg.title || "Tanpa judul"}</h2>
                    <p className="mt-2 text-sm text-slate-500">Package ID: {pkg.id}</p>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Harga Dewasa</p>
                    <p className="mt-2 text-lg font-semibold text-slate-950">{formatMoney(pkg.price_adult, pkg.currency)}</p>
                  </div>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Dibuat</p>
                    <p className="mt-2 text-sm font-medium text-slate-900">{formatDate(pkg.created_at)}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Direview</p>
                    <p className="mt-2 text-sm font-medium text-slate-900">{formatDate(pkg.reviewed_at)}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Catatan Revisi</p>
                    <p className="mt-2 line-clamp-2 text-sm text-slate-700">{pkg.rejection_reason || "Belum ada catatan."}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
                <Link
                  href={`/admin/packages/${pkg.id}`}
                  className="inline-flex w-full items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-800 transition hover:border-orange-300 hover:text-orange-600"
                >
                  Review detail paket
                </Link>

                <form action={approvePackage}>
                  <input type="hidden" name="packageId" value={pkg.id} />
                  <button className="w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700">
                    Setujui paket
                  </button>
                </form>

                <form action={rejectPackage} className="space-y-3">
                  <input type="hidden" name="packageId" value={pkg.id} />
                  <textarea
                    name="reason"
                    placeholder="Alasan penolakan atau revisi paket"
                    required
                    className="h-28 w-full rounded-xl border border-slate-300 bg-white p-3 text-sm outline-none ring-orange-500 transition focus:ring-2"
                  />
                  <button className="w-full rounded-xl bg-rose-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-rose-700">
                    Tolak paket
                  </button>
                </form>

                <form action={deletePackage}>
                  <input type="hidden" name="packageId" value={pkg.id} />
                  <button className="w-full rounded-xl border border-rose-300 bg-white px-4 py-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-50">
                    Hapus permanen dari database
                  </button>
                </form>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
