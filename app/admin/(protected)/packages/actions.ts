"use server"

import { createAdminClient } from "@/lib/supabase/admin"
import { revalidatePath } from "next/cache"

export async function approvePackage(formData: FormData) {
  const packageId = formData.get("packageId") as string
  if (!packageId) return

  const supabase = createAdminClient()

  const { error } = await supabase
    .from("packages")
    .update({
      status: "approved",
      reviewed_at: new Date(),
    })
    .eq("id", packageId)

  if (error) {
    console.error(error)
    return
  }

  revalidatePath("/admin/packages")
}

export async function rejectPackage(formData: FormData) {
  const packageId = formData.get("packageId") as string
  const reason = formData.get("reason") as string

  if (!packageId || !reason) return

  const supabase = createAdminClient()

  const { error } = await supabase
    .from("packages")
    .update({
      status: "rejected",
      rejection_reason: reason,
      reviewed_at: new Date(),
    })
    .eq("id", packageId)

  if (error) {
    console.error(error)
    return
  }

  revalidatePath("/admin/packages")
}