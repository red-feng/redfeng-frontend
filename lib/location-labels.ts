import type { Locale } from "@/lib/i18n"

const countryLabels: Record<string, { id: string; en: string; zh: string }> = {
  indonesia: { id: "Indonesia", en: "Indonesia", zh: "印度尼西亚" },
}

const provinceLabels: Record<string, { id: string; en: string; zh: string }> = {
  "aceh": { id: "Aceh", en: "Aceh", zh: "亚齐" },
  "sumatera utara": { id: "Sumatera Utara", en: "North Sumatra", zh: "北苏门答腊" },
  "sumatera barat": { id: "Sumatera Barat", en: "West Sumatra", zh: "西苏门答腊" },
  "sumatera selatan": { id: "Sumatera Selatan", en: "South Sumatra", zh: "南苏门答腊" },
  "riau": { id: "Riau", en: "Riau", zh: "廖内" },
  "kepulauan riau": { id: "Kepulauan Riau", en: "Riau Islands", zh: "廖内群岛" },
  "jambi": { id: "Jambi", en: "Jambi", zh: "占碑" },
  "bengkulu": { id: "Bengkulu", en: "Bengkulu", zh: "明古鲁" },
  "lampung": { id: "Lampung", en: "Lampung", zh: "楠榜" },
  "banten": { id: "Banten", en: "Banten", zh: "万丹" },
  "dki jakarta": { id: "DKI Jakarta", en: "Jakarta", zh: "雅加达" },
  "jakarta": { id: "Jakarta", en: "Jakarta", zh: "雅加达" },
  "jawa barat": { id: "Jawa Barat", en: "West Java", zh: "西爪哇" },
  "jawa tengah": { id: "Jawa Tengah", en: "Central Java", zh: "中爪哇" },
  "di yogyakarta": { id: "DI Yogyakarta", en: "Yogyakarta", zh: "日惹特区" },
  "yogyakarta": { id: "Yogyakarta", en: "Yogyakarta", zh: "日惹" },
  "jawa timur": { id: "Jawa Timur", en: "East Java", zh: "东爪哇" },
  "bali": { id: "Bali", en: "Bali", zh: "巴厘" },
  "nusa tenggara barat": { id: "Nusa Tenggara Barat", en: "West Nusa Tenggara", zh: "西努沙登加拉" },
  "nusa tenggara timur": { id: "Nusa Tenggara Timur", en: "East Nusa Tenggara", zh: "东努沙登加拉" },
  "kalimantan barat": { id: "Kalimantan Barat", en: "West Kalimantan", zh: "西加里曼丹" },
  "kalimantan tengah": { id: "Kalimantan Tengah", en: "Central Kalimantan", zh: "中加里曼丹" },
  "kalimantan selatan": { id: "Kalimantan Selatan", en: "South Kalimantan", zh: "南加里曼丹" },
  "kalimantan timur": { id: "Kalimantan Timur", en: "East Kalimantan", zh: "东加里曼丹" },
  "kalimantan utara": { id: "Kalimantan Utara", en: "North Kalimantan", zh: "北加里曼丹" },
  "sulawesi utara": { id: "Sulawesi Utara", en: "North Sulawesi", zh: "北苏拉威西" },
  "gorontalo": { id: "Gorontalo", en: "Gorontalo", zh: "哥伦打洛" },
  "sulawesi tengah": { id: "Sulawesi Tengah", en: "Central Sulawesi", zh: "中苏拉威西" },
  "sulawesi barat": { id: "Sulawesi Barat", en: "West Sulawesi", zh: "西苏拉威西" },
  "sulawesi selatan": { id: "Sulawesi Selatan", en: "South Sulawesi", zh: "南苏拉威西" },
  "sulawesi tenggara": { id: "Sulawesi Tenggara", en: "Southeast Sulawesi", zh: "东南苏拉威西" },
  "maluku": { id: "Maluku", en: "Maluku", zh: "马鲁古" },
  "maluku utara": { id: "Maluku Utara", en: "North Maluku", zh: "北马鲁古" },
  "papua": { id: "Papua", en: "Papua", zh: "巴布亚" },
  "papua barat": { id: "Papua Barat", en: "West Papua", zh: "西巴布亚" },
}

function normalizeKey(value: string | null | undefined) {
  return String(value || "").trim().toLowerCase()
}

function titleCase(value: string) {
  return value.toLowerCase().replace(/\b\p{L}/gu, (char) => char.toUpperCase())
}

export function formatCountryLabel(country: string | null | undefined, locale: Locale) {
  const raw = String(country || "").trim()
  if (!raw) return ""
  return countryLabels[normalizeKey(raw)]?.[locale] || raw
}

export function formatProvinceLabel(province: string | null | undefined, locale: Locale) {
  const raw = String(province || "").trim()
  if (!raw) return ""
  return provinceLabels[normalizeKey(raw)]?.[locale] || titleCase(raw)
}

export function formatCityLabel(city: string | null | undefined, locale: Locale) {
  const raw = String(city || "").trim()
  if (!raw) return ""

  const normalized = normalizeKey(raw)
  const cityMatch = normalized.match(/^kota\s+(.+)$/)
  if (cityMatch) {
    const name = titleCase(cityMatch[1])
    if (locale === "en") return `${name} City`
    if (locale === "zh") return `${name}市`
    return `Kota ${name}`
  }

  const regencyMatch = normalized.match(/^kab(?:upaten)?\s+(.+)$/)
  if (regencyMatch) {
    const name = titleCase(regencyMatch[1])
    if (locale === "en") return `${name} Regency`
    if (locale === "zh") return `${name}县`
    return `Kabupaten ${name}`
  }

  return titleCase(raw)
}

export function formatMerchantLocationLabel(input: { city?: string | null; province?: string | null; country?: string | null }, locale: Locale) {
  const parts = [
    formatCityLabel(input.city, locale),
    formatProvinceLabel(input.province, locale),
    !input.city && !input.province ? formatCountryLabel(input.country || "Indonesia", locale) : "",
  ].filter(Boolean)

  return parts.join(", ")
}
