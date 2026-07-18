import type { SupabaseClient } from "@supabase/supabase-js"
import { issueDharmawisataFlightTicket } from "@/lib/flights/dharmawisataTicketIssue"
import { getFlightAutomationPolicy } from "@/lib/flights/automationPolicy"
import { sendFlightTicketIssuedEmail } from "@/lib/flights/flightTicketEmail"
import { formatBookingCode } from "@/lib/merchant-code"

type JsonRecord = Record<string, unknown>

type AutoIssueResult = {
  ok: boolean
  skipped: boolean
  status: "issued" | "skipped" | "failed"
  message: string
}

function normalizeStatus(value: string | null | undefined) {
  return String(value || "").trim().toLowerCase()
}

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as JsonRecord) : {}
}

function readNestedString(value: unknown, keys: string[]): string {
  const record = asRecord(value)
  for (const key of keys) {
    const direct = record[key]
    if (typeof direct === "string" && direct.trim()) return direct.trim()
  }

  for (const child of Object.values(record)) {
    if (Array.isArray(child)) {
      for (const item of child) {
        const found: string = readNestedString(item, keys)
        if (found) return found
      }
      continue
    }

    if (child && typeof child === "object") {
      const found: string = readNestedString(child, keys)
      if (found) return found
    }
  }

  return ""
}

async function insertSupplierOrderEvent(
  supabase: SupabaseClient,
  input: {
    supplierOrderId?: string | null
    eventType: string
    summary: string
    metadata?: JsonRecord
  },
) {
  if (!input.supplierOrderId) return

  await supabase.from("supplier_order_events").insert({
    supplier_order_id: input.supplierOrderId,
    actor_id: null,
    actor_role: "system",
    event_type: input.eventType,
    summary: input.summary,
    metadata: input.metadata || {},
  })
}

async function notifyCustomer(supabase: SupabaseClient, input: {
  supplierOrderId?: string | null
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
      await insertSupplierOrderEvent(supabase, {
        supplierOrderId: input.supplierOrderId,
        eventType: "flight_ticket_email_skipped",
        summary: "Auto-pilot melewati email e-ticket karena konfigurasi email atau email customer belum tersedia.",
        metadata: {
          bookingId: input.bookingId,
          customerEmailPresent: Boolean(input.customerEmail),
        },
      })
      return
    }

    const notifiedAt = new Date().toISOString()
    await supabase
      .from("flight_booking_details")
      .update({
        customer_notified_at: notifiedAt,
        updated_at: notifiedAt,
      })
      .eq("booking_id", input.bookingId)

    await insertSupplierOrderEvent(supabase, {
      supplierOrderId: input.supplierOrderId,
      eventType: "flight_ticket_email_sent",
      summary: "Auto-pilot berhasil mengirim e-ticket Pesawat ke customer.",
      metadata: {
        bookingId: input.bookingId,
        customerEmail: input.customerEmail || null,
        ticketNumber: input.ticketNumber || null,
        pnrCode: input.pnrCode || null,
      },
    })
  } catch (error) {
    await insertSupplierOrderEvent(supabase, {
      supplierOrderId: input.supplierOrderId,
      eventType: "flight_ticket_email_failed",
      summary: "Auto-pilot gagal mengirim e-ticket Pesawat ke customer.",
      metadata: {
        bookingId: input.bookingId,
        customerEmail: input.customerEmail || null,
        error: error instanceof Error ? error.message : "Unknown email error",
      },
    })
  }
}

