import { createServerClient } from "@supabase/ssr"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export async function middleware(req: NextRequest) {

  const pathname = req.nextUrl.pathname

  // 🔥 Redirect lama /paket → /packages
  if (pathname === "/paket") {
    return NextResponse.redirect(new URL("/packages", req.url), 301)
  }

  if (pathname.startsWith("/paket/")) {
    const newPath = pathname.replace("/paket/", "/packages/")
    return NextResponse.redirect(new URL(newPath, req.url), 301)
  }

  let res = NextResponse.next()

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

  if (!pathname.startsWith("/admin") && !pathname.startsWith("/merchant")) {
    return res
  }

  const { data: { user } } = await supabase.auth.getUser()

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
  matcher: [
    "/admin/:path*",
    "/merchant/:path*",
    "/paket/:path*"
  ],
}