"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { createAdminAuditLog } from "@/lib/admin-audit"
import { isAdminExecutionRole } from "@/lib/internal-roles"
import { formatBookingCode } from "@/lib/merchant-code"
import { issueDharmawisataFlightTicket } from "@/lib/flights/dharmawisataTicketIssue"
import { createDharmawisataFlightBooking, type DharmawisataPassenger } from "@/lib/flights/dharmawisataFlightBooking"
import { findDharmawisataLowFareScheduleForBooking } from "@/lib/flights/dharmawisataFlightScheduleLookup"
import { autoIssueFlightTicketAfterPayment } from "@/lib/flights/autoIssue"
import { sendFlightTicketIssuedEmail } from "@/lib/flights/flightTicketEmail"
import { getFlightPaymentDeadline } from "@/lib/flights/paymentDeadline"

type BookingPortal = "admin" | "superadmin"
const FLIGHT_TICKET_ISSUE_LOCK_TTL_MS = 10 * 60 * 1000

function resolvePortal(formData: FormData): BookingPortal {
  return String(formData.get("portal") || "").trim() === "superadmin" ? "superadmin" : "admin"
}

function resolvePortalPaths(portal: BookingPortal) {
  return {
    loginPath: portal === "superadmin" ? "/superadmin/login" : "/admin/login",
    bookingsPath: portal === "superadmin" ? "/superadmin/bookings" : "/admin/bookings",
    bookingDetailPath: (bookingId: string) =>
      portal === "superadmin" ? `/superadmin/bookings/${bookingId}` : `/admin/bookings/${bookingId}`,
    auditLogPath: portal === "superadmin" ? "/superadmin/audit-log" : "/admin/audit-log",
  }
}

async function ensureAdmin(portal: BookingPortal) {
  const supabase = await createClient(portal)
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { loginPath } = resolvePortalPaths(portal)

  if (!user) {
    redirect(loginPath)
  }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
  if (!profile || !isAdminExecutionRole(profile.role)) {
    redirect(loginPath)
  }

  return {
    user,
    role: profile.role,
  }
}

function readBookingDetailFilters(formData: FormData) {
  const noteStatus = String(formData.get("note_status") || "").trim().toLowerCase()
  const noteType = String(formData.get("note_type_filter") || "").trim().toLowerCase()
  const notePin = String(formData.get("note_pin") || "").trim().toLowerCase()
  const params = new URLSearchParams()

  if (["active", "done"].includes(noteStatus)) {
    params.set("note_status", noteStatus)
  }

  if (["general", "urgent", "follow_up_merchant", "follow_up_payment", "finance_issue"].includes(noteType)) {
    params.set("note_type", noteType)
  }

  if (notePin === "pinned") {
    params.set("note_pin", notePin)
  }

  return params
}

function readNestedString(value: unknown, keys: string[]) {
  const visit = (current: unknown): string | null => {
    if (!current || typeof current !== "object") return null
    if (Array.isArray(current)) {
      for (const item of current) {
        const found = visit(item)
        if (found) return found
      }
      return null
    }

    const record = current as Record<string, unknown>
    for (const key of keys) {
      const direct = record[key]
      if (typeof direct === "string" && direct.trim()) return direct.trim()
      if (typeof direct === "number") return String(direct)
    }

    for (const child of Object.values(record)) {
      const found = visit(child)
      if (found) return found
    }

    return null
  }

  return visit(value)
}

function normalizeDharmawisataReference(value: string | null | undefined) {
  const normalized = String(value || "").trim()
  return normalized.replace(/^live-/, "")
}

function looksLikeDharmawisataJourneyReference(value: string | null | undefined) {
  const normalized = normalizeDharmawisataReference(value)
  return normalized.includes("~") && normalized.includes("|")
}

function resolveDharmawisataScheduleReference(
  requestPayload: Record<string, unknown>,
  previousSupplierResponsePayload: Record<string, unknown>,
  fallbackFlightNumber: string | null | undefined,
) {
  const candidates = [
    readNestedString(requestPayload, ["detailSchedule"]),
    readNestedString(requestPayload, ["fareReferenceId"]),
    readNestedString(requestPayload, ["offerId"]),
    readNestedString(requestPayload, ["journeyReference"]),
    readNestedString(previousSupplierResponsePayload, ["detailSchedule"]),
    readNestedString(previousSupplierResponsePayload, ["fareReferenceId"]),
    readNestedString(previousSupplierResponsePayload, ["offerId"]),
    readNestedString(previousSupplierResponsePayload, ["journeyReference"]),
  ].map(normalizeDharmawisataReference)

  return (
    candidates.find(looksLikeDharmawisataJourneyReference) ||
    candidates.find(Boolean) ||
    String(fallbackFlightNumber || "")
  )
}

function extractFlightClassFromDharmawisataReference(value: string | null | undefined) {
  const normalized = normalizeDharmawisataReference(value)
  if (!looksLikeDharmawisataJourneyReference(normalized)) return ""

  return normalized
    .split("~")
    .map((part) => part.trim())
    .find((part) => /^[A-Z]{1,2}$/.test(part)) || ""
}

function summarizeDharmawisataScheduleLookup(
  lookup: Awaited<ReturnType<typeof findDharmawisataLowFareScheduleForBooking>> | null,
) {
  if (!lookup) return null

  return {
    ok: lookup.ok,
    message: lookup.message,
    hasDetailSchedule: Boolean(lookup.detailSchedule),
    hasSearchKey: Boolean(lookup.searchKey),
    hasAirlineAccessCode: Boolean(lookup.airlineAccessCode),
    flightClass: lookup.flightClass,
    flightNumber: lookup.flightNumber,
    departureAt: lookup.departureAt,
    arrivalAt: lookup.arrivalAt,
  }
}

function asJsonRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {}
}

function isRecentTimestamp(value: string | null | undefined, ttlMs: number) {
  if (!value) return false
  const parsed = new Date(value)
  return !Number.isNaN(parsed.getTime()) && Date.now() - parsed.getTime() < ttlMs
}

function splitPersonName(value: string) {
  const parts = value.trim().split(/\s+/).filter(Boolean)
  if (parts.length <= 1) {
    return {
      firstName: parts[0] || "Passenger",
      lastName: parts[0] || "Passenger",
    }
  }

  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(" "),
  }
}

function splitIndonesianPhone(value: string) {
  const digits = value.replace(/\D/g, "")
  const local = digits.startsWith("62") ? digits.slice(2) : digits.startsWith("0") ? digits.slice(1) : digits
  const areaLength = local.length >= 10 ? 3 : 2

  return {
    countryCode: "62",
    areaCode: local.slice(0, areaLength),
    remainingPhoneNo: local.slice(areaLength),
  }
}

function normalizePassengerTitle(value: unknown) {
  const normalized = String(value || "").trim().toUpperCase()
  return ["MR", "MRS", "MS", "MSTR", "MISS"].includes(normalized) ? normalized : "MR"
}

function buildDharmawisataPassengersFromParticipants(
  participants: Array<{ full_name: string | null; participant_type: string | null }>,
  fallbackName: string,
  fallbackEmail: string,
) {
  const source = participants.length > 0 ? participants : [{ full_name: fallbackName, participant_type: "adult" }]

  return source.map((participant): DharmawisataPassenger => {
    const name = splitPersonName(participant.full_name || fallbackName)
    const type = String(participant.participant_type || "").toLowerCase()

    return {
      title: normalizePassengerTitle(type === "child" ? "MSTR" : "MR"),
      firstName: name.firstName,
      lastName: name.lastName,
      email: fallbackEmail,
      type: type === "child" ? "Child" : type === "infant" ? "Infant" : "Adult",
    }
  })
}

function buildDharmawisataPassengersFromRequestPayload(
  requestPayload: Record<string, unknown>,
  fallbackEmail: string,
): DharmawisataPassenger[] {
  const passengerDetails = Array.isArray(requestPayload.passengerDetails) ? requestPayload.passengerDetails : []

  return passengerDetails
    .map((item): DharmawisataPassenger | null => {
      const passenger = asJsonRecord(item)
      const fullName = String(passenger.fullName || passenger.full_name || "").trim()
      const name = splitPersonName(fullName)
      const firstName = String(passenger.firstName || passenger.first_name || name.firstName || "").trim()
      const lastName = String(passenger.lastName || passenger.last_name || name.lastName || "").trim()

      if (!firstName) return null

      return {
        title: normalizePassengerTitle(passenger.title),
        firstName,
        lastName,
        birthDate: String(passenger.birthDate || passenger.birth_date || "").trim() || null,
        gender: String(passenger.gender || "").trim() || null,
        email: fallbackEmail,
        type: "Adult",
      }
    })
    .filter((passenger): passenger is DharmawisataPassenger => Boolean(passenger))
}

