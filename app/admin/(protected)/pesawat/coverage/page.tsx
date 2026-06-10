import Link from "next/link"
import AdminProductWorkspace from "@/app/components/AdminProductWorkspace"
import {
  dharmawisataPartnerAirlines,
  dharmawisataReferenceAirports,
} from "@/lib/flights/dharmawisataSupplierCatalog"
import { loadDharmawisataCoverageSummary } from "@/lib/flights/dharmawisataSupplierCoverage"

function getStatusBadgeClasses(status: string) {
  if (status === "uat_live_verified") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700"
  }
  if (status === "production_live_verified") {
    return "border-sky-200 bg-sky-50 text-sky-700"
  }
  return "border-amber-200 bg-amber-50 text-amber-700"
}

function formatStatusLabel(status: string) {
  if (status === "uat_live_verified") return "UAT Live Verified"
  if (status === "production_live_verified") return "Production Live Verified"
  return "Reference Only"
}

export default async function AdminFlightsCoveragePage() {
  const supplierCatalogSummary = await loadDharmawisataCoverageSummary()
  const domesticAirports = dharmawisataReferenceAirports.filter((airport) => airport.countryCode === "ID")
  const internationalAirports = dharmawisataReferenceAirports.filter((airport) => airport.countryCode !== "ID")

  return (
    <AdminProductWorkspace
      productType="flight"
      productLabel="Pesawat Coverage"
      description="Coverage supplier ini dipakai untuk membedakan data referensi, route yang sudah verified di UAT, dan area yang masih menunggu verifikasi production."
      statusLabel="Coverage supplier aktif"
      statusNote="Semua data di halaman ini berasal dari hasil penyambungan RedFeng ke Dharmawisata. Verified live saat ini masih berbasis UAT, bukan production."
      primaryActionHref="/admin/pesawat"
      primaryActionLabel="Kembali ke dashboard Pesawat"
      secondaryActionHref="/admin/pesawat/bookings/new"
      secondaryActionLabel="Buat booking Pesawat"
      preparedModules={["Supplier airlines", "Reference airports", "Verified live routes", "Environment tracking", "Ops verification notes"]}
    >
      <div className="grid gap-4 xl:grid-cols-4">
        <div className="rounded-[18px] border border-[#eee3d9] bg-white p-5 shadow-[0_14px_34px_rgba(15,23,42,0.04)]">
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-orange-500">Environments</p>
          <p className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-slate-950">
            {supplierCatalogSummary.environments.join(", ").toUpperCase()}
          </p>
          <p className="mt-2 text-xs leading-5 text-slate-500">
            Environment supplier yang saat ini sudah dibuktikan oleh integrasi RedFeng.
          </p>
        </div>
        <div className="rounded-[18px] border border-[#eee3d9] bg-white p-5 shadow-[0_14px_34px_rgba(15,23,42,0.04)]">
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-orange-500">Partner Airlines</p>
          <p className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-slate-950">{dharmawisataPartnerAirlines.length}</p>
          <p className="mt-2 text-xs leading-5 text-slate-500">
            {dharmawisataPartnerAirlines.map((airline) => `${airline.code} ${airline.name}`).join(" • ")}
          </p>
        </div>
        <div className="rounded-[18px] border border-[#eee3d9] bg-white p-5 shadow-[0_14px_34px_rgba(15,23,42,0.04)]">
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-orange-500">Reference Airports</p>
          <p className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-slate-950">{dharmawisataReferenceAirports.length}</p>
          <p className="mt-2 text-xs leading-5 text-slate-500">
            {domesticAirports.length} domestik dan {internationalAirports.length} internasional.
          </p>
        </div>
        <div className="rounded-[18px] border border-[#eee3d9] bg-white p-5 shadow-[0_14px_34px_rgba(15,23,42,0.04)]">
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-orange-500">Verified Live Routes</p>
          <p className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-slate-950">{supplierCatalogSummary.verifiedRouteCount}</p>
          <p className="mt-2 text-xs leading-5 text-slate-500">
            Route ini sudah pernah mengembalikan fare live di pengecekan supplier UAT.
          </p>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-5">
          <div className="rounded-[20px] border border-[#eee3d9] bg-white p-5 shadow-[0_14px_34px_rgba(15,23,42,0.04)]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-slate-950">Verified Live Route Matrix</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Route di bawah ini paling aman dipakai untuk uji live karena sudah pernah lolos pengecekan supplier.
                </p>
              </div>
              <span className="rounded-[12px] border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                {supplierCatalogSummary.source === "database" ? "DB-backed" : "Fallback data"}
              </span>
            </div>

            <div className="mt-5 overflow-x-auto">
              <table className="min-w-full divide-y divide-[#f0e6dd] text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-[0.18em] text-slate-400">
                    <th className="pb-3 pr-4 font-semibold">Route</th>
                    <th className="pb-3 pr-4 font-semibold">Airlines</th>
                    <th className="pb-3 pr-4 font-semibold">Verified Dates</th>
                    <th className="pb-3 pr-4 font-semibold">Observed Fare</th>
                    <th className="pb-3 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f6eee7]">
                  {supplierCatalogSummary.verifiedRoutes.map((route) => (
                    <tr key={`${route.originCode}-${route.destinationCode}`} className="align-top">
                      <td className="py-4 pr-4 font-semibold text-slate-900">
                        {route.originCode} - {route.destinationCode}
                      </td>
                      <td className="py-4 pr-4 text-slate-600">{route.airlineCodes.join(", ")}</td>
                      <td className="py-4 pr-4 text-slate-600">{route.verifiedDates.join(", ")}</td>
                      <td className="py-4 pr-4 text-slate-900">
                        {route.lowestObservedFareIdr ? `IDR ${route.lowestObservedFareIdr.toLocaleString("id-ID")}` : "-"}
                      </td>
                      <td className="py-4">
                        <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getStatusBadgeClasses(route.availabilityStatus)}`}>
                          {formatStatusLabel(route.availabilityStatus)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-[20px] border border-[#eee3d9] bg-white p-5 shadow-[0_14px_34px_rgba(15,23,42,0.04)]">
            <h2 className="text-base font-semibold text-slate-950">Reference Airports</h2>
            <div className="mt-5 grid gap-5 xl:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Domestik</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {domesticAirports.map((airport) => (
                    <span key={airport.code} className="inline-flex rounded-full border border-[#ecd9c2] bg-[#fffaf3] px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-700">
                      {airport.code} {airport.city}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Internasional</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {internationalAirports.map((airport) => (
                    <span key={airport.code} className="inline-flex rounded-full border border-[#e2e8f0] bg-slate-50 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-700">
                      {airport.code} {airport.city}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <div className="rounded-[20px] border border-[#eee3d9] bg-white p-5 shadow-[0_14px_34px_rgba(15,23,42,0.04)]">
            <h2 className="text-base font-semibold text-slate-950">Partner Airlines</h2>
            <div className="mt-4 space-y-3">
              {dharmawisataPartnerAirlines.map((airline) => (
                <div key={airline.code} className="flex items-center justify-between rounded-[16px] border border-[#f0e6dd] bg-[#fffdfa] p-4">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{airline.name}</p>
                    <p className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-400">{airline.code}</p>
                  </div>
                  <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getStatusBadgeClasses(airline.availabilityStatus)}`}>
                    {formatStatusLabel(airline.availabilityStatus)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[20px] border border-[#eee3d9] bg-white p-5 shadow-[0_14px_34px_rgba(15,23,42,0.04)]">
            <h2 className="text-base font-semibold text-slate-950">Operational Notes</h2>
            <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
              <li>Reference airport dan route coverage berguna untuk membangun search experience, tetapi tidak otomatis menjamin fare live tersedia.</li>
              <li>Jika user mencari route yang pernah verified namun hasilnya fallback, berarti request tanggal atau kondisi supplier saat itu tidak sedang mengembalikan fare live.</li>
              <li>Begitu kredensial production diberikan oleh mitra, halaman ini bisa dinaikkan menjadi acuan production verification RedFeng.</li>
            </ul>
          </div>

          <div className="rounded-[20px] border border-[#eee3d9] bg-white p-5 shadow-[0_14px_34px_rgba(15,23,42,0.04)]">
            <h2 className="text-base font-semibold text-slate-950">Navigasi Cepat</h2>
            <div className="mt-4 grid gap-3">
              <Link
                href="/admin/pesawat"
                className="inline-flex items-center justify-center rounded-[14px] border border-[#ecd9c2] bg-[#fff7ef] px-4 py-3 text-sm font-semibold text-orange-600 transition hover:border-orange-200 hover:bg-orange-50"
              >
                Kembali ke dashboard Pesawat
              </Link>
              <Link
                href="/pesawat/catalog?trip=one_way&from=Jakarta+%28CGK%29&to=Surabaya+%28SUB%29&depart=2026-06-24&passengers=1+Dewasa&cabin=Economy&sort=best"
                className="inline-flex items-center justify-center rounded-[14px] bg-orange-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-orange-700"
              >
                Buka route uji live CGK-SUB
              </Link>
            </div>
          </div>
        </div>
      </div>
    </AdminProductWorkspace>
  )
}
