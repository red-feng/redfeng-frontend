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
  const lastTypingAtRef = useRef(0)

  useEffect(() => {
    const supabase = createClient()

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

    function handleRoomRealtimeEvent() {
      scheduleRefresh()
    }

    function handleMessageRealtimeEvent() {
      if (isUserBusy()) {
        scheduleRefresh(Math.max(delayMs, 320))
        return
      }
      runRefresh(true)
    }

    function handleVisibilityChange() {
      if (document.visibilityState !== "visible") return
      if (hasQueuedRefreshRef.current) {
        if (refreshTimeoutRef.current) {
          window.clearTimeout(refreshTimeoutRef.current)
          refreshTimeoutRef.current = null
        }
        if (isUserBusy()) {
          scheduleRefresh(Math.max(delayMs, 700))
        } else {
          runRefresh(true)
        }
      }
    }

    function handleFocus() {
      if (hasQueuedRefreshRef.current) {
        if (isUserBusy()) {
          scheduleRefresh(Math.max(delayMs, 700))
        } else {
          runRefresh(true)
        }
      }
    }

    function handleTypingActivity() {
      lastTypingAtRef.current = Date.now()
    }

    const channel = supabase.channel(`chat-live-refresh:${pathname}:${roomId || "all"}`)

    channel.on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "package_chat_rooms",
      },
      handleRoomRealtimeEvent,
    )

    channel.on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "package_chat_messages",
        ...(roomId ? { filter: `room_id=eq.${roomId}` } : {}),
      },
      handleMessageRealtimeEvent,
    )

    channel.subscribe()
    document.addEventListener("visibilitychange", handleVisibilityChange)
    window.addEventListener("focus", handleFocus)
    document.addEventListener("input", handleTypingActivity, true)
    document.addEventListener("keydown", handleTypingActivity, true)
    document.addEventListener("compositionstart", handleTypingActivity, true)
    document.addEventListener("compositionend", handleTypingActivity, true)

    return () => {
      if (refreshTimeoutRef.current) {
        window.clearTimeout(refreshTimeoutRef.current)
        refreshTimeoutRef.current = null
      }
      document.removeEventListener("visibilitychange", handleVisibilityChange)
      window.removeEventListener("focus", handleFocus)
      document.removeEventListener("input", handleTypingActivity, true)
      document.removeEventListener("keydown", handleTypingActivity, true)
      document.removeEventListener("compositionstart", handleTypingActivity, true)
      document.removeEventListener("compositionend", handleTypingActivity, true)
      void supabase.removeChannel(channel)
    }
  }, [delayMs, pathname, roomId, router])

  return null
}
