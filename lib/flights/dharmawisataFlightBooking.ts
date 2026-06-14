import {
  dharmawisataJsonFetch,
  dharmawisataLogin,
  getDharmawisataAccessTokenOverride,
  getDharmawisataConfiguredPath,
  getDharmawisataCredentials,
  isDharmawisataConfigured,
} from "@/lib/dharmawisata/client"

type JsonRecord = Record<string, unknown>

export type DharmawisataPassenger = {
  title: string
  firstName: string
  lastName: string
  email?: string | null
  type?: "Adult" | "Child" | "Infant"
}

export type DharmawisataFlightBookingInput = {
  bookingId: string
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

export type DharmawisataFlightBookingResult = {
  ok: boolean
  skipped: boolean
  mode: "api" | "manual_unconfigured" | "manual_incomplete_data"
  message: string
  bookingCode: string | null
  bookingDate: string | null
  timeLimit: string | null
  referenceNo: string | null
  bookingCodeAirline: string | null
  airlineAccessCode: string | null
  raw: JsonRecord
}

function asRecord(value: unknown): JsonRecord | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as JsonRecord) : null
}

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : typeof value === "number" ? String(value) : ""
}

function pickString(raw: JsonRecord, keys: string[]) {
  for (const key of keys) {
    const value = normalizeText(raw[key])
    if (value) return value
  }
  return null
}

function getResponseMessage(raw: JsonRecord) {
  return pickString(raw, ["respMessage", "message", "errorMessage", "resultMessage"]) || "Dharmawisata booking response diterima."
}

function isSuccessfulBooking(raw: JsonRecord) {
  const status = normalizeText(raw.status).toUpperCase()
  if (status === "SUCCESS") return true
  if (status === "FAILED") return false
  return Boolean(pickString(raw, ["bookingCode", "bookingCodeAirline", "referenceNo"]))
}

function normalizeDharmawisataTripType(value: string | null | undefined) {
  return String(value || "").toLowerCase() === "round_trip" ? "RoundTrip" : "OneWay"
}

function passengerType(value: DharmawisataPassenger["type"]) {
  if (value === "Child") return 1
  if (value === "Infant") return 2
  return 0
}

