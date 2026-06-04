"use server"

import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { buildAutoLocalizedPricing } from "@/lib/currency-rates"
import { purgePackageRecords } from "@/lib/package-delete"
import { normalizePackageCurrency } from "@/lib/package-pricing"
import { normalizePickupTimeForStorage } from "@/lib/time/pickupTime"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

const SUPPORTED_LANGUAGES = ["id", "en", "zh"] as const
type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number]

function getTranslatedTitles(formData: FormData, defaultLanguage: string) {
  const normalizedDefaultLanguage = normalizePublishedLanguages([], defaultLanguage)[0]
  const titles = SUPPORTED_LANGUAGES.reduce(
    (acc, code) => {
      acc[code] = String(formData.get(`title_${code}`) || "").trim()
      return acc
    },
    {} as Record<SupportedLanguage, string>,
  )

  if (!titles[normalizedDefaultLanguage]) {
    throw new Error("Nama paket wajib diisi untuk bahasa default.")
  }

  return titles
}

async function getLocalizedPricing(formData: FormData, publishedLanguages: SupportedLanguage[], defaultLanguage: string) {
  const normalizedDefaultLanguage = normalizePublishedLanguages([], defaultLanguage)[0]
  const defaultCurrency = normalizePackageCurrency(
    String(formData.get("base_currency") || formData.get(`currency_${normalizedDefaultLanguage}`) || formData.get("currency") || "IDR"),
  )
  const defaultAdultPrice = Number(
    String(formData.get("base_price_adult") || formData.get(`price_adult_${normalizedDefaultLanguage}`) || formData.get("price_adult") || "0").replace(/[^\d]/g, ""),
  )
  const defaultChildPrice = Number(
    String(formData.get("base_price_child") || formData.get(`price_child_${normalizedDefaultLanguage}`) || formData.get("price_child") || "0").replace(/[^\d]/g, ""),
  )
  const localized = await buildAutoLocalizedPricing({
    baseLanguage: defaultLanguage,
    baseCurrency: defaultCurrency,
    baseAdultPrice: defaultAdultPrice,
    baseChildPrice: defaultChildPrice,
  })

  return SUPPORTED_LANGUAGES.reduce(
    (acc, code) => {
      const isPublished = publishedLanguages.includes(code)
      const isDefault = code === normalizedDefaultLanguage

      if (!isPublished && !isDefault) {
        acc[code] = localized.pricing[code]
        return acc
      }

      acc[code] = localized.pricing[code]
      return acc
    },
    {} as Record<SupportedLanguage, { currency: string; price_adult: number; price_child: number }>,
  )
}

function getItineraryTranslations(formData: FormData) {
  return SUPPORTED_LANGUAGES.reduce(
    (acc, code) => {
      acc.dayTitles[code] = formData.getAll(`day_title_${code}[]`).map((value) => String(value || ""))
      acc.descriptions[code] = formData.getAll(`description_${code}[]`).map((value) => String(value || ""))
      acc.routes[code] = formData.getAll(`route_${code}[]`).map((value) => String(value || ""))
      return acc
    },
    {
      dayTitles: {} as Record<SupportedLanguage, string[]>,
      descriptions: {} as Record<SupportedLanguage, string[]>,
      routes: {} as Record<SupportedLanguage, string[]>,
    },
  )
}

async function ensureItineraryTranslationTablesReady(adminSupabase: Awaited<ReturnType<typeof getOwnedMerchantPackage>>["adminSupabase"]) {
  const [dayTranslationCheck, routeTranslationCheck] = await Promise.all([
    adminSupabase.from("package_itinerary_day_translations").select("id").limit(1),
    adminSupabase.from("package_itinerary_route_translations").select("id").limit(1),
  ])

  const relationMissing =
    dayTranslationCheck.error?.message?.includes("does not exist") ||
    routeTranslationCheck.error?.message?.includes("does not exist")

  if (relationMissing) {
    throw new Error("Fitur itinerary 3 bahasa belum aktif di database. Jalankan migrasi 20260316_add_itinerary_translations.sql terlebih dahulu.")
  }

  if (dayTranslationCheck.error) {
    throw new Error(`Gagal memeriksa tabel terjemahan itinerary hari: ${dayTranslationCheck.error.message}`)
  }

  if (routeTranslationCheck.error) {
    throw new Error(`Gagal memeriksa tabel terjemahan itinerary rute: ${routeTranslationCheck.error.message}`)
  }
}

