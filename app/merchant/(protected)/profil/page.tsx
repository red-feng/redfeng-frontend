import Image from "next/image"
import { createClient } from "@/lib/supabase/server"

type MerchantProfileRow = {
  company_name: string | null
  brand_name: string | null
  address: string | null
  city: string | null
  province: string | null
  logo_url: string | null
  bank_name: string | null
  bank_account_number: string | null
  bank_account_holder: string | null
  bank_branch: string | null
  npwp_personal: string | null
  npwp_company: string | null
  pic_name: string | null
}

function maskedAccountNumber(value: string | null) {
  if (!value) return "-"
  if (value.length <= 4) return value
  return `${"*".repeat(Math.max(value.length - 4, 0))}${value.slice(-4)}`
}

export default async function MerchantProfilePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data, error } = await supabase
    .from("merchants")
    .select(
      "company_name, brand_name, address, city, province, logo_url, bank_name, bank_account_number, bank_account_holder, bank_branch, npwp_personal, npwp_company, pic_name",
    )
    .eq("user_id", user.id)
    .single()

  const merchant = data as MerchantProfileRow | null
  const addressLabel = [merchant?.address, merchant?.city, merchant?.province].filter(Boolean).join(", ") || "-"
  const metricCards = [
    {
      label: "Nama bisnis",
      value: merchant?.company_name || "-",
      note: "Identitas legal merchant",
    },
    {
      label: "Brand",
      value: merchant?.brand_name || "-",
      note: "Nama yang tampil ke customer",
    },
    {
      label: "Kontak PIC",
      value: merchant?.pic_name || "Belum tersedia",
      note: "Penanggung jawab merchant",
    },
    {
      label: "Alamat",
      value: merchant ? `${merchant.city || "-"}, ${merchant.province || "-"}` : "-",
      note: "Lokasi operasional merchant",
    },
  ]

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fff8f1_0%,#f7f1e8_38%,#f3eee7_100%)] p-6 md:p-10">
      <section className="overflow-hidden rounded-[34px] border border-orange-100 bg-[linear-gradient(135deg,#983108_0%,#f76707_52%,#ffb357_100%)] text-white shadow-[0_28px_80px_rgba(194,65,12,0.24)]">
        <div className="grid gap-6 px-7 py-8 lg:grid-cols-[minmax(0,1.4fr)_400px] lg:px-10 lg:py-10">
          <div>
            <div className="inline-flex rounded-full border border-white/25 bg-white/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-white/90">
              Merchant Profile
            </div>
            <h1 className="mt-5 max-w-3xl text-4xl font-semibold leading-[1.05] tracking-[-0.04em] text-white md:text-5xl">
              Identitas merchant yang lebih rapi untuk operasional, payout, dan kepercayaan customer.
            </h1>
            <p className="mt-5 max-w-3xl text-sm leading-7 text-white/90 md:text-base">
              Kelola informasi bisnis, detail rekening, dan dokumen inti merchant dengan tampilan yang lebih
              premium dan lebih siap untuk kebutuhan OTA yang terus berkembang.
            </p>
          </div>

          <div className="rounded-[28px] border border-white/30 bg-white/12 p-5 backdrop-blur-sm">
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-white/75">Identity Snapshot</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              <div className="rounded-[20px] border border-white/20 bg-white/10 px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/70">Brand</p>
                <p className="mt-2 text-lg font-semibold text-white">{merchant?.brand_name || merchant?.company_name || "-"}</p>
              </div>
              <div className="rounded-[20px] border border-white/20 bg-white/10 px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/70">PIC</p>
                <p className="mt-2 text-lg font-semibold text-white">{merchant?.pic_name || "Belum tersedia"}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {error || !merchant ? (
        <div className="mt-6 rounded-[24px] border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
          Gagal memuat profil merchant.
        </div>
      ) : (
        <>
          <section className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {metricCards.map((card) => (
              <div
                key={card.label}
                className="rounded-[26px] border border-[#f0ddc7] bg-white px-5 py-5 shadow-[0_18px_44px_rgba(15,23,42,0.06)]"
              >
                <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-orange-500">{card.label}</p>
                <p className="mt-3 text-xl font-semibold tracking-[-0.03em] text-slate-950">{card.value}</p>
                <p className="mt-2 text-xs leading-6 text-slate-500">{card.note}</p>
              </div>
            ))}
          </section>

          <div className="mt-8 grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
            <aside className="rounded-[32px] border border-[#f3dbc3] bg-white/85 p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur-sm">
              <div className="flex flex-col items-center text-center">
                {merchant.logo_url ? (
                  <Image
                    src={merchant.logo_url}
                    alt={merchant.brand_name || "Logo Merchant"}
                    width={160}
                    height={160}
                    unoptimized
                    className="h-36 w-36 rounded-[28px] object-cover"
                  />
                ) : (
                  <div className="flex h-36 w-36 items-center justify-center rounded-[28px] border border-[#eadfce] bg-[#fffaf3] text-sm text-slate-500">
                    Logo belum ada
                  </div>
                )}
                <h2 className="mt-5 text-2xl font-semibold tracking-[-0.03em] text-slate-950">
                  {merchant.brand_name || merchant.company_name || "-"}
                </h2>
                <p className="mt-1 text-sm text-slate-500">{merchant.company_name || "-"}</p>
                <div className="mt-5 w-full rounded-[22px] border border-[#efe3d1] bg-[#fffaf3] p-4 text-left">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">Alamat bisnis</p>
                  <p className="mt-2 text-sm leading-7 text-slate-700">{addressLabel}</p>
                </div>
              </div>
            </aside>

            <main className="space-y-6">
              <section className="rounded-[32px] border border-[#f3dbc3] bg-white/85 p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur-sm lg:p-7">
                <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-orange-500">Business Identity</p>
                <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950">Informasi bisnis</h2>
                <div className="mt-5 grid gap-5 md:grid-cols-2">
                  <div>
                    <p className="text-sm text-slate-500">Nama bisnis</p>
                    <p className="mt-2 font-medium text-slate-950">{merchant.company_name || "-"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Nama brand</p>
                    <p className="mt-2 font-medium text-slate-950">{merchant.brand_name || "-"}</p>
                  </div>
                  <div className="md:col-span-2">
                    <p className="text-sm text-slate-500">Deskripsi</p>
                    <p className="mt-2 font-medium text-slate-950">Belum tersedia di schema merchant saat ini.</p>
                  </div>
                  <div className="md:col-span-2">
                    <p className="text-sm text-slate-500">Alamat</p>
                    <p className="mt-2 font-medium text-slate-950">{addressLabel}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Kontak</p>
                    <p className="mt-2 font-medium text-slate-950">{merchant.pic_name || "Belum tersedia"}</p>
                  </div>
                </div>
              </section>

              <section className="rounded-[32px] border border-[#f3dbc3] bg-white/85 p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur-sm lg:p-7">
                <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-orange-500">Bank Account</p>
                <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950">Rekening bank</h2>
                <div className="mt-5 grid gap-5 md:grid-cols-2">
                  <div>
                    <p className="text-sm text-slate-500">Nama bank</p>
                    <p className="mt-2 font-medium text-slate-950">{merchant.bank_name || "-"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Cabang bank</p>
                    <p className="mt-2 font-medium text-slate-950">{merchant.bank_branch || "-"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Atas nama</p>
                    <p className="mt-2 font-medium text-slate-950">{merchant.bank_account_holder || "-"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Nomor rekening</p>
                    <p className="mt-2 font-medium text-slate-950">{maskedAccountNumber(merchant.bank_account_number)}</p>
                  </div>
                </div>
              </section>

              <section className="rounded-[32px] border border-[#f3dbc3] bg-white/85 p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur-sm lg:p-7">
                <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-orange-500">Tax Identity</p>
                <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950">NPWP</h2>
                <div className="mt-5 grid gap-5 md:grid-cols-2">
                  <div>
                    <p className="text-sm text-slate-500">NPWP Personal</p>
                    <p className="mt-2 font-medium text-slate-950">{merchant.npwp_personal || "-"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">NPWP Perusahaan</p>
                    <p className="mt-2 font-medium text-slate-950">{merchant.npwp_company || "-"}</p>
                  </div>
                </div>
              </section>
            </main>
          </div>
        </>
      )}
    </main>
  )
}
