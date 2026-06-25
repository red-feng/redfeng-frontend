import type { Locale } from "@/lib/i18n"
import { inspirationArticleCatalog } from "@/app/components/home/shared/homeDetailCatalog"
import { promoCatalog } from "@/app/components/promo/promoCatalog"
import type { MarketingPromoPlacementKey } from "@/lib/marketing-promo-placements"
import { getMarketingPromoEffectiveState, type MarketingPromoStatus } from "@/lib/marketing-promo-status"
import { normalizeBookingProductType, type BookingProductType } from "@/lib/booking-products"
import { createAdminClient } from "@/lib/supabase/admin"

type PromoRow = {
  id: string
  slug: string
  title_id: string
  title_en: string
  title_zh: string
  badge_id: string | null
  badge_en: string | null
  badge_zh: string | null
  eyebrow_id: string
  eyebrow_en: string
  eyebrow_zh: string
  price_id: string
  price_en: string
  price_zh: string
  cta_id: string
  cta_en: string
  cta_zh: string
  image: string
  gradient: string
  image_class: string
  overlay_class: string
  glow_class: string
  target_href: string
  is_active: boolean
  status: MarketingPromoStatus
  starts_at: string | null
  ends_at: string | null
  sort_order: number
}

type InspirationRow = {
  id: string
  slug: string
  category_id: string
  category_en: string
  category_zh: string
  title_id: string
  title_en: string
  title_zh: string
  read_time_id: string
  read_time_en: string
  read_time_zh: string
  body_intro_id: string
  body_intro_en: string
  body_intro_zh: string
  section_one_id: string
  section_one_en: string
  section_one_zh: string
  section_two_id: string
  section_two_en: string
  section_two_zh: string
  section_three_id: string
  section_three_en: string
  section_three_zh: string
  image: string
  href: string
  is_active: boolean
  sort_order: number
}

export type MarketingPromo = {
  id: string
  slug: string
  title: string
  badge?: string
  eyebrow: string
  price: string
  cta: string
  image: string
  gradient: string
  imageClass: string
  overlayClass: string
  glowClass: string
  targetHref: string
  detailHref: string
  favoriteKey: string
}

type MarketingPromosOptions = {
  placement?: MarketingPromoPlacementKey
  fallbackPlacement?: MarketingPromoPlacementKey
  limit?: number
  requiredProductType?: BookingProductType
}

type PromoRuleLinkRow = {
  marketing_promo_id: string | null
  transaction_promo_rule_id: string | null
}

type TransactionPromoRuleRow = {
  id: string | null
  transaction_promo_rule_targets?: Array<{ product_type?: string | null }> | null
}

export type MarketingPromosResolved = {
  promos: MarketingPromo[]
  placementUsed?: MarketingPromoPlacementKey
}

export type MarketingInspirationArticle = {
  id: string
  slug: string
  category: string
  title: string
  readTime: string
  image: string
  href: string
  detailHref: string
  bodyIntro: string
  sections: string[]
}

function localizeText(locale: Locale, values: { id: string | null; en: string | null; zh: string | null }) {
  if (locale === "en") return values.en || values.id || ""
  if (locale === "zh") return values.zh || values.id || ""
  return values.id || values.en || values.zh || ""
}

function mapPromoRow(row: PromoRow, locale: Locale): MarketingPromo {
  return {
    id: row.id,
    slug: row.slug,
    title: localizeText(locale, { id: row.title_id, en: row.title_en, zh: row.title_zh }),
    badge: localizeText(locale, { id: row.badge_id, en: row.badge_en, zh: row.badge_zh }) || undefined,
    eyebrow: localizeText(locale, { id: row.eyebrow_id, en: row.eyebrow_en, zh: row.eyebrow_zh }),
    price: localizeText(locale, { id: row.price_id, en: row.price_en, zh: row.price_zh }),
    cta: localizeText(locale, { id: row.cta_id, en: row.cta_en, zh: row.cta_zh }),
    image: row.image,
    gradient: row.gradient,
    imageClass: row.image_class,
    overlayClass: row.overlay_class,
    glowClass: row.glow_class,
    targetHref: row.target_href,
    detailHref: `/promo/${row.slug}`,
    favoriteKey: `promo:${row.slug}`,
  }
}

