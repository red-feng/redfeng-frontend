import PublicHeader from "@/app/components/PublicHeader"
import PublicInstallPrompt from "@/app/components/PublicInstallPrompt"
import PublicMobileNav from "@/app/components/PublicMobileNav"
import PublicStickyAction from "@/app/components/PublicStickyAction"
import {
  getDefaultFlightSearchDates,
  isFlightTripMode,
  normalizeFlightLocationLabel,
} from "@/app/components/flights/flightSearchParams"
import FlightCatalogInteractiveClient from "@/app/components/services/FlightCatalogInteractiveClient"
import { servicePageConfigBySlug } from "@/app/components/services/serviceCatalog"
import { buildFlightCatalogItems } from "@/lib/flights/flightCatalogService"
import { getCurrentLocale } from "@/lib/locale"

function firstQueryValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] || "" : value || ""
}

function allQueryValues(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value.map((entry) => String(entry || "").trim()).filter(Boolean)
  const normalized = String(value || "").trim()
  return normalized ? [normalized] : []
}

function getFlightCopy(locale: string) {
  if (locale === "en") {
    return {
      searchSummary: "Search summary",
      topTitle: "RedFeng live flight catalog",
      topBody: "Flight results are shown only when the live supplier returns matching fares. Payment opens after fare and seat availability are validated.",
      refineSearch: "Refine search",
      roundTrip: "Round Trip",
      oneWay: "One Way",
      multiCity: "Multi City",
      fromLabel: "From",
      viaLabel: "Transit",
      toLabel: "To",
      departLabel: "Depart",
      returnLabel: "Return",
      passengerLabel: "Passengers",
      passengerClassLabel: "Passengers & Class",
      cabinLabel: "Cabin",
      allRegions: "All regions",
      allGroups: "All trip types",
      allAirlines: "All airlines",
      allDepartWindows: "All times",
      allTransitTypes: "All transit options",
      allPriceBands: "All prices",
      flightsFound: "flight options",
      sortLabel: "Sort by",
      sortBest: "Best choice",
      sortPrice: "Lowest price",
      sortEarly: "Earliest departure",
      sortDepartLate: "Latest departure",
      sortArriveEarly: "Earliest arrival",
      sortArriveLate: "Latest arrival",
      refundTag: "Supplier rules",
      baggageTag: "Baggage follows fare",
      activeFilters: "Active filters",
      leftTitle: "Filter results",
      leftBody: "Use filters to narrow live supplier results.",
      regionBlock: "Region",
      tripBlock: "Trip type",
      airlineBlock: "Airline",
      departWindowBlock: "Departure time",
      transitBlock: "Transit",
      priceBlock: "Price range",
      departMorning: "Morning to noon",
      departAfternoon: "Noon to evening",
      departEvening: "Evening",
      directOnly: "Direct only",
      transitAllowed: "Transit / mixed",
      priceBudget: "Below 1.5m",
      priceMid: "1.5m - 3m",
      pricePremium: "Above 3m",
      resetFilters: "Reset all",
      priceLabel: "Starting from",
      chooseLabel: "Choose",
      fareLabel: "Live fare",
      supportHint: "Live fares are shown from Dharmawisata for this route and date.",
      fallbackHint: "No sample fares are shown. Try another route or date after the live supplier returns matching fares.",
      emptyTitle: "No live flights found",
      emptyBody: "Try another route or date. RedFeng does not show sample fare inventory in this catalog.",
    }
  }

  if (locale === "zh") {
    return getFlightCopy("en")
  }

  return {
    searchSummary: "Ringkasan pencarian",
    topTitle: "Katalog pesawat live RedFeng",
    topBody: "Hasil pesawat hanya ditampilkan saat supplier live mengembalikan fare yang cocok. Pembayaran dibuka setelah harga dan kursi divalidasi.",
    refineSearch: "Ubah pencarian",
    roundTrip: "Pulang - Pergi",
    oneWay: "Sekali Jalan",
    multiCity: "Multi Kota",
    fromLabel: "Dari",
    viaLabel: "Transit",
    toLabel: "Ke",
    departLabel: "Berangkat",
    returnLabel: "Pulang",
    passengerLabel: "Penumpang",
    passengerClassLabel: "Penumpang & Kelas",
    cabinLabel: "Kabin",
    allRegions: "Semua region",
    allGroups: "Semua tipe",
    allAirlines: "Semua maskapai",
    allDepartWindows: "Semua jam",
    allTransitTypes: "Semua transit",
    allPriceBands: "Semua harga",
    flightsFound: "opsi penerbangan",
    sortLabel: "Urutkan",
    sortBest: "Pilihan terbaik",
    sortPrice: "Harga terendah",
    sortEarly: "Berangkat paling pagi",
    sortDepartLate: "Berangkat paling akhir",
    sortArriveEarly: "Tiba paling awal",
    sortArriveLate: "Tiba paling akhir",
    refundTag: "Aturan supplier",
    baggageTag: "Bagasi ikut fare",
    activeFilters: "Filter aktif",
    leftTitle: "Saring hasil",
    leftBody: "Gunakan filter untuk mempersempit hasil live dari supplier.",
    regionBlock: "Region",
    tripBlock: "Tipe perjalanan",
    airlineBlock: "Maskapai",
    departWindowBlock: "Jam berangkat",
    transitBlock: "Transit",
    priceBlock: "Rentang harga",
    departMorning: "Pagi - siang",
    departAfternoon: "Siang - sore",
    departEvening: "Malam",
    directOnly: "Langsung",
    transitAllowed: "Transit / mixed",
    priceBudget: "Di bawah 1.5 jt",
    priceMid: "1.5 jt - 3 jt",
    pricePremium: "Di atas 3 jt",
    resetFilters: "Reset semua",
    priceLabel: "Mulai dari",
    chooseLabel: "Pilih",
    fareLabel: "Fare live",
    supportHint: "Menampilkan fare live dari Dharmawisata untuk rute dan tanggal ini.",
    fallbackHint: "Tidak ada fare contoh yang ditampilkan. Coba rute atau tanggal lain setelah supplier live mengembalikan fare yang cocok.",
    emptyTitle: "Belum ada penerbangan live",
    emptyBody: "Coba rute atau tanggal lain. RedFeng tidak menampilkan inventory fare contoh di katalog ini.",
  }
}

