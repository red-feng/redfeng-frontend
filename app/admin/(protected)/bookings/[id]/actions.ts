"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { createAdminAuditLog } from "@/lib/admin-audit"
import { isAdminExecutionRole } from "@/lib/internal-roles"
import { formatBookingCode } from "@/lib/merchant-code"
import { issueDharmawisataFlightTicket } from "@/lib/flights/dharmawisataTicketIssue"

type BookingPortal = "admin" | "superadmin"

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

function asJsonRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {}
}

function backToBookingDetailWithState(bookingId: string, type: "success" | "error", message: string, formData: FormData): never {
  const portal = resolvePortal(formData)
  const { bookingDetailPath } = resolvePortalPaths(portal)
  const params = readBookingDetailFilters(formData)
  params.set(type, message)
  redirect(`${bookingDetailPath(bookingId)}?${params.toString()}`)
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
    .select("id, booking_code, booking_product_type, payment_status, booking_status, supplier_order_status, supplier_booking_reference, created_at")
    .eq("id", bookingId)
    .maybeSingle<{
      id: string
      booking_code: string | null
      booking_product_type: string | null
      payment_status: string | null
      booking_status: string | null
      supplier_order_status: string | null
      supplier_booking_reference: string | null
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
      "booking_id, lifecycle_status, issue_status, pnr_code, ticket_number, supplier_confirmation_code, fare_reference_id, airline_code, origin_airport_code, destination_airport_code, trip_type, departure_at, return_at, passenger_count",
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
      origin_airport_code: string | null
      destination_airport_code: string | null
      trip_type: string | null
      departure_at: string | null
      return_at: string | null
      passenger_count: number | null
    }>()

  if (flightDetailError || !flightDetail) {
    backToBookingDetailWithState(bookingId, "error", "Detail Pesawat tidak ditemukan.", formData)
  }

  const { data: supplierOrder } = await adminSupabase
    .from("supplier_orders")
    .select("id, supplier_order_id, supplier_reference, supplier_status, response_payload")
    .eq("booking_id", bookingId)
    .eq("product_type", "flight")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<{
      id: string
      supplier_order_id: string | null
      supplier_reference: string | null
      supplier_status: string | null
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

function revalidateBookingDetailPaths(bookingId: string, portal: BookingPortal) {
  const { bookingDetailPath, bookingsPath, auditLogPath } = resolvePortalPaths(portal)
  revalidatePath(`/admin/bookings/${bookingId}`)
  revalidatePath(bookingDetailPath(bookingId))
  revalidatePath("/admin/bookings")
  revalidatePath(bookingsPath)
  revalidatePath("/admin/audit-log")
  revalidatePath(auditLogPath)
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
      booking_status: "payment_verified",
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

  const { error: detailError } = await adminSupabase
    .from("flight_booking_details")
    .update({
      lifecycle_status: "ticketing",
      issue_status: "ticketing",
      issue_requested_at: now,
      updated_at: now,
    })
    .eq("booking_id", bookingId)

  if (detailError) {
    backToBookingDetailWithState(bookingId, "error", detailError.message, formData)
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
        booking_status: "issued",
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

    revalidateBookingDetailPaths(bookingId, portal)
    backToBookingDetailWithState(bookingId, "success", "Issue tiket Dharmawisata berhasil. Booking sudah ditandai issued.", formData)
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
      booking_status: "issue_failed",
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

export async function markFlightTicketIssued(formData: FormData) {
  const portal = resolvePortal(formData)
  const adminActor = await ensureAdmin(portal)
  const bookingId = String(formData.get("booking_id") || "").trim()
  const ticketNumber = String(formData.get("ticket_number") || "").trim().toUpperCase()
  const pnrCode = String(formData.get("pnr_code") || "").trim().toUpperCase()

  if (!bookingId) {
    redirect(resolvePortalPaths(portal).bookingsPath)
  }

  const { adminSupabase, booking, supplierOrder } = await getFlightBookingForAction(bookingId, formData)
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
      booking_status: "issued",
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

  revalidateBookingDetailPaths(bookingId, portal)
  backToBookingDetailWithState(bookingId, "success", "Tiket Pesawat berhasil ditandai issued.", formData)
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
      booking_status: "issue_failed",
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
