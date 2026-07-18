# Dharmawisata Flight H2H Reference

This note captures the working agreement from the RedFeng and Dharmawisata H2H WhatsApp discussion.

## Transport

- Production uses normal valid SSL. Do not disable SSL verification in production.
- UAT may temporarily use ignored SSL verification when Dharmawisata's UAT certificate chain is incomplete. Configure this only with `DHARMAWISATA_H2H_TLS_REJECT_UNAUTHORIZED=false`.
- Client certificate or mTLS is not required for the normal H2H flight flow unless Dharmawisata later provides certificate material. Authentication is handled by login token from the API.

## Login

- `Session/Login` is called with `POST /Session/Login`.
- Login request body is `application/json` with `token`, `securityCode`, `language`, and `userID`.
- `token` uses timestamp format `yyyy-MM-dd'T'HH:mm:ss`.
- `securityCode` is `md5(token + md5(password))`.
- Session Login and Logout requests are sent as `application/json`.
- Login response should expose `accessToken`, `respTime`, `userID`, `status`, and `respMessage`.
- The `accessToken` returned by Login must be reused for one flight transaction flow until Booking.

## Logout

- `Session/Logout` is called with `POST /Session/Logout`.
- Logout request body is `application/json` and uses the same session payload shape as Login: `token`, `securityCode`, `language`, and `userID`.
- `Session/Logout` uses the same session payload shape as Login: `token`, `securityCode`, `language`, and `userID`.
- Logout response follows the same session response shape: `accessToken`, `respTime`, `userID`, `status`, and `respMessage`.

## Agent Balance

- `Agent/Balance` is called with `POST /Agent/Balance`.
- Balance request body is `application/json` with `userID` and the `accessToken` returned by Login.
- Balance response should expose `balance`, `respTime`, `userID`, `accessToken`, `status`, and `respMessage`.
- RedFeng redacts `accessToken` in stored/debug balance metadata.

## Airline Flow

The confirmed normal all-airline flight flow from Dharmawisata manual examples is:

1. `Session/Login`
2. `Airline/ScheduleAllAirline`
3. `Airline/PriceAllAirline`
4. `Airline/BaggageAndMeal`
5. `Airline/Seat`
6. `Airline/Booking`

`Airline/Schedule` and `Airline/Price` remain supported for the single-airline flow when Dharmawisata returns that schedule context.

The same `accessToken` from step 1 must be used through the transaction. `Airline/PriceAllAirline.journeyDepartReference` uses the `journeyReference` from `ScheduleAllAirline.journeyDepart`; for round trip, `journeyReturnReference` uses `journeyReference` from `journeyReturn`.

`Airline/Schedule` is called with `POST /Airline/Schedule`. Its request body is `application/json` with `airlineID`, `tripType`, `origin`, `destination`, `departDate`, `returnDate`, `paxAdult`, `paxChild`, `paxInfant`, `promoCode`, `searchKey`, `extraDay`, `airlineAccessCode`, `userID`, and the same `accessToken`.

`Airline/ScheduleAllAirline` is called with `POST /Airline/ScheduleAllAirline`. Its request body is `application/json` with `tripType`, `origin`, `destination`, `departDate`, `returnDate`, `paxAdult`, `paxChild`, `paxInfant`, `promoCode`, `airlineAccessCode`, `cacheType`, `isShowEachAirline`, `userID`, and the same `accessToken`.

`Airline/ScheduleAllAirline` responses may include `journeyDepart`, `journeyReturn`, `airlineAccessCode`, `totalAirline`, and `airlineIndex`. RedFeng keeps looping with the returned `airlineAccessCode` until the selected schedule is found or the airline index is exhausted.

`Airline/PriceAllAirline` is called with `POST /Airline/PriceAllAirline`. It must use the all-airline price payload: `airlineID`, `origin`, `destination`, `tripType`, `departDate`, `returnDate`, `paxAdult`, `paxChild`, `paxInfant`, `airlineAccessCode`, `journeyDepartReference`, `journeyReturnReference`, `userID`, and the same `accessToken`. Do not send `schDeparts` or `schReturns` to this endpoint.

