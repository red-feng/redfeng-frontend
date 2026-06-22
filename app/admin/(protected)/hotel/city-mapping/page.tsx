import Link from "next/link"
import AdminProductWorkspace from "@/app/components/AdminProductWorkspace"
import { createAdminClient } from "@/lib/supabase/admin"
import { saveHotelCityMappingAction, toggleHotelCityMappingAction } from "./actions"

type HotelCityMappingRow = {
  id: string
  destination_key: string
  destination_label: string
  country_id: string
  city_id: string
  country_name: string | null
  city_name: string | null
  is_active: boolean
  notes: string | null
  updated_at: string
}

function decodeMessage(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value
  return raw ? decodeURIComponent(raw) : ""
}

function formatDateTime(value: string) {
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return "-"
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(parsed)
}

function MappingForm({ mapping }: { mapping?: HotelCityMappingRow }) {
  return (
    <form action={saveHotelCityMappingAction} className="rounded-[18px] border border-[#eee3d9] bg-white p-4 shadow-[0_14px_34px_rgba(15,23,42,0.04)]">
      {mapping ? <input type="hidden" name="id" value={mapping.id} /> : null}
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-orange-600">
            {mapping ? "Edit mapping" : "Tambah mapping"}
          </p>
          <h2 className="mt-1 text-lg font-semibold tracking-[-0.03em] text-slate-950">
            {mapping ? mapping.destination_label : "Destinasi Red Feng ke Dharmawisata"}
          </h2>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            Mapping ini dipakai katalog hotel untuk memanggil `Hotel/Search5` dengan `countryID` dan `cityID` yang benar.
          </p>
        </div>
        <label className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600">
          <input name="is_active" type="checkbox" defaultChecked={mapping?.is_active ?? true} className="h-4 w-4 rounded border-slate-300 text-orange-600 focus:ring-orange-200" />
          Aktif
        </label>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <label className="block">
          <span className="text-xs font-semibold text-slate-600">Label destinasi</span>
          <input name="destination_label" required defaultValue={mapping?.destination_label || ""} placeholder="Contoh: Jakarta" className="mt-1 h-11 w-full rounded-[12px] border border-slate-200 px-3 text-sm outline-none focus:border-orange-300 focus:ring-4 focus:ring-orange-100" />
        </label>
        <label className="block">
          <span className="text-xs font-semibold text-slate-600">Key pencarian</span>
          <input name="destination_key" defaultValue={mapping?.destination_key || ""} placeholder="Otomatis dari label, mis. jakarta" className="mt-1 h-11 w-full rounded-[12px] border border-slate-200 px-3 text-sm outline-none focus:border-orange-300 focus:ring-4 focus:ring-orange-100" />
        </label>
        <label className="block">
          <span className="text-xs font-semibold text-slate-600">Country ID</span>
          <input name="country_id" required defaultValue={mapping?.country_id || ""} placeholder="ID dari Dharmawisata" className="mt-1 h-11 w-full rounded-[12px] border border-slate-200 px-3 text-sm outline-none focus:border-orange-300 focus:ring-4 focus:ring-orange-100" />
        </label>
        <label className="block">
          <span className="text-xs font-semibold text-slate-600">City ID</span>
          <input name="city_id" required defaultValue={mapping?.city_id || ""} placeholder="City ID dari Dharmawisata" className="mt-1 h-11 w-full rounded-[12px] border border-slate-200 px-3 text-sm outline-none focus:border-orange-300 focus:ring-4 focus:ring-orange-100" />
        </label>
        <label className="block">
          <span className="text-xs font-semibold text-slate-600">Country name</span>
          <input name="country_name" defaultValue={mapping?.country_name || ""} placeholder="Indonesia" className="mt-1 h-11 w-full rounded-[12px] border border-slate-200 px-3 text-sm outline-none focus:border-orange-300 focus:ring-4 focus:ring-orange-100" />
        </label>
        <label className="block">
          <span className="text-xs font-semibold text-slate-600">City name</span>
          <input name="city_name" defaultValue={mapping?.city_name || ""} placeholder="Jakarta" className="mt-1 h-11 w-full rounded-[12px] border border-slate-200 px-3 text-sm outline-none focus:border-orange-300 focus:ring-4 focus:ring-orange-100" />
        </label>
      </div>
      <label className="mt-3 block">
        <span className="text-xs font-semibold text-slate-600">Catatan</span>
        <textarea name="notes" rows={2} defaultValue={mapping?.notes || ""} placeholder="Contoh: verified dari endpoint City5 tanggal ..." className="mt-1 w-full rounded-[12px] border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-300 focus:ring-4 focus:ring-orange-100" />
      </label>
      <button type="submit" className="mt-4 rounded-[12px] bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-700">
        Simpan mapping
      </button>
    </form>
  )
}

