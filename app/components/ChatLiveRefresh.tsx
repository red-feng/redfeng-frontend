"use client"

import { startTransition, useEffect, useRef } from "react"
import { usePathname, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

type ChatLiveRefreshProps = {
  roomId?: string
  delayMs?: number
}

export default function ChatLiveRefresh({
  roomId,
  delayMs = 160,
}: ChatLiveRefreshProps) {
  const router = useRouter()
  const pathname = usePathname()
  const refreshTimeoutRef = useRef<number | null>(null)
  const lastRefreshAtRef = useRef(0)
  const hasQueuedRefreshRef = useRef(false)

  useEffect(() => {
    const supabase = createClient()

    function isUserBusy() {
      const activeElement = document.activeElement as HTMLElement | null
      if (!activeElement) return false
      const tagName = activeElement.tagName
      if (activeElement.isContentEditable) return true
      if (tagName === "INPUT" || tagName === "TEXTAREA" || tagName === "SELECT") return true
      if (activeElement.getAttribute("role") === "combobox") return true
      return false
    }

    function runRefresh(force = false) {
      const now = Date.now()
      if (!force && now - lastRefreshAtRef.current < 1200) return
      if (document.visibilityState === "hidden") return
      if (!force && isUserBusy()) {
        scheduleRefresh(Math.max(delayMs, 600))
        return
      }

      lastRefreshAtRef.current = now
      hasQueuedRefreshRef.current = false
      startTransition(() => {
        router.refresh()
      })
    }

    function scheduleRefresh(nextDelay = delayMs) {
      hasQueuedRefreshRef.current = true
      if (document.visibilityState === "hidden") return
      if (refreshTimeoutRef.current) {
        window.clearTimeout(refreshTimeoutRef.current)
      }
      refreshTimeoutRef.current = window.setTimeout(() => {
        refreshTimeoutRef.current = null
        runRefresh()
      }, nextDelay)
    }

    function handleRealtimeEvent() {
      scheduleRefresh()
    }

    function handleVisibilityChange() {
      if (document.visibilityState !== "visible") return
      if (hasQueuedRefreshRef.current) {
        if (refreshTimeoutRef.current) {
          window.clearTimeout(refreshTimeoutRef.current)
          refreshTimeoutRef.current = null
        }
        runRefresh(true)
      }
    }

    function handleFocus() {
      if (hasQueuedRefreshRef.current) {
        runRefresh(true)
      }
    }

    const channel = supabase.channel(`chat-live-refresh:${pathname}:${roomId || "all"}`)

    channel.on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "package_chat_rooms",
      },
      handleRealtimeEvent,
    )

    channel.on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "package_chat_messages",
      },
      handleRealtimeEvent,
    )

    channel.subscribe()
    document.addEventListener("visibilitychange", handleVisibilityChange)
    window.addEventListener("focus", handleFocus)

    return () => {
      if (refreshTimeoutRef.current) {
        window.clearTimeout(refreshTimeoutRef.current)
        refreshTimeoutRef.current = null
      }
      document.removeEventListener("visibilitychange", handleVisibilityChange)
      window.removeEventListener("focus", handleFocus)
      void supabase.removeChannel(channel)
    }
  }, [delayMs, pathname, roomId, router])

  return null
}
