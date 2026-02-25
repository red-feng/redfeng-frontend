"use server"

import { createClient } from "@supabase/supabase-js"
import { revalidatePath } from "next/cache"

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!  // 🔥 SERVICE ROLE
)

export async function approveMerchant(formData: FormData) {

  const merchantId = formData.get("merchantId") as string

  if (!merchantId) return

  const { error } = await supabaseAdmin
    .from("merchants")
    .update({
      verification_status: "approved",
      rejection_reason: null,
    })
    .eq("id", merchantId)

  if (error) {
    console.error("Approve error:", error)
    throw new Error("Approve failed")
  }

  await supabaseAdmin.from("merchant_verification_logs").insert({
    merchant_id: merchantId,
    action: "approved",
  })

  revalidatePath("/admin/merchants")
}








//**khusus reject//

export async function rejectMerchant(formData: FormData) {

  const merchantId = formData.get("merchantId") as string
  const reason = formData.get("reason") as string

  if (!merchantId || !reason) return

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { error } = await supabaseAdmin
    .from("merchants")
    .update({
      verification_status: "rejected",
      rejection_reason: reason,
    })
    .eq("id", merchantId)

  if (error) {
    console.error("Reject error:", error)
    throw new Error("Reject failed")
  }

  await supabaseAdmin.from("merchant_verification_logs").insert({
    merchant_id: merchantId,
    action: "rejected",
    reason,
  })

  revalidatePath("/admin/merchants")
}

