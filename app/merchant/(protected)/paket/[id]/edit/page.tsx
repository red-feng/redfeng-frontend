import Link from "next/link"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { updatePackage } from "../../actions"
import { travelStyleOptions } from "@/lib/travelStyles"

type EditPackagePageProps = {
  params: Promise<{ id: string }>
  searchParams: Promise<{ error?: string }>
}

export default async function EditPackagePage({ params, searchParams }: EditPackagePageProps) {
  const { id } = await params
  const resolvedSearchParams = await searchParams
  const supabase = await createClient()
  const adminSupabase = createAdminClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data: merchant } = await adminSupabase
    .from("merchants")
    .select("id")
    .eq("user_id", user.id)
    .single()

  if (!merchant) {
    return <div className="p-10">Data merchant tidak ditemukan.</div>
  }

  const [{ data: countries }, packageResult] = await Promise.all([
    adminSupabase.from("countries").select("id, name").order("name"),
    adminSupabase
      .from("packages")
      .select("id, title, travel_style, origin_country_id, origin_province, destination_country_id, destination_province, currency, minimal_peserta, duration, price_adult, price_child, status")
      .eq("id", id)
      .eq("merchant_id", merchant.id)
      .single(),
  ])

  const pkg = packageResult.data

  if (packageResult.error || !pkg) {
    return <div className="p-10">Paket tidak ditemukan atau tidak bisa diakses.</div>
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)] p-6 md:p-10">
      <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Edit Paket</h1>
            <p className="mt-1 text-sm text-slate-500">
              Perbarui informasi utama paket merchant secara langsung.
            </p>
          </div>
          <Link
            href="/merchant/paket"
            className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-orange-300 hover:text-orange-600"
          >
            Kembali ke Kelola Paket
          </Link>
        </div>
      </section>

      {resolvedSearchParams.error && (
        <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {resolvedSearchParams.error}
        </div>
      )}

      <section className="mt-8 rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <form action={updatePackage} className="space-y-6">
          <input type="hidden" name="package_id" value={pkg.id} />

          <div className="grid gap-5 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-medium text-slate-700">Nama Paket</label>
              <input
                name="title"
                defaultValue={pkg.title || ""}
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none ring-orange-500 focus:ring-2"
                required
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-medium text-slate-700">Travel Style</label>
              <select
                name="travel_style"
                defaultValue={pkg.travel_style || ""}
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none ring-orange-500 focus:ring-2"
                required
              >
                <option value="">Pilih Travel Style</option>
                {travelStyleOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Negara Keberangkatan</label>
              <select
                name="origin_country_id"
                defaultValue={pkg.origin_country_id || ""}
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none ring-orange-500 focus:ring-2"
                required
              >
                <option value="">Pilih negara</option>
                {(countries || []).map((country) => (
                  <option key={country.id} value={country.id}>
                    {country.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Provinsi Keberangkatan</label>
              <input
                name="origin_province"
                defaultValue={pkg.origin_province || ""}
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none ring-orange-500 focus:ring-2"
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Negara Tujuan</label>
              <select
                name="destination_country_id"
                defaultValue={pkg.destination_country_id || ""}
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none ring-orange-500 focus:ring-2"
                required
              >
                <option value="">Pilih negara</option>
                {(countries || []).map((country) => (
                  <option key={country.id} value={country.id}>
                    {country.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Provinsi Tujuan</label>
              <input
                name="destination_province"
                defaultValue={pkg.destination_province || ""}
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none ring-orange-500 focus:ring-2"
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Mata Uang</label>
              <select
                name="currency"
                defaultValue={pkg.currency || "IDR"}
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none ring-orange-500 focus:ring-2"
              >
                <option value="IDR">IDR</option>
                <option value="USD">USD</option>
                <option value="CNY">CNY</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Minimal Peserta</label>
              <input
                name="minimal_peserta"
                type="number"
                min="1"
                defaultValue={pkg.minimal_peserta ?? 1}
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none ring-orange-500 focus:ring-2"
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Durasi (hari)</label>
              <input
                name="duration_days"
                type="number"
                min="1"
                defaultValue={pkg.duration ?? 1}
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none ring-orange-500 focus:ring-2"
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Harga Dewasa</label>
              <input
                name="price_adult"
                type="number"
                min="0"
                defaultValue={pkg.price_adult ?? 0}
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none ring-orange-500 focus:ring-2"
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Harga Anak</label>
              <input
                name="price_child"
                type="number"
                min="0"
                defaultValue={pkg.price_child ?? 0}
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none ring-orange-500 focus:ring-2"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            <button
              type="submit"
              className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Simpan Perubahan
            </button>
            <Link
              href="/merchant/paket"
              className="rounded-2xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-orange-300 hover:text-orange-600"
            >
              Batal
            </Link>
          </div>
        </form>
      </section>
    </div>
  )
}
