import { createServerClient } from "@supabase/ssr"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()

  const pathname = req.nextUrl.pathname

  // Hanya protect /admin dan /merchant
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
        set() {},
        remove() {},
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Kalau belum login dan mencoba akses protected route
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
  matcher: ["/admin/:path*", "/merchant/:path*"],
}