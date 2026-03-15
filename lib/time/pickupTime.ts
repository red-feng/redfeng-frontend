export type PickupPeriod = "AM" | "PM"

export function formatPickupTimeInput(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 4)

  if (!digits) return ""

  if (digits.length === 1) {
    if (digits === "0") return ""
    return digits
  }

  if (digits.length === 2) {
    const hour = Number(digits)
    if (hour >= 1 && hour <= 12) return String(hour)
    return digits[0] === "0" ? "" : digits[0]
  }

  if (digits.length === 3) {
    const hour = Number(digits[0])
    if (hour < 1 || hour > 9) return ""
    return `${hour}.${digits.slice(1)}`
  }

  const twoDigitHour = Number(digits.slice(0, 2))
  if (twoDigitHour >= 10 && twoDigitHour <= 12) {
    return `${twoDigitHour}.${digits.slice(2)}`
  }

  return formatPickupTimeInput(digits.slice(0, 3))
}

export function normalizePickupTimeForStorage(rawTime: string, rawPeriod: string) {
  const period = rawPeriod.toUpperCase() === "PM" ? "PM" : "AM"
  const normalized = rawTime.trim().replace(":", ".")
  const match = normalized.match(/^(\d{1,2})\.(\d{2})$/)

  if (!match) {
    throw new Error("Format jam itinerary harus seperti 11.30 AM atau 1.30 PM.")
  }

  const hour = Number(match[1])
  const minute = Number(match[2])

  if (!Number.isInteger(hour) || hour < 1 || hour > 12 || minute < 0 || minute > 59) {
    throw new Error("Jam itinerary harus memakai format 12 jam, misalnya 11.30 AM atau 1.30 PM.")
  }

  return `${hour}.${match[2]} ${period}`
}

export function parseStoredPickupTime(value: string): { pickupTime: string; pickupPeriod: PickupPeriod } {
  const normalized = value.trim().toUpperCase().replace(/\s+/g, " ")
  const match = normalized.match(/^(\d{1,2})[:.](\d{2})(?:\s*(AM|PM))?$/)

  if (!match) {
    return {
      pickupTime: "",
      pickupPeriod: "AM",
    }
  }

  let hour = Number(match[1])
  const minute = match[2]
  let period = match[3] as PickupPeriod | undefined

  if (!period || hour === 0 || hour > 12) {
    period = hour >= 12 ? "PM" : "AM"
    hour = hour % 12 || 12
  }

  return {
    pickupTime: `${hour}.${minute}`,
    pickupPeriod: period,
  }
}
