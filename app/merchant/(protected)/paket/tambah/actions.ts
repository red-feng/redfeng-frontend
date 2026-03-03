"use server"

import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

type ItineraryRouteInput = {
  pickup_time: string
  route: string
  description: string
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message
  }
  return "Terjadi kesalahan. Silakan coba lagi."
}

function wizardPath(step: string, packageId?: string | null, error?: string): string {
  const params = new URLSearchParams({ step })
  if (packageId) params.set("id", packageId)
  if (error) params.set("error", error)
  return `/merchant/paket/tambah?${params.toString()}`
}

// step 1
export async function createPackage(formData: FormData) {
  const supabase = await createClient()
  let nextPath = wizardPath("1")

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) throw new Error("Sesi login berakhir. Silakan login ulang.")

    const { data: merchant, error: merchantError } = await supabase
      .from("merchants")
      .select("id")
      .eq("user_id", user.id)
      .single()

    if (merchantError || !merchant) {
      throw new Error("Data merchant tidak ditemukan.")
    }

    const title = (formData.get("title") as string)?.trim()
    if (!title) throw new Error("Nama paket wajib diisi.")

    const defaultLanguage = (formData.get("default_language") as string) || "id"
    const slug = `${title.toLowerCase().replace(/\s+/g, "-")}-${crypto.randomUUID().slice(0, 6)}`

    const coverFile = formData.get("cover_image") as File
    let coverImageUrl: string | null = null

    if (coverFile && coverFile.size > 0) {
      const fileExt = coverFile.name.split(".").pop() || "jpg"
      const fileName = `${crypto.randomUUID()}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from("package-images")
        .upload(fileName, coverFile, {
          contentType: coverFile.type,
        })

      if (uploadError) {
        throw new Error(`Upload cover gagal: ${uploadError.message}`)
      }

      const { data } = supabase.storage
        .from("package-images")
        .getPublicUrl(fileName)

      coverImageUrl = data.publicUrl
    }

    const { data, error } = await supabase
      .from("packages")
      .insert({
        merchant_id: merchant.id,
        title,
        slug,
        origin_country_id: formData.get("origin_country_id"),
        origin_province: formData.get("origin_province"),
        destination_country_id: formData.get("destination_country_id"),
        destination_province: formData.get("destination_province"),
        travel_style: formData.get("travel_style"),
        minimal_peserta: Number(formData.get("minimal_peserta") || 1),
        duration: Number(formData.get("duration_days") || 0),
        price_adult: Number(formData.get("price_adult") || 0),
        price_child: Number(formData.get("price_child") || 0),
        currency: formData.get("currency"),
        default_language: defaultLanguage,
        cover_image: coverImageUrl,
        status: "draft",
      })
      .select()
      .single()

    if (error) {
      throw new Error(`Gagal menyimpan paket: ${error.message}`)
    }

    nextPath = wizardPath("2", data.id)
  } catch (error) {
    console.error("createPackage error:", error)
    redirect(wizardPath("1", null, getErrorMessage(error)))
  }

  redirect(nextPath)
}

// step 2
export async function savePackageDetails(formData: FormData) {
  const supabase = await createClient()
  const packageId = formData.get("package_id") as string
  let nextPath = wizardPath("2", packageId || null)

  try {
    if (!packageId) throw new Error("Package ID tidak ditemukan.")

    const aboutTour = formData.get("about_tour") as string
    const serviceStandard = formData.get("service_standard") as string
    const include = formData.get("include") as string
    const exclude = formData.get("exclude") as string
    const preparation = formData.get("preparation") as string
    const termsConditions = formData.get("terms_conditions") as string
    const meetingPoint = formData.get("meeting_point") as string
    const mapEmbed = formData.get("map_embed") as string
    const tagsRaw = formData.get("tags") as string
    const galleryFiles = formData.getAll("gallery_images") as File[]

    const { data: pkg } = await supabase
      .from("packages")
      .select("default_language, title")
      .eq("id", packageId)
      .single()

    if (!pkg) throw new Error("Package tidak ditemukan.")

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

    if (translationError) {
      throw new Error(`Gagal menyimpan konten: ${translationError.message}`)
    }

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

    if (detailError) {
      throw new Error(`Gagal menyimpan detail teknis: ${detailError.message}`)
    }

    await supabase
      .from("package_tags")
      .delete()
      .eq("package_id", packageId)

    if (tagsRaw) {
      const tagList = tagsRaw
        .split(",")
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0)

      if (tagList.length > 0) {
        const insertTags = tagList.map((tag) => ({
          package_id: packageId,
          tag,
        }))

        const { error: tagError } = await supabase
          .from("package_tags")
          .insert(insertTags)

        if (tagError) {
          throw new Error(`Gagal menyimpan tags: ${tagError.message}`)
        }
      }
    }

    const validGalleryFiles = galleryFiles.filter((file) => file && file.size > 0)
    if (validGalleryFiles.length > 0) {
      const { error: deleteGalleryError } = await supabase
        .from("package_images")
        .delete()
        .eq("package_id", packageId)

      if (deleteGalleryError) {
        throw new Error(`Gagal menghapus gallery lama: ${deleteGalleryError.message}`)
      }

      const imageRows: { package_id: string; image_url: string }[] = []

      for (const file of validGalleryFiles) {
        const fileExt = file.name.split(".").pop() || "jpg"
        const fileName = `${crypto.randomUUID()}.${fileExt}`

        const { error: uploadError } = await supabase.storage
          .from("package-images")
          .upload(fileName, file, {
            contentType: file.type,
          })

        if (uploadError) {
          throw new Error(`Gagal upload gallery: ${uploadError.message}`)
        }

        const { data: publicData } = supabase.storage
          .from("package-images")
          .getPublicUrl(fileName)

        imageRows.push({
          package_id: packageId,
          image_url: publicData.publicUrl,
        })
      }

      const { error: galleryInsertError } = await supabase
        .from("package_images")
        .insert(imageRows)

      if (galleryInsertError) {
        throw new Error(`Gagal menyimpan gallery: ${galleryInsertError.message}`)
      }
    }

    nextPath = wizardPath("3", packageId)
  } catch (error) {
    console.error("savePackageDetails error:", error)
    redirect(wizardPath("2", packageId || null, getErrorMessage(error)))
  }

  redirect(nextPath)
}

// step 3
export async function saveFacilities(formData: FormData) {
  const supabase = await createClient()
  const packageId = formData.get("package_id") as string
  let nextPath = wizardPath("3", packageId || null)

  try {
    if (!packageId) throw new Error("Package ID tidak ditemukan.")

    const facilityIds = formData.getAll("facility_ids[]") as string[]

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

      if (error) throw new Error(`Gagal menyimpan fasilitas: ${error.message}`)
    }

    nextPath = wizardPath("4", packageId)
  } catch (error) {
    console.error("saveFacilities error:", error)
    redirect(wizardPath("3", packageId || null, getErrorMessage(error)))
  }

  redirect(nextPath)
}

// step 4
export async function saveItinerary(formData: FormData) {
  const supabase = await createClient()
  const packageId = formData.get("package_id") as string
  let nextPath = wizardPath("4", packageId || null)

  try {
    if (!packageId) throw new Error("Package ID tidak ditemukan.")

    const dayNumbers = formData.getAll("day_number[]") as string[]
    const pickupTimes = formData.getAll("pickup_time[]") as string[]
    const pickupPeriods = formData.getAll("pickup_period[]") as string[]
    const routes = formData.getAll("route[]") as string[]
    const descriptions = formData.getAll("description[]") as string[]

    await supabase
      .from("package_itinerary_days")
      .delete()
      .eq("package_id", packageId)

    const grouped: Record<string, ItineraryRouteInput[]> = {}

    dayNumbers.forEach((day, index) => {
      if (!grouped[day]) grouped[day] = []

      grouped[day].push({
       pickup_time: [pickupTimes[index], pickupPeriods[index]].filter(Boolean).join(" "),
      route: routes[index] || "",
      description: "",
      })
    })

    const orderedDays = Object.keys(grouped).sort((a, b) => Number(a) - Number(b))
    orderedDays.forEach((dayKey, dayIndex) => {
      const dayDescription = descriptions[dayIndex] || ""
      grouped[dayKey] = grouped[dayKey].map((routeRow) => ({
        ...routeRow,
        description: dayDescription,
      }))
    })

    for (const day in grouped) {
      const { data: dayInsert, error: dayError } = await supabase
        .from("package_itinerary_days")
        .insert({
          package_id: packageId,
          day_number: Number(day),
        })
        .select()
        .single()

      if (dayError) {
        throw new Error(`Gagal menyimpan hari itinerary: ${dayError.message}`)
      }

      const routesToInsert = grouped[day].map((r) => ({
        itinerary_day_id: dayInsert.id,
        pickup_time: r.pickup_time,
        route: r.route,
        description: r.description,
      }))

      const { error: routeError } = await supabase
        .from("package_itinerary_routes")
        .insert(routesToInsert)

      if (routeError) {
        throw new Error(`Gagal menyimpan rute itinerary: ${routeError.message}`)
      }
    }

    nextPath = wizardPath("5", packageId)
  } catch (error) {
    console.error("saveItinerary error:", error)
    redirect(wizardPath("4", packageId || null, getErrorMessage(error)))
  }

  redirect(nextPath)
}

export async function submitForReview(formData: FormData) {
  const supabase = await createClient()
  const packageId = formData.get("package_id") as string

  try {
    if (!packageId) throw new Error("Package ID tidak ditemukan.")

    const { error } = await supabase
      .from("packages")
      .update({ status: "pending" })
      .eq("id", packageId)

    if (error) throw new Error(`Gagal submit review: ${error.message}`)
  } catch (error) {
    console.error("submitForReview error:", error)
    redirect(wizardPath("5", packageId || null, getErrorMessage(error)))
  }

  redirect("/merchant/paket")
}