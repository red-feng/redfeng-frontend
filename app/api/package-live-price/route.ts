import { NextResponse } from "next/server"
import { getLiveLocalizedPackagePricing } from "@/lib/currency-rates"
import { normalizeLocale } from "@/lib/i18n"
import { createAdminClient } from "@/lib/supabase/admin"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const packageId = String(searchParams.get("packageId") || "").trim()
  const locale = normalizeLocale(searchParams.get("locale"))

  if (!packageId) {
    return NextResponse.json({ error: "Missing packageId" }, { status: 400 })
  }

  const adminSupabase = createAdminClient()
  const { data: pkg, error } = await adminSupabase
    .from("packages")
    .select("id, status, currency, price_adult, price_child, default_language, published_languages")
    .eq("id", packageId)
    .single()

  if (error || !pkg || String(pkg.status || "").trim().toLowerCase() !== "approved") {
    return NextResponse.json({ error: "Package not found" }, { status: 404 })
  }

  const livePricing = await getLiveLocalizedPackagePricing({
    locale,
    defaultLanguage: pkg.default_language,
    publishedLanguages: pkg.published_languages,
    baseCurrency: pkg.currency,
    baseAdultPrice: pkg.price_adult,
    baseChildPrice: pkg.price_child,
  })

  return NextResponse.json(
    {
      packageId,
      baseCurrency: pkg.currency,
      baseAdultPrice: Number(pkg.price_adult || 0),
      baseChildPrice: Number(pkg.price_child || 0),
      livePricing,
    },
    {
      headers: {
        "Cache-Control": "public, max-age=30, s-maxage=30, stale-while-revalidate=30",
      },
    },
  )
}
