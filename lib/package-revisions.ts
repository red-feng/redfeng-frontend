import { createAdminClient } from "@/lib/supabase/admin"

const SUPPORTED_LANGUAGES = ["id", "en", "zh"] as const
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number]

export type PackageCoreSnapshot = {
  id: string
  merchant_id: string
  status: string | null
  package_code: string | null
  title: string
  travel_style: string
  departure_date: string
  origin_country_id: string
  origin_province: string
  destination_country_id: string
  destination_province: string
  currency: string
  minimal_peserta: number
  duration: number
  price_adult: number
  price_child: number
  default_language: SupportedLanguage
  published_languages: SupportedLanguage[]
  cover_image: string | null
  updated_at: string | null
}

export type PackageTranslationSnapshot = {
  title: string
  about_tour: string
  service_standard: string
  include: string
  exclude: string
  preparation: string
  terms_conditions: string
  meeting_point: string
  highlights: string
  currency: string
  price_adult: number
  price_child: number
}

export type PackageDetailsSnapshot = {
  meeting_point: string
  map_embed: string
  location_label: string
  location_type: string
  primary_lat: number | null
  primary_lng: number | null
  viewport_radius_km: number | null
}

export type PackageItinerarySnapshot = Array<{
  day: number
  translations: Record<SupportedLanguage, { title: string; description: string }>
  routes: Array<{
    pickup_time: string
    translations: Record<SupportedLanguage, string>
  }>
}>

export type PackageRevisionPayload = {
  package: PackageCoreSnapshot
  translations: Record<SupportedLanguage, PackageTranslationSnapshot>
  details: PackageDetailsSnapshot
  facility_ids: string[]
  tags: string[]
  itinerary: PackageItinerarySnapshot
}

export type PackageRevisionRow = {
  id: string
  package_id: string
  merchant_id: string
  source: string
  status: string
  payload: PackageRevisionPayload | null
  live_snapshot: PackageRevisionPayload | null
  changed_fields: string[] | null
  summary: string | null
  submitted_by: string | null
  reviewed_by: string | null
  submitted_at: string | null
  reviewed_at: string | null
  rejection_reason: string | null
  approved_at: string | null
  superseded_at: string | null
  base_package_updated_at: string | null
  created_at: string
  updated_at: string
}

type AdminClient = ReturnType<typeof createAdminClient>

function normalizeLanguage(code: string | null | undefined): SupportedLanguage {
  return SUPPORTED_LANGUAGES.includes(code as SupportedLanguage) ? (code as SupportedLanguage) : "id"
}

function emptyTranslation(currency = "IDR", adult = 0, child = 0): PackageTranslationSnapshot {
  return {
    title: "",
    about_tour: "",
    service_standard: "",
    include: "",
    exclude: "",
    preparation: "",
    terms_conditions: "",
    meeting_point: "",
    highlights: "",
    currency,
    price_adult: adult,
    price_child: child,
  }
}

function clonePayload(payload: PackageRevisionPayload): PackageRevisionPayload {
  return JSON.parse(JSON.stringify(payload)) as PackageRevisionPayload
}