export async function autoIssueFlightTicketAfterPayment(
  supabase: SupabaseClient,
  bookingId: string,
): Promise<AutoIssueResult> {
  const { data: booking, error: bookingError } = await supabase
    .from("bookings")
    .select("id, booking_code, booking_product_type, payment_status, supplier_booking_reference, supplier_order_status, customer_name, customer_email, customer_locale, created_at")
    .eq("id", bookingId)
    .maybeSingle<{
      id: string
      booking_code: string | null
      booking_product_type: string | null
      payment_status: string | null
      supplier_booking_reference: string | null
      supplier_order_status: string | null
      customer_name: string | null
      customer_email: string | null
      customer_locale: string | null
      created_at: string | null
    }>()

  if (bookingError || !booking) {
    return { ok: false, skipped: true, status: "skipped", message: bookingError?.message || "Booking tidak ditemukan." }
  }

  if (normalizeStatus(booking.booking_product_type) !== "flight" || normalizeStatus(booking.payment_status) !== "paid") {
    return { ok: false, skipped: true, status: "skipped", message: "Booking bukan flight paid." }
  }

  const { data: flightDetail } = await supabase
    .from("flight_booking_details")
    .select("booking_id, lifecycle_status, issue_status, pnr_code, ticket_number, supplier_confirmation_code, fare_reference_id, airline_code, airline_name, flight_number, origin_airport_code, destination_airport_code, trip_type, departure_at, arrival_at, return_at, cabin_class, passenger_count, issue_requested_at")
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

  if (!flightDetail) {
    return { ok: false, skipped: true, status: "skipped", message: "Detail pesawat tidak ditemukan." }
  }

  const { data: supplierOrder } = await supabase
    .from("supplier_orders")
    .select("id, supplier_id, supplier_order_id, supplier_reference, supplier_status, response_payload, suppliers(supplier_code, integration_mode)")
    .eq("booking_id", bookingId)
    .eq("product_type", "flight")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<{
      id: string
      supplier_id: string
      supplier_order_id: string | null
      supplier_reference: string | null
      supplier_status: string | null
      response_payload: unknown
      suppliers?: { supplier_code?: string | null; integration_mode?: string | null } | null
    }>()

  const policy = getFlightAutomationPolicy({
    airlineCode: flightDetail.airline_code,
    airlineName: flightDetail.airline_name,
    supplierCode: supplierOrder?.suppliers?.supplier_code,
    integrationMode: supplierOrder?.suppliers?.integration_mode,
  })

  if (!policy.autoIssueAfterPayment) {
    await insertSupplierOrderEvent(supabase, {
      supplierOrderId: supplierOrder?.id,
      eventType: "flight_auto_issue_skipped_policy",
      summary: "Auto-pilot tidak menjalankan issue karena policy membutuhkan manual review.",
      metadata: { bookingId, policy },
    })
    return { ok: false, skipped: true, status: "skipped", message: policy.reason }
  }

  const lifecycleStatus = normalizeStatus(flightDetail.lifecycle_status)
  const issueStatus = normalizeStatus(flightDetail.issue_status)

  if (lifecycleStatus === "issued" || issueStatus === "issued" || flightDetail.ticket_number) {
    return { ok: true, skipped: true, status: "issued", message: "Tiket sudah issued." }
  }

  const now = new Date().toISOString()
  const { data: locked, error: lockError } = await supabase
    .from("flight_booking_details")
    .update({
      lifecycle_status: "ticketing",
      issue_status: "ticketing",
      issue_requested_at: now,
      updated_at: now,
    })
    .eq("booking_id", bookingId)
    .in("lifecycle_status", ["payment_verified", "issue_failed"])
    .select("booking_id")
    .maybeSingle<{ booking_id: string }>()

  if (lockError) {
    return { ok: false, skipped: false, status: "failed", message: lockError.message }
  }

  if (!locked) {
    await insertSupplierOrderEvent(supabase, {
      supplierOrderId: supplierOrder?.id,
      eventType: "flight_auto_issue_skipped_status",
      summary: "Auto-pilot tidak menjalankan issue karena status booking sudah berubah.",
      metadata: { bookingId, lifecycleStatus, issueStatus },
    })
    return { ok: false, skipped: true, status: "skipped", message: "Status booking tidak siap auto-issue." }
  }

  const previousResponsePayload = asRecord(supplierOrder?.response_payload)

  if (supplierOrder?.id) {
    await supabase
      .from("supplier_orders")
      .update({
        supplier_status: "submitted",
        submitted_at: now,
        response_payload: {
          ...previousResponsePayload,
          issueRequest: {
            issueRequestMode: "auto_pilot_after_payment",
            requestedAt: now,
            policy,
          },
        },
      })
      .eq("id", supplierOrder.id)
  }

  await insertSupplierOrderEvent(supabase, {
    supplierOrderId: supplierOrder?.id,
    eventType: "flight_auto_issue_started",
    summary: "Auto-pilot menjalankan issue tiket setelah payment verified.",
    metadata: { bookingId, policy },
  })

  const issueResult = await issueDharmawisataFlightTicket({
    bookingId,
    bookingCode:
      readNestedString(supplierOrder?.response_payload, ["bookingCode"]) ||
      supplierOrder?.supplier_order_id ||
      booking.booking_code,
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
    await insertSupplierOrderEvent(supabase, {
      supplierOrderId: supplierOrder?.id,
      eventType: "flight_auto_issue_manual_required",
      summary: "Auto-pilot mencatat ticketing, tetapi endpoint issue belum siap.",
      metadata: { bookingId, message: issueResult.message, mode: issueResult.mode },
    })
    return { ok: false, skipped: true, status: "skipped", message: issueResult.message }
  }

  if (issueResult.ok) {
    const issuedAt = new Date().toISOString()
    const ticketNumber = issueResult.ticketNumber || flightDetail.ticket_number || null
    const pnrCode = issueResult.pnrCode || flightDetail.pnr_code || null

    await supabase
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

    await supabase
      .from("bookings")
      .update({
        booking_status: "confirmed",
        supplier_order_status: "issued",
      })
      .eq("id", bookingId)

    if (supplierOrder?.id) {
      await supabase
        .from("supplier_orders")
        .update({
          supplier_status: "issued",
          response_payload: {
            ...previousResponsePayload,
            issueResult: issueResult.raw,
          },
          last_error: null,
          synced_at: issuedAt,
        })
        .eq("id", supplierOrder.id)
    }

    await insertSupplierOrderEvent(supabase, {
      supplierOrderId: supplierOrder?.id,
      eventType: "flight_ticket_issued_auto_pilot",
      summary: "Tiket Pesawat berhasil issued otomatis lewat API Dharmawisata.",
      metadata: { bookingId, ticketNumber, pnrCode, message: issueResult.message },
    })

    await notifyCustomer(supabase, {
      supplierOrderId: supplierOrder?.id,
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

    return { ok: true, skipped: false, status: "issued", message: issueResult.message }
  }

  const failedAt = new Date().toISOString()
  const failureMessage = issueResult.message || "Issue tiket Dharmawisata gagal."

  await supabase
    .from("flight_booking_details")
    .update({
      lifecycle_status: "issue_failed",
      issue_status: "issue_failed",
      issue_failed_at: failedAt,
      notes: failureMessage,
      updated_at: failedAt,
    })
    .eq("booking_id", bookingId)

  if (supplierOrder?.id) {
    await supabase
      .from("supplier_orders")
      .update({
        supplier_status: "failed",
        response_payload: {
          ...previousResponsePayload,
          issueResult: issueResult.raw,
        },
        last_error: failureMessage,
        synced_at: failedAt,
      })
      .eq("id", supplierOrder.id)
  }

  await insertSupplierOrderEvent(supabase, {
    supplierOrderId: supplierOrder?.id,
    eventType: "flight_auto_issue_failed",
    summary: "Auto-pilot gagal issue tiket Pesawat. Admin perlu follow up.",
    metadata: { bookingId, message: failureMessage, raw: issueResult.raw },
  })

  return { ok: false, skipped: false, status: "failed", message: failureMessage }
}
