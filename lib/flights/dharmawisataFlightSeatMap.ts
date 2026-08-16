import {
  dharmawisataJsonFetch,
  getDharmawisataConfiguredPath,
  getDharmawisataCredentials,
  isDharmawisataConfigured,
} from "@/lib/dharmawisata/client"
import type { DharmawisataPassenger } from "@/lib/flights/dharmawisataFlightBooking"
import {
  findDharmawisataLowFareScheduleForBooking,
  type DharmawisataFlightScheduleLookupResult,
  type DharmawisataFlightScheduleSegment,
} from "@/lib/flights/dharmawisataFlightScheduleLookup"

type JsonRecord = Record<string, unknown>

export type DharmawisataSeatInfo = {
  compartment: string
  assignable: boolean
  isOpen: boolean
  x: number
  y: number
  width: number
  height: number
  seatDesignator: string
  seatType: string
  seatPrice: number
  seatText: string
  currency: string
}

export type DharmawisataSeatSegment = {
  origin: string
  destination: string
  departTime: string
  arrivalTime: string
  infos: DharmawisataSeatInfo[]
}

export type DharmawisataFlightSeatMapInput = {
  airlineId?: string | null
  airlineCode?: string | null
  flightNumber?: string | null
  originAirportCode?: string | null
  destinationAirportCode?: string | null
  tripType?: string | null
  departureAt?: string | null
  arrivalAt?: string | null
  returnAt?: string | null
  flightClass?: string | null
  detailSchedule?: string | null
  searchKey?: string | null
  airlineAccessCode?: string | null
  contactTitle?: string | null
  contactFirstName?: string | null
  contactLastName?: string | null
  contactCountryCodePhone?: string | null
  contactAreaCodePhone?: string | null
  contactRemainingPhoneNo?: string | null
  contactEmail?: string | null
  paxAdult: number
  paxChild?: number
  paxInfant?: number
  passengers: DharmawisataPassenger[]
}

export type DharmawisataFlightSeatMapResult = {
  ok: boolean
  skipped: boolean
  message: string
  segments: DharmawisataSeatSegment[]
  raw: JsonRecord
}

function asRecord(value: unknown): JsonRecord | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as JsonRecord) : null
}

function asArray(value: unknown) {
  return Array.isArray(value) ? value : []
}

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : typeof value === "number" ? String(value) : ""
}

function normalizeNumber(value: unknown, fallback = 0) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function normalizeBoolean(value: unknown) {
  if (typeof value === "boolean") return value
  const normalized = normalizeText(value).toLowerCase()
  return ["true", "1", "yes", "y"].includes(normalized)
}

function hasText(value: unknown) {
  return Boolean(normalizeText(value))
}

function pickString(raw: JsonRecord, keys: string[]) {
  for (const key of keys) {
    const value = normalizeText(raw[key])
    if (value) return value
  }
  return null
}

function recordsFrom(value: unknown): JsonRecord[] {
  if (Array.isArray(value)) return value.filter((item): item is JsonRecord => Boolean(asRecord(item)))
  const record = asRecord(value)
  return record ? [record] : []
}

function pickPriceClassFare(raw: JsonRecord, keys: string[], expectedFlightClass?: string | null) {
  const expected = normalizeText(expectedFlightClass).toUpperCase()

  for (const key of keys) {
    const options = recordsFrom(raw[key])
    if (options.length === 0) continue

    const matchingOption = expected
      ? options.find((option) => normalizeText(option.flightClass || option.className || option.cabinClass).toUpperCase() === expected)
      : null
    const selected = matchingOption || options[0]
    const classFare = selected ? pickString(selected, ["classFare", "ClassFare"]) : null
    if (classFare) return classFare
  }

  return null
}

function normalizeDharmawisataTripType(value: string | null | undefined) {
  return String(value || "").toLowerCase() === "round_trip" ? "RoundTrip" : "OneWay"
}

