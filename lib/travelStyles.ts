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

export function formatTravelStyleLabel(value: string | null | undefined): string {
  const normalized = value || ""
  const match = travelStyleOptions.find((item) => item.value === normalized)
  if (match) return match.label
  return normalized
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase()) || "-"
}
