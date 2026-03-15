export function parseHighlights(input: string | null | undefined) {
  return String(input || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
}
