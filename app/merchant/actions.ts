"use server"

import { createAdminClient } from "@/lib/supabase/admin"
import { revalidatePath } from "next/cache"

export async function approveMerchant(formData: FormData) {
  const merchantId = formData.get("merchantId") as string
  if (!merchantId) return

  const supabaseAdmin = createAdminClient()

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