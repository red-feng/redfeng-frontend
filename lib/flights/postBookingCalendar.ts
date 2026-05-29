export type FlightCalendarPassenger = {
  fullName: string
}

export type FlightCalendarSegment = {
  airlineName: string
  flightNumber?: string | null
  originCode: string
  originLabel: string
  destinationCode: string
  destinationLabel: string
  departAtIso: string
  arriveAtIso: string
  terminal?: string | null
}

export type FlightBookingCalendarDraft = {
  bookingCode: string
  providerLabel: string
  passengers: FlightCalendarPassenger[]
  segments: FlightCalendarSegment[]
}

type GoogleCalendarUrlOptions = {
  baseUrl?: string
}

function compactUtcDateTime(isoValue: string) {
  const date = new Date(isoValue)
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid ISO date value: ${isoValue}`)
  }

  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, "0")
  const day = String(date.getUTCDate()).padStart(2, "0")
  const hours = String(date.getUTCHours()).padStart(2, "0")
  const minutes = String(date.getUTCMinutes()).padStart(2, "0")
  const seconds = String(date.getUTCSeconds()).padStart(2, "0")

  return `${year}${month}${day}T${hours}${minutes}${seconds}Z`
}

function buildPassengerLine(passengers: FlightCalendarPassenger[]) {
  if (passengers.length === 0) return "Penumpang: -"
  return `Penumpang: ${passengers.map((item) => item.fullName).join(", ")}`
}

function buildSegmentLine(segment: FlightCalendarSegment) {
  const flightCode = segment.flightNumber ? ` ${segment.flightNumber}` : ""
  const terminalLine = segment.terminal ? ` | Terminal ${segment.terminal}` : ""
  return `${segment.airlineName}${flightCode}: ${segment.originCode} (${segment.originLabel}) -> ${segment.destinationCode} (${segment.destinationLabel})${terminalLine}`
}

export function buildFlightCalendarEventDraft(booking: FlightBookingCalendarDraft) {
  if (booking.segments.length === 0) {
    throw new Error("Flight booking calendar draft requires at least one segment")
  }

  const firstSegment = booking.segments[0]
  const lastSegment = booking.segments[booking.segments.length - 1]
  const title = `Penerbangan ${firstSegment.originCode} -> ${lastSegment.destinationCode} | RedFeng`
  const location = `${firstSegment.originLabel} (${firstSegment.originCode})`
  const details = [
    `Booking RedFeng via ${booking.providerLabel}`,
    `Kode booking: ${booking.bookingCode}`,
    buildPassengerLine(booking.passengers),
    "",
    ...booking.segments.map(buildSegmentLine),
  ].join("\n")

  return {
    title,
    details,
    location,
    startUtc: compactUtcDateTime(firstSegment.departAtIso),
    endUtc: compactUtcDateTime(lastSegment.arriveAtIso),
  }
}

export function buildGoogleCalendarEventUrl(
  booking: FlightBookingCalendarDraft,
  options: GoogleCalendarUrlOptions = {},
) {
  const event = buildFlightCalendarEventDraft(booking)
  const baseUrl = options.baseUrl ?? "https://calendar.google.com/calendar/render"
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    details: event.details,
    location: event.location,
    dates: `${event.startUtc}/${event.endUtc}`,
  })

  return `${baseUrl}?${params.toString()}`
}
