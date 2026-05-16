import Link from "next/link"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { isAdminExecutionRole } from "@/lib/internal-roles"
import { formatMerchantCode, formatPackageCode } from "@/lib/merchant-code"
import { toneClass } from "@/lib/status-tones"
import ConfirmSubmitButton from "../merchants/ConfirmSubmitButton"
import { approvePackage, deletePackage, rejectPackage } from "./actions"

type PackageRow = {
  id: string
  package_code: string | null
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
  if (status === "approved") return toneClass("success", "bordered")
  if (status === "pending") return toneClass("pending", "bordered")
  if (status === "rejected") return toneClass("danger", "bordered")
  return toneClass("neutral", "bordered")
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
  const authSupabase = await createClient("admin")

  const {
    data: { user },
  } = await authSupabase.auth.getUser()
  const { data: currentProfile } = user
    ? await authSupabase.from("profiles").select("role").eq("id", user.id).maybeSingle()
    : { data: null as { role?: string | null } | null }
  const isSuperadmin = currentProfile?.role === "superadmin"
  const canExecuteAdminOps = isAdminExecutionRole(currentProfile?.role)

  const { data: packagesData } = await supabase
    .from("packages")
    .select("id, package_code, merchant_id, title, status, price_adult, currency, created_at, reviewed_at, rejection_reason")
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
      merchant.brand_name || merchant.company_name || formatMerchantCode(merchant.id),
    ]),
  )

  const pendingCount = packages.length
  const merchantCount = merchantIds.length

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fff8f1_0%,#f7f1e8_100%)] px-4 py-5 sm:px-6 sm:py-6 md:px-8 md:py-8 lg:px-10">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="overflow-hidden rounded-[28px] border border-orange-200/60 bg-[linear-gradient(135deg,#7c2d12_0%,#c2410c_38%,#f97316_72%,#fdba74_100%)] px-5 py-6 text-white shadow-[0_30px_100px_rgba(146,64,14,0.18)] sm:rounded-[32px] sm:px-8 sm:py-8 lg:px-10">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_340px]">
            <div className="max-w-3xl">
              <span className="inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.34em] text-orange-50">
                Paket Review
              </span>
              <h1 className="mt-5 text-3xl font-semibold tracking-tight sm:text-5xl">
                Pantau antrean paket merchant yang menunggu keputusan operasional.
              </h1>
              <p className="mt-4 text-base leading-8 text-orange-50/90">
                Halaman ini dipakai untuk membaca paket yang masih pending dengan cepat, lalu meneruskan audit yang lebih
                detail ke workspace merchant jika butuh konteks yang lebih lengkap.
              </p>
            </div>

            <div className="rounded-[24px] border border-white/20 bg-white/10 px-4 py-4 backdrop-blur sm:px-5 sm:py-5">
              <p className="text-[11px] uppercase tracking-[0.28em] text-orange-100/80">Pulse review</p>
              <div className="mt-5 grid gap-4">
                <div>
                  <p className="text-sm text-orange-50/80">Pending paket</p>
                  <p className="mt-1 text-3xl font-semibold text-white">{pendingCount}</p>
                </div>
                <div>
                  <p className="text-sm text-orange-50/80">Merchant terkait</p>
                  <p className="mt-1 text-3xl font-semibold text-white">{merchantCount}</p>
                </div>
                <div>
                  <p className="text-sm text-orange-50/80">Arah kerja</p>
                  <p className="mt-1 text-sm font-medium leading-6 text-white/90">
                    Review cepat di sini, audit lengkap per merchant di direktori merchant.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
          <div className="rounded-[22px] border border-[#f0ddc7] bg-white px-4 py-4 shadow-[0_18px_44px_rgba(15,23,42,0.06)] sm:rounded-[26px] sm:px-5 sm:py-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-orange-500">Pending paket</p>
            <p className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-slate-950">{pendingCount}</p>
            <p className="mt-2 text-xs leading-6 text-slate-500">Paket yang masih menunggu approve atau reject dari tim operasional.</p>
          </div>
          <div className="rounded-[22px] border border-[#f0ddc7] bg-white px-4 py-4 shadow-[0_18px_44px_rgba(15,23,42,0.06)] sm:rounded-[26px] sm:px-5 sm:py-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-orange-500">Merchant terkait</p>
            <p className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-slate-950">{merchantCount}</p>
            <p className="mt-2 text-xs leading-6 text-slate-500">Jumlah merchant yang saat ini sedang punya paket pending di antrean review.</p>
          </div>
          <div className="rounded-[22px] border border-[#f0ddc7] bg-white px-4 py-4 shadow-[0_18px_44px_rgba(15,23,42,0.06)] sm:rounded-[26px] sm:px-5 sm:py-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-orange-500">Jalur kerja</p>
            <p className="mt-3 text-lg font-semibold tracking-[-0.03em] text-slate-950">Review cepat</p>
            <p className="mt-2 text-xs leading-6 text-slate-500">Putuskan paket di sini, lalu buka workspace merchant jika perlu audit konteks yang lebih luas.</p>
          </div>
        </section>

        {resolvedSearchParams.success ? (
          <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800 sm:mt-6 sm:px-5 sm:py-4">
            {resolvedSearchParams.success}
          </div>
        ) : null}

        {resolvedSearchParams.error ? (
          <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800 sm:mt-6 sm:px-5 sm:py-4">
            {resolvedSearchParams.error}
          </div>
        ) : null}

        <div className="mt-5 space-y-4 sm:mt-6">
          {!packages.length ? (
            <div className="rounded-2xl border border-slate-200 bg-white px-6 py-12 text-center text-slate-500 shadow-sm">
              Belum ada paket yang menunggu review.
            </div>
          ) : null}

          {packages.map((pkg) => (
            <div
              key={pkg.id}
              className="grid gap-4 rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm sm:gap-5 sm:rounded-[26px] sm:p-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,0.9fr)]"
            >
              <div>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="max-w-3xl">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusTone(pkg.status)}`}>
                        {formatStatus(pkg.status)}
                      </span>
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
                        Merchant: {pkg.merchant_id ? merchantMap.get(pkg.merchant_id) || formatMerchantCode(pkg.merchant_id) : "-"}
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

                    <h2 className="mt-4 text-xl font-semibold tracking-tight text-slate-950 sm:text-2xl">{pkg.title || "Tanpa judul"}</h2>
                    <p className="mt-2 text-sm text-slate-500">Package ID: {formatPackageCode(pkg.package_code, pkg.id)}</p>
                  </div>

                  <div className="w-full rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3 sm:w-auto">
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
                  href={`/admin/packages/${encodeURIComponent(pkg.package_code || pkg.id)}`}
                  className="inline-flex w-full items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-800 transition hover:border-orange-300 hover:text-orange-600"
                >
                  Detail
                </Link>

                {canExecuteAdminOps ? (
                  <>
                    <form action={approvePackage}>
                      <input type="hidden" name="packageId" value={pkg.id} />
                      <button className="w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700">
                        Setujui
                      </button>
                    </form>

                    <form action={rejectPackage} className="space-y-3">
                      <input type="hidden" name="packageId" value={pkg.id} />
                      <textarea
                        name="reason"
                        placeholder="Alasan penolakan atau revisi paket"
                        required
                        className="h-24 w-full rounded-xl border border-slate-300 bg-white p-3 text-sm outline-none ring-orange-500 transition focus:ring-2 sm:h-28"
                      />
                      <button className="w-full rounded-xl bg-rose-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-rose-700">
                        Tolak
                      </button>
                    </form>
                  </>
                ) : (
                  <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm leading-6 text-sky-700">
                    Operations Manager hanya memonitor kualitas review paket dan tidak mengeksekusi approve / reject.
                  </div>
                )}

                {isSuperadmin ? (
                  <form action={deletePackage}>
                    <input type="hidden" name="packageId" value={pkg.id} />
                    <ConfirmSubmitButton
                      confirmMessage="Yakin ingin menghapus permanen paket ini dari database? Tindakan ini tidak bisa dibatalkan."
                      className="w-full rounded-xl border border-rose-300 bg-white px-4 py-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-50"
                    >
                      Hapus
                    </ConfirmSubmitButton>
                  </form>
                ) : (
                  <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500">
                    Penghapusan permanen hanya tersedia untuk superadmin.
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
