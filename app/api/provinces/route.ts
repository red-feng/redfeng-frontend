import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const countryId = searchParams.get("country_id")

  if (!countryId) {
    return NextResponse.json([])
  }

  const supabase = await createClient()

  const { data, error } = await supabase
    .from("provinces")
    .select("id, name")
    .eq("country_id", countryId)
    .order("name")

  if (error) {
    return NextResponse.json([])
  }

  return NextResponse.json(data)
}