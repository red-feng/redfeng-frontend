export type PickupPeriod = "AM" | "PM"

export function formatPickupTimeInput(value: string) {
  const sanitized = value.replace(/[^\d:]/g, "")

  if (!sanitized) return ""

  if (sanitized.includes(":")) {
    const [rawHour = "", rawMinute = ""] = sanitized.split(":", 2)
    const hourDigits = rawHour.replace(/\D/g, "").slice(0, 2)
    const minuteDigits = rawMinute.replace(/\D/g, "").slice(0, 2)

    if (!hourDigits) return ""

    const hour = Number(hourDigits)
    if (!Number.isInteger(hour) || hour < 1 || hour > 12) return hourDigits[0] && hourDigits[0] !== "0" ? hourDigits[0] : ""

    return `${String(hour)}:${minuteDigits}`
  }

  const digits = sanitized.replace(/\D/g, "").slice(0, 4)

  if (!digits) return ""
  if (digits.length === 1) return digits === "0" ? "" : digits

  if (digits.length === 2) {
    const twoDigitHour = Number(digits)
    if (twoDigitHour >= 10 && twoDigitHour <= 12) return digits
    return digits[0] === "0" ? "" : digits[0]
  }

  if (digits.length === 3) {
    const twoDigitHour = Number(digits.slice(0, 2))
    if (twoDigitHour >= 10 && twoDigitHour <= 12) {
      return `${twoDigitHour}:${digits.slice(2)}`
    }

    const oneDigitHour = Number(digits[0])
    if (oneDigitHour < 1 || oneDigitHour > 9) return ""
    return `${oneDigitHour}:${digits.slice(1)}`
  }

  const twoDigitHour = Number(digits.slice(0, 2))
  if (twoDigitHour >= 10 && twoDigitHour <= 12) {
    return `${twoDigitHour}:${digits.slice(2)}`
  }

  const oneDigitHour = Number(digits[0])
  if (oneDigitHour < 1 || oneDigitHour > 9) return ""
  return `${oneDigitHour}:${digits.slice(1, 3)}`
}

export function normalizePickupTimeForStorage(rawTime: string, rawPeriod: string) {
  const period = rawPeriod.toUpperCase() === "PM" ? "PM" : "AM"
  const normalized = rawTime.trim().replace(":", ".")
  const match = normalized.match(/^(\d{1,2})\.(\d{2})$/)

  if (!match) {
    throw new Error("Format jam itinerary harus seperti 11:30 AM atau 1:30 PM.")
  }

  const hour = Number(match[1])
  const minute = Number(match[2])

  if (!Number.isInteger(hour) || hour < 1 || hour > 12 || minute < 0 || minute > 59) {
    throw new Error("Jam itinerary harus memakai format 12 jam, misalnya 11:30 AM atau 1:30 PM.")
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
    pickupTime: `${hour}:${minute}`,
    pickupPeriod: period,
  }
}
