import { createBrowserClient } from "@supabase/ssr"
import type { SupabaseClient } from "@supabase/supabase-js"

let browserClient: SupabaseClient | null = null
let authSyncInitialized = false

function initializeRealtimeAuthSync(client: SupabaseClient) {
  if (authSyncInitialized || typeof window === "undefined") return
  authSyncInitialized = true

  void client.auth.getSession().then(({ data }) => {
    void client.realtime.setAuth(data.session?.access_token)
  })

  client.auth.onAuthStateChange((_event, session) => {
    void client.realtime.setAuth(session?.access_token)
  })
}

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing public Supabase environment variables")
  }

  if (!browserClient) {
    browserClient = createBrowserClient(supabaseUrl, supabaseAnonKey)
    initializeRealtimeAuthSync(browserClient)
  }

  return browserClient
}
