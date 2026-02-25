import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import type { NextRequest } from "next/server"

export async function GET(request: NextRequest) {

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { searchParams } = new URL(request.url)

  const destination = searchParams.get("destination")
  const duration = searchParams.get("duration")
  const sort = searchParams.get("sort")
  const page = Number(searchParams.get("page") || 1)

  const limit = 5
  const from = (page - 1) * limit
  const to = from + limit - 1

  let query = supabase
    .from("packages")
    .select("*", { count: "exact" })
    .eq("status", "published")

  if (destination && destination !== "Semua") {
    query = query.eq("destination", destination)
  }

  if (duration && duration !== "Semua") {
    query = query.eq("duration", duration)
  }

  if (sort === "price_asc") {
    query = query.order("price_adult", { ascending: true })
  }

  if (sort === "price_desc") {
    query = query.order("price_adult", { ascending: false })
  }

  const { data, error, count } = await query.range(from, to)

  if (error) {
    return NextResponse.json({ error: "Failed" }, { status: 500 })
  }

  return NextResponse.json({
    data,
    total: count,
    page,
    totalPages: Math.ceil((count || 0) / limit),
  })
}