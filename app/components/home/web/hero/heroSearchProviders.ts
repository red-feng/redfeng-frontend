import type { HeroTabKey } from "@/app/components/home/shared/homeContent"
import type { HeroSearchFieldData } from "@/app/components/home/web/hero/heroSearchContent"

export type HeroSearchProviderKey = "internal" | "partner_darmawisata"
export type HeroProviderServiceKey = "flight" | "hotel" | "train" | "bus" | "ship" | "cruise" | "activity" | "package"
export type HeroProviderFieldSemanticKey =
  | "origin"
  | "destination"
  | "transit"
  | "date"
  | "return_date"
  | "time"
  | "passenger"
  | "category"
  | "duration"
  | "destination_query"
  | "other"

export type HeroProviderFieldContext = {
  activeTab: HeroTabKey
  field: HeroSearchFieldData
}

export type HeroSearchNormalizedOption = {
  id: string
  value: string
  label: string
  sublabel?: string
  group?: string
  meta?: Record<string, string | number | boolean>
}

export type HeroTransportPointLookup = {
  provider: HeroSearchProviderKey
  service: HeroProviderServiceKey
  semantic: Extract<HeroProviderFieldSemanticKey, "origin" | "destination" | "transit">
  query: string
  items: HeroSearchNormalizedOption[]
}

export type HeroPassengerLookup = {
  provider: HeroSearchProviderKey
  service: HeroProviderServiceKey
  semantic: "passenger"
  items: HeroSearchNormalizedOption[]
}

export type HeroDateLookup = {
  provider: HeroSearchProviderKey
  service: HeroProviderServiceKey
  semantic: Extract<HeroProviderFieldSemanticKey, "date" | "return_date" | "time">
  items: HeroSearchNormalizedOption[]
}

export type HeroSearchProviderAdapter = {
  key: HeroSearchProviderKey
  label: string
  supportedTabs: HeroTabKey[]
  lookupEndpoint?: string
  statusEndpoint?: string
  normalizeOption?: (option: HeroSearchNormalizedOption, context: HeroProviderFieldContext) => HeroSearchFieldData
  getFieldChoices?: (context: HeroProviderFieldContext) => HeroSearchFieldData[] | null
}

const internalProviderAdapter: HeroSearchProviderAdapter = {
  key: "internal",
  label: "Internal RedFeng",
  supportedTabs: ["cruise", "activity", "package"],
  getFieldChoices: () => null,
}

const darmaWisataProviderAdapter: HeroSearchProviderAdapter = {
  key: "partner_darmawisata",
  label: "Darma Wisata Indonesia H2H",
  supportedTabs: ["flight", "hotel", "train", "bus", "ship"],
  lookupEndpoint: "/api/integrations/darmawisata/lookups",
  statusEndpoint: "/api/integrations/darmawisata/status",
  getFieldChoices: () => null,
}

const heroSearchProviderAdapters: Record<HeroSearchProviderKey, HeroSearchProviderAdapter> = {
  internal: internalProviderAdapter,
  partner_darmawisata: darmaWisataProviderAdapter,
}

export function getHeroSearchProviderAdapter(providerKey: HeroSearchProviderKey) {
  return heroSearchProviderAdapters[providerKey]
}

export function getHeroProviderServiceKey(activeTab: HeroTabKey): HeroProviderServiceKey {
  return activeTab
}

export function getHeroProviderFieldSemanticKey(label: string): HeroProviderFieldSemanticKey {
  const normalized = label.toLowerCase()

  if (normalized.includes("dari") || normalized.includes("asal")) return "origin"
  if (normalized.includes("ke") || normalized.includes("tujuan")) return "destination"
  if (normalized.includes("transit")) return "transit"
  if (normalized.includes("pulang") || normalized.includes("check-out")) return "return_date"
  if (
    normalized.includes("berangkat") ||
    normalized.includes("pergi") ||
    normalized.includes("tanggal") ||
    normalized.includes("kunjungan") ||
    normalized.includes("check-in") ||
    normalized.includes("keberangkatan")
  ) {
    return "date"
  }
  if (normalized.includes("jam")) return "time"
  if (normalized.includes("destinasi") || normalized.includes("trip") || normalized.includes("event") || normalized.includes("area")) {
    return "destination_query"
  }
  if (normalized.includes("durasi")) return "duration"
  if (normalized.includes("kategori") || normalized.includes("jenis") || normalized.includes("cabin")) return "category"
  if (normalized.includes("tamu") || normalized.includes("penumpang") || normalized.includes("peserta") || normalized.includes("tiket")) {
    return "passenger"
  }

  return "other"
}

export function buildFlightProviderLookupContract(query = ""): HeroTransportPointLookup {
  return {
    provider: "partner_darmawisata",
    service: "flight",
    semantic: "origin",
    query,
    items: [
      {
        id: "CGK",
        value: "CGK   Jakarta",
        label: "CGK",
        sublabel: "Soekarno Hatta International",
        group: "Indonesia",
        meta: {
          city: "Jakarta",
          airportCode: "CGK",
          airportName: "Soekarno Hatta International",
          country: "Indonesia",
        },
      },
    ],
  }
}
