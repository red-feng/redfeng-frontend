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
    <div className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)] p-6 md:p-10">
      <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">Profil Merchant</h1>
        <p className="mt-1 text-sm text-slate-500">
          Kelola identitas bisnis, informasi rekening, dan dokumen merchant dalam satu tampilan yang rapi.
        </p>
      </section>

      {error || !merchant ? (
        <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
          Gagal memuat profil merchant.
        </div>
      ) : (
        <>
          <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {metricCards.map((card) => (
              <div key={card.label} className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-sm text-slate-500">{card.label}</p>
                <p className="mt-2 text-xl font-bold text-slate-900">{card.value}</p>
                <p className="mt-2 text-xs text-slate-500">{card.note}</p>
              </div>
            ))}
          </section>

          <div className="mt-8 grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
            <aside className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
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
                  <div className="flex h-36 w-36 items-center justify-center rounded-[28px] bg-slate-100 text-sm text-slate-500">
                    Logo belum ada
                  </div>
                )}
                <h2 className="mt-5 text-2xl font-semibold text-slate-900">
                  {merchant.brand_name || merchant.company_name || "-"}
                </h2>
                <p className="mt-1 text-sm text-slate-500">{merchant.company_name || "-"}</p>
                <div className="mt-5 w-full rounded-[20px] bg-slate-50 p-4 text-left">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Alamat bisnis</p>
                  <p className="mt-2 text-sm leading-6 text-slate-700">{addressLabel}</p>
                </div>
              </div>
            </aside>

            <main className="space-y-6">
              <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-slate-900">Informasi Bisnis</h2>
                <div className="mt-5 grid gap-5 md:grid-cols-2">
                  <div>
                    <p className="text-sm text-slate-500">Nama bisnis</p>
                    <p className="mt-2 font-medium text-slate-900">{merchant.company_name || "-"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Nama brand</p>
                    <p className="mt-2 font-medium text-slate-900">{merchant.brand_name || "-"}</p>
                  </div>
                  <div className="md:col-span-2">
                    <p className="text-sm text-slate-500">Deskripsi</p>
                    <p className="mt-2 font-medium text-slate-900">
                      Belum tersedia di schema merchant saat ini.
                    </p>
                  </div>
                  <div className="md:col-span-2">
                    <p className="text-sm text-slate-500">Alamat</p>
                    <p className="mt-2 font-medium text-slate-900">{addressLabel}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Kontak</p>
                    <p className="mt-2 font-medium text-slate-900">{merchant.pic_name || "Belum tersedia"}</p>
                  </div>
                </div>
              </section>

              <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-slate-900">Rekening Bank</h2>
                <div className="mt-5 grid gap-5 md:grid-cols-2">
                  <div>
                    <p className="text-sm text-slate-500">Nama bank</p>
                    <p className="mt-2 font-medium text-slate-900">{merchant.bank_name || "-"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Cabang bank</p>
                    <p className="mt-2 font-medium text-slate-900">{merchant.bank_branch || "-"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Atas nama</p>
                    <p className="mt-2 font-medium text-slate-900">{merchant.bank_account_holder || "-"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Nomor rekening</p>
                    <p className="mt-2 font-medium text-slate-900">
                      {maskedAccountNumber(merchant.bank_account_number)}
                    </p>
                  </div>
                </div>
              </section>

              <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-slate-900">NPWP</h2>
                <div className="mt-5 grid gap-5 md:grid-cols-2">
                  <div>
                    <p className="text-sm text-slate-500">NPWP Personal</p>
                    <p className="mt-2 font-medium text-slate-900">{merchant.npwp_personal || "-"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">NPWP Perusahaan</p>
                    <p className="mt-2 font-medium text-slate-900">{merchant.npwp_company || "-"}</p>
                  </div>
                </div>
              </section>
            </main>
          </div>
        </>
      )}
    </div>
  )
}
