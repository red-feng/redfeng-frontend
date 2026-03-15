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

export function formatTravelStyleLabel(value: string | null | undefined): string {
  const normalized = value || ""
  const match = travelStyleOptions.find((item) => item.value === normalized)
  if (match) return match.label
  return normalized
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase()) || "-"
}