function dateOnly(value: string | null | undefined) {
  const normalized = normalizeText(value)
  const direct = normalized.match(/^(\d{4}-\d{2}-\d{2})/)
  if (direct) return direct[1] || ""

  const parsed = new Date(normalized)
  return Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString().slice(0, 10)
}

function dharmawisataCalendarDateTime(value: string | null | undefined, fallback = "") {
  const date = dateOnly(value)
  return date ? `${date}T00:00:00` : fallback
}

function passengerType(value: DharmawisataPassenger["type"]) {
  if (value === "Child") return 1
  if (value === "Infant") return 2
  return 0
}

function normalizeDharmawisataBirthDate(value: string | null | undefined) {
  const raw = normalizeText(value)
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return `${raw}T00:00:00`

  const parsed = new Date(raw)
  if (!Number.isNaN(parsed.getTime())) {
    return `${parsed.toISOString().slice(0, 10)}T00:00:00`
  }

  return ""
}

function normalizeDharmawisataGender(value: string | null | undefined, title: string | null | undefined) {
  const normalized = normalizeText(value).toLowerCase()
  if (["m", "male", "l", "laki-laki", "pria"].includes(normalized)) return "Male"
  if (["f", "female", "p", "perempuan", "wanita"].includes(normalized)) return "Female"

  const normalizedTitle = normalizeText(title).toUpperCase()
  if (["MRS", "MS", "MISS"].includes(normalizedTitle)) return "Female"
  if (["MR", "MSTR"].includes(normalizedTitle)) return "Male"
  return ""
}

function buildPassengerPayload(passengers: DharmawisataPassenger[], fallbackEmail?: string | null) {
  return passengers.map((passenger) => ({
    addOns: passenger.addOns || [],
    IDNumber: normalizeText(passenger.identityNumber),
    title: passenger.title || "MR",
    firstName: passenger.firstName,
    lastName: passenger.lastName || passenger.firstName,
    birthDate: normalizeDharmawisataBirthDate(passenger.birthDate),
    gender: normalizeDharmawisataGender(passenger.gender, passenger.title),
    nationality: "ID",
    birthCountry: "ID",
    DocType: normalizeText(passenger.identityType),
    parent: "",
    passportNumber: "",
    passportIssuedCountry: "",
    passportIssuedDate: "0001-01-01T00:00:00",
    passportExpiredDate: "0001-01-01T00:00:00",
    Email: passenger.email || fallbackEmail || "",
    type: passengerType(passenger.type),
    batikMilesNo: "",
    garudaFrequentFlyer: "",
  }))
}

function getMissingRequiredFields(input: DharmawisataFlightSeatMapInput) {
  const required: Array<[string, unknown]> = [
    ["airlineID", input.airlineId || input.airlineCode],
    ["origin", input.originAirportCode],
    ["destination", input.destinationAirportCode],
    ["departDate", input.departureAt],
    ["contactFirstName", input.contactFirstName],
    ["contactLastName", input.contactLastName],
    ["contactTitle", input.contactTitle],
    ["contactCountryCodePhone", input.contactCountryCodePhone],
    ["contactAreaCodePhone", input.contactAreaCodePhone],
    ["contactRemainingPhoneNo", input.contactRemainingPhoneNo],
    ["contactEmail", input.contactEmail],
  ]

  if (input.passengers.length < Math.max(1, input.paxAdult + (input.paxChild || 0) + (input.paxInfant || 0))) {
    required.push(["paxDetails", ""])
  }

  input.passengers.forEach((passenger, index) => {
    if (!normalizeDharmawisataBirthDate(passenger.birthDate)) required.push([`paxDetails[${index}].birthDate`, ""])
    if (!normalizeDharmawisataGender(passenger.gender, passenger.title)) required.push([`paxDetails[${index}].gender`, ""])
  })

  return required.filter(([, value]) => !normalizeText(value)).map(([key]) => key)
}

