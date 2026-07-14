"use client"

import Image from "next/image"
import { useEffect, useMemo, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

export type FlightCheckoutData = {
  offerId: string
  title: string
  airline: string
  airlineCode: string
  flightNumber: string
  origin: string
  destination: string
  route: string
  departDate: string
  returnDate: string
  departureTime: string
  arrivalTime: string
  duration: string
  transit: string
  cabin: string
  tripType: string
  passengers: string
  price: number
  supplierPrice: number
  redfengMarkupAmount: number
  redfengTaxAmount: number
  fareReferenceId: string
  airlineAccessCode: string
  searchKey: string
  detailSchedule: string
  supplierFlightClass: string
  source: string
  customerAdminFeePercent: number
  customerTaxPercent: number
}

type IconName = "plane" | "seat" | "bag" | "shield" | "help" | "phone" | "edit" | "user" | "info"

type PassengerForm = {
  id: string
  title: string
  gender: string
  firstName: string
  lastName: string
  noLastName: boolean
  birthDate: string
  nationality: string
  identityType: string
  identityNumber: string
}

type SeatInfo = {
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

type SeatSegment = {
  origin: string
  destination: string
  departTime: string
  arrivalTime: string
  infos: SeatInfo[]
}

type SelectedSeat = {
  passengerId: string
  origin: string
  destination: string
  seat: string
  compartment: string
  seatPrice: number
  currency: string
}

type CheckoutDraft = {
  contactFirstName: string
  contactLastName: string
  email: string
  phone: string
  sendEticket: boolean
  passengers: PassengerForm[]
  selectedSeats?: Record<string, SelectedSeat>
}

function createPassengerForm(index: number): PassengerForm {
  return {
    id: `passenger-${index}`,
    title: "MR",
    gender: "M",
    firstName: "",
    lastName: "",
    noLastName: false,
    birthDate: "",
    nationality: "Indonesia",
    identityType: "KTP",
    identityNumber: "",
  }
}

function isPassengerForm(value: unknown): value is PassengerForm {
  if (!value || typeof value !== "object") return false
  const passenger = value as Partial<PassengerForm>
  return typeof passenger.id === "string"
}

function sanitizePassengerList(value: unknown, fallbackCount: number) {
  if (!Array.isArray(value)) {
    return Array.from({ length: fallbackCount }, (_, index) => createPassengerForm(index + 1))
  }

  const passengers = value.filter(isPassengerForm).map((passenger, index) => ({
    ...createPassengerForm(index + 1),
    ...passenger,
    id: passenger.id || `passenger-${index + 1}`,
  }))

  return passengers.length ? passengers : Array.from({ length: fallbackCount }, (_, index) => createPassengerForm(index + 1))
}

function formatIdr(value: number) {
  return `IDR ${Math.max(Number(value || 0), 0).toLocaleString("id-ID")}`
}

function formatPercent(value: number) {
  const normalized = Number.isFinite(value) ? value : 0
  return normalized.toLocaleString("id-ID", { maximumFractionDigits: 2 })
}

function getPassengerCount(value: string) {
  const matches = value.match(/\d+/g)
  if (!matches) return 1
  return matches.reduce((total, current) => total + Number(current || "0"), 0) || 1
}

function labelize(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function formatPassengerSummary(count: number) {
  return `${Math.max(count, 1)} Dewasa`
}

function formatReadableDate(value: string) {
  if (!value) return "-"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date)
}

function normalizePhone(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return ""
  if (trimmed.startsWith("+")) return trimmed.replace(/[^\d+]/g, "")
  const digits = trimmed.replace(/\D/g, "")
  return `+62${digits.replace(/^0+/, "")}`
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
}

function isValidPhone(value: string) {
  return normalizePhone(value).replace(/\D/g, "").length >= 10
}

function isValidIdentity(passenger: PassengerForm) {
  const digits = passenger.identityNumber.replace(/\D/g, "")
  if (!passenger.identityNumber.trim()) return false
  if (passenger.identityType.toLowerCase() === "ktp") return digits.length >= 16
  return passenger.identityNumber.trim().length >= 6
}

function todayDateInputValue() {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, "0")
  const day = String(today.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function isValidBirthDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const parsed = new Date(`${value}T00:00:00`)
  if (Number.isNaN(parsed.getTime())) return false
  const today = new Date(`${todayDateInputValue()}T00:00:00`)
  return parsed.getTime() <= today.getTime()
}

function calculateAgeFromBirthDate(value: string) {
  if (!isValidBirthDate(value)) return null
  const birthDate = new Date(`${value}T00:00:00`)
  const today = new Date(`${todayDateInputValue()}T00:00:00`)
  let age = today.getFullYear() - birthDate.getFullYear()
  const monthDiff = today.getMonth() - birthDate.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age -= 1
  }
  return age
}

function isAdultBirthDate(value: string) {
  const age = calculateAgeFromBirthDate(value)
  return age !== null && age >= 12
}

function inferGenderFromTitle(title: string) {
  const normalized = title.trim().toUpperCase()
  if (normalized === "MRS" || normalized === "MS" || normalized === "MISS") return "F"
  return "M"
}

function isPassengerComplete(passenger: PassengerForm) {
  return Boolean(
    passenger.firstName.trim() &&
      passenger.gender.trim() &&
      (passenger.noLastName || passenger.lastName.trim()) &&
      isAdultBirthDate(passenger.birthDate) &&
      passenger.nationality.trim() &&
      isValidIdentity(passenger),
  )
}

function Icon({ name, className = "h-5 w-5" }: { name: IconName; className?: string }) {
  if (name === "plane") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} aria-hidden="true">
        <path d="M10.5 13.5 3 21l-1-3 5-7-5-2 1-3 8 2 5.5-5.5a2 2 0 0 1 3 3L14 11l2 8-3 1-2-5-7 5-3-1 7.5-7.5" />
      </svg>
    )
  }

  if (name === "seat") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} aria-hidden="true">
        <path d="M7 3v9a4 4 0 0 0 4 4h6v5" />
        <path d="M5 21h14" />
        <path d="M7 12h9a3 3 0 0 1 3 3v1" />
      </svg>
    )
  }

  if (name === "bag") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} aria-hidden="true">
        <path d="M8 7V5a4 4 0 0 1 8 0v2" />
        <path d="M6 7h12l1 14H5L6 7Z" />
      </svg>
    )
  }

  if (name === "shield") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} aria-hidden="true">
        <path d="M12 3 5 6v5c0 5 3 8 7 10 4-2 7-5 7-10V6l-7-3Z" />
        <path d="m9 12 2 2 4-5" />
      </svg>
    )
  }

  if (name === "help") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} aria-hidden="true">
        <path d="M12 18h.01" />
        <path d="M9.5 9a2.7 2.7 0 1 1 4.5 2c-1.1.8-2 1.4-2 3" />
        <circle cx="12" cy="12" r="9" />
      </svg>
    )
  }

  if (name === "phone") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} aria-hidden="true">
        <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.2a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2Z" />
      </svg>
    )
  }

  if (name === "edit") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} aria-hidden="true">
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5Z" />
      </svg>
    )
  }

  if (name === "user") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} aria-hidden="true">
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21a8 8 0 0 1 16 0" />
      </svg>
    )
  }

  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 10v7" />
      <path d="M12 7h.01" />
    </svg>
  )
}