function mapInspirationRow(row: InspirationRow, locale: Locale): MarketingInspirationArticle {
  return {
    id: row.id,
    slug: row.slug,
    category: localizeText(locale, { id: row.category_id, en: row.category_en, zh: row.category_zh }),
    title: localizeText(locale, { id: row.title_id, en: row.title_en, zh: row.title_zh }),
    readTime: localizeText(locale, { id: row.read_time_id, en: row.read_time_en, zh: row.read_time_zh }),
    image: row.image,
    href: row.href,
    detailHref: `/inspirasi/${row.slug}`,
    bodyIntro: localizeText(locale, { id: row.body_intro_id, en: row.body_intro_en, zh: row.body_intro_zh }),
    sections: [
      localizeText(locale, { id: row.section_one_id, en: row.section_one_en, zh: row.section_one_zh }),
      localizeText(locale, { id: row.section_two_id, en: row.section_two_en, zh: row.section_two_zh }),
      localizeText(locale, { id: row.section_three_id, en: row.section_three_en, zh: row.section_three_zh }),
    ],
  }
}

function buildFallbackPromos(): PromoRow[] {
  return promoCatalog.map((promo, index) => ({
    id: `fallback-promo-${index}`,
    slug: promo.slug,
    title_id: promo.title,
    title_en: promo.title,
    title_zh: promo.title,
    badge_id: promo.badge || null,
    badge_en: promo.badge || null,
    badge_zh: promo.badge || null,
    eyebrow_id: promo.eyebrow,
    eyebrow_en: promo.eyebrow,
    eyebrow_zh: promo.eyebrow,
    price_id: promo.price,
    price_en: promo.price,
    price_zh: promo.price,
    cta_id: promo.cta,
    cta_en: promo.cta,
    cta_zh: promo.cta,
    image: promo.image,
    gradient: promo.gradient,
    image_class: promo.imageClass || (promo as never as { imageClass: string }).imageClass,
    overlay_class: promo.overlayClass || (promo as never as { overlayClass: string }).overlayClass,
    glow_class: promo.glowClass || (promo as never as { glowClass: string }).glowClass,
    target_href: promo.targetHref,
    is_active: true,
    status: "active",
    starts_at: null,
    ends_at: null,
    sort_order: index,
  }))
}

function buildFallbackInspirationRows(): InspirationRow[] {
  return inspirationArticleCatalog.map((article, index) => ({
    id: `fallback-article-${index}`,
    slug: article.slug,
    category_id: article.category,
    category_en: article.category,
    category_zh: article.category,
    title_id: article.title,
    title_en: article.title,
    title_zh: article.title,
    read_time_id: article.readTime,
    read_time_en: article.readTime,
    read_time_zh: article.readTime,
    body_intro_id: article.bodyIntro,
    body_intro_en: article.bodyIntro,
    body_intro_zh: article.bodyIntro,
    section_one_id: article.sections[0] || "",
    section_one_en: article.sections[0] || "",
    section_one_zh: article.sections[0] || "",
    section_two_id: article.sections[1] || "",
    section_two_en: article.sections[1] || "",
    section_two_zh: article.sections[1] || "",
    section_three_id: article.sections[2] || "",
    section_three_en: article.sections[2] || "",
    section_three_zh: article.sections[2] || "",
    image: article.image,
    href: article.href,
    is_active: true,
    sort_order: index,
  }))
}

const promoSelect =
  "id, slug, title_id, title_en, title_zh, badge_id, badge_en, badge_zh, eyebrow_id, eyebrow_en, eyebrow_zh, price_id, price_en, price_zh, cta_id, cta_en, cta_zh, image, gradient, image_class, overlay_class, glow_class, target_href, is_active, status, starts_at, ends_at, sort_order"
const inspirationSelect =
  "id, slug, category_id, category_en, category_zh, title_id, title_en, title_zh, read_time_id, read_time_en, read_time_zh, body_intro_id, body_intro_en, body_intro_zh, section_one_id, section_one_en, section_one_zh, section_two_id, section_two_en, section_two_zh, section_three_id, section_three_en, section_three_zh, image, href, is_active, sort_order"

function isPromoCurrentlyVisible(row: PromoRow, nowIso: string) {
  return getMarketingPromoEffectiveState(row, nowIso) === "live"
}

function inferPromoProductTypesFromHref(targetHref: string | null | undefined): BookingProductType[] {
  const href = String(targetHref || "").trim().toLowerCase()
  if (!href) return []
  if (href.startsWith("/pesawat")) return ["flight"]
  if (href.startsWith("/hotel")) return ["hotel"]
  if (href.startsWith("/kereta")) return ["train"]
  if (href.startsWith("/bus")) return ["bus"]
  if (href.startsWith("/kapal-pesiar")) return ["cruise"]
  if (href.startsWith("/kapal")) return ["sea"]
  if (href.startsWith("/packages")) return ["package_tour"]
  return []
}

