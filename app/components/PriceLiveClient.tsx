"use client"

import { useEffect, useMemo, useState } from "react"
import { type Locale } from "@/lib/i18n"
import { convertPriceAmount, formatPackageMoney, localeCurrencyMap, normalizePackageCurrency } from "@/lib/package-pricing"

type LiveRatesResponse = {
  baseCurrency?: string
  date?: string | null
  rates?: Record<string, number>
}

type PriceLiveClientProps = {
  locale: Locale
  baseCurrency: string | null
  baseAdultPrice: number | null
  baseChildPrice: number | null
  initialCurrency: string
  initialAdultPrice: number
  initialChildPrice: number
  variant: "mobile" | "desktop"
  childPriceLabel: string
  taxNotice?: string
  refreshMs?: number
}

function resolveLocalizedPrice(input: {
  baseCurrency: string
  targetCurrency: string
  amount: number
  rates: Record<string, number>
}) {
  if (input.baseCurrency === input.targetCurrency) {
    return convertPriceAmount(input.amount, 1)
  }

  return convertPriceAmount(input.amount, Number(input.rates[input.targetCurrency] || 0))
}

export default function PriceLiveClient({
  locale,
  baseCurrency,
  baseAdultPrice,
  baseChildPrice,
  initialCurrency,
  initialAdultPrice,
  initialChildPrice,
  variant,
  childPriceLabel,
  taxNotice,
  refreshMs = 60000,
}: PriceLiveClientProps) {
  const normalizedBaseCurrency = normalizePackageCurrency(baseCurrency)
  const targetCurrency = localeCurrencyMap[locale]
  const safeAdultBasePrice = Number(baseAdultPrice || 0)
  const safeChildBasePrice = Number(baseChildPrice || 0)

  const [displayState, setDisplayState] = useState({
    currency: initialCurrency,
    priceAdult: Number(initialAdultPrice || 0),
    priceChild: Number(initialChildPrice || 0),
  })

  useEffect(() => {
    let cancelled = false

    async function updateLivePrice() {
      try {
        const response = await fetch(`/api/live-rates?base=${encodeURIComponent(normalizedBaseCurrency)}`, {
          cache: "no-store",
        })

        if (!response.ok) return

        const payload = (await response.json()) as LiveRatesResponse
        const rates = payload.rates || {}
        const resolvedCurrency = localeCurrencyMap[locale]

        const nextState = {
          currency: resolvedCurrency,
          priceAdult: resolveLocalizedPrice({
            baseCurrency: normalizedBaseCurrency,
            targetCurrency: resolvedCurrency,
            amount: safeAdultBasePrice,
            rates,
          }),
          priceChild: resolveLocalizedPrice({
            baseCurrency: normalizedBaseCurrency,
            targetCurrency: resolvedCurrency,
            amount: safeChildBasePrice,
            rates,
          }),
        }

        if (!cancelled) {
          setDisplayState(nextState)
        }
      } catch {
        // Keep the server-rendered price if the live refresh fails.
      }
    }

    updateLivePrice()

    const intervalId = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        updateLivePrice()
      }
    }, refreshMs)

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        updateLivePrice()
      }
    }

    window.addEventListener("visibilitychange", handleVisibilityChange)
    window.addEventListener("focus", handleVisibilityChange)

    return () => {
      cancelled = true
      window.clearInterval(intervalId)
      window.removeEventListener("visibilitychange", handleVisibilityChange)
      window.removeEventListener("focus", handleVisibilityChange)
    }
  }, [locale, normalizedBaseCurrency, refreshMs, safeAdultBasePrice, safeChildBasePrice, targetCurrency])

  const hasChildPrice = useMemo(() => Number(displayState.priceChild || 0) > 0, [displayState.priceChild])
  const formattedAdultPrice = formatPackageMoney(displayState.priceAdult, displayState.currency, locale)
  const formattedChildPrice = formatPackageMoney(displayState.priceChild, displayState.currency, locale)

  if (variant === "mobile") {
    return <>{formattedAdultPrice}</>
  }

  return (
    <>
      <div className="text-xl font-bold text-orange-600 sm:text-2xl">{formattedAdultPrice}</div>
      {taxNotice ? <div className="mt-1 text-[11px] font-medium text-slate-500 sm:text-xs">{taxNotice}</div> : null}
      {hasChildPrice ? (
        <div className="mt-2 text-xs text-slate-500 sm:text-sm">
          {childPriceLabel}: {formattedChildPrice}
        </div>
      ) : null}
    </>
  )
}
