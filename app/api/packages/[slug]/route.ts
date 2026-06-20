import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await context.params

    if (!slug) {
      return NextResponse.json(
        { error: "Invalid slug" },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from("packages")
      .select(`
        id,
        title,
        slug,
        description,
        price_adult,
        price_child,
        cover_image,
        merchant_id
      `)
      .eq("slug", slug)
      .eq("status", "approved")
      .single()

    if (error || !data) {
      return NextResponse.json(
        { error: "Not found" },
        { status: 404 }
      )
    }

    const { data: merchant, error: merchantError } = await supabase
      .from("merchants")
      .select("id, verification_status, onboarding_completed")
      .eq("id", data.merchant_id)
      .maybeSingle()

    const merchantStatus = String(merchant?.verification_status || "").trim().toLowerCase()
    const merchantAllowed = Boolean(merchant?.id) && merchantStatus === "approved" && Boolean(merchant?.onboarding_completed)

    if (merchantError || !merchantAllowed) {
      return NextResponse.json(
        { error: "Not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({
      id: data.id,
      title: data.title,
      slug: data.slug,
      description: data.description,
      price_adult: data.price_adult,
      price_child: data.price_child,
      thumbnail_url: data.cover_image,
    })

  } catch (error) {
    console.error("Package detail error:", error)

    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    )
  }
}
