"use server"

import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

const SUPPORTED_LANGUAGES = ["id", "en", "zh"] as const
type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number]

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) return error.message
  return "Terjadi kesalahan. Silakan coba lagi."
}

function normalizePublishedLanguages(input: FormDataEntryValue[], defaultLanguage: string): SupportedLanguage[] {
  const fromForm = input
    .map((value) => String(value).trim())
    .filter((value): value is SupportedLanguage =>
      (SUPPORTED_LANGUAGES as readonly string[]).includes(value),
    )

  const fallbackDefault: SupportedLanguage =
    (SUPPORTED_LANGUAGES as readonly string[]).includes(defaultLanguage)
      ? (defaultLanguage as SupportedLanguage)
      : "id"

  const merged = [...fromForm, fallbackDefault]
  return [...new Set(merged)]
}

async function getOwnedMerchantPackage(packageId: string) {
  const supabase = await createClient()
  const adminSupabase = createAdminClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error("Sesi login berakhir. Silakan login ulang.")
  }

  const { data: merchant, error: merchantError } = await adminSupabase
    .from("merchants")
    .select("id")
    .eq("user_id", user.id)
    .single()

  if (merchantError || !merchant) {
    throw new Error("Data merchant tidak ditemukan.")
  }

  const { data: pkg, error: pkgError } = await adminSupabase
    .from("packages")
    .select("id, merchant_id, status, cover_image")
    .eq("id", packageId)
    .eq("merchant_id", merchant.id)
    .single()

  if (pkgError || !pkg) {
    throw new Error("Anda tidak memiliki akses ke paket ini.")
  }

  return { user, merchant, pkg, supabase, adminSupabase }
}