function normalizePayload(input: unknown): PackageRevisionPayload | null {
  if (!input || typeof input !== "object") return null
  const raw = input as Record<string, unknown>
  const pkg = (raw.package as Record<string, unknown> | undefined) || {}
  const translationsRaw = (raw.translations as Record<string, unknown> | undefined) || {}
  const detailsRaw = (raw.details as Record<string, unknown> | undefined) || {}
  const itineraryRaw = Array.isArray(raw.itinerary) ? raw.itinerary : []
  const facilityIds = Array.isArray(raw.facility_ids) ? raw.facility_ids.map((value) => String(value || "")).filter(Boolean) : []
  const tags = Array.isArray(raw.tags) ? raw.tags.map((value) => String(value || "")).filter(Boolean) : []

  const defaultLanguage = normalizeLanguage(String(pkg.default_language || "id"))
  const publishedLanguages = Array.isArray(pkg.published_languages)
    ? [...new Set(pkg.published_languages.map((value) => normalizeLanguage(String(value || ""))))]
    : [defaultLanguage]

  const packageSnapshot: PackageCoreSnapshot = {
    id: String(pkg.id || ""),
    merchant_id: String(pkg.merchant_id || ""),
    status: String(pkg.status || ""),
    package_code: pkg.package_code ? String(pkg.package_code) : null,
    title: String(pkg.title || ""),
    travel_style: String(pkg.travel_style || ""),
    departure_date: String(pkg.departure_date || ""),
    origin_country_id: String(pkg.origin_country_id || ""),
    origin_province: String(pkg.origin_province || ""),
    destination_country_id: String(pkg.destination_country_id || ""),
    destination_province: String(pkg.destination_province || ""),
    currency: String(pkg.currency || "IDR"),
    minimal_peserta: Number(pkg.minimal_peserta || 1),
    duration: Number(pkg.duration || 1),
    price_adult: Number(pkg.price_adult || 0),
    price_child: Number(pkg.price_child || 0),
    default_language: defaultLanguage,
    published_languages: publishedLanguages.length > 0 ? publishedLanguages : [defaultLanguage],
    cover_image: pkg.cover_image ? String(pkg.cover_image) : null,
    updated_at: pkg.updated_at ? String(pkg.updated_at) : null,
  }

  const translations = SUPPORTED_LANGUAGES.reduce(
    (acc, code) => {
      const current = (translationsRaw[code] as Record<string, unknown> | undefined) || {}
      acc[code] = {
        title: String(current.title || ""),
        about_tour: String(current.about_tour || ""),
        service_standard: String(current.service_standard || ""),
        include: String(current.include || ""),
        exclude: String(current.exclude || ""),
        preparation: String(current.preparation || ""),
        terms_conditions: String(current.terms_conditions || ""),
        meeting_point: String(current.meeting_point || ""),
        highlights: String(current.highlights || ""),
        currency: String(current.currency || packageSnapshot.currency || "IDR"),
        price_adult: Number(current.price_adult ?? packageSnapshot.price_adult ?? 0),
        price_child: Number(current.price_child ?? packageSnapshot.price_child ?? 0),
      }
      return acc
    },
    {} as Record<SupportedLanguage, PackageTranslationSnapshot>,
  )

  const details: PackageDetailsSnapshot = {
    meeting_point: String(detailsRaw.meeting_point || ""),
    map_embed: String(detailsRaw.map_embed || ""),
    location_label: String(detailsRaw.location_label || ""),
    location_type: String(detailsRaw.location_type || ""),
    primary_lat:
      typeof detailsRaw.primary_lat === "number" ? detailsRaw.primary_lat : detailsRaw.primary_lat ? Number(detailsRaw.primary_lat) : null,
    primary_lng:
      typeof detailsRaw.primary_lng === "number" ? detailsRaw.primary_lng : detailsRaw.primary_lng ? Number(detailsRaw.primary_lng) : null,
    viewport_radius_km:
      typeof detailsRaw.viewport_radius_km === "number"
        ? Math.trunc(detailsRaw.viewport_radius_km)
        : detailsRaw.viewport_radius_km
          ? Math.trunc(Number(detailsRaw.viewport_radius_km))
          : null,
  }

  const itinerary: PackageItinerarySnapshot = itineraryRaw.map((dayValue, index) => {
    const day = (dayValue as Record<string, unknown>) || {}
    const translationsValue = (day.translations as Record<string, unknown> | undefined) || {}
    const routesValue = Array.isArray(day.routes) ? day.routes : []

    return {
      day: Number(day.day || index + 1),
      translations: SUPPORTED_LANGUAGES.reduce(
        (acc, code) => {
          const current = (translationsValue[code] as Record<string, unknown> | undefined) || {}
          acc[code] = {
            title: String(current.title || ""),
            description: String(current.description || ""),
          }
          return acc
        },
        {} as Record<SupportedLanguage, { title: string; description: string }>,
      ),
      routes: routesValue.map((routeValue) => {
        const route = (routeValue as Record<string, unknown>) || {}
        const translationsRoute = (route.translations as Record<string, unknown> | undefined) || {}
        return {
          pickup_time: String(route.pickup_time || ""),
          translations: SUPPORTED_LANGUAGES.reduce(
            (acc, code) => {
              acc[code] = String(translationsRoute[code] || "")
              return acc
            },
            {} as Record<SupportedLanguage, string>,
          ),
        }
      }),
    }
  })

  return {
    package: packageSnapshot,
    translations,
    details,
    facility_ids: facilityIds,
    tags,
    itinerary,
  }
}

