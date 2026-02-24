import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function GET(
  req: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: paket, error } = await supabase
      .from("packages")
      .select("*")
      .eq("slug", params.slug)
      .eq("status", "published")
      .single()

    if (error || !paket) {
      return NextResponse.json(
        { error: "Paket tidak ditemukan" },
        { status: 404 }
      )
    }

    return NextResponse.json(paket)

  } catch (error) {
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    )
  }
}