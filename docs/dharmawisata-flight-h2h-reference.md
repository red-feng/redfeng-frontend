# Dharmawisata Flight H2H Reference

This note captures the working agreement from the RedFeng and Dharmawisata H2H WhatsApp discussion.

## Transport

- Production uses normal valid SSL. Do not disable SSL verification in production.
- UAT may temporarily use ignored SSL verification when Dharmawisata's UAT certificate chain is incomplete. Configure this only with `DHARMAWISATA_H2H_TLS_REJECT_UNAUTHORIZED=false`.
- Client certificate or mTLS is not required for the normal H2H flight flow unless Dharmawisata later provides certificate material. Authentication is handled by login token from the API.

## Login

- Login request uses `token` as timestamp.
- `securityCode` is `md5(token + md5(password))`.
- The `accessToken` returned by Login must be reused for one flight transaction flow until Booking.

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

`Airline/PriceAllAirline` must use the all-airline price payload: `airlineAccessCode`, `journeyDepartReference`, and `journeyReturnReference`. Do not send `schDeparts` or `schReturns` to this endpoint.

`Airline/Price` is the single-airline price payload and must use `searchKey`, `promoCode`, `schDeparts`, and `schReturns` from the selected schedule context. Do not use the `journeyDepartReference` payload shape for this endpoint.

`ScheduleAllAirline` should be attempted before the single-airline `Schedule` fallback for booking hold, and its first request must start with an empty `airlineAccessCode`. Follow-up ScheduleAllAirline iterations may use the `airlineAccessCode` returned by Dharmawisata.

`Airline/Schedule` and `Airline/ScheduleAllAirline` send `departDate` and `returnDate` as `yyyy-MM-dd` date-only strings, matching the Redoc request examples. Later reservation steps such as `Airline/Price`, `Airline/PriceAllAirline`, and `Airline/Booking` keep the documented date-time format.

After `PriceAllAirline` succeeds, Dharmawisata returns `classFare` in `priceDepart` or `priceReturn`. That `classFare` must be used as `schDepart`/`schReturn` for `BaggageAndMeal` and `Seat`, and as `schDeparts[].detailSchedule`/`schReturns[].detailSchedule` for `Booking`.

`Airline/LowFareSchedule` may feed the public catalog, but auto-hold must only continue after an official `Airline/ScheduleAllAirline` or `Airline/Schedule` context succeeds on the same transaction token. If only LowFareSchedule succeeds, stop before Price and keep the booking in admin recheck.

## AirAsia Exception

- AirAsia/QZ has a special flow and cannot use normal HOLD booking.
- RedFeng must keep AirAsia in manual review or a dedicated issued flow until the special `BookingIssued` path is implemented safely.

## Deposit Timing

- For normal airlines, agent balance is cut at issued time, not when `Airline/Booking` only creates hold/PNR.
- AirAsia is the exception noted by Dharmawisata.
- Hold/payment limit depends on airline. A hold that is not continued to issued does not cut balance in the normal airline flow.

## Seat Map

- If Dharmawisata returns a seat response, RedFeng may display the seat map.
- Seat availability depends on airline and route.
