"use server"

import { createAdminClient } from "@/lib/supabase/admin"
import { revalidatePath } from "next/cache"

function revalidateMerchantPages() {
  revalidatePath("/admin/merchants")
  revalidatePath("/merchant/dashboard")
  revalidatePath("/merchant/login")
}

export async function approveMerchant(formData: FormData) {
  const merchantId = formData.get("merchantId") as string
  if (!merchantId) return

  const supabaseAdmin = createAdminClient()

  const { error } = await supabaseAdmin
    .from("merchants")
    .update({
      verification_status: "approved",
      rejection_reason: null,
      verified_at: new Date().toISOString(),
    })
    .eq("id", merchantId)

  if (error) {
    console.error("Approve error:", error)
    return
  }

  revalidateMerchantPages()
}

//**khusus reject//

export async function rejectMerchant(formData: FormData) {
  const merchantId = formData.get("merchantId") as string
  const reason = formData.get("reason") as string

  if (!merchantId || !reason) return

  const supabaseAdmin = createAdminClient()

  const { error } = await supabaseAdmin
    .from("merchants")
    .update({
      verification_status: "rejected",
      rejection_reason: reason,
    })
    .eq("id", merchantId)

  if (error) {
    console.error("Reject error:", error)
    return
  }

  revalidateMerchantPages()
}

export async function deactivateMerchant(formData: FormData) {
  const merchantId = formData.get("merchantId") as string
  const reason = ((formData.get("reason") as string) || "").trim()

  if (!merchantId) return

  const supabaseAdmin = createAdminClient()

  const { error } = await supabaseAdmin
    .from("merchants")
    .update({
      verification_status: "inactive",
      rejection_reason: reason || "Merchant dinonaktifkan sementara oleh admin.",
    })
    .eq("id", merchantId)
    .eq("verification_status", "approved")

  if (error) {
    console.error("Deactivate merchant error:", error)
    return
  }

  revalidateMerchantPages()
}

export async function reactivateMerchant(formData: FormData) {
  const merchantId = formData.get("merchantId") as string
  if (!merchantId) return

  const supabaseAdmin = createAdminClient()

  const { error } = await supabaseAdmin
    .from("merchants")
    .update({
      verification_status: "approved",
      rejection_reason: null,
      verified_at: new Date().toISOString(),
    })
    .eq("id", merchantId)
    .eq("verification_status", "inactive")

  if (error) {
    console.error("Reactivate merchant error:", error)
    return
  }

  revalidateMerchantPages()
}

export async function deleteMerchant(formData: FormData) {
  const merchantId = formData.get("merchantId") as string
  const reason = ((formData.get("reason") as string) || "").trim()

  if (!merchantId || !reason) return

  const supabaseAdmin = createAdminClient()

  const { error } = await supabaseAdmin
    .from("merchants")
    .update({
      verification_status: "deleted",
      rejection_reason: reason,
    })
    .eq("id", merchantId)
    .in("verification_status", ["approved", "inactive"])

  if (error) {
    console.error("Delete merchant error:", error)
    return
  }

  revalidateMerchantPages()
}

