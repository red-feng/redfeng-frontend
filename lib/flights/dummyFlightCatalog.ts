import type { DummyCatalogItem } from "@/lib/service-dummy-catalog"
import type { FlightTripMode } from "@/app/components/flights/flightSearchParams"

export type FlightCatalogCardMeta = {
  airline: string
  departure: string
  arrival: string
  duration: string
  transit: string
  price: string
  seatNote: string
  origin: string
  destination: string
  routeCode: string
  cabin: string
  tripLabel: string
  highlightBadges: string[]
  maxPassengers: number
  tripSupport: FlightTripMode[]
  availableDates: string[]
}

type FlightCatalogPresetMeta = Omit<FlightCatalogCardMeta, "origin" | "destination" | "routeCode" | "cabin" | "tripLabel" | "highlightBadges">

function inferFlightTripSupport(item: DummyCatalogItem, routeCode: string, factMap: Map<string, string>) {
  const normalizedGroup = item.group.toLowerCase()
  const transitFact = (factMap.get("transit") || "").trim()
  const routeSegments = routeCode
    .split("-")
    .map((segment) => segment.trim())
    .filter(Boolean)

  const isMultiCityRoute = normalizedGroup.includes("multi kota") || routeSegments.length > 2 || transitFact.length > 0
  return isMultiCityRoute ? (["one_way", "multi_city"] as FlightTripMode[]) : (["one_way", "round_trip"] as FlightTripMode[])
}

function inferFlightTransitLabel(routeCode: string, factMap: Map<string, string>, locale: string) {
  const transitFact = (factMap.get("transit") || "").trim()
  const routeSegments = routeCode
    .split("-")
    .map((segment) => segment.trim())
    .filter(Boolean)

  if (transitFact) {
    return locale === "en" ? `Transit via ${transitFact}` : locale === "zh" ? `ç»${transitFact}ä¸­è½¬` : `Transit via ${transitFact}`
  }

  if (routeSegments.length > 2) {
    const transitStop = routeSegments[1]
    return locale === "en" ? `Transit via ${transitStop}` : locale === "zh" ? `ç»${transitStop}ä¸­è½¬` : `Transit via ${transitStop}`
  }

  return locale === "en" ? "Direct" : locale === "zh" ? "ç›´é£ž" : "Langsung"
}

function inferFlightAvailableDates(routeCode: string, factMap: Map<string, string>) {
  const transitFact = (factMap.get("transit") || "").trim()
  const routeSegments = routeCode
    .split("-")
    .map((segment) => segment.trim())
    .filter(Boolean)

  if (transitFact || routeSegments.length > 2) {
    return ["2026-05-25", "2026-05-31", "2026-06-04", "2026-06-10"]
  }

  return ["2026-05-25", "2026-05-28", "2026-05-29", "2026-06-04"]
}

