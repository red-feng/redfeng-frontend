"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function approveMerchant(formData: FormData) {
  const supabase = await createClient()

  const merchantId = formData.get("merchantId") as string

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!merchantId || !user) return

  const { data: merchant } = await supabase
    .from("merchants")
    .select("*")
    .eq("id", merchantId)
    .single()

  if (!merchant) return

  await supabase
    .from("merchants")
    .update({
      verification_status: "approved",
      rejection_reason: null,
    })
    .eq("id", merchantId)

  // 🔥 AUDIT LOG
  await supabase.from("merchant_verification_logs").insert({
    merchant_id: merchantId,
    action: "approved",
    performed_by: user.id,
  })

  revalidatePath("/admin/merchants")
}








//**khusus reject//

export async function rejectMerchant(formData: FormData) {
  const supabase = await createClient()

  const merchantId = formData.get("merchantId") as string
  const reason = formData.get("reason") as string

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!merchantId || !reason || !user) return

  await supabase
    .from("merchants")
    .update({
      verification_status: "rejected",
      rejection_reason: reason,
    })
    .eq("id", merchantId)

  // 🔥 AUDIT LOG
  await supabase.from("merchant_verification_logs").insert({
    merchant_id: merchantId,
    action: "rejected",
    reason,
    performed_by: user.id,
  })

  revalidatePath("/admin/merchants")
}

