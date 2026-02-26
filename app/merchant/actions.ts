"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function createPackage(formData: FormData) {
  const supabase = await createClient()

  const title = formData.get("title") as string
  const country = formData.get("country") as string
  const city = formData.get("city") as string
  const duration = Number(formData.get("duration"))
  const priceAdult = Number(formData.get("price_adult"))
  const priceChild = Number(formData.get("price_child"))
  const currency = formData.get("currency") as string

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return

  const { data, error } = await supabase
    .from("packages")
    .insert({
      merchant_id: user.id,
      title,
      slug: title.toLowerCase().replace(/\s+/g, "-"),
      country,
      city,
      duration,
      price_adult: priceAdult,
      price_child: priceChild,
      currency,
      status: "draft",
    })
    .select()
    .single()

  if (error) {
    console.error(error)
    return
  }

  revalidatePath("/merchant/paket")

  return data.id
}

export async function updatePackage(formData: FormData) {
  const supabase = await createClient()

  const packageId = formData.get("packageId") as string
  const title = formData.get("title") as string

  if (!packageId) return

  const { data: existing } = await supabase
    .from("packages")
    .select("status")
    .eq("id", packageId)
    .single()

  if (!existing) return

  let newStatus = existing.status

  if (existing.status === "published") {
    newStatus = "needs_review"
  }

  await supabase
    .from("packages")
    .update({
      title,
      status: newStatus,
    })
    .eq("id", packageId)

  revalidatePath("/merchant/paket")
  revalidatePath("/packages")
}