function backToBookingDetailWithState(bookingId: string, type: "success" | "error", message: string, formData: FormData): never {
  const portal = resolvePortal(formData)
  const { bookingDetailPath } = resolvePortalPaths(portal)
  const params = readBookingDetailFilters(formData)
  params.set(type, message)
  redirect(`${bookingDetailPath(bookingId)}?${params.toString()}`)
}

async function createFlightIssueFailedAdminAlert(input: {
  adminSupabase: ReturnType<typeof createAdminClient>
  booking: {
    id: string
    booking_code: string | null
    customer_name?: string | null
    customer_email?: string | null
  }
  actorId: string
  failureMessage: string
  source: "dharmawisata_issue" | "manual_mark_failed"
}) {
  const bookingCode = formatBookingCode(input.booking.booking_code, input.booking.id)
  const customerLabel = [input.booking.customer_name, input.booking.customer_email].filter(Boolean).join(" / ") || "-"
  const note = [
    `ALERT PESAWAT - Issue ticket gagal untuk ${bookingCode}.`,
    `Customer melihat status aman: "Pembayaran berhasil. Tiket sedang dikonfirmasi tim Red Feng."`,
    `Follow up: cek response Dharmawisata/PNR, retry issue bila aman, atau hubungi customer jika ada perubahan fare/seat.`,
    `Customer: ${customerLabel}.`,
    `Sumber: ${input.source}.`,
    `Detail: ${input.failureMessage || "-"}`,
  ].join("\n")

  const { data: existingAlert } = await input.adminSupabase
    .from("booking_admin_notes")
    .select("id")
    .eq("booking_id", input.booking.id)
    .eq("note_type", "urgent")
    .eq("is_resolved", false)
    .ilike("note", "%ALERT PESAWAT - Issue ticket gagal%")
    .limit(1)
    .maybeSingle<{ id: string }>()

  if (existingAlert?.id) {
    await input.adminSupabase
      .from("booking_admin_notes")
      .update({
        note,
        is_pinned: true,
      })
      .eq("id", existingAlert.id)
    return
  }

  await input.adminSupabase.from("booking_admin_notes").insert({
    booking_id: input.booking.id,
    actor_id: input.actorId,
    note,
    note_type: "urgent",
    is_pinned: true,
  })
}

export async function addBookingAdminNote(formData: FormData) {
  const portal = resolvePortal(formData)
  const adminActor = await ensureAdmin(portal)
  const bookingId = String(formData.get("booking_id") || "").trim()
  const note = String(formData.get("note") || "").trim()
  const noteType = String(formData.get("note_type") || "general").trim().toLowerCase()
  const isPinned = String(formData.get("is_pinned") || "").trim() === "true"
  const allowedNoteTypes = ["general", "urgent", "follow_up_merchant", "follow_up_payment", "finance_issue"]

  if (!bookingId) {
    redirect(resolvePortalPaths(portal).bookingsPath)
  }

  if (!note) {
    backToBookingDetailWithState(bookingId, "error", "Catatan internal tidak boleh kosong.", formData)
  }

  if (!allowedNoteTypes.includes(noteType)) {
    backToBookingDetailWithState(bookingId, "error", "Kategori catatan internal tidak valid.", formData)
  }

  const adminSupabase = createAdminClient()
  const { error } = await adminSupabase.from("booking_admin_notes").insert({
    booking_id: bookingId,
    actor_id: adminActor.user.id,
    note,
    note_type: noteType,
    is_pinned: isPinned,
  })

  if (error) {
    backToBookingDetailWithState(bookingId, "error", error.message, formData)
  }

  await createAdminAuditLog({
    actorId: adminActor.user.id,
    actorRole: adminActor.role,
    targetType: "booking",
    targetId: bookingId,
    action: "note",
    summary: `Admin menambahkan catatan internal untuk booking ${bookingId}`,
    metadata: {
      notePreview: note.slice(0, 120),
      noteType,
      isPinned,
      source: "booking_admin_note",
    },
  })

  const { bookingDetailPath, bookingsPath, auditLogPath } = resolvePortalPaths(portal)
  revalidatePath(`/admin/bookings/${bookingId}`)
  revalidatePath(bookingDetailPath(bookingId))
  revalidatePath("/admin/bookings")
  revalidatePath(bookingsPath)
  revalidatePath("/admin/audit-log")
  revalidatePath(auditLogPath)
  backToBookingDetailWithState(bookingId, "success", "Catatan internal berhasil disimpan.", formData)
}

export async function resolveBookingAdminNote(formData: FormData) {
  const portal = resolvePortal(formData)
  const adminActor = await ensureAdmin(portal)
  const bookingId = String(formData.get("booking_id") || "").trim()
  const noteId = String(formData.get("note_id") || "").trim()

  if (!bookingId) {
    redirect(resolvePortalPaths(portal).bookingsPath)
  }

  if (!noteId) {
    backToBookingDetailWithState(bookingId, "error", "Catatan internal tidak valid.", formData)
  }

  const adminSupabase = createAdminClient()
  const { error } = await adminSupabase
    .from("booking_admin_notes")
    .update({
      is_resolved: true,
      resolved_at: new Date().toISOString(),
      resolved_by_id: adminActor.user.id,
    })
    .eq("id", noteId)
    .eq("booking_id", bookingId)
    .eq("is_resolved", false)

  if (error) {
    backToBookingDetailWithState(bookingId, "error", error.message, formData)
  }

  await createAdminAuditLog({
    actorId: adminActor.user.id,
    actorRole: adminActor.role,
    targetType: "booking",
    targetId: bookingId,
    action: "note_resolved",
    summary: `Admin menyelesaikan catatan internal ${noteId} untuk booking ${bookingId}`,
    metadata: {
      noteId,
      source: "booking_admin_note",
    },
  })

  const { bookingDetailPath, bookingsPath, auditLogPath } = resolvePortalPaths(portal)
  revalidatePath(`/admin/bookings/${bookingId}`)
  revalidatePath(bookingDetailPath(bookingId))
  revalidatePath("/admin/bookings")
  revalidatePath(bookingsPath)
  revalidatePath("/admin/audit-log")
  revalidatePath(auditLogPath)
  backToBookingDetailWithState(bookingId, "success", "Catatan internal berhasil ditandai selesai.", formData)
}

export async function reopenBookingAdminNote(formData: FormData) {
  const portal = resolvePortal(formData)
  const adminActor = await ensureAdmin(portal)
  const bookingId = String(formData.get("booking_id") || "").trim()
  const noteId = String(formData.get("note_id") || "").trim()

  if (!bookingId) {
    redirect(resolvePortalPaths(portal).bookingsPath)
  }

  if (!noteId) {
    backToBookingDetailWithState(bookingId, "error", "Catatan internal tidak valid.", formData)
  }

  const adminSupabase = createAdminClient()
  const { error } = await adminSupabase
    .from("booking_admin_notes")
    .update({
      is_resolved: false,
      resolved_at: null,
      resolved_by_id: null,
    })
    .eq("id", noteId)
    .eq("booking_id", bookingId)
    .eq("is_resolved", true)

  if (error) {
    backToBookingDetailWithState(bookingId, "error", error.message, formData)
  }

  await createAdminAuditLog({
    actorId: adminActor.user.id,
    actorRole: adminActor.role,
    targetType: "booking",
    targetId: bookingId,
    action: "note_reopened",
    summary: `Admin membuka kembali catatan internal ${noteId} untuk booking ${bookingId}`,
    metadata: {
      noteId,
      source: "booking_admin_note",
    },
  })

  const { bookingDetailPath, bookingsPath, auditLogPath } = resolvePortalPaths(portal)
  revalidatePath(`/admin/bookings/${bookingId}`)
  revalidatePath(bookingDetailPath(bookingId))
  revalidatePath("/admin/bookings")
  revalidatePath(bookingsPath)
  revalidatePath("/admin/audit-log")
  revalidatePath(auditLogPath)
  backToBookingDetailWithState(bookingId, "success", "Catatan internal berhasil dibuka kembali.", formData)
}

