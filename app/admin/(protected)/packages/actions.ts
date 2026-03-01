"use server"

import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

export async function approvePackage(formData: FormData) {
  const supabase = await createClient()
  const packageId = formData.get("packageId") as string

  await supabase
    .from("merchant_packages")
    .update({ status: "approved" })
    .eq("id", packageId)

  redirect("/admin/packages")
}

export async function rejectPackage(formData: FormData) {
  const supabase = await createClient()

  const packageId = formData.get("packageId") as string
  const reason = formData.get("reason") as string

  await supabase
    .from("merchant_packages")
    .update({
      status: "rejected",
      rejection_reason: reason
    })
    .eq("id", packageId)

  redirect("/admin/packages")
}