import AdminProductWorkspace from "@/app/components/AdminProductWorkspace"
import Link from "next/link"
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

export default async function AdminFlightsWorkspacePage() {
  const supplierCatalogSummary = await loadDharmawisataCoverageSummary()
  const airlineLabelByCode = new Map(
    dharmawisataPartnerAirlines.map((airline) => [airline.code, airline.name]),
  )

  return (
    <AdminProductWorkspace
      productType="flight"
      productLabel="Pesawat"
      description="Workspace Pesawat sekarang dipakai untuk booking affiliate dasar, sehingga tim operasional bisa mulai mencatat supplier, rute, jadwal, dan status issue tiket tanpa tercampur dengan workflow Paket Tour."
      statusLabel="Flow operasional aktif dengan supplier UAT"
      statusNote="Booking affiliate Pesawat sudah menyimpan route, cabin, trip type, dan jadwal pulang. Fare live yang sudah terbukti saat ini masih berasal dari environment UAT Dharmawisata, jadi belum boleh dianggap production live."
      primaryActionHref="/admin/pesawat/bookings/new"
      primaryActionLabel="Buat booking Pesawat"
      secondaryActionHref="/admin/pesawat/ops"
      secondaryActionLabel="Buka Flight Ops Board"
      preparedModules={["Create booking", "Supplier affiliate", "Flight details", "Trip contract", "Issue status", "Promo-ready context"]}
    >
      <div className="grid gap-4 xl:grid-cols-4">
        <div className="rounded-[18px] border border-[#eee3d9] bg-white p-5 shadow-[0_14px_34px_rgba(15,23,42,0.04)]">
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-orange-500">Supplier Environment</p>
          <p className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-slate-950">
            {supplierCatalogSummary.environments.join(", ").toUpperCase()}
          </p>
          <p className="mt-2 text-xs leading-5 text-slate-500">
            Environment yang sudah berhasil diverifikasi live oleh RedFeng saat ini.
          </p>
        </div>

        <div className="rounded-[18px] border border-[#eee3d9] bg-white p-5 shadow-[0_14px_34px_rgba(15,23,42,0.04)]">
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-orange-500">Partner Airlines</p>
          <p className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-slate-950">
            {supplierCatalogSummary.airlineCount}
          </p>
          <p className="mt-2 text-xs leading-5 text-slate-500">
            {dharmawisataPartnerAirlines.map((airline) => `${airline.code} ${airline.name}`).join(" • ")}
          </p>
        </div>

        <div className="rounded-[18px] border border-[#eee3d9] bg-white p-5 shadow-[0_14px_34px_rgba(15,23,42,0.04)]">
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-orange-500">Reference Airports</p>
          <p className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-slate-950">
            {supplierCatalogSummary.airportCount}
          </p>
          <p className="mt-2 text-xs leading-5 text-slate-500">
            {dharmawisataReferenceAirports.filter((airport) => airport.countryCode === "ID").length} domestik dan{" "}
            {dharmawisataReferenceAirports.filter((airport) => airport.countryCode !== "ID").length} internasional.
          </p>
        </div>

        <div className="rounded-[18px] border border-[#eee3d9] bg-white p-5 shadow-[0_14px_34px_rgba(15,23,42,0.04)]">
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-orange-500">Verified Live Routes</p>
          <p className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-slate-950">
            {supplierCatalogSummary.verifiedRouteCount}
          </p>
          <p className="mt-2 text-xs leading-5 text-slate-500">
            Hanya rute ini yang sudah terbukti mengembalikan fare live pada pengecekan UAT terakhir.
          </p>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-[20px] border border-[#eee3d9] bg-white p-5 shadow-[0_14px_34px_rgba(15,23,42,0.04)]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-slate-950">Rute Live Yang Sudah Diverifikasi</h2>
              <p className="mt-1 text-sm text-slate-500">
                Data ini aman dipakai sebagai acuan internal karena sudah diuji langsung ke supplier UAT.
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
                  <th className="pb-3 pr-4 font-semibold">Lowest Fare</th>
                  <th className="pb-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f6eee7]">
                {supplierCatalogSummary.verifiedRoutes.map((route) => (
                  <tr key={`${route.originCode}-${route.destinationCode}`} className="align-top">
                    <td className="py-4 pr-4">
                      <p className="font-semibold text-slate-900">
                        {route.originCode} - {route.destinationCode}
                      </p>
                    </td>
                    <td className="py-4 pr-4 text-slate-600">
                      {route.airlineCodes
                        .map((code) => `${code} ${airlineLabelByCode.get(code) || code}`)
                        .join(" • ")}
                    </td>
                    <td className="py-4 pr-4 text-slate-600">
                      {route.verifiedDates.join(", ")}
                    </td>
                    <td className="py-4 pr-4 text-slate-900">
                      {route.lowestObservedFareIdr
                        ? `IDR ${route.lowestObservedFareIdr.toLocaleString("id-ID")}`
                        : "-"}
                    </td>
                    <td className="py-4">
                      <span
                        className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getStatusBadgeClasses(route.availabilityStatus)}`}
                      >
                        {formatStatusLabel(route.availabilityStatus)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-5">
          <div className="rounded-[20px] border border-[#eee3d9] bg-white p-5 shadow-[0_14px_34px_rgba(15,23,42,0.04)]">
            <h2 className="text-base font-semibold text-slate-950">Interpretasi Status</h2>
            <div className="mt-4 space-y-3">
              <div className="rounded-[16px] border border-amber-200 bg-amber-50 p-4">
                <p className="text-sm font-semibold text-amber-800">Reference Only</p>
                <p className="mt-1 text-xs leading-5 text-amber-700">
                  Supplier punya referensi maskapai, kota, atau rute, tetapi RedFeng belum membuktikan fare live untuk kombinasi rute dan tanggal itu.
                </p>
              </div>
              <div className="rounded-[16px] border border-emerald-200 bg-emerald-50 p-4">
                <p className="text-sm font-semibold text-emerald-800">UAT Live Verified</p>
                <p className="mt-1 text-xs leading-5 text-emerald-700">
                  Fare live sudah muncul dari endpoint UAT Dharmawisata. Ini boleh dipakai untuk validasi integrasi, tetapi belum boleh diklaim production live.
                </p>
              </div>
              <div className="rounded-[16px] border border-sky-200 bg-sky-50 p-4">
                <p className="text-sm font-semibold text-sky-800">Production Live Verified</p>
                <p className="mt-1 text-xs leading-5 text-sky-700">
                  Status ini baru boleh dipakai setelah RedFeng menerima kredensial production dan lolos pengecekan live di endpoint production supplier.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-[20px] border border-[#eee3d9] bg-white p-5 shadow-[0_14px_34px_rgba(15,23,42,0.04)]">
            <h2 className="text-base font-semibold text-slate-950">Catatan Operasional</h2>
            <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
              <li>Maskapai partner yang berhasil dibaca dari supplier: {dharmawisataPartnerAirlines.map((airline) => airline.code).join(", ")}.</li>
              <li>Availability live bersifat sensitif terhadap kombinasi rute, tanggal, dan airline. Route reference yang banyak tidak berarti semua tanggal punya fare live.</li>
              <li>Jika token production sudah diberikan, panel ini bisa dinaikkan dari UAT menjadi production verification tanpa mengubah struktur dashboard.</li>
            </ul>
          </div>

          <div className="rounded-[20px] border border-[#eee3d9] bg-white p-5 shadow-[0_14px_34px_rgba(15,23,42,0.04)]">
            <h2 className="text-base font-semibold text-slate-950">Flight Ops Board</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Pantau alur pesawat dari recheck fare, hold/PNR, payment Midtrans, ticketing, issued, sampai follow up dari satu layar kerja.
            </p>
            <Link
              href="/admin/pesawat/ops"
              className="mt-4 inline-flex items-center justify-center rounded-[14px] bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Buka ops board
            </Link>
          </div>

          <div className="rounded-[20px] border border-[#eee3d9] bg-white p-5 shadow-[0_14px_34px_rgba(15,23,42,0.04)]">
            <h2 className="text-base font-semibold text-slate-950">Booking Center Pesawat</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Buka daftar booking pesawat dengan filter status flight, badge lifecycle, dan quick action di card booking.
            </p>
            <Link
              href="/admin/bookings?product=pesawat"
              className="mt-4 inline-flex items-center justify-center rounded-[14px] border border-[#ecd9c2] bg-[#fff7ef] px-4 py-2.5 text-sm font-semibold text-orange-600 transition hover:border-orange-200 hover:bg-orange-50"
            >
              Lihat booking pesawat
            </Link>
          </div>

          <div className="rounded-[20px] border border-[#eee3d9] bg-white p-5 shadow-[0_14px_34px_rgba(15,23,42,0.04)]">
            <h2 className="text-base font-semibold text-slate-950">Diagnostics Dharmawisata</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Jalankan test login token dan low fare search untuk memastikan environment supplier sedang sehat sebelum checkout dipakai customer.
            </p>
            <Link
              href="/admin/pesawat/diagnostics"
              className="mt-4 inline-flex items-center justify-center rounded-[14px] bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-700"
            >
              Buka diagnostics
            </Link>
          </div>

          <div className="rounded-[20px] border border-[#eee3d9] bg-white p-5 shadow-[0_14px_34px_rgba(15,23,42,0.04)]">
            <h2 className="text-base font-semibold text-slate-950">Coverage Supplier</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Buka halaman coverage untuk melihat daftar maskapai, airport referensi, dan route verification dengan format yang lebih lengkap.
            </p>
            <Link
              href="/admin/pesawat/coverage"
              className="mt-4 inline-flex items-center justify-center rounded-[14px] border border-[#ecd9c2] bg-[#fff7ef] px-4 py-2.5 text-sm font-semibold text-orange-600 transition hover:border-orange-200 hover:bg-orange-50"
            >
              Buka coverage supplier
            </Link>
          </div>
        </div>
      </div>
    </AdminProductWorkspace>
  )
}