async function getFlightBookingForAction(bookingId: string, formData: FormData) {
  const adminSupabase = createAdminClient()
  const { data: booking, error: bookingError } = await adminSupabase
    .from("bookings")
    .select("id, booking_code, booking_product_type, payment_status, booking_status, supplier_order_status, supplier_booking_reference, customer_name, customer_email, customer_phone, customer_locale, adult_count, child_count, created_at")
    .eq("id", bookingId)
    .maybeSingle<{
      id: string
      booking_code: string | null
      booking_product_type: string | null
      payment_status: string | null
      booking_status: string | null
      supplier_order_status: string | null
      supplier_booking_reference: string | null
      customer_name: string | null
      customer_email: string | null
      customer_phone: string | null
      customer_locale: string | null
      adult_count: number | null
      child_count: number | null
      created_at: string | null
    }>()

  if (bookingError || !booking) {
    backToBookingDetailWithState(bookingId, "error", "Booking tidak ditemukan.", formData)
  }

  if (booking.booking_product_type !== "flight") {
    backToBookingDetailWithState(bookingId, "error", "Action ini hanya berlaku untuk booking Pesawat.", formData)
  }

  const { data: flightDetail, error: flightDetailError } = await adminSupabase
    .from("flight_booking_details")
    .select(
      "booking_id, lifecycle_status, issue_status, pnr_code, ticket_number, supplier_confirmation_code, fare_reference_id, airline_code, airline_name, flight_number, origin_airport_code, destination_airport_code, trip_type, departure_at, arrival_at, return_at, cabin_class, passenger_count, issue_requested_at",
    )
    .eq("booking_id", bookingId)
    .maybeSingle<{
      booking_id: string
      lifecycle_status: string | null
      issue_status: string | null
      pnr_code: string | null
      ticket_number: string | null
      supplier_confirmation_code: string | null
      fare_reference_id: string | null
      airline_code: string | null
      airline_name: string | null
      flight_number: string | null
      origin_airport_code: string | null
      destination_airport_code: string | null
      trip_type: string | null
      departure_at: string | null
      arrival_at: string | null
      return_at: string | null
      cabin_class: string | null
      passenger_count: number | null
      issue_requested_at: string | null
    }>()

  if (flightDetailError || !flightDetail) {
    backToBookingDetailWithState(bookingId, "error", "Detail Pesawat tidak ditemukan.", formData)
  }

  const { data: supplierOrder } = await adminSupabase
    .from("supplier_orders")
    .select("id, supplier_order_id, supplier_reference, supplier_status, request_payload, response_payload")
    .eq("booking_id", bookingId)
    .eq("product_type", "flight")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<{
      id: string
      supplier_order_id: string | null
      supplier_reference: string | null
      supplier_status: string | null
      request_payload: Record<string, unknown> | null
      response_payload: Record<string, unknown> | null
    }>()

  return {
    adminSupabase,
    booking,
    flightDetail,
    supplierOrder,
  }
}

async function insertSupplierOrderEvent(input: {
  supplierOrderId?: string | null
  actorId: string
  actorRole: string
  eventType: string
  summary: string
  metadata?: Record<string, unknown>
}) {
  if (!input.supplierOrderId) return

  const adminSupabase = createAdminClient()
  await adminSupabase.from("supplier_order_events").insert({
    supplier_order_id: input.supplierOrderId,
    actor_id: input.actorId,
    actor_role: input.actorRole,
    event_type: input.eventType,
    summary: input.summary,
    metadata: input.metadata || {},
  })
}

async function notifyCustomerFlightTicketIssued(input: {
  adminSupabase: ReturnType<typeof createAdminClient>
  supplierOrderId?: string | null
  actorId: string
  actorRole: string
  bookingId: string
  bookingCode: string
  customerName?: string | null
  customerEmail?: string | null
  customerLocale?: string | null
  airlineName?: string | null
  airlineCode?: string | null
  flightNumber?: string | null
  originAirportCode?: string | null
  destinationAirportCode?: string | null
  departureAt?: string | null
  arrivalAt?: string | null
  ticketNumber?: string | null
  pnrCode?: string | null
}) {
  try {
    const emailResult = await sendFlightTicketIssuedEmail({
      bookingCode: input.bookingCode,
      customerName: input.customerName || null,
      customerEmail: input.customerEmail || null,
      locale: input.customerLocale || null,
      airlineName: input.airlineName || null,
      airlineCode: input.airlineCode || null,
      flightNumber: input.flightNumber || null,
      originAirportCode: input.originAirportCode || null,
      destinationAirportCode: input.destinationAirportCode || null,
      departureAt: input.departureAt || null,
      arrivalAt: input.arrivalAt || null,
      ticketNumber: input.ticketNumber || null,
      pnrCode: input.pnrCode || null,
    })

    if (emailResult.skipped) {
      await insertSupplierOrderEvent({
        supplierOrderId: input.supplierOrderId,
        actorId: input.actorId,
        actorRole: input.actorRole,
        eventType: "flight_ticket_email_skipped",
        summary: "Email e-ticket Pesawat dilewati karena konfigurasi email atau email customer belum tersedia.",
        metadata: {
          bookingId: input.bookingId,
          customerEmailPresent: Boolean(input.customerEmail),
        },
      })
      return
    }

    const notifiedAt = new Date().toISOString()
    await input.adminSupabase
      .from("flight_booking_details")
      .update({
        customer_notified_at: notifiedAt,
        updated_at: notifiedAt,
      })
      .eq("booking_id", input.bookingId)

    await insertSupplierOrderEvent({
      supplierOrderId: input.supplierOrderId,
      actorId: input.actorId,
      actorRole: input.actorRole,
      eventType: "flight_ticket_email_sent",
      summary: "Email e-ticket Pesawat berhasil dikirim ke customer.",
      metadata: {
        bookingId: input.bookingId,
        customerEmail: input.customerEmail || null,
        ticketNumber: input.ticketNumber || null,
        pnrCode: input.pnrCode || null,
      },
    })
  } catch (error) {
    await insertSupplierOrderEvent({
      supplierOrderId: input.supplierOrderId,
      actorId: input.actorId,
      actorRole: input.actorRole,
      eventType: "flight_ticket_email_failed",
      summary: "Email e-ticket Pesawat gagal dikirim ke customer.",
      metadata: {
        bookingId: input.bookingId,
        customerEmail: input.customerEmail || null,
        error: error instanceof Error ? error.message : "Unknown email error",
      },
    })
  }
}

function revalidateBookingDetailPaths(bookingId: string, portal: BookingPortal) {
  const { bookingDetailPath, bookingsPath, auditLogPath } = resolvePortalPaths(portal)
  revalidatePath(`/admin/bookings/${bookingId}`)
  revalidatePath(bookingDetailPath(bookingId))
  revalidatePath("/admin/bookings")
  revalidatePath(bookingsPath)
  revalidatePath("/admin/audit-log")
  revalidatePath(auditLogPath)
}

function normalizeDateTimeForDb(value: string | null | undefined) {
  if (!value) return null
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return null
  return parsed.toISOString()
}