async function markPackagePending(adminSupabase: ReturnType<typeof createAdminClient>, packageId: string) {
  const { error } = await adminSupabase
    .from("packages")
    .update({
      status: "pending",
      rejection_reason: null,
      reviewed_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", packageId)

  if (error) {
    throw new Error(`Gagal memperbarui status paket: ${error.message}`)
  }
}

export async function updatePackageStep1(formData: FormData) {
  const packageId = String(formData.get("package_id") || "")

  try {
    if (!packageId) throw new Error("Package ID tidak ditemukan.")

    const { adminSupabase } = await getOwnedMerchantPackage(packageId)

    const defaultLanguage = String(formData.get("default_language") || "id")
    const publishedLanguages = normalizePublishedLanguages(formData.getAll("publish_languages[]"), defaultLanguage)

    const payload = {
      title: String(formData.get("title") || "").trim(),
      travel_style: String(formData.get("travel_style") || "").trim(),
      origin_country_id: String(formData.get("origin_country_id") || "").trim(),
      origin_province: String(formData.get("origin_province") || "").trim(),
      destination_country_id: String(formData.get("destination_country_id") || "").trim(),
      destination_province: String(formData.get("destination_province") || "").trim(),
      currency: String(formData.get("currency") || "IDR").trim(),
      minimal_peserta: Number(formData.get("minimal_peserta") || 1),
      duration: Number(formData.get("duration_days") || 1),
      price_adult: Number(formData.get("price_adult") || 0),
      price_child: Number(formData.get("price_child") || 0),
      default_language: defaultLanguage,
      published_languages: publishedLanguages,
      status: "pending",
      rejection_reason: null,
      reviewed_at: null,
      updated_at: new Date().toISOString(),
    }

    let updateResult = await adminSupabase
      .from("packages")
      .update(payload)
      .eq("id", packageId)

    if (updateResult.error && updateResult.error.message.includes("published_languages")) {
      const legacyPayload = {
        ...payload,
        published_languages: undefined,
      }
      delete legacyPayload.published_languages
      updateResult = await adminSupabase
        .from("packages")
        .update(legacyPayload)
        .eq("id", packageId)
    }

    if (updateResult.error) {
      throw new Error(`Gagal menyimpan basic info: ${updateResult.error.message}`)
    }

    revalidatePath("/merchant/paket")
    revalidatePath(`/merchant/paket/${packageId}/edit`)
  } catch (error) {
    redirect(`/merchant/paket/${packageId}/edit?step=1&error=${encodeURIComponent(getErrorMessage(error))}`)
  }

  redirect(`/merchant/paket/${packageId}/edit?step=2`)
}

export async function updatePackageStep2(formData: FormData) {
  const packageId = String(formData.get("package_id") || "")

  try {
    if (!packageId) throw new Error("Package ID tidak ditemukan.")

    const { adminSupabase } = await getOwnedMerchantPackage(packageId)

    let pkg: {
      default_language: string | null
      title: string | null
      published_languages?: string[] | null
    } | null = null

    const pkgWithPublished = await adminSupabase
      .from("packages")
      .select("default_language, title, published_languages")
      .eq("id", packageId)
      .single()

    if (pkgWithPublished.error && pkgWithPublished.error.message.includes("published_languages")) {
      const pkgLegacy = await adminSupabase
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
      defaultLanguage,
    )

    const translationRows = SUPPORTED_LANGUAGES
      .map((code) => {
        const aboutTour = String(formData.get(`about_tour_${code}`) || "").trim()
        const serviceStandard = String(formData.get(`service_standard_${code}`) || "").trim()
        const include = String(formData.get(`include_${code}`) || "").trim()
        const exclude = String(formData.get(`exclude_${code}`) || "").trim()
        const preparation = String(formData.get(`preparation_${code}`) || "").trim()
        const termsConditions = String(formData.get(`terms_conditions_${code}`) || "").trim()
        const isDefault = code === defaultLanguage
        const isPublished = publishedLanguages.includes(code)
        const hasAnyContent = Boolean(
          aboutTour || serviceStandard || include || exclude || preparation || termsConditions,
        )

        if (!isPublished && !hasAnyContent) return null
        if (isDefault && !aboutTour) {
          throw new Error(`Info Tentang Tour wajib diisi untuk bahasa default (${defaultLanguage})`)
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
        }
      })
      .filter(Boolean)

    const { error: translationError } = await adminSupabase
      .from("package_translations")
      .upsert(translationRows, { onConflict: "package_id,language_code" })

    if (translationError) {
      throw new Error(`Gagal menyimpan konten: ${translationError.message}`)
    }

    const { error: detailError } = await adminSupabase
      .from("package_details")
      .upsert(
        {
          package_id: packageId,
          meeting_point: String(formData.get("meeting_point") || "").trim(),
          map_embed: String(formData.get("map_embed") || "").trim(),
        },
        { onConflict: "package_id" },
      )

    if (detailError) {
      throw new Error(`Gagal menyimpan detail teknis: ${detailError.message}`)
    }

    const { error: deleteTagsError } = await adminSupabase
      .from("package_tags")
      .delete()
      .eq("package_id", packageId)

    if (deleteTagsError) {
      throw new Error(`Gagal menghapus tags lama: ${deleteTagsError.message}`)
    }

    const tagsRaw = String(formData.get("tags") || "")
    const tagList = tagsRaw
      .split(",")
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0)

    if (tagList.length > 0) {
      const { error: insertTagError } = await adminSupabase
        .from("package_tags")
        .insert(tagList.map((tag) => ({ package_id: packageId, tag })))

      if (insertTagError) {
        throw new Error(`Gagal menyimpan tags: ${insertTagError.message}`)
      }
    }

    await markPackagePending(adminSupabase, packageId)
    revalidatePath("/merchant/paket")
    revalidatePath(`/merchant/paket/${packageId}/edit`)
  } catch (error) {
    redirect(`/merchant/paket/${packageId}/edit?step=2&error=${encodeURIComponent(getErrorMessage(error))}`)
  }

  redirect(`/merchant/paket/${packageId}/edit?step=3`)
}

export async function updatePackageStep3(formData: FormData) {
  const packageId = String(formData.get("package_id") || "")

  try {
    if (!packageId) throw new Error("Package ID tidak ditemukan.")

    const { adminSupabase } = await getOwnedMerchantPackage(packageId)

    const facilityIds = formData.getAll("facility_ids[]") as string[]

    const { error: deleteError } = await adminSupabase
      .from("package_facilities")
      .delete()
      .eq("package_id", packageId)

    if (deleteError) {
      throw new Error(`Gagal menghapus fasilitas lama: ${deleteError.message}`)
    }

    if (facilityIds.length > 0) {
      const { error: insertError } = await adminSupabase
        .from("package_facilities")
        .insert(facilityIds.map((facilityId) => ({ package_id: packageId, facility_id: facilityId })))

      if (insertError) {
        throw new Error(`Gagal menyimpan fasilitas: ${insertError.message}`)
      }
    }

    await markPackagePending(adminSupabase, packageId)
    revalidatePath("/merchant/paket")
    revalidatePath(`/merchant/paket/${packageId}/edit`)
  } catch (error) {
    redirect(`/merchant/paket/${packageId}/edit?step=3&error=${encodeURIComponent(getErrorMessage(error))}`)
  }

  redirect(`/merchant/paket/${packageId}/edit?step=4`)
}

export async function updatePackageStep4(formData: FormData) {
  const packageId = String(formData.get("package_id") || "")

  try {
    if (!packageId) throw new Error("Package ID tidak ditemukan.")

    const { adminSupabase } = await getOwnedMerchantPackage(packageId)

    const { data: itineraryDays, error: itineraryError } = await adminSupabase
      .from("package_itinerary_days")
      .select("id")
      .eq("package_id", packageId)

    if (itineraryError) {
      throw new Error(`Gagal memuat itinerary lama: ${itineraryError.message}`)
    }

    const itineraryDayIds = (itineraryDays || []).map((item) => item.id)

    if (itineraryDayIds.length > 0) {
      const { error: deleteRoutesError } = await adminSupabase
        .from("package_itinerary_routes")
        .delete()
        .in("itinerary_day_id", itineraryDayIds)

      if (deleteRoutesError) {
        throw new Error(`Gagal menghapus itinerary routes lama: ${deleteRoutesError.message}`)
      }
    }

    const { error: deleteDaysError } = await adminSupabase
      .from("package_itinerary_days")
      .delete()
      .eq("package_id", packageId)

    if (deleteDaysError) {
      throw new Error(`Gagal menghapus itinerary hari lama: ${deleteDaysError.message}`)
    }

    const dayNumbers = formData.getAll("day_number[]") as string[]
    const pickupTimes = formData.getAll("pickup_time[]") as string[]
    const pickupPeriods = formData.getAll("pickup_period[]") as string[]
    const routes = formData.getAll("route[]") as string[]
    const descriptions = formData.getAll("description[]") as string[]

    const grouped: Record<string, { pickup_time: string; route: string; description: string }[]> = {}

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

    for (const day of orderedDays) {
      const { data: dayInsert, error: dayError } = await adminSupabase
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

      const routesToInsert = grouped[day].map((route) => ({
        itinerary_day_id: dayInsert.id,
        pickup_time: route.pickup_time,
        route: route.route,
        description: route.description,
      }))

      const { error: routeError } = await adminSupabase
        .from("package_itinerary_routes")
        .insert(routesToInsert)

      if (routeError) {
        throw new Error(`Gagal menyimpan rute itinerary: ${routeError.message}`)
      }
    }

    await markPackagePending(adminSupabase, packageId)
    revalidatePath("/merchant/paket")
    revalidatePath(`/merchant/paket/${packageId}/edit`)
  } catch (error) {
    redirect(`/merchant/paket/${packageId}/edit?step=4&error=${encodeURIComponent(getErrorMessage(error))}`)
  }

  redirect("/merchant/paket?status=pending&success=Paket berhasil diperbarui dan dikirim ulang untuk review admin")
}

export async function updatePackage(formData: FormData) {
  const packageId = String(formData.get("package_id") || "")

  try {
    if (!packageId) throw new Error("Package ID tidak ditemukan.")

    const { adminSupabase } = await getOwnedMerchantPackage(packageId)

    const title = String(formData.get("title") || "").trim()
    const travelStyle = String(formData.get("travel_style") || "").trim()
    const originCountryId = String(formData.get("origin_country_id") || "").trim()
    const originProvince = String(formData.get("origin_province") || "").trim()
    const destinationCountryId = String(formData.get("destination_country_id") || "").trim()
    const destinationProvince = String(formData.get("destination_province") || "").trim()
    const currency = String(formData.get("currency") || "IDR").trim()
    const minimalPeserta = Number(formData.get("minimal_peserta") || 1)
    const duration = Number(formData.get("duration_days") || 0)
    const priceAdult = Number(formData.get("price_adult") || 0)
    const priceChild = Number(formData.get("price_child") || 0)

    if (!title) throw new Error("Nama paket wajib diisi.")
    if (!travelStyle) throw new Error("Travel style wajib dipilih.")
    if (!originCountryId || !destinationCountryId) throw new Error("Negara asal dan tujuan wajib dipilih.")

    const payload = {
      title,
      travel_style: travelStyle,
      origin_country_id: originCountryId,
      origin_province: originProvince,
      destination_country_id: destinationCountryId,
      destination_province: destinationProvince,
      currency,
      minimal_peserta: minimalPeserta,
      duration,
      price_adult: priceAdult,
      price_child: priceChild,
      status: "pending",
      rejection_reason: null,
      reviewed_at: null,
      updated_at: new Date().toISOString(),
    }

    const { error } = await adminSupabase
      .from("packages")
      .update(payload)
      .eq("id", packageId)

    if (error) {
      throw new Error(`Gagal menyimpan perubahan paket: ${error.message}`)
    }

    revalidatePath("/merchant/paket")
    revalidatePath(`/merchant/paket/${packageId}/edit`)
  } catch (error) {
    redirect(`/merchant/paket/${packageId}/edit?error=${encodeURIComponent(getErrorMessage(error))}`)
  }

  redirect("/merchant/paket?status=pending&success=Paket berhasil diperbarui dan dikirim ulang untuk review admin")
}

export async function deletePackage(formData: FormData) {
  const packageId = String(formData.get("package_id") || "")
  const returnStatus = String(formData.get("return_status") || "draft").trim()

  try {
    if (!packageId) throw new Error("Package ID tidak ditemukan.")

    const { adminSupabase } = await getOwnedMerchantPackage(packageId)

    const { count: bookingCount, error: bookingError } = await adminSupabase
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .eq("package_id", packageId)

    if (bookingError) {
      throw new Error(`Gagal memeriksa booking paket: ${bookingError.message}`)
    }

    if ((bookingCount || 0) > 0) {
      throw new Error("Paket tidak bisa dihapus karena sudah memiliki booking customer.")
    }

    const { data: itineraryDays, error: itineraryError } = await adminSupabase
      .from("package_itinerary_days")
      .select("id")
      .eq("package_id", packageId)

    if (itineraryError) {
      throw new Error(`Gagal memuat itinerary paket: ${itineraryError.message}`)
    }

    const itineraryDayIds = (itineraryDays || []).map((item) => item.id)

    if (itineraryDayIds.length > 0) {
      const { error: deleteRoutesError } = await adminSupabase
        .from("package_itinerary_routes")
        .delete()
        .in("itinerary_day_id", itineraryDayIds)

      if (deleteRoutesError) {
        throw new Error(`Gagal menghapus itinerary routes: ${deleteRoutesError.message}`)
      }
    }

    const deleteSteps = [
      adminSupabase.from("package_images").delete().eq("package_id", packageId),
      adminSupabase.from("package_facilities").delete().eq("package_id", packageId),
      adminSupabase.from("package_tags").delete().eq("package_id", packageId),
      adminSupabase.from("package_translations").delete().eq("package_id", packageId),
      adminSupabase.from("package_details").delete().eq("package_id", packageId),
      adminSupabase.from("package_itinerary_days").delete().eq("package_id", packageId),
    ]

    for (const step of deleteSteps) {
      const { error } = await step
      if (error) {
        throw new Error(`Gagal membersihkan data paket: ${error.message}`)
      }
    }

    const { error: deletePackageError } = await adminSupabase
      .from("packages")
      .delete()
      .eq("id", packageId)

    if (deletePackageError) {
      throw new Error(`Gagal menghapus paket: ${deletePackageError.message}`)
    }

    revalidatePath("/merchant/paket")
  } catch (error) {
    const errorPath =
      returnStatus
        ? `/merchant/paket?status=${encodeURIComponent(returnStatus)}&error=${encodeURIComponent(getErrorMessage(error))}`
        : `/merchant/paket?error=${encodeURIComponent(getErrorMessage(error))}`
    redirect(errorPath)
  }

  const successPath =
    returnStatus
      ? `/merchant/paket?status=${encodeURIComponent(returnStatus)}&success=${encodeURIComponent("Paket berhasil dihapus")}`
      : `/merchant/paket?success=${encodeURIComponent("Paket berhasil dihapus")}`

  redirect(successPath)
}

export async function togglePackageStatus(formData: FormData) {
  const packageId = String(formData.get("package_id") || "")
  const targetStatus = String(formData.get("target_status") || "").trim()
  const returnStatus = String(formData.get("return_status") || "draft").trim()

  try {
    if (!packageId) throw new Error("Package ID tidak ditemukan.")
    if (!["approved", "inactive"].includes(targetStatus)) {
      throw new Error("Status tujuan tidak valid.")
    }

    const { adminSupabase } = await getOwnedMerchantPackage(packageId)

    const { error } = await adminSupabase
      .from("packages")
      .update({
        status: targetStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", packageId)

    if (error) {
      throw new Error(`Gagal memperbarui status paket: ${error.message}`)
    }

    revalidatePath("/merchant/paket")
  } catch (error) {
    const errorPath =
      returnStatus
        ? `/merchant/paket?status=${encodeURIComponent(returnStatus)}&error=${encodeURIComponent(getErrorMessage(error))}`
        : `/merchant/paket?error=${encodeURIComponent(getErrorMessage(error))}`
    redirect(errorPath)
  }

  const successMessage =
    targetStatus === "approved" ? "Paket berhasil diaktifkan" : "Paket berhasil dinonaktifkan"
  const successPath =
    returnStatus
      ? `/merchant/paket?status=${encodeURIComponent(returnStatus)}&success=${encodeURIComponent(successMessage)}`
      : `/merchant/paket?success=${encodeURIComponent(successMessage)}`

  redirect(successPath)
}

export async function pullPackageToDraft(formData: FormData) {
  const packageId = String(formData.get("package_id") || "")
  const returnStatus = String(formData.get("return_status") || "pending").trim()

  try {
    if (!packageId) throw new Error("Package ID tidak ditemukan.")

    const { adminSupabase, pkg } = await getOwnedMerchantPackage(packageId)

    if (pkg.status !== "pending") {
      throw new Error("Hanya paket yang sedang pending review yang bisa ditarik ke draft.")
    }

    const { error } = await adminSupabase
      .from("packages")
      .update({
        status: "draft",
        updated_at: new Date().toISOString(),
      })
      .eq("id", packageId)

    if (error) {
      throw new Error(`Gagal mengubah paket ke draft: ${error.message}`)
    }

    revalidatePath("/merchant/paket")
  } catch (error) {
    const errorPath = returnStatus
      ? `/merchant/paket?status=${encodeURIComponent(returnStatus)}&error=${encodeURIComponent(getErrorMessage(error))}`
      : `/merchant/paket?error=${encodeURIComponent(getErrorMessage(error))}`
    redirect(errorPath)
  }

  redirect("/merchant/paket?status=draft&success=Paket%20berhasil%20ditarik%20ke%20draft")
}
