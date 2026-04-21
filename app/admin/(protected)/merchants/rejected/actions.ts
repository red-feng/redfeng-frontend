"use server"

import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

export async function resubmitMerchant() {
  const supabase = await createClient("admin")

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/merchant/login")
  }

  // Ambil merchant berdasarkan user
  const { data: merchant } = await supabase
    .from("merchants")
    .select("id")
    .eq("user_id", user.id)
    .single()

  if (!merchant) {
    redirect("/merchant/onboarding")
  }

  // Update status kembali ke pending
  await supabase
    .from("merchants")
    .update({
      verification_status: "pending",
      rejection_reason: null,
    })
    .eq("id", merchant.id)

  // 🔥 Audit log
  await supabase.from("merchant_verification_logs").insert({
    merchant_id: merchant.id,
    action: "resubmitted",
    performed_by: user.id,
  })

  redirect("/merchant/pending")
}