function buildFlightFlowBase(input: DharmawisataFlightSeatMapInput, accessToken: string) {
  const credentials = getDharmawisataCredentials()
  const isRoundTrip = normalizeDharmawisataTripType(input.tripType) === "RoundTrip"

  return {
    airlineID: input.airlineId || input.airlineCode || "",
    origin: input.originAirportCode || "",
    destination: input.destinationAirportCode || "",
    tripType: normalizeDharmawisataTripType(input.tripType),
    departDate: dharmawisataCalendarDateTime(input.departureAt),
    returnDate: isRoundTrip
      ? dharmawisataCalendarDateTime(input.returnAt)
      : "0001-01-01T00:00:00",
    paxAdult: input.paxAdult,
    paxChild: input.paxChild || 0,
    paxInfant: input.paxInfant || 0,
    userID: credentials.userId,
    accessToken,
  }
}

function buildSchedule(input: DharmawisataFlightSeatMapInput) {
  return {
    airlineCode: input.airlineCode || input.airlineId || "",
    flightNumber: input.flightNumber || "",
    schOrigin: input.originAirportCode || "",
    schDestination: input.destinationAirportCode || "",
    detailSchedule: input.detailSchedule || "",
    schDepartTime: input.departureAt || "",
    schArrivalTime: input.arrivalAt || input.departureAt || "",
    flightClass: input.flightClass || "Economy",
    garudaNumber: "",
    garudaAvailability: "",
  }
}

function buildScheduleFromSegment(segment: DharmawisataFlightScheduleSegment) {
  return {
    airlineCode: segment.airlineCode,
    flightNumber: segment.flightNumber,
    schOrigin: segment.originAirportCode,
    schDestination: segment.destinationAirportCode,
    detailSchedule: segment.detailSchedule,
    schDepartTime: segment.departureAt,
    schArrivalTime: segment.arrivalAt,
    flightClass: segment.flightClass || "Economy",
    garudaNumber: "",
    garudaAvailability: "",
  }
}

function buildSchedules(input: DharmawisataFlightSeatMapInput, scheduleSegments: DharmawisataFlightScheduleSegment[]) {
  const segments = scheduleSegments.filter((segment) => normalizeText(segment.flightNumber) && normalizeText(segment.detailSchedule))
  return segments.length > 0 ? segments.map(buildScheduleFromSegment) : [buildSchedule(input)]
}

function getDepartureScheduleSegment(scheduleSegments: DharmawisataFlightScheduleSegment[]) {
  return scheduleSegments.find((segment) => normalizeText(segment.detailSchedule) || normalizeText(segment.flightNumber)) || null
}

function buildPriceAllAirlinePayload(input: DharmawisataFlightSeatMapInput, accessToken: string) {
  return {
    ...buildFlightFlowBase(input, accessToken),
    airlineAccessCode: input.airlineAccessCode || "",
    journeyDepartReference: input.detailSchedule || "",
    journeyReturnReference: "",
  }
}

function buildPricePayload(
  input: DharmawisataFlightSeatMapInput,
  accessToken: string,
  scheduleSegments: DharmawisataFlightScheduleSegment[],
) {
  return {
    ...buildFlightFlowBase(input, accessToken),
    searchKey: input.searchKey || "",
    promoCode: "",
    schDeparts: buildSchedules(input, scheduleSegments),
    schReturns: [],
  }
}