async function filterPromoRowsByProductType(rows: PromoRow[], requiredProductType: BookingProductType) {
  if (!rows.length) return rows

  const adminSupabase = createAdminClient()
  const promoIds = rows.map((row) => row.id).filter(Boolean)
  if (!promoIds.length) return []

  const { data: linkRows, error: linkError } = await adminSupabase
    .from("marketing_promo_transaction_rules")
    .select("marketing_promo_id, transaction_promo_rule_id")
    .in("marketing_promo_id", promoIds)

  if (linkError) {
    return rows.filter((row) => inferPromoProductTypesFromHref(row.target_href).includes(requiredProductType))
  }

  const ruleIds = Array.from(
    new Set(
      (((linkRows as PromoRuleLinkRow[] | null) || [])
        .map((row) => String(row.transaction_promo_rule_id || "").trim())
        .filter(Boolean)),
    ),
  )

  const rulesById = new Map<string, BookingProductType[]>()
  if (ruleIds.length) {
    const { data: ruleRows, error: ruleError } = await adminSupabase
      .from("transaction_promo_rules")
      .select("id, transaction_promo_rule_targets(product_type)")
      .in("id", ruleIds)

    if (!ruleError) {
      for (const row of ((ruleRows as TransactionPromoRuleRow[] | null) || [])) {
        const ruleId = String(row.id || "").trim()
        if (!ruleId) continue
        rulesById.set(
          ruleId,
          Array.from(
            new Set(
              (row.transaction_promo_rule_targets || [])
                .map((target) => normalizeBookingProductType(target.product_type))
                .filter((value): value is BookingProductType => Boolean(value)),
            ),
          ),
        )
      }
    }
  }

  const productTypesByPromoId = new Map<string, BookingProductType[]>()
  for (const row of ((linkRows as PromoRuleLinkRow[] | null) || [])) {
    const promoId = String(row.marketing_promo_id || "").trim()
    const ruleId = String(row.transaction_promo_rule_id || "").trim()
    if (!promoId || !ruleId) continue
    const linkedTypes = rulesById.get(ruleId) || []
    if (!linkedTypes.length) continue
    const current = productTypesByPromoId.get(promoId) || []
    productTypesByPromoId.set(promoId, Array.from(new Set([...current, ...linkedTypes])))
  }

  return rows.filter((row) => {
    const linkedTypes = productTypesByPromoId.get(row.id) || []
    if (linkedTypes.length) return linkedTypes.includes(requiredProductType)
    return inferPromoProductTypesFromHref(row.target_href).includes(requiredProductType)
  })
}

async function fetchAllActivePromoRows() {
  const adminSupabase = createAdminClient()
  const { data, error } = await adminSupabase
    .from("marketing_promos")
    .select(promoSelect)
    .in("status", ["active", "scheduled"])
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true })

  if (error || !data?.length) return null

  const nowIso = new Date().toISOString()
  return (data as PromoRow[]).filter((row) => isPromoCurrentlyVisible(row, nowIso))
}

async function fetchPromoRowsByPlacement(placement: MarketingPromoPlacementKey, requiredProductType?: BookingProductType) {
  const adminSupabase = createAdminClient()
  const { data: placementRows, error: placementError } = await adminSupabase
    .from("marketing_promo_placements")
    .select("promo_id, sort_order, created_at")
    .eq("placement_key", placement)
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true })

  if (placementError) {
    return null
  }

  if (!placementRows?.length) {
    return []
  }

  const promoIds = placementRows.map((row) => row.promo_id).filter(Boolean)

  if (!promoIds.length) {
    return []
  }

  const { data: promoRows, error: promoError } = await adminSupabase
    .from("marketing_promos")
    .select(promoSelect)
    .in("id", promoIds)
    .in("status", ["active", "scheduled"])

  if (promoError || !promoRows?.length) {
    return null
  }

  const nowIso = new Date().toISOString()
  const promoMap = new Map((promoRows as PromoRow[]).map((row) => [row.id, row]))
  const visibleRows = promoIds.map((promoId) => promoMap.get(promoId)).filter((row) => Boolean(row) && isPromoCurrentlyVisible(row as PromoRow, nowIso)) as PromoRow[]
  return requiredProductType ? filterPromoRowsByProductType(visibleRows, requiredProductType) : visibleRows
}

