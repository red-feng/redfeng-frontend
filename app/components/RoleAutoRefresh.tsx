"use client"

import { startTransition, useEffect, useRef } from "react"
import { usePathname, useRouter } from "next/navigation"

type RoleAutoRefreshProps = {
  intervalMs?: number
  onlyOnPaths?: string[]
}

export default function RoleAutoRefresh({
  intervalMs = 30000,
  onlyOnPaths,
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

    document.addEventListener("visibilitychange", handleVisibilityChange)
    window.addEventListener("focus", handleFocus)

    return () => {
      window.clearInterval(intervalId)
      document.removeEventListener("visibilitychange", handleVisibilityChange)
      window.removeEventListener("focus", handleFocus)
    }
  }, [intervalMs, router, shouldRefreshThisPath])

  return null
}