function buildPassengerPayload(passengers: DharmawisataPassenger[], fallbackEmail?: string | null) {
  return passengers.map((passenger) => ({
    addOns: [],
    IDNumber: "",
    title: passenger.title || "MR",
    firstName: passenger.firstName,
    lastName: passenger.lastName || passenger.firstName,
    birthDate: "0001-01-01T00:00:00",
    gender: "",
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

function buildSchedule(input: DharmawisataFlightBookingInput) {
  return {
    airlineCode: input.airlineCode || input.airlineId || "",
    flightNumber: input.flightNumber || "",
    schOrigin: input.originAirportCode || "",
    schDestination: input.destinationAirportCode || "",
    detailSchedule: input.detailSchedule || input.flightNumber || "",
    schDepartTime: input.departureAt || "",
    schArrivalTime: input.arrivalAt || input.departureAt || "",
    flightClass: input.flightClass || "Economy",
    garudaNumber: "",
    garudaAvailability: "",
  }
}

function getMissingRequiredFields(input: DharmawisataFlightBookingInput) {
  const required: Array<[string, unknown]> = [
    ["airlineID", input.airlineId || input.airlineCode],
    ["origin", input.originAirportCode],
    ["destination", input.destinationAirportCode],
    ["departDate", input.departureAt],
    ["schDeparts", input.flightNumber],
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

  return required.filter(([, value]) => !normalizeText(value)).map(([key]) => key)
}

function buildBookingPayload(input: DharmawisataFlightBookingInput, accessToken: string) {
  const credentials = getDharmawisataCredentials()
  const isRoundTrip = normalizeDharmawisataTripType(input.tripType) === "RoundTrip"

  return {
    airlineID: input.airlineId || input.airlineCode || "",
    origin: input.originAirportCode || "",
    destination: input.destinationAirportCode || "",
    tripType: normalizeDharmawisataTripType(input.tripType),
    departDate: input.departureAt || "",
    returnDate: isRoundTrip ? input.returnAt || "" : "0001-01-01T00:00:00",
    paxAdult: input.paxAdult,
    paxChild: input.paxChild || 0,
    paxInfant: input.paxInfant || 0,
    schDeparts: [buildSchedule(input)],
    schReturns: [],
    contactFirstName: input.contactFirstName || "",
    contactLastName: input.contactLastName || "",
    contactTitle: input.contactTitle || "MR",
    contactCountryCodePhone: input.contactCountryCodePhone || "",
    contactAreaCodePhone: input.contactAreaCodePhone || "",
    contactRemainingPhoneNo: input.contactRemainingPhoneNo || "",
    contactEmail: input.contactEmail || "",
    paxDetails: buildPassengerPayload(input.passengers, input.contactEmail),
    searchKey: input.searchKey || "",
    insurance: false,
    promoCode: "",
    airlineAccessCode: input.airlineAccessCode || "",
    userID: credentials.userId,
    accessToken,
  }
}

async function fetchBookingDetail(raw: JsonRecord, accessToken: string) {
  const detailPath = getDharmawisataConfiguredPath("DHARMAWISATA_H2H_BOOKING_DETAIL_PATH")
  const bookingCode = pickString(raw, ["bookingCode"])
  const bookingDate = pickString(raw, ["bookingDate"])

  if (!detailPath || !bookingCode || !bookingDate) return null

  const credentials = getDharmawisataCredentials()
  return dharmawisataJsonFetch({
    path: detailPath,
    method: "POST",
    body: {
      bookingCode,
      bookingDate,
      referenceNo: pickString(raw, ["referenceNo"]) || "",
      userID: credentials.userId,
      accessToken,
    },
  })
}

export async function createDharmawisataFlightBooking(
  input: DharmawisataFlightBookingInput,
): Promise<DharmawisataFlightBookingResult> {
  const bookingPath = getDharmawisataConfiguredPath("DHARMAWISATA_H2H_BOOKING_PATH")

  if (!isDharmawisataConfigured() || !bookingPath) {
    return {
      ok: false,
      skipped: true,
      mode: "manual_unconfigured",
      message: "Endpoint booking Dharmawisata belum dikonfigurasi. Isi DHARMAWISATA_H2H_BOOKING_PATH=/Airline/Booking untuk auto-hold.",
      bookingCode: null,
      bookingDate: null,
      timeLimit: null,
      referenceNo: null,
      bookingCodeAirline: null,
      airlineAccessCode: null,
      raw: {
        bookingMode: "manual_unconfigured",
        configured: false,
        requiredEnv: "DHARMAWISATA_H2H_BOOKING_PATH",
        officialPath: "/Airline/Booking",
      },
    }
  }

  const missingFields = getMissingRequiredFields(input)
  if (missingFields.length > 0) {
    return {
      ok: false,
      skipped: true,
      mode: "manual_incomplete_data",
      message: `Data untuk auto-booking Dharmawisata belum lengkap: ${missingFields.join(", ")}.`,
      bookingCode: null,
      bookingDate: null,
      timeLimit: null,
      referenceNo: null,
      bookingCodeAirline: null,
      airlineAccessCode: input.airlineAccessCode || null,
      raw: {
        bookingMode: "manual_incomplete_data",
        missingFields,
      },
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
        mode: "api",
        message: "Login Dharmawisata berhasil dipanggil, tetapi access token kosong.",
        bookingCode: null,
        bookingDate: null,
        timeLimit: null,
        referenceNo: null,
        bookingCodeAirline: null,
        airlineAccessCode: input.airlineAccessCode || null,
        raw: {
          bookingMode: "api",
          auth,
          error: "empty_access_token",
        },
      }
    }

    const payload = buildBookingPayload(input, accessToken)
    const rawResponse = await dharmawisataJsonFetch({
      path: bookingPath,
      method: "POST",
      body: payload,
    })
    const raw = asRecord(rawResponse) || { response: rawResponse }
    const ok = isSuccessfulBooking(raw)
    let detail: unknown = null
    if (ok) {
      try {
        detail = await fetchBookingDetail(raw, accessToken)
      } catch (detailError) {
        detail = {
          status: "FAILED",
          respMessage: detailError instanceof Error ? detailError.message : "Booking detail check gagal.",
        }
      }
    }
    const rawWithDetail = detail
      ? {
          ...raw,
          bookingDetail: detail,
        }
      : raw

    return {
      ok,
      skipped: false,
      mode: "api",
      message: getResponseMessage(raw),
      bookingCode: pickString(raw, ["bookingCode"]),
      bookingDate: pickString(raw, ["bookingDate"]),
      timeLimit: pickString(raw, ["timeLimit"]),
      referenceNo: pickString(raw, ["referenceNo"]),
      bookingCodeAirline: pickString(raw, ["bookingCodeAirline"]),
      airlineAccessCode: pickString(raw, ["airlineAccessCode"]) || input.airlineAccessCode || null,
      raw: {
        bookingMode: "api",
        request: {
          ...payload,
          accessToken: "[redacted]",
        },
        response: rawWithDetail,
      },
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Dharmawisata booking gagal tanpa pesan error."

    return {
      ok: false,
      skipped: false,
      mode: "api",
      message,
      bookingCode: null,
      bookingDate: null,
      timeLimit: null,
      referenceNo: null,
      bookingCodeAirline: null,
      airlineAccessCode: input.airlineAccessCode || null,
      raw: {
        bookingMode: "api",
        error: message,
      },
    }
  }
}