function buildSeatPayload(
  input: DharmawisataFlightSeatMapInput,
  accessToken: string,
  scheduleSegments: DharmawisataFlightScheduleSegment[],
) {
  const departureSegment = getDepartureScheduleSegment(scheduleSegments)
  const departureAirlineSegmentCode =
    departureSegment?.airlineSegmentCode ||
    input.airlineAccessCode ||
    input.searchKey ||
    input.detailSchedule ||
    input.flightNumber ||
    ""
  const departureFareBasisCode = departureSegment?.fareBasisCode || input.flightClass || ""

  return {
    ...buildFlightFlowBase(input, accessToken),
    schDepart: input.detailSchedule || "",
    schReturn: "",
    departureAirlineSegmentCode,
    departureFareBasisCode,
    returnAirlineSegmentCode: null,
    returnFareBasisCode: null,
    contactFirstName: input.contactFirstName || "",
    contactLastName: input.contactLastName || "",
    contactTitle: input.contactTitle || "MR",
    contactCountryCodePhone: input.contactCountryCodePhone || "",
    contactAreaCodePhone: input.contactAreaCodePhone || "",
    contactRemainingPhoneNo: input.contactRemainingPhoneNo || "",
    contactEmail: input.contactEmail || "",
    paxDetails: buildPassengerPayload(input.passengers, input.contactEmail),
    insurance: false,
  }
}

function withScheduleLookup(input: DharmawisataFlightSeatMapInput, scheduleLookup: DharmawisataFlightScheduleLookupResult) {
  return {
    ...input,
    airlineAccessCode: scheduleLookup.airlineAccessCode || input.airlineAccessCode || "",
    searchKey: scheduleLookup.searchKey || input.searchKey || "",
    detailSchedule: scheduleLookup.detailSchedule || input.detailSchedule || "",
    flightClass: scheduleLookup.flightClass || input.flightClass || "",
    flightNumber: scheduleLookup.flightNumber || input.flightNumber || "",
    departureAt: scheduleLookup.departureAt || input.departureAt || "",
    arrivalAt: scheduleLookup.arrivalAt || input.arrivalAt || "",
  }
}

function replaceScheduleDetail(
  input: DharmawisataFlightSeatMapInput,
  scheduleSegments: DharmawisataFlightScheduleSegment[],
  detailSchedule: string,
) {
  return {
    input: {
      ...input,
      detailSchedule,
    },
    scheduleSegments: scheduleSegments.map((segment) => ({
      ...segment,
      detailSchedule,
    })),
  }
}

function responseStatus(raw: JsonRecord) {
  return normalizeText(raw.status).toUpperCase()
}

function responseStepSummary(endpoint: string, raw: JsonRecord, expectedFlightClass?: string | null) {
  const status = normalizeText(raw.status) || "SUCCESS"
  const message = normalizeText(raw.respMessage || raw.message) || status

  return {
    endpoint,
    ok: !responseStatus(raw) || responseStatus(raw) === "SUCCESS",
    status,
    message,
    searchKey: pickString(raw, ["searchKey"]),
    airlineAccessCode: pickString(raw, ["airlineAccessCode"]),
    departureClassFare: pickPriceClassFare(raw, ["priceDepart", "PriceDepart"], expectedFlightClass),
    returnClassFare: pickPriceClassFare(raw, ["priceReturn", "PriceReturn"], expectedFlightClass),
    sumFare: pickString(raw, ["sumFare", "SumFare"]),
    addOnsCount: Array.isArray(raw.addOns) ? raw.addOns.length : 0,
    seatAddOnsCount: Array.isArray(raw.seatAddOns) ? raw.seatAddOns.length : 0,
    raw,
  }
}

function summarizeRequest(body: JsonRecord): JsonRecord {
  return {
    airlineID: normalizeText(body.airlineID),
    origin: normalizeText(body.origin),
    destination: normalizeText(body.destination),
    tripType: normalizeText(body.tripType),
    departDate: normalizeText(body.departDate),
    returnDate: normalizeText(body.returnDate),
    paxAdult: normalizeNumber(body.paxAdult),
    paxChild: normalizeNumber(body.paxChild),
    paxInfant: normalizeNumber(body.paxInfant),
    hasUserID: hasText(body.userID),
    hasAccessToken: hasText(body.accessToken),
    hasSearchKey: hasText(body.searchKey),
    hasAirlineAccessCode: hasText(body.airlineAccessCode),
    hasJourneyDepartReference: hasText(body.journeyDepartReference),
    hasSchDepart: hasText(body.schDepart),
    hasDepartureAirlineSegmentCode: hasText(body.departureAirlineSegmentCode),
    hasDepartureFareBasisCode: hasText(body.departureFareBasisCode),
    passengerCount: Array.isArray(body.paxDetails) ? body.paxDetails.length : 0,
  }
}

