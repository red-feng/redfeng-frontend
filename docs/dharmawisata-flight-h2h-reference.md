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

The confirmed normal flight flow is:

1. `Session/Login`
2. `Airline/Schedule`
3. `Airline/Price`
4. `Airline/BaggageAndMeal`
5. `Airline/Seat`
6. `Airline/Booking`

The same `accessToken` from step 1 must be used through the transaction. The schedule/price context such as `searchKey`, `airlineAccessCode`, `detailSchedule`, and `flightClass` must be carried forward from supplier responses instead of being regenerated locally.

`Airline/LowFareSchedule` may feed the public catalog, but auto-hold must only continue to `Airline/Price` and `Airline/Booking` after `Airline/Schedule` succeeds on the same transaction token. If only LowFareSchedule succeeds, stop before Price and keep the booking in admin recheck.

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
