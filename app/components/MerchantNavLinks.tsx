"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useMemo, useRef, useState } from "react"
import { createClient } from "@/lib/supabase/client"

type MerchantNavItem = {
  href: string
  label: string
  badgeCount: number
}

type MerchantNavStatusText = {
  live: string
  fallback: string
  connecting: string
}

type MerchantNavBadgesPayload = {
  badgeCounts?: Record<string, number>
  error?: string
}

type RealtimeStatus = "connecting" | "live" | "fallback"

const NAV_BADGE_POLL_INTERVAL_MS = 20000
const NAV_BADGE_FALLBACK_INTERVAL_MS = 4000

export default function MerchantNavLinks({
  items,
  statusText,
}: {
  items: MerchantNavItem[]
  statusText: MerchantNavStatusText
}) {
  const pathname = usePathname()
  const [supabase] = useState(() => createClient())
  const [liveBadgeCounts, setLiveBadgeCounts] = useState<Record<string, number>>(() =>
    Object.fromEntries(items.map((item) => [item.href, item.badgeCount])),
  )
  const [realtimeStatus, setRealtimeStatus] = useState<RealtimeStatus>("connecting")
  const lastFetchAtRef = useRef(0)
  const queuedRefreshTimeoutRef = useRef<number | null>(null)
  const itemBadgeCounts = useMemo(
    () => Object.fromEntries(items.map((item) => [item.href, item.badgeCount])),
    [items],
  )

  useEffect(() => {
    setLiveBadgeCounts(itemBadgeCounts)
  }, [itemBadgeCounts])

  useEffect(() => {
    let cancelled = false

    async function refreshBadges(force = false) {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") return
      const now = Date.now()
      const minGapMs = realtimeStatus === "fallback" ? NAV_BADGE_FALLBACK_INTERVAL_MS - 500 : 5000
      if (!force && now - lastFetchAtRef.current < minGapMs) return

      lastFetchAtRef.current = now

      try {
        const response = await fetch("/api/merchant/nav-badges", { cache: "no-store" })
        const payload = (await response.json().catch(() => null)) as MerchantNavBadgesPayload | null
        if (!response.ok || !payload?.badgeCounts || cancelled) return

        setLiveBadgeCounts((current) => ({
          ...current,
          ...payload.badgeCounts,
        }))
      } catch {}
    }

    function handleFocus() {
      void refreshBadges(true)
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        void refreshBadges(true)
      }
    }

    void refreshBadges(true)
    const intervalId = window.setInterval(() => {
      void refreshBadges()
    }, realtimeStatus === "fallback" ? NAV_BADGE_FALLBACK_INTERVAL_MS : NAV_BADGE_POLL_INTERVAL_MS)

    window.addEventListener("focus", handleFocus)
    document.addEventListener("visibilitychange", handleVisibilityChange)

    return () => {
      cancelled = true
      window.clearInterval(intervalId)
      window.removeEventListener("focus", handleFocus)
      document.removeEventListener("visibilitychange", handleVisibilityChange)
    }
  }, [pathname, realtimeStatus])

  useEffect(() => {
    function scheduleRealtimeRefresh(delayMs = 180) {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") return
      if (queuedRefreshTimeoutRef.current) {
        window.clearTimeout(queuedRefreshTimeoutRef.current)
      }
      queuedRefreshTimeoutRef.current = window.setTimeout(async () => {
        queuedRefreshTimeoutRef.current = null
        try {
          const response = await fetch("/api/merchant/nav-badges", { cache: "no-store" })
          const payload = (await response.json().catch(() => null)) as MerchantNavBadgesPayload | null
          if (!response.ok || !payload?.badgeCounts) return

          setLiveBadgeCounts((current) => ({
            ...current,
            ...payload.badgeCounts,
          }))
          lastFetchAtRef.current = Date.now()
        } catch {}
      }, delayMs)
    }

    const channel = supabase.channel(`merchant-nav-badges:${pathname}`)
    ;["packages", "bookings", "package_reviews", "merchant_nav_seen_states", "commerce_chat_threads", "commerce_chat_messages"].forEach((table) => {
      channel.on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table,
        },
        () => {
          scheduleRealtimeRefresh()
        },
      )
    })

    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        setRealtimeStatus("live")
        return
      }

      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
        setRealtimeStatus("fallback")
        return
      }

      setRealtimeStatus("connecting")
    })

    return () => {
      if (queuedRefreshTimeoutRef.current) {
        window.clearTimeout(queuedRefreshTimeoutRef.current)
        queuedRefreshTimeoutRef.current = null
      }
      void supabase.removeChannel(channel)
    }
  }, [pathname, supabase])

  const navRealtimeBadge =
    realtimeStatus === "live"
      ? {
          label: statusText.live,
          className: "border-emerald-200 bg-emerald-50 text-emerald-700",
        }
      : realtimeStatus === "fallback"
        ? {
            label: statusText.fallback,
            className: "border-orange-200 bg-orange-50 text-orange-700",
          }
        : {
            label: statusText.connecting,
            className: "border-amber-200 bg-amber-50 text-amber-700",
          }

  return (
    <div className="flex min-w-max items-center gap-2">
      <span
        className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${navRealtimeBadge.className}`}
      >
        {navRealtimeBadge.label}
      </span>
      {items.map((item) => {
        const isActiveSection = pathname.startsWith(item.href)
        const visibleBadgeCount = isActiveSection ? 0 : Number(liveBadgeCounts[item.href] ?? item.badgeCount ?? 0)

        return (
          <Link
            key={item.href}
            href={item.href}
            className="inline-flex items-center gap-2 rounded-full border border-[#ecd9c2] bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-orange-200 hover:bg-[#fff7ef] hover:text-orange-600"
          >
            {item.label}
            {visibleBadgeCount > 0 && (
              <span
                className={`inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-[11px] font-semibold leading-none text-white ${
                  "bg-orange-500"
                }`}
              >
                {visibleBadgeCount > 99 ? "99+" : visibleBadgeCount}
              </span>
            )}
          </Link>
        )
      })}
    </div>
  )
}