export async function markFlightFareRechecked(formData: FormData) {
  const portal = resolvePortal(formData)
  const adminActor = await ensureAdmin(portal)
  const bookingId = String(formData.get("booking_id") || "").trim()
  const fareReferenceId = String(formData.get("fare_reference_id") || "").trim()
  const supplierReference = String(formData.get("supplier_reference") || "").trim().toUpperCase()
  const bookingHoldExpiresAt = normalizeDateTimeForDb(String(formData.get("booking_hold_expires_at") || "").trim())
  const note = String(formData.get("fare_recheck_note") || "").trim()

  if (!bookingId) {
    redirect(resolvePortalPaths(portal).bookingsPath)
  }

  const { adminSupabase, booking, flightDetail, supplierOrder } = await getFlightBookingForAction(bookingId, formData)
  const now = new Date().toISOString()
  const previousSupplierResponsePayload = asJsonRecord(supplierOrder?.response_payload)
  const hasHoldReference = Boolean(supplierReference || bookingHoldExpiresAt)
  const nextLifecycleStatus = "booking_hold_created"
  const nextSupplierStatus = "confirmed"
  const paymentDeadline = getFlightPaymentDeadline(bookingHoldExpiresAt, new Date(now)).toISOString()

  if (String(booking.payment_status || "").toLowerCase() === "paid") {
    backToBookingDetailWithState(bookingId, "error", "Fare recheck tidak perlu dibuka lagi karena payment sudah verified.", formData)
  }

  if (!hasHoldReference) {
    backToBookingDetailWithState(bookingId, "error", "Isi PNR/supplier reference atau batas hold sebelum membuka payment Pesawat.", formData)
  }

  const { error: detailError } = await adminSupabase
    .from("flight_booking_details")
    .update({
      lifecycle_status: nextLifecycleStatus,
      fare_reference_id: fareReferenceId || flightDetail.fare_reference_id || null,
      fare_rechecked_at: now,
      booking_hold_expires_at: bookingHoldExpiresAt,
      pnr_code: supplierReference || flightDetail.pnr_code || null,
      notes: note || flightDetail.fare_reference_id ? note || null : "Fare direcheck admin dan payment gate dibuka.",
      updated_at: now,
    })
    .eq("booking_id", bookingId)

  if (detailError) {
    backToBookingDetailWithState(bookingId, "error", detailError.message, formData)
  }

  const { error: bookingError } = await adminSupabase
    .from("bookings")
    .update({
      supplier_booking_reference: supplierReference || booking.supplier_booking_reference || null,
      supplier_order_status: nextSupplierStatus,
      expiry_time: paymentDeadline,
    })
    .eq("id", bookingId)

  if (bookingError) {
    backToBookingDetailWithState(bookingId, "error", bookingError.message, formData)
  }

  if (supplierOrder?.id) {
    const { error: supplierError } = await adminSupabase
      .from("supplier_orders")
      .update({
        supplier_reference: supplierReference || supplierOrder.supplier_reference || null,
        supplier_status: nextSupplierStatus,
        confirmed_at: hasHoldReference ? now : null,
        response_payload: {
          ...previousSupplierResponsePayload,
          fareRecheck: {
            mode: "admin_gate",
            recheckedAt: now,
            fareReferenceId: fareReferenceId || flightDetail.fare_reference_id || null,
            supplierReference: supplierReference || null,
            bookingHoldExpiresAt,
            lifecycleStatus: nextLifecycleStatus,
            note: note || null,
          },
        },
        last_error: null,
        updated_by: adminActor.user.id,
      })
      .eq("id", supplierOrder.id)

    if (supplierError) {
      backToBookingDetailWithState(bookingId, "error", supplierError.message, formData)
    }
  }

  await insertSupplierOrderEvent({
    supplierOrderId: supplierOrder?.id,
    actorId: adminActor.user.id,
    actorRole: adminActor.role,
    eventType: "flight_fare_rechecked",
    summary: hasHoldReference
      ? "Fare Pesawat direcheck dan booking/hold supplier dicatat."
      : "Fare Pesawat direcheck dan payment gate dibuka.",
    metadata: {
      bookingId,
      lifecycleStatus: nextLifecycleStatus,
      supplierStatus: nextSupplierStatus,
      fareReferenceId: fareReferenceId || flightDetail.fare_reference_id || null,
      supplierReference: supplierReference || null,
      bookingHoldExpiresAt,
    },
  })

  await createAdminAuditLog({
    actorId: adminActor.user.id,
    actorRole: adminActor.role,
    targetType: "booking",
    targetId: bookingId,
    action: "flight_fare_rechecked",
    summary: `Fare Pesawat ${formatBookingCode(booking.booking_code, booking.id)} direcheck admin`,
    metadata: {
      productType: "flight",
      lifecycleStatus: nextLifecycleStatus,
      supplierStatus: nextSupplierStatus,
      fareReferenceId: fareReferenceId || flightDetail.fare_reference_id || null,
      supplierReference: supplierReference || null,
    },
  })

  revalidateBookingDetailPaths(bookingId, portal)
  backToBookingDetailWithState(
    bookingId,
    "success",
    hasHoldReference
      ? "Fare recheck dan booking/hold supplier tercatat. Payment dapat dibuka ke customer."
      : "Fare recheck tercatat. Payment dapat dibuka ke customer.",
    formData,
  )
}

