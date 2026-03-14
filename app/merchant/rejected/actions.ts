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
      verification_status: "draft",
      onboarding_completed: false,
      onboarding_step: 1,
    })
    .eq("user_id", user.id)

  redirect("/merchant/onboarding")
}
