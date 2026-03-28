import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { isAdminPortalRole, isFinancePortalRole } from "@/lib/internal-roles"

function getCustomerPortalRoleError(role: string | null | undefined) {
  const normalizedRole = String(role || "").trim().toLowerCase()

  if (normalizedRole === "merchant") {
    return "Akun Google ini terdaftar sebagai merchant. Gunakan portal merchant untuk melanjutkan."
  }

  if (normalizedRole === "finance" || normalizedRole === "finance_manager") {
    return "Akun Google ini terdaftar sebagai finance. Gunakan portal finance untuk melanjutkan."
  }

  if (normalizedRole === "superadmin") {
    return "Akun Google ini terdaftar sebagai superadmin. Gunakan portal superadmin untuk melanjutkan."
  }

  if (normalizedRole === "admin" || normalizedRole === "operations_manager") {
    return "Akun Google ini terdaftar sebagai admin internal. Gunakan portal admin untuk melanjutkan."
  }

  return "Portal ini khusus untuk customer."
}

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

      if (profile.role === "customer") {
        return NextResponse.redirect(new URL(safeNext, origin))
      }

      if (isAdminPortalRole(profile.role) || isFinancePortalRole(profile.role) || profile.role === "merchant" || profile.role === "superadmin") {
        await supabase.auth.signOut()
        return NextResponse.redirect(
          new URL(`/login?error=${encodeURIComponent(getCustomerPortalRoleError(profile.role))}`, origin),
        )
      }

      await supabase.auth.signOut()
      return NextResponse.redirect(
        new URL(`/login?error=${encodeURIComponent(getCustomerPortalRoleError(profile.role))}`, origin),
      )
    }
  }

  return NextResponse.redirect(new URL("/login", origin))
}
