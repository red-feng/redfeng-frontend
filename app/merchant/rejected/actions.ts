"use server"

import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

export async function resubmitMerchant() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/merchant/login")
  }

  await supabase
    .from("merchants")
    .update({
      verification_status: "pending",
      rejection_reason: null,
    })
    .eq("user_id", user.id)

  redirect("/merchant/pending")
}