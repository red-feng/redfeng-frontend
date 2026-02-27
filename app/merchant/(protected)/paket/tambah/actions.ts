"use server"

import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"


//step 1
export async function createPackage(formData: FormData) {
  const supabase = await createClient()

  
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) throw new Error("Unauthorized")

  const { data: merchant } = await supabase
    .from("merchants")
    .select("id")
    .eq("user_id", user.id)
    .single()

  if (!merchant) throw new Error("Merchant not found")

  const title = formData.get("title") as string
  const defaultLanguage =
    (formData.get("default_language") as string) || "id"

  const slug =
    title.toLowerCase().replace(/\s+/g, "-") +
    "-" +
    crypto.randomUUID().slice(0, 6)


    
  // ===============================
  // Upload Cover Image
  // ===============================
  const coverFile = formData.get("cover_image") as File
  let coverImageUrl: string | null = null

  if (coverFile && coverFile.size > 0) {
    const fileExt = coverFile.name.split(".").pop()
    const fileName = `${crypto.randomUUID()}.${fileExt}`

    const { error: uploadError } = await supabase.storage
      .from("package-images")
      .upload(fileName, coverFile, {
        contentType: coverFile.type,
      })

    if (uploadError) throw uploadError

    const { data } = supabase.storage
      .from("package-images")
      .getPublicUrl(fileName)

    coverImageUrl = data.publicUrl
  }

  // ===============================
  // Insert Package
  // ===============================
  const { data, error } = await supabase
    .from("packages")
    .insert({
  merchant_id: merchant.id,
  title,
  slug,
  country: formData.get("country"),
  city: formData.get("city"),
  duration: Number(formData.get("duration") || 0),
  price_adult: Number(formData.get("price_adult") || 0),
  price_child: Number(formData.get("price_child") || 0),
  currency: formData.get("currency"),
  default_language: defaultLanguage,
  cover_image: coverImageUrl,
  status: "draft",
})
    .select()
    .single()

  if (error) throw error

  redirect(`/merchant/paket/tambah?step=2&id=${data.id}`)
}

//step2
export async function savePackageDetails(formData: FormData) {
  const supabase = await createClient()

  const packageId = formData.get("package_id") as string
  if (!packageId) throw new Error("Missing package ID")

  const aboutTour = formData.get("about_tour") as string
  const itinerary = formData.get("itinerary") as string
  const serviceStandard = formData.get("service_standard") as string
  const preparation = formData.get("preparation") as string
  const termsConditions = formData.get("terms_conditions") as string
  const mapEmbed = formData.get("map_embed") as string

  const { data: pkg } = await supabase
    .from("packages")
    .select("default_language, title, description")
    .eq("id", packageId)
    .single()

  if (!pkg) throw new Error("Package not found")

  const { error: translationError } = await supabase
    .from("package_translations")
    .upsert({
      package_id: packageId,
      language_code: pkg.default_language,
      title: pkg.title,
      description: pkg.description,
      about_tour: aboutTour,
      itinerary,
      service_standard: serviceStandard,
      preparation,
      terms_conditions: termsConditions,
    })

  if (translationError) throw translationError

  const { error: detailError } = await supabase
    .from("package_details")
    .upsert(
      {
        package_id: packageId,
        map_embed: mapEmbed,
      },
      { onConflict: "package_id" }
    )

  if (detailError) throw detailError

  redirect(`/merchant/paket/tambah?step=3&id=${packageId}`)
}




//step 3
export async function saveFacilities(formData: FormData) {
  const supabase = await createClient()

  const packageId = formData.get("package_id") as string
  if (!packageId) throw new Error("Missing package ID")

  const facilityIds = formData.getAll("facility_ids[]") as string[]

  // Hapus dulu fasilitas lama
  await supabase
    .from("package_facilities")
    .delete()
    .eq("package_id", packageId)

  const insertData = facilityIds.map((facilityId) => ({
    package_id: packageId,
    facility_id: facilityId,
  }))

  if (insertData.length > 0) {
    const { error } = await supabase
      .from("package_facilities")
      .insert(insertData)

    if (error) throw error
  }

  redirect(`/merchant/paket/tambah?step=4&id=${packageId}`)
}

//step 4
export async function saveAddons(formData: FormData) {
  const supabase = await createClient()

  const packageId = formData.get("package_id") as string
  if (!packageId) throw new Error("Missing package ID")

  const addonNames = formData.getAll("addon_name[]") as string[]
  const addonPrices = formData.getAll("addon_price[]") as string[]

  // Hapus add-ons lama
  await supabase
    .from("package_addons")
    .delete()
    .eq("package_id", packageId)

  const insertData = addonNames
    .map((name, index) => ({
      package_id: packageId,
      name,
      price: Number(addonPrices[index] || 0),
      currency: "IDR",
    }))
    .filter((addon) => addon.name && addon.price > 0)


const files = formData.getAll("gallery_images") as File[]

for (const file of files) {
  if (!file || file.size === 0) continue

  const fileExt = file.name.split(".").pop()
  const fileName = `${crypto.randomUUID()}.${fileExt}`

  const { error: uploadError } = await supabase.storage
    .from("package-images")
    .upload(fileName, file, {
      contentType: file.type,
    })

  if (uploadError) throw uploadError

  const { data: publicUrl } = supabase.storage
    .from("package-images")
    .getPublicUrl(fileName)

  await supabase.from("package_images").insert({
    package_id: packageId,
    image_url: publicUrl.publicUrl,
  })
}
    
    
  if (insertData.length > 0) {
    const { error } = await supabase
      .from("package_addons")
      .insert(insertData)

    if (error) throw error
  }

  redirect(`/merchant/paket/tambah?step=5&id=${packageId}`)
}

//step 5
export async function submitForReview(formData: FormData) {
  const supabase = await createClient()

  const packageId = formData.get("package_id") as string
  if (!packageId) throw new Error("Missing package ID")

  const { error } = await supabase
    .from("packages")
    .update({ status: "submitted" })
    .eq("id", packageId)

  if (error) throw error

  redirect("/merchant/paket")
}
