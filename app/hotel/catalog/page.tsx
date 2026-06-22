import Link from "next/link"
import PublicHeader from "@/app/components/PublicHeader"
import PublicInstallPrompt from "@/app/components/PublicInstallPrompt"
import PublicMobileNav from "@/app/components/PublicMobileNav"
import {
  getDharmawisataHotelDetailHref,
  loadDharmawisataHotelCatalog,
  type DharmawisataHotelCatalogItem,
} from "@/lib/hotels/dharmawisataHotelCatalog"
import {
  buildHotelDetailHref,
  getHotelCatalogItems,
  getHotelStartingPrice,
  getHotelStayNights,
  normalizeHotelSearchParams,
  type HotelAvailabilitySearch,
} from "@/lib/hotels/hotelAvailability"
import { getCurrentLocale } from "@/lib/locale"

export const dynamic = "force-dynamic"

type HotelCatalogRouteProps = {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>
}

function formatIdr(value: number | null) {
  if (!value || value <= 0) return "Cek harga"
  return `IDR ${Math.round(value).toLocaleString("id-ID")}`
}

function formatStay(search: HotelAvailabilitySearch) {
  const nights = Math.max(1, getHotelStayNights(search.checkin, search.checkout) || 1)
  return `${search.checkin} - ${search.checkout} | ${nights} malam | ${search.adults} dewasa${search.children ? `, ${search.children} anak` : ""} | ${search.rooms} kamar`
}

function SearchBar({ search }: { search: HotelAvailabilitySearch }) {
  return (
    <form action="/hotel/catalog" className="grid gap-3 rounded-[8px] border border-[#eadfd5] bg-white p-4 shadow-[0_18px_46px_-36px_rgba(15,23,42,0.28)] lg:grid-cols-[minmax(0,1.35fr)_repeat(4,minmax(0,0.75fr))_auto]">
      <label className="block">
        <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Destinasi</span>
        <input name="q" defaultValue={search.destination} placeholder="Jakarta, Bali, nama hotel" className="mt-1 h-11 w-full rounded-[8px] border border-slate-200 px-3 text-sm outline-none focus:border-orange-300 focus:ring-4 focus:ring-orange-100" />
      </label>
      <label className="block">
        <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Check-in</span>
        <input name="checkin" type="date" defaultValue={search.checkin} className="mt-1 h-11 w-full rounded-[8px] border border-slate-200 px-3 text-sm outline-none focus:border-orange-300 focus:ring-4 focus:ring-orange-100" />
      </label>
      <label className="block">
        <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Check-out</span>
        <input name="checkout" type="date" defaultValue={search.checkout} className="mt-1 h-11 w-full rounded-[8px] border border-slate-200 px-3 text-sm outline-none focus:border-orange-300 focus:ring-4 focus:ring-orange-100" />
      </label>
      <label className="block">
        <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Dewasa</span>
        <input name="adults" type="number" min={1} defaultValue={search.adults} className="mt-1 h-11 w-full rounded-[8px] border border-slate-200 px-3 text-sm outline-none focus:border-orange-300 focus:ring-4 focus:ring-orange-100" />
      </label>
      <label className="block">
        <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Kamar</span>
        <input name="rooms" type="number" min={1} defaultValue={search.rooms} className="mt-1 h-11 w-full rounded-[8px] border border-slate-200 px-3 text-sm outline-none focus:border-orange-300 focus:ring-4 focus:ring-orange-100" />
      </label>
      <input type="hidden" name="children" value={search.children} />
      <button type="submit" className="h-11 self-end rounded-[8px] bg-orange-600 px-5 text-sm font-semibold text-white transition hover:bg-orange-700">
        Cari hotel
      </button>
    </form>
  )
}

