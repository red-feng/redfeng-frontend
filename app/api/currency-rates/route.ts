import { NextResponse } from "next/server"
import { buildAutoLocalizedPricing } from "@/lib/currency-rates"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const baseLanguage = searchParams.get("baseLanguage") || "id"
  const baseCurrency = searchParams.get("baseCurrency") || "IDR"
  const baseAdultPrice = Number(searchParams.get("adultPrice") || 0)
  const baseChildPrice = Number(searchParams.get("childPrice") || 0)

  const payload = await buildAutoLocalizedPricing({
    baseLanguage,
    baseCurrency,
    baseAdultPrice,
    baseChildPrice,
  })

  return NextResponse.json(payload, {
    headers: {
      "Cache-Control": "no-store",
    },
  })
}