function Stepper() {
  const steps = ["Pilih Penerbangan", "Data Pemesan", "Pembayaran", "E-tiket"]

  return (
    <div className="border-b border-orange-100 bg-white">
      <div className="mx-auto flex max-w-7xl items-center gap-3 overflow-x-auto px-5 py-7 md:px-8">
        {steps.map((step, index) => {
          const number = index + 1
          const active = number === 2
          const done = number === 1

          return (
            <div key={step} className="flex min-w-fit flex-1 items-center gap-3">
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                  active || done ? "bg-[#ff4b00] text-white" : "bg-orange-100 text-white"
                }`}
              >
                {number}
              </span>
              <span className={`text-sm font-semibold ${active ? "text-[#ff4b00]" : "text-neutral-600"}`}>{step}</span>
              {number < steps.length ? <span className="h-px min-w-12 flex-1 bg-orange-200" /> : null}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <span className="mb-2 block text-xs font-semibold text-neutral-700">{children}</span>
}

function passengerDisplayName(passenger: PassengerForm, index: number) {
  const name = [passenger.firstName, passenger.lastName].filter(Boolean).join(" ").trim()
  return name || `Penumpang ${index + 1}`
}

function normalizeSeatSegments(value: unknown): SeatSegment[] {
  if (!Array.isArray(value)) return []

  return value
    .map((segment) => {
      if (!segment || typeof segment !== "object") return null
      const record = segment as Partial<SeatSegment>
      const infos = Array.isArray(record.infos) ? record.infos.filter((seat): seat is SeatInfo => Boolean(seat?.seatDesignator)) : []
      if (infos.length === 0) return null

      return {
        origin: String(record.origin || ""),
        destination: String(record.destination || ""),
        departTime: String(record.departTime || ""),
        arrivalTime: String(record.arrivalTime || ""),
        infos,
      }
    })
    .filter((segment): segment is SeatSegment => Boolean(segment))
}

function buildSeatRows(seats: SeatInfo[]) {
  const sorted = [...seats].sort((left, right) => left.y - right.y || left.x - right.x || left.seatDesignator.localeCompare(right.seatDesignator))
  const rows = new Map<number, SeatInfo[]>()

  sorted.forEach((seat) => {
    const rowKey = Number.isFinite(seat.y) ? seat.y : 0
    rows.set(rowKey, [...(rows.get(rowKey) || []), seat])
  })

  return Array.from(rows.entries()).map(([row, rowSeats]) => ({
    row,
    seats: rowSeats,
  }))
}

export default function FlightCheckoutClient({ data }: { data: FlightCheckoutData }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const supabase = useMemo(() => createClient(), [])
  const currentPath = `${pathname}?${searchParams.toString()}`
  const initialPassengerCount = getPassengerCount(data.passengers)
  const draftStorageKey = useMemo(
    () => `redfeng-flight-checkout:${data.offerId || data.fareReferenceId || data.title || currentPath}`,
    [currentPath, data.fareReferenceId, data.offerId, data.title],
  )

  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [checkingSession, setCheckingSession] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [submitted, setSubmitted] = useState(false)
  const [draftReady, setDraftReady] = useState(false)
  const [showFlightDetails, setShowFlightDetails] = useState(false)
  const [contactFirstName, setContactFirstName] = useState("")
  const [contactLastName, setContactLastName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [sendEticket, setSendEticket] = useState(true)
  const [passengers, setPassengers] = useState<PassengerForm[]>(() =>
    Array.from({ length: initialPassengerCount }, (_, index) => createPassengerForm(index + 1)),
  )
  const [openPassengerId, setOpenPassengerId] = useState(() => `passenger-1`)
  const [seatPassengerId, setSeatPassengerId] = useState(() => `passenger-1`)
  const [seatLoading, setSeatLoading] = useState(false)
  const [seatError, setSeatError] = useState("")
  const [seatMessage, setSeatMessage] = useState("")
  const [seatMessageTone, setSeatMessageTone] = useState<"success" | "warning">("success")
  const [seatSegments, setSeatSegments] = useState<SeatSegment[]>([])
  const [selectedSeats, setSelectedSeats] = useState<Record<string, SelectedSeat>>({})
  const passengerCount = passengers.length || 1
  const subtotal = data.price * passengerCount
  const customerAdminFeePercent = Number.isFinite(data.customerAdminFeePercent) ? data.customerAdminFeePercent : 0
  const adminFee = Math.round(subtotal * (customerAdminFeePercent / 100))
  const totalEstimate = subtotal + adminFee
  const passengerSummary = formatPassengerSummary(passengerCount)
  const completePassengerCount = passengers.filter(isPassengerComplete).length
  const manifestIsComplete = completePassengerCount === passengerCount
  const contactName = [contactFirstName, contactLastName].filter(Boolean).join(" ").trim()
  const activeSeatPassengerId = passengers.some((passenger) => passenger.id === seatPassengerId) ? seatPassengerId : passengers[0]?.id || "passenger-1"
  const currentSeatSegment = seatSegments[0] || null
  const selectedSeatCount = Object.keys(selectedSeats).filter((passengerId) =>
    passengers.some((passenger) => passenger.id === passengerId),
  ).length
  const contactNameError = submitted && !contactFirstName.trim() ? "Nama depan wajib diisi." : ""
  const emailError =
    submitted && !email.trim() ? "Email wajib diisi." : email.trim() && !isValidEmail(email) ? "Format email belum valid." : ""
  const phoneError =
    submitted && !phone.trim()
      ? "Nomor telepon wajib diisi."
      : phone.trim() && !isValidPhone(phone)
        ? "Nomor telepon belum valid."
        : ""

  useEffect(() => {
    let mounted = true

    supabase.auth.getUser().then(({ data: sessionData }) => {
      if (!mounted) return
      const user = sessionData.user
      const fullName = typeof user?.user_metadata?.full_name === "string" ? user.user_metadata.full_name : ""
      const [firstName, ...restName] = fullName.split(" ").filter(Boolean)

      setIsAuthenticated(Boolean(user))
      setEmail(user?.email || "")
      if (firstName) setContactFirstName(firstName)
      if (restName.length) setContactLastName(restName.join(" "))
      setCheckingSession(false)
    })

    return () => {
      mounted = false
    }
  }, [supabase])

  useEffect(() => {
    try {
      const rawDraft = window.localStorage.getItem(draftStorageKey)
      if (!rawDraft) {
        setDraftReady(true)
        return
      }

      const draft = JSON.parse(rawDraft) as Partial<CheckoutDraft>
      setContactFirstName(typeof draft.contactFirstName === "string" ? draft.contactFirstName : "")
      setContactLastName(typeof draft.contactLastName === "string" ? draft.contactLastName : "")
      setEmail(typeof draft.email === "string" ? draft.email : "")
      setPhone(typeof draft.phone === "string" ? draft.phone : "")
      setSendEticket(typeof draft.sendEticket === "boolean" ? draft.sendEticket : true)
      setPassengers(sanitizePassengerList(draft.passengers, initialPassengerCount))
      setOpenPassengerId(sanitizePassengerList(draft.passengers, initialPassengerCount)[0]?.id || "passenger-1")
      setSeatPassengerId(sanitizePassengerList(draft.passengers, initialPassengerCount)[0]?.id || "passenger-1")
      setSelectedSeats(
        draft.selectedSeats && typeof draft.selectedSeats === "object" && !Array.isArray(draft.selectedSeats)
          ? draft.selectedSeats
          : {},
      )
    } catch {
      window.localStorage.removeItem(draftStorageKey)
    } finally {
      setDraftReady(true)
    }
  }, [draftStorageKey, initialPassengerCount])

  useEffect(() => {
    if (!draftReady) return

    const draft: CheckoutDraft = {
      contactFirstName,
      contactLastName,
      email,
      phone,
      sendEticket,
      passengers,
      selectedSeats,
    }

    window.localStorage.setItem(draftStorageKey, JSON.stringify(draft))
  }, [contactFirstName, contactLastName, draftReady, draftStorageKey, email, passengers, phone, selectedSeats, sendEticket])

  useEffect(() => {
    setSelectedSeats((currentSeats) => {
      const passengerIds = new Set(passengers.map((passenger) => passenger.id))
      const nextSeats = Object.fromEntries(Object.entries(currentSeats).filter(([passengerId]) => passengerIds.has(passengerId)))
      return Object.keys(nextSeats).length === Object.keys(currentSeats).length ? currentSeats : nextSeats
    })
    if (!passengers.some((passenger) => passenger.id === seatPassengerId)) {
      setSeatPassengerId(passengers[0]?.id || "passenger-1")
    }
  }, [passengers, seatPassengerId])

  function updatePassenger(id: string, patch: Partial<PassengerForm>) {
    setPassengers((currentPassengers) =>
      currentPassengers.map((passenger) => (passenger.id === id ? { ...passenger, ...patch } : passenger)),
    )
  }

  function addPassenger() {
    const nextPassenger = createPassengerForm(Date.now())
    setPassengers((currentPassengers) => [...currentPassengers, nextPassenger])
    setOpenPassengerId(nextPassenger.id)
    setSeatPassengerId(nextPassenger.id)
  }

  function removePassenger(id: string) {
    setPassengers((currentPassengers) => {
      if (currentPassengers.length <= 1) return currentPassengers
      const nextPassengers = currentPassengers.filter((passenger) => passenger.id !== id)
      if (openPassengerId === id) setOpenPassengerId(nextPassengers[0]?.id || "passenger-1")
      return nextPassengers
    })
  }

  function copyContactToPassenger(id: string) {
    updatePassenger(id, {
      firstName: contactFirstName,
      lastName: contactLastName,
      noLastName: !contactLastName.trim(),
    })
  }

  function buildPassengerManifest() {
    const contactName = [contactFirstName, contactLastName].filter(Boolean).join(" ").trim()

    return passengers
      .map((passenger, index) => {
        const passengerName = [passenger.firstName, passenger.lastName].filter(Boolean).join(" ").trim() || contactName

        return [
          `PAX ${index + 1}`,
          passenger.title,
          passenger.gender ? `GENDER ${passenger.gender}` : "",
          passengerName,
          email,
          passenger.birthDate ? `DOB ${passenger.birthDate}` : "",
          passenger.nationality ? `NAT ${passenger.nationality}` : "",
          passenger.identityNumber ? `${passenger.identityType} ${passenger.identityNumber}` : "",
        ]
          .filter(Boolean)
          .join(" | ")
      })
      .join("\n")
  }

  function buildPassengerDetailsPayload() {
    return passengers.map((passenger) => ({
      title: passenger.title,
      gender: passenger.gender,
      first_name: passenger.firstName,
      last_name: passenger.lastName,
      no_last_name: passenger.noLastName,
      birth_date: passenger.birthDate,
      nationality: passenger.nationality,
      identity_type: passenger.identityType,
      identity_number: passenger.identityNumber,
      type: "adult",
    }))
  }

  function buildSelectedSeatsPayload() {
    return Object.entries(selectedSeats)
      .filter(([passengerId]) => passengers.some((passenger) => passenger.id === passengerId))
      .map(([passengerId, seat]) => ({
        passenger_id: passengerId,
        origin: seat.origin,
        destination: seat.destination,
        seat: seat.seat,
        compartment: seat.compartment,
        seat_price: seat.seatPrice,
        currency: seat.currency,
      }))
  }

  function buildFlightRequestPayload() {
    return {
      offer_id: data.offerId,
      title: data.title,
      airline: data.airline,
      airline_code: data.airlineCode,
      flight_number: data.flightNumber,
      origin: data.origin,
      destination: data.destination,
      route: data.route,
      depart_date: data.departDate,
      return_date: data.returnDate,
      departure_time: data.departureTime,
      arrival_time: data.arrivalTime,
      duration: data.duration,
      transit: data.transit,
      cabin: data.cabin,
      trip_type: data.tripType,
      passengers: passengerSummary,
      price: data.price,
      supplier_price: data.supplierPrice,
      redfeng_markup_amount: data.redfengMarkupAmount,
      redfeng_tax_amount: data.redfengTaxAmount,
      fare_reference_id: data.fareReferenceId,
      airline_access_code: data.airlineAccessCode,
      search_key: data.searchKey,
      detail_schedule: data.detailSchedule,
      supplier_flight_class: data.supplierFlightClass,
      source: data.source,
      customer_name: contactName,
      customer_email: email,
      customer_phone: normalizePhone(phone),
      passenger_manifest: buildPassengerManifest(),
      passenger_details: buildPassengerDetailsPayload(),
      selected_seats: buildSelectedSeatsPayload(),
    }
  }

  async function handleCheckSeats() {
    setSeatError("")
    setSeatMessage("")
    setSeatMessageTone("success")
    setSubmitted(true)

    if (!isAuthenticated) {
      router.push(`/login?next=${encodeURIComponent(currentPath)}`)
      return
    }

    if (!contactFirstName.trim() || !isValidEmail(email) || !isValidPhone(phone)) {
      setSeatError("Lengkapi data kontak dengan nama depan, email valid, dan nomor telepon aktif sebelum cek kursi.")
      return
    }

    const incompletePassengerIndex = passengers.findIndex((passenger) => !isPassengerComplete(passenger))
    if (incompletePassengerIndex >= 0) {
      setOpenPassengerId(passengers[incompletePassengerIndex]?.id || passengers[0]?.id || "passenger-1")
      setSeatPassengerId(passengers[incompletePassengerIndex]?.id || passengers[0]?.id || "passenger-1")
      setSeatError(`Lengkapi data Penumpang Dewasa ${incompletePassengerIndex + 1} sebelum cek kursi.`)
      return
    }

    setSeatLoading(true)

    try {
      const response = await fetch("/api/flights/seat-map", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildFlightRequestPayload()),
      })
      const payload = await response.json()
      const segments = normalizeSeatSegments(payload.segments)

      if (!response.ok) {
        setSeatSegments([])
        setSelectedSeats({})
        setSeatError(payload.error || "Seat map belum bisa dicek.")
        return
      }

      setSeatSegments(segments)
      setSelectedSeats({})
      setSeatMessageTone(segments.length ? "success" : "warning")
      setSeatMessage(
        payload.message ||
          (segments.length
            ? "Seat map tersedia."
            : "Maskapai belum menyediakan layout kursi untuk penerbangan ini. Booking tetap bisa dilanjutkan tanpa memilih kursi."),
      )
    } catch {
      setSeatSegments([])
      setSeatError("Server belum bisa mengecek seat map.")
    } finally {
      setSeatLoading(false)
    }
  }

  async function handleSubmit() {
    setError("")
    setSubmitted(true)

    if (!isAuthenticated) {
      router.push(`/login?next=${encodeURIComponent(currentPath)}`)
      return
    }

    if (!contactFirstName.trim() || !isValidEmail(email) || !isValidPhone(phone)) {
      setError("Lengkapi data kontak dengan nama depan, email valid, dan nomor telepon aktif.")
      return
    }

    const incompletePassengerIndex = passengers.findIndex((passenger) => !isPassengerComplete(passenger))

    if (incompletePassengerIndex >= 0) {
      setOpenPassengerId(passengers[incompletePassengerIndex]?.id || passengers[0]?.id || "passenger-1")
      setError(`Lengkapi data Penumpang Dewasa ${incompletePassengerIndex + 1} sebelum membuat booking.`)
      return
    }

    setSubmitting(true)

    try {
      const response = await fetch("/api/flights/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildFlightRequestPayload()),
      })
      const payload = await response.json()

      if (!response.ok || !payload.booking_id) {
        setError(payload.error || "Gagal membuat booking pesawat.")
        setSubmitting(false)
        return
      }

      window.localStorage.removeItem(draftStorageKey)
      const query = new URLSearchParams({
        booking_id: String(payload.booking_id),
      })
      if (payload.booking_code) query.set("booking_code", String(payload.booking_code))
      router.push(`/pesawat/checkout/success?${query.toString()}`)
    } catch {
      setError("Server belum bisa membuat booking pesawat.")
      setSubmitting(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#fffaf6] text-neutral-900">
      <header className="bg-[#ff4b00] text-white shadow-sm">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 md:px-8">
          <div className="flex items-center gap-3">
            <Image src="/logo-redfeng-header.png" alt="Red Feng" width={132} height={42} priority className="h-11 w-auto" />
          </div>
          <div className="flex items-center gap-5 text-sm font-semibold">
            <button type="button" className="hidden items-center gap-2 sm:flex">
              IDR
              <span aria-hidden="true">v</span>
            </button>
            <button type="button" className="hidden items-center gap-2 sm:flex">
              Pay
              <span aria-hidden="true">v</span>
            </button>
            <button
              type="button"
              onClick={() => router.push(isAuthenticated ? "/customer/dashboard" : `/login?next=${encodeURIComponent(currentPath)}`)}
              className="flex items-center gap-2"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full border border-white/80">
                <Icon name="user" className="h-4 w-4" />
              </span>
              <span>{isAuthenticated ? "Akun Saya" : "Log in / Register"}</span>
            </button>
          </div>
        </div>
      </header>

      <Stepper />

      <div className="mx-auto grid max-w-7xl gap-5 px-5 py-6 md:px-8 lg:grid-cols-[minmax(0,1fr)_386px]">
        <section className="space-y-5">
          <div className="rounded-lg border border-orange-100 bg-white shadow-[0_8px_24px_rgba(255,75,0,0.07)]">
            <div className="border-b border-orange-100 px-5 py-5 md:px-6">
              <h1 className="text-2xl font-bold text-[#ff4b00]">Data Pemesan</h1>
              <p className="mt-2 text-sm text-neutral-600">Isi data contact dan penumpang untuk penerbangan Anda.</p>
            </div>
            <div className="px-5 py-5 md:px-6">
              <h2 className="text-base font-bold text-neutral-900">Data Kontak</h2>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <label>
                  <FieldLabel>Nama depan</FieldLabel>
                  <input
                    value={contactFirstName}
                    onChange={(event) => setContactFirstName(event.target.value)}
                    placeholder="Contoh: Budi"
                    className={`h-12 w-full rounded-lg border bg-white px-4 text-sm outline-none transition focus:ring-2 ${
                      contactNameError
                        ? "border-red-300 focus:border-red-500 focus:ring-red-100"
                        : "border-orange-200 focus:border-[#ff4b00] focus:ring-orange-100"
                    }`}
                  />
                  {contactNameError ? <p className="mt-1 text-xs font-semibold text-red-600">{contactNameError}</p> : null}
                </label>
                <label>
                  <FieldLabel>Nama belakang</FieldLabel>
                  <input
                    value={contactLastName}
                    onChange={(event) => setContactLastName(event.target.value)}
                    placeholder="Contoh: Santoso"
                    className="h-12 w-full rounded-lg border border-orange-200 bg-white px-4 text-sm outline-none transition focus:border-[#ff4b00] focus:ring-2 focus:ring-orange-100"
                  />
                </label>
                <label>
                  <FieldLabel>Nomor telepon</FieldLabel>
                  <div
                    className={`flex h-12 overflow-hidden rounded-lg border bg-white focus-within:ring-2 ${
                      phoneError
                        ? "border-red-300 focus-within:border-red-500 focus-within:ring-red-100"
                        : "border-orange-200 focus-within:border-[#ff4b00] focus-within:ring-orange-100"
                    }`}
                  >
                    <div className="flex items-center gap-2 border-r border-orange-100 px-3 text-sm font-semibold text-neutral-700">
                      <span className="h-3 w-5 rounded-sm bg-gradient-to-b from-red-500 from-50% to-white to-50%" />
                      +62
                    </div>
                    <input
                      value={phone}
                      onChange={(event) => setPhone(event.target.value)}
                      placeholder="Contoh: 081234567890"
                      className="min-w-0 flex-1 px-4 text-sm outline-none"
                    />
                  </div>
                  {phoneError ? <p className="mt-1 text-xs font-semibold text-red-600">{phoneError}</p> : null}
                </label>
                <label>
                  <FieldLabel>Email</FieldLabel>
                  <input
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    type="email"
                    placeholder="Contoh: budisantoso@email.com"
                    className={`h-12 w-full rounded-lg border bg-white px-4 text-sm outline-none transition focus:ring-2 ${
                      emailError
                        ? "border-red-300 focus:border-red-500 focus:ring-red-100"
                        : "border-orange-200 focus:border-[#ff4b00] focus:ring-orange-100"
                    }`}
                  />
                  {emailError ? <p className="mt-1 text-xs font-semibold text-red-600">{emailError}</p> : null}
                </label>
              </div>
              <label className="mt-4 flex items-center gap-3 text-sm text-neutral-600">
                <input
                  type="checkbox"
                  checked={sendEticket}
                  onChange={(event) => setSendEticket(event.target.checked)}
                  className="h-4 w-4 rounded border-orange-300 accent-[#ff4b00]"
                />
                E-ticket akan dikirim ke email ini
              </label>
              <p className="mt-3 text-xs font-semibold text-green-700">Draft tersimpan otomatis di perangkat ini.</p>
            </div>
          </div>

          <div className="rounded-lg border border-orange-100 bg-white p-5 shadow-[0_8px_24px_rgba(255,75,0,0.07)] md:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Icon name="user" className="h-5 w-5 text-[#ff4b00]" />
                <div>
                  <h2 className="text-xl font-bold text-[#ff4b00]">Detail Penumpang</h2>
                  <p className="mt-1 text-sm text-neutral-600">{passengerSummary}</p>
                </div>
              </div>
            </div>

            <div className="mt-5 space-y-4">
              {passengers.map((passenger, index) => {
                const isOpen = openPassengerId === passenger.id
                const complete = isPassengerComplete(passenger)
                const firstNameError = submitted && !passenger.firstName.trim() ? "Nama depan wajib diisi." : ""
                const lastNameError =
                  submitted && !passenger.noLastName && !passenger.lastName.trim() ? "Nama belakang wajib diisi." : ""
                const genderError = submitted && !passenger.gender.trim() ? "Jenis kelamin wajib dipilih." : ""
                const birthDateError =
                  submitted && !passenger.birthDate
                    ? "Tanggal lahir wajib diisi."
                    : submitted && passenger.birthDate && !isValidBirthDate(passenger.birthDate)
                      ? "Tanggal lahir tidak boleh di masa depan."
                      : submitted && passenger.birthDate && !isAdultBirthDate(passenger.birthDate)
                        ? "Penumpang dewasa harus berusia minimal 12 tahun."
                        : ""
                const identityError =
                  submitted && !passenger.identityNumber.trim()
                    ? "Nomor identitas wajib diisi."
                    : passenger.identityNumber.trim() && !isValidIdentity(passenger)
                      ? "Nomor identitas belum valid."
                      : ""

                return (
                  <div key={passenger.id} className="overflow-hidden rounded-lg border border-orange-100 bg-white">
                    <button
                      type="button"
                      onClick={() => setOpenPassengerId(isOpen ? "" : passenger.id)}
                      className="flex w-full flex-wrap items-center justify-between gap-3 bg-orange-50 px-4 py-3 text-left"
                      aria-expanded={isOpen}
                    >
                      <span className="flex min-w-0 items-center gap-3 text-sm font-bold text-neutral-900">
                        <Icon name="user" className="h-4 w-4 shrink-0 text-[#ff4b00]" />
                        <span>Penumpang Dewasa {index + 1}</span>
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                            complete ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          {complete ? "Lengkap" : "Belum lengkap"}
                        </span>
                      </span>
                      <span className="text-sm font-bold text-[#ff4b00]" aria-hidden="true">
                        {isOpen ? "^" : "v"}
                      </span>
                    </button>
                    {isOpen ? (
                      <div className="p-4">
                        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-800">
                          Pastikan nama penumpang sama dengan identitas. Penumpang dewasa harus berusia minimal 12 tahun.
                        </div>
                        <div className="flex flex-wrap justify-end gap-2 pb-4">
                          <button
                            type="button"
                            onClick={() => copyContactToPassenger(passenger.id)}
                            className="rounded-lg border border-[#ff4b00] bg-white px-3 py-2 text-xs font-bold text-[#ff4b00] transition hover:bg-orange-50"
                          >
                            Salin dari Kontak
                          </button>
                          {passengers.length > 1 ? (
                            <button
                              type="button"
                              onClick={() => removePassenger(passenger.id)}
                              className="rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-bold text-red-600 transition hover:bg-red-50"
                            >
                              Hapus
                            </button>
                          ) : null}
                        </div>
                        <div className="grid gap-4 md:grid-cols-[120px_160px_1fr_1fr]">
                          <label>
                            <FieldLabel>Gelar</FieldLabel>
                            <select
                              value={passenger.title}
                              onChange={(event) => {
                                const title = event.target.value
                                updatePassenger(passenger.id, { title, gender: inferGenderFromTitle(title) })
                              }}
                              className="h-12 w-full rounded-lg border border-orange-200 bg-white px-3 text-sm outline-none focus:border-[#ff4b00] focus:ring-2 focus:ring-orange-100"
                            >
                              <option>MR</option>
                              <option>MRS</option>
                              <option>MS</option>
                            </select>
                          </label>
                          <label>
                            <FieldLabel>Jenis kelamin</FieldLabel>
                            <select
                              value={passenger.gender}
                              onChange={(event) => updatePassenger(passenger.id, { gender: event.target.value })}
                              className={`h-12 w-full rounded-lg border bg-white px-3 text-sm outline-none focus:ring-2 ${
                                genderError
                                  ? "border-red-300 focus:border-red-500 focus:ring-red-100"
                                  : "border-orange-200 focus:border-[#ff4b00] focus:ring-orange-100"
                              }`}
                            >
                              <option value="">Pilih</option>
                              <option value="M">Laki-laki</option>
                              <option value="F">Perempuan</option>
                            </select>
                            {genderError ? <p className="mt-1 text-xs font-semibold text-red-600">{genderError}</p> : null}
                          </label>
                          <label>
                            <FieldLabel>Nama depan sesuai identitas</FieldLabel>
                            <input
                              value={passenger.firstName}
                              onChange={(event) => updatePassenger(passenger.id, { firstName: event.target.value })}
                              placeholder="Contoh: Budi"
                              className={`h-12 w-full rounded-lg border bg-white px-4 text-sm outline-none focus:ring-2 ${
                                firstNameError
                                  ? "border-red-300 focus:border-red-500 focus:ring-red-100"
                                  : "border-orange-200 focus:border-[#ff4b00] focus:ring-orange-100"
                              }`}
                            />
                            {firstNameError ? <p className="mt-1 text-xs font-semibold text-red-600">{firstNameError}</p> : null}
                          </label>
                          <div>
                            <FieldLabel>Nama belakang sesuai identitas</FieldLabel>
                            <input
                              value={passenger.lastName}
                              onChange={(event) => updatePassenger(passenger.id, { lastName: event.target.value })}
                              placeholder="Contoh: Santoso"
                              disabled={passenger.noLastName}
                              className={`h-12 w-full rounded-lg border bg-white px-4 text-sm outline-none focus:ring-2 ${
                                lastNameError
                                  ? "border-red-300 focus:border-red-500 focus:ring-red-100"
                                  : "border-orange-200 focus:border-[#ff4b00] focus:ring-orange-100 disabled:bg-neutral-100 disabled:text-neutral-400"
                              }`}
                            />
                            <label className="mt-3 flex items-start gap-2 text-xs font-semibold text-neutral-700">
                              <input
                                type="checkbox"
                                checked={passenger.noLastName}
                                onChange={(event) =>
                                  updatePassenger(passenger.id, {
                                    noLastName: event.target.checked,
                                    lastName: event.target.checked ? "" : passenger.lastName,
                                  })
                                }
                                className="mt-0.5 h-4 w-4 rounded border-orange-200 text-[#ff4b00] focus:ring-orange-200"
                              />
                              <span>Penumpang tidak punya nama belakang di identitas</span>
                            </label>
                            {lastNameError ? <p className="mt-1 text-xs font-semibold text-red-600">{lastNameError}</p> : null}
                          </div>
                        </div>
                        <div className="mt-4 grid gap-4 md:grid-cols-[1fr_1fr_1.6fr]">
                          <label>
                            <FieldLabel>Tanggal lahir</FieldLabel>
                            <input
                              value={passenger.birthDate}
                              onChange={(event) => updatePassenger(passenger.id, { birthDate: event.target.value })}
                              type="date"
                              max={todayDateInputValue()}
                              className={`h-12 w-full rounded-lg border bg-white px-4 text-sm outline-none focus:ring-2 ${
                                birthDateError
                                  ? "border-red-300 focus:border-red-500 focus:ring-red-100"
                                  : "border-orange-200 focus:border-[#ff4b00] focus:ring-orange-100"
                              }`}
                            />
                            {birthDateError ? <p className="mt-1 text-xs font-semibold text-red-600">{birthDateError}</p> : null}
                          </label>
                          <label>
                            <FieldLabel>Kewarganegaraan</FieldLabel>
                            <select
                              value={passenger.nationality}
                              onChange={(event) => updatePassenger(passenger.id, { nationality: event.target.value })}
                              className="h-12 w-full rounded-lg border border-orange-200 bg-white px-3 text-sm outline-none focus:border-[#ff4b00] focus:ring-2 focus:ring-orange-100"
                            >
                              <option>Indonesia</option>
                              <option>Singapore</option>
                              <option>Malaysia</option>
                            </select>
                          </label>
                          <label>
                            <FieldLabel>No. identitas</FieldLabel>
                            <div
                              className={`flex h-12 overflow-hidden rounded-lg border bg-white focus-within:ring-2 ${
                                identityError
                                  ? "border-red-300 focus-within:border-red-500 focus-within:ring-red-100"
                                  : "border-orange-200 focus-within:border-[#ff4b00] focus-within:ring-orange-100"
                              }`}
                            >
                              <select
                                value={passenger.identityType}
                                onChange={(event) => updatePassenger(passenger.id, { identityType: event.target.value })}
                                className="border-r border-orange-100 bg-white px-3 text-sm outline-none"
                              >
                                <option>KTP</option>
                                <option>Paspor</option>
                              </select>
                              <input
                                value={passenger.identityNumber}
                                onChange={(event) => updatePassenger(passenger.id, { identityNumber: event.target.value })}
                                placeholder="Contoh: 3171234567890001"
                                className="min-w-0 flex-1 px-4 text-sm outline-none"
                              />
                            </div>
                            {identityError ? <p className="mt-1 text-xs font-semibold text-red-600">{identityError}</p> : null}
                          </label>
                        </div>
                      </div>
                    ) : null}
                  </div>
                )
              })}
            </div>
            <button
              type="button"
              onClick={addPassenger}
              className="mt-4 inline-flex items-center gap-2 rounded-lg border border-[#ff4b00] bg-white px-5 py-3 text-sm font-bold text-[#ff4b00] transition hover:bg-orange-50"
            >
              <span className="text-xl leading-none" aria-hidden="true">
                +
              </span>
              Tambah Penumpang
            </button>
            <p className="mt-4 rounded-lg bg-orange-50 px-4 py-3 text-xs leading-5 text-orange-700">
              Tambahan penumpang akan ikut masuk data pemesanan. Tim Red Feng tetap memastikan harga dan ketersediaan kursi sebelum pembayaran dibuka.
            </p>
          </div>

          <div className="rounded-lg border border-orange-100 bg-white p-5 shadow-[0_8px_24px_rgba(255,75,0,0.07)] md:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Icon name="seat" className="h-6 w-6 text-[#ff4b00]" />
                <div>
                  <h2 className="text-xl font-bold text-[#ff4b00]">Pilih Kursi</h2>
                  <p className="mt-1 text-sm text-neutral-700">
                    {data.origin} ke {data.destination}
                  </p>
                </div>
              </div>
              <p className="text-sm text-neutral-600">
                {data.airline || "Airline"} <span className="px-2">.</span> {data.flightNumber || "-"}
              </p>
            </div>
            {currentSeatSegment ? (
              <div className="mt-5 rounded-lg border border-orange-100 px-5 py-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-bold text-neutral-900">Seat map tersedia</h3>
                    <p className="mt-1 text-sm text-neutral-600">
                      Pilih penumpang, lalu pilih kursi yang masih terbuka.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleCheckSeats}
                    disabled={seatLoading}
                    className="rounded-lg border border-orange-200 bg-white px-4 py-2 text-sm font-bold text-[#ff4b00] transition hover:bg-orange-50 disabled:cursor-not-allowed disabled:text-orange-300"
                  >
                    {seatLoading ? "Mengecek..." : "Refresh Kursi"}
                  </button>
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  {passengers.map((passenger, index) => {
                    const active = activeSeatPassengerId === passenger.id
                    const selectedSeat = selectedSeats[passenger.id]

                    return (
                      <button
                        key={passenger.id}
                        type="button"
                        onClick={() => setSeatPassengerId(passenger.id)}
                        className={`rounded-lg border px-4 py-2 text-left text-sm transition ${
                          active
                            ? "border-[#ff4b00] bg-orange-50 text-[#ff4b00]"
                            : "border-orange-100 bg-white text-neutral-700 hover:bg-orange-50"
                        }`}
                      >
                        <span className="block font-bold">{passengerDisplayName(passenger, index)}</span>
                        <span className="mt-0.5 block text-xs">{selectedSeat ? `Kursi ${selectedSeat.seat}` : "Belum pilih"}</span>
                      </button>
                    )
                  })}
                </div>

                <div className="mt-5 overflow-x-auto rounded-lg bg-slate-50 px-4 py-5">
                  <div className="mx-auto w-max min-w-[260px]">
                    <div className="mx-auto mb-4 h-8 w-32 rounded-t-full bg-[#ff4b00] text-center text-xs font-bold leading-8 text-white">
                      DEPAN
                    </div>
                    <div className="space-y-2">
                      {buildSeatRows(currentSeatSegment.infos).map((row) => (
                        <div key={row.row} className="flex items-center justify-center gap-2">
                          {row.seats.map((seat) => {
                            const selectedEntry = Object.entries(selectedSeats).find(([, selected]) => selected.seat === seat.seatDesignator)
                            const selectedByOther = Boolean(selectedEntry && selectedEntry[0] !== activeSeatPassengerId)
                            const selectedForActive = selectedSeats[activeSeatPassengerId]?.seat === seat.seatDesignator
                            const available = seat.assignable && seat.isOpen && !selectedByOther

                            return (
                              <button
                                key={`${row.row}-${seat.seatDesignator}`}
                                type="button"
                                disabled={!available}
                                onClick={() => {
                                  setSelectedSeats((currentSeats) => ({
                                    ...currentSeats,
                                    [activeSeatPassengerId]: {
                                      passengerId: activeSeatPassengerId,
                                      origin: currentSeatSegment.origin || data.origin,
                                      destination: currentSeatSegment.destination || data.destination,
                                      seat: seat.seatDesignator,
                                      compartment: seat.compartment,
                                      seatPrice: seat.seatPrice,
                                      currency: seat.currency,
                                    },
                                  }))
                                }}
                                title={seat.seatText || seat.seatDesignator}
                                className={`h-11 w-11 rounded-lg border text-xs font-bold transition ${
                                  selectedForActive
                                    ? "border-[#ff4b00] bg-[#ff4b00] text-white"
                                    : selectedByOther
                                      ? "border-blue-200 bg-blue-50 text-blue-500"
                                      : seat.assignable && seat.isOpen
                                        ? "border-green-200 bg-white text-green-700 hover:border-[#ff4b00] hover:text-[#ff4b00]"
                                        : "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-300"
                                }`}
                              >
                                {seat.seatDesignator}
                              </button>
                            )
                          })}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-3 text-xs text-neutral-600">
                  <span className="inline-flex items-center gap-2"><span className="h-3 w-3 rounded border border-green-200 bg-white" />Tersedia</span>
                  <span className="inline-flex items-center gap-2"><span className="h-3 w-3 rounded bg-[#ff4b00]" />Dipilih</span>
                  <span className="inline-flex items-center gap-2"><span className="h-3 w-3 rounded bg-slate-100" />Tidak tersedia</span>
                </div>
              </div>
            ) : (
              <div className="mt-5 grid items-center gap-5 rounded-lg border border-orange-100 px-5 py-6 md:grid-cols-[180px_1fr]">
                <div className="flex justify-center text-[#ff4b00]">
                  <svg viewBox="0 0 180 110" className="h-28 w-44" aria-hidden="true">
                    <rect x="34" y="36" width="42" height="42" rx="8" fill="#ff7a1a" />
                    <rect x="84" y="36" width="42" height="42" rx="8" fill="#ff7a1a" />
                    <path d="M44 78h20v22H44zM94 78h20v22H94z" fill="#ff4b00" />
                    <path d="M27 100h126" stroke="#ff4b00" strokeWidth="5" strokeLinecap="round" />
                    <path d="M75 57h10M125 57h10" stroke="#fff" strokeWidth="5" strokeLinecap="round" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-neutral-900">Cek pilihan kursi</h3>
                  <p className="mt-2 text-sm leading-6 text-neutral-600">
                    Pilihan kursi akan muncul jika maskapai menyediakan data kursi untuk penerbangan ini.
                    Booking tetap bisa dilanjutkan tanpa memilih kursi.
                  </p>
                  <button
                    type="button"
                    onClick={handleCheckSeats}
                    disabled={seatLoading}
                    className="mt-4 rounded-lg border border-[#ff4b00] bg-white px-5 py-3 text-sm font-bold text-[#ff4b00] transition hover:bg-orange-50 disabled:cursor-not-allowed disabled:border-orange-200 disabled:text-orange-300"
                  >
                    {seatLoading ? "Mengecek Kursi..." : "Cek Kursi"}
                  </button>
                </div>
              </div>
            )}
            {seatError ? <p className="mt-3 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{seatError}</p> : null}
            {seatMessage ? (
              <p
                className={`mt-3 rounded-lg px-4 py-3 text-sm ${
                  seatMessageTone === "warning" ? "bg-amber-50 text-amber-800" : "bg-green-50 text-green-700"
                }`}
              >
                {seatMessage}
              </p>
            ) : null}
            {selectedSeatCount > 0 ? (
              <p className="mt-3 rounded-lg bg-orange-50 px-4 py-3 text-sm text-orange-700">
                {selectedSeatCount}/{passengerCount} penumpang sudah memilih kursi. Kursi akan ikut diajukan saat booking dibuat.
              </p>
            ) : null}
          </div>

          <div className="rounded-lg border border-orange-100 bg-white p-5 shadow-[0_8px_24px_rgba(255,75,0,0.07)] md:p-6">
            <h2 className="text-xl font-bold text-[#ff4b00]">Tambahan Lain</h2>
            <p className="mt-1 text-sm text-neutral-600">Lengkapi perjalanan Anda dengan layanan tambahan.</p>
            <div className="mt-5 space-y-3">
              <div className="flex items-center justify-between gap-4 rounded-lg border border-orange-100 px-4 py-4">
                <div className="flex items-center gap-4">
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-50 text-[#ff4b00]">
                    <Icon name="bag" />
                  </span>
                  <div>
                    <p className="font-bold text-neutral-900">Bagasi</p>
                    <p className="mt-1 text-sm text-neutral-600">Gratis bagasi 20 kg/penumpang</p>
                  </div>
                </div>
                <span className="text-sm font-bold text-green-600">GRATIS</span>
              </div>
              <div className="flex items-center justify-between gap-4 rounded-lg border border-orange-100 px-4 py-4">
                <div className="flex items-center gap-4">
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-50 text-[#ff4b00]">
                    <Icon name="shield" />
                  </span>
                  <div>
                    <p className="font-bold text-neutral-900">Asuransi Perjalanan</p>
                    <p className="mt-1 text-sm text-neutral-600">Lindungi perjalanan Anda mulai dari keterlambatan hingga kehilangan bagasi.</p>
                  </div>
                </div>
                <button
                  type="button"
                  disabled
                  className="rounded-lg border border-orange-200 bg-orange-50 px-4 py-2 text-sm font-bold text-orange-400"
                >
                  Segera Hadir
                </button>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-orange-200 bg-orange-50 px-5 py-4">
            <div className="flex gap-3">
              <Icon name="info" className="mt-0.5 h-5 w-5 shrink-0 text-[#ff4b00]" />
              <p className="text-sm leading-6 text-neutral-700">
                Dengan melanjutkan pemesanan ini, Anda telah membaca, memahami, dan menyetujui{" "}
                <span className="font-bold text-[#ff4b00]">Syarat dan Ketentuan</span>, serta{" "}
                <span className="font-bold text-[#ff4b00]">Kebijakan Privasi</span> Red Feng.
              </p>
            </div>
          </div>

          {error ? <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
          {!checkingSession && !isAuthenticated ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Login diperlukan sebelum booking pesawat bisa dibuat.
            </div>
          ) : null}

          <div className="sticky bottom-0 z-20 -mx-5 flex flex-col gap-3 border-t border-orange-100 bg-[#fffaf6]/95 px-5 py-3 shadow-[0_-8px_24px_rgba(255,75,0,0.07)] backdrop-blur sm:static sm:mx-0 sm:flex-row sm:items-center sm:justify-between sm:border-t-0 sm:bg-transparent sm:px-0 sm:pb-8 sm:pt-0 sm:shadow-none sm:backdrop-blur-0">
            <button
              type="button"
              onClick={() => router.back()}
              className="inline-flex items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-bold text-[#ff4b00]"
            >
              <span aria-hidden="true">{"<"}</span>
              Kembali
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={checkingSession || submitting}
              className="h-14 rounded-lg bg-[#ff4b00] px-12 text-base font-bold text-white shadow-[0_10px_22px_rgba(255,75,0,0.25)] transition hover:bg-[#e64400] disabled:cursor-not-allowed disabled:bg-orange-200"
            >
              {submitting ? "Menyimpan..." : isAuthenticated ? "Booking" : "Login untuk Booking"}
            </button>
          </div>
        </section>

        <aside className="space-y-5 lg:sticky lg:top-5 lg:self-start">
          <section className="rounded-lg border border-orange-100 bg-white p-5 shadow-[0_8px_24px_rgba(255,75,0,0.07)]">
            <h2 className="text-xl font-bold text-[#ff4b00]">Rincian Pemesanan</h2>
            <div className="mt-6 flex items-start gap-4">
              <Icon name="plane" className="mt-1 h-6 w-6 shrink-0 text-[#ff4b00]" />
              <div>
                <p className="font-bold text-neutral-900">Penerbangan Pergi</p>
                <p className="mt-1 text-sm text-neutral-600">{formatReadableDate(data.departDate)}</p>
              </div>
            </div>
            <div className="mt-5 border-t border-orange-100 pt-5">
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-16 items-center justify-center rounded-lg bg-blue-50 text-xs font-bold text-blue-700">
                  {data.airline ? data.airline.slice(0, 3).toUpperCase() : "AIR"}
                </div>
                <div>
                  <p className="font-semibold text-neutral-800">{data.airline || "Airline"}</p>
                  <p className="mt-1 text-sm text-neutral-600">
                    {data.flightNumber || "-"} <span className="px-1">.</span> {labelize(data.cabin || "Economy")}
                  </p>
                </div>
              </div>
              <div className="mt-6 grid grid-cols-[1fr_95px_1fr] items-center gap-3">
                <div>
                  <p className="text-2xl font-bold text-neutral-950">{data.departureTime || "-"}</p>
                  <p className="mt-1 text-lg font-bold text-neutral-900">{data.origin}</p>
                  <p className="mt-2 text-xs leading-5 text-neutral-600">Soekarno-Hatta</p>
                </div>
                <div className="text-center text-[#ff4b00]">
                  <p className="text-xs font-semibold text-neutral-700">{data.duration || "-"}</p>
                  <div className="my-2 h-px bg-orange-200" />
                  <Icon name="plane" className="mx-auto h-5 w-5" />
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-neutral-950">{data.arrivalTime || "-"}</p>
                  <p className="mt-1 text-lg font-bold text-neutral-900">{data.destination}</p>
                  <p className="mt-2 text-xs leading-5 text-neutral-600">Bandara tujuan</p>
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowFlightDetails((current) => !current)}
              className="mt-5 text-sm font-bold text-[#ff4b00]"
              aria-expanded={showFlightDetails}
            >
              {showFlightDetails ? "Tutup detail penerbangan ^" : "Lihat detail penerbangan v"}
            </button>
            {showFlightDetails ? (
              <div className="mt-4 rounded-lg border border-orange-100 bg-orange-50 px-4 py-4 text-sm text-neutral-700">
                <dl className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-orange-600">Rute</dt>
                    <dd className="mt-1 font-semibold text-neutral-900">{data.route || `${data.origin}-${data.destination}`}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-orange-600">Transit</dt>
                    <dd className="mt-1 font-semibold text-neutral-900">{data.transit || "-"}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-orange-600">Tanggal pulang</dt>
                    <dd className="mt-1 font-semibold text-neutral-900">{data.returnDate ? formatReadableDate(data.returnDate) : "-"}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-orange-600">Kode penawaran</dt>
                    <dd className="mt-1 break-all font-semibold text-neutral-900">{data.fareReferenceId || data.offerId || "-"}</dd>
                  </div>
                </dl>
                {data.detailSchedule ? <p className="mt-4 break-words text-xs leading-5 text-neutral-600">{data.detailSchedule}</p> : null}
              </div>
            ) : null}
            <div className="mt-5 space-y-3 border-t border-orange-100 pt-5 text-sm">
              <div className="flex justify-between gap-4">
                <span className="text-neutral-600">Penumpang</span>
                <span className="font-bold text-neutral-900">{passengerSummary}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-neutral-600">Manifest</span>
                <span className={`font-bold ${manifestIsComplete ? "text-green-600" : "text-amber-600"}`}>
                  {completePassengerCount}/{passengerCount} lengkap
                </span>
              </div>
            </div>
          </section>

          <section className="rounded-lg border border-orange-100 bg-white p-5 shadow-[0_8px_24px_rgba(255,75,0,0.07)]">
            <h2 className="text-xl font-bold text-[#ff4b00]">Status Booking</h2>
            <div className="mt-5 space-y-4">
              {[
                ["1", "Booking", "Data pemesanan dikirim ke Red Feng."],
                ["2", "Validasi harga", "Tim Red Feng memastikan harga dan ketersediaan kursi."],
                ["3", "Amankan kursi", "Kode booking maskapai dibuat jika data valid."],
                ["4", "Pembayaran", "Link pembayaran dibuka setelah kursi berhasil diamankan."],
              ].map(([number, title, description], index) => (
                <div key={number} className="flex gap-3">
                  <span
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                      index === 0 ? "bg-[#ff4b00] text-white" : "bg-orange-100 text-[#ff4b00]"
                    }`}
                  >
                    {number}
                  </span>
                  <div>
                    <p className="text-sm font-bold text-neutral-900">{title}</p>
                    <p className="mt-0.5 text-xs leading-5 text-neutral-600">{description}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-lg border border-orange-100 bg-white p-5 shadow-[0_8px_24px_rgba(255,75,0,0.07)]">
            <h2 className="text-xl font-bold text-[#ff4b00]">Rincian Harga</h2>
            <div className="mt-5 space-y-4 border-b border-orange-100 pb-5 text-sm text-neutral-700">
              <div className="flex justify-between gap-4">
                <span>Harga tiket ({passengerCount} Dewasa)</span>
                <span>{formatIdr(subtotal)}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span>Admin fee bank transfer ({formatPercent(customerAdminFeePercent)}%)</span>
                <span>{formatIdr(adminFee)}</span>
              </div>
            </div>
            <p className="mt-3 text-xs leading-5 text-neutral-500">
              Harga tiket sudah termasuk pajak yang berlaku.
            </p>
            <div className="mt-5 flex items-center justify-between gap-4">
              <span className="font-bold text-neutral-900">Total Harga</span>
              <span className="text-2xl font-bold text-[#ff4b00]">{formatIdr(totalEstimate)}</span>
            </div>
            <div className="mt-5 rounded-lg bg-green-50 px-4 py-4 text-sm text-green-700">
              <p className="font-bold">Pembayaran aman</p>
              <p className="mt-1 text-xs leading-5 text-green-700">
                Link pembayaran akan dibuka setelah harga dan kursi berhasil dipastikan.
              </p>
            </div>
          </section>

          <section className="rounded-lg border border-orange-100 bg-white p-5 shadow-[0_8px_24px_rgba(255,75,0,0.07)]">
            <div className="flex gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-orange-50 text-[#ff4b00]">
                <Icon name="shield" className="h-7 w-7" />
              </span>
              <div>
                <h2 className="font-bold text-neutral-900">Jaminan Harga</h2>
                <p className="mt-1 text-sm leading-6 text-neutral-600">
                  Harga tidak akan berubah setelah kursi berhasil diamankan dan Anda memilih metode pembayaran.
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-lg border border-orange-100 bg-white p-5 shadow-[0_8px_24px_rgba(255,75,0,0.07)]">
            <h2 className="font-bold text-neutral-900">Butuh bantuan?</h2>
            <div className="mt-5 space-y-5">
              <div className="flex gap-4">
                <Icon name="help" className="h-5 w-5 shrink-0 text-[#ff4b00]" />
                <div>
                  <p className="text-sm font-bold text-[#ff4b00]">Pusat Bantuan</p>
                  <p className="mt-1 text-xs text-neutral-600">Temukan jawaban yang Anda cari</p>
                </div>
              </div>
              <div className="flex gap-4">
                <Icon name="phone" className="h-5 w-5 shrink-0 text-[#ff4b00]" />
                <div>
                  <p className="text-sm font-bold text-[#ff4b00]">Hubungi Kami</p>
                  <p className="mt-1 text-xs text-neutral-600">Customer service kami siap membantu</p>
                </div>
              </div>
              <div className="flex gap-4">
                <Icon name="edit" className="h-5 w-5 shrink-0 text-[#ff4b00]" />
                <div>
                  <p className="text-sm font-bold text-[#ff4b00]">Ubah Penerbangan</p>
                  <p className="mt-1 text-xs text-neutral-600">Kelola penerbangan ini di Pesanan Saya</p>
                </div>
              </div>
            </div>
          </section>
        </aside>
      </div>
    </main>
  )
}
