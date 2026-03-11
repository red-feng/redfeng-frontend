"use server"

import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

function normalizeStatus(value: string | null) {
  return (value || "").trim().toLowerCase()
}

async function ensureFinance() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/admin/login")
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (!profile || !["admin", "superadmin"].includes(profile.role)) {
    redirect("/admin/login")
  }

  return user
}

function backToPayouts(message: string, type: "success" | "error"): never {
  redirect(`/finance/payouts?${type}=${encodeURIComponent(message)}`)
}

export async function updatePayoutStatus(formData: FormData) {
  await ensureFinance()

  const payoutId = String(formData.get("payoutId") || "")
  const nextStatus = String(formData.get("nextStatus") || "")
  const note = String(formData.get("note") || "").trim()

  if (!payoutId || !nextStatus) {
    backToPayouts("Request payout tidak valid", "error")
  }

  const allowedStatuses = new Set(["approved", "processing", "paid", "rejected"])
  if (!allowedStatuses.has(nextStatus)) {
    backToPayouts("Status payout tidak dikenali", "error")
  }

  if (nextStatus === "rejected" && !note) {
    backToPayouts("Alasan penolakan payout wajib diisi", "error")
  }

  const adminSupabase = createAdminClient()
  const { data: payout, error: payoutError } = await adminSupabase
    .from("payout_requests")
    .select("id, status")
    .eq("id", payoutId)
    .single()

  if (payoutError || !payout) {
    backToPayouts("Request payout tidak ditemukan", "error")
  }

  const currentStatus = normalizeStatus(payout.status)
  if (currentStatus === "paid") {
    backToPayouts("Payout yang sudah paid tidak bisa diubah lagi", "error")
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
    backToPayouts(error.message, "error")
  }

  const successMessage =
    nextStatus === "approved"
      ? "Payout berhasil di-approve"
      : nextStatus === "processing"
        ? "Payout ditandai sedang diproses"
        : nextStatus === "paid"
          ? "Payout berhasil ditandai paid"
          : "Payout berhasil ditolak"

  backToPayouts(successMessage, "success")
}
