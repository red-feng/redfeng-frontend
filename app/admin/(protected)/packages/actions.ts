"use server"

import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

export async function approvePackage(formData: FormData) {
  const supabase = await createClient()
  const packageId = formData.get("packageId") as string

  if (!packageId) throw new Error("Missing package ID")

  const { error } = await supabase
    .from("packages")   // 🔥 GANTI DI SINI
    .update({ status: "approved" })
    .eq("id", packageId)

  if (error) throw error

  redirect("/admin/packages")
}

export async function rejectPackage(formData: FormData) {
  const supabase = await createClient()

  const packageId = formData.get("packageId") as string
  const reason = formData.get("reason") as string

  if (!packageId) throw new Error("Missing package ID")

  const { error } = await supabase
    .from("packages")   // 🔥 GANTI DI SINI
    .update({
      status: "rejected",
      rejection_reason: reason
    })
    .eq("id", packageId)

  if (error) throw error

  redirect("/admin/packages")
}