import {
  dharmawisataFormFetch,
  dharmawisataLogin,
  getDharmawisataAccessTokenOverride,
  getDharmawisataConfiguredPath,
  getDharmawisataCredentials,
  isDharmawisataConfigured,
} from "@/lib/dharmawisata/client"

type JsonRecord = Record<string, unknown>

export type DharmawisataFlightScheduleLookupInput = {
  airlineCode?: string | null
  flightNumber?: string | null
  originAirportCode?: string | null
  destinationAirportCode?: string | null
  tripType?: string | null
  departureAt?: string | null
  returnAt?: string | null
  paxAdult: number
  paxChild?: number
  paxInfant?: number
}

export type DharmawisataFlightScheduleLookupResult = {
  ok: boolean
  message: string
  detailSchedule: string | null
  searchKey: string | null
  airlineAccessCode: string | null
  scheduleAccessToken?: string | null
  flightClass: string | null
  flightNumber: string | null
  departureAt: string | null
  arrivalAt: string | null
}

function isRecord(value: unknown): value is JsonRecord {
  return value !== null && typeof value === "object" && !Array.isArray(value)
}

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : typeof value === "number" ? String(value) : ""
}

function asNumber(value: unknown) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function normalizeTripType(value: string | null | undefined) {
  return String(value || "").toLowerCase() === "round_trip" ? "RoundTrip" : "OneWay"
}

function normalizeFlightNumber(value: string | null | undefined, airlineCode?: string | null) {
  const normalized = String(value || "").toUpperCase().replace(/[^A-Z0-9]/g, "")
  const code = String(airlineCode || "").toUpperCase().replace(/[^A-Z0-9]/g, "")
  return code && normalized.startsWith(code) ? normalized.slice(code.length) : normalized
}

function dateOnly(value: string | null | undefined) {
  const normalized = String(value || "").trim()
  const direct = normalized.match(/^(\d{4}-\d{2}-\d{2})/)
  if (direct) return direct[1] || ""

  const parsed = new Date(normalized)
  return Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString().slice(0, 10)
}

function lowFareDateTime(value: string | null | undefined, fallback = "") {
  const date = dateOnly(value)
  return date ? `${date}T00:00:00` : fallback
}

function minutesOfDay(value: string | null | undefined) {
  const normalized = String(value || "").trim()
  const embeddedTimeMatch = normalized.match(/(?:T|\s)(\d{1,2}):(\d{2})(?::\d{2})?/)
  const standaloneTimeMatch = normalized.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/)
  const match = embeddedTimeMatch || standaloneTimeMatch

  if (!match) return null
  return Number(match[1] || "0") * 60 + Number(match[2] || "0")
}

function sameDepartureWindow(left: string | null | undefined, right: string | null | undefined) {
  const leftMinutes = minutesOfDay(left)
  const rightMinutes = minutesOfDay(right)
  if (leftMinutes === null || rightMinutes === null) return true
  return Math.abs(leftMinutes - rightMinutes) <= 30
}

function firstRecord(value: unknown) {
  return Array.isArray(value) && isRecord(value[0]) ? value[0] : {}
}

function extractJourneys(payload: unknown) {
  if (!isRecord(payload)) return []
  return Array.isArray(payload.journeyDepart) ? payload.journeyDepart : []
}

function getPayloadStatus(payload: unknown) {
  return isRecord(payload) ? asString(payload.status).toUpperCase() : ""
}

function getPayloadMessage(payload: unknown) {
  return isRecord(payload) ? asString(payload.respMessage) : ""
}

function getPayloadAirlineAccessCode(payload: unknown) {
  return isRecord(payload) ? asString(payload.airlineAccessCode) : ""
}

function getPayloadAirlineIndex(payload: unknown) {
  return isRecord(payload) ? asNumber(payload.airlineIndex) : 0
}

function getPayloadTotalAirline(payload: unknown) {
  return isRecord(payload) ? asNumber(payload.totalAirline) : 0
}

function matchesSchedule(journey: unknown, input: DharmawisataFlightScheduleLookupInput) {
  if (!isRecord(journey)) return false

  const segment = firstRecord(journey.segment)
  const flightDetail = firstRecord(segment.flightDetail)
  const expectedAirlineCode = String(input.airlineCode || "").toUpperCase()
  const actualAirlineCode = asString(flightDetail.airlineCode || journey.airlineID).toUpperCase()
  const expectedFlightNumber = normalizeFlightNumber(input.flightNumber, expectedAirlineCode)
  const actualFlightNumber = normalizeFlightNumber(asString(flightDetail.flightNumber), actualAirlineCode)
  const expectedDate = dateOnly(input.departureAt)
  const actualDate = dateOnly(asString(journey.jiDepartTime || flightDetail.fdDepartTime))

  return (
    (!expectedAirlineCode || actualAirlineCode === expectedAirlineCode) &&
    (!expectedFlightNumber || actualFlightNumber === expectedFlightNumber) &&
    asString(journey.jiOrigin || flightDetail.fdOrigin).toUpperCase() === String(input.originAirportCode || "").toUpperCase() &&
    asString(journey.jiDestination || flightDetail.fdDestination).toUpperCase() === String(input.destinationAirportCode || "").toUpperCase() &&
    (!expectedDate || actualDate === expectedDate) &&
    sameDepartureWindow(input.departureAt, asString(journey.jiDepartTime || flightDetail.fdDepartTime))
  )
}