function summarizeResponse(step: ReturnType<typeof responseStepSummary>) {
  return {
    endpoint: step.endpoint,
    ok: step.ok,
    status: step.status,
    message: step.message,
    hasSearchKey: hasText(step.searchKey),
    hasAirlineAccessCode: hasText(step.airlineAccessCode),
    hasDepartureClassFare: hasText(step.departureClassFare),
    hasReturnClassFare: hasText(step.returnClassFare),
    sumFare: step.sumFare,
    addOnsCount: step.addOnsCount,
    seatAddOnsCount: step.seatAddOnsCount,
  }
}

async function runSeatMapStep(endpoint: string, path: string, body: JsonRecord, expectedFlightClass?: string | null) {
  const response = await dharmawisataJsonFetch({
    path,
    method: "POST",
    body,
  })
  const raw = asRecord(response) || { response }
  return responseStepSummary(endpoint, raw, expectedFlightClass)
}

function summarizeScheduleLookup(result: DharmawisataFlightScheduleLookupResult | null) {
  if (!result) return null

  return {
    ok: result.ok,
    message: result.message,
    source: result.source || null,
    hasDetailSchedule: Boolean(result.detailSchedule),
    hasSearchKey: Boolean(result.searchKey),
    hasAirlineAccessCode: Boolean(result.airlineAccessCode),
    hasScheduleAccessToken: Boolean(result.scheduleAccessToken),
    flightClass: result.flightClass,
    flightNumber: result.flightNumber,
    departureAt: result.departureAt,
    arrivalAt: result.arrivalAt,
    segmentCount: result.segments.length,
  }
}

function normalizeSeatInfo(value: unknown): DharmawisataSeatInfo | null {
  const item = asRecord(value)
  if (!item) return null
  const seatDesignator = normalizeText(item.seatDesignator)
  if (!seatDesignator) return null

  return {
    compartment: normalizeText(item.compartment),
    assignable: normalizeBoolean(item.assignable),
    isOpen: normalizeBoolean(item.isOpen),
    x: normalizeNumber(item.X ?? item.x),
    y: normalizeNumber(item.Y ?? item.y),
    width: normalizeNumber(item.width, 1),
    height: normalizeNumber(item.height, 1),
    seatDesignator,
    seatType: normalizeText(item.seatType),
    seatPrice: normalizeNumber(item.seatPrice),
    seatText: normalizeText(item.seatText),
    currency: normalizeText(item.currency) || "IDR",
  }
}

function normalizeSeatSegment(value: unknown): DharmawisataSeatSegment | null {
  const item = asRecord(value)
  if (!item) return null
  const infos = asArray(item.infos).map(normalizeSeatInfo).filter((seat): seat is DharmawisataSeatInfo => Boolean(seat))
  if (infos.length === 0) return null

  return {
    origin: normalizeText(item.origin),
    destination: normalizeText(item.destination),
    departTime: normalizeText(item.departTime),
    arrivalTime: normalizeText(item.arrivalTime),
    infos,
  }
}

function normalizeSeatResponse(raw: JsonRecord) {
  return asArray(raw.seatAddOns)
    .map(normalizeSeatSegment)
    .filter((segment): segment is DharmawisataSeatSegment => Boolean(segment))
}