export async function recheckAndHoldDharmawisataFlight(formData: FormData) {
  const portal = resolvePortal(formData)
  const adminActor = await ensureAdmin(portal)
  const bookingId = String(formData.get("booking_id") || "").trim()

  if (!bookingId) {
    redirect(resolvePortalPaths(portal).bookingsPath)
  }

  const { adminSupabase, booking, flightDetail, supplierOrder } = await getFlightBookingForAction(bookingId, formData)
  const lifecycleStatus = String(flightDetail.lifecycle_status || "").toLowerCase()

  if (String(booking.payment_status || "").toLowerCase() === "paid") {
    backToBookingDetailWithState(bookingId, "error", "Hold Dharmawisata tidak dijalankan karena payment sudah verified.", formData)
  }

  if (["booking_hold_created", "pending_payment", "payment_uploaded", "payment_verified", "ticketing", "issued"].includes(lifecycleStatus)) {
    backToBookingDetailWithState(bookingId, "error", "Booking ini sudah melewati gate hold/recheck.", formData)
  }

  if (!supplierOrder?.id) {
    backToBookingDetailWithState(bookingId, "error", "Supplier order Pesawat tidak ditemukan.", formData)
  }

  const customerName = String(booking.customer_name || "").trim()
  const customerEmail = String(booking.customer_email || "").trim()
  const customerPhone = String(booking.customer_phone || "").trim()

  if (!customerName || !customerEmail || !customerPhone) {
    backToBookingDetailWithState(bookingId, "error", "Data kontak customer belum lengkap untuk hold Dharmawisata.", formData)
  }

  const { data: participants } = await adminSupabase
    .from("booking_participants")
    .select("full_name, participant_type")
    .eq("booking_id", bookingId)
    .order("sequence_no", { ascending: true })
    .returns<Array<{ full_name: string | null; participant_type: string | null }>>()

  const previousSupplierResponsePayload = asJsonRecord(supplierOrder.response_payload)
  const requestPayload = asJsonRecord(supplierOrder.request_payload)
  const contactName = splitPersonName(customerName)
  const contactPhone = splitIndonesianPhone(customerPhone)
  const requestPayloadPassengers = buildDharmawisataPassengersFromRequestPayload(requestPayload, customerEmail)
  const dharmawisataPassengers = requestPayloadPassengers.length
    ? requestPayloadPassengers
    : buildDharmawisataPassengersFromParticipants(participants || [], customerName, customerEmail)
  const paxAdult = Math.max(Number(booking.adult_count || flightDetail.passenger_count || dharmawisataPassengers.length || 1), 1)
  const paxChild = Math.max(Number(booking.child_count || 0), 0)
  const airlineAccessCode =
    readNestedString(requestPayload, ["airlineAccessCode", "fareReferenceId"]) ||
    readNestedString(previousSupplierResponsePayload, ["airlineAccessCode"]) ||
    flightDetail.fare_reference_id ||
    null
  const storedSearchKey = readNestedString(requestPayload, ["searchKey"]) || readNestedString(previousSupplierResponsePayload, ["searchKey"])
  const storedDetailSchedule = resolveDharmawisataScheduleReference(
    requestPayload,
    previousSupplierResponsePayload,
    flightDetail.flight_number,
  )
  const storedSupplierFlightClass =
    readNestedString(requestPayload, ["supplierFlightClass"]) ||
    readNestedString(previousSupplierResponsePayload, ["supplierFlightClass"]) ||
    extractFlightClassFromDharmawisataReference(storedDetailSchedule) ||
    flightDetail.cabin_class ||
    "Economy"
  let scheduleLookup: Awaited<ReturnType<typeof findDharmawisataLowFareScheduleForBooking>> | null = null

  try {
    scheduleLookup = await findDharmawisataLowFareScheduleForBooking({
      airlineCode: flightDetail.airline_code,
      flightNumber: flightDetail.flight_number,
      originAirportCode: flightDetail.origin_airport_code,
      destinationAirportCode: flightDetail.destination_airport_code,
      tripType: flightDetail.trip_type,
      departureAt: flightDetail.departure_at,
      returnAt: flightDetail.return_at,
      paxAdult,
      paxChild,
      paxInfant: 0,
    })
  } catch (error) {
    scheduleLookup = {
      ok: false,
      message: error instanceof Error ? error.message : "LowFareSchedule lookup gagal.",
      detailSchedule: null,
      searchKey: null,
      airlineAccessCode: null,
      flightClass: null,
      flightNumber: null,
      departureAt: null,
      arrivalAt: null,
    }
  }

  const detailSchedule = scheduleLookup.ok && scheduleLookup.detailSchedule ? scheduleLookup.detailSchedule : storedDetailSchedule
  const searchKey = scheduleLookup.ok && scheduleLookup.searchKey ? scheduleLookup.searchKey : storedSearchKey
  const resolvedAirlineAccessCode =
    scheduleLookup.ok && scheduleLookup.airlineAccessCode ? scheduleLookup.airlineAccessCode : airlineAccessCode
  const supplierFlightClass = scheduleLookup.ok && scheduleLookup.flightClass ? scheduleLookup.flightClass : storedSupplierFlightClass
  const resolvedFlightNumber = scheduleLookup.ok && scheduleLookup.flightNumber ? scheduleLookup.flightNumber : flightDetail.flight_number
  const resolvedDepartureAt = scheduleLookup.ok && scheduleLookup.departureAt ? scheduleLookup.departureAt : flightDetail.departure_at
  const resolvedArrivalAt = scheduleLookup.ok && scheduleLookup.arrivalAt ? scheduleLookup.arrivalAt : flightDetail.arrival_at

  const holdResult = await createDharmawisataFlightBooking({
    bookingId,
    airlineId: flightDetail.airline_code,
    airlineCode: flightDetail.airline_code,
    flightNumber: resolvedFlightNumber,
    originAirportCode: flightDetail.origin_airport_code,
    destinationAirportCode: flightDetail.destination_airport_code,
    tripType: flightDetail.trip_type,
    departureAt: resolvedDepartureAt,
    arrivalAt: resolvedArrivalAt,
    returnAt: flightDetail.return_at,
    flightClass: supplierFlightClass,
    detailSchedule,
    searchKey,
    airlineAccessCode: resolvedAirlineAccessCode,
    contactTitle: "MR",
    contactFirstName: contactName.firstName,
    contactLastName: contactName.lastName,
    contactCountryCodePhone: contactPhone.countryCode,
    contactAreaCodePhone: contactPhone.areaCode,
    contactRemainingPhoneNo: contactPhone.remainingPhoneNo,
    contactEmail: customerEmail,
    paxAdult,
    paxChild,
    paxInfant: 0,
    passengers: dharmawisataPassengers,
  })

  if (!holdResult.ok) {
    const now = new Date().toISOString()

    await adminSupabase
      .from("supplier_orders")
      .update({
        supplier_status: holdResult.skipped ? supplierOrder.supplier_status || "pending_submission" : "failed",
        response_payload: {
          ...previousSupplierResponsePayload,
          dharmawisataScheduleLookup: summarizeDharmawisataScheduleLookup(scheduleLookup),
          dharmawisataHoldAttempt: holdResult.raw,
        },
        last_error: holdResult.message,
        synced_at: now,
        updated_by: adminActor.user.id,
      })
      .eq("id", supplierOrder.id)

    await insertSupplierOrderEvent({
      supplierOrderId: supplierOrder.id,
      actorId: adminActor.user.id,
      actorRole: adminActor.role,
      eventType: holdResult.skipped ? "flight_booking_hold_skipped" : "flight_booking_hold_failed",
      summary: `Hold Dharmawisata gagal: ${holdResult.message}`,
      metadata: {
        bookingId,
        mode: holdResult.mode,
        skipped: holdResult.skipped,
        message: holdResult.message,
        scheduleLookup: summarizeDharmawisataScheduleLookup(scheduleLookup),
        raw: holdResult.raw,
      },
    })

    await createAdminAuditLog({
      actorId: adminActor.user.id,
      actorRole: adminActor.role,
      targetType: "booking",
      targetId: bookingId,
      action: "flight_dharmawisata_hold_failed",
      summary: `Hold Dharmawisata ${formatBookingCode(booking.booking_code, booking.id)} gagal`,
      metadata: {
        productType: "flight",
        mode: holdResult.mode,
        skipped: holdResult.skipped,
        message: holdResult.message,
        scheduleLookup: summarizeDharmawisataScheduleLookup(scheduleLookup),
      },
    })

    revalidateBookingDetailPaths(bookingId, portal)
    backToBookingDetailWithState(bookingId, "error", `Hold Dharmawisata gagal: ${holdResult.message}`, formData)
  }

  const now = new Date().toISOString()
  const holdExpiresAt = normalizeDateTimeForDb(holdResult.timeLimit)
  const paymentDeadline = getFlightPaymentDeadline(holdExpiresAt, new Date(now)).toISOString()
  const apiSupplierReference = holdResult.referenceNo || holdResult.bookingCodeAirline || null
  const apiBookingCode = holdResult.bookingCode || null

  const { error: supplierError } = await adminSupabase
    .from("supplier_orders")
    .update({
      supplier_order_id: apiBookingCode,
      supplier_reference: apiSupplierReference,
      supplier_status: "confirmed",
      response_payload: {
        ...previousSupplierResponsePayload,
        dharmawisataScheduleLookup: summarizeDharmawisataScheduleLookup(scheduleLookup),
        dharmawisataHold: holdResult.raw,
      },
      last_error: null,
      submitted_at: now,
      confirmed_at: now,
      synced_at: now,
      updated_by: adminActor.user.id,
    })
    .eq("id", supplierOrder.id)

  if (supplierError) {
    backToBookingDetailWithState(bookingId, "error", supplierError.message, formData)
  }

  const { error: bookingError } = await adminSupabase
    .from("bookings")
    .update({
      supplier_booking_reference: apiSupplierReference,
      supplier_order_status: "confirmed",
      expiry_time: paymentDeadline,
    })
    .eq("id", bookingId)

  if (bookingError) {
    backToBookingDetailWithState(bookingId, "error", bookingError.message, formData)
  }

  const { error: detailError } = await adminSupabase
    .from("flight_booking_details")
    .update({
      lifecycle_status: "booking_hold_created",
      pnr_code: holdResult.bookingCodeAirline || flightDetail.pnr_code || null,
      supplier_confirmation_code: holdResult.referenceNo || holdResult.bookingCode || null,
      fare_reference_id: holdResult.airlineAccessCode || resolvedAirlineAccessCode || flightDetail.fare_reference_id || null,
      fare_rechecked_at: now,
      booking_hold_expires_at: holdExpiresAt,
      supplier_raw_reference: holdResult.raw,
      notes: "Hold Dharmawisata berhasil dibuat via admin recheck. Payment gate dapat dibuka.",
      updated_at: now,
    })
    .eq("booking_id", bookingId)

  if (detailError) {
    backToBookingDetailWithState(bookingId, "error", detailError.message, formData)
  }

  await insertSupplierOrderEvent({
    supplierOrderId: supplierOrder.id,
    actorId: adminActor.user.id,
    actorRole: adminActor.role,
    eventType: "flight_booking_hold_created_via_dharmawisata",
    summary: "Admin berhasil membuat booking/hold Pesawat lewat API Dharmawisata.",
    metadata: {
      bookingId,
      lifecycleStatus: "booking_hold_created",
      bookingCode: holdResult.bookingCode,
      bookingDate: holdResult.bookingDate,
      referenceNo: holdResult.referenceNo,
      bookingCodeAirline: holdResult.bookingCodeAirline,
      timeLimit: holdResult.timeLimit,
      scheduleLookup: summarizeDharmawisataScheduleLookup(scheduleLookup),
    },
  })

  await createAdminAuditLog({
    actorId: adminActor.user.id,
    actorRole: adminActor.role,
    targetType: "booking",
    targetId: bookingId,
    action: "flight_dharmawisata_hold_created",
    summary: `Hold Dharmawisata ${formatBookingCode(booking.booking_code, booking.id)} berhasil`,
    metadata: {
      productType: "flight",
      lifecycleStatus: "booking_hold_created",
      supplierStatus: "confirmed",
      bookingCode: holdResult.bookingCode,
      referenceNo: holdResult.referenceNo,
      bookingCodeAirline: holdResult.bookingCodeAirline,
      timeLimit: holdResult.timeLimit,
      scheduleLookup: summarizeDharmawisataScheduleLookup(scheduleLookup),
    },
  })

  revalidateBookingDetailPaths(bookingId, portal)
  backToBookingDetailWithState(bookingId, "success", "Hold Dharmawisata berhasil dibuat. Payment gate sudah siap untuk customer.", formData)
}

