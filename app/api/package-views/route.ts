import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const packageId = String(body.package_id || "")
    const sessionId = String(body.session_id || "")

    if (!packageId || !sessionId) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 })
    }

    const supabase = createAdminClient()
    const { error } = await supabase.from("package_views").insert({
      package_id: packageId,
      session_id: sessionId,
    })

    if (error && !error.message.includes("duplicate key")) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
