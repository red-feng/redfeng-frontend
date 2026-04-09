"use client"

import { useEffect, useMemo, useState } from "react"
import { type Locale } from "@/lib/i18n"
import { convertPriceAmount, formatPackageMoney } from "@/lib/package-pricing"

type LiveRatesResponse = {
  packageId?: string
  baseCurrency?: string | null
  baseAdultPrice?: number | null
  baseChildPrice?: number | null
  livePricing?: {
    currency?: string
    priceAdult?: number
    priceChild?: number
    exchangeDate?: string | null
  }
}

type PriceLiveClientProps = {
  packageId: string
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

export default function PriceLiveClient({
  packageId,
  locale,
  initialCurrency,
  initialAdultPrice,
  initialChildPrice,
  variant,
  childPriceLabel,
  taxNotice,
  refreshMs = 60000,
}: PriceLiveClientProps) {
  const [displayState, setDisplayState] = useState({
    currency: initialCurrency,
    priceAdult: Number(initialAdultPrice || 0),
    priceChild: Number(initialChildPrice || 0),
  })

  useEffect(() => {
    let cancelled = false

    async function updateLivePrice() {
      try {
        const response = await fetch(
          `/api/package-live-price?packageId=${encodeURIComponent(packageId)}&locale=${encodeURIComponent(locale)}`,
          {
          cache: "no-store",
          },
        )

        if (!response.ok) return

        const payload = (await response.json()) as LiveRatesResponse

        const nextState = {
          currency: String(payload.livePricing?.currency || initialCurrency).trim().toUpperCase(),
          priceAdult: convertPriceAmount(Number(payload.livePricing?.priceAdult || initialAdultPrice || 0), 1),
          priceChild: convertPriceAmount(Number(payload.livePricing?.priceChild || initialChildPrice || 0), 1),
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
  }, [initialAdultPrice, initialChildPrice, initialCurrency, locale, packageId, refreshMs])

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
