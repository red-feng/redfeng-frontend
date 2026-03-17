import { buildLocalizedPricingFromBase, localeCurrencyMap, normalizePackageCurrency, type CurrencyRateMap } from "@/lib/package-pricing"
import { normalizeLocale, type Locale } from "@/lib/i18n"

type LatestRatesResponse = {
  amount?: number
  base?: string
  date?: string
  rates?: Record<string, number>
}

export async function fetchLatestCurrencyRates(baseCurrency: string): Promise<{
  baseCurrency: string
  rates: CurrencyRateMap
  date: string | null
}> {
  const normalizedBaseCurrency = normalizePackageCurrency(baseCurrency)
  const targets = [...new Set(Object.values(localeCurrencyMap).filter((currency) => currency !== normalizedBaseCurrency))]
  const fallbackRates = Object.values(localeCurrencyMap).reduce(
    (acc, currency) => {
      acc[currency] = currency === normalizedBaseCurrency ? 1 : 0
      return acc
    },
    {} as CurrencyRateMap,
  )

  if (targets.length === 0) {
    return {
      baseCurrency: normalizedBaseCurrency,
      rates: fallbackRates,
      date: null,
    }
  }

  try {
    const url = `https://api.frankfurter.app/latest?from=${encodeURIComponent(normalizedBaseCurrency)}&to=${encodeURIComponent(targets.join(","))}`
    const response = await fetch(url, {
      cache: "no-store",
      headers: {
        Accept: "application/json",
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch currency rates: ${response.status}`)
    }

    const payload = (await response.json()) as LatestRatesResponse
    const rates = { ...fallbackRates }

    for (const [currency, rate] of Object.entries(payload.rates || {})) {
      rates[normalizePackageCurrency(currency)] = Number(rate || 0)
    }

    return {
      baseCurrency: normalizedBaseCurrency,
      rates,
      date: payload.date || null,
    }
  } catch (error) {
    console.error("fetchLatestCurrencyRates error:", error)
    return {
      baseCurrency: normalizedBaseCurrency,
      rates: fallbackRates,
      date: null,
    }
  }
}

export async function buildAutoLocalizedPricing(input: {
  baseLanguage: string
  baseCurrency: string
  baseAdultPrice: number
  baseChildPrice: number
}) {
  const baseLanguage = normalizeLocale(input.baseLanguage)
  const { baseCurrency, rates, date } = await fetchLatestCurrencyRates(input.baseCurrency)
  const pricing = buildLocalizedPricingFromBase(
    baseCurrency,
    Number(input.baseAdultPrice || 0),
    Number(input.baseChildPrice || 0),
    rates,
  )

  return {
    baseLanguage,
    baseCurrency,
    rates,
    date,
    pricing,
  }
}

export async function getLiveLocalizedPackagePricing(input: {
  locale: Locale
  defaultLanguage?: string | null
  publishedLanguages?: string[] | null
  baseCurrency?: string | null
  baseAdultPrice?: number | null
  baseChildPrice?: number | null
}) {
  const defaultLocale = normalizeLocale(input.defaultLanguage)
  const allowedLocales = new Set<Locale>([
    defaultLocale,
    ...((input.publishedLanguages || []).map((language) => normalizeLocale(language))),
  ])
  const activeLocale = allowedLocales.has(input.locale) ? input.locale : defaultLocale
  const currency = localeCurrencyMap[activeLocale]
  const normalizedBaseCurrency = normalizePackageCurrency(input.baseCurrency)
  const baseAdultPrice = Number(input.baseAdultPrice || 0)
  const baseChildPrice = Number(input.baseChildPrice || 0)

  if (normalizedBaseCurrency === currency) {
    return {
      locale: activeLocale,
      currency,
      priceAdult: Math.round(baseAdultPrice),
      priceChild: Math.round(baseChildPrice),
      exchangeDate: null as string | null,
    }
  }

  const { rates, date } = await fetchLatestCurrencyRates(normalizedBaseCurrency)
  const rate = Number(rates[currency] || 0)

  return {
    locale: activeLocale,
    currency,
    priceAdult: Math.round(baseAdultPrice * rate),
    priceChild: Math.round(baseChildPrice * rate),
    exchangeDate: date,
  }
}

export async function convertCurrencyAmount(input: {
  amount: number
  fromCurrency: string
  toCurrency: string
}) {
  const fromCurrency = normalizePackageCurrency(input.fromCurrency)
  const toCurrency = normalizePackageCurrency(input.toCurrency)
  const amount = Number(input.amount || 0)

  if (fromCurrency === toCurrency) {
    return {
      amount,
      rate: 1,
      date: null as string | null,
      currency: toCurrency,
    }
  }

  const { rates, date } = await fetchLatestCurrencyRates(fromCurrency)
  const rate = Number(rates[toCurrency] || 0)

  return {
    amount: Math.round(amount * rate),
    rate,
    date,
    currency: toCurrency,
  }
}
