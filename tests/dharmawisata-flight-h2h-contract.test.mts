import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

const clientSource = readFileSync(resolve("lib/dharmawisata/client.ts"), "utf8")
const scheduleSource = readFileSync(resolve("lib/flights/dharmawisataFlightScheduleLookup.ts"), "utf8")
const bookingSource = readFileSync(resolve("lib/flights/dharmawisataFlightBooking.ts"), "utf8")
const routeCacheSource = readFileSync(resolve("lib/flights/dharmawisataRouteCache.ts"), "utf8")
const airlineApiSource = readFileSync(resolve("lib/flights/dharmawisataAirlineApi.ts"), "utf8")
const ticketIssueSource = readFileSync(resolve("lib/flights/dharmawisataTicketIssue.ts"), "utf8")
const policySource = readFileSync(resolve("lib/flights/automationPolicy.ts"), "utf8")
const referenceSource = readFileSync(resolve("docs/dharmawisata-flight-h2h-reference.md"), "utf8")
const flightBookingRouteSource = readFileSync(resolve("app/api/flights/bookings/route.ts"), "utf8")
const adminBookingPageSource = readFileSync(resolve("app/admin/(protected)/bookings/[id]/page.tsx"), "utf8")

function assertIncludes(source: string, anchor: string, label: string) {
  assert.ok(source.includes(anchor), `${label} missing anchor: ${anchor}`)
}

assertIncludes(
  clientSource,
  "return md5(`${token}${md5(password)}`)",
  "Dharmawisata login securityCode contract",
)
assertIncludes(
  clientSource,
  'getOptionalEnv("DHARMAWISATA_H2H_TLS_REJECT_UNAUTHORIZED", "true").toLowerCase() !== "false"',
  "Dharmawisata UAT SSL override contract",
)
assert.ok(
  clientSource.includes("return dharmawisataJsonFetch({") &&
    clientSource.indexOf("return dharmawisataJsonFetch({") < clientSource.indexOf('path: loginPath || "/Session/Login"'),
  "Dharmawisata login must send application/json payloads",
)

for (const anchor of [
  'return asString(payload.searchKey || payload.SearchKey)',
  'return pickString(raw, ["detailSchedule", "journeyReference", "scheduleReference", "schDepart"])',
  "scheduleAccessToken: scheduleAccessToken || null",
  "source,",
  'const scheduleMatch = mapDharmawisataSchedulePayloadForBooking(payload, input, accessToken, "Airline/Schedule")',
  'const match = mapDharmawisataSchedulePayloadForBooking(payload, input, accessToken, "Airline/ScheduleAllAirline")',
  'let airlineAccessCode = ""',
  "body: buildScheduleAllAirlineRequestBody(input, credentials.userId, accessToken, airlineAccessCode)",
  "departDate: scheduleDate(input.departureAt)",
  ': "0001-01-01"',
  "const payload = await dharmawisataFormFetch({",
]) {
  assertIncludes(scheduleSource, anchor, "Dharmawisata Airline/Schedule booking context contract")
}

assert.ok(
  scheduleSource.indexOf('if (scheduleAllAirlinePath)') < scheduleSource.indexOf("if (schedulePath)"),
  "Dharmawisata booking lookup must prefer ScheduleAllAirline before Schedule",
)

const orderedBookingAnchors = [
  'const priceStep = await runPreBookingStep(priceEndpoint, pricePath',
  'const baggageStep = await runPreBookingStep("Airline/BaggageAndMeal"',
  'const seatStep = await runPreBookingStep("Airline/Seat"',
  "const payload = buildBookingPayload(bookingInput, accessToken)",
]

let previousIndex = -1
for (const anchor of orderedBookingAnchors) {
  const currentIndex = bookingSource.indexOf(anchor)
  assert.notEqual(currentIndex, -1, `Dharmawisata pre-booking flow missing anchor: ${anchor}`)
  assert.ok(currentIndex > previousIndex, `Dharmawisata pre-booking flow order changed around: ${anchor}`)
  previousIndex = currentIndex
}

