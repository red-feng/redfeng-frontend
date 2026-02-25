import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function GET(
  request: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const { slug } = params

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY! // ✅ ganti ini
    )

    const { data, error } = await supabase
      .from("packages")
      .select(`
        id,
        title,
        slug,
        description,
        price_adult,
        price_child,
        thumbnail_url
      `)
      .eq("slug", slug)
      .eq("status", "published") // ✅ penting!
      .single()

    if (error || !data) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}