export async function getMarketingPromosResolved(locale: Locale, options: MarketingPromosOptions = {}): Promise<MarketingPromosResolved> {
  let rows: PromoRow[] | null = null
  let placementUsed: MarketingPromoPlacementKey | undefined

  if (options.placement) {
    const primaryRows = await fetchPromoRowsByPlacement(options.placement, options.requiredProductType)
    if (primaryRows?.length) {
      rows = primaryRows
      placementUsed = options.placement
    } else if (options.fallbackPlacement) {
      const fallbackRows = await fetchPromoRowsByPlacement(options.fallbackPlacement, options.requiredProductType)
      if (fallbackRows?.length) {
        rows = fallbackRows
        placementUsed = options.fallbackPlacement
      } else if (fallbackRows === null) {
        rows = null
      } else {
        rows = primaryRows
      }
    } else {
      rows = primaryRows
    }
  } else {
    rows = await fetchAllActivePromoRows()
  }

  rows = rows ?? buildFallbackPromos()
  if (options.requiredProductType) {
    rows = rows.filter((row) => inferPromoProductTypesFromHref(row.target_href).includes(options.requiredProductType as BookingProductType))
  }
  const localizedRows = rows.map((row) => mapPromoRow(row, locale))
  const promos = typeof options.limit === "number" && options.limit >= 0 ? localizedRows.slice(0, options.limit) : localizedRows
  return { promos, placementUsed }
}

export async function getMarketingPromos(locale: Locale, options: MarketingPromosOptions = {}) {
  const { promos } = await getMarketingPromosResolved(locale, options)
  return promos
}

export async function getMarketingPromoBySlug(slug: string, locale: Locale) {
  try {
    const adminSupabase = createAdminClient()
    const { data } = await adminSupabase
      .from("marketing_promos")
      .select(promoSelect)
      .eq("slug", slug)
      .maybeSingle()

    if (data && isPromoCurrentlyVisible(data as PromoRow, new Date().toISOString())) return mapPromoRow(data as PromoRow, locale)
  } catch {
    // Fall back to bundled promos when Supabase admin env is unavailable during local builds.
  }

  const fallback = buildFallbackPromos().find((row) => row.slug === slug)
  return fallback ? mapPromoRow(fallback, locale) : null
}

export async function getMarketingPromoSlugs() {
  try {
    const adminSupabase = createAdminClient()
    const { data } = await adminSupabase
      .from("marketing_promos")
      .select("slug, is_active, status, starts_at, ends_at")
      .in("status", ["active", "scheduled"])
    if (data?.length) {
      const nowIso = new Date().toISOString()
      const rows = (data as Array<{ slug: string } & Pick<PromoRow, "is_active" | "status" | "starts_at" | "ends_at">>).filter((row) =>
        isPromoCurrentlyVisible(
          {
            id: "",
            title_id: "",
            title_en: "",
            title_zh: "",
            badge_id: null,
            badge_en: null,
            badge_zh: null,
            eyebrow_id: "",
            eyebrow_en: "",
            eyebrow_zh: "",
            price_id: "",
            price_en: "",
            price_zh: "",
            cta_id: "",
            cta_en: "",
            cta_zh: "",
            image: "",
            gradient: "",
            image_class: "",
            overlay_class: "",
            glow_class: "",
            target_href: "/promo",
            sort_order: 0,
            ...row,
          },
          nowIso,
        ),
      )
      if (rows.length) return rows.map((item) => ({ slug: item.slug }))
    }
  } catch {
    // Local builds without Supabase service role can still prerender bundled promo pages.
  }
  return buildFallbackPromos().map((row) => ({ slug: row.slug }))
}

export async function getMarketingInspirationArticles(locale: Locale) {
  let rows = buildFallbackInspirationRows()

  try {
    const adminSupabase = createAdminClient()
    const { data, error } = await adminSupabase
      .from("marketing_inspiration_articles")
      .select(inspirationSelect)
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true })

    if (!error && data?.length) rows = data as InspirationRow[]
  } catch {
    rows = buildFallbackInspirationRows()
  }

  return rows.map((row) => mapInspirationRow(row, locale))
}

export async function getMarketingInspirationArticleBySlug(slug: string, locale: Locale) {
  try {
    const adminSupabase = createAdminClient()
    const { data } = await adminSupabase
      .from("marketing_inspiration_articles")
      .select(inspirationSelect)
      .eq("slug", slug)
      .eq("is_active", true)
      .maybeSingle()

    if (data) return mapInspirationRow(data as InspirationRow, locale)
  } catch {
    // Fall back to the bundled catalog when Supabase admin env is unavailable during local builds.
  }

  const fallback = buildFallbackInspirationRows().find((row) => row.slug === slug)
  return fallback ? mapInspirationRow(fallback, locale) : null
}

export async function getMarketingInspirationSlugs() {
  try {
    const adminSupabase = createAdminClient()
    const { data } = await adminSupabase
      .from("marketing_inspiration_articles")
      .select("slug")
      .eq("is_active", true)
      .order("sort_order", { ascending: true })

    if (data?.length) return data.map((item) => ({ slug: item.slug }))
  } catch {
    // Local builds without Supabase service role can still prerender bundled inspiration pages.
  }

  return buildFallbackInspirationRows().map((row) => ({ slug: row.slug }))
}
