import { createServerClient, type CookieOptions } from "@supabase/ssr"
import { cookies } from "next/headers"
import { getRequiredEnv } from "@/lib/env"
import { ACTIVE_PORTAL_COOKIE, type ActivePortal, getPortalSessionCookieName, normalizeActivePortal } from "@/lib/portal-context"

function buildBaseCookieOptions(options: CookieOptions) {
  return {
    path: "/",
    sameSite: "lax" as const,
    ...options,
  }
}

export async function createClient(portal?: ActivePortal) {
  const cookieStore = await cookies()
  const resolvedPortal = portal || normalizeActivePortal(cookieStore.get(ACTIVE_PORTAL_COOKIE)?.value) || "customer"

  return createServerClient(
    getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
    getRequiredEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    {
      cookieOptions: {
        name: getPortalSessionCookieName(resolvedPortal),
        path: "/",
        sameSite: "lax",
      },
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set({
                name,
                value,
                ...buildBaseCookieOptions(options),
              })
            }
          } catch {}
        },
      },
    }
  )
}
