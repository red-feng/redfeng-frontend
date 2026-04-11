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
      manager_decision: null,
      manager_decided_at: null,
      manager_decided_by: null,
      manager_rejection_reason: null,
      manager_review_request_id: null,
      manager_review_requested_at: null,
      revision_requested_at: null,
      revision_deadline_at: null,
      purge_scheduled_at: null,
      expired_at: null,
      last_resubmitted_at: new Date().toISOString(),
    })
    .eq("user_id", user.id)

  redirect("/merchant/onboarding")
}