for (const anchor of [
  "accessToken from Schedule/ScheduleAllAirline through Price, add-ons, Seat, and Booking.",
  'const usesAllAirlineFlow = input.scheduleSource === "Airline/ScheduleAllAirline"',
  'getDharmawisataConfiguredPath("DHARMAWISATA_H2H_PRICE_ALL_AIRLINE_PATH") || "/Airline/PriceAllAirline"',
  "buildPriceAllAirlinePayload(input, accessToken)",
  "buildPricePayload(input, accessToken)",
  "journeyDepartReference: input.detailSchedule ||",
  "schDeparts: buildSchedules(input)",
  'input.scheduleSource === "Airline/ScheduleAllAirline"',
  'departureClassFare: pickPriceClassFare(raw, ["priceDepart", "PriceDepart"], expectedFlightClass)',
  "resolvedInput = replaceScheduleDetail(",
  "preBookingFlow.departureClassFare || null",
  'error: "airline_schedule_or_schedule_all_airline_step_required"',
  "searchKey: baggageStep.searchKey || resolvedInput.searchKey ||",
  "airlineAccessCode: baggageStep.airlineAccessCode || resolvedInput.airlineAccessCode ||",
  "searchKey: seatStep.searchKey || resolvedInput.searchKey || null",
  "airlineAccessCode: seatStep.airlineAccessCode || resolvedInput.airlineAccessCode || null",
  "function buildBookingPayload(input: DharmawisataFlightBookingInput, accessToken: string)",
  "schDeparts: buildSchedules(input)",
  "schReturns: []",
    "searchKey: input.searchKey || \"\"",
    "insurance: false",
    "airlineAccessCode: input.airlineAccessCode || \"\"",
    "nationality: \"ID\"",
    "birthCountry: \"ID\"",
    "async function fetchBookingDetail(raw: JsonRecord, accessToken: string)",
    'getDharmawisataConfiguredPath("DHARMAWISATA_H2H_BOOKING_DETAIL_PATH")',
    "bookingCode,",
    "bookingDate,",
    'referenceNo: pickString(raw, ["referenceNo"]) || ""',
    "detail = await fetchBookingDetail(raw, accessToken)",
    "bookingDetail: detail",
    'bookingCode: pickString(raw, ["bookingCode"])',
    'timeLimit: pickString(raw, ["timeLimit"])',
    'bookingCodeAirline: pickString(raw, ["bookingCodeAirline"])',
    "export type DharmawisataFlightHoldDiagnostics",
    "safeForInternalLog: true",
    'sameTransactionToken: options.accessTokenSource === "schedule_lookup"',
    "summary.journeyDepartReference = safeText(body.journeyDepartReference",
    "departureClassFare: safeText(step.departureClassFare",
    "diagnostic: buildPreBookingStepDiagnostic",
    "diagnostics: preBookingDiagnostics",
    'summarizePreBookingRequest("Airline/Booking", payload)',
]) {
  assertIncludes(bookingSource, anchor, "Dharmawisata same-token transaction contract")
}

for (const anchor of [
  "function summarizeDharmawisataHoldDiagnostics",
  "function dharmawisataDiagnosticMetadata",
  "diagnosticFailedStep",
  "diagnosticJourneyDepartReference",
  "diagnosticDepartureClassFare",
  "dharmawisataDiagnostics: summary",
  "...dharmawisataDiagnosticMetadata(bookingApiResult.diagnostics)",
]) {
  assertIncludes(flightBookingRouteSource, anchor, "Dharmawisata hold diagnostics event metadata contract")
}

for (const anchor of [
  "function dharmawisataDiagnosticHighlights",
  "diagnosticJourneyDepartReference",
  "diagnosticDepartureClassFare",
  "Dharmawisata diagnostics",
]) {
  assertIncludes(adminBookingPageSource, anchor, "Dharmawisata hold diagnostics admin highlight contract")
}

for (const anchor of [
  'path: getPath("DHARMAWISATA_H2H_AIRLINE_CITY_PATH", "/Airline/City")',
  'path: getPath("DHARMAWISATA_H2H_AIRLINE_LIST_PATH", "/Airline/List")',
  'path: getPath("DHARMAWISATA_H2H_AIRLINE_ROUTE_PATH", "/Airline/Route")',
  "airlineID: airline.code,",
  "userID: credentials.userId,",
  "accessToken,",
]) {
  assertIncludes(routeCacheSource, anchor, "Dharmawisata airline reference endpoint contract")
}

