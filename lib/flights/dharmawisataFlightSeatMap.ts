import {
  dharmawisataJsonFetch,
  dharmawisataLogin,
  getDharmawisataAccessTokenOverride,
  getDharmawisataConfiguredPath,
  getDharmawisataCredentials,
  isDharmawisataConfigured,
} from "@/lib/dharmawisata/client"
import type { DharmawisataPassenger } from "@/lib/flights/dharmawisataFlightBooking"

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

function normalizeDharmawisataTripType(value: string | null | undefined) {
  return String(value || "").toLowerCase() === "round_trip" ? "RoundTrip" : "OneWay"
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
    IDNumber: "",
    title: passenger.title || "MR",
    firstName: passenger.firstName,
    lastName: passenger.lastName || passenger.firstName,
    birthDate: normalizeDharmawisataBirthDate(passenger.birthDate),
    gender: normalizeDharmawisataGender(passenger.gender, passenger.title),
    nationality: "ID",
    birthCountry: "ID",
    DocType: "",
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
    ["schDepart", input.detailSchedule || input.flightNumber],
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

function buildSeatPayload(input: DharmawisataFlightSeatMapInput, accessToken: string) {
  const credentials = getDharmawisataCredentials()
  const isRoundTrip = normalizeDharmawisataTripType(input.tripType) === "RoundTrip"
  const scheduleCode = input.detailSchedule || input.flightNumber || ""
  const segmentCode = input.airlineAccessCode || input.searchKey || input.detailSchedule || input.flightNumber || ""

  return {
    airlineID: input.airlineId || input.airlineCode || "",
    origin: input.originAirportCode || "",
    destination: input.destinationAirportCode || "",
    tripType: normalizeDharmawisataTripType(input.tripType),
    departDate: input.departureAt || "",
    returnDate: isRoundTrip ? input.returnAt || "" : "0001-01-01T00:00:00",
    schDepart: scheduleCode,
    schReturn: "",
    paxAdult: input.paxAdult,
    paxChild: input.paxChild || 0,
    paxInfant: input.paxInfant || 0,
    departureAirlineSegmentCode: segmentCode,
    departureFareBasisCode: input.flightClass || "",
    returnAirlineSegmentCode: "",
    returnFareBasisCode: "",
    contactFirstName: input.contactFirstName || "",
    contactLastName: input.contactLastName || "",
    contactTitle: input.contactTitle || "MR",
    contactCountryCodePhone: input.contactCountryCodePhone || "",
    contactAreaCodePhone: input.contactAreaCodePhone || "",
    contactRemainingPhoneNo: input.contactRemainingPhoneNo || "",
    contactEmail: input.contactEmail || "",
    paxDetails: buildPassengerPayload(input.passengers, input.contactEmail),
    insurance: false,
    userID: credentials.userId,
    accessToken,
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
    const accessTokenOverride = getDharmawisataAccessTokenOverride()
    const auth = accessTokenOverride ? { accessToken: accessTokenOverride } : await dharmawisataLogin({ language: 1 })
    const accessToken = normalizeText(auth.accessToken)

    if (!accessToken) {
      return {
        ok: false,
        skipped: false,
        message: "Login Dharmawisata berhasil dipanggil, tetapi access token kosong.",
        segments: [],
        raw: { seatMode: "api", auth, error: "empty_access_token" },
      }
    }

    const payload = buildSeatPayload(input, accessToken)
    const rawResponse = await dharmawisataJsonFetch({
      path: getDharmawisataConfiguredPath("DHARMAWISATA_H2H_SEAT_PATH") || "/Airline/Seat",
      method: "POST",
      body: payload,
    })
    const raw: JsonRecord = asRecord(rawResponse) || { response: rawResponse }
    const segments = normalizeSeatResponse(raw)
    const status = normalizeText(raw.status).toUpperCase()
    const respMessage = normalizeText(raw.respMessage || raw.message)
    const ok = status === "SUCCESS" || segments.length > 0

    return {
      ok,
      skipped: false,
      message: segments.length > 0
        ? "Seat map tersedia dari Dharmawisata."
        : respMessage || "Seat map tidak tersedia untuk rute atau maskapai ini.",
      segments,
      raw: {
        seatMode: "api",
        request: {
          airlineID: payload.airlineID,
          origin: payload.origin,
          destination: payload.destination,
          tripType: payload.tripType,
          departDate: payload.departDate,
          schDepart: payload.schDepart,
          hasSegmentCode: Boolean(payload.departureAirlineSegmentCode),
          passengerCount: input.passengers.length,
        },
        response: raw,
      },
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Dharmawisata seat map gagal tanpa pesan error."

    return {
      ok: false,
      skipped: false,
      message,
      segments: [],
      raw: { seatMode: "api", error: message },
    }
  }
}