export default async function HotelCityMappingPage({
  searchParams,
}: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const resolvedSearchParams = (await searchParams) || {}
  const successMessage = decodeMessage(resolvedSearchParams.success)
  const errorMessage = decodeMessage(resolvedSearchParams.error)
  const adminSupabase = createAdminClient()
  const { data, error } = await adminSupabase
    .from("dharmawisata_hotel_city_mappings")
    .select("id, destination_key, destination_label, country_id, city_id, country_name, city_name, is_active, notes, updated_at")
    .order("destination_label", { ascending: true })

  const mappings = (data || []) as HotelCityMappingRow[]
  const activeCount = mappings.filter((mapping) => mapping.is_active).length

  return (
    <AdminProductWorkspace
      productType="hotel"
      productLabel="Hotel"
      description="Mapping kota hotel menghubungkan keyword destinasi Red Feng dengan countryID/cityID Dharmawisata."
      statusLabel="City mapping"
      statusNote="Dipakai oleh katalog hotel live sebelum memanggil endpoint Hotel/Search5."
      primaryActionHref="/admin/hotel"
      primaryActionLabel="Kembali ke admin Hotel"
      secondaryActionHref="/admin/hotel/diagnostics"
      secondaryActionLabel="Diagnostics hotel"
      preparedModules={["Dharmawisata cityID", "Live Hotel/Search5", "Fallback directory", "Admin quote guard"]}
    >
      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-[18px] border border-[#eee3d9] bg-white p-5 shadow-[0_14px_34px_rgba(15,23,42,0.04)]">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Total mapping</p>
          <p className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-slate-950">{mappings.length}</p>
          <p className="mt-2 text-xs text-slate-500">Semua destinasi yang sudah dicatat.</p>
        </div>
        <div className="rounded-[18px] border border-[#eee3d9] bg-white p-5 shadow-[0_14px_34px_rgba(15,23,42,0.04)]">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Aktif</p>
          <p className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-emerald-600">{activeCount}</p>
          <p className="mt-2 text-xs text-slate-500">Dipakai katalog live saat ini.</p>
        </div>
        <div className="rounded-[18px] border border-[#eee3d9] bg-white p-5 shadow-[0_14px_34px_rgba(15,23,42,0.04)]">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Test cepat</p>
          <Link href="/hotel/catalog?q=Jakarta" className="mt-3 inline-flex rounded-[12px] border border-orange-200 bg-orange-50 px-4 py-2 text-sm font-semibold text-orange-700 transition hover:bg-orange-100">
            Buka katalog Jakarta
          </Link>
        </div>
      </section>

      {successMessage ? (
        <div className="rounded-[16px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">{successMessage}</div>
      ) : null}
      {errorMessage ? (
        <div className="rounded-[16px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{errorMessage}</div>
      ) : null}

      {error ? (
        <div className="rounded-[18px] border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-800">
          Tabel mapping belum tersedia di database aktif. Jalankan migration `2026062202_create_hotel_city_mappings.sql`.
        </div>
      ) : null}

      <MappingForm />

      <section className="rounded-[20px] border border-[#eee3d9] bg-white p-5 shadow-[0_14px_34px_rgba(15,23,42,0.04)]">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold tracking-[-0.03em] text-slate-950">Daftar mapping kota</h2>
            <p className="mt-1 text-sm text-slate-500">Gunakan hasil endpoint `Hotel/City5` Dharmawisata untuk mengisi ID yang paling akurat.</p>
          </div>
          <span className="rounded-full border border-orange-100 bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-700">
            {activeCount} aktif
          </span>
        </div>

        {mappings.length === 0 ? (
          <div className="mt-5 rounded-[16px] border border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
            Belum ada mapping kota hotel.
          </div>
        ) : (
          <div className="mt-5 space-y-4">
            {mappings.map((mapping) => (
              <article key={mapping.id} className="grid gap-4 rounded-[18px] border border-[#f0e6dd] bg-[#fffdfa] p-4 xl:grid-cols-[minmax(0,1fr)_430px]">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${mapping.is_active ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-50 text-slate-500"}`}>
                      {mapping.is_active ? "Aktif" : "Nonaktif"}
                    </span>
                    <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600">{mapping.destination_key}</span>
                  </div>
                  <h3 className="mt-3 text-base font-semibold text-slate-950">{mapping.destination_label}</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    {mapping.city_name || "City"} ({mapping.city_id}) | {mapping.country_name || "Country"} ({mapping.country_id})
                  </p>
                  {mapping.notes ? <p className="mt-3 text-sm leading-6 text-slate-600">{mapping.notes}</p> : null}
                  <p className="mt-3 text-xs text-slate-400">Update: {formatDateTime(mapping.updated_at)}</p>
                  <form action={toggleHotelCityMappingAction} className="mt-4">
                    <input type="hidden" name="id" value={mapping.id} />
                    <input type="hidden" name="next_active" value={mapping.is_active ? "false" : "true"} />
                    <button type="submit" className="rounded-[12px] border border-orange-200 bg-white px-3 py-2 text-xs font-semibold text-orange-700 transition hover:bg-orange-50">
                      {mapping.is_active ? "Nonaktifkan" : "Aktifkan"}
                    </button>
                  </form>
                </div>
                <MappingForm mapping={mapping} />
              </article>
            ))}
          </div>
        )}
      </section>
    </AdminProductWorkspace>
  )
}