function flattenForDiff(value: unknown, prefix = ""): Array<[string, string]> {
  if (Array.isArray(value)) {
    if (value.length === 0) return [[prefix, "[]"]]
    return value.flatMap((item, index) => flattenForDiff(item, `${prefix}[${index}]`))
  }

  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
    if (!entries.length) return [[prefix, "{}"]]
    return entries.flatMap(([key, nested]) => flattenForDiff(nested, prefix ? `${prefix}.${key}` : key))
  }

  return [[prefix, JSON.stringify(value ?? null)]]
}

function computeChangedFields(liveSnapshot: PackageRevisionPayload, payload: PackageRevisionPayload): string[] {
  const liveMap = new Map(flattenForDiff(liveSnapshot))
  const payloadMap = new Map(flattenForDiff(payload))
  const keys = new Set([...liveMap.keys(), ...payloadMap.keys()])
  return [...keys].filter((key) => liveMap.get(key) !== payloadMap.get(key)).sort()
}

export async function loadPackageLivePayload(adminSupabase: AdminClient, packageId: string): Promise<PackageRevisionPayload> {
  const packageSelect =
    "id, merchant_id, status, package_code, title, travel_style, departure_date, origin_country_id, origin_province, destination_country_id, destination_province, currency, minimal_peserta, duration, price_adult, price_child, default_language, published_languages, cover_image, updated_at"
  const packageSelectLegacy =
    "id, merchant_id, status, package_code, title, travel_style, departure_date, origin_country_id, origin_province, destination_country_id, destination_province, currency, minimal_peserta, duration, price_adult, price_child, default_language, cover_image, updated_at"

  const pkgWithPublished = await adminSupabase.from("packages").select(packageSelect).eq("id", packageId).single()

  let pkg = pkgWithPublished.data as Record<string, unknown> | null
  if (pkgWithPublished.error && pkgWithPublished.error.message.includes("published_languages")) {
    const legacyResult = await adminSupabase.from("packages").select(packageSelectLegacy).eq("id", packageId).single()
    if (legacyResult.error || !legacyResult.data) {
      throw new Error(`Gagal memuat paket live: ${legacyResult.error?.message || "Package tidak ditemukan."}`)
    }
    pkg = {
      ...legacyResult.data,
      published_languages: [legacyResult.data.default_language || "id"],
    }
  } else if (pkgWithPublished.error || !pkgWithPublished.data) {
    throw new Error(`Gagal memuat paket live: ${pkgWithPublished.error?.message || "Package tidak ditemukan."}`)
  }

  if (!pkg) {
    throw new Error("Package tidak ditemukan.")
  }

  const packageSnapshot: PackageCoreSnapshot = {
    id: String(pkg.id || ""),
    merchant_id: String(pkg.merchant_id || ""),
    status: pkg.status ? String(pkg.status) : null,
    package_code: pkg.package_code ? String(pkg.package_code) : null,
    title: String(pkg.title || ""),
    travel_style: String(pkg.travel_style || ""),
    departure_date: String(pkg.departure_date || ""),
    origin_country_id: String(pkg.origin_country_id || ""),
    origin_province: String(pkg.origin_province || ""),
    destination_country_id: String(pkg.destination_country_id || ""),
    destination_province: String(pkg.destination_province || ""),
    currency: String(pkg.currency || "IDR"),
    minimal_peserta: Number(pkg.minimal_peserta || 1),
    duration: Number(pkg.duration || 1),
    price_adult: Number(pkg.price_adult || 0),
    price_child: Number(pkg.price_child || 0),
    default_language: normalizeLanguage(String(pkg.default_language || "id")),
    published_languages: Array.isArray(pkg.published_languages)
      ? [...new Set(pkg.published_languages.map((value) => normalizeLanguage(String(value || ""))))]
      : [normalizeLanguage(String(pkg.default_language || "id"))],
    cover_image: pkg.cover_image ? String(pkg.cover_image) : null,
    updated_at: pkg.updated_at ? String(pkg.updated_at) : null,
  }

  const [translationsResult, detailsResult, tagsResult, facilitiesResult, itineraryResult] = await Promise.all([
    adminSupabase
      .from("package_translations")
      .select("language_code, title, about_tour, service_standard, include, exclude, preparation, terms_conditions, meeting_point, highlights, currency, price_adult, price_child")
      .eq("package_id", packageId),
    adminSupabase
      .from("package_details")
      .select("meeting_point, map_embed, location_label, location_type, primary_lat, primary_lng, viewport_radius_km")
      .eq("package_id", packageId)
      .maybeSingle(),
    adminSupabase.from("package_tags").select("tag").eq("package_id", packageId),
    adminSupabase.from("package_facilities").select("facility_id").eq("package_id", packageId),
    adminSupabase
      .from("package_itinerary_days")
      .select("id, day_number, day_title, package_itinerary_routes(id, pickup_time, route, description)")
      .eq("package_id", packageId)
      .order("day_number", { ascending: true }),
  ])

  const translationRows = (translationsResult.data || []) as Array<Record<string, unknown>>
  const translations = SUPPORTED_LANGUAGES.reduce(
    (acc, code) => {
      const row = translationRows.find((item) => normalizeLanguage(String(item.language_code || "")) === code)
      acc[code] = row
        ? {
            title: String(row.title || ""),
            about_tour: String(row.about_tour || ""),
            service_standard: String(row.service_standard || ""),
            include: String(row.include || ""),
            exclude: String(row.exclude || ""),
            preparation: String(row.preparation || ""),
            terms_conditions: String(row.terms_conditions || ""),
            meeting_point: String(row.meeting_point || ""),
            highlights: String(row.highlights || ""),
            currency: String(row.currency || packageSnapshot.currency),
            price_adult: Number(row.price_adult ?? packageSnapshot.price_adult),
            price_child: Number(row.price_child ?? packageSnapshot.price_child),
          }
        : emptyTranslation(packageSnapshot.currency, packageSnapshot.price_adult, packageSnapshot.price_child)
      return acc
    },
    {} as Record<SupportedLanguage, PackageTranslationSnapshot>,
  )

  const detailsRow = (detailsResult.data || {}) as Record<string, unknown>
  const details: PackageDetailsSnapshot = {
    meeting_point: String(detailsRow.meeting_point || ""),
    map_embed: String(detailsRow.map_embed || ""),
    location_label: String(detailsRow.location_label || ""),
    location_type: String(detailsRow.location_type || ""),
    primary_lat: typeof detailsRow.primary_lat === "number" ? detailsRow.primary_lat : detailsRow.primary_lat ? Number(detailsRow.primary_lat) : null,
    primary_lng: typeof detailsRow.primary_lng === "number" ? detailsRow.primary_lng : detailsRow.primary_lng ? Number(detailsRow.primary_lng) : null,
    viewport_radius_km:
      typeof detailsRow.viewport_radius_km === "number"
        ? Math.trunc(detailsRow.viewport_radius_km)
        : detailsRow.viewport_radius_km
          ? Math.trunc(Number(detailsRow.viewport_radius_km))
          : null,
  }

  if (!translations[packageSnapshot.default_language].meeting_point && details.meeting_point) {
    translations[packageSnapshot.default_language].meeting_point = details.meeting_point
  }

  const tags = ((tagsResult.data || []) as Array<{ tag: string | null }>).map((item) => String(item.tag || "").trim()).filter(Boolean)
  if (!translations[packageSnapshot.default_language].highlights && tags.length > 0) {
    translations[packageSnapshot.default_language].highlights = tags.join(", ")
  }

  const facilityIds = ((facilitiesResult.data || []) as Array<{ facility_id: string | null }>)
    .map((item) => String(item.facility_id || "").trim())
    .filter(Boolean)

  const itineraryDays = (itineraryResult.data || []) as Array<{
    id?: string
    day_number: number
    day_title: string | null
    package_itinerary_routes: Array<{
      id?: string
      pickup_time: string | null
      route: string | null
      description: string | null
    }>
  }>

  const itineraryDayIds = itineraryDays.map((day) => day.id).filter(Boolean)
  const itineraryRouteIds = itineraryDays.flatMap((day) => (day.package_itinerary_routes || []).map((route) => route.id).filter(Boolean))

  const [dayTranslationsResult, routeTranslationsResult] = await Promise.all([
    itineraryDayIds.length > 0
      ? adminSupabase
          .from("package_itinerary_day_translations")
          .select("itinerary_day_id, language_code, day_title")
          .in("itinerary_day_id", itineraryDayIds)
      : Promise.resolve({ data: [], error: null }),
    itineraryRouteIds.length > 0
      ? adminSupabase
          .from("package_itinerary_route_translations")
          .select("itinerary_route_id, language_code, route, description")
          .in("itinerary_route_id", itineraryRouteIds)
      : Promise.resolve({ data: [], error: null }),
  ])

  const dayTranslationsMap = new Map(
    ((dayTranslationsResult.data || []) as Array<{ itinerary_day_id: string | null; language_code: string | null; day_title: string | null }>)
      .map((item) => [`${item.itinerary_day_id || ""}:${normalizeLanguage(item.language_code)}`, item.day_title || ""]),
  )
  const routeTranslationsMap = new Map(
    ((routeTranslationsResult.data || []) as Array<{ itinerary_route_id: string | null; language_code: string | null; route: string | null; description: string | null }>)
      .map((item) => [
        `${item.itinerary_route_id || ""}:${normalizeLanguage(item.language_code)}`,
        {
          route: item.route || "",
          description: item.description || "",
        },
      ]),
  )

  const itinerary: PackageItinerarySnapshot = itineraryDays.map((day) => {
    const firstRoute = day.package_itinerary_routes?.[0]
    return {
      day: day.day_number,
      translations: SUPPORTED_LANGUAGES.reduce(
        (acc, code) => {
          acc[code] = {
            title: dayTranslationsMap.get(`${day.id || ""}:${code}`) || (code === packageSnapshot.default_language ? day.day_title || "" : ""),
            description:
              routeTranslationsMap.get(`${firstRoute?.id || ""}:${code}`)?.description ||
              (code === packageSnapshot.default_language ? firstRoute?.description || "" : ""),
          }
          return acc
        },
        {} as Record<SupportedLanguage, { title: string; description: string }>,
      ),
      routes: (day.package_itinerary_routes || []).map((route) => ({
        pickup_time: route.pickup_time || "",
        translations: SUPPORTED_LANGUAGES.reduce(
          (acc, code) => {
            acc[code] =
              routeTranslationsMap.get(`${route.id || ""}:${code}`)?.route ||
              (code === packageSnapshot.default_language ? route.route || "" : "")
            return acc
          },
          {} as Record<SupportedLanguage, string>,
        ),
      })),
    }
  })

  return {
    package: packageSnapshot,
    translations,
    details,
    facility_ids: facilityIds,
    tags,
    itinerary,
  }
}

