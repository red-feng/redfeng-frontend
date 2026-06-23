import {
  dharmawisataJsonFetch,
  dharmawisataLogin,
  getDharmawisataAccessTokenOverride,
  getDharmawisataConfiguredPath,
  getDharmawisataCredentials,
  isDharmawisataConfigured,
} from "@/lib/dharmawisata/client"

type JsonRecord = Record<string, unknown>

export type DharmawisataHotelBookingInput = {
  bookingCode: string
  hotelId?: string | null
  countryId?: string | null
  cityId?: string | null
  checkinDate?: string | null
  checkoutDate?: string | null
  roomCount: number
  childCount?: number
  internalCode?: string | null
  breakfastId?: string | null
  roomId?: string | null
  guestTitle?: string | null
  guestFirstName?: string | null
  guestLastName?: string | null
  guestPhone?: string | null
  guestEmail?: string | null
  requestDescription?: string | null
}

export type DharmawisataHotelBookingResult = {
  ok: boolean
  skipped: boolean
  mode: "api" | "manual_unconfigured" | "manual_incomplete_data"
  message: string
  reservationNo: string | null
  voucherNo: string | null
  bookingStatus: string | null
  totalPrice: number | null
  issuedTimeLimit: string | null
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

function pickNumber(raw: JsonRecord, keys: string[]) {
  for (const key of keys) {
    const parsed = Number(raw[key])
    if (Number.isFinite(parsed)) return parsed
  }
  return null
}

function normalizeDharmawisataDate(value: string | null | undefined) {
  const raw = normalizeText(value)
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return `${raw}T00:00:00`
  const parsed = new Date(raw)
  if (!Number.isNaN(parsed.getTime())) return `${parsed.toISOString().slice(0, 10)}T00:00:00`
  return ""
}

function getMissingRequiredFields(input: DharmawisataHotelBookingInput) {
  const required: Array<[string, unknown]> = [
    ["hotelID", input.hotelId],
    ["countryID", input.countryId],
    ["cityID", input.cityId],
    ["checkInDate", input.checkinDate],
    ["checkOutDate", input.checkoutDate],
    ["internalCode", input.internalCode],
    ["breakfast", input.breakfastId],
    ["roomID", input.roomId],
    ["guestFirstName", input.guestFirstName],
    ["guestLastName", input.guestLastName],
    ["guestPhone", input.guestPhone],
    ["guestEmail", input.guestEmail],
  ]

  return required.filter(([, value]) => !normalizeText(value)).map(([key]) => key)
}

function buildRoomRequest(input: DharmawisataHotelBookingInput) {
  const roomCount = Math.max(Math.floor(Number(input.roomCount || 1)), 1)
  const childCount = Math.max(Math.floor(Number(input.childCount || 0)), 0)
  return Array.from({ length: roomCount }, () => ({
    roomType: 0,
    isRequestChildBed: childCount > 0,
    childNum: childCount,
    childAges: childCount > 0 ? Array.from({ length: childCount }, () => 8) : [],
  }))
}

function buildBookingPayload(input: DharmawisataHotelBookingInput, accessToken: string) {
  const credentials = getDharmawisataCredentials()
  return {
    paxPassport: "ID",
    countryID: input.countryId || "",
    cityID: input.cityId || "",
    checkOutDate: normalizeDharmawisataDate(input.checkoutDate),
    checkInDate: normalizeDharmawisataDate(input.checkinDate),
    roomRequest: buildRoomRequest(input),
    internalCode: input.internalCode || "",
    hotelID: input.hotelId || "",
    breakfast: input.breakfastId || "",
    roomID: input.roomId || "",
    requestDescription: input.requestDescription || "Red Feng hotel booking",
    guestTitle: input.guestTitle || "MR",
    guestFirstName: input.guestFirstName || "",
    guestLastName: input.guestLastName || input.guestFirstName || "",
    guestPhone: input.guestPhone || "",
    guestEmail: input.guestEmail || "",
    agentOsRef: input.bookingCode,
    contactName: `${input.guestFirstName || ""} ${input.guestLastName || ""}`.trim(),
    contactPhone: input.guestPhone || "",
    userID: credentials.userId,
    accessToken,
  }
}

function summarizeRequest(payload: ReturnType<typeof buildBookingPayload>) {
  return {
    hotelID: payload.hotelID,
    countryID: payload.countryID,
    cityID: payload.cityID,
    checkInDate: payload.checkInDate,
    checkOutDate: payload.checkOutDate,
    roomCount: payload.roomRequest.length,
    hasInternalCode: Boolean(payload.internalCode),
    hasRoomID: Boolean(payload.roomID),
    agentOsRef: payload.agentOsRef,
  }
}

async function fetchBookingDetail(reservationNo: string, accessToken: string) {
  const detailPath = getDharmawisataConfiguredPath("DHARMAWISATA_H2H_HOTEL_BOOKING_DETAIL_PATH") || "/Hotel/BookingDetail"
  const credentials = getDharmawisataCredentials()

  return dharmawisataJsonFetch({
    path: detailPath,
    method: "POST",
    body: {
      reservationNo,
      userID: credentials.userId,
      accessToken,
    },
  })
}

function isSuccessResponse(raw: JsonRecord) {
  const status = normalizeText(raw.status).toUpperCase()
  if (status === "FAILED" || status === "ERROR") return false
  return Boolean(pickString(raw, ["reservationNo", "voucherNo"]) || status === "SUCCESS")
}

export async function createDharmawisataHotelBookingAfterPayment(
  input: DharmawisataHotelBookingInput,
): Promise<DharmawisataHotelBookingResult> {
  const bookingPath = getDharmawisataConfiguredPath("DHARMAWISATA_H2H_HOTEL_BOOKING_PATH") || "/Hotel/BookingAllSupplier"

  if (!isDharmawisataConfigured()) {
    return {
      ok: false,
      skipped: true,
      mode: "manual_unconfigured",
      message: "Konfigurasi Dharmawisata belum lengkap untuk booking hotel.",
      reservationNo: null,
      voucherNo: null,
      bookingStatus: null,
      totalPrice: null,
      issuedTimeLimit: null,
      raw: { bookingMode: "manual_unconfigured", requiredEnv: "DHARMAWISATA_H2H_BASE_URL, USER_ID, PASSWORD" },
    }
  }

  const missingFields = getMissingRequiredFields(input)
  if (missingFields.length > 0) {
    return {
      ok: false,
      skipped: true,
      mode: "manual_incomplete_data",
      message: `Data hotel Dharmawisata belum lengkap: ${missingFields.join(", ")}.`,
      reservationNo: null,
      voucherNo: null,
      bookingStatus: null,
      totalPrice: null,
      issuedTimeLimit: null,
      raw: { bookingMode: "manual_incomplete_data", missingFields },
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
        reservationNo: null,
        voucherNo: null,
        bookingStatus: null,
        totalPrice: null,
        issuedTimeLimit: null,
        raw: { bookingMode: "api", auth, error: "empty_access_token" },
      }
    }

    const payload = buildBookingPayload(input, accessToken)
    const bookingResponse = await dharmawisataJsonFetch({
      path: bookingPath,
      method: "POST",
      body: payload,
    })
    const bookingRaw = asRecord(bookingResponse) || { response: bookingResponse }
    const reservationNo = pickString(bookingRaw, ["reservationNo"])

    let detailRaw: unknown = null
    if (reservationNo && isSuccessResponse(bookingRaw)) {
      try {
        detailRaw = await fetchBookingDetail(reservationNo, accessToken)
      } catch (detailError) {
        detailRaw = {
          warning: detailError instanceof Error ? detailError.message : "Hotel booking detail belum bisa dibaca.",
        }
      }
    }

    const detailRecord = asRecord(detailRaw) || null
    const finalRecord = detailRecord && isSuccessResponse(detailRecord) ? detailRecord : bookingRaw
    const ok = isSuccessResponse(bookingRaw)

    return {
      ok,
      skipped: false,
      mode: "api",
      message: pickString(finalRecord, ["respMessage", "message"]) || (ok ? "Hotel Dharmawisata booking confirmed." : "Hotel Dharmawisata booking belum berhasil."),
      reservationNo: pickString(finalRecord, ["reservationNo"]) || reservationNo,
      voucherNo: pickString(finalRecord, ["voucherNo"]),
      bookingStatus: pickString(finalRecord, ["bookingStatus"]),
      totalPrice: pickNumber(finalRecord, ["totalPrice"]),
      issuedTimeLimit: pickString(finalRecord, ["issuedTimeLimit"]),
      raw: {
        bookingMode: "api",
        hotelBookingFinalAction: "Hotel/BookingAllSupplier",
        note: "Dharmawisata hotel langsung payment saat BookingAllSupplier; Hotel/Issued tidak dipanggil sebagai langkah wajib.",
        request: summarizeRequest(payload),
        bookingResponse: bookingRaw,
        detailResponse: detailRaw,
      },
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Dharmawisata hotel booking gagal tanpa pesan error."
    return {
      ok: false,
      skipped: false,
      mode: "api",
      message,
      reservationNo: null,
      voucherNo: null,
      bookingStatus: null,
      totalPrice: null,
      issuedTimeLimit: null,
      raw: { bookingMode: "api", error: message },
    }
  }
}

export const createAndIssueDharmawisataHotelBooking = createDharmawisataHotelBookingAfterPayment
