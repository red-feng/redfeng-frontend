import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import type { NextRequest } from "next/server"

export async function GET(request: NextRequest) {

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY! // ❗ JANGAN service role
  )

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
    .select(`
      id,
      title,
      slug,
      destination,
      duration,
      price_adult,
      thumbnail_url
    `, { count: "exact" })
    .eq("status", "published")

  // 🔎 Filter destination
    if (destination && destination !== "Semua") {
      query = query.eq("destination", destination)
    }

    // 🔎 Filter duration
    if (duration && duration !== "Semua") {
      query = query.eq("duration", duration)
    }

    // 🔎 Price range filter
    if (minPrice) {
      query = query.gte("price_adult", Number(minPrice))
    }

    if (maxPrice) {
      query = query.lte("price_adult", Number(maxPrice))
    }

    // 🔎 Search
    if (search) {
      query = query.ilike("title", `%${search}%`)
    }

    // 🔥 CLEAN SORTING LOGIC (NO DOUBLE ORDER)
    if (sort === "price_asc") {
      query = query.order("price_adult", { ascending: true })
    } else if (sort === "price_desc") {
      query = query.order("price_adult", { ascending: false })
    } else {
      // default sorting
      query = query.order("created_at", { ascending: false })
    }

  const { data, error, count } = await query.range(from, to)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    data,
    total: count,
    page,
    totalPages: Math.ceil((count || 0) / limit),
  })
}