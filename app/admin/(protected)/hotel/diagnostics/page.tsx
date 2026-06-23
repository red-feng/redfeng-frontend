import Link from "next/link"
import type { ReactNode } from "react"
import AdminProductWorkspace from "@/app/components/AdminProductWorkspace"
import { createAdminClient } from "@/lib/supabase/admin"
import {
  checkHotelSchemaReadiness,
  previewHotelBookingPayload,
  saveHotelCityMappingFromDiagnostics,
  saveHotelSupplierRateFromDiagnostics,
  testHotelAvailableRooms,
  testHotelAvailableRoomsThenPricePolicy,
  testHotelCitySearch,
  testHotelLogin,
  testHotelPricePolicy,
  testHotelSearch,
} from "./actions"

type SearchParams = Promise<{
  panel?: string
  status?: string
  result?: string
  request_id?: string
  hotel_id?: string
  country_id?: string
  city_id?: string
  checkin_date?: string
  checkout_date?: string
  pax_passport?: string
  room_count?: string
  child_count?: string
  destination_label?: string
  hotel_name_filter?: string
  internal_code?: string
  room_id?: string
  breakfast_id?: string
}>

type ResultRecord = Record<string, unknown>

type CitySearchLogRow = {
  id: string
  country_id: string
  city_name_filter: string
  status: string | null
  resp_message: string | null
  city_count: number
  created_at: string
}

type HotelCityMappingRow = {
  id: string
  destination_key: string
  destination_label: string
  country_id: string
  city_id: string
  country_name: string | null
  city_name: string | null
  is_active: boolean
}

type HotelAvailabilityRequestHint = {
  id: string
  hotel_id: string | null
  hotel_name: string | null
  hotel_location: string | null
  checkin_date: string | null
  checkout_date: string | null
  room_count: number | null
  child_count: number | null
  quote_payload: unknown
}

type HotelCoreDefaults = {
  requestId?: string
  hotelId?: string
  countryId?: string
  cityId?: string
  checkinDate?: string
  checkoutDate?: string
  paxPassport?: string
  roomCount?: string
  childCount?: string
  destinationLabel?: string
  hotelNameFilter?: string
}

type HotelRateDefaults = {
  internalCode?: string
  roomId?: string
  breakfastId?: string
}

type HotelOption = {
  value: string
  label: string
}

type HotelCoreDatalistIds = {
  hotelId: string
  countryId: string
  cityId: string
}

type HotelRateDatalistIds = {
  internalCode: string
  roomId: string
  breakfastId: string
}

type HotelCoreOptionGroups = {
  hotelOptions: HotelOption[]
  countryOptions: HotelOption[]
  cityOptions: HotelOption[]
}

type HotelRateOptionGroups = {
  internalCodeOptions: HotelOption[]
  roomOptions: HotelOption[]
  breakfastOptions: HotelOption[]
}

function getDefaultDate(offsetDays: number) {
  const date = new Date()
  date.setDate(date.getDate() + offsetDays)
  return date.toISOString().slice(0, 10)
}

function parseResult(value?: string): ResultRecord | null {
  if (!value) return null
  try {
    const parsed = JSON.parse(value)
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : { value: parsed }
  } catch {
    return { error: "Result tidak bisa dibaca sebagai JSON.", raw: value }
  }
}

function asText(value: unknown) {
  if (typeof value === "string") return value
  if (typeof value === "number" || typeof value === "boolean") return String(value)
  return ""
}

function cleanHotelIdentifier(value: unknown) {
  const raw = asText(value)
  return raw.split("~|~")[0]?.trim() || raw
}

function asRecord(value: unknown): ResultRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as ResultRecord) : {}
}

function normalizeInputDate(value: unknown) {
  const raw = asText(value)
  if (!raw) return ""
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10)

  const parsed = new Date(raw)
  return Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString().slice(0, 10)
}

function getRoomRequestItems(value: unknown) {
  return Array.isArray(value) ? value.map(asRecord) : []
}

function getRoomCountFromPayload(value: unknown) {
  const rooms = getRoomRequestItems(value)
  return rooms.length > 0 ? String(rooms.length) : ""
}

function getChildCountFromPayload(value: unknown) {
  const room = getRoomRequestItems(value)[0]
  return room ? asText(room.childNum) : ""
}

function addUniqueOption(options: HotelOption[], seen: Set<string>, value: string, label: string) {
  const normalized = value.trim()
  if (!normalized || seen.has(normalized)) return
  seen.add(normalized)
  options.push({ value: normalized, label })
}

function buildHotelCoreOptions(input: {
  mappings: HotelCityMappingRow[]
  defaults: HotelCoreDefaults
  requestPayload: ResultRecord
  result: ResultRecord | null
  activeRequest: HotelAvailabilityRequestHint | null
}) {
  const hotelOptions: HotelOption[] = []
  const countryOptions: HotelOption[] = []
  const cityOptions: HotelOption[] = []
  const seenHotels = new Set<string>()
  const seenCountries = new Set<string>()
  const seenCities = new Set<string>()
  const quotePayload = asRecord(input.activeRequest?.quote_payload)

  addUniqueOption(hotelOptions, seenHotels, input.defaults.hotelId || "", "Hotel ID dari form aktif")
  addUniqueOption(hotelOptions, seenHotels, asText(input.requestPayload.hotelID), "Hotel ID dari hasil test")
  addUniqueOption(hotelOptions, seenHotels, asText(quotePayload.supplier_hotel_id), "Hotel ID supplier dari request")
  getHotelSearchCandidates(input.result).forEach((candidate) => {
    addUniqueOption(hotelOptions, seenHotels, candidate.supplierHotelId, candidate.hotelName || "Hotel/Search5")
  })

  addUniqueOption(countryOptions, seenCountries, input.defaults.countryId || "", "Country dari form aktif")
  addUniqueOption(countryOptions, seenCountries, asText(input.requestPayload.countryID), "Country dari hasil test")
  addUniqueOption(countryOptions, seenCountries, asText(quotePayload.supplier_country_id), "Country supplier dari request")
  getCityCandidates(input.result).forEach((candidate) => {
    addUniqueOption(countryOptions, seenCountries, candidate.countryId, `${candidate.countryId} dari City5`)
  })

  addUniqueOption(cityOptions, seenCities, input.defaults.cityId || "", "City dari form aktif")
  addUniqueOption(cityOptions, seenCities, asText(input.requestPayload.cityID), "City dari hasil test")
  addUniqueOption(cityOptions, seenCities, asText(quotePayload.supplier_city_id), "City supplier dari request")
  getCityCandidates(input.result).forEach((candidate) => {
    addUniqueOption(cityOptions, seenCities, candidate.id, `${candidate.name} (${candidate.countryId}/${candidate.id})`)
  })

  input.mappings.forEach((mapping) => {
    addUniqueOption(
      countryOptions,
      seenCountries,
      mapping.country_id,
      `${mapping.country_id}${mapping.country_name ? ` - ${mapping.country_name}` : ""}`,
    )
    addUniqueOption(
      cityOptions,
      seenCities,
      mapping.city_id,
      `${mapping.destination_label || mapping.city_name || mapping.city_id} (${mapping.country_id}/${mapping.city_id})`,
    )
  })

  return { hotelOptions, countryOptions, cityOptions }
}

