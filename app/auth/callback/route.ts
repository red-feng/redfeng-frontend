import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { isAdminPortalRole, isFinancePortalRole } from "@/lib/internal-roles"
import { ACTIVE_PORTAL_COOKIE, ACTIVE_PORTAL_MAX_AGE, CUSTOMER_PORTAL_DEFAULT_REDIRECT, normalizeActivePortal } from "@/lib/portal-context"

function getCustomerPortalRoleError(role: string | null | undefined) {
  const normalizedRole = String(role || "").trim().toLowerCase()

  if (normalizedRole === "merchant") {
    return "Akun ini terdaftar sebagai merchant. Gunakan portal merchant untuk melanjutkan."
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

async function repairDeletedMerchantRole(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  role: string | null | undefined,
) {
  if (String(role || "").trim().toLowerCase() !== "merchant") {
    return false
  }

  const { data: merchant } = await supabase
    .from("merchants")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle()

  if (merchant?.id) {
    return false
  }

  const { error } = await supabase
    .from("profiles")
    .update({ role: "customer" })
    .eq("id", userId)
    .eq("role", "merchant")

  if (error) {
    console.error("[auth/callback] failed to repair stale merchant role", {
      userId,
      error: error.message,
    })
    return false
  }

  return true
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const requestedNext = searchParams.get("next")
  const portal = normalizeActivePortal(searchParams.get("portal"))
  const safeNext = requestedNext && requestedNext.startsWith("/") ? requestedNext : CUSTOMER_PORTAL_DEFAULT_REDIRECT

  if (code) {
    const supabase = await createClient("customer")
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
        const response = NextResponse.redirect(new URL(safeNext, origin))
        if (portal === "customer") {
          response.cookies.set(ACTIVE_PORTAL_COOKIE, "customer", {
            path: "/",
            maxAge: ACTIVE_PORTAL_MAX_AGE,
            sameSite: "lax",
          })
        }
        return response
      }

      const repairedDeletedMerchant = await repairDeletedMerchantRole(supabase, user.id, profile.role)
      const effectiveRole = repairedDeletedMerchant ? "customer" : profile.role

      if (effectiveRole === "customer") {
        const response = NextResponse.redirect(new URL(safeNext, origin))
        if (portal === "customer") {
          response.cookies.set(ACTIVE_PORTAL_COOKIE, "customer", {
            path: "/",
            maxAge: ACTIVE_PORTAL_MAX_AGE,
            sameSite: "lax",
          })
        }
        return response
      }

      if (isAdminPortalRole(effectiveRole) || isFinancePortalRole(effectiveRole) || effectiveRole === "superadmin") {
        await supabase.auth.signOut()
        return NextResponse.redirect(
          new URL(`/login?error=${encodeURIComponent(getCustomerPortalRoleError(effectiveRole))}`, origin),
        )
      }

      await supabase.auth.signOut()
      return NextResponse.redirect(
        new URL(`/login?error=${encodeURIComponent(getCustomerPortalRoleError(effectiveRole))}`, origin),
      )
    }
  }

  return NextResponse.redirect(new URL("/login", origin))
}