export async function getDharmawisataFlightSeatMap(
  input: DharmawisataFlightSeatMapInput,
): Promise<DharmawisataFlightSeatMapResult> {
  if (!isDharmawisataConfigured()) {
    return {
      ok: false,
      skipped: true,
      message: "Konfigurasi Dharmawisata belum lengkap untuk cek seat map.",
      segments: [],
      raw: { seatMode: "manual_unconfigured" },
    }
  }

  const missingFields = getMissingRequiredFields(input)
  if (missingFields.length > 0) {
    return {
      ok: false,
      skipped: true,
      message: `Data untuk cek seat map belum lengkap: ${missingFields.join(", ")}.`,
      segments: [],
      raw: { seatMode: "manual_incomplete_data", missingFields },
    }
  }

  try {
    const scheduleLookup = await findDharmawisataLowFareScheduleForBooking({
      airlineCode: input.airlineCode || input.airlineId || "",
      flightNumber: input.flightNumber,
      originAirportCode: input.originAirportCode,
      destinationAirportCode: input.destinationAirportCode,
      tripType: input.tripType,
      departureAt: input.departureAt,
      returnAt: input.returnAt,
      airlineAccessCode: input.airlineAccessCode,
      flightClass: input.flightClass,
      paxAdult: input.paxAdult,
      paxChild: input.paxChild || 0,
      paxInfant: input.paxInfant || 0,
      allowLowFareFallback: false,
    })
    const officialScheduleReady =
      scheduleLookup.ok === true &&
      (scheduleLookup.source === "Airline/ScheduleAllAirline" || scheduleLookup.source === "Airline/Schedule") &&
      Boolean(scheduleLookup.detailSchedule) &&
      Boolean(scheduleLookup.scheduleAccessToken)

    if (!officialScheduleReady) {
      return {
        ok: false,
        skipped: false,
        message:
          "Seat map Dharmawisata ditahan: ScheduleAllAirline/Schedule resmi belum berhasil pada token transaksi yang sama.",
        segments: [],
        raw: {
          seatMode: "api_contract_strict",
          sameTransactionToken: true,
          scheduleLookup: summarizeScheduleLookup(scheduleLookup),
          error: "airline_schedule_or_schedule_all_airline_step_required",
        },
      }
    }

    const accessToken = normalizeText(scheduleLookup.scheduleAccessToken)
    const usesAllAirlineFlow = scheduleLookup.source === "Airline/ScheduleAllAirline"
    let resolvedInput: DharmawisataFlightSeatMapInput = withScheduleLookup(input, scheduleLookup)
    let scheduleSegments: DharmawisataFlightScheduleSegment[] = scheduleLookup.segments
    const pricePath = usesAllAirlineFlow
      ? getDharmawisataConfiguredPath("DHARMAWISATA_H2H_PRICE_ALL_AIRLINE_PATH") || "/Airline/PriceAllAirline"
      : getDharmawisataConfiguredPath("DHARMAWISATA_H2H_PRICE_PATH") || "/Airline/Price"
    const priceEndpoint = usesAllAirlineFlow ? "Airline/PriceAllAirline" : "Airline/Price"
    const pricePayload = usesAllAirlineFlow
      ? buildPriceAllAirlinePayload(resolvedInput, accessToken)
      : buildPricePayload(resolvedInput, accessToken, scheduleSegments)
    const priceStep = await runSeatMapStep(priceEndpoint, pricePath, { ...pricePayload }, resolvedInput.flightClass)

    if (!priceStep.ok) {
      return {
        ok: false,
        skipped: false,
        message: `Price Dharmawisata gagal sebelum seat map: ${priceStep.message}`,
        segments: [],
        raw: {
          seatMode: "api_contract_strict",
          sameTransactionToken: true,
          scheduleSource: scheduleLookup.source,
          scheduleLookup: summarizeScheduleLookup(scheduleLookup),
          price: summarizeResponse(priceStep),
          request: summarizeRequest(pricePayload),
        },
      }
    }

    if (!priceStep.departureClassFare) {
      return {
        ok: false,
        skipped: false,
        message: "Price Dharmawisata tidak mengembalikan classFare untuk schDepart, jadi seat map ditahan.",
        segments: [],
        raw: {
          seatMode: "api_contract_strict",
          sameTransactionToken: true,
          scheduleSource: scheduleLookup.source,
          scheduleLookup: summarizeScheduleLookup(scheduleLookup),
          price: summarizeResponse(priceStep),
          error: "price_departure_class_fare_required",
        },
      }
    }

    const replaced = replaceScheduleDetail(
      {
        ...resolvedInput,
        searchKey: priceStep.searchKey || resolvedInput.searchKey || "",
        airlineAccessCode: priceStep.airlineAccessCode || resolvedInput.airlineAccessCode || "",
      },
      scheduleSegments,
      priceStep.departureClassFare,
    )
    resolvedInput = replaced.input
    scheduleSegments = replaced.scheduleSegments

    const baggageAndMealPath =
      getDharmawisataConfiguredPath("DHARMAWISATA_H2H_BAGGAGE_AND_MEAL_PATH") || "/Airline/BaggageAndMeal"
    const baggagePayload = buildSeatPayload(resolvedInput, accessToken, scheduleSegments)
    const baggageRaw = await dharmawisataJsonFetch({
      path: baggageAndMealPath,
      method: "POST",
      body: baggagePayload,
    })
    const baggageStep = responseStepSummary(
      "Airline/BaggageAndMeal",
      asRecord(baggageRaw) || { response: baggageRaw },
      resolvedInput.flightClass,
    )

    if (!baggageStep.ok) {
      return {
        ok: false,
        skipped: false,
        message: `Baggage/Meal Dharmawisata gagal sebelum seat map: ${baggageStep.message}`,
        segments: [],
        raw: {
          seatMode: "api_contract_strict",
          sameTransactionToken: true,
          scheduleSource: scheduleLookup.source,
          scheduleLookup: summarizeScheduleLookup(scheduleLookup),
          price: summarizeResponse(priceStep),
          baggageAndMeal: summarizeResponse(baggageStep),
          request: summarizeRequest(baggagePayload),
        },
      }
    }

    resolvedInput = {
      ...resolvedInput,
      searchKey: baggageStep.searchKey || resolvedInput.searchKey || "",
      airlineAccessCode: baggageStep.airlineAccessCode || resolvedInput.airlineAccessCode || "",
    }

    const seatPath = getDharmawisataConfiguredPath("DHARMAWISATA_H2H_SEAT_PATH") || "/Airline/Seat"
    const seatPayload = buildSeatPayload(resolvedInput, accessToken, scheduleSegments)
    const seatRaw = await dharmawisataJsonFetch({
      path: seatPath,
      method: "POST",
      body: seatPayload,
    })
    const raw: JsonRecord = asRecord(seatRaw) || { response: seatRaw }
    const seatStep = responseStepSummary("Airline/Seat", raw, resolvedInput.flightClass)
    const segments = normalizeSeatResponse(raw)
    const ok = seatStep.ok || segments.length > 0

    return {
      ok,
      skipped: false,
      message: segments.length > 0
        ? "Pilihan kursi tersedia."
        : seatStep.message && seatStep.message.toUpperCase() !== "SUCCESS"
          ? seatStep.message
          : "Maskapai belum menyediakan layout kursi untuk penerbangan ini. Booking tetap bisa dilanjutkan tanpa memilih kursi.",
      segments,
      raw: {
        seatMode: "api_contract_strict",
        sameTransactionToken: true,
        scheduleSource: scheduleLookup.source,
        scheduleLookup: summarizeScheduleLookup(scheduleLookup),
        price: summarizeResponse(priceStep),
        baggageAndMeal: summarizeResponse(baggageStep),
        seat: summarizeResponse(seatStep),
        request: summarizeRequest(seatPayload),
        response: {
          status: seatStep.status,
          respMessage: seatStep.message,
          seatAddOnsCount: segments.length,
        },
      },
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Dharmawisata seat map gagal tanpa pesan error."

    return {
      ok: false,
      skipped: false,
      message,
      segments: [],
      raw: { seatMode: "api_contract_strict", error: message },
    }
  }
}
