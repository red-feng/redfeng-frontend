"use server"

import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

export async function createPackage(formData: FormData) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return

  // 🔍 Ambil merchant id
  const { data: merchant } = await supabase
    .from("merchants")
    .select("id")
    .eq("user_id", user.id)
    .single()

  if (!merchant) return

  const title = formData.get("title") as string

  const slug =
    title.toLowerCase().replace(/\s+/g, "-") +
    "-" +
    crypto.randomUUID().slice(0, 6)

  const { data, error } = await supabase
    .from("packages")
    .insert({
      merchant_id: merchant.id,
      title,
      slug,
      country: formData.get("country"),
      city: formData.get("city"),
      duration: Number(formData.get("duration")),
      price_adult: Number(formData.get("price_adult")),
      price_child: Number(formData.get("price_child")),
      currency: formData.get("currency"),
      status: "draft",
    })
    .select()
    .single()

  if (error) {
    console.error("Create package error:", error)
    return
  }

  // 🔁 Redirect ke Step 2
  redirect(`/merchant/paket/tambah?step=2&id=${data.id}`)
}



//step2
export async function savePackageDetails(formData: FormData) {
  const supabase = await createClient()

  const packageId = formData.get("package_id") as string

  if (!packageId) return

  const { error } = await supabase
    .from("package_details")
    .upsert(
      {
        package_id: packageId,
        tour_info: formData.get("tour_info"),
        itinerary: formData.get("itinerary"),
        service_standard: formData.get("service_standard"),
        equipment_documents: formData.get("equipment_documents"),
        terms_conditions: formData.get("terms_conditions"),
        additional_facilities: formData.get("additional_facilities"),
        map_embed: formData.get("map_embed"),
      },
      {
        onConflict: "package_id",
      }
    )

  if (error) {
    console.error("Save details error:", error)
    return
  }

  redirect(`/merchant/paket/tambah?step=3&id=${packageId}`)
}



export async function saveFacilities(formData: FormData) {
  const supabase = await createClient()

  const packageId = formData.get("package_id") as string

  if (!packageId) return

  const facilityIds = formData.getAll("facility_ids") as string[]

  // 🔥 Hapus dulu fasilitas lama
  await supabase
    .from("package_facilities")
    .delete()
    .eq("package_id", packageId)

  // 🔥 Insert yang baru
  const insertData = facilityIds.map((facilityId) => ({
    package_id: packageId,
    facility_id: facilityId,
  }))

  if (insertData.length > 0) {
    await supabase
      .from("package_facilities")
      .insert(insertData)
  }

  redirect(`/merchant/paket/tambah?step=4&id=${packageId}`)
}