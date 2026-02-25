"use server"

import { createClient } from "@supabase/supabase-js"
import { revalidatePath } from "next/cache"

export async function approveMerchant(formData: FormData) {
  const merchantId = formData.get("merchantId") as string
  if (!merchantId) return

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { error } = await supabaseAdmin
    .from("merchants")
    .update({
      verification_status: "approved",
      rejection_reason: null,
      verified_at: new Date(),
    })
    .eq("id", merchantId)

  if (error) {
    console.error("Approve error:", error)
    return
  }

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
    return
  }

  revalidatePath("/admin/merchants")
}

