import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const requestedNext = searchParams.get("next")
  const safeNext = requestedNext && requestedNext.startsWith("/") ? requestedNext : "/customer/dashboard"

  if (code) {
    const supabase = await createClient()
    await supabase.auth.exchangeCodeForSession(code)

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle()

      if (!profile) {
        await supabase.from("profiles").upsert({
          id: user.id,
          role: "customer",
        })

        return NextResponse.redirect(new URL(safeNext, origin))
      }

      if (profile.role === "merchant") {
        return NextResponse.redirect(new URL("/merchant/dashboard", origin))
      }

      if (profile.role === "admin" || profile.role === "superadmin") {
        return NextResponse.redirect(new URL("/admin/dashboard", origin))
      }

      return NextResponse.redirect(new URL(safeNext, origin))
    }
  }

  return NextResponse.redirect(new URL("/login", origin))
}