function LiveHotelCard({ item, search }: { item: DharmawisataHotelCatalogItem; search: HotelAvailabilitySearch }) {
  const statusLabel =
    item.sourceMode === "availability"
      ? item.isAvailable === false
        ? "Perlu konfirmasi"
        : "Availability live"
      : "Direktori supplier"
  const statusClassName =
    item.sourceMode === "availability" && item.isAvailable !== false
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : "border-orange-200 bg-orange-50 text-orange-700"

  return (
    <article className="grid gap-4 rounded-[8px] border border-[#eadfd5] bg-white p-4 shadow-[0_18px_42px_-34px_rgba(15,23,42,0.18)] md:grid-cols-[120px_minmax(0,1fr)_190px]">
      <div className="flex aspect-[4/3] items-center justify-center rounded-[8px] border border-orange-100 bg-[linear-gradient(135deg,#fff7ed_0%,#eef8ff_100%)] text-2xl font-semibold text-orange-600">
        {item.title.slice(0, 2).toUpperCase()}
      </div>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${statusClassName}`}>
            {statusLabel}
          </span>
          {item.rating ? <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-semibold text-slate-600">{item.rating} star</span> : null}
          {item.market ? <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-semibold text-slate-600">{item.market}</span> : null}
        </div>
        <h2 className="mt-3 text-xl font-semibold tracking-[-0.03em] text-slate-950">{item.title}</h2>
        <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-500">{item.location}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {item.facilities.slice(0, 4).map((facility) => (
            <span key={facility} className="rounded-full border border-slate-100 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
              {facility}
            </span>
          ))}
          <span className="rounded-full border border-slate-100 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-500">
            ID supplier: {item.supplierHotelId || "-"}
          </span>
        </div>
      </div>
      <div className="flex flex-col justify-between rounded-[8px] border border-slate-100 bg-slate-50 p-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Mulai dari</p>
          <p className="mt-1 text-lg font-semibold text-orange-600">{formatIdr(item.priceStart)}</p>
          <p className="mt-2 text-xs leading-5 text-slate-500">{item.message || "Harga final akan dicek sebelum payment dibuka."}</p>
        </div>
        <Link href={getDharmawisataHotelDetailHref(item, search)} className="mt-4 inline-flex h-11 items-center justify-center rounded-[8px] bg-orange-600 px-4 text-sm font-semibold text-white transition hover:bg-orange-700">
          Ajukan quote
        </Link>
      </div>
    </article>
  )
}

function CuratedHotelCard({ item, search }: { item: ReturnType<typeof getHotelCatalogItems>[number]; search: HotelAvailabilitySearch }) {
  return (
    <article className="grid gap-4 rounded-[8px] border border-[#eadfd5] bg-white p-4 shadow-[0_18px_42px_-34px_rgba(15,23,42,0.16)] md:grid-cols-[minmax(0,1fr)_180px]">
      <div>
        <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">Fallback curated</span>
        <h2 className="mt-3 text-xl font-semibold tracking-[-0.03em] text-slate-950">{item.title}</h2>
        <p className="mt-2 text-sm leading-6 text-slate-500">{item.location} | {item.group}</p>
        <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-500">{item.availabilityNote}</p>
      </div>
      <div className="rounded-[8px] border border-slate-100 bg-slate-50 p-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Estimasi</p>
        <p className="mt-1 text-lg font-semibold text-orange-600">{formatIdr(getHotelStartingPrice(item))}</p>
        <Link href={buildHotelDetailHref(item.id, search)} className="mt-4 inline-flex h-11 w-full items-center justify-center rounded-[8px] border border-orange-200 bg-white px-4 text-sm font-semibold text-orange-700 transition hover:bg-orange-50">
          Minta cek
        </Link>
      </div>
    </article>
  )
}

export default async function HotelCatalogRoute({ searchParams }: HotelCatalogRouteProps) {
  const locale = await getCurrentLocale()
  const resolvedSearchParams = (await searchParams) || {}
  const search = normalizeHotelSearchParams(resolvedSearchParams)
  const liveCatalog = await loadDharmawisataHotelCatalog(search)
  const curatedItems = getHotelCatalogItems()

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fffaf5_0%,#f8fbff_44%,#ffffff_100%)] pb-28">
      <PublicInstallPrompt locale={locale} />
      <PublicHeader locale={locale} variant="default" />

      <section className="mx-auto max-w-[1180px] px-4 py-6 sm:px-6 lg:px-8">
        <div className="rounded-[8px] border border-[#eadfd5] bg-white p-5 shadow-[0_20px_52px_-38px_rgba(15,23,42,0.28)]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-orange-600">Hotel catalog</p>
          <div className="mt-2 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-3xl font-semibold tracking-[-0.05em] text-slate-950">Cari hotel Red Feng</h1>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                {formatStay(search)}. Data Dharmawisata dipakai untuk menemukan hotel live, lalu Red Feng cek availability dan harga final sebelum payment.
              </p>
            </div>
            <div className={`rounded-[8px] border px-3 py-2 text-xs font-semibold ${liveCatalog.status === "ready" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-orange-200 bg-orange-50 text-orange-700"}`}>
              {liveCatalog.status === "ready" ? "Dharmawisata live" : "Fallback aktif"}
            </div>
          </div>
          <div className="mt-5">
            <SearchBar search={search} />
          </div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_310px]">
          <div className="space-y-4">
            <div className="rounded-[8px] border border-[#eadfd5] bg-white p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Status supplier</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">{liveCatalog.message}</p>
              {liveCatalog.cityId || liveCatalog.countryId ? (
                <p className="mt-2 text-xs font-medium text-slate-400">
                  City ID {liveCatalog.cityId || "-"} | Country ID {liveCatalog.countryId || "-"}
                </p>
              ) : null}
            </div>

            {liveCatalog.items.length > 0 ? (
              <section className="space-y-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-orange-600">Hasil Dharmawisata</p>
                  <h2 className="mt-1 text-2xl font-semibold tracking-[-0.04em] text-slate-950">
                    {liveCatalog.items.length} hotel ditemukan
                  </h2>
                </div>
                {liveCatalog.items.map((item) => (
                  <LiveHotelCard key={`${item.id}-${item.supplierInternalCode}`} item={item} search={search} />
                ))}
              </section>
            ) : (
              <section className="space-y-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-orange-600">Fallback curated</p>
                  <h2 className="mt-1 text-2xl font-semibold tracking-[-0.04em] text-slate-950">Hotel rekomendasi sementara</h2>
                </div>
                {curatedItems.map((item) => (
                  <CuratedHotelCard key={item.id} item={item} search={search} />
                ))}
              </section>
            )}
          </div>

          <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-[8px] border border-[#eadfd5] bg-white p-5 shadow-[0_18px_42px_-34px_rgba(15,23,42,0.18)]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-orange-600">Alur hotel</p>
              <div className="mt-4 space-y-3 text-sm text-slate-600">
                {[
                  "Customer pilih hotel dan ajukan quote.",
                  "Red Feng cek availability serta harga final ke Dharmawisata.",
                  "Hotel langsung payment ke supplier saat booking dikonfirmasi.",
                  "Payment customer dibuka setelah quote aman.",
                ].map((step, index) => (
                  <div key={step} className="flex gap-3 rounded-[8px] border border-slate-100 bg-slate-50 p-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-orange-600 text-xs font-semibold text-white">{index + 1}</span>
                    <p className="leading-6">{step}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-[8px] border border-emerald-100 bg-emerald-50 p-4 text-sm leading-6 text-emerald-800">
              Payment hotel tetap memakai guard Red Feng. Customer tidak diarahkan bayar sebelum availability dan harga supplier valid.
            </div>
          </aside>
        </div>
      </section>

      <PublicMobileNav locale={locale} />
    </main>
  )
}