for (const anchor of [
  'defaultPath: "/Airline/List"',
  'defaultPath: "/Airline/Route"',
    'defaultPath: "/Airline/Nationality"',
    'defaultPath: "/Airline/City"',
    'defaultPath: "/Airline/Booking"',
    'defaultPath: "/Airline/BookingList"',
    'defaultPath: "/Airline/BookingDetail"',
    'defaultPath: "/Airline/Issued"',
    'envName: "DHARMAWISATA_H2H_AIRLINE_NATIONALITY_PATH"',
    'envName: "DHARMAWISATA_H2H_BOOKING_LIST_PATH"',
    'envName: "DHARMAWISATA_H2H_BOOKING_DETAIL_PATH"',
    'envName: "DHARMAWISATA_H2H_ISSUE_PATH"',
]) {
  assertIncludes(airlineApiSource, anchor, "Dharmawisata airline API descriptor contract")
}

for (const anchor of [
  'getDharmawisataConfiguredPath("DHARMAWISATA_H2H_ISSUE_PATH")',
  'officialPath: "/Airline/Issued"',
  "userID: credentials.userId",
  "accessToken,",
  "airlineID: input.airlineId || undefined",
  "origin: input.originAirportCode || undefined",
  "destination: input.destinationAirportCode || undefined",
  "tripType: normalizeDharmawisataTripType(input.tripType)",
  "departDate: input.departureAt || undefined",
  "returnDate: input.returnAt || undefined",
  "bookingCode: externalBookingCode",
  "bookingDate: input.bookingDate || undefined",
  "airlineAccessCode: input.airlineAccessCode || input.fareReferenceId || input.supplierOrderId || undefined",
  "path: issuePath",
  'method: "POST"',
]) {
  assertIncludes(ticketIssueSource, anchor, "Dharmawisata issued payload contract")
}

for (const anchor of [
  "if (isAirAsiaFlight(input))",
  "autoHold: false",
  "manualReviewRequired: true",
  "AirAsia dikecualikan dari flow hold normal Dharmawisata",
]) {
  assertIncludes(policySource, anchor, "Dharmawisata AirAsia no-hold contract")
}

for (const anchor of [
  "Production uses normal valid SSL.",
  "UAT may temporarily use ignored SSL verification",
  "Login request is sent as `application/json`.",
  "The same `accessToken` from step 1 must be used through the transaction.",
  "`Airline/ScheduleAllAirline`",
  "`Airline/PriceAllAirline`",
  "`Airline/PriceAllAirline.journeyDepartReference` uses the `journeyReference`",
  "`Airline/PriceAllAirline` must use the all-airline price payload",
  "Do not send `schDeparts` or `schReturns` to this endpoint.",
  "`Airline/Price` is the single-airline price payload",
  "first request must start with an empty `airlineAccessCode`",
  "`Airline/Schedule` and `Airline/ScheduleAllAirline` send `departDate` and `returnDate` as `yyyy-MM-dd`",
  "`Airline/Price`, `Airline/PriceAllAirline`, and `Airline/Booking` keep the documented date-time format.",
  "That `classFare` must be used as `schDepart`/`schReturn`",
    "`Airline/List`, `Airline/City`, and `Airline/Nationality` are reference endpoints.",
    "`Airline/Route` is a per-airline route reference endpoint.",
    "`Airline/Booking` is the mutating hold endpoint.",
    "`Airline/Booking` returns supplier identifiers",
    "Dharmawisata fare fields in the Booking response",
    "`Airline/BookingDetail` is the direct follow-up",
    "`Airline/BookingList` is a reconciliation/list endpoint",
    "`Airline/Issued` is the ticket issue endpoint",
    "`airlineID`, `origin`, `destination`, `tripType`, `departDate`, `returnDate`, `bookingCode`, `bookingDate`, `airlineAccessCode`, `userID`, and the same `accessToken`.",
    "RedFeng calls `Airline/Issued` only after payment is verified",
    "The official issue endpoint is `Airline/Issued`; configure it with `DHARMAWISATA_H2H_ISSUE_PATH=/Airline/Issued`.",
    "Domestic Indonesian passenger payloads currently default `nationality` and `birthCountry` to `ID`.",
    "Diagnostics must redact credentials and PII",
    "`journeyDepartReference`, and returned `classFare`.",
  "AirAsia/QZ has a special flow and cannot use normal HOLD booking.",
  "For normal airlines, agent balance is cut at issued time",
]) {
  assertIncludes(referenceSource, anchor, "Dharmawisata reference doc")
}

console.log("dharmawisata-flight-h2h-contract: ok")