`Airline/PriceAllAirline` responses may include `airlineAccessCode`, `searchKey`, `promoCode`, `priceDepart`, `priceReturn`, `sumFare`, `respTime`, `userID`, `accessToken`, `status`, and `respMessage`. RedFeng uses `priceDepart`/`priceReturn.classFare` for the next add-on, seat, and booking payloads.

`Airline/Price` is called with `POST /Airline/Price`. It is the single-airline price payload and must use `airlineID`, `origin`, `destination`, `tripType`, `departDate`, `returnDate`, `paxAdult`, `paxChild`, `paxInfant`, `searchKey`, `promoCode`, `schDeparts`, `schReturns`, `userID`, and the same `accessToken` from the selected `Airline/Schedule` context. Do not use the `journeyDepartReference` payload shape for this endpoint.

`Airline/Price` responses may include `priceDepart`, `priceReturn`, `sumFare`, `respTime`, `userID`, `accessToken`, `status`, and `respMessage`. RedFeng uses `priceDepart`/`priceReturn.classFare` for the next add-on, seat, and booking payloads, and keeps only redacted diagnostics.

`ScheduleAllAirline` should be attempted before the single-airline `Schedule` fallback for booking hold, and its first request must start with an empty `airlineAccessCode`. Follow-up ScheduleAllAirline iterations may use the `airlineAccessCode` returned by Dharmawisata.

`Airline/Schedule` and `Airline/ScheduleAllAirline` send `departDate` and `returnDate` as `yyyy-MM-dd` date-only strings, matching the Redoc request examples. Later reservation steps such as `Airline/Price`, `Airline/PriceAllAirline`, and `Airline/Booking` keep the documented date-time format.

After `PriceAllAirline` succeeds, Dharmawisata returns `classFare` in `priceDepart` or `priceReturn`. That `classFare` must be used as `schDepart`/`schReturn` for `BaggageAndMeal` and `Seat`, and as `schDeparts[].detailSchedule`/`schReturns[].detailSchedule` for `Booking`.
`BaggageAndMeal` and `Seat` should also carry the schedule response segment/fare metadata: `departureAirlineSegmentCode` from the schedule airline segment code and `departureFareBasisCode` from schedule `classID`/fare basis when available.

`Airline/BaggageAndMeal` is called with `POST /Airline/BaggageAndMeal`. Its request body is `application/json` with `airlineID`, `origin`, `destination`, `tripType`, `departDate`, `returnDate`, `schDepart`, `schReturn`, `paxAdult`, `paxChild`, `paxInfant`, `departureAirlineSegmentCode`, `departureFareBasisCode`, `returnAirlineSegmentCode`, `returnFareBasisCode`, passenger contact fields, `paxDetails`, `insurance`, `userID`, and the same `accessToken`.

`Airline/BaggageAndMeal` responses may include `addOns`, `respTime`, `userID`, `accessToken`, `status`, and `respMessage`. RedFeng stores only redacted diagnostics for this step, including add-on count and non-PII request summary.

`Airline/Seat` is called with `POST /Airline/Seat`. Its request body is `application/json` with `airlineID`, `origin`, `destination`, `tripType`, `departDate`, `returnDate`, `schDepart`, `schReturn`, `paxAdult`, `paxChild`, `paxInfant`, `departureAirlineSegmentCode`, `departureFareBasisCode`, `returnAirlineSegmentCode`, `returnFareBasisCode`, passenger contact fields, `paxDetails`, `insurance`, `userID`, and the same `accessToken`.

`Airline/Seat` responses may include `seatAddOns`, `respTime`, `userID`, `accessToken`, `status`, and `respMessage`. RedFeng stores only redacted diagnostics for this step, including seat add-on count and non-PII request summary.

`Airline/LowFareSchedule` may feed the public catalog, but auto-hold must only continue after an official `Airline/ScheduleAllAirline` or `Airline/Schedule` context succeeds on the same transaction token. If only LowFareSchedule succeeds, stop before Price and keep the booking in admin recheck.

## Hold Diagnostics

- RedFeng stores safe internal diagnostics for Dharmawisata flight hold attempts in `supplier_order_events.metadata`.
- Diagnostics must redact credentials and PII: do not log raw `accessToken`, password, `securityCode`, `userID`, customer contact fields, or passenger details.
- Diagnostics should highlight the schedule source, access token source, same-transaction token status, Price endpoint status/message, `journeyDepartReference`, and returned `classFare`.