function buildHotelRateOptions(input: {
  defaults: HotelRateDefaults
  result: ResultRecord | null
  activeRequest: HotelAvailabilityRequestHint | null
}) {
  const internalCodeOptions: HotelOption[] = []
  const roomOptions: HotelOption[] = []
  const breakfastOptions: HotelOption[] = []
  const seenInternalCodes = new Set<string>()
  const seenRooms = new Set<string>()
  const seenBreakfasts = new Set<string>()
  const quotePayload = asRecord(input.activeRequest?.quote_payload)
  const rateCandidates = getHotelRateCandidates(input.result)

  addUniqueOption(internalCodeOptions, seenInternalCodes, input.defaults.internalCode || "", "Internal code dari form aktif")
  addUniqueOption(internalCodeOptions, seenInternalCodes, asText(quotePayload.supplier_internal_code), "Internal code supplier dari request")
  addUniqueOption(roomOptions, seenRooms, input.defaults.roomId || "", "Room ID dari form aktif")
  addUniqueOption(roomOptions, seenRooms, asText(quotePayload.supplier_room_id), "Room ID supplier dari request")
  addUniqueOption(breakfastOptions, seenBreakfasts, input.defaults.breakfastId || "", "Breakfast ID dari form aktif")
  addUniqueOption(breakfastOptions, seenBreakfasts, asText(quotePayload.supplier_breakfast_id), "Breakfast ID supplier dari request")

  rateCandidates.forEach((candidate) => {
    const label = [candidate.roomName, candidate.rateName].filter(Boolean).join(" - ") || "Kandidat AvailableRooms"
    addUniqueOption(internalCodeOptions, seenInternalCodes, candidate.internalCode, label)
    addUniqueOption(roomOptions, seenRooms, candidate.roomId, label)
    addUniqueOption(breakfastOptions, seenBreakfasts, candidate.breakfastId, label)
  })

  return { internalCodeOptions, roomOptions, breakfastOptions }
}

function formatDateTime(value: string) {
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return "-"
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(parsed)
}

function getCityCandidates(result: ResultRecord | null) {
  const cities = Array.isArray(result?.cities) ? result.cities : []
  return cities
    .map((city) => {
      const row = asRecord(city)
      const name = asText(row.Name) || asText(row.name)
      const id = asText(row.ID) || asText(row.id)
      const countryId = asText(row.CountryID) || asText(row.countryID) || asText(row.countryId) || asText(result?.countryID)
      return {
        name,
        id,
        countryId,
      }
    })
    .filter((city) => city.name && city.id && city.countryId)
}

function getHotelSearchCandidates(result: ResultRecord | null) {
  const candidates = Array.isArray(result?.hotelCandidates) ? result.hotelCandidates : []
  return candidates
    .map((candidate) => {
      const row = asRecord(candidate)
      return {
        supplierHotelId: cleanHotelIdentifier(row.supplierHotelId),
        supplierInternalCode: asText(row.supplierInternalCode),
        hotelName: asText(row.hotelName),
        address: asText(row.address),
        rating: asText(row.rating),
        priceStart: typeof row.priceStart === "number" ? row.priceStart : Number(asText(row.priceStart)) || null,
        availabilityStatus: asText(row.availabilityStatus),
        message: asText(row.message),
      }
    })
    .filter((candidate) => candidate.supplierHotelId || candidate.hotelName)
}

function getHotelRateCandidates(result: ResultRecord | null) {
  const candidates = Array.isArray(result?.rateCandidates) ? result.rateCandidates : []
  return candidates
    .map((candidate) => {
      const row = asRecord(candidate)
      return {
        internalCode: asText(row.internalCode),
        roomId: asText(row.roomId),
        breakfastId: asText(row.breakfastId),
        roomName: asText(row.roomName),
        rateName: asText(row.rateName),
        totalPrice: asText(row.totalPrice),
        currency: asText(row.currency) || "IDR",
        cancellationPolicy: asText(row.cancellationPolicy),
      }
    })
    .filter((candidate) => candidate.internalCode || candidate.roomId || candidate.breakfastId)
}

function getStatusClasses(status?: string) {
  if (status === "success") return "border-emerald-200 bg-emerald-50 text-emerald-800"
  if (status === "warning") return "border-amber-200 bg-amber-50 text-amber-800"
  if (status === "error") return "border-rose-200 bg-rose-50 text-rose-800"
  return "border-slate-200 bg-slate-50 text-slate-700"
}

function summarizeResult(result: ResultRecord | null) {
  if (!result) return []
  return [
    ["Status", asText(result.status) || "-"],
    ["Message", asText(result.respMessage) || asText(result.error) || "-"],
    ["Elapsed", result.elapsedMs ? `${result.elapsedMs} ms` : "-"],
    ["Rooms", typeof result.roomCount === "number" ? `${result.roomCount}` : "-"],
    ["Cities", typeof result.cityCount === "number" ? `${result.cityCount}` : "-"],
    ["Enable booking", typeof result.isEnableBooking === "boolean" ? String(result.isEnableBooking) : "-"],
    ["Missing columns", typeof result.missingColumnCount === "number" ? `${result.missingColumnCount}` : "-"],
  ]
}

function Field({
  label,
  name,
  defaultValue,
  type = "text",
  placeholder,
  listId,
}: {
  label: string
  name: string
  defaultValue?: string | number
  type?: string
  placeholder?: string
  listId?: string
}) {
  return (
    <label className="block text-sm font-semibold text-slate-700">
      {label}
      <input
        type={type}
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        list={listId}
        className="mt-2 h-11 w-full rounded-[10px] border border-[#e8d8ca] bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
      />
    </label>
  )
}

