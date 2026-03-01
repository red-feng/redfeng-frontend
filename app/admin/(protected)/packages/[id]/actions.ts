"use server"

import { createAdminClient } from "@/lib/supabase/admin"
import { redirect } from "next/navigation"

export async function approvePackage(packageId: string) {
  const supabase = createAdminClient()

  await supabase
    .from("packages")
    .update({
      status: "approved",
      reviewed_at: new Date(),
    })
    .eq("id", packageId)

  redirect("/admin/packages")
}

export async function rejectPackage(
  packageId: string,
  reason: string
) {
  const supabase = createAdminClient()

  await supabase
    .from("packages")
    .update({
      status: "rejected",
      rejection_reason: reason,
      reviewed_at: new Date(),
    })
    .eq("id", packageId)

  redirect("/admin/packages")
}