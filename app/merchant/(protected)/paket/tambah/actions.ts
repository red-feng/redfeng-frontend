"use server"

import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { normalizePickupTimeForStorage } from "@/lib/time/pickupTime"
import { redirect } from "next/navigation"

type ItineraryRouteInput = {
  pickup_time: string
  route: string
  description: string
}

const MAX_GALLERY_BYTES = 18 * 1024 * 1024
const SUPPORTED_LANGUAGES = ["id", "en", "zh"] as const
type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number]

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

function normalizeDepartureDate(travelStyle: FormDataEntryValue | null, departureDate: FormDataEntryValue | null) {
  const nextTravelStyle = String(travelStyle || "").trim()
  const nextDepartureDate = String(departureDate || "").trim()

  if (nextTravelStyle === "open_trip" || nextTravelStyle === "umroh") {
    if (!nextDepartureDate) {
      throw new Error("Tanggal keberangkatan wajib diisi untuk Open Trip dan Umroh.")
    }
    return nextDepartureDate
  }

  return null
}

function slugifyTitle(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
}

function normalizePublishedLanguages(input: FormDataEntryValue[], defaultLanguage: string): SupportedLanguage[] {
  const fromForm = input
    .map((value) => String(value).trim())
    .filter((value): value is SupportedLanguage =>
      (SUPPORTED_LANGUAGES as readonly string[]).includes(value)
    )

  const fallbackDefault: SupportedLanguage =
    (SUPPORTED_LANGUAGES as readonly string[]).includes(defaultLanguage) ?
      (defaultLanguage as SupportedLanguage) :
      "id"

  const merged = [...fromForm, fallbackDefault]
  return [...new Set(merged)]
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
    const publishedLanguages = normalizePublishedLanguages(
      formData.getAll("publish_languages[]"),
      defaultLanguage
    )
    const slugBase = slugifyTitle(title)
    const slug = `${slugBase || "paket"}-${crypto.randomUUID().slice(0, 6)}`

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

    const basePayload = {
      merchant_id: merchant.id,
      title,
      slug,
      origin_country_id: formData.get("origin_country_id"),
      origin_province: formData.get("origin_province"),
      destination_country_id: formData.get("destination_country_id"),
      destination_province: formData.get("destination_province"),
      travel_style: formData.get("travel_style"),
      departure_date: normalizeDepartureDate(formData.get("travel_style"), formData.get("departure_date")),
      minimal_peserta: Number(formData.get("minimal_peserta") || 1),
      duration: Number(formData.get("duration_days") || 0),
      price_adult: Number(formData.get("price_adult") || 0),
      price_child: Number(formData.get("price_child") || 0),
      currency: formData.get("currency"),
      default_language: defaultLanguage,
      cover_image: coverImageUrl,
      status: "draft",
    }

    let insertResult = await supabase
      .from("packages")
      .insert({
        ...basePayload,
        published_languages: publishedLanguages,
      })
      .select()
      .single()

    if (insertResult.error && insertResult.error.message.includes("published_languages")) {
      insertResult = await supabase
        .from("packages")
        .insert(basePayload)
        .select()
        .single()
    }

    const { data, error } = insertResult

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
  const adminSupabase = createAdminClient()
  const packageId = formData.get("package_id") as string
  let nextPath = wizardPath("2", packageId || null)

  try {
    if (!packageId) throw new Error("Package ID tidak ditemukan.")

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

    const { data: ownedPackage, error: ownedPackageError } = await supabase
      .from("packages")
      .select("id")
      .eq("id", packageId)
      .eq("merchant_id", merchant.id)
      .single()

    if (ownedPackageError || !ownedPackage) {
      throw new Error("Anda tidak memiliki akses ke paket ini.")
    }

    const languageCodes = SUPPORTED_LANGUAGES
    const mapEmbed = formData.get("map_embed") as string
    const galleryFiles = formData.getAll("gallery_images") as File[]
    const validGalleryFiles = galleryFiles.filter((file) => file && file.size > 0)
    const totalGalleryBytes = validGalleryFiles.reduce((sum, file) => sum + file.size, 0)

    if (totalGalleryBytes > MAX_GALLERY_BYTES) {
      throw new Error("file gambar terlalu besar")
    }

    let pkg: {
      default_language: string | null
      title: string | null
      published_languages?: string[] | null
    } | null = null

    const pkgWithPublished = await supabase
      .from("packages")
      .select("default_language, title, published_languages")
      .eq("id", packageId)
      .single()

    if (pkgWithPublished.error && pkgWithPublished.error.message.includes("published_languages")) {
      const pkgLegacy = await supabase
        .from("packages")
        .select("default_language, title")
        .eq("id", packageId)
        .single()
      pkg = pkgLegacy.data as { default_language: string | null; title: string | null } | null
    } else {
      pkg = pkgWithPublished.data as {
        default_language: string | null
        title: string | null
        published_languages?: string[] | null
      } | null
    }

    if (!pkg) throw new Error("Package tidak ditemukan.")

    const defaultLanguage = String(pkg.default_language || "id")
    const publishedLanguages = normalizePublishedLanguages(
      (pkg.published_languages || []) as FormDataEntryValue[],
      defaultLanguage
    )

    const translationRows = languageCodes
      .map((code) => {
        const aboutTour = String(formData.get(`about_tour_${code}`) || "").trim()
        const serviceStandard = String(formData.get(`service_standard_${code}`) || "").trim()
        const include = String(formData.get(`include_${code}`) || "").trim()
        const exclude = String(formData.get(`exclude_${code}`) || "").trim()
        const preparation = String(formData.get(`preparation_${code}`) || "").trim()
        const termsConditions = String(formData.get(`terms_conditions_${code}`) || "").trim()
        const meetingPoint = String(formData.get(`meeting_point_${code}`) || "").trim()
        const highlights = String(formData.get(`highlights_${code}`) || "").trim()
        const isDefault = code === defaultLanguage
        const isPublished = publishedLanguages.includes(code)
        const hasAnyContent = Boolean(
          aboutTour || serviceStandard || include || exclude || preparation || termsConditions || meetingPoint || highlights
        )

        if (!isPublished && !hasAnyContent) return null
        if (isDefault && !aboutTour) {
          throw new Error(`Info Tentang Tour wajib diisi untuk bahasa default (${defaultLanguage})`)
        }
        if (!isDefault && isPublished && !hasAnyContent) {
          const defaultAboutTour = String(formData.get(`about_tour_${defaultLanguage}`) || "").trim()
          const defaultServiceStandard = String(formData.get(`service_standard_${defaultLanguage}`) || "").trim()
          const defaultInclude = String(formData.get(`include_${defaultLanguage}`) || "").trim()
          const defaultExclude = String(formData.get(`exclude_${defaultLanguage}`) || "").trim()
          const defaultPreparation = String(formData.get(`preparation_${defaultLanguage}`) || "").trim()
          const defaultTermsConditions = String(formData.get(`terms_conditions_${defaultLanguage}`) || "").trim()
          const defaultMeetingPoint = String(formData.get(`meeting_point_${defaultLanguage}`) || "").trim()
          const defaultHighlights = String(formData.get(`highlights_${defaultLanguage}`) || "").trim()

          return {
            package_id: packageId,
            language_code: code,
            title: pkg.title,
            about_tour: defaultAboutTour || null,
            service_standard: defaultServiceStandard || null,
            include: defaultInclude || null,
            exclude: defaultExclude || null,
            preparation: defaultPreparation || null,
            terms_conditions: defaultTermsConditions || null,
            meeting_point: defaultMeetingPoint || null,
            highlights: defaultHighlights || null,
          }
        }

        return {
          package_id: packageId,
          language_code: code,
          title: pkg.title,
          about_tour: aboutTour || null,
          service_standard: serviceStandard || null,
          include: include || null,
          exclude: exclude || null,
          preparation: preparation || null,
          terms_conditions: termsConditions || null,
          meeting_point: meetingPoint || null,
          highlights: highlights || null,
        }
      })
      .filter(Boolean)

    const { error: translationError } = await supabase
      .from("package_translations")
      .upsert(translationRows, {
        onConflict: "package_id,language_code",
      })

    if (translationError) {
      throw new Error(`Gagal menyimpan konten: ${translationError.message}`)
    }

    const { error: detailError } = await supabase
      .from("package_details")
      .upsert(
        {
          package_id: packageId,
          meeting_point: String(formData.get(`meeting_point_${defaultLanguage}`) || "").trim(),
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

    const tagsRaw = String(formData.get(`highlights_${defaultLanguage}`) || "").trim()
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

    if (validGalleryFiles.length > 0) {
      const { error: deleteGalleryError } = await adminSupabase
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

        const { error: uploadError } = await adminSupabase.storage
          .from("package-images")
          .upload(fileName, file, {
            contentType: file.type,
          })

        if (uploadError) {
          throw new Error(`Gagal upload gallery: ${uploadError.message}`)
        }

        const { data: publicData } = adminSupabase.storage
          .from("package-images")
          .getPublicUrl(fileName)

        imageRows.push({
          package_id: packageId,
          image_url: publicData.publicUrl,
        })
      }

      const { error: galleryInsertError } = await adminSupabase
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
    const dayTitles = formData.getAll("day_title[]") as string[]
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
        pickup_time: normalizePickupTimeForStorage(pickupTimes[index] || "", pickupPeriods[index] || "AM"),
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
      grouped[dayKey][0] = {
        ...grouped[dayKey][0],
        description: dayDescription,
      }
    })

    for (const [dayIndex, day] of orderedDays.entries()) {
      const { data: dayInsert, error: dayError } = await supabase
        .from("package_itinerary_days")
        .insert({
          package_id: packageId,
          day_number: Number(day),
          day_title: String(dayTitles[dayIndex] || "").trim() || null,
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
