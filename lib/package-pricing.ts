import { normalizeLocale, type Locale } from "@/lib/i18n"

export const packageCurrencyOptions = [
  { value: "IDR", label: "IDR" },
  { value: "USD", label: "USD" },
  { value: "CNY", label: "CNY" },
] as const

export type PackagePricingTranslation = {
  language_code?: string | null
  currency?: string | null
  price_adult?: number | null
  price_child?: number | null
}

type ResolvePackagePricingInput = {
  locale: Locale
  defaultLanguage: string | null | undefined
  publishedLanguages?: string[] | null
  baseCurrency?: string | null
  baseAdultPrice?: number | null
  baseChildPrice?: number | null
  translations?: PackagePricingTranslation[] | null
}

export function normalizePackageCurrency(value: string | null | undefined): string {
  const normalized = String(value || "IDR").trim().toUpperCase()
  if (packageCurrencyOptions.some((option) => option.value === normalized)) {
    return normalized
  }
  return "IDR"
}

export function normalizePackagePriceInput(value: string): string {
  return value.replace(/[^\d]/g, "")
}

export function resolvePackageTranslation<T extends { language_code?: string | null }>(
  translations: T[] | null | undefined,
  locale: Locale,
  defaultLanguage: string | null | undefined,
  publishedLanguages?: string[] | null,
): T | null {
  const translationRows = translations || []
  if (translationRows.length === 0) return null

  const defaultLocale = normalizeLocale(defaultLanguage)
  const allowedLocales = new Set<Locale>([
    defaultLocale,
    ...((publishedLanguages || []).map((language) => normalizeLocale(language))),
  ])
  const preferredLocale = allowedLocales.has(locale) ? locale : defaultLocale

  for (const candidate of [preferredLocale, defaultLocale, "id"] as const) {
    const match = translationRows.find((row) => normalizeLocale(row.language_code) === candidate)
    if (match) return match
  }

  return translationRows[0] || null
}

export function resolveLocalizedPackagePricing({
  locale,
  defaultLanguage,
  publishedLanguages,
  baseCurrency,
  baseAdultPrice,
  baseChildPrice,
  translations,
}: ResolvePackagePricingInput) {
  const defaultLocale = normalizeLocale(defaultLanguage)
  const fallbackCurrency = normalizePackageCurrency(baseCurrency)
  const fallbackAdultPrice = Number(baseAdultPrice || 0)
  const fallbackChildPrice = Number(baseChildPrice || 0)
  const translation = resolvePackageTranslation(translations, locale, defaultLanguage, publishedLanguages)

  return {
    locale: normalizeLocale(translation?.language_code || defaultLocale),
    currency: normalizePackageCurrency(translation?.currency || fallbackCurrency),
    priceAdult: Number(translation?.price_adult ?? fallbackAdultPrice),
    priceChild: Number(translation?.price_child ?? fallbackChildPrice),
  }
}

export function formatPackageMoney(
  value: number | null | undefined,
  currency: string | null | undefined,
  locale: Locale,
): string {
  const safeCurrency = normalizePackageCurrency(currency)
  const safeValue = Number(value || 0)
  const localeMap: Record<Locale, string> = {
    id: "id-ID",
    en: "en-US",
    zh: "zh-CN",
  }

  try {
    return new Intl.NumberFormat(localeMap[locale], {
      style: "currency",
      currency: safeCurrency,
      maximumFractionDigits: 0,
    }).format(safeValue)
  } catch {
    return `${safeCurrency} ${safeValue.toLocaleString(localeMap[locale])}`
  }
}
