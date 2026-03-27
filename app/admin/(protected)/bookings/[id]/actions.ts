"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { createAdminAuditLog } from "@/lib/admin-audit"
import { isAdminExecutionRole } from "@/lib/internal-roles"

async function ensureAdmin() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/admin/login")
  }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
  if (!profile || !isAdminExecutionRole(profile.role)) {
    redirect("/admin/login")
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

function backToBookingDetailWithState(bookingId: string, type: "success" | "error", message: string, formData: FormData): never {
  const params = readBookingDetailFilters(formData)
  params.set(type, message)
  redirect(`/admin/bookings/${bookingId}?${params.toString()}`)
}

export async function addBookingAdminNote(formData: FormData) {
  const adminActor = await ensureAdmin()
  const bookingId = String(formData.get("booking_id") || "").trim()
  const note = String(formData.get("note") || "").trim()
  const noteType = String(formData.get("note_type") || "general").trim().toLowerCase()
  const isPinned = String(formData.get("is_pinned") || "").trim() === "true"
  const allowedNoteTypes = ["general", "urgent", "follow_up_merchant", "follow_up_payment", "finance_issue"]

  if (!bookingId) {
    redirect("/admin/bookings")
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

  revalidatePath(`/admin/bookings/${bookingId}`)
  revalidatePath("/admin/bookings")
  revalidatePath("/admin/audit-log")
  backToBookingDetailWithState(bookingId, "success", "Catatan internal berhasil disimpan.", formData)
}

export async function resolveBookingAdminNote(formData: FormData) {
  const adminActor = await ensureAdmin()
  const bookingId = String(formData.get("booking_id") || "").trim()
  const noteId = String(formData.get("note_id") || "").trim()

  if (!bookingId) {
    redirect("/admin/bookings")
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

  revalidatePath(`/admin/bookings/${bookingId}`)
  revalidatePath("/admin/bookings")
  revalidatePath("/admin/audit-log")
  backToBookingDetailWithState(bookingId, "success", "Catatan internal berhasil ditandai selesai.", formData)
}

export async function reopenBookingAdminNote(formData: FormData) {
  const adminActor = await ensureAdmin()
  const bookingId = String(formData.get("booking_id") || "").trim()
  const noteId = String(formData.get("note_id") || "").trim()

  if (!bookingId) {
    redirect("/admin/bookings")
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

  revalidatePath(`/admin/bookings/${bookingId}`)
  revalidatePath("/admin/bookings")
  revalidatePath("/admin/audit-log")
  backToBookingDetailWithState(bookingId, "success", "Catatan internal berhasil dibuka kembali.", formData)
}
