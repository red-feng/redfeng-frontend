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

  const { data: merchant, error: merchantError } = await supabase
    .from("merchants")
    .select("id")
    .eq("user_id", user.id)
    .single()

  if (merchantError || !merchant) {
    throw new Error("Merchant not found")
  }

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

  country: formData.get("country"), // kalau masih dipakai
  province: formData.get("province"),
  city: formData.get("city"), // kalau masih dipakai

  travel_style: formData.get("travel_style"),
  minimal_peserta: Number(formData.get("minimal_peserta") || 1),

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

// step 2
export async function savePackageDetails(formData: FormData) {
  const supabase = await createClient()

  const packageId = formData.get("package_id") as string
  if (!packageId) throw new Error("Missing package ID")

  const aboutTour = formData.get("about_tour") as string
  const serviceStandard = formData.get("service_standard") as string
  const include = formData.get("include") as string
  const exclude = formData.get("exclude") as string
  const preparation = formData.get("preparation") as string
  const termsConditions = formData.get("terms_conditions") as string
  const meetingPoint = formData.get("meeting_point") as string
  const mapEmbed = formData.get("map_embed") as string
  const tagsRaw = formData.get("tags") as string

  const { data: pkg } = await supabase
    .from("packages")
    .select("default_language, title")
    .eq("id", packageId)
    .single()

  if (!pkg) throw new Error("Package not found")

  // ===============================
  // Update Translation Content
  // ===============================
  const { error: translationError } = await supabase
  .from("package_translations")
  .upsert(
    {
      package_id: packageId,
      language_code: pkg.default_language,
      title: pkg.title,
      about_tour: aboutTour,
      service_standard: serviceStandard,
      include,
      exclude,
      preparation,
      terms_conditions: termsConditions,
    },
    {
      onConflict: "package_id,language_code",
    }
  )

  if (translationError) throw translationError

  // ===============================
  // Update Technical Details
  // ===============================
  const { error: detailError } = await supabase
    .from("package_details")
    .upsert(
      {
        package_id: packageId,
        meeting_point: meetingPoint,
        map_embed: mapEmbed,
      },
      { onConflict: "package_id" }
    )

  if (detailError) throw detailError

  // ===============================
  // Update Tags
  // ===============================
  await supabase
    .from("package_tags")
    .delete()
    .eq("package_id", packageId)

  if (tagsRaw) {
    const tagList = tagsRaw
      .split(",")
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0)

    if (tagList.length > 0) {
      const insertTags = tagList.map(tag => ({
        package_id: packageId,
        tag,
      }))

      const { error: tagError } = await supabase
        .from("package_tags")
        .insert(insertTags)

      if (tagError) throw tagError
    }
  }

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

// ==============================
// STEP 4 – SAVE ITINERARY
// ==============================
export async function saveItinerary(formData: FormData) {
  const supabase = await createClient()

  const packageId = formData.get("package_id") as string
  if (!packageId) throw new Error("Missing package ID")

  const dayNumbers = formData.getAll("day_number[]") as string[]
  const pickupTimes = formData.getAll("pickup_time[]") as string[]
  const routes = formData.getAll("route[]") as string[]
  const descriptions = formData.getAll("description[]") as string[]

  // 1️⃣ Hapus itinerary lama dulu
  await supabase
    .from("package_itinerary_days")
    .delete()
    .eq("package_id", packageId)

  // 2️⃣ Group data berdasarkan day_number
  const grouped: Record<string, any[]> = {}

  dayNumbers.forEach((day, index) => {
    if (!grouped[day]) grouped[day] = []

    grouped[day].push({
      pickup_time: pickupTimes[index] || "",
      route: routes[index] || "",
      description: descriptions[index] || "",
    })
  })

  // 3️⃣ Insert per Hari
  for (const day in grouped) {
    const { data: dayInsert, error: dayError } = await supabase
      .from("package_itinerary_days")
      .insert({
        package_id: packageId,
        day_number: Number(day),
      })
      .select()
      .single()

    if (dayError) throw dayError

    const routesToInsert = grouped[day].map((r) => ({
      itinerary_day_id: dayInsert.id,
      pickup_time: r.pickup_time,
      route: r.route,
      description: r.description,
    }))

    const { error: routeError } = await supabase
      .from("package_itinerary_routes")
      .insert(routesToInsert)

    if (routeError) throw routeError
  }

  redirect(`/merchant/paket/tambah?step=5&id=${packageId}`)
}
export async function submitForReview(formData: FormData) {
  const supabase = await createClient()

  const packageId = formData.get("package_id") as string
  if (!packageId) throw new Error("Missing package ID")

  const { error } = await supabase
    .from("packages")
    .update({ status: "pending" })   // 🔥 GANTI DI SINI
    .eq("id", packageId)

  if (error) throw error

  redirect("/merchant/paket")
}
