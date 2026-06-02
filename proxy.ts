import { createServerClient, type CookieOptions } from "@supabase/ssr"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { getRequiredEnv } from "@/lib/env"
import { getAppHost } from "@/lib/site-config"
import { ACTIVE_PORTAL_COOKIE, ACTIVE_PORTAL_MAX_AGE, type ActivePortal, getPortalSessionCookieName } from "@/lib/portal-context"
import { buildPortalSessionError } from "@/lib/portal-session"

const CANONICAL_HOST = getAppHost()

function buildBaseCookieOptions(options: CookieOptions) {
  return {
    path: "/",
    sameSite: "lax" as const,
    ...options,
  }
}

function getPortalCandidatesForPath(pathname: string): ActivePortal[] {
  if (pathname.startsWith("/admin")) return ["admin", "superadmin"]
  if (pathname.startsWith("/merchant")) return ["merchant"]
  if (pathname.startsWith("/finance")) return ["finance"]
  if (pathname.startsWith("/superadmin")) return ["superadmin"]
  return ["customer"]
}

export async function proxy(req: NextRequest) {
  const pathname = req.nextUrl.pathname
  const host = req.headers.get("host") || ""
  const isAdminLoginRoute = pathname === "/admin/login"
  const isMerchantPublicRoute =
    pathname === "/merchant/login" ||
    pathname === "/merchant/register" ||
    pathname === "/merchant/pending" ||
    pathname === "/merchant/rejected" ||
    pathname.startsWith("/merchant/onboarding")

  if (host.endsWith(".vercel.app")) {
    const redirectUrl = new URL(req.url)
    redirectUrl.protocol = "https:"
    redirectUrl.host = CANONICAL_HOST
    return NextResponse.redirect(redirectUrl, 301)
  }

  if (pathname === "/paket") {
    return NextResponse.redirect(new URL("/packages", req.url), 301)
  }

  if (pathname.startsWith("/paket/")) {
    const redirectUrl = new URL(req.url)
    redirectUrl.pathname = pathname.replace("/paket/", "/packages/")
    return NextResponse.redirect(redirectUrl, 301)
  }

  const res = NextResponse.next({
    request: req,
  })

  const isFinanceRoute = pathname.startsWith("/finance")
  const isSuperadminRoute = pathname.startsWith("/superadmin")

  if (!pathname.startsWith("/admin") && !pathname.startsWith("/merchant") && !isFinanceRoute && !isSuperadminRoute) {
    return res
  }

  if (
    isAdminLoginRoute ||
    isMerchantPublicRoute ||
    pathname === "/finance/login" ||
    pathname === "/superadmin/login"
  ) {
    return res
  }

  const portalCandidates = getPortalCandidatesForPath(pathname)
  let user: Awaited<ReturnType<ReturnType<typeof createServerClient>["auth"]["getUser"]>>["data"]["user"] | null = null
  let profile: { role: string } | null = null
  let matchedPortal: ActivePortal | null = null

  for (const portal of portalCandidates) {
    const supabase = createServerClient(
      getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
      getRequiredEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
      {
        cookieOptions: {
          name: getPortalSessionCookieName(portal),
          path: "/",
          sameSite: "lax",
        },
        cookies: {
          getAll() {
            return req.cookies.getAll()
          },
          setAll(cookiesToSet) {
            for (const { name, value, options } of cookiesToSet) {
              const normalizedOptions = buildBaseCookieOptions(options)
              req.cookies.set({
                name,
                value,
                ...normalizedOptions,
              })
              res.cookies.set({
                name,
                value,
                ...normalizedOptions,
              })
            }
          },
        },
      }
    )

    const {
      data: { user: portalUser },
    } = await supabase.auth.getUser()

    if (!portalUser) {
      continue
    }

    const { data: portalProfile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", portalUser.id)
      .single()

    user = portalUser
    profile = portalProfile
    matchedPortal = portal
    break
  }

  if (!user) {
    const target = pathname.startsWith("/admin")
      ? "/admin/login?error=session-ended"
      : pathname.startsWith("/merchant")
        ? "/merchant/login?error=session-ended"
        : pathname.startsWith("/finance")
          ? "/finance/login?error=session-ended"
          : "/superadmin/login?error=session-ended"
    return NextResponse.redirect(new URL(target, req.url))
  }

  if (!profile) {
    const target = pathname.startsWith("/admin")
      ? "/admin/login?error=no-profile"
      : pathname.startsWith("/merchant")
        ? "/merchant/login?error=no-profile"
        : pathname.startsWith("/finance")
          ? "/finance/login?error=no-profile"
          : "/superadmin/login?error=no-profile"
    return NextResponse.redirect(new URL(target, req.url))
  }

  if (matchedPortal) {
    res.cookies.set(ACTIVE_PORTAL_COOKIE, matchedPortal, {
      path: "/",
      sameSite: "lax",
      maxAge: ACTIVE_PORTAL_MAX_AGE,
    })
  }

  if (pathname.startsWith("/admin") && !["admin", "operations_manager", "superadmin"].includes(profile.role)) {
    return NextResponse.redirect(
      new URL(`/admin/login?error=${encodeURIComponent(buildPortalSessionError("session-changed", profile.role))}`, req.url),
    )
  }

  if (pathname.startsWith("/merchant") && profile.role !== "merchant") {
    return NextResponse.redirect(
      new URL(`/merchant/login?error=${encodeURIComponent(buildPortalSessionError("session-changed", profile.role))}`, req.url),
    )
  }

  if (pathname.startsWith("/finance") && !["finance", "finance_manager", "superadmin"].includes(profile.role)) {
    return NextResponse.redirect(
      new URL(`/finance/login?error=${encodeURIComponent(buildPortalSessionError("session-changed", profile.role))}`, req.url),
    )
  }

  if (pathname.startsWith("/superadmin") && profile.role !== "superadmin") {
    return NextResponse.redirect(
      new URL(`/superadmin/login?error=${encodeURIComponent(buildPortalSessionError("session-changed", profile.role))}`, req.url),
    )
  }

  return res
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
}