function mapJourney(
  journey: unknown,
  airlineAccessCode: string,
  scheduleAccessToken: string,
): DharmawisataFlightScheduleLookupResult {
  const record = isRecord(journey) ? journey : {}
  const segment = firstRecord(record.segment)
  const flightDetail = firstRecord(segment.flightDetail)
  const availableDetail = firstRecord(segment.availableDetail)
  const journeyReference = asString(record.journeyReference)

  return {
    ok: Boolean(journeyReference),
    message: journeyReference ? "Schedule ditemukan dari LowFareSchedule." : "Schedule ditemukan tetapi journeyReference kosong.",
    detailSchedule: journeyReference || null,
    searchKey: journeyReference || null,
    airlineAccessCode: airlineAccessCode || null,
    scheduleAccessToken: scheduleAccessToken || null,
    flightClass: asString(availableDetail.flightClass) || null,
    flightNumber: asString(flightDetail.flightNumber) || null,
    departureAt: asString(record.jiDepartTime || flightDetail.fdDepartTime) || null,
    arrivalAt: asString(record.jiArrivalTime || flightDetail.fdArrivalTime) || null,
  }
}

export async function findDharmawisataLowFareScheduleForBooking(
  input: DharmawisataFlightScheduleLookupInput,
): Promise<DharmawisataFlightScheduleLookupResult> {
  const searchPath = getDharmawisataConfiguredPath("DHARMAWISATA_H2H_SEARCH_PATH")

  if (!isDharmawisataConfigured() || !searchPath) {
    return {
      ok: false,
      message: "LowFareSchedule belum dikonfigurasi.",
      detailSchedule: null,
      searchKey: null,
      airlineAccessCode: null,
      flightClass: null,
      flightNumber: null,
      departureAt: null,
      arrivalAt: null,
    }
  }

  const credentials = getDharmawisataCredentials()
  const accessTokenOverride = getDharmawisataAccessTokenOverride()
  const auth = accessTokenOverride ? { accessToken: accessTokenOverride } : await dharmawisataLogin({ language: 1 })
  const accessToken = asString(auth.accessToken)

  if (!accessToken) {
    return {
      ok: false,
      message: "Login berhasil dipanggil tetapi access token kosong.",
      detailSchedule: null,
      searchKey: null,
      airlineAccessCode: null,
      flightClass: null,
      flightNumber: null,
      departureAt: null,
      arrivalAt: null,
    }
  }

  let airlineAccessCode = ""
  let lastMessage = ""
  const seenStates = new Set<string>()

  for (let iteration = 0; iteration < 8; iteration += 1) {
    const payload = await dharmawisataFormFetch({
      path: searchPath,
      method: "POST",
      body: {
        tripType: normalizeTripType(input.tripType),
        origin: input.originAirportCode || "",
        destination: input.destinationAirportCode || "",
        departDate: lowFareDateTime(input.departureAt),
        returnDate: normalizeTripType(input.tripType) === "RoundTrip"
          ? lowFareDateTime(input.returnAt)
          : "0001-01-01T00:00:00",
        paxAdult: input.paxAdult,
        paxChild: input.paxChild || 0,
        paxInfant: input.paxInfant || 0,
        promoCode: "",
        airlineAccessCode,
        cacheType: 2,
        isShowEachAirline: true,
        userID: credentials.userId,
        accessToken,
      },
    })
    const status = getPayloadStatus(payload)
    const message = getPayloadMessage(payload)
    const nextAirlineAccessCode = getPayloadAirlineAccessCode(payload)
    const airlineIndex = getPayloadAirlineIndex(payload)
    const totalAirline = getPayloadTotalAirline(payload)
    const stateKey = `${status}:${message}:${airlineIndex}:${totalAirline}:${nextAirlineAccessCode}`

    if (seenStates.has(stateKey)) break
    seenStates.add(stateKey)
    lastMessage = message || status || lastMessage

    const match = extractJourneys(payload).find((journey) => matchesSchedule(journey, input))
    if (match) return mapJourney(match, nextAirlineAccessCode || airlineAccessCode, accessToken)

    if (status === "SUCCESS" && totalAirline > 0 && airlineIndex >= totalAirline) break
    if (!nextAirlineAccessCode || totalAirline === 0) break
    airlineAccessCode = nextAirlineAccessCode
  }

  return {
    ok: false,
    message: lastMessage ? `Schedule tidak ditemukan di LowFareSchedule: ${lastMessage}` : "Schedule tidak ditemukan di LowFareSchedule.",
    detailSchedule: null,
    searchKey: null,
    airlineAccessCode: null,
    flightClass: null,
    flightNumber: null,
    departureAt: null,
    arrivalAt: null,
  }
}