function SelectField({
  label,
  name,
  defaultValue,
  options,
}: {
  label: string
  name: string
  defaultValue?: string
  options: Array<[string, string]>
}) {
  return (
    <label className="block text-sm font-semibold text-slate-700">
      {label}
      <select
        name={name}
        defaultValue={defaultValue}
        className="mt-2 h-11 w-full rounded-[10px] border border-[#e8d8ca] bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
      >
        {options.map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
    </label>
  )
}

function TestCard({
  eyebrow,
  title,
  description,
  tone = "white",
  children,
}: {
  eyebrow: string
  title: string
  description: string
  tone?: "white" | "amber"
  children: ReactNode
}) {
  const classes =
    tone === "amber"
      ? "border-amber-200 bg-amber-50"
      : "border-[#eee3d9] bg-white shadow-[0_14px_34px_rgba(15,23,42,0.04)]"

  return (
    <section className={`rounded-[18px] border p-5 ${classes}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className={`text-[10px] font-semibold uppercase tracking-[0.24em] ${tone === "amber" ? "text-amber-700" : "text-orange-500"}`}>
            {eyebrow}
          </p>
          <h2 className={`mt-2 text-base font-semibold ${tone === "amber" ? "text-amber-950" : "text-slate-950"}`}>{title}</h2>
          <p className={`mt-2 max-w-2xl text-sm leading-6 ${tone === "amber" ? "text-amber-800" : "text-slate-500"}`}>{description}</p>
        </div>
      </div>
      <div className="mt-5">{children}</div>
    </section>
  )
}

function HiddenCoreInputs({ defaults }: { defaults: HotelCoreDefaults }) {
  return (
    <>
      <input type="hidden" name="request_id" value={defaults.requestId || ""} />
      <input type="hidden" name="hotel_id" value={defaults.hotelId || ""} />
      <input type="hidden" name="country_id" value={defaults.countryId || ""} />
      <input type="hidden" name="city_id" value={defaults.cityId || ""} />
      <input type="hidden" name="checkin_date" value={defaults.checkinDate || getDefaultDate(7)} />
      <input type="hidden" name="checkout_date" value={defaults.checkoutDate || getDefaultDate(8)} />
      <input type="hidden" name="pax_passport" value={defaults.paxPassport || "ID"} />
      <input type="hidden" name="room_count" value={defaults.roomCount || "1"} />
      <input type="hidden" name="child_count" value={defaults.childCount || "0"} />
      <input type="hidden" name="hotel_name_filter" value={defaults.hotelNameFilter || defaults.destinationLabel || ""} />
    </>
  )
}

function HiddenRateInputs({ defaults }: { defaults: HotelRateDefaults }) {
  return (
    <>
      <input type="hidden" name="internal_code" value={defaults.internalCode || ""} />
      <input type="hidden" name="room_id" value={defaults.roomId || ""} />
      <input type="hidden" name="breakfast_id" value={defaults.breakfastId || ""} />
    </>
  )
}

function HiddenGuestInputs() {
  return (
    <>
      <input type="hidden" name="guest_title" value="MR" />
      <input type="hidden" name="guest_first_name" value="Red" />
      <input type="hidden" name="guest_last_name" value="Feng" />
      <input type="hidden" name="guest_phone" value="081234567890" />
      <input type="hidden" name="guest_email" value="ops@redfeng.co" />
      <input type="hidden" name="request_description" value="Red Feng hotel diagnostics" />
    </>
  )
}

function AutoTestPanel({
  coreDefaults,
  rateDefaults,
}: {
  coreDefaults: HotelCoreDefaults
  rateDefaults: HotelRateDefaults
}) {
  const hasCity = Boolean(coreDefaults.countryId && coreDefaults.cityId)
  const hasHotel = Boolean(coreDefaults.hotelId)
  const hasRate = Boolean(rateDefaults.internalCode && rateDefaults.roomId && rateDefaults.breakfastId)

  return (
    <section className="rounded-[18px] border border-orange-100 bg-orange-50/70 p-5 shadow-[0_14px_34px_rgba(15,23,42,0.04)]">
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-orange-600">Simple mode</p>
          <h2 className="mt-2 text-base font-semibold text-slate-950">Tes hotel otomatis</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Gunakan tombol ini untuk mengirim nilai terbaik yang sudah tersimpan dari mapping, Search5, AvailableRooms, atau request customer.
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-5">
        <form action={testHotelSearch}>
          <HiddenCoreInputs defaults={coreDefaults} />
          <button type="submit" disabled={!hasCity} className="h-full w-full rounded-[12px] bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300">
            Cari Hotel ID
          </button>
        </form>
        <form action={testHotelAvailableRooms}>
          <HiddenCoreInputs defaults={coreDefaults} />
          <button type="submit" disabled={!hasCity || !hasHotel} className="h-full w-full rounded-[12px] bg-orange-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:bg-slate-300">
            Cek AvailableRooms
          </button>
        </form>
        <form action={testHotelAvailableRoomsThenPricePolicy}>
          <HiddenCoreInputs defaults={coreDefaults} />
          <button type="submit" disabled={!hasCity || !hasHotel} className="h-full w-full rounded-[12px] bg-orange-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:bg-slate-300">
            Auto PricePolicy
          </button>
        </form>
        <form action={testHotelPricePolicy}>
          <HiddenCoreInputs defaults={coreDefaults} />
          <HiddenRateInputs defaults={rateDefaults} />
          <button type="submit" disabled={!hasCity || !hasHotel || !hasRate} className="h-full w-full rounded-[12px] bg-orange-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:bg-slate-300">
            Cek PricePolicy
          </button>
        </form>
        <form action={previewHotelBookingPayload}>
          <HiddenCoreInputs defaults={coreDefaults} />
          <HiddenRateInputs defaults={rateDefaults} />
          <HiddenGuestInputs />
          <button type="submit" className="h-full w-full rounded-[12px] border border-amber-300 bg-amber-100 px-4 py-3 text-sm font-semibold text-amber-900 transition hover:bg-amber-200">
            Preview Booking
          </button>
        </form>
      </div>

      <div className="mt-4 grid gap-2 text-xs leading-5 text-slate-600 md:grid-cols-3">
        <p className={hasCity ? "text-emerald-700" : "text-amber-700"}>City: {hasCity ? `${coreDefaults.countryId}/${coreDefaults.cityId}` : "belum ada mapping"}</p>
        <p className={hasHotel ? "text-emerald-700" : "text-amber-700"}>Hotel ID: {hasHotel ? coreDefaults.hotelId : "belum dari Search5"}</p>
        <p className={hasRate ? "text-emerald-700" : "text-amber-700"}>Rate: {hasRate ? "internal/room/breakfast siap" : "belum dari AvailableRooms"}</p>
      </div>
    </section>
  )
}

function ResultRecoveryActions({
  result,
  coreDefaults,
}: {
  result: ResultRecord | null
  coreDefaults: HotelCoreDefaults
}) {
  const message = `${asText(result?.respMessage)} ${asText(result?.error)}`.toLowerCase()
  const isSearchExpired = message.includes("expired")

  if (!isSearchExpired) return null

  return (
    <div className="mt-4 rounded-[14px] border border-amber-200 bg-amber-50 p-4 text-amber-900">
      <p className="text-sm font-semibold">Rate/search sudah expired</p>
      <p className="mt-1 text-xs leading-5 text-amber-800">
        Jalankan ulang AvailableRooms5, lalu pilih lagi kandidat rate yang baru sebelum menekan PricePolicy.
      </p>
      <form action={testHotelAvailableRoomsThenPricePolicy} className="mt-3">
        <HiddenCoreInputs defaults={coreDefaults} />
        <button type="submit" className="rounded-[12px] bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-700">
          Ulang otomatis
        </button>
      </form>
    </div>
  )
}

function HotelCoreDatalists({ ids, options }: { ids: HotelCoreDatalistIds; options: HotelCoreOptionGroups }) {
  return (
    <>
      <datalist id={ids.hotelId}>
        {options.hotelOptions.map((option) => (
          <option key={`${option.value}-${option.label}`} value={option.value}>
            {option.label}
          </option>
        ))}
      </datalist>
      <datalist id={ids.countryId}>
        {options.countryOptions.map((option) => (
          <option key={`${option.value}-${option.label}`} value={option.value}>
            {option.label}
          </option>
        ))}
      </datalist>
      <datalist id={ids.cityId}>
        {options.cityOptions.map((option) => (
          <option key={`${option.value}-${option.label}`} value={option.value}>
            {option.label}
          </option>
        ))}
      </datalist>
    </>
  )
}

function HotelCoreFields({
  defaults = {},
  datalistIds,
}: {
  defaults?: HotelCoreDefaults
  datalistIds?: HotelCoreDatalistIds
}) {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Hotel ID" name="hotel_id" defaultValue={defaults.hotelId} placeholder="Pilih atau ketik Hotel ID" listId={datalistIds?.hotelId} />
        <Field label="Country ID" name="country_id" defaultValue={defaults.countryId} placeholder="Pilih atau ketik Country ID" listId={datalistIds?.countryId} />
        <Field label="City ID" name="city_id" defaultValue={defaults.cityId} placeholder="Pilih atau ketik City ID" listId={datalistIds?.cityId} />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Check-in" name="checkin_date" type="date" defaultValue={defaults.checkinDate || getDefaultDate(7)} />
        <Field label="Check-out" name="checkout_date" type="date" defaultValue={defaults.checkoutDate || getDefaultDate(8)} />
        <SelectField
          label="Pax passport"
          name="pax_passport"
          defaultValue={defaults.paxPassport || "ID"}
          options={[
            ["ID", "ID"],
          ]}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Jumlah kamar" name="room_count" type="number" defaultValue={defaults.roomCount || 1} />
        <Field label="Jumlah anak" name="child_count" type="number" defaultValue={defaults.childCount || 0} />
      </div>
    </>
  )
}

function HotelSearchFields({
  defaults = {},
  datalistIds,
}: {
  defaults?: HotelCoreDefaults
  datalistIds?: HotelCoreDatalistIds
}) {
  return (
    <>
      <Field label="Nama hotel/kota" name="hotel_name_filter" defaultValue={defaults.hotelNameFilter || defaults.destinationLabel || ""} placeholder="Jakarta atau nama hotel" />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Country ID" name="country_id" defaultValue={defaults.countryId} placeholder="Pilih atau ketik Country ID" listId={datalistIds?.countryId} />
        <Field label="City ID" name="city_id" defaultValue={defaults.cityId} placeholder="Pilih atau ketik City ID" listId={datalistIds?.cityId} />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Check-in" name="checkin_date" type="date" defaultValue={defaults.checkinDate || getDefaultDate(7)} />
        <Field label="Check-out" name="checkout_date" type="date" defaultValue={defaults.checkoutDate || getDefaultDate(8)} />
        <SelectField label="Pax passport" name="pax_passport" defaultValue={defaults.paxPassport || "ID"} options={[["ID", "ID"]]} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Jumlah kamar" name="room_count" type="number" defaultValue={defaults.roomCount || 1} />
        <Field label="Jumlah anak" name="child_count" type="number" defaultValue={defaults.childCount || 0} />
      </div>
    </>
  )
}

function HotelRateDatalists({ ids, options }: { ids: HotelRateDatalistIds; options: HotelRateOptionGroups }) {
  return (
    <>
      <datalist id={ids.internalCode}>
        {options.internalCodeOptions.map((option) => (
          <option key={`${option.value}-${option.label}`} value={option.value}>
            {option.label}
          </option>
        ))}
      </datalist>
      <datalist id={ids.roomId}>
        {options.roomOptions.map((option) => (
          <option key={`${option.value}-${option.label}`} value={option.value}>
            {option.label}
          </option>
        ))}
      </datalist>
      <datalist id={ids.breakfastId}>
        {options.breakfastOptions.map((option) => (
          <option key={`${option.value}-${option.label}`} value={option.value}>
            {option.label}
          </option>
        ))}
      </datalist>
    </>
  )
}

function HotelRateFields({
  defaults = {},
  datalistIds,
}: {
  defaults?: HotelRateDefaults
  datalistIds?: HotelRateDatalistIds
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <Field label="Internal code" name="internal_code" defaultValue={defaults.internalCode} placeholder="Pilih atau ketik internal code" listId={datalistIds?.internalCode} />
      <Field label="Room ID" name="room_id" defaultValue={defaults.roomId} placeholder="Pilih atau ketik Room ID" listId={datalistIds?.roomId} />
      <Field label="Breakfast ID" name="breakfast_id" defaultValue={defaults.breakfastId} placeholder="Pilih atau ketik Breakfast ID" listId={datalistIds?.breakfastId} />
    </div>
  )
}

function GuestFields() {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-3">
        <SelectField
          label="Guest title"
          name="guest_title"
          defaultValue="MR"
          options={[
            ["MR", "MR"],
            ["MRS", "MRS"],
            ["MS", "MS"],
            ["MISS", "MISS"],
          ]}
        />
        <Field label="Guest first name" name="guest_first_name" defaultValue="Red" />
        <Field label="Guest last name" name="guest_last_name" defaultValue="Feng" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Guest phone" name="guest_phone" defaultValue="081234567890" />
        <Field label="Guest email" name="guest_email" type="email" defaultValue="ops@redfeng.co" />
      </div>
      <Field label="Request description" name="request_description" defaultValue="Red Feng hotel diagnostics" />
    </>
  )
}

function CityMappingCandidates({ result }: { result: ResultRecord | null }) {
  const candidates = getCityCandidates(result)
  if (candidates.length === 0) return null

  const requestedKeyword = asText(result?.cityNameFilter)

  return (
    <section className="rounded-[18px] border border-[#eee3d9] bg-white p-5 shadow-[0_14px_34px_rgba(15,23,42,0.04)]">
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-950">Kandidat City Mapping</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Pilih salah satu hasil City5 untuk disimpan sebagai mapping katalog hotel.
          </p>
        </div>
        <Link href="/admin/hotel/city-mapping" className="rounded-[10px] border border-orange-200 bg-orange-50 px-3 py-2 text-xs font-semibold text-orange-700 transition hover:bg-orange-100">
          Lihat mapping
        </Link>
      </div>
      <div className="mt-4 space-y-3">
        {candidates.slice(0, 8).map((city) => (
          <form key={`${city.countryId}-${city.id}-${city.name}`} action={saveHotelCityMappingFromDiagnostics} className="rounded-[14px] border border-slate-200 bg-slate-50 p-3">
            <input type="hidden" name="destination_label" value={requestedKeyword || city.name} />
            <input type="hidden" name="destination_key" value={requestedKeyword || city.name} />
            <input type="hidden" name="country_id" value={city.countryId} />
            <input type="hidden" name="city_id" value={city.id} />
            <input type="hidden" name="country_name" value={city.countryId} />
            <input type="hidden" name="city_name" value={city.name} />
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-950">{city.name}</p>
                <p className="mt-1 text-xs text-slate-500">Country ID {city.countryId} | City ID {city.id}</p>
              </div>
              <button type="submit" className="rounded-[12px] bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-700">
                Simpan mapping
              </button>
            </div>
          </form>
        ))}
      </div>
    </section>
  )
}

function HotelSearchCandidates({ result, defaults }: { result: ResultRecord | null; defaults: HotelCoreDefaults }) {
  const candidates = getHotelSearchCandidates(result)
  if (candidates.length === 0) return null

  const requestPayload = asRecord(result?.request)
  const countryId = defaults.countryId || asText(requestPayload.countryID)
  const cityId = defaults.cityId || asText(requestPayload.cityID)
  const checkinDate = defaults.checkinDate || normalizeInputDate(requestPayload.checkInDate) || getDefaultDate(7)
  const checkoutDate = defaults.checkoutDate || normalizeInputDate(requestPayload.checkOutDate) || getDefaultDate(8)
  const paxPassport = defaults.paxPassport || asText(requestPayload.paxPassport) || "ID"
  const roomCount = defaults.roomCount || getRoomCountFromPayload(requestPayload.roomRequest) || "1"
  const childCount = defaults.childCount || getChildCountFromPayload(requestPayload.roomRequest) || "0"

  return (
    <section className="rounded-[18px] border border-[#eee3d9] bg-white p-5 shadow-[0_14px_34px_rgba(15,23,42,0.04)]">
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-950">Kandidat Hotel/Search5</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Pilih Hotel ID supplier dari hasil Search5, lalu lanjutkan ke AvailableRooms.
          </p>
        </div>
      </div>
      <div className="mt-4 space-y-3">
        {candidates.slice(0, 8).map((candidate, index) => {
          const params = new URLSearchParams({
            panel: "available",
            hotel_id: candidate.supplierHotelId,
            country_id: countryId,
            city_id: cityId,
            checkin_date: checkinDate,
            checkout_date: checkoutDate,
            pax_passport: paxPassport,
            room_count: roomCount,
            child_count: childCount,
          })
          if (defaults.requestId) params.set("request_id", defaults.requestId)

          return (
            <div key={`${candidate.supplierHotelId}-${index}`} className="rounded-[14px] border border-slate-200 bg-slate-50 p-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-950">{candidate.hotelName || `Hotel ${candidate.supplierHotelId}`}</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Hotel ID {candidate.supplierHotelId || "-"} | Internal {candidate.supplierInternalCode || "-"}
                  </p>
                  {candidate.address ? <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">{candidate.address}</p> : null}
                  {candidate.priceStart ? (
                    <p className="mt-1 text-xs font-semibold text-orange-700">Mulai IDR {candidate.priceStart.toLocaleString("id-ID")}</p>
                  ) : null}
                </div>
                <Link href={`/admin/hotel/diagnostics?${params.toString()}`} className="rounded-[12px] bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-700">
                  Pakai di AvailableRooms
                </Link>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

function SupplierRateCandidates({ result, requestId }: { result: ResultRecord | null; requestId: string }) {
  const candidates = getHotelRateCandidates(result)
  if (candidates.length === 0) return null

  const requestPayload = asRecord(result?.request)
  const supplierHotelId = asText(requestPayload.hotelID)
  const supplierCountryId = asText(requestPayload.countryID)
  const supplierCityId = asText(requestPayload.cityID)

  return (
    <section className="rounded-[18px] border border-[#eee3d9] bg-white p-5 shadow-[0_14px_34px_rgba(15,23,42,0.04)]">
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-950">Kandidat Rate AvailableRooms</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Simpan salah satu kandidat ke request customer agar field supplier di admin hotel terisi otomatis.
          </p>
        </div>
        <Link href="/admin/hotel" className="rounded-[10px] border border-orange-200 bg-orange-50 px-3 py-2 text-xs font-semibold text-orange-700 transition hover:bg-orange-100">
          Queue hotel
        </Link>
      </div>
      <div className="mt-4 space-y-3">
        {candidates.map((candidate, index) => {
          const canSave = Boolean(requestId && supplierHotelId && supplierCountryId && supplierCityId && candidate.internalCode && candidate.roomId && candidate.breakfastId)
          const pricePolicyParams = new URLSearchParams({
            panel: "price-policy",
            hotel_id: cleanHotelIdentifier(supplierHotelId),
            country_id: supplierCountryId,
            city_id: supplierCityId,
            checkin_date: normalizeInputDate(requestPayload.checkInDate) || getDefaultDate(7),
            checkout_date: normalizeInputDate(requestPayload.checkOutDate) || getDefaultDate(8),
            pax_passport: asText(requestPayload.paxPassport) || "ID",
            room_count: getRoomCountFromPayload(requestPayload.roomRequest) || "1",
            child_count: getChildCountFromPayload(requestPayload.roomRequest) || "0",
            internal_code: candidate.internalCode,
            room_id: candidate.roomId,
            breakfast_id: candidate.breakfastId,
          })
          if (requestId) pricePolicyParams.set("request_id", requestId)

          return (
            <form key={`${candidate.internalCode}-${candidate.roomId}-${candidate.breakfastId}-${index}`} action={saveHotelSupplierRateFromDiagnostics} className="rounded-[14px] border border-slate-200 bg-slate-50 p-3">
              <input type="hidden" name="request_id" value={requestId} />
              <input type="hidden" name="supplier_hotel_id" value={supplierHotelId} />
              <input type="hidden" name="supplier_country_id" value={supplierCountryId} />
              <input type="hidden" name="supplier_city_id" value={supplierCityId} />
              <input type="hidden" name="supplier_internal_code" value={candidate.internalCode} />
              <input type="hidden" name="supplier_room_id" value={candidate.roomId} />
              <input type="hidden" name="supplier_breakfast_id" value={candidate.breakfastId} />
              <input type="hidden" name="quoted_total_amount" value={candidate.totalPrice} />
              <input type="hidden" name="room_name" value={candidate.roomName} />
              <input type="hidden" name="rate_name" value={candidate.rateName} />
              <input type="hidden" name="cancellation_policy" value={candidate.cancellationPolicy} />
              <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-950">{candidate.roomName || candidate.rateName || `Rate ${index + 1}`}</p>
                  <p className="mt-1 break-all text-xs leading-5 text-slate-500">
                    Internal {candidate.internalCode || "-"} | Room {candidate.roomId || "-"} | Breakfast {candidate.breakfastId || "-"}
                  </p>
                  {candidate.totalPrice ? (
                    <p className="mt-1 text-xs font-semibold text-orange-700">
                      {candidate.currency} {Number(candidate.totalPrice).toLocaleString("id-ID")}
                    </p>
                  ) : null}
                </div>
                <div className="flex shrink-0 flex-col gap-2">
                  <Link href={`/admin/hotel/diagnostics?${pricePolicyParams.toString()}`} className="rounded-[12px] bg-slate-950 px-4 py-2.5 text-center text-sm font-semibold text-white transition hover:bg-slate-800">
                    Pakai di PricePolicy
                  </Link>
                  <button
                    type="submit"
                    disabled={!canSave}
                    className="rounded-[12px] bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    {requestId ? "Simpan ke request" : "Butuh request"}
                  </button>
                </div>
              </div>
            </form>
          )
        })}
      </div>
    </section>
  )
}

function CitySearchHistory({ logs }: { logs: CitySearchLogRow[] }) {
  return (
    <section className="rounded-[18px] border border-[#eee3d9] bg-white p-5 shadow-[0_14px_34px_rgba(15,23,42,0.04)]">
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-950">Riwayat pencarian City5</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Menyimpan pencarian kota terakhir agar admin bisa mengulang atau membandingkan kandidat cityID.
          </p>
        </div>
        <Link href="/admin/hotel/city-mapping" className="rounded-[10px] border border-orange-200 bg-orange-50 px-3 py-2 text-xs font-semibold text-orange-700 transition hover:bg-orange-100">
          City mapping
        </Link>
      </div>

      {logs.length === 0 ? (
        <div className="mt-4 rounded-[14px] border border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500">
          Belum ada riwayat pencarian City5, atau migration log belum dijalankan.
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {logs.map((log) => (
            <div key={log.id} className="rounded-[14px] border border-slate-200 bg-slate-50 p-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-950">{log.city_name_filter}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Country {log.country_id} | {log.city_count} kandidat | {formatDateTime(log.created_at)}
                  </p>
                  {log.resp_message ? <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-500">{log.resp_message}</p> : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link
                    href={`/admin/hotel/diagnostics?panel=city&status=warning&result=${encodeURIComponent(JSON.stringify({
                      title: "Riwayat pencarian City5",
                      status: log.status || "",
                      respMessage: log.resp_message || "Gunakan keyword ini untuk pencarian ulang.",
                      cityNameFilter: log.city_name_filter,
                      countryID: log.country_id,
                      cityCount: log.city_count,
                    }))}`}
                    className="rounded-[10px] border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                  >
                    Lihat ringkas
                  </Link>
                  <form action={testHotelCitySearch}>
                    <input type="hidden" name="country_id" value={log.country_id} />
                    <input type="hidden" name="city_name_filter" value={log.city_name_filter} />
                    <button type="submit" className="rounded-[10px] bg-orange-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-orange-700">
                      Cari ulang
                    </button>
                  </form>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

export default async function AdminHotelDiagnosticsPage({ searchParams }: { searchParams?: SearchParams }) {
  const params = (await searchParams) || {}
  const activePanel = params.panel || "schema"
  const result = parseResult(params.result)
  const resultTitle = asText(result?.title) || "Belum ada hasil test"
  const resultRows = summarizeResult(result)
  const requestPayload = asRecord(result?.request)
  const requestId = params.request_id || asText(result?.requestId)
  const adminSupabase = createAdminClient()
  const [{ data: citySearchLogs }, { data: cityMappings }, { data: activeRequest }] = await Promise.all([
    adminSupabase
      .from("dharmawisata_hotel_city_search_logs")
      .select("id, country_id, city_name_filter, status, resp_message, city_count, created_at")
      .order("created_at", { ascending: false })
      .limit(8),
    adminSupabase
      .from("dharmawisata_hotel_city_mappings")
      .select("id, destination_key, destination_label, country_id, city_id, country_name, city_name, is_active")
      .eq("is_active", true)
      .order("destination_label", { ascending: true }),
    requestId
      ? adminSupabase
          .from("hotel_availability_requests")
          .select("id, hotel_id, hotel_name, hotel_location, checkin_date, checkout_date, room_count, child_count, quote_payload")
          .eq("id", requestId)
          .maybeSingle<HotelAvailabilityRequestHint>()
      : Promise.resolve({ data: null }),
  ])
  const activeRequestHint = (activeRequest || null) as HotelAvailabilityRequestHint | null
  const activeQuotePayload = asRecord(activeRequestHint?.quote_payload)
  const cityLogs = (citySearchLogs || []) as CitySearchLogRow[]
  const activeCityMappings = (cityMappings || []) as HotelCityMappingRow[]
  const cityCandidate = getCityCandidates(result)[0]
  const resolvedCountryId = params.country_id || asText(requestPayload.countryID) || asText(activeQuotePayload.supplier_country_id) || cityCandidate?.countryId || ""
  const resolvedCityId = params.city_id || asText(requestPayload.cityID) || asText(activeQuotePayload.supplier_city_id) || cityCandidate?.id || ""
  const matchedCityMapping = activeCityMappings.find((mapping) => mapping.country_id === resolvedCountryId && mapping.city_id === resolvedCityId)
  const resolvedDestinationLabel = params.destination_label || cityCandidate?.name || matchedCityMapping?.destination_label || activeRequestHint?.hotel_location || ""
  const coreDefaults: HotelCoreDefaults = {
    requestId,
    hotelId:
      cleanHotelIdentifier(params.hotel_id) ||
      cleanHotelIdentifier(requestPayload.hotelID) ||
      cleanHotelIdentifier(activeQuotePayload.supplier_hotel_id) ||
      "",
    countryId: resolvedCountryId,
    cityId: resolvedCityId,
    checkinDate: params.checkin_date || normalizeInputDate(requestPayload.checkInDate) || activeRequestHint?.checkin_date || "",
    checkoutDate: params.checkout_date || normalizeInputDate(requestPayload.checkOutDate) || activeRequestHint?.checkout_date || "",
    paxPassport: params.pax_passport || asText(requestPayload.paxPassport) || "ID",
    roomCount:
      params.room_count ||
      getRoomCountFromPayload(requestPayload.roomRequest) ||
      (activeRequestHint?.room_count ? String(activeRequestHint.room_count) : ""),
    childCount:
      params.child_count ||
      getChildCountFromPayload(requestPayload.roomRequest) ||
      (typeof activeRequestHint?.child_count === "number" ? String(activeRequestHint.child_count) : ""),
    destinationLabel: resolvedDestinationLabel,
    hotelNameFilter: params.hotel_name_filter || asText(requestPayload.hotelNameFilter) || resolvedDestinationLabel || activeRequestHint?.hotel_name || "",
  }
  const firstRateCandidate = getHotelRateCandidates(result).find((candidate) => candidate.internalCode && candidate.roomId && candidate.breakfastId)
  const rateDefaults: HotelRateDefaults = {
    internalCode: params.internal_code || asText(requestPayload.internalCode) || asText(activeQuotePayload.supplier_internal_code) || firstRateCandidate?.internalCode,
    roomId: params.room_id || asText(requestPayload.roomID) || asText(activeQuotePayload.supplier_room_id) || firstRateCandidate?.roomId,
    breakfastId: params.breakfast_id || asText(requestPayload.breakfast) || asText(activeQuotePayload.supplier_breakfast_id) || firstRateCandidate?.breakfastId,
  }
  const hasCityPrefill = Boolean(coreDefaults.countryId && coreDefaults.cityId)
  const datalistIds: HotelCoreDatalistIds = {
    hotelId: "hotel-diagnostics-hotel-id",
    countryId: "hotel-diagnostics-country-id",
    cityId: "hotel-diagnostics-city-id",
  }
  const rateDatalistIds: HotelRateDatalistIds = {
    internalCode: "hotel-diagnostics-internal-code",
    roomId: "hotel-diagnostics-room-id",
    breakfastId: "hotel-diagnostics-breakfast-id",
  }
  const coreOptions = buildHotelCoreOptions({
    mappings: activeCityMappings,
    defaults: coreDefaults,
    requestPayload,
    result,
    activeRequest: activeRequestHint,
  })
  const rateOptions = buildHotelRateOptions({
    defaults: rateDefaults,
    result,
    activeRequest: activeRequestHint,
  })

  return (
    <AdminProductWorkspace
      productType="hotel"
      productLabel="Hotel Diagnostics"
      description="Panel test untuk alur hotel Dharmawisata: schema, login, city ID, AvailableRooms, PriceAndPolicy, dan preview payload booking sebelum payment customer."
      statusLabel="Hotel test console"
      statusNote="Gunakan halaman ini setelah migration Supabase, update environment variable Vercel, atau saat mengecek readiness supplier hotel."
      primaryActionHref="/admin/hotel"
      primaryActionLabel="Kembali ke dashboard Hotel"
      secondaryActionHref="/hotel/catalog"
      secondaryActionLabel="Buka katalog Hotel"
      preparedModules={["Schema readiness", "Login token", "City ID search", "Hotel Search5", "Available rooms", "Price policy", "Booking payload", "Voucher readiness"]}
    >
      <HotelCoreDatalists ids={datalistIds} options={coreOptions} />
      <HotelRateDatalists ids={rateDatalistIds} options={rateOptions} />
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_480px]">
        <div className="space-y-5">
          <TestCard
            eyebrow="Schema"
            title="Audit Schema Hotel"
            description="Memastikan kolom request, booking detail, supplier order, dan voucher hotel sudah tersedia di database aktif."
          >
            <form id="hotel-diagnostics-schema" action={checkHotelSchemaReadiness} className="scroll-mt-6">
              <button type="submit" className="rounded-[12px] bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800">
                Cek schema hotel
              </button>
            </form>
          </TestCard>

          <TestCard
            eyebrow="Step 1"
            title="Test Login Token"
            description="Memastikan base URL, user ID, password, security code, dan TLS UAT/production bisa menghasilkan access token."
          >
            <form id="hotel-diagnostics-login" action={testHotelLogin} className="scroll-mt-6">
              <button type="submit" className="rounded-[12px] bg-orange-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-orange-700">
                Test login Dharmawisata
              </button>
            </form>
          </TestCard>

          <AutoTestPanel coreDefaults={coreDefaults} rateDefaults={rateDefaults} />

          <TestCard
            eyebrow="City"
            title="Cari City ID Dharmawisata"
            description="Cari kandidat cityID dari endpoint Hotel/City5. Hasilnya dipakai untuk mengisi Hotel City Mapping agar katalog live lebih stabil."
          >
            <form id="hotel-diagnostics-city" action={testHotelCitySearch} className="scroll-mt-6 space-y-4">
              <div className="grid gap-4 sm:grid-cols-[180px_minmax(0,1fr)]">
                <Field label="Country ID" name="country_id" defaultValue={coreDefaults.countryId || "ID"} placeholder="Pilih atau ketik Country ID" listId={datalistIds.countryId} />
                <Field label="Nama kota" name="city_name_filter" defaultValue="Jakarta" placeholder="Jakarta, Bali, Surabaya" />
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <button type="submit" className="rounded-[12px] bg-orange-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-orange-700">
                  Cari City ID
                </button>
                <Link href="/admin/hotel/city-mapping" className="rounded-[12px] border border-orange-200 bg-orange-50 px-4 py-3 text-sm font-semibold text-orange-700 transition hover:bg-orange-100">
                  Buka city mapping
                </Link>
              </div>
            </form>
          </TestCard>

          <TestCard
            eyebrow="Step 2"
            title="Test Hotel/Search5"
            description="Cari Hotel ID supplier berdasarkan countryID, cityID, tanggal stay, dan komposisi kamar. Hasilnya dipakai untuk AvailableRooms."
          >
            <form id="hotel-diagnostics-search" action={testHotelSearch} className="scroll-mt-6 space-y-4">
              <input type="hidden" name="request_id" value={coreDefaults.requestId || ""} />
              <HotelSearchFields defaults={coreDefaults} datalistIds={datalistIds} />
              <button type="submit" className="rounded-[12px] bg-orange-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-orange-700">
                Test Hotel/Search5
              </button>
            </form>
          </TestCard>

          <TestCard
            eyebrow="Step 3"
            title="Test AvailableRooms"
            description="Cek kamar tersedia berdasarkan Hotel ID, tanggal stay, jumlah kamar, dan komposisi anak. Test ini read-only."
          >
            <form id="hotel-diagnostics-available" action={testHotelAvailableRooms} className="scroll-mt-6 space-y-4">
              <input type="hidden" name="request_id" value={coreDefaults.requestId || ""} />
              {hasCityPrefill ? (
                <div className="rounded-[14px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-800">
                  Mapping kota aktif terisi: {coreDefaults.destinationLabel ? `${coreDefaults.destinationLabel} - ` : ""}
                  {coreDefaults.countryId}/{coreDefaults.cityId}. Lengkapi Hotel ID dari hasil Search5 atau direktori sebelum test.
                </div>
              ) : null}
              <HotelCoreFields defaults={coreDefaults} datalistIds={datalistIds} />
              <button type="submit" className="rounded-[12px] bg-orange-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-orange-700">
                Test available rooms
              </button>
            </form>
          </TestCard>

          <TestCard
            eyebrow="Step 4"
            title="Test PriceAndPolicy"
            description="Validasi harga final, komisi, cancellation policy, dan flag isEnableBooking sebelum quote dikirim ke customer."
          >
            <form id="hotel-diagnostics-price-policy" action={testHotelPricePolicy} className="scroll-mt-6 space-y-4">
              <HotelCoreFields defaults={coreDefaults} datalistIds={datalistIds} />
              <HotelRateFields defaults={rateDefaults} datalistIds={rateDatalistIds} />
              <button type="submit" className="rounded-[12px] bg-orange-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-orange-700">
                Test price and policy
              </button>
            </form>
          </TestCard>

          <TestCard
            eyebrow="Dry-run"
            title="Preview Payload BookingAllSupplier"
            description="Merakit payload BookingAllSupplier tanpa mengirim request booking. Untuk hotel, endpoint ini adalah konfirmasi berbayar ke supplier dan hanya dijalankan setelah payment Midtrans sukses."
            tone="amber"
          >
            <form id="hotel-diagnostics-booking-preview" action={previewHotelBookingPayload} className="scroll-mt-6 space-y-4">
              <HotelCoreFields defaults={coreDefaults} datalistIds={datalistIds} />
              <HotelRateFields defaults={rateDefaults} datalistIds={rateDatalistIds} />
              <GuestFields />
              <button type="submit" className="rounded-[12px] bg-amber-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-amber-800">
                Preview payload booking
              </button>
            </form>
          </TestCard>
        </div>

        <aside className="space-y-5 xl:sticky xl:top-6 xl:self-start">
          <section className={`rounded-[18px] border p-5 shadow-[0_14px_34px_rgba(15,23,42,0.04)] ${getStatusClasses(params.status)}`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.24em]">Hasil Test</p>
                <h2 className="mt-2 text-base font-semibold">{resultTitle}</h2>
              </div>
              <span className="rounded-[10px] border border-current px-3 py-1 text-xs font-semibold">
                {activePanel.toUpperCase()} {params.status ? `- ${params.status.toUpperCase()}` : ""}
              </span>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
              {resultRows.length > 0 ? (
                resultRows.map(([label, value]) => (
                  <div key={label} className="rounded-[12px] border border-current/20 bg-white/65 p-4">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] opacity-70">{label}</p>
                    <p className="mt-2 break-words text-sm font-semibold">{value}</p>
                  </div>
                ))
              ) : (
                <div className="rounded-[12px] border border-current/20 bg-white/65 p-4 text-sm">Jalankan salah satu test untuk melihat ringkasan.</div>
              )}
            </div>
            <ResultRecoveryActions result={result} coreDefaults={coreDefaults} />
          </section>

          <section className="rounded-[18px] border border-[#eee3d9] bg-white p-5 shadow-[0_14px_34px_rgba(15,23,42,0.04)]">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-base font-semibold text-slate-950">Response JSON</h2>
              <Link href="/admin/hotel/diagnostics" className="rounded-[10px] border border-[#ecd9c2] bg-[#fff7ef] px-3 py-2 text-xs font-semibold text-orange-600 transition hover:bg-orange-50">
                Bersihkan
              </Link>
            </div>
            <pre className="mt-4 max-h-[520px] overflow-auto rounded-[14px] border border-slate-200 bg-slate-950 p-4 text-xs leading-6 text-slate-100">
              {JSON.stringify(result || { note: "Belum ada hasil. Jalankan schema, login, available rooms, price policy, atau preview payload." }, null, 2)}
            </pre>
          </section>

          <CityMappingCandidates result={result} />
          <HotelSearchCandidates result={result} defaults={coreDefaults} />
          <SupplierRateCandidates result={result} requestId={coreDefaults.requestId || ""} />
          <CitySearchHistory logs={cityLogs} />

          <section className="rounded-[18px] border border-[#eee3d9] bg-white p-5 shadow-[0_14px_34px_rgba(15,23,42,0.04)]">
            <h2 className="text-base font-semibold text-slate-950">Checklist Hotel</h2>
            <div className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
              <p>AvailableRooms5 sukses berarti hotel, tanggal, dan room request terbaca supplier.</p>
              <p>PriceAndPolicy sukses dan `isEnableBooking=true` berarti quote boleh dikirim ke customer.</p>
              <p>BookingAllSupplier adalah aksi final berbayar ke supplier dan hanya dijalankan setelah customer paid di Midtrans.</p>
              <p>Jika response gagal karena kode room/rate kosong, tempel ulang `internalCode`, `roomID`, dan `breakfast` dari response supplier.</p>
            </div>
          </section>
        </aside>
      </div>
    </AdminProductWorkspace>
  )
}