export function getFlightCardMeta(item: DummyCatalogItem, index: number, locale: string): FlightCatalogCardMeta {
  const presetList: FlightCatalogPresetMeta[] = [
    {
      airline: "Garuda Indonesia",
      departure: "05:45",
      arrival: "08:40",
      duration: "1j 55m",
      transit: locale === "en" ? "Direct" : locale === "zh" ? "ç›´é£ž" : "Langsung",
      price: "IDR 1.248.000",
      seatNote: locale === "en" ? "Last 6 seats at this fare" : locale === "zh" ? "è¯¥ç¥¨ä»·ä»…å‰© 6 ä¸ªåº§ä½" : "Sisa 6 kursi di harga ini",
      maxPassengers: 1,
      tripSupport: ["one_way", "round_trip"],
      availableDates: ["2026-05-25", "2026-05-26", "2026-05-27"],
    },
    {
      airline: "Singapore Airlines",
      departure: "08:20",
      arrival: "11:05",
      duration: "1j 45m",
      transit: locale === "en" ? "Direct" : locale === "zh" ? "ç›´é£ž" : "Langsung",
      price: "IDR 4.860.000",
      seatNote: locale === "en" ? "Flexible business cabin" : locale === "zh" ? "çµæ´»å•†åŠ¡èˆ±ä½" : "Kabin business lebih fleksibel",
      maxPassengers: 2,
      tripSupport: ["one_way", "round_trip"],
      availableDates: ["2026-05-25", "2026-05-28", "2026-05-29", "2026-06-04"],
    },
    {
      airline: "Batik Air",
      departure: "09:10",
      arrival: "10:25",
      duration: "1j 15m",
      transit: locale === "en" ? "Round-trip ready" : locale === "zh" ? "é€‚åˆå¾€è¿”" : "Siap untuk pulang-pergi",
      price: "IDR 1.032.000",
      seatNote: locale === "en" ? "Popular for corporate travel" : locale === "zh" ? "é€‚åˆå·®æ—…éœ€æ±‚" : "Sering dipilih untuk corporate travel",
      maxPassengers: 3,
      tripSupport: ["round_trip"],
      availableDates: ["2026-05-25", "2026-05-28", "2026-06-04", "2026-06-07"],
    },
    {
      airline: "AirAsia",
      departure: "13:35",
      arrival: "16:20",
      duration: "2j 45m",
      transit: locale === "en" ? "Promo route" : locale === "zh" ? "ä¿ƒé”€èˆªçº¿" : "Rute promo",
      price: "IDR 1.786.000",
      seatNote: locale === "en" ? "Best price for weekend traffic" : locale === "zh" ? "å‘¨æœ«éœ€æ±‚çš„å¥½ä»·ä½" : "Harga terbaik untuk trafik akhir pekan",
      maxPassengers: 4,
      tripSupport: ["one_way", "multi_city"],
      availableDates: ["2026-05-25", "2026-05-31", "2026-06-04", "2026-06-10"],
    },
  ]
  const preset = presetList[index % 4] as FlightCatalogPresetMeta

  const routeParts = item.location.split("-").map((part) => part.trim())
  const origin = routeParts[0] || item.location
  const destination = routeParts[1] || item.location
  const highlightBadges = item.highlights.slice(0, 3)
  const factMap = new Map(item.facts.map((fact) => [fact.label.toLowerCase(), fact.value]))
  const routeCode = factMap.get("route code") || item.location.replace(/\s+/g, "")
  const inferredTransit = inferFlightTransitLabel(routeCode, factMap, locale)
  const inferredAvailableDates = inferFlightAvailableDates(routeCode, factMap)
  const routeOverrides: Partial<FlightCatalogCardMeta> = (() => {
    if (item.id === "flight-cgk-dps") {
      return {
        airline: "Garuda Indonesia",
        departure: "05:45",
        arrival: "08:40",
        duration: "1j 55m",
        transit: locale === "en" ? "Direct" : locale === "zh" ? "ç›´é£ž" : "Langsung",
        price: "IDR 1.248.000",
        seatNote: locale === "en" ? "Strong for one-way and round-trip Bali traffic" : locale === "zh" ? "é€‚åˆå·´åŽ˜å²›å•ç¨‹ä¸Žå¾€è¿”éœ€æ±‚" : "Kuat untuk trafik Bali sekali jalan maupun pulang-pergi",
        maxPassengers: 4,
        tripSupport: ["one_way", "round_trip"],
        availableDates: ["2026-05-25", "2026-05-28", "2026-06-04", "2026-06-07"],
      }
    }

    if (item.id === "flight-cgk-sin") {
      return {
        airline: "Singapore Airlines",
        departure: "08:20",
        arrival: "11:05",
        duration: "1j 45m",
        transit: locale === "en" ? "Direct" : locale === "zh" ? "ç›´é£ž" : "Langsung",
        price: "IDR 4.860.000",
        seatNote: locale === "en" ? "Flexible business cabin" : locale === "zh" ? "çµæ´»å•†åŠ¡èˆ±ä½" : "Kabin business lebih fleksibel",
        maxPassengers: 2,
        tripSupport: ["one_way", "round_trip"],
        availableDates: ["2026-05-25", "2026-05-28", "2026-05-29", "2026-06-04"],
      }
    }

    if (item.id === "flight-cgk-nrt-via-sin") {
      return {
        airline: "Singapore Airlines",
        departure: "00:40",
        arrival: "15:10",
        duration: "11j 30m",
        transit: locale === "en" ? "Transit via Singapore" : locale === "zh" ? "ç»æ–°åŠ å¡ä¸­è½¬" : "Transit via Singapore",
        price: "IDR 6.420.000",
        seatNote: locale === "en" ? "Best dummy route for CGK - SIN - NRT flow" : locale === "zh" ? "æœ€é€‚åˆ CGK - SIN - NRT æµç¨‹çš„ç¤ºä¾‹èˆªçº¿" : "Rute dummy terbaik untuk flow CGK - SIN - NRT",
        maxPassengers: 2,
        tripSupport: ["multi_city", "one_way"],
        availableDates: ["2026-06-04", "2026-06-07", "2026-06-10"],
      }
    }

    if (item.id === "flight-sub-bpn") {
      return {
        airline: "Batik Air",
        departure: "09:10",
        arrival: "10:25",
        duration: "1j 15m",
        transit: locale === "en" ? "Round-trip ready" : locale === "zh" ? "é€‚åˆå¾€è¿”" : "Siap untuk pulang-pergi",
        price: "IDR 1.032.000",
        seatNote: locale === "en" ? "Popular for corporate travel" : locale === "zh" ? "é€‚åˆå·®æ—…éœ€æ±‚" : "Sering dipilih untuk corporate travel",
        maxPassengers: 3,
        tripSupport: ["one_way", "round_trip"],
        availableDates: ["2026-05-25", "2026-05-28", "2026-06-04", "2026-06-07"],
      }
    }

    if (item.id === "flight-dps-kul") {
      return {
        airline: "AirAsia",
        departure: "13:35",
        arrival: "16:20",
        duration: "2j 45m",
        transit: locale === "en" ? "Promo route" : locale === "zh" ? "ä¿ƒé”€èˆªçº¿" : "Rute promo",
        price: "IDR 1.786.000",
        seatNote: locale === "en" ? "Best price for weekend traffic" : locale === "zh" ? "å‘¨æœ«éœ€æ±‚çš„å¥½ä»·ä½" : "Harga terbaik untuk trafik akhir pekan",
        maxPassengers: 4,
        tripSupport: ["one_way", "round_trip"],
        availableDates: ["2026-05-25", "2026-05-28", "2026-05-29", "2026-06-04"],
      }
    }

    return {}
  })()

  return {
    ...preset,
    ...routeOverrides,
    origin,
    destination,
    routeCode,
    transit: item.id === "flight-dps-kul" ? inferredTransit : routeOverrides.transit ?? inferredTransit,
    cabin: factMap.get("cabin") || (item.group.toLowerCase().includes("business") ? "Business" : "Economy"),
    tripLabel: item.group,
    highlightBadges,
    tripSupport: routeOverrides.tripSupport ?? inferFlightTripSupport(item, routeCode, factMap),
    availableDates: routeOverrides.availableDates ?? inferredAvailableDates,
  }
}
