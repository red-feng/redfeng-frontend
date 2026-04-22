"use server"

import { redirect } from "next/navigation"
import { createAdminAuditLog } from "@/lib/admin-audit"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { isFinanceApprovalRole, isFinanceExecutionRole, isFinancePortalRole } from "@/lib/internal-roles"

type FinancePortal = "finance" | "superadmin"

function normalizeStatus(value: string | null) {
  return (value || "").trim().toLowerCase()
}

function resolvePortal(formData: FormData): FinancePortal {
  return String(formData.get("portal") || "").trim() === "superadmin" ? "superadmin" : "finance"
}

function resolvePortalPaths(portal: FinancePortal) {
  return {
    loginPath: portal === "superadmin" ? "/superadmin/login" : "/finance/login",
    payoutsPath: portal === "superadmin" ? "/superadmin/finance-payouts" : "/finance/payouts",
  }
}

async function ensureFinance(portal: FinancePortal) {
  const supabase = await createClient(portal)
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { loginPath } = resolvePortalPaths(portal)

  if (!user) {
    redirect(loginPath)
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (!profile || !isFinancePortalRole(profile.role)) {
    redirect(loginPath)
  }

  return {
    user,
    role: profile.role,
  }
}

function backToPayouts(portal: FinancePortal, message: string, type: "success" | "error"): never {
  const { payoutsPath } = resolvePortalPaths(portal)
  redirect(`${payoutsPath}?${type}=${encodeURIComponent(message)}`)
}

export async function updatePayoutStatus(formData: FormData) {
  const portal = resolvePortal(formData)
  const actor = await ensureFinance(portal)

  const payoutId = String(formData.get("payoutId") || "")
  const nextStatus = String(formData.get("nextStatus") || "")
  const note = String(formData.get("note") || "").trim()

  if (!payoutId || !nextStatus) {
    backToPayouts(portal, "Request payout tidak valid", "error")
  }

  const allowedStatuses = new Set(["approved", "processing", "paid", "rejected"])
  if (!allowedStatuses.has(nextStatus)) {
    backToPayouts(portal, "Status payout tidak dikenali", "error")
  }

  if ((nextStatus === "approved" || nextStatus === "rejected") && !isFinanceApprovalRole(actor.role)) {
    backToPayouts(portal, "Role finance ini tidak punya akses approval payout", "error")
  }

  if ((nextStatus === "processing" || nextStatus === "paid") && !isFinanceExecutionRole(actor.role)) {
    backToPayouts(portal, "Hanya finance eksekusi yang boleh menandai processing / paid", "error")
  }

  if (nextStatus === "rejected" && !note) {
    backToPayouts(portal, "Alasan penolakan payout wajib diisi", "error")
  }

  const adminSupabase = createAdminClient()
  const { data: payout, error: payoutError } = await adminSupabase
    .from("payout_requests")
    .select("id, status, booking_id")
    .eq("id", payoutId)
    .single()

  if (payoutError || !payout) {
    backToPayouts(portal, "Request payout tidak ditemukan", "error")
  }

  const currentStatus = normalizeStatus(payout.status)
  if (currentStatus === "paid") {
    backToPayouts(portal, "Payout yang sudah berstatus Paid Out tidak bisa diubah lagi", "error")
  }

  const validTransition =
    (currentStatus === "pending" && (nextStatus === "approved" || nextStatus === "rejected")) ||
    (currentStatus === "approved" && (nextStatus === "processing" || nextStatus === "rejected")) ||
    (currentStatus === "processing" && nextStatus === "paid")

  if (!validTransition) {
    backToPayouts(portal, "Urutan status payout tidak valid untuk request ini", "error")
  }

  const processedAt =
    nextStatus === "paid" || nextStatus === "rejected" ? new Date().toISOString() : null

  const payload: {
    status: string
    processed_at?: string | null
    note?: string
  } = {
    status: nextStatus,
  }

  payload.processed_at = processedAt

  if (note) {
    payload.note = note
  }

  const { error } = await adminSupabase
    .from("payout_requests")
    .update(payload)
    .eq("id", payoutId)

  if (error) {
    backToPayouts(portal, error.message, "error")
  }

  if (payout.booking_id) {
    const bookingPatch =
      nextStatus === "approved"
        ? { booking_status: "finance_approved", escrow_status: "finance_review" }
        : nextStatus === "processing"
          ? { booking_status: "finance_processing", escrow_status: "payout_processing" }
          : nextStatus === "paid"
            ? {
                booking_status: "payout_completed",
                escrow_status: "paid_out",
                escrow_released_at: new Date().toISOString(),
              }
            : {
                booking_status: "awaiting_admin_handoff",
                escrow_status: "awaiting_admin_handoff",
                escrow_released_at: null,
              }

    const { error: bookingUpdateError } = await adminSupabase
      .from("bookings")
      .update(bookingPatch)
      .eq("id", payout.booking_id)

    if (bookingUpdateError) {
      backToPayouts(portal, bookingUpdateError.message, "error")
    }
  }

  await createAdminAuditLog({
    actorId: actor.user.id,
    actorRole: actor.role,
    targetType: "booking",
    targetId: payout.booking_id || payout.id,
    action:
      nextStatus === "approved"
        ? "finance_approve_payout"
        : nextStatus === "processing"
          ? "finance_mark_processing"
          : nextStatus === "paid"
            ? "finance_mark_paid"
            : "finance_reject_payout",
    summary:
      nextStatus === "approved"
        ? `Finance approve payout ${payout.id}`
        : nextStatus === "processing"
          ? `Finance tandai payout ${payout.id} sebagai processing`
          : nextStatus === "paid"
            ? `Finance tandai payout ${payout.id} sebagai paid`
            : `Finance reject payout ${payout.id}`,
    metadata: {
      payoutId,
      bookingId: payout.booking_id,
      previousStatus: payout.status,
      nextStatus,
      note: note || null,
    },
  })

  const successMessage =
    nextStatus === "approved"
      ? "Payout berhasil di-approve dan booking tetap di fase Ready for Finance"
      : nextStatus === "processing"
        ? "Payout ditandai Processing oleh finance"
        : nextStatus === "paid"
          ? "Payout berhasil ditandai Paid Out"
          : "Payout berhasil ditolak"

  backToPayouts(portal, successMessage, "success")
}