export async function verifyFlightPayment(formData: FormData) {
  const portal = resolvePortal(formData)
  const adminActor = await ensureAdmin(portal)
  const bookingId = String(formData.get("booking_id") || "").trim()

  if (!bookingId) {
    redirect(resolvePortalPaths(portal).bookingsPath)
  }

  const { adminSupabase, booking, supplierOrder } = await getFlightBookingForAction(bookingId, formData)
  const now = new Date().toISOString()

  if (String(booking.payment_status || "").toLowerCase() === "paid") {
    backToBookingDetailWithState(bookingId, "success", "Pembayaran Pesawat sudah terverifikasi.", formData)
  }

  const { error: bookingError } = await adminSupabase
    .from("bookings")
    .update({
      payment_status: "paid",
      booking_status: "confirmed",
      escrow_status: "payment_verified",
    })
    .eq("id", bookingId)

  if (bookingError) {
    backToBookingDetailWithState(bookingId, "error", bookingError.message, formData)
  }

  const { error: detailError } = await adminSupabase
    .from("flight_booking_details")
    .update({
      lifecycle_status: "payment_verified",
      updated_at: now,
    })
    .eq("booking_id", bookingId)

  if (detailError) {
    backToBookingDetailWithState(bookingId, "error", detailError.message, formData)
  }

  await insertSupplierOrderEvent({
    supplierOrderId: supplierOrder?.id,
    actorId: adminActor.user.id,
    actorRole: adminActor.role,
    eventType: "flight_payment_verified",
    summary: "Pembayaran bank transfer Pesawat diverifikasi admin.",
    metadata: {
      bookingId,
      paymentStatus: "paid",
      lifecycleStatus: "payment_verified",
    },
  })

  await createAdminAuditLog({
    actorId: adminActor.user.id,
    actorRole: adminActor.role,
    targetType: "booking",
    targetId: bookingId,
    action: "flight_payment_verified",
    summary: `Pembayaran Pesawat ${formatBookingCode(booking.booking_code, booking.id)} diverifikasi`,
    metadata: {
      productType: "flight",
      lifecycleStatus: "payment_verified",
    },
  })

  revalidateBookingDetailPaths(bookingId, portal)
  backToBookingDetailWithState(bookingId, "success", "Pembayaran Pesawat berhasil diverifikasi. Booking siap masuk ticketing.", formData)
}

export async function requestFlightTicketIssue(formData: FormData) {
  const portal = resolvePortal(formData)
  const adminActor = await ensureAdmin(portal)
  const bookingId = String(formData.get("booking_id") || "").trim()

  if (!bookingId) {
    redirect(resolvePortalPaths(portal).bookingsPath)
  }

  const { adminSupabase, booking, flightDetail, supplierOrder } = await getFlightBookingForAction(bookingId, formData)
  const now = new Date().toISOString()
  const previousSupplierResponsePayload = asJsonRecord(supplierOrder?.response_payload)

  if (String(booking.payment_status || "").toLowerCase() !== "paid") {
    backToBookingDetailWithState(bookingId, "error", "Payment harus verified sebelum request ticket issue.", formData)
  }

  const lifecycleStatus = String(flightDetail.lifecycle_status || "").trim().toLowerCase()
  const issueStatus = String(flightDetail.issue_status || "").trim().toLowerCase()
  const ticketingLockIsRecent =
    (lifecycleStatus === "ticketing" || issueStatus === "ticketing") &&
    isRecentTimestamp(flightDetail.issue_requested_at, FLIGHT_TICKET_ISSUE_LOCK_TTL_MS)

  if (lifecycleStatus === "issued" || issueStatus === "issued" || flightDetail.ticket_number) {
    backToBookingDetailWithState(bookingId, "error", "Tiket sudah issued. Issue ulang diblokir untuk mencegah duplicate issue.", formData)
  }

  if (ticketingLockIsRecent) {
    backToBookingDetailWithState(
      bookingId,
      "error",
      "Issue ticket sedang diproses. Tunggu beberapa menit sebelum retry agar tidak terjadi duplicate issue.",
      formData,
    )
  }

  const lockableStatuses = ["payment_verified", "issue_failed"]
  const lockQuery = adminSupabase
    .from("flight_booking_details")
    .update({
      lifecycle_status: "ticketing",
      issue_status: "ticketing",
      issue_requested_at: now,
      updated_at: now,
    })
    .eq("booking_id", bookingId)
    .select("booking_id")

  const staleTicketingCutoff = new Date(Date.now() - FLIGHT_TICKET_ISSUE_LOCK_TTL_MS).toISOString()
  const lockResult =
    lifecycleStatus === "ticketing" || issueStatus === "ticketing"
      ? await lockQuery.lte("issue_requested_at", staleTicketingCutoff).maybeSingle<{ booking_id: string }>()
      : await lockQuery.in("lifecycle_status", lockableStatuses).maybeSingle<{ booking_id: string }>()

  if (lockResult.error) {
    backToBookingDetailWithState(bookingId, "error", lockResult.error.message, formData)
  }

  if (!lockResult.data) {
    backToBookingDetailWithState(
      bookingId,
      "error",
      "Issue ticket tidak dijalankan karena status booking sudah berubah. Refresh halaman lalu cek status terbaru.",
      formData,
    )
  }

  if (supplierOrder?.id) {
    const { error: supplierError } = await adminSupabase
      .from("supplier_orders")
      .update({
        supplier_status: "submitted",
        submitted_at: now,
        response_payload: {
          ...previousSupplierResponsePayload,
          issueRequest: {
            issueRequestMode: "admin_gate",
            requestedAt: now,
            note: "Ready for Dharmawisata ticket issue after payment verification.",
          },
        },
        updated_by: adminActor.user.id,
      })
      .eq("id", supplierOrder.id)

    if (supplierError) {
      backToBookingDetailWithState(bookingId, "error", supplierError.message, formData)
    }
  }

  const issueResult = await issueDharmawisataFlightTicket({
    bookingId,
    bookingCode: booking.booking_code,
    bookingDate: readNestedString(supplierOrder?.response_payload, ["bookingDate"]) || booking.created_at,
    supplierOrderId: supplierOrder?.supplier_order_id || supplierOrder?.id || null,
    supplierReference:
      supplierOrder?.supplier_reference ||
      flightDetail.supplier_confirmation_code ||
      booking.supplier_booking_reference ||
      supplierOrder?.supplier_order_id ||
      null,
    pnrCode: flightDetail.pnr_code,
    airlineId: flightDetail.airline_code,
    fareReferenceId: flightDetail.fare_reference_id,
    airlineAccessCode: readNestedString(supplierOrder?.response_payload, ["airlineAccessCode"]) || flightDetail.fare_reference_id,
    originAirportCode: flightDetail.origin_airport_code,
    destinationAirportCode: flightDetail.destination_airport_code,
    tripType: flightDetail.trip_type,
    departureAt: flightDetail.departure_at,
    returnAt: flightDetail.return_at,
    passengerCount: flightDetail.passenger_count,
  })

  if (issueResult.skipped) {
    await insertSupplierOrderEvent({
      supplierOrderId: supplierOrder?.id,
      actorId: adminActor.user.id,
      actorRole: adminActor.role,
      eventType: "flight_ticket_issue_requested",
      summary: "Admin meminta proses issue tiket Pesawat.",
      metadata: {
        bookingId,
        lifecycleStatus: "ticketing",
        issueStatus: "ticketing",
        requestedAt: now,
        issueMode: issueResult.mode,
        message: issueResult.message,
      },
    })

    await createAdminAuditLog({
      actorId: adminActor.user.id,
      actorRole: adminActor.role,
      targetType: "booking",
      targetId: bookingId,
      action: "flight_ticket_issue_requested",
      summary: `Issue tiket Pesawat ${formatBookingCode(booking.booking_code, booking.id)} diminta`,
      metadata: {
        productType: "flight",
        lifecycleStatus: "ticketing",
        issueStatus: "ticketing",
        issueMode: issueResult.mode,
        message: issueResult.message,
      },
    })

    revalidateBookingDetailPaths(bookingId, portal)
    backToBookingDetailWithState(
      bookingId,
      "success",
      "Request ticket issue tercatat. Endpoint issue Dharmawisata belum dikonfigurasi, lanjutkan proses manual.",
      formData,
    )
  }

  if (issueResult.ok) {
    const issuedAt = new Date().toISOString()
    const ticketNumber = issueResult.ticketNumber || flightDetail.ticket_number || null
    const pnrCode = issueResult.pnrCode || flightDetail.pnr_code || null

    const { error: issuedDetailError } = await adminSupabase
      .from("flight_booking_details")
      .update({
        lifecycle_status: "issued",
        issue_status: "issued",
        ticket_number: ticketNumber,
        pnr_code: pnrCode,
        issued_at: issuedAt,
        updated_at: issuedAt,
      })
      .eq("booking_id", bookingId)

    if (issuedDetailError) {
      backToBookingDetailWithState(bookingId, "error", issuedDetailError.message, formData)
    }

    const { error: issuedBookingError } = await adminSupabase
      .from("bookings")
      .update({
        booking_status: "confirmed",
        supplier_order_status: "issued",
      })
      .eq("id", bookingId)

    if (issuedBookingError) {
      backToBookingDetailWithState(bookingId, "error", issuedBookingError.message, formData)
    }

    if (supplierOrder?.id) {
      const { error: issuedSupplierError } = await adminSupabase
        .from("supplier_orders")
        .update({
          supplier_status: "issued",
          response_payload: {
            ...previousSupplierResponsePayload,
            issueResult: issueResult.raw,
          },
          last_error: null,
          synced_at: issuedAt,
          updated_by: adminActor.user.id,
        })
        .eq("id", supplierOrder.id)

      if (issuedSupplierError) {
        backToBookingDetailWithState(bookingId, "error", issuedSupplierError.message, formData)
      }
    }

    await insertSupplierOrderEvent({
      supplierOrderId: supplierOrder?.id,
      actorId: adminActor.user.id,
      actorRole: adminActor.role,
      eventType: "flight_ticket_issued_via_dharmawisata",
      summary: "Tiket Pesawat berhasil issued lewat API Dharmawisata.",
      metadata: {
        bookingId,
        lifecycleStatus: "issued",
        issueStatus: "issued",
        ticketNumber,
        pnrCode,
        message: issueResult.message,
      },
    })

    await createAdminAuditLog({
      actorId: adminActor.user.id,
      actorRole: adminActor.role,
      targetType: "booking",
      targetId: bookingId,
      action: "flight_ticket_issued_via_dharmawisata",
      summary: `Tiket Pesawat ${formatBookingCode(booking.booking_code, booking.id)} issued lewat Dharmawisata`,
      metadata: {
        productType: "flight",
        lifecycleStatus: "issued",
        issueStatus: "issued",
        ticketNumber,
        pnrCode,
        message: issueResult.message,
      },
    })

    await notifyCustomerFlightTicketIssued({
      adminSupabase,
      supplierOrderId: supplierOrder?.id,
      actorId: adminActor.user.id,
      actorRole: adminActor.role,
      bookingId,
      bookingCode: formatBookingCode(booking.booking_code, booking.id),
      customerName: booking.customer_name,
      customerEmail: booking.customer_email,
      customerLocale: booking.customer_locale,
      airlineName: flightDetail.airline_name,
      airlineCode: flightDetail.airline_code,
      flightNumber: flightDetail.flight_number,
      originAirportCode: flightDetail.origin_airport_code,
      destinationAirportCode: flightDetail.destination_airport_code,
      departureAt: flightDetail.departure_at,
      arrivalAt: flightDetail.arrival_at,
      ticketNumber,
      pnrCode,
    })

    revalidateBookingDetailPaths(bookingId, portal)
    backToBookingDetailWithState(bookingId, "success", "Issue tiket Dharmawisata berhasil. Booking sudah ditandai issued dan e-ticket dikirim bila email tersedia.", formData)
  }

  const failedAt = new Date().toISOString()
  const failureMessage = issueResult.message || "Issue tiket Dharmawisata gagal."

  const { error: failedDetailError } = await adminSupabase
    .from("flight_booking_details")
    .update({
      lifecycle_status: "issue_failed",
      issue_status: "issue_failed",
      issue_failed_at: failedAt,
      notes: failureMessage,
      updated_at: failedAt,
    })
    .eq("booking_id", bookingId)

  if (failedDetailError) {
    backToBookingDetailWithState(bookingId, "error", failedDetailError.message, formData)
  }

  const { error: failedBookingError } = await adminSupabase
    .from("bookings")
    .update({
      booking_status: "confirmed",
      supplier_order_status: "failed",
    })
    .eq("id", bookingId)

  if (failedBookingError) {
    backToBookingDetailWithState(bookingId, "error", failedBookingError.message, formData)
  }

  if (supplierOrder?.id) {
    const { error: failedSupplierError } = await adminSupabase
      .from("supplier_orders")
      .update({
        supplier_status: "failed",
        response_payload: {
          ...previousSupplierResponsePayload,
          issueResult: issueResult.raw,
        },
        last_error: failureMessage,
        synced_at: failedAt,
        updated_by: adminActor.user.id,
      })
      .eq("id", supplierOrder.id)

    if (failedSupplierError) {
      backToBookingDetailWithState(bookingId, "error", failedSupplierError.message, formData)
    }
  }

  await insertSupplierOrderEvent({
    supplierOrderId: supplierOrder?.id,
    actorId: adminActor.user.id,
    actorRole: adminActor.role,
    eventType: "flight_ticket_issue_failed",
    summary: "Issue tiket Pesawat lewat API Dharmawisata gagal.",
    metadata: {
      bookingId,
      lifecycleStatus: "issue_failed",
      issueStatus: "issue_failed",
      message: failureMessage,
    },
  })

  await createFlightIssueFailedAdminAlert({
    adminSupabase,
    booking,
    actorId: adminActor.user.id,
    failureMessage,
    source: "dharmawisata_issue",
  })

  await createAdminAuditLog({
    actorId: adminActor.user.id,
    actorRole: adminActor.role,
    targetType: "booking",
    targetId: bookingId,
    action: "flight_ticket_issue_failed",
    summary: `Issue tiket Pesawat ${formatBookingCode(booking.booking_code, booking.id)} gagal lewat Dharmawisata`,
    metadata: {
      productType: "flight",
      lifecycleStatus: "issue_failed",
      issueStatus: "issue_failed",
      message: failureMessage,
    },
  })

  revalidateBookingDetailPaths(bookingId, portal)
  backToBookingDetailWithState(bookingId, "error", `Issue tiket Dharmawisata gagal: ${failureMessage}`, formData)
}

