import { NextResponse } from "next/server"
import { fetchLatestCurrencyRates } from "@/lib/currency-rates"
import { normalizePackageCurrency } from "@/lib/package-pricing"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const baseCurrency = normalizePackageCurrency(searchParams.get("base"))
  const result = await fetchLatestCurrencyRates(baseCurrency)

  return NextResponse.json(
    {
      baseCurrency: result.baseCurrency,
      date: result.date,
      rates: result.rates,
    },
    {
      headers: {
        "Cache-Control": "public, max-age=30, s-maxage=30, stale-while-revalidate=30",
      },
    },
  )
}
