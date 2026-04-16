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

type MerchantNavBadgesPayload = {
  badgeCounts?: Record<string, number>
  error?: string
}

export default function MerchantNavLinks({
  items,
}: {
  items: MerchantNavItem[]
}) {
  const pathname = usePathname()
  const [supabase] = useState(() => createClient())
  const [liveBadgeCounts, setLiveBadgeCounts] = useState<Record<string, number>>(() =>
    Object.fromEntries(items.map((item) => [item.href, item.badgeCount])),
  )
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
      if (!force && now - lastFetchAtRef.current < 5000) return

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
    }, 20000)

    window.addEventListener("focus", handleFocus)
    document.addEventListener("visibilitychange", handleVisibilityChange)

    return () => {
      cancelled = true
      window.clearInterval(intervalId)
      window.removeEventListener("focus", handleFocus)
      document.removeEventListener("visibilitychange", handleVisibilityChange)
    }
  }, [pathname])

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
    ;["packages", "bookings", "package_chat_rooms", "package_reviews", "merchant_nav_seen_states"].forEach((table) => {
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

    channel.subscribe()

    return () => {
      if (queuedRefreshTimeoutRef.current) {
        window.clearTimeout(queuedRefreshTimeoutRef.current)
        queuedRefreshTimeoutRef.current = null
      }
      void supabase.removeChannel(channel)
    }
  }, [pathname, supabase])

  return (
    <div className="flex min-w-max gap-2">
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
                  item.href === "/merchant/chat"
                    ? "bg-rose-500 shadow-[0_10px_22px_rgba(244,63,94,0.3)]"
                    : "bg-orange-500"
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