function sanitizeErrorMessage(message: string) {
  const trimmed = message.trim()
  const lower = trimmed.toLowerCase()

  if (
    lower.startsWith("<!doctype html") ||
    lower.startsWith("<html") ||
    lower.includes("cloudflare") ||
    lower.includes("bad gateway") ||
    lower.includes("error code 502")
  ) {
    return "Layanan sedang bermasalah sementara. Silakan coba lagi beberapa menit lagi."
  }

  return trimmed
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) return sanitizeErrorMessage(error.message)
  return "Terjadi kesalahan. Silakan coba lagi."
}

function shouldRetryWithoutPublishedLanguages(message: string) {
  const normalized = message.toLowerCase()
  return (
    normalized.includes("published_languages") ||
    normalized.startsWith("<!doctype html") ||
    normalized.startsWith("<html") ||
    normalized.includes("cloudflare") ||
    normalized.includes("bad gateway") ||
    normalized.includes("error code 502")
  )
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

function normalizeOptionalDecimal(value: FormDataEntryValue | null) {
  const raw = String(value || "").trim().replace(",", ".")
  if (!raw) return null
  const parsed = Number(raw)
  return Number.isFinite(parsed) ? parsed : null
}

function normalizeOptionalInteger(value: FormDataEntryValue | null) {
  const raw = String(value || "").trim()
  if (!raw) return null
  const parsed = Number(raw)
  return Number.isFinite(parsed) ? Math.trunc(parsed) : null
}

async function getOwnedMerchantPackage(packageId: string) {
  const supabase = await createClient("merchant")
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

async function markPackageDraft(adminSupabase: ReturnType<typeof createAdminClient>, packageId: string) {
  const { error } = await adminSupabase
    .from("packages")
    .update({
      status: "draft",
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
    const titles = getTranslatedTitles(formData, defaultLanguage)
    const pricing = await getLocalizedPricing(formData, publishedLanguages, defaultLanguage)
    const defaultTitle = titles[defaultLanguage as SupportedLanguage]

    const payload = {
      title: defaultTitle,
      travel_style: String(formData.get("travel_style") || "").trim(),
      departure_date: normalizeDepartureDate(formData.get("travel_style"), formData.get("departure_date")),
      origin_country_id: String(formData.get("origin_country_id") || "").trim(),
      origin_province: String(formData.get("origin_province") || "").trim(),
      destination_country_id: String(formData.get("destination_country_id") || "").trim(),
      destination_province: String(formData.get("destination_province") || "").trim(),
      currency: pricing[defaultLanguage as SupportedLanguage].currency,
      minimal_peserta: Number(formData.get("minimal_peserta") || 1),
      duration: Number(formData.get("duration_days") || 1),
      price_adult: pricing[defaultLanguage as SupportedLanguage].price_adult,
      price_child: pricing[defaultLanguage as SupportedLanguage].price_child,
      default_language: defaultLanguage,
      published_languages: publishedLanguages,
      status: "draft",
      rejection_reason: null,
      reviewed_at: null,
      updated_at: new Date().toISOString(),
    }

    const legacyPayload = {
      ...payload,
      published_languages: undefined,
    }
    delete legacyPayload.published_languages

    let updateResult = await adminSupabase
      .from("packages")
      .update(payload)
      .eq("id", packageId)

    if (updateResult.error && shouldRetryWithoutPublishedLanguages(updateResult.error.message)) {
      updateResult = await adminSupabase
        .from("packages")
        .update(legacyPayload)
        .eq("id", packageId)
    }

    if (updateResult.error) {
      throw new Error(`Gagal menyimpan basic info: ${sanitizeErrorMessage(updateResult.error.message)}`)
    }

    const titleTranslationRows = publishedLanguages.map((code) => ({
      package_id: packageId,
      language_code: code,
      title: titles[code] || defaultTitle,
      currency: pricing[code].currency,
      price_adult: pricing[code].price_adult,
      price_child: pricing[code].price_child,
    }))

    const { error: translationError } = await adminSupabase
      .from("package_translations")
      .upsert(titleTranslationRows, { onConflict: "package_id,language_code" })

    if (translationError) {
      throw new Error(`Gagal menyimpan judul multibahasa: ${sanitizeErrorMessage(translationError.message)}`)
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
      package_translations?: Array<{
        language_code: string | null
        title: string | null
        currency: string | null
        price_adult: number | null
        price_child: number | null
      }> | null
    } | null = null

    const pkgWithPublished = await adminSupabase
      .from("packages")
      .select("default_language, title, published_languages, package_translations(language_code, title, currency, price_adult, price_child)")
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
        package_translations?: Array<{
          language_code: string | null
          title: string | null
          currency: string | null
          price_adult: number | null
          price_child: number | null
        }> | null
      } | null
    }

    if (!pkg) throw new Error("Package tidak ditemukan.")

    const defaultLanguage = String(pkg.default_language || "id")
    const publishedLanguages = normalizePublishedLanguages(
      (pkg.published_languages || []) as FormDataEntryValue[],
      defaultLanguage,
    )
    const existingTitles = Object.fromEntries(
      ((pkg.package_translations || []) as Array<{
        language_code: string | null
        title: string | null
        currency: string | null
        price_adult: number | null
        price_child: number | null
      }>).map((item) => [
        item.language_code || "id",
        {
          title: item.title || "",
          currency: item.currency || null,
          price_adult: item.price_adult,
          price_child: item.price_child,
        },
      ]),
    ) as Partial<Record<SupportedLanguage, {
      title: string
      currency: string | null
      price_adult: number | null
      price_child: number | null
    }>>

    const translationRows = SUPPORTED_LANGUAGES
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
          aboutTour || serviceStandard || include || exclude || preparation || termsConditions || meetingPoint || highlights,
        )

        if (!isPublished && !hasAnyContent) return null
        if (isDefault && !aboutTour) {
          throw new Error(`Info Tentang Tour wajib diisi untuk bahasa default (${defaultLanguage})`)
        }

        return {
          package_id: packageId,
          language_code: code,
          title: existingTitles[code]?.title || pkg.title,
          about_tour: aboutTour || null,
          service_standard: serviceStandard || null,
          include: include || null,
          exclude: exclude || null,
          preparation: preparation || null,
          terms_conditions: termsConditions || null,
          meeting_point: meetingPoint || null,
          highlights: highlights || null,
          currency: existingTitles[code]?.currency,
          price_adult: existingTitles[code]?.price_adult,
          price_child: existingTitles[code]?.price_child,
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
          meeting_point: String(formData.get(`meeting_point_${defaultLanguage}`) || "").trim(),
          map_embed: String(formData.get("map_embed") || "").trim(),
          location_label: String(formData.get("location_label") || "").trim() || null,
          location_type: String(formData.get("location_type") || "").trim() || null,
          primary_lat: normalizeOptionalDecimal(formData.get("primary_lat")),
          primary_lng: normalizeOptionalDecimal(formData.get("primary_lng")),
          viewport_radius_km: normalizeOptionalInteger(formData.get("viewport_radius_km")),
          geo_updated_at: new Date().toISOString(),
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

    const tagsRaw = String(formData.get(`highlights_${defaultLanguage}`) || "")
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

    await markPackageDraft(adminSupabase, packageId)
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

    await markPackageDraft(adminSupabase, packageId)
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

    await ensureItineraryTranslationTablesReady(adminSupabase)

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

    const pkgLanguage = await adminSupabase
      .from("packages")
      .select("default_language")
      .eq("id", packageId)
      .single()

    const defaultLanguage = String(pkgLanguage.data?.default_language || formData.get("default_language") || "id") as SupportedLanguage
    const { dayTitles, descriptions, routes: translatedRoutes } = getItineraryTranslations(formData)
    const dayNumbers = formData.getAll("day_number[]") as string[]
    const pickupTimes = formData.getAll("pickup_time[]") as string[]
    const pickupPeriods = formData.getAll("pickup_period[]") as string[]

    const grouped: Record<string, { pickup_time: string; route: string; description: string }[]> = {}

    dayNumbers.forEach((day, index) => {
      if (!grouped[day]) grouped[day] = []

      grouped[day].push({
        pickup_time: normalizePickupTimeForStorage(pickupTimes[index] || "", pickupPeriods[index] || "AM"),
        route: translatedRoutes[defaultLanguage][index] || "",
        description: "",
      })
    })

    const orderedDays = Object.keys(grouped).sort((a, b) => Number(a) - Number(b))
    orderedDays.forEach((dayKey, dayIndex) => {
      const dayDescription = descriptions[defaultLanguage][dayIndex] || ""
      grouped[dayKey] = grouped[dayKey].map((routeRow) => ({
        ...routeRow,
        description: dayDescription,
      }))
    })

    for (const [dayIndex, day] of orderedDays.entries()) {
      const { data: dayInsert, error: dayError } = await adminSupabase
        .from("package_itinerary_days")
        .insert({
          package_id: packageId,
          day_number: Number(day),
          day_title: String(dayTitles[defaultLanguage][dayIndex] || "").trim() || null,
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

      const routeInsertResult = await adminSupabase
        .from("package_itinerary_routes")
        .insert(routesToInsert)
        .select("id")

      if (routeInsertResult.error) {
        throw new Error(`Gagal menyimpan rute itinerary: ${routeInsertResult.error.message}`)
      }

      const insertedRoutes = routeInsertResult.data || []

      const dayTranslationRows = SUPPORTED_LANGUAGES.map((code) => ({
        itinerary_day_id: dayInsert.id,
        language_code: code,
        day_title: String(dayTitles[code][dayIndex] || "").trim() || null,
      }))

      const { error: dayTranslationError } = await adminSupabase
        .from("package_itinerary_day_translations")
        .insert(dayTranslationRows)

      if (dayTranslationError) {
        throw new Error(`Gagal menyimpan terjemahan hari itinerary: ${dayTranslationError.message}`)
      }

      const dayRouteIndexes = dayNumbers.reduce((acc, value, idx) => {
        if (value === day) acc.push(idx)
        return acc
      }, [] as number[])

      const routeTranslationRows = insertedRoutes.flatMap((routeRow, routeIndex) => {
        const absoluteIndex = dayRouteIndexes[routeIndex]

        return SUPPORTED_LANGUAGES.map((code) => ({
          itinerary_route_id: routeRow.id,
          language_code: code,
          route: String(translatedRoutes[code][absoluteIndex] || "").trim() || null,
          description: String(descriptions[code][dayIndex] || "").trim() || null,
        }))
      })

      const { error: routeTranslationError } = await adminSupabase
        .from("package_itinerary_route_translations")
        .insert(routeTranslationRows)

      if (routeTranslationError) {
        throw new Error(`Gagal menyimpan terjemahan rute itinerary: ${routeTranslationError.message}`)
      }
    }

    revalidatePath("/merchant/paket")
    revalidatePath(`/merchant/paket/${packageId}/edit`)
  } catch (error) {
    redirect(`/merchant/paket/${packageId}/edit?step=4&error=${encodeURIComponent(getErrorMessage(error))}`)
  }

  redirect(`/merchant/paket/${packageId}/edit?step=5`)
}

export async function submitEditedPackageForReview(formData: FormData) {
  const packageId = String(formData.get("package_id") || "")

  try {
    if (!packageId) throw new Error("Package ID tidak ditemukan.")

    const { adminSupabase } = await getOwnedMerchantPackage(packageId)

    await markPackagePending(adminSupabase, packageId)
    revalidatePath("/merchant/paket")
    revalidatePath(`/merchant/paket/${packageId}/edit`)
  } catch (error) {
    redirect(`/merchant/paket/${packageId}/edit?step=5&error=${encodeURIComponent(getErrorMessage(error))}`)
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
    const departureDate = normalizeDepartureDate(formData.get("travel_style"), formData.get("departure_date"))
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
      departure_date: departureDate,
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
    await purgePackageRecords(adminSupabase, packageId)
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

    const { adminSupabase, pkg } = await getOwnedMerchantPackage(packageId)

    if (targetStatus === "approved" && pkg.status === "rejected") {
      throw new Error("Paket yang ditolak admin harus diedit lalu dikirim ulang ke review sebelum bisa diaktifkan.")
    }

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

    if (pkg.status !== "pending" && pkg.status !== "rejected") {
      throw new Error("Hanya paket yang sedang pending review atau ditolak admin yang bisa ditarik ke draft.")
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