export async function retryAutoIssueFlightTicket(formData: FormData) {
  const portal = resolvePortal(formData)
  const adminActor = await ensureAdmin(portal)
  const bookingId = String(formData.get("booking_id") || "").trim()

  if (!bookingId) {
    redirect(resolvePortalPaths(portal).bookingsPath)
  }

  const { adminSupabase, booking, flightDetail } = await getFlightBookingForAction(bookingId, formData)
  const lifecycleStatus = String(flightDetail.lifecycle_status || "").trim().toLowerCase()
  const issueStatus = String(flightDetail.issue_status || "").trim().toLowerCase()

  if (String(booking.payment_status || "").trim().toLowerCase() !== "paid") {
    backToBookingDetailWithState(bookingId, "error", "Retry auto issue hanya bisa dijalankan setelah payment verified.", formData)
  }

  if (lifecycleStatus === "issued" || issueStatus === "issued" || flightDetail.ticket_number) {
    backToBookingDetailWithState(bookingId, "error", "Tiket sudah issued. Retry auto issue diblokir untuk mencegah duplicate issue.", formData)
  }

  if (lifecycleStatus !== "issue_failed" && issueStatus !== "issue_failed") {
    backToBookingDetailWithState(bookingId, "error", "Retry auto issue hanya tersedia untuk booking dengan status issue failed.", formData)
  }

  const result = await autoIssueFlightTicketAfterPayment(adminSupabase, bookingId)

  await createAdminAuditLog({
    actorId: adminActor.user.id,
    actorRole: adminActor.role,
    targetType: "booking",
    targetId: bookingId,
    action: "flight_auto_issue_retry",
    summary: `Admin menjalankan retry auto issue Pesawat ${formatBookingCode(booking.booking_code, booking.id)}`,
    metadata: {
      productType: "flight",
      status: result.status,
      skipped: result.skipped,
      ok: result.ok,
      message: result.message,
    },
  })

  revalidateBookingDetailPaths(bookingId, portal)

  if (result.ok) {
    backToBookingDetailWithState(bookingId, "success", result.message || "Retry auto issue berhasil. Tiket sudah issued bila supplier mengembalikan nomor tiket.", formData)
  }

  if (result.skipped) {
    backToBookingDetailWithState(bookingId, "error", `Retry auto issue ditahan guard: ${result.message}`, formData)
  }

  backToBookingDetailWithState(bookingId, "error", `Retry auto issue gagal: ${result.message}`, formData)
}

