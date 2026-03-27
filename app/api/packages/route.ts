import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function GET(request: NextRequest) {
  const supabase = createAdminClient()

  const { searchParams } = new URL(request.url)

  const destination = searchParams.get("destination")
  const duration = searchParams.get("duration")
  const sort = searchParams.get("sort")
  const minPrice = searchParams.get("min_price")
  const maxPrice = searchParams.get("max_price")
  const search = searchParams.get("q")
  const page = Number(searchParams.get("page") || 1)

  const limit = 6
  const from = (page - 1) * limit
  const to = from + limit - 1

  let query = supabase
    .from("packages")
    .select(
      `
      id,
      title,
      slug,
      country,
      duration,
      price_adult,
      cover_image,
      merchant_id
    `,
      { count: "exact" }
    )
    .eq("status", "approved")

  if (destination && destination !== "Semua") {
    query = query.eq("country", destination)
  }

  if (duration && duration !== "Semua") {
    if (duration === "1-3") {
      query = query.lte("duration", 3)
    } else if (duration === "4-7") {
      query = query.gte("duration", 4).lte("duration", 7)
    } else if (duration === "8+") {
      query = query.gte("duration", 8)
    } else {
      const numericDuration = Number(duration)
      if (!Number.isNaN(numericDuration)) {
        query = query.eq("duration", numericDuration)
      }
    }
  }

  if (minPrice) {
    query = query.gte("price_adult", Number(minPrice))
  }

  if (maxPrice) {
    query = query.lte("price_adult", Number(maxPrice))
  }

  if (search) {
    query = query.ilike("title", `%${search}%`)
  }

  if (sort === "price_asc") {
    query = query.order("price_adult", { ascending: true })
  } else if (sort === "price_desc") {
    query = query.order("price_adult", { ascending: false })
  } else {
    query = query.order("created_at", { ascending: false })
  }

  const { data, error } = await query.range(from, to)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const merchantIds = [...new Set(((data || []) as Array<{ merchant_id: string | null }>).map((item) => item.merchant_id).filter(Boolean))]
  const { data: merchantRows, error: merchantError } = merchantIds.length
    ? await supabase
        .from("merchants")
        .select("id, verification_status, onboarding_completed")
        .in("id", merchantIds)
    : { data: [], error: null }

  if (merchantError) {
    return NextResponse.json({ error: merchantError.message }, { status: 500 })
  }

  const publicMerchantIds = new Set(
    ((merchantRows || []) as Array<{ id: string; verification_status: string | null; onboarding_completed: boolean | null }>)
      .filter((merchant) => {
        const status = String(merchant.verification_status || "").trim().toLowerCase()
        return status === "approved" && Boolean(merchant.onboarding_completed)
      })
      .map((merchant) => merchant.id),
  )

  const publicPackages = ((data || []) as Array<{
    id: string
    title: string | null
    slug: string
    country: string | null
    duration: number | null
    price_adult: number | null
    cover_image: string | null
    merchant_id: string | null
  }>)
    .filter((pkg) => pkg.merchant_id && publicMerchantIds.has(pkg.merchant_id))
    .map((pkg) => ({
      id: pkg.id,
      title: pkg.title,
      slug: pkg.slug,
      destination: pkg.country,
      duration: pkg.duration,
      price_adult: pkg.price_adult,
      thumbnail_url: pkg.cover_image,
    }))

  return NextResponse.json({
    data: publicPackages,
    total: publicPackages.length,
    page,
    totalPages: Math.ceil(publicPackages.length / limit),
  })
}
