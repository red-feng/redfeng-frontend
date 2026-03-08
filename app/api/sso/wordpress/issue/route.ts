import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import {
  buildWordPressSsoRedirectUrl,
  createRawSsoToken,
  hashSsoToken,
  sanitizeWordPressRedirectPath,
} from "@/lib/sso/wordpress"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const url = new URL(request.url)
  const redirectPath = sanitizeWordPressRedirectPath(url.searchParams.get("redirect_to"))
  const supabase = await createClient()
  const adminSupabase = createAdminClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    const next = `${url.pathname}${url.search}`
    return NextResponse.redirect(new URL(`/login?next=${encodeURIComponent(next)}`, url.origin))
  }

  let { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle()

  if (!profile) {
    await adminSupabase.from("profiles").upsert({
      id: user.id,
      role: "customer",
    })

    profile = { role: "customer" }
  }

  if (profile.role === "merchant" || profile.role === "admin" || profile.role === "superadmin") {
    return NextResponse.json({ error: "SSO WordPress hanya untuk customer" }, { status: 403 })
  }

  const rawToken = createRawSsoToken()
  const tokenHash = hashSsoToken(rawToken)
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString()

  const { error } = await adminSupabase.from("sso_tokens").insert({
    user_id: user.id,
    target: "wordpress",
    token_hash: tokenHash,
    redirect_path: redirectPath,
    expires_at: expiresAt,
  })

  if (error) {
    return NextResponse.json({ error: "Gagal membuat token SSO WordPress" }, { status: 500 })
  }

  return NextResponse.redirect(buildWordPressSsoRedirectUrl(rawToken, redirectPath))
}