export async function markFlightTicketIssued(formData: FormData) {
  const portal = resolvePortal(formData)
  const adminActor = await ensureAdmin(portal)
  const bookingId = String(formData.get("booking_id") || "").trim()
  const ticketNumber = String(formData.get("ticket_number") || "").trim().toUpperCase()
  const pnrCode = String(formData.get("pnr_code") || "").trim().toUpperCase()

  if (!bookingId) {
    redirect(resolvePortalPaths(portal).bookingsPath)
  }

  const { adminSupabase, booking, flightDetail, supplierOrder } = await getFlightBookingForAction(bookingId, formData)
  const now = new Date().toISOString()

  if (!ticketNumber && !pnrCode) {
    backToBookingDetailWithState(bookingId, "error", "Isi ticket number atau PNR sebelum menandai issued.", formData)
  }

  const { error: detailError } = await adminSupabase
    .from("flight_booking_details")
    .update({
      lifecycle_status: "issued",
      issue_status: "issued",
      ticket_number: ticketNumber || null,
      pnr_code: pnrCode || undefined,
      issued_at: now,
      updated_at: now,
    })
    .eq("booking_id", bookingId)

  if (detailError) {
    backToBookingDetailWithState(bookingId, "error", detailError.message, formData)
  }

  const { error: bookingError } = await adminSupabase
    .from("bookings")
    .update({
      booking_status: "confirmed",
      supplier_order_status: "issued",
    })
    .eq("id", bookingId)

  if (bookingError) {
    backToBookingDetailWithState(bookingId, "error", bookingError.message, formData)
  }

  if (supplierOrder?.id) {
    await adminSupabase
      .from("supplier_orders")
      .update({
        supplier_status: "issued",
        response_payload: {
          issueResultMode: "manual_admin_confirmation",
          issuedAt: now,
          ticketNumber: ticketNumber || null,
          pnrCode: pnrCode || null,
        },
        last_error: null,
        synced_at: now,
        updated_by: adminActor.user.id,
      })
      .eq("id", supplierOrder.id)
  }

  await insertSupplierOrderEvent({
    supplierOrderId: supplierOrder?.id,
    actorId: adminActor.user.id,
    actorRole: adminActor.role,
    eventType: "flight_ticket_issued",
    summary: "Tiket Pesawat ditandai issued.",
    metadata: {
      bookingId,
      lifecycleStatus: "issued",
      issueStatus: "issued",
      ticketNumber: ticketNumber || null,
      pnrCode: pnrCode || null,
    },
  })

  await createAdminAuditLog({
    actorId: adminActor.user.id,
    actorRole: adminActor.role,
    targetType: "booking",
    targetId: bookingId,
    action: "flight_ticket_issued",
    summary: `Tiket Pesawat ${formatBookingCode(booking.booking_code, booking.id)} ditandai issued`,
    metadata: {
      productType: "flight",
      lifecycleStatus: "issued",
      issueStatus: "issued",
      ticketNumber: ticketNumber || null,
      pnrCode: pnrCode || null,
    },
  })

  await notifyCustomerFlightTicketIssued({
    adminSupabase,
    supplierOrderId: supplierOrder?.id,
    actorId: adminActor.user.id,
    actorRole: adminActor.role,
    bookingId,
    bookingCode: formatBookingCode(booking.booking_code, booking.id),
    customerName: booking.customer_name,
    customerEmail: booking.customer_email,
    customerLocale: booking.customer_locale,
    airlineName: flightDetail.airline_name,
    airlineCode: flightDetail.airline_code,
    flightNumber: flightDetail.flight_number,
    originAirportCode: flightDetail.origin_airport_code,
    destinationAirportCode: flightDetail.destination_airport_code,
    departureAt: flightDetail.departure_at,
    arrivalAt: flightDetail.arrival_at,
    ticketNumber: ticketNumber || null,
    pnrCode: pnrCode || null,
  })

  revalidateBookingDetailPaths(bookingId, portal)
  backToBookingDetailWithState(bookingId, "success", "Tiket Pesawat berhasil ditandai issued dan e-ticket dikirim bila email tersedia.", formData)
}

export async function resendFlightTicketEmail(formData: FormData) {
  const portal = resolvePortal(formData)
  const adminActor = await ensureAdmin(portal)
  const bookingId = String(formData.get("booking_id") || "").trim()

  if (!bookingId) {
    redirect(resolvePortalPaths(portal).bookingsPath)
  }

  const { adminSupabase, booking, flightDetail, supplierOrder } = await getFlightBookingForAction(bookingId, formData)
  const lifecycleStatus = String(flightDetail.lifecycle_status || "").toLowerCase()
  const issueStatus = String(flightDetail.issue_status || "").toLowerCase()
  const ticketNumber = flightDetail.ticket_number || null
  const pnrCode = flightDetail.pnr_code || supplierOrder?.supplier_reference || null

  if (lifecycleStatus !== "issued" && issueStatus !== "issued") {
    backToBookingDetailWithState(bookingId, "error", "E-ticket hanya bisa dikirim ulang setelah tiket berstatus issued.", formData)
  }

  if (!ticketNumber && !pnrCode) {
    backToBookingDetailWithState(bookingId, "error", "Ticket number atau PNR belum tersedia untuk dikirim ulang.", formData)
  }

  await notifyCustomerFlightTicketIssued({
    adminSupabase,
    supplierOrderId: supplierOrder?.id,
    actorId: adminActor.user.id,
    actorRole: adminActor.role,
    bookingId,
    bookingCode: formatBookingCode(booking.booking_code, booking.id),
    customerName: booking.customer_name,
    customerEmail: booking.customer_email,
    customerLocale: booking.customer_locale,
    airlineName: flightDetail.airline_name,
    airlineCode: flightDetail.airline_code,
    flightNumber: flightDetail.flight_number,
    originAirportCode: flightDetail.origin_airport_code,
    destinationAirportCode: flightDetail.destination_airport_code,
    departureAt: flightDetail.departure_at,
    arrivalAt: flightDetail.arrival_at,
    ticketNumber,
    pnrCode,
  })

  await createAdminAuditLog({
    actorId: adminActor.user.id,
    actorRole: adminActor.role,
    targetType: "booking",
    targetId: bookingId,
    action: "flight_ticket_email_resent",
    summary: `E-ticket Pesawat ${formatBookingCode(booking.booking_code, booking.id)} dikirim ulang`,
    metadata: {
      productType: "flight",
      lifecycleStatus,
      issueStatus,
      ticketNumber,
      pnrCode,
      customerEmail: booking.customer_email || null,
    },
  })

  revalidateBookingDetailPaths(bookingId, portal)
  backToBookingDetailWithState(bookingId, "success", "Permintaan resend e-ticket diproses. Cek event supplier untuk status email terkirim/skipped/gagal.", formData)
}

export async function markFlightIssueFailed(formData: FormData) {
  const portal = resolvePortal(formData)
  const adminActor = await ensureAdmin(portal)
  const bookingId = String(formData.get("booking_id") || "").trim()
  const reason = String(formData.get("issue_failed_reason") || "").trim()

  if (!bookingId) {
    redirect(resolvePortalPaths(portal).bookingsPath)
  }

  if (!reason) {
    backToBookingDetailWithState(bookingId, "error", "Alasan issue gagal wajib diisi.", formData)
  }

  const { adminSupabase, booking, supplierOrder } = await getFlightBookingForAction(bookingId, formData)
  const now = new Date().toISOString()

  const { error: detailError } = await adminSupabase
    .from("flight_booking_details")
    .update({
      lifecycle_status: "issue_failed",
      issue_status: "issue_failed",
      issue_failed_at: now,
      notes: reason,
      updated_at: now,
    })
    .eq("booking_id", bookingId)

  if (detailError) {
    backToBookingDetailWithState(bookingId, "error", detailError.message, formData)
  }

  const { error: bookingError } = await adminSupabase
    .from("bookings")
    .update({
      booking_status: "confirmed",
      supplier_order_status: "failed",
    })
    .eq("id", bookingId)

  if (bookingError) {
    backToBookingDetailWithState(bookingId, "error", bookingError.message, formData)
  }

  if (supplierOrder?.id) {
    await adminSupabase
      .from("supplier_orders")
      .update({
        supplier_status: "failed",
        last_error: reason,
        response_payload: {
          issueResultMode: "manual_admin_failure",
          failedAt: now,
          reason,
        },
        synced_at: now,
        updated_by: adminActor.user.id,
      })
      .eq("id", supplierOrder.id)
  }

  await insertSupplierOrderEvent({
    supplierOrderId: supplierOrder?.id,
    actorId: adminActor.user.id,
    actorRole: adminActor.role,
    eventType: "flight_ticket_issue_failed",
    summary: "Issue tiket Pesawat gagal dan perlu follow up.",
    metadata: {
      bookingId,
      lifecycleStatus: "issue_failed",
      issueStatus: "issue_failed",
      reason,
    },
  })

  await createFlightIssueFailedAdminAlert({
    adminSupabase,
    booking,
    actorId: adminActor.user.id,
    failureMessage: reason,
    source: "manual_mark_failed",
  })

  await createAdminAuditLog({
    actorId: adminActor.user.id,
    actorRole: adminActor.role,
    targetType: "booking",
    targetId: bookingId,
    action: "flight_ticket_issue_failed",
    summary: `Issue tiket Pesawat ${formatBookingCode(booking.booking_code, booking.id)} gagal`,
    metadata: {
      productType: "flight",
      lifecycleStatus: "issue_failed",
      issueStatus: "issue_failed",
      reason,
    },
  })

  revalidateBookingDetailPaths(bookingId, portal)
  backToBookingDetailWithState(bookingId, "success", "Issue gagal tercatat. Booking masuk follow up/refund manual.", formData)
}