export default async function FlightCatalogPage({
  searchParams,
}: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const locale = await getCurrentLocale()
  const resolvedSearchParams = (await searchParams) || {}
  const service = servicePageConfigBySlug.pesawat
  const defaultFlightDates = getDefaultFlightSearchDates()
  const flightTrip = firstQueryValue(resolvedSearchParams.trip) || "one_way"
  const rawFlightFrom = firstQueryValue(resolvedSearchParams.from)
  const rawFlightTo = firstQueryValue(resolvedSearchParams.to)
  const flightFrom = normalizeFlightLocationLabel(rawFlightFrom || "SUB Surabaya")
  const flightVia = normalizeFlightLocationLabel(firstQueryValue(resolvedSearchParams.via) || "Singapore")
  const flightTo = normalizeFlightLocationLabel(rawFlightTo || "CGK Jakarta")
  const flightDepart = firstQueryValue(resolvedSearchParams.depart) || defaultFlightDates.depart
  const flightReturn = firstQueryValue(resolvedSearchParams.return) || defaultFlightDates.returnDate
  const flightPassengers = firstQueryValue(resolvedSearchParams.passengers) || "1 Dewasa"
  const flightCabin = firstQueryValue(resolvedSearchParams.cabin) || "Economy"
  const flightSort = firstQueryValue(resolvedSearchParams.sort) || "best"
  const selectedRegion = firstQueryValue(resolvedSearchParams.region)
  const selectedGroup = firstQueryValue(resolvedSearchParams.group)
  const keyword = firstQueryValue(resolvedSearchParams.q)
  const flightAirlines = allQueryValues(resolvedSearchParams.airline)
  const flightDepartWindows = allQueryValues(resolvedSearchParams.depart_window)
  const flightTransitTypes = allQueryValues(resolvedSearchParams.transit_type)
  const flightPriceBands = allQueryValues(resolvedSearchParams.price_band)
  const affiliateFlightSearchResult = await buildFlightCatalogItems({
    items: [],
    locale,
    trip: flightTrip,
    rawFrom: rawFlightFrom || flightFrom,
    rawTo: rawFlightTo || flightTo,
    depart: flightDepart,
    returnDate: flightReturn,
    passengers: flightPassengers,
    cabin: flightCabin,
    sort: flightSort,
    airlines: flightAirlines,
    departWindows: flightDepartWindows,
    transitTypes: flightTransitTypes,
    priceBands: flightPriceBands,
    isFlightTripMode,
  })
  const flightCopy = getFlightCopy(locale)

  return (
    <div id="top" className="min-h-screen bg-[linear-gradient(180deg,#f6fbff_0%,#f9fbff_16%,#fffdfa_48%,#f3f6fb_100%)] pb-36 md:pb-0">
      <PublicInstallPrompt locale={locale} />
      <PublicHeader locale={locale} variant="default" />
      <FlightCatalogInteractiveClient
        items={affiliateFlightSearchResult.items.map(({ item, meta }) => ({
          ...item,
          meta,
        }))}
        dataSource={affiliateFlightSearchResult.source}
        emptyKeyword="rute atau tanggal lain"
        searchPlaceholder="Cari rute, kota, atau maskapai"
        serviceCatalogHref={service.catalogHref}
        supportHref="/bantuan"
        copy={flightCopy}
        filterKeywordLabel="Keyword"
        locale={locale}
        initialState={{
          tripMode: isFlightTripMode(flightTrip) ? flightTrip : "round_trip",
          q: keyword,
          region: selectedRegion,
          group: selectedGroup,
          from: flightFrom,
          via: flightTrip === "multi_city" ? flightVia : "",
          to: flightTo,
          depart: flightDepart,
          returnDate: flightTrip === "round_trip" ? flightReturn : "",
          passengers: flightPassengers,
          cabin: flightCabin,
          sort: flightSort,
          airlines: flightAirlines,
          departWindows: flightDepartWindows,
          transitTypes: flightTransitTypes,
          priceBands: flightPriceBands,
        }}
      />
      <PublicStickyAction
        locale={locale}
        href="#top"
        label={flightCopy.refineSearch}
        summary={flightCopy.topTitle}
        secondaryHref="/promo"
        secondaryLabel="Lihat promo"
      />
      <PublicMobileNav locale={locale} />
    </div>
  )
}
