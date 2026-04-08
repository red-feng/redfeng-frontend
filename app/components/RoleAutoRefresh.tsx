"use client"

import { startTransition, useEffect, useRef } from "react"
import { usePathname, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

type RoleAutoRefreshProps = {
  intervalMs?: number
  onlyOnPaths?: string[]
  syncKeys?: string[]
  realtimeTables?: string[]
}

export default function RoleAutoRefresh({
  intervalMs = 30000,
  onlyOnPaths,
  syncKeys,
  realtimeTables,
}: RoleAutoRefreshProps) {
  const router = useRouter()
  const pathname = usePathname()
  const lastRefreshAtRef = useRef(0)
  const normalizedPaths = onlyOnPaths?.map((path) => path.trim()).filter(Boolean) || []
  const shouldRefreshThisPath =
    normalizedPaths.length === 0 ||
    normalizedPaths.some((path) => pathname === path || pathname.startsWith(`${path}/`))

  useEffect(() => {
    if (!shouldRefreshThisPath) return
    const normalizedSyncKeys = syncKeys?.map((key) => key.trim()).filter(Boolean) || []
    const normalizedRealtimeTables = realtimeTables?.map((table) => table.trim()).filter(Boolean) || []
    const supabase = normalizedRealtimeTables.length ? createClient() : null

    function refreshNow(force = false) {
      const now = Date.now()
      if (!force && now - lastRefreshAtRef.current < 5000) return
      if (document.visibilityState === "hidden") return

      lastRefreshAtRef.current = now
      startTransition(() => {
        router.refresh()
      })
    }

    const intervalId = window.setInterval(() => {
      refreshNow()
    }, intervalMs)

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        refreshNow(true)
      }
    }

    function handleFocus() {
      refreshNow(true)
    }

    function handleStorage(event: StorageEvent) {
      if (!event.key) return
      if (!normalizedSyncKeys.includes(event.key)) return
      refreshNow(true)
    }

    const realtimeChannel =
      supabase && normalizedRealtimeTables.length
        ? supabase.channel(
            `role-auto-refresh:${pathname}:${normalizedRealtimeTables.join(",")}`,
          )
        : null

    if (realtimeChannel) {
      normalizedRealtimeTables.forEach((table) => {
        realtimeChannel.on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table,
          },
          () => {
            refreshNow(true)
          },
        )
      })

      realtimeChannel.subscribe()
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)
    window.addEventListener("focus", handleFocus)
    window.addEventListener("storage", handleStorage)

    return () => {
      window.clearInterval(intervalId)
      document.removeEventListener("visibilitychange", handleVisibilityChange)
      window.removeEventListener("focus", handleFocus)
      window.removeEventListener("storage", handleStorage)
      if (supabase && realtimeChannel) {
        void supabase.removeChannel(realtimeChannel)
      }
    }
  }, [intervalMs, pathname, realtimeTables, router, shouldRefreshThisPath, syncKeys])

  return null
}
