"use client"

import { startTransition, useEffect, useRef } from "react"
import { usePathname, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

type RoleAutoRefreshProps = {
  intervalMs?: number
  onlyOnPaths?: string[]
  excludeOnPaths?: string[]
  syncKeys?: string[]
  realtimeTables?: string[]
  realtimeDelayMs?: number
  pathRealtimeDelayMs?: Record<string, number>
}

export default function RoleAutoRefresh({
  intervalMs = 30000,
  onlyOnPaths,
  excludeOnPaths,
  syncKeys,
  realtimeTables,
  realtimeDelayMs = 700,
  pathRealtimeDelayMs,
}: RoleAutoRefreshProps) {
  const router = useRouter()
  const pathname = usePathname()
  const lastRefreshAtRef = useRef(0)
  const refreshTimeoutRef = useRef<number | null>(null)
  const hasQueuedRefreshRef = useRef(false)
  const lastTypingAtRef = useRef(0)
  const normalizedPaths = onlyOnPaths?.map(normalizePathPattern).filter(Boolean) || []
  const normalizedExcludedPaths = excludeOnPaths?.map(normalizePathPattern).filter(Boolean) || []
  const normalizedDelayEntries =
    Object.entries(pathRealtimeDelayMs || {}).map(([path, delay]) => [normalizePathPattern(path), delay] as const)
  const isExcludedPath = normalizedExcludedPaths.some((path) => matchesPath(pathname, path))
  const shouldRefreshThisPath =
    !isExcludedPath &&
    (normalizedPaths.length === 0 || normalizedPaths.some((path) => matchesPath(pathname, path)))
  const activeRealtimeDelay =
    normalizedDelayEntries.find(([path]) => matchesPath(pathname, path))?.[1] || realtimeDelayMs

  useEffect(() => {
    if (!shouldRefreshThisPath) return
    const normalizedSyncKeys = syncKeys?.map((key) => key.trim()).filter(Boolean) || []
    const normalizedRealtimeTables = realtimeTables?.map((table) => table.trim()).filter(Boolean) || []
    const supabase = normalizedRealtimeTables.length ? createClient() : null

    function runRefresh(force = false) {
      const now = Date.now()
      if (!force && now - lastRefreshAtRef.current < 5000) return
      if (document.visibilityState === "hidden") return
      if (!force && isUserBusy()) {
        scheduleRefresh(Math.max(activeRealtimeDelay, 1200))
        return
      }

      lastRefreshAtRef.current = now
      hasQueuedRefreshRef.current = false
      startTransition(() => {
        router.refresh()
      })
    }

    function isUserBusy() {
      if (Date.now() - lastTypingAtRef.current < 4000) return true
      const activeElement = document.activeElement as HTMLElement | null
      if (!activeElement) return false
      const tagName = activeElement.tagName
      if (activeElement.isContentEditable) return true
      if (tagName === "INPUT" || tagName === "TEXTAREA" || tagName === "SELECT") return true
      if (activeElement.getAttribute("role") === "combobox") return true
      return false
    }

    function scheduleRefresh(delayMs = 700) {
      hasQueuedRefreshRef.current = true
      if (document.visibilityState === "hidden") return
      if (refreshTimeoutRef.current) {
        window.clearTimeout(refreshTimeoutRef.current)
      }
      refreshTimeoutRef.current = window.setTimeout(() => {
        refreshTimeoutRef.current = null
        runRefresh()
      }, delayMs)
    }

    const intervalId = window.setInterval(() => {
      runRefresh()
    }, intervalMs)

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        if (hasQueuedRefreshRef.current) {
          if (refreshTimeoutRef.current) {
            window.clearTimeout(refreshTimeoutRef.current)
            refreshTimeoutRef.current = null
          }
          if (isUserBusy()) {
            scheduleRefresh(Math.max(activeRealtimeDelay, 1400))
          } else {
            runRefresh(true)
          }
          return
        }
        if (isUserBusy()) {
          scheduleRefresh(Math.max(activeRealtimeDelay, 1400))
        } else {
          runRefresh(true)
        }
      }
    }

    function handleFocus() {
      if (isUserBusy()) {
        scheduleRefresh(Math.max(activeRealtimeDelay, 1400))
        return
      }
      runRefresh(true)
    }

    function handleInteractionSettled() {
      if (!hasQueuedRefreshRef.current) return
      scheduleRefresh(250)
    }

    function handleTypingActivity() {
      lastTypingAtRef.current = Date.now()
    }

    function handleStorage(event: StorageEvent) {
      if (!event.key) return
      if (!normalizedSyncKeys.includes(event.key)) return
      scheduleRefresh(250)
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
            scheduleRefresh(activeRealtimeDelay)
          },
        )
      })

      realtimeChannel.subscribe()
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)
    window.addEventListener("focus", handleFocus)
    window.addEventListener("storage", handleStorage)
    document.addEventListener("focusin", handleInteractionSettled)
    document.addEventListener("focusout", handleInteractionSettled)
    document.addEventListener("change", handleInteractionSettled)
    document.addEventListener("input", handleTypingActivity, true)
    document.addEventListener("keydown", handleTypingActivity, true)
    document.addEventListener("compositionstart", handleTypingActivity, true)
    document.addEventListener("compositionend", handleTypingActivity, true)

    return () => {
      window.clearInterval(intervalId)
      if (refreshTimeoutRef.current) {
        window.clearTimeout(refreshTimeoutRef.current)
        refreshTimeoutRef.current = null
      }
      document.removeEventListener("visibilitychange", handleVisibilityChange)
      window.removeEventListener("focus", handleFocus)
      window.removeEventListener("storage", handleStorage)
      document.removeEventListener("focusin", handleInteractionSettled)
      document.removeEventListener("focusout", handleInteractionSettled)
      document.removeEventListener("change", handleInteractionSettled)
      document.removeEventListener("input", handleTypingActivity, true)
      document.removeEventListener("keydown", handleTypingActivity, true)
      document.removeEventListener("compositionstart", handleTypingActivity, true)
      document.removeEventListener("compositionend", handleTypingActivity, true)
      if (supabase && realtimeChannel) {
        void supabase.removeChannel(realtimeChannel)
      }
    }
  }, [activeRealtimeDelay, intervalMs, pathname, realtimeTables, router, shouldRefreshThisPath, syncKeys])

  return null
}

function normalizePathPattern(path: string) {
  const trimmed = path.trim()
  if (!trimmed) return ""
  if (trimmed === "/") return "/"
  return trimmed.endsWith("/") ? trimmed.slice(0, -1) : trimmed
}

function matchesPath(pathname: string, pattern: string) {
  if (!pattern) return false
  if (pattern === "/") return pathname === "/"
  if (pattern.includes("*")) {
    const regexPattern = `^${pattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\\\*/g, ".*")}$`
    return new RegExp(regexPattern).test(pathname)
  }
  return pathname === pattern || pathname.startsWith(`${pattern}/`)
}
