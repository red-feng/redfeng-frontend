import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getWordPressSharedSecret, hashSsoToken } from "@/lib/sso/wordpress"
import { isInternalRole } from "@/lib/internal-roles"

export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  try {
    const providedSecret = request.headers.get("x-rf-sso-secret")

    if (!providedSecret || providedSecret !== getWordPressSharedSecret()) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json().catch(() => null)
    const token = typeof body?.token === "string" ? body.token : ""

    if (!token) {
      return NextResponse.json({ error: "Token wajib diisi" }, { status: 400 })
    }

    const adminSupabase = createAdminClient()
    const tokenHash = hashSsoToken(token)

    const { data: ssoToken } = await adminSupabase
      .from("sso_tokens")
      .select("id, user_id, redirect_path, expires_at, used_at")
      .eq("target", "wordpress")
      .eq("token_hash", tokenHash)
      .gt("expires_at", new Date().toISOString())
      .is("used_at", null)
      .maybeSingle()

    if (!ssoToken) {
      return NextResponse.json({ error: "Token SSO tidak valid atau sudah kedaluwarsa" }, { status: 404 })
    }

    const { data: authUser, error: authError } = await adminSupabase.auth.admin.getUserById(ssoToken.user_id)

    if (authError || !authUser.user) {
      return NextResponse.json({ error: "User auth tidak ditemukan" }, { status: 404 })
    }

    const { data: profile } = await adminSupabase
      .from("profiles")
      .select("role")
      .eq("id", ssoToken.user_id)
      .maybeSingle()

    if (isInternalRole(profile?.role)) {
      return NextResponse.json({ error: "Role tidak diizinkan untuk SSO customer" }, { status: 403 })
    }

    await adminSupabase
      .from("sso_tokens")
      .update({ used_at: new Date().toISOString() })
      .eq("id", ssoToken.id)

    return NextResponse.json({
      user_id: authUser.user.id,
      email: authUser.user.email,
      full_name: (authUser.user.user_metadata?.full_name as string | undefined) || "",
      phone_number: (authUser.user.user_metadata?.phone_number as string | undefined) || "",
      role: profile?.role || "customer",
      redirect_to: ssoToken.redirect_path || "/my-account",
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ error: `SSO WordPress exchange failed: ${message}` }, { status: 500 })
  }
}
