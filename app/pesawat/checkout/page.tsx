import Link from "next/link"
import SimplePublicLogoHeader from "@/app/components/SimplePublicLogoHeader"
import FlightCheckoutClient, { type FlightCheckoutData } from "./FlightCheckoutClient"

export const dynamic = "force-dynamic"

function firstParam(searchParams: Record<string, string | string[] | undefined>, key: string) {
  const value = searchParams[key]
  return Array.isArray(value) ? value[0] || "" : value || ""
}

function numberParam(searchParams: Record<string, string | string[] | undefined>, key: string) {
  const parsed = Number(firstParam(searchParams, key))
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : 0
}

export default async function FlightCheckoutPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const data: FlightCheckoutData = {
    offerId: firstParam(params, "offer_id"),
    title: firstParam(params, "title"),
    airline: firstParam(params, "airline"),
    airlineCode: firstParam(params, "airline_code"),
    flightNumber: firstParam(params, "flight_number"),
    origin: firstParam(params, "origin"),
    destination: firstParam(params, "destination"),
    route: firstParam(params, "route"),
    departDate: firstParam(params, "depart_date"),
    returnDate: firstParam(params, "return_date"),
    departureTime: firstParam(params, "departure_time"),
    arrivalTime: firstParam(params, "arrival_time"),
    duration: firstParam(params, "duration"),
    transit: firstParam(params, "transit"),
    cabin: firstParam(params, "cabin"),
    tripType: firstParam(params, "trip_type") || "one_way",
    passengers: firstParam(params, "passengers") || "1",
    price: numberParam(params, "price"),
    supplierPrice: numberParam(params, "supplier_price"),
    redfengMarkupAmount: numberParam(params, "redfeng_markup_amount"),
    fareReferenceId: firstParam(params, "fare_reference_id"),
    airlineAccessCode: firstParam(params, "airline_access_code"),
    searchKey: firstParam(params, "search_key"),
    detailSchedule: firstParam(params, "detail_schedule"),
    supplierFlightClass: firstParam(params, "supplier_flight_class"),
    source: firstParam(params, "source") || "catalog",
  }

  if (!data.origin || !data.destination || !data.departDate || !data.price) {
    return (
      <>
        <div className="bg-[#f8fafc]">
          <SimplePublicLogoHeader />
        </div>
        <main className="min-h-screen bg-[#f8fafc] px-4 py-10 sm:px-6 md:px-10">
          <section className="mx-auto max-w-2xl rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-orange-600">Checkout Pesawat</p>
            <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-950">Data flight belum lengkap</h1>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Silakan pilih jadwal dari katalog pesawat supaya rute, tanggal, dan estimasi fare ikut terbawa ke checkout.
            </p>
            <Link
              href="/pesawat/catalog"
              className="mt-6 inline-flex rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Kembali ke katalog pesawat
            </Link>
          </section>
        </main>
      </>
    )
  }

  return <FlightCheckoutClient data={data} />
}
