export const travelStyleOptions = [
  { value: "explore", label: "Explore" },
  { value: "adventure", label: "Adventure" },
  { value: "family", label: "Family" },
  { value: "luxury", label: "Luxury" },
  { value: "honeymoon", label: "Honeymoon" },
  { value: "wellness", label: "Wellness" },
  { value: "religious", label: "Religious" },
  { value: "budget", label: "Budget" },
  { value: "group", label: "Group" },
  { value: "solo", label: "Solo" },
  { value: "open_trip", label: "Open Trip" },
  { value: "umroh", label: "Umroh" },
] as const

const travelStyleLabels: Record<string, { id: string; en: string; zh: string }> = {
  explore: { id: "Eksplorasi", en: "Explore", zh: "探索" },
  adventure: { id: "Petualangan", en: "Adventure", zh: "冒险" },
  family: { id: "Keluarga", en: "Family", zh: "家庭" },
  luxury: { id: "Mewah", en: "Luxury", zh: "高端" },
  honeymoon: { id: "Bulan Madu", en: "Honeymoon", zh: "蜜月" },
  wellness: { id: "Kebugaran", en: "Wellness", zh: "养生" },
  religious: { id: "Religi", en: "Religious", zh: "宗教" },
  budget: { id: "Hemat", en: "Budget", zh: "经济" },
  group: { id: "Grup", en: "Group", zh: "团体" },
  solo: { id: "Solo", en: "Solo", zh: "个人" },
  open_trip: { id: "Open Trip", en: "Open Trip", zh: "拼团" },
  umroh: { id: "Umroh", en: "Umroh", zh: "副朝" },
}

export function isQuotaTravelStyle(value: string | null | undefined): boolean {
  const normalized = (value || "").trim().toLowerCase()
  return normalized === "open_trip" || normalized === "umroh"
}

export function getParticipantFieldLabel(value: string | null | undefined, locale: "id" | "en" | "zh" = "id"): string {
  if (isQuotaTravelStyle(value)) {
    if (locale === "en") return "Quota"
    if (locale === "zh") return "名额"
    return "Jumlah Kuota"
  }

  if (locale === "en") return "Minimum participants"
  if (locale === "zh") return "最低参加人数"
  return "Minimal Peserta"
}

export function getScheduleQuotaLabel(value: string | null | undefined, locale: "id" | "en" | "zh" = "id"): string {
  if (isQuotaTravelStyle(value)) {
    if (locale === "en") return "Quota per departure"
    if (locale === "zh") return "每次出发名额"
    return "Kuota per keberangkatan"
  }

  return getParticipantFieldLabel(value, locale)
}

export function formatTravelStyleLabel(
  value: string | null | undefined,
  locale: "id" | "en" | "zh" = "id",
): string {
  const normalized = value || ""
  const match = travelStyleLabels[normalized]
  if (match) return match[locale]
  return normalized
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase()) || "-"
}
