import Image from "next/image"
import Link from "next/link"
import { notFound } from "next/navigation"
import { formatMerchantCode } from "@/lib/merchant-code"
import { createAdminClient } from "@/lib/supabase/admin"

type MerchantProfileRow = {
  id: string
  brand_name: string | null
  company_name: string | null
  email: string | null
  address: string | null
  city: string | null
  province: string | null
  pic_name: string | null
  pic_position: string | null
  bank_name: string | null
  bank_branch: string | null
  bank_account_holder: string | null
  bank_account_number: string | null
  npwp_personal: string | null
  npwp_company: string | null
  nib: string | null
  logo_url: string | null
  verification_status: string | null
  onboarding_completed: boolean | null
}

function fieldValue(value: string | null) {
  return value && value.trim() ? value : "-"
}

function maskAccount(value: string | null) {
  if (!value) return "-"
  if (value.length <= 4) return value
  return `${"*".repeat(Math.max(value.length - 4, 0))}${value.slice(-4)}`
}

export default async function AdminMerchantProfilePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const adminSupabase = createAdminClient()
  const { data } = await adminSupabase
    .from("merchants")
    .select(
      "id, brand_name, company_name, email, address, city, province, pic_name, pic_position, bank_name, bank_branch, bank_account_holder, bank_account_number, npwp_personal, npwp_company, nib, logo_url, verification_status, onboarding_completed",
    )
    .eq("id", id)
    .maybeSingle()

  const merchant = data as MerchantProfileRow | null

  if (!merchant) {
    notFound()
  }

  const merchantName = merchant.brand_name || merchant.company_name || merchant.id
  const merchantCode = formatMerchantCode(merchant.id)
  const addressLabel = [merchant.address, merchant.city, merchant.province].filter(Boolean).join(", ") || "-"

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fff8f1_0%,#f7f1e8_38%,#f3eee7_100%)] px-6 py-8 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="overflow-hidden rounded-[32px] border border-orange-100 bg-[linear-gradient(135deg,#983108_0%,#f76707_52%,#ffb357_100%)] px-8 py-9 text-white shadow-[0_28px_80px_rgba(194,65,12,0.24)]">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div className="max-w-3xl">
              <p className="inline-flex rounded-full border border-white/25 bg-white/10 px-4 py-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-white/90">
                Merchant Profile
              </p>
              <h1 className="mt-4 text-4xl font-semibold tracking-[-0.04em]">{merchantName}</h1>
              <p className="mt-3 text-sm font-semibold uppercase tracking-[0.22em] text-orange-50/90">{merchantCode}</p>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-white/90">
                Halaman ini membantu admin meninjau identitas bisnis merchant, rekening payout, dan dokumen inti tanpa perlu login ke portal merchant.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/admin/merchants"
                className="rounded-[18px] border border-white/20 bg-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/15"
              >
                Kembali ke Merchant Directory
              </Link>
              <Link
                href={`/admin/merchants/${merchant.id}`}
                className="rounded-[18px] bg-white px-4 py-3 text-sm font-semibold text-orange-700 transition hover:bg-orange-50"
              >
                Buka paket merchant
              </Link>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {[
            { label: "Email", value: fieldValue(merchant.email) },
            { label: "Status", value: fieldValue(merchant.verification_status) },
            { label: "Onboarding", value: merchant.onboarding_completed ? "Completed" : "Belum selesai" },
            { label: "PIC", value: fieldValue(merchant.pic_name) },
            { label: "PIC Position", value: fieldValue(merchant.pic_position) },
          ].map((item) => (
            <div key={item.label} className="rounded-[22px] border border-[#efe1cf] bg-white p-5 shadow-[0_16px_40px_rgba(15,23,42,0.05)]">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-orange-500">{item.label}</p>
              <p className="mt-3 text-sm font-semibold text-slate-950">{item.value}</p>
            </div>
          ))}
        </section>

        <section className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="rounded-[28px] border border-[#efe1cf] bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
            <div className="flex flex-col items-center text-center">
              {merchant.logo_url ? (
                <Image
                  src={merchant.logo_url}
                  alt={merchantName}
                  width={160}
                  height={160}
                  unoptimized
                  className="h-36 w-36 rounded-[24px] object-cover"
                />
              ) : (
                <div className="flex h-36 w-36 items-center justify-center rounded-[24px] border border-[#eadfce] bg-[#fffaf3] text-sm text-slate-500">
                  Logo belum ada
                </div>
              )}
              <h2 className="mt-5 text-2xl font-semibold text-slate-950">{merchantName}</h2>
              <p className="mt-1 text-sm text-slate-500">{fieldValue(merchant.company_name)}</p>
              <div className="mt-4 inline-flex rounded-full border border-[#f0ddc7] bg-[#fff3e6] px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-orange-700">
                {merchantCode}
              </div>
              <div className="mt-5 w-full rounded-[20px] border border-[#efe3d1] bg-[#fffaf3] p-4 text-left">
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">Alamat bisnis</p>
                <p className="mt-2 text-sm leading-7 text-slate-700">{addressLabel}</p>
              </div>
            </div>
          </aside>

          <div className="space-y-6">
            <section className="rounded-[28px] border border-[#efe1cf] bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-orange-500">Business identity</p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-950">Informasi bisnis</h2>
              <div className="mt-5 grid gap-5 md:grid-cols-2">
                <div>
                  <p className="text-sm text-slate-500">Nama bisnis</p>
                  <p className="mt-2 font-medium text-slate-950">{fieldValue(merchant.company_name)}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Nama brand</p>
                  <p className="mt-2 font-medium text-slate-950">{fieldValue(merchant.brand_name)}</p>
                </div>
                <div className="md:col-span-2">
                  <p className="text-sm text-slate-500">Alamat</p>
                  <p className="mt-2 font-medium text-slate-950">{addressLabel}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">NIB</p>
                  <p className="mt-2 font-medium text-slate-950">{fieldValue(merchant.nib)}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">NPWP Badan Usaha</p>
                  <p className="mt-2 font-medium text-slate-950">{fieldValue(merchant.npwp_company)}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">NPWP Personal</p>
                  <p className="mt-2 font-medium text-slate-950">{fieldValue(merchant.npwp_personal)}</p>
                </div>
              </div>
            </section>

            <section className="rounded-[28px] border border-[#efe1cf] bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-orange-500">Payout account</p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-950">Rekening merchant</h2>
              <div className="mt-5 grid gap-5 md:grid-cols-2">
                <div>
                  <p className="text-sm text-slate-500">Nama bank</p>
                  <p className="mt-2 font-medium text-slate-950">{fieldValue(merchant.bank_name)}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Cabang bank</p>
                  <p className="mt-2 font-medium text-slate-950">{fieldValue(merchant.bank_branch)}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Atas nama</p>
                  <p className="mt-2 font-medium text-slate-950">{fieldValue(merchant.bank_account_holder)}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Nomor rekening</p>
                  <p className="mt-2 font-medium text-slate-950">{maskAccount(merchant.bank_account_number)}</p>
                </div>
              </div>
            </section>
          </div>
        </section>
      </div>
    </main>
  )
}
