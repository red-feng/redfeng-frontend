import Image from "next/image"
import Link from "next/link"
import { notFound } from "next/navigation"
import PublicHeader from "@/app/components/PublicHeader"
import PublicInstallPrompt from "@/app/components/PublicInstallPrompt"
import PublicMobileNav from "@/app/components/PublicMobileNav"
import {
  buildHotelEstimatedStayTotal,
  getHotelCatalogItem,
  getHotelFactValue,
  normalizeHotelSearchParams,
} from "@/lib/hotels/hotelAvailability"
import { getCurrentLocale } from "@/lib/locale"
import HotelAvailabilityRequestForm from "./HotelAvailabilityRequestForm"

type HotelCatalogDetailPageProps = {
  params: Promise<{ id: string }>
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>
}

function formatIdr(value: number) {
  return `IDR ${Math.max(value, 0).toLocaleString("id-ID")}`
}

export default async function HotelCatalogDetailPage({ params, searchParams }: HotelCatalogDetailPageProps) {
  const locale = await getCurrentLocale()
  const { id } = await params
  const resolvedSearchParams = (await searchParams) || {}
  const hotel = getHotelCatalogItem(id)
  if (!hotel) notFound()

  const search = normalizeHotelSearchParams(resolvedSearchParams)
  const estimate = buildHotelEstimatedStayTotal(hotel, search)
  const star = getHotelFactValue(hotel, "Star") || hotel.highlights.find((entry) => entry.toLowerCase().includes("star")) || "Hotel"
  const stayCue = getHotelFactValue(hotel, "Stay cue") || hotel.group
  const meal = getHotelFactValue(hotel, "Meal")
  const access = getHotelFactValue(hotel, "Access")

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fffaf5_0%,#f8fbff_48%,#ffffff_100%)] pb-28">
      <PublicInstallPrompt locale={locale} />
      <PublicHeader locale={locale} variant="default" />

      <section className="mx-auto grid max-w-[1180px] gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:px-8">
        <div className="space-y-5">
          <Link href={`/hotel/catalog?destination=${encodeURIComponent(search.destination || hotel.location)}&checkin=${encodeURIComponent(search.checkin)}&checkout=${encodeURIComponent(search.checkout)}&adults=${search.adults}&children=${search.children}&rooms=${search.rooms}`} className="inline-flex text-sm font-semibold text-orange-600 transition hover:text-orange-700">
            Kembali ke katalog hotel
          </Link>

          <div className="overflow-hidden rounded-[8px] border border-[#eadfd5] bg-white shadow-[0_20px_48px_-34px_rgba(15,23,42,0.22)]">
            <div className="relative aspect-[16/8] min-h-[260px] bg-orange-50">
              <Image src={hotel.image} alt={hotel.title} fill priority sizes="(min-width: 1024px) 760px, 100vw" className="object-cover" />
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(15,23,42,0.04)_0%,rgba(15,23,42,0.52)_100%)]" />
              <div className="absolute bottom-5 left-5 right-5">
                <span className="inline-flex rounded-full border border-white/40 bg-white/90 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-orange-700">
                  Manual check
                </span>
                <h1 className="mt-3 max-w-3xl text-3xl font-semibold tracking-[-0.05em] text-white sm:text-4xl">{hotel.title}</h1>
                <p className="mt-2 text-sm font-medium text-white/88">{hotel.location} | {star} | {hotel.group}</p>
              </div>
            </div>

            <div className="grid gap-4 p-5 md:grid-cols-4">
              {[
                ["Check-in", search.checkin],
                ["Check-out", search.checkout],
                ["Durasi", `${estimate.nights} malam`],
                ["Tamu", `${search.adults} dewasa${search.children ? `, ${search.children} anak` : ""} | ${search.rooms} kamar`],
              ].map(([label, value]) => (
                <div key={label} className="rounded-[8px] border border-slate-100 bg-slate-50 px-4 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">{label}</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">{value}</p>
                </div>
              ))}
            </div>
          </div>

          <section className="rounded-[8px] border border-[#eadfd5] bg-white p-5 shadow-[0_18px_42px_-34px_rgba(15,23,42,0.18)]">
            <h2 className="text-xl font-semibold tracking-[-0.03em] text-slate-950">Ringkasan properti</h2>
            <p className="mt-3 text-sm leading-7 text-slate-600">{hotel.availabilityNote}</p>
            <p className="mt-2 text-sm leading-7 text-slate-500">{hotel.statusNote}</p>
            <div className="mt-5 flex flex-wrap gap-2">
              {[star, stayCue, meal, access, ...hotel.highlights].filter(Boolean).map((item) => (
                <span key={item} className="rounded-full border border-orange-100 bg-orange-50 px-3 py-1.5 text-xs font-semibold text-orange-700">
                  {item}
                </span>
              ))}
            </div>
          </section>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-[8px] border border-[#eadfd5] bg-white p-5 shadow-[0_18px_42px_-34px_rgba(15,23,42,0.24)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Estimasi curated</p>
            <p className="mt-2 text-sm text-slate-500">Mulai dari</p>
            <p className="mt-1 text-2xl font-semibold tracking-[-0.03em] text-orange-600">{formatIdr(estimate.pricePerNight)}</p>
            <p className="mt-1 text-xs text-slate-400">/malam</p>
            <div className="mt-4 rounded-[8px] border border-orange-100 bg-orange-50 p-3 text-sm text-orange-800">
              Total estimasi {estimate.nights} malam x {search.rooms} kamar: <span className="font-semibold">{formatIdr(estimate.totalAmount)}</span>
            </div>
            <p className="mt-3 text-xs leading-5 text-slate-500">Harga final menunggu validasi availability dan rate plan supplier.</p>
          </div>

          <HotelAvailabilityRequestForm
            hotelId={hotel.id}
            checkin={search.checkin}
            checkout={search.checkout}
            adults={search.adults}
            childrenCount={search.children}
            rooms={search.rooms}
          />
        </aside>
      </section>

      <PublicMobileNav locale={locale} />
    </main>
  )
}
