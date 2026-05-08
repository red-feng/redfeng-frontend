import type { HeroTabKey } from "@/app/components/home/shared/homeContent"
import type { HeroSearchFieldData } from "@/app/components/home/web/hero/heroSearchContent"

export type HeroSearchProviderKey = "internal" | "partner_darmawisata"

export type HeroProviderFieldContext = {
  activeTab: HeroTabKey
  field: HeroSearchFieldData
}

export type HeroSearchProviderAdapter = {
  key: HeroSearchProviderKey
  getFieldChoices?: (context: HeroProviderFieldContext) => HeroSearchFieldData[] | null
}

const internalProviderAdapter: HeroSearchProviderAdapter = {
  key: "internal",
  getFieldChoices: () => null,
}

const darmaWisataProviderAdapter: HeroSearchProviderAdapter = {
  key: "partner_darmawisata",
  getFieldChoices: () => null,
}

const heroSearchProviderAdapters: Record<HeroSearchProviderKey, HeroSearchProviderAdapter> = {
  internal: internalProviderAdapter,
  partner_darmawisata: darmaWisataProviderAdapter,
}

export function getHeroSearchProviderAdapter(providerKey: HeroSearchProviderKey) {
  return heroSearchProviderAdapters[providerKey]
}
