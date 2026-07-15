import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

const clientSource = readFileSync(resolve("lib/dharmawisata/client.ts"), "utf8")
const scheduleSource = readFileSync(resolve("lib/flights/dharmawisataFlightScheduleLookup.ts"), "utf8")
const bookingSource = readFileSync(resolve("lib/flights/dharmawisataFlightBooking.ts"), "utf8")
const policySource = readFileSync(resolve("lib/flights/automationPolicy.ts"), "utf8")
const referenceSource = readFileSync(resolve("docs/dharmawisata-flight-h2h-reference.md"), "utf8")

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

for (const anchor of [
  'return asString(payload.searchKey || payload.SearchKey)',
  'return pickString(raw, ["detailSchedule", "journeyReference", "scheduleReference", "schDepart"])',
  "scheduleAccessToken: scheduleAccessToken || null",
  "source,",
  'const scheduleMatch = mapDharmawisataSchedulePayloadForBooking(payload, input, accessToken, "Airline/Schedule")',
  'const match = mapDharmawisataSchedulePayloadForBooking(payload, input, accessToken, "Airline/ScheduleAllAirline")',
  'let airlineAccessCode = ""',
  "body: buildScheduleAllAirlineRequestBody(input, credentials.userId, accessToken, airlineAccessCode)",
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
  'input.scheduleSource === "Airline/ScheduleAllAirline"',
  'departureClassFare: pickPriceClassFare(raw, ["priceDepart", "PriceDepart"], expectedFlightClass)',
  "resolvedInput = replaceScheduleDetail(",
  "preBookingFlow.departureClassFare || null",
  'error: "airline_schedule_or_schedule_all_airline_step_required"',
  "searchKey: baggageStep.searchKey || resolvedInput.searchKey ||",
  "airlineAccessCode: baggageStep.airlineAccessCode || resolvedInput.airlineAccessCode ||",
  "searchKey: seatStep.searchKey || resolvedInput.searchKey || null",
  "airlineAccessCode: seatStep.airlineAccessCode || resolvedInput.airlineAccessCode || null",
]) {
  assertIncludes(bookingSource, anchor, "Dharmawisata same-token transaction contract")
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
  "The same `accessToken` from step 1 must be used through the transaction.",
  "`Airline/ScheduleAllAirline`",
  "`Airline/PriceAllAirline`",
  "`Airline/PriceAllAirline.journeyDepartReference` uses the `journeyReference`",
  "first request must start with an empty `airlineAccessCode`",
  "That `classFare` must be used as `schDepart`/`schReturn`",
  "AirAsia/QZ has a special flow and cannot use normal HOLD booking.",
  "For normal airlines, agent balance is cut at issued time",
]) {
  assertIncludes(referenceSource, anchor, "Dharmawisata reference doc")
}

console.log("dharmawisata-flight-h2h-contract: ok")