## Airline Reference Endpoints

- `Airline/List` is called with `POST /Airline/List`. Its request body is `application/json` with `userID` and `accessToken`; response may include `airlines`, `respTime`, `userID`, `accessToken`, `status`, and `respMessage`.
- `Airline/Route` is called with `POST /Airline/Route`. Its request body is `application/json` with `airlineID`, `userID`, and `accessToken`; response may include `routes`, `respTime`, `userID`, `accessToken`, `status`, and `respMessage`.
- `Airline/Nationality` is called with `POST /Airline/Nationality`. Its request body is `application/json` with `userID` and `accessToken`; response may include `countries`, `respTime`, `userID`, `accessToken`, `status`, and `respMessage`.
- `Airline/City` is called with `POST /Airline/City`. Its request body is `application/json` with `userID` and `accessToken`; response may include `cities`, `respTime`, `userID`, `accessToken`, `status`, and `respMessage`.
- RedFeng stores City/List/Route into local master-data/cache tables for airport and route lookup. Nationality is kept as a reference source for passenger nationality support.
- All reference endpoint diagnostics redact `accessToken`.
- These reference endpoints support master data and route cache sync. They are not a replacement for the transaction flow: `ScheduleAllAirline` or `Schedule`, then `PriceAllAirline` or `Price`, then add-ons, seat, and booking.
- `Airline/Booking` is the mutating hold endpoint. It must receive the same search context: `schDeparts`, `schReturns`, passenger contact fields, `paxDetails`, `searchKey`, `airlineAccessCode`, `userID`, and the same `accessToken`.
- `Airline/Booking` returns supplier identifiers such as `bookingCode`, `bookingDate`, `referenceNo`, `bookingCodeAirline`, and `timeLimit`, plus fare and flight snapshots. RedFeng stores the raw supplier response and maps those identifiers for hold/PNR tracking.
- Dharmawisata fare fields in the Booking response, such as `ticketPrice`, `salesPrice`, and `adminFee`, are supplier audit data for RedFeng. Internal customer pricing and finance fields still come from RedFeng checkout pricing: supplier cost, spread, included tax, and customer admin fee.
- `Airline/BookingDetail` is the direct follow-up for a successful Booking response. Send `bookingCode`, `bookingDate`, optional `referenceNo`, `userID`, and the same `accessToken`.
- `Airline/BookingList` is a reconciliation/list endpoint with `filterByStatus`, `startDate`, `endDate`, `userID`, and `accessToken`. It is not required before Booking or BookingDetail in the checkout hold flow.
- `Airline/Issued` is the ticket issue endpoint for normal held bookings after payment is verified. Its request body must include `airlineID`, `origin`, `destination`, `tripType`, `departDate`, `returnDate`, `bookingCode`, `bookingDate`, `airlineAccessCode`, `userID`, and the same `accessToken`.
- RedFeng calls `Airline/Issued` only after payment is verified, using supplier booking identifiers from `Airline/Booking` or `Airline/BookingDetail` when available. If hold identifiers are missing, keep the booking in ops review instead of issuing.
- Domestic Indonesian passenger payloads currently default `nationality` and `birthCountry` to `ID`. Use `Airline/Nationality` as the reference source before supporting non-Indonesia or international passenger nationality choices.

## AirAsia Exception

- AirAsia/QZ has a special flow and cannot use normal HOLD booking.
- RedFeng must keep AirAsia in manual review or a dedicated issued flow until the special `BookingIssued` path is implemented safely.

## Deposit Timing

- For normal airlines, agent balance is cut at issued time, not when `Airline/Booking` only creates hold/PNR.
- The official issue endpoint is `Airline/Issued`; configure it with `DHARMAWISATA_H2H_ISSUE_PATH=/Airline/Issued`.
- AirAsia is the exception noted by Dharmawisata.
- Hold/payment limit depends on airline. A hold that is not continued to issued does not cut balance in the normal airline flow.

## Seat Map

- If Dharmawisata returns a seat response, RedFeng may display the seat map.
- Seat availability depends on airline and route.
