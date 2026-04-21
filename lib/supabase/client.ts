import { createBrowserClient } from "@supabase/ssr"
import type { SupabaseClient } from "@supabase/supabase-js"
import {
  ACTIVE_PORTAL_COOKIE,
  type ActivePortal,
  getPortalSessionCookieName,
  normalizeActivePortal,
  resolvePortalFromPathname,
} from "@/lib/portal-context"

const browserClients = new Map<ActivePortal, SupabaseClient>()
const authSyncInitializedPortals = new Set<ActivePortal>()

function initializeRealtimeAuthSync(client: SupabaseClient, portal: ActivePortal) {
  if (authSyncInitializedPortals.has(portal) || typeof window === "undefined") return
  authSyncInitializedPortals.add(portal)

  void client.auth.getSession().then(({ data }) => {
    void client.realtime.setAuth(data.session?.access_token)
  })

  client.auth.onAuthStateChange((_event, session) => {
    void client.realtime.setAuth(session?.access_token)
  })
}

function readPortalFromBrowserCookie() {
  if (typeof document === "undefined") return ""

  const rawCookie = document.cookie
    .split("; ")
    .find((entry) => entry.startsWith(`${ACTIVE_PORTAL_COOKIE}=`))
    ?.split("=")[1]

  return normalizeActivePortal(rawCookie)
}

function resolveBrowserPortal(explicitPortal?: ActivePortal) {
  if (explicitPortal) return explicitPortal
  if (typeof window !== "undefined") {
    return readPortalFromBrowserCookie() || resolvePortalFromPathname(window.location.pathname)
  }
  return "customer"
}

export function createClient(portal?: ActivePortal) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing public Supabase environment variables")
  }

  const resolvedPortal = resolveBrowserPortal(portal)

  if (!browserClients.has(resolvedPortal)) {
    const client = createBrowserClient(supabaseUrl, supabaseAnonKey, {
      isSingleton: false,
      cookieOptions: {
        name: getPortalSessionCookieName(resolvedPortal),
      },
    })

    browserClients.set(resolvedPortal, client)
    initializeRealtimeAuthSync(client, resolvedPortal)
  }

  return browserClients.get(resolvedPortal)!
}
