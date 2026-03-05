import { createServerClient } from "@supabase/ssr"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

const CANONICAL_HOST = "app.redfeng.co"

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname
  const host = req.headers.get("host") || ""

  // Canonical redirect: focus all traffic to app.redfeng.co
  if (host.endsWith(".vercel.app")) {
    const redirectUrl = new URL(req.url)
    redirectUrl.protocol = "https:"
    redirectUrl.host = CANONICAL_HOST
    return NextResponse.redirect(redirectUrl, 301)
  }

  // Redirect legacy /paket -> /packages
  if (pathname === "/paket") {
    return NextResponse.redirect(new URL("/packages", req.url), 301)
  }

  if (pathname.startsWith("/paket/")) {
    const redirectUrl = new URL(req.url)
    redirectUrl.pathname = pathname.replace("/paket/", "/packages/")
    return NextResponse.redirect(redirectUrl, 301)
  }

  const res = NextResponse.next()

  if (!pathname.startsWith("/admin") && !pathname.startsWith("/merchant")) {
    return res
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name) {
          return req.cookies.get(name)?.value
        },
        set(name, value, options) {
          res.cookies.set({ name, value, ...options })
        },
        remove(name, options) {
          res.cookies.set({ name, value: "", ...options })
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(new URL("/", req.url))
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (!profile) {
    return NextResponse.redirect(new URL("/", req.url))
  }

  if (pathname.startsWith("/admin")) {
    if (!["admin", "superadmin"].includes(profile.role)) {
      return NextResponse.redirect(new URL("/", req.url))
    }
  }

  if (pathname.startsWith("/merchant")) {
    if (profile.role !== "merchant") {
      return NextResponse.redirect(new URL("/", req.url))
    }
  }

  return res
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
}
