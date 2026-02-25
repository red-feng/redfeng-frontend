import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function GET(
  _request: Request,
  context: { params: { slug: string } }
) {
  try {
    const { slug } = context.params

    if (!slug) {
      return NextResponse.json(
        { error: "Invalid slug" },
        { status: 400 }
      )
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY! // ✅ pakai anon (RLS aman)
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
      .eq("status", "published")
      .single()

    if (error || !data) {
      return NextResponse.json(
        { error: "Not found" },
        { status: 404 }
      )
    }

    return NextResponse.json(data)

  } catch (error) {
    console.error("Package detail error:", error)

    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    )
  }
}