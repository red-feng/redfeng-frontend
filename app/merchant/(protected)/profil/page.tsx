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

  return (
    <div className="p-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Profil Merchant</h1>
        <p className="text-sm text-slate-500">Informasi profil bisnis merchant.</p>
      </div>

      {error || !merchant ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
          Gagal memuat profil merchant.
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="rounded-2xl border bg-white p-6 shadow-sm">
            <div className="flex flex-col items-center text-center">
              {merchant.logo_url ? (
                <Image
                  src={merchant.logo_url}
                  alt={merchant.brand_name || "Logo Merchant"}
                  width={160}
                  height={160}
                  unoptimized
                  className="h-32 w-32 rounded-2xl object-cover"
                />
              ) : (
                <div className="flex h-32 w-32 items-center justify-center rounded-2xl bg-slate-100 text-sm text-slate-500">
                  Logo belum ada
                </div>
              )}
              <h2 className="mt-4 text-xl font-semibold text-slate-900">
                {merchant.brand_name || merchant.company_name || "-"}
              </h2>
              <p className="mt-1 text-sm text-slate-500">{merchant.company_name || "-"}</p>
            </div>
          </aside>

          <main className="space-y-6">
            <section className="rounded-2xl border bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">Informasi Bisnis</h2>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-sm text-slate-500">Nama bisnis</p>
                  <p className="mt-1 font-medium text-slate-900">{merchant.company_name || "-"}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Nama brand</p>
                  <p className="mt-1 font-medium text-slate-900">{merchant.brand_name || "-"}</p>
                </div>
                <div className="md:col-span-2">
                  <p className="text-sm text-slate-500">Deskripsi</p>
                  <p className="mt-1 font-medium text-slate-900">Belum tersedia di schema merchant saat ini</p>
                </div>
                <div className="md:col-span-2">
                  <p className="text-sm text-slate-500">Alamat</p>
                  <p className="mt-1 font-medium text-slate-900">
                    {[merchant.address, merchant.city, merchant.province].filter(Boolean).join(", ") || "-"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Kontak</p>
                  <p className="mt-1 font-medium text-slate-900">{merchant.pic_name || "Belum tersedia"}</p>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">Rekening Bank</h2>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-sm text-slate-500">Nama bank</p>
                  <p className="mt-1 font-medium text-slate-900">{merchant.bank_name || "-"}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Cabang bank</p>
                  <p className="mt-1 font-medium text-slate-900">{merchant.bank_branch || "-"}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Atas nama</p>
                  <p className="mt-1 font-medium text-slate-900">{merchant.bank_account_holder || "-"}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Nomor rekening</p>
                  <p className="mt-1 font-medium text-slate-900">
                    {maskedAccountNumber(merchant.bank_account_number)}
                  </p>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">NPWP</h2>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-sm text-slate-500">NPWP Personal</p>
                  <p className="mt-1 font-medium text-slate-900">{merchant.npwp_personal || "-"}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">NPWP Perusahaan</p>
                  <p className="mt-1 font-medium text-slate-900">{merchant.npwp_company || "-"}</p>
                </div>
              </div>
            </section>
          </main>
        </div>
      )}
    </div>
  )
}
