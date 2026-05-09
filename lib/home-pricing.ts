import { formatPackageMoney, localeCurrencyMap } from "@/lib/package-pricing"
import type { Locale } from "@/lib/i18n"

const HOME_IDR_TO_CURRENCY_RATE: Record<string, number> = {
  IDR: 1,
  USD: 1 / 16000,
  CNY: 1 / 2200,
}

function convertHomeIdrAmount(amountInIdr: number, locale: Locale) {
  const currency = localeCurrencyMap[locale]
  const rate = HOME_IDR_TO_CURRENCY_RATE[currency] || 1
  return {
    currency,
    amount: Math.ceil(amountInIdr * rate),
  }
}

export function formatHomePriceFromIdr(amountInIdr: number, locale: Locale) {
  const { amount, currency } = convertHomeIdrAmount(amountInIdr, locale)
  return formatPackageMoney(amount, currency, locale)
}

export function formatHomeCompactPriceFromIdr(amountInIdr: number, locale: Locale) {
  const { amount, currency } = convertHomeIdrAmount(amountInIdr, locale)

  if (locale === "id") {
    if (amount >= 1_000_000) {
      return `Mulai dari IDR ${new Intl.NumberFormat("id-ID", { minimumFractionDigits: 0, maximumFractionDigits: 1 }).format(amount / 1_000_000)} Jt`
    }

    if (amount >= 1_000) {
      return `Mulai dari IDR ${new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(amount / 1_000)} Rb`
    }

    return `Mulai dari ${formatPackageMoney(amount, currency, locale)}`
  }

  if (locale === "en") {
    return `Starting from ${new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      notation: amount >= 1000 ? "compact" : "standard",
      maximumFractionDigits: amount >= 1000 ? 1 : 0,
    }).format(amount)}`
  }

  return `起价 ${new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency,
    notation: amount >= 10000 ? "compact" : "standard",
    maximumFractionDigits: amount >= 10000 ? 1 : 0,
  }).format(amount)}`
}
