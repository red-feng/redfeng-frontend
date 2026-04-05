import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { type Locale } from "@/lib/i18n"
import { getFacilitiesLookup, getHomePackages, getPublicMerchantIds } from "@/lib/home-packages"

function toLocale(value: string | null): Locale {
  if (value === "en" || value === "zh") return value
  return "id"
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const locale = toLocale(searchParams.get("locale"))
  const publicMerchantIds = await getPublicMerchantIds()
  const facilitiesData = await getFacilitiesLookup()
  const facilitiesLookup = facilitiesData.map((facility) => ({
    id: facility.id,
    name: facility.name,
  }))

  const result = await getHomePackages(Object.fromEntries(searchParams.entries()), locale, {
    pageSizeMode: "single",
    publicMerchantIds,
    facilitiesLookup,
  })

  return NextResponse.json(result)
}