async function createDraftRevision(adminSupabase: AdminClient, packageId: string, merchantId: string, payload: PackageRevisionPayload, summary: string | null) {
  const insertPayload = clonePayload(payload)
  const changedFields = computeChangedFields(insertPayload, insertPayload)
  const { data, error } = await adminSupabase
    .from("package_revisions")
    .insert({
      package_id: packageId,
      merchant_id: merchantId,
      status: "draft",
      payload: insertPayload,
      live_snapshot: insertPayload,
      changed_fields: changedFields,
      summary,
      base_package_updated_at: payload.package.updated_at,
    })
    .select("*")
    .single()

  if (error || !data) {
    throw new Error(`Gagal membuat draft revisi paket: ${error?.message || "Unknown error"}`)
  }

  return data as PackageRevisionRow
}

export async function getLatestRelevantRevision(adminSupabase: AdminClient, packageId: string) {
  const { data, error } = await adminSupabase
    .from("package_revisions")
    .select("*")
    .eq("package_id", packageId)
    .in("status", ["draft", "pending", "rejected"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    throw new Error(`Gagal memuat revisi paket: ${error.message}`)
  }

  return data as PackageRevisionRow | null
}

export async function ensureEditableRevision(adminSupabase: AdminClient, packageId: string, merchantId: string) {
  const livePayload = await loadPackageLivePayload(adminSupabase, packageId)
  const latestRevision = await getLatestRelevantRevision(adminSupabase, packageId)

  if (latestRevision?.status === "draft" || latestRevision?.status === "pending") {
    return {
      revision: {
        ...latestRevision,
        payload: normalizePayload(latestRevision.payload),
        live_snapshot: normalizePayload(latestRevision.live_snapshot),
      } as PackageRevisionRow,
      livePayload,
    }
  }

  if (latestRevision?.status === "rejected") {
    const payload = normalizePayload(latestRevision.payload) || livePayload
    const draftRevision = await createDraftRevision(adminSupabase, packageId, merchantId, payload, latestRevision.summary)
    return {
      revision: {
        ...draftRevision,
        payload: normalizePayload(draftRevision.payload),
        live_snapshot: normalizePayload(draftRevision.live_snapshot),
      } as PackageRevisionRow,
      livePayload,
    }
  }

  const newDraft = await createDraftRevision(adminSupabase, packageId, merchantId, livePayload, "Draft revisi dari paket live")
  return {
    revision: {
      ...newDraft,
      payload: normalizePayload(newDraft.payload),
      live_snapshot: normalizePayload(newDraft.live_snapshot),
    } as PackageRevisionRow,
    livePayload,
  }
}

export async function getRevisionById(adminSupabase: AdminClient, revisionId: string) {
  const { data, error } = await adminSupabase.from("package_revisions").select("*").eq("id", revisionId).single()
  if (error || !data) {
    throw new Error(`Gagal memuat revisi paket: ${error?.message || "Revision tidak ditemukan."}`)
  }

  return {
    ...(data as PackageRevisionRow),
    payload: normalizePayload((data as PackageRevisionRow).payload),
    live_snapshot: normalizePayload((data as PackageRevisionRow).live_snapshot),
  } as PackageRevisionRow
}

export async function saveRevisionPayload(adminSupabase: AdminClient, revisionId: string, payload: PackageRevisionPayload, summary?: string | null) {
  const revision = await getRevisionById(adminSupabase, revisionId)
  const liveSnapshot = normalizePayload(revision.live_snapshot) || payload
  const changedFields = computeChangedFields(liveSnapshot, payload)

  const { error } = await adminSupabase
    .from("package_revisions")
    .update({
      payload: clonePayload(payload),
      changed_fields: changedFields,
      summary: summary ?? revision.summary ?? null,
      base_package_updated_at: liveSnapshot.package.updated_at,
      ...(revision.status === "rejected" ? { status: "draft", rejection_reason: null, reviewed_by: null, reviewed_at: null } : {}),
    })
    .eq("id", revisionId)

  if (error) {
    throw new Error(`Gagal menyimpan draft revisi paket: ${error.message}`)
  }
}

export async function submitRevisionForReview(adminSupabase: AdminClient, revisionId: string, actorId?: string | null) {
  const { error } = await adminSupabase
    .from("package_revisions")
    .update({
      status: "pending",
      submitted_by: actorId || null,
      submitted_at: new Date().toISOString(),
      reviewed_by: null,
      reviewed_at: null,
      rejection_reason: null,
    })
    .eq("id", revisionId)

  if (error) {
    throw new Error(`Gagal mengirim revisi untuk review: ${error.message}`)
  }
}

export async function rejectRevisionById(adminSupabase: AdminClient, revisionId: string, reason: string, actorId?: string | null) {
  const { error } = await adminSupabase
    .from("package_revisions")
    .update({
      status: "rejected",
      rejection_reason: reason.trim(),
      reviewed_by: actorId || null,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", revisionId)

  if (error) {
    throw new Error(`Gagal menolak revisi paket: ${error.message}`)
  }
}

async function applyItineraryPayload(adminSupabase: AdminClient, packageId: string, payload: PackageRevisionPayload) {
  const { data: existingDays, error: itineraryError } = await adminSupabase
    .from("package_itinerary_days")
    .select("id")
    .eq("package_id", packageId)

  if (itineraryError) {
    throw new Error(`Gagal memuat itinerary lama: ${itineraryError.message}`)
  }

  const itineraryDayIds = (existingDays || []).map((item) => item.id)
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

  for (const day of payload.itinerary) {
    const defaultLanguage = payload.package.default_language
    const { data: dayInsert, error: dayError } = await adminSupabase
      .from("package_itinerary_days")
      .insert({
        package_id: packageId,
        day_number: day.day,
        day_title: day.translations[defaultLanguage]?.title || null,
      })
      .select()
      .single()

    if (dayError || !dayInsert) {
      throw new Error(`Gagal menyimpan hari itinerary: ${dayError?.message || "Unknown error"}`)
    }

    const routesToInsert = day.routes.map((route) => ({
      itinerary_day_id: dayInsert.id,
      pickup_time: route.pickup_time || "",
      route: route.translations[defaultLanguage] || "",
      description: day.translations[defaultLanguage]?.description || "",
    }))

    const routeInsertResult = routesToInsert.length > 0
      ? await adminSupabase.from("package_itinerary_routes").insert(routesToInsert).select("id")
      : { data: [], error: null as { message?: string } | null }

    if (routeInsertResult.error) {
      throw new Error(`Gagal menyimpan rute itinerary: ${routeInsertResult.error.message}`)
    }

    const insertedRoutes = routeInsertResult.data || []

    const dayTranslationRows = SUPPORTED_LANGUAGES.map((code) => ({
      itinerary_day_id: dayInsert.id,
      language_code: code,
      day_title: day.translations[code]?.title || null,
    }))

    const { error: dayTranslationError } = await adminSupabase
      .from("package_itinerary_day_translations")
      .insert(dayTranslationRows)

    if (dayTranslationError) {
      throw new Error(`Gagal menyimpan terjemahan hari itinerary: ${dayTranslationError.message}`)
    }

    const routeTranslationRows = insertedRoutes.flatMap((routeRow, routeIndex) =>
      SUPPORTED_LANGUAGES.map((code) => ({
        itinerary_route_id: routeRow.id,
        language_code: code,
        route: day.routes[routeIndex]?.translations[code] || null,
        description: day.translations[code]?.description || null,
      })),
    )

    if (routeTranslationRows.length > 0) {
      const { error: routeTranslationError } = await adminSupabase
        .from("package_itinerary_route_translations")
        .insert(routeTranslationRows)

      if (routeTranslationError) {
        throw new Error(`Gagal menyimpan terjemahan rute itinerary: ${routeTranslationError.message}`)
      }
    }
  }
}

export async function applyRevisionPayloadToPackage(adminSupabase: AdminClient, packageId: string, payload: PackageRevisionPayload) {
  const defaultLanguage = payload.package.default_language
  const currentPackageResult = await adminSupabase.from("packages").select("status").eq("id", packageId).single()
  if (currentPackageResult.error || !currentPackageResult.data) {
    throw new Error(`Gagal memuat status paket live: ${currentPackageResult.error?.message || "Package tidak ditemukan."}`)
  }

  const packagePayload = {
    title: payload.package.title || payload.translations[defaultLanguage]?.title || "",
    travel_style: payload.package.travel_style,
    departure_date: payload.package.departure_date || null,
    origin_country_id: payload.package.origin_country_id,
    origin_province: payload.package.origin_province,
    destination_country_id: payload.package.destination_country_id,
    destination_province: payload.package.destination_province,
    currency: payload.package.currency,
    minimal_peserta: payload.package.minimal_peserta,
    duration: payload.package.duration,
    price_adult: payload.package.price_adult,
    price_child: payload.package.price_child,
    default_language: defaultLanguage,
    published_languages: payload.package.published_languages,
    status: currentPackageResult.data.status,
    rejection_reason: null,
    reviewed_at: null,
    updated_at: new Date().toISOString(),
  }

  const legacyPayload = { ...packagePayload, published_languages: undefined as unknown }
  delete (legacyPayload as Record<string, unknown>).published_languages

  let updateResult = await adminSupabase.from("packages").update(packagePayload).eq("id", packageId)
  if (updateResult.error && updateResult.error.message.includes("published_languages")) {
    updateResult = await adminSupabase.from("packages").update(legacyPayload).eq("id", packageId)
  }
  if (updateResult.error) {
    throw new Error(`Gagal menerapkan basic info revisi: ${updateResult.error.message}`)
  }

  const translationRows = SUPPORTED_LANGUAGES.map((code) => ({
    package_id: packageId,
    language_code: code,
    ...payload.translations[code],
    title: payload.translations[code].title || payload.package.title || null,
    about_tour: payload.translations[code].about_tour || null,
    service_standard: payload.translations[code].service_standard || null,
    include: payload.translations[code].include || null,
    exclude: payload.translations[code].exclude || null,
    preparation: payload.translations[code].preparation || null,
    terms_conditions: payload.translations[code].terms_conditions || null,
    meeting_point: payload.translations[code].meeting_point || null,
    highlights: payload.translations[code].highlights || null,
  }))

  const { error: translationsError } = await adminSupabase
    .from("package_translations")
    .upsert(translationRows, { onConflict: "package_id,language_code" })

  if (translationsError) {
    throw new Error(`Gagal menerapkan terjemahan revisi: ${translationsError.message}`)
  }

  const { error: detailsError } = await adminSupabase
    .from("package_details")
    .upsert(
      {
        package_id: packageId,
        ...payload.details,
      },
      { onConflict: "package_id" },
    )

  if (detailsError) {
    throw new Error(`Gagal menerapkan detail revisi: ${detailsError.message}`)
  }

  const { error: deleteTagsError } = await adminSupabase.from("package_tags").delete().eq("package_id", packageId)
  if (deleteTagsError) {
    throw new Error(`Gagal menghapus tag lama: ${deleteTagsError.message}`)
  }
  if (payload.tags.length > 0) {
    const { error: insertTagsError } = await adminSupabase
      .from("package_tags")
      .insert(payload.tags.map((tag) => ({ package_id: packageId, tag })))
    if (insertTagsError) {
      throw new Error(`Gagal menerapkan tag revisi: ${insertTagsError.message}`)
    }
  }

  const { error: deleteFacilitiesError } = await adminSupabase.from("package_facilities").delete().eq("package_id", packageId)
  if (deleteFacilitiesError) {
    throw new Error(`Gagal menghapus fasilitas lama: ${deleteFacilitiesError.message}`)
  }
  if (payload.facility_ids.length > 0) {
    const { error: insertFacilitiesError } = await adminSupabase
      .from("package_facilities")
      .insert(payload.facility_ids.map((facility_id) => ({ package_id: packageId, facility_id })))
    if (insertFacilitiesError) {
      throw new Error(`Gagal menerapkan fasilitas revisi: ${insertFacilitiesError.message}`)
    }
  }

  await applyItineraryPayload(adminSupabase, packageId, payload)
}

export async function approveRevisionById(adminSupabase: AdminClient, revisionId: string, actorId?: string | null) {
  const revision = await getRevisionById(adminSupabase, revisionId)
  const payload = normalizePayload(revision.payload)
  if (!payload) {
    throw new Error("Payload revisi paket tidak valid.")
  }

  await applyRevisionPayloadToPackage(adminSupabase, revision.package_id, payload)

  const { error } = await adminSupabase
    .from("package_revisions")
    .update({
      status: "approved",
      reviewed_by: actorId || null,
      reviewed_at: new Date().toISOString(),
      approved_at: new Date().toISOString(),
      rejection_reason: null,
    })
    .eq("id", revisionId)

  if (error) {
    throw new Error(`Gagal menandai revisi sebagai approved: ${error.message}`)
  }
}
