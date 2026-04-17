"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { INTERNAL_CHAT_ENGINE, MERCHANT_SUPPORT_ENGINE } from "@/lib/chat-engines"

type AdminNavChild = {
  href: string
  label: string
  badgeCount?: number
  secondaryBadgeCount?: number
}

type AdminNavItem = {
  label: string
  href?: string
  badgeCount?: number
  secondaryBadgeCount?: number
  children?: AdminNavChild[]
}

function renderBadge(count: number, tone: "primary" | "danger") {
  if (count <= 0) return null

  const className =
    tone === "danger"
      ? "bg-rose-600 text-white"
      : "bg-orange-500 text-white"

  return (
    <span className={`inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-[11px] font-semibold leading-none ${className}`}>
      {count > 99 ? "99+" : count}
    </span>
  )
}

export default function AdminNavLinks({
  items,
}: {
  items: AdminNavItem[]
}) {
  const supabase = useMemo(() => createClient(), [])
  const pathname = usePathname()
  const normalizeHref = (href: string) => href.split("?")[0]
  const realtimeBadgeConfigs = useMemo(
    () => [
      {
        key: INTERNAL_CHAT_ENGINE.key,
        hrefSuffix: INTERNAL_CHAT_ENGINE.navHrefSuffix,
        unreadEndpoint: INTERNAL_CHAT_ENGINE.unreadCountEndpoint,
        channelName: INTERNAL_CHAT_ENGINE.navRealtimeChannel,
        tables: [...INTERNAL_CHAT_ENGINE.realtimeTables],
      },
      {
        key: MERCHANT_SUPPORT_ENGINE.key,
        hrefSuffix: MERCHANT_SUPPORT_ENGINE.navHrefSuffix,
        unreadEndpoint: MERCHANT_SUPPORT_ENGINE.adminUnreadCountEndpoint,
        channelName: `${MERCHANT_SUPPORT_ENGINE.adminRealtimeChannel}-nav`,
        tables: [...MERCHANT_SUPPORT_ENGINE.realtimeTables],
      },
    ],
    [],
  )
  const activeGroupLabel =
    items.find((item) => item.children?.some((child) => pathname.startsWith(normalizeHref(child.href))))?.label || null
  const [openGroupLabel, setOpenGroupLabel] = useState<string | null>(activeGroupLabel)
  const [liveBadgeCounts, setLiveBadgeCounts] = useState<Record<string, number | null>>({})
  const visibleGroupLabel = openGroupLabel || activeGroupLabel
  const visibleChildren = items.find((item) => item.label === visibleGroupLabel)?.children || []
  const resolveRealtimeBadgeConfig = (href?: string) =>
    realtimeBadgeConfigs.find((config) => href && normalizeHref(href).endsWith(config.hrefSuffix)) || null
  const resolveBadgeCount = (baseCount: number, href?: string) => {
    const config = resolveRealtimeBadgeConfig(href)
    if (!config) return baseCount
    return liveBadgeCounts[config.key] ?? baseCount
  }

  useEffect(() => {
    let active = true
    const debounceTimers = new Map<string, number>()
    const pollTimers = new Map<string, number>()
    const channels = realtimeBadgeConfigs.map((config) => {
      const fetchUnreadCount = async () => {
        try {
          const response = await fetch(config.unreadEndpoint, { cache: "no-store" })
          if (!response.ok || !active) return
          const payload = (await response.json()) as { unreadCount?: number }
          if (active) {
            setLiveBadgeCounts((current) => ({
              ...current,
              [config.key]: Number(payload.unreadCount || 0),
            }))
          }
        } catch {
          if (active) {
            setLiveBadgeCounts((current) => ({
              ...current,
              [config.key]: current[config.key] ?? 0,
            }))
          }
        }
      }

      void fetchUnreadCount()
      pollTimers.set(
        config.key,
        window.setInterval(() => {
          void fetchUnreadCount()
        }, 4000),
      )

      const channel = supabase.channel(config.channelName)
      for (const table of config.tables) {
        channel.on("postgres_changes", { event: "*", schema: "public", table }, () => {
          const currentTimer = debounceTimers.get(config.key)
          if (currentTimer) window.clearTimeout(currentTimer)
          debounceTimers.set(
            config.key,
            window.setTimeout(() => {
              void fetchUnreadCount()
            }, 180),
          )
        })
      }

      channel.subscribe()
      return channel
    })

    return () => {
      active = false
      for (const timerId of debounceTimers.values()) {
        window.clearTimeout(timerId)
      }
      for (const timerId of pollTimers.values()) {
        window.clearInterval(timerId)
      }
      for (const channel of channels) {
        void supabase.removeChannel(channel)
      }
    }
  }, [realtimeBadgeConfigs, supabase])

  return (
    <div className="space-y-3">
      <div className="flex min-w-max flex-wrap gap-2">
        {items.map((item) => {
          const isActiveLink = item.href ? pathname.startsWith(normalizeHref(item.href)) : false
          const isActiveGroup = item.children
            ? item.children.some((child) => pathname.startsWith(normalizeHref(child.href)))
            : false
          const isHighlighted = isActiveLink || isActiveGroup || visibleGroupLabel === item.label

          if (item.children) {
            const totalPrimaryBadgeCount = item.children.reduce(
              (total, child) => total + resolveBadgeCount(Number(child.badgeCount || 0), child.href),
              0,
            )
            const totalSecondaryBadgeCount = item.children.reduce((total, child) => total + Number(child.secondaryBadgeCount || 0), 0)

            return (
              <button
                key={item.label}
                type="button"
                onClick={() =>
                  setOpenGroupLabel((current) => (current === item.label ? null : item.label))
                }
                className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition ${
                  isHighlighted
                    ? "border-orange-200 bg-[#fff7ef] text-orange-600"
                    : "border-[#ecd9c2] bg-white text-slate-700 hover:border-orange-200 hover:bg-[#fff7ef] hover:text-orange-600"
                }`}
              >
                {item.label}
                {renderBadge(totalPrimaryBadgeCount, "primary")}
                {renderBadge(totalSecondaryBadgeCount, "danger")}
                <span className={`text-xs transition ${visibleGroupLabel === item.label ? "rotate-180" : ""}`}>v</span>
              </button>
            )
          }

          if (item.href) {
            return (
              <Link
                key={item.label}
                href={item.href}
                className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition ${
                  isHighlighted
                    ? "border-orange-200 bg-[#fff7ef] text-orange-600"
                    : "border-[#ecd9c2] bg-white text-slate-700 hover:border-orange-200 hover:bg-[#fff7ef] hover:text-orange-600"
                }`}
              >
                {item.label}
                {renderBadge(resolveBadgeCount(Number(item.badgeCount || 0), item.href), "primary")}
                {renderBadge(Number(item.secondaryBadgeCount || 0), "danger")}
              </Link>
            )
          }

          return (
            <span
              key={item.label}
              className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-400"
            >
              {item.label}
            </span>
          )
        })}
      </div>

      {visibleChildren.length > 0 && (
        <div className="flex min-w-max flex-wrap gap-2 rounded-[22px] border border-[#ecd9c2] bg-[#fffaf3] p-2">
          {visibleChildren.map((child) => {
            const isActive = pathname.startsWith(normalizeHref(child.href))
              const visiblePrimaryBadgeCount = resolveBadgeCount(Number(child.badgeCount || 0), child.href)
            const visibleSecondaryBadgeCount = Number(child.secondaryBadgeCount || 0)

            return (
              <Link
                key={child.href}
                href={child.href}
                className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition ${
                  isActive
                    ? "border-orange-200 bg-white text-orange-600 shadow-[0_6px_18px_rgba(249,115,22,0.08)]"
                    : "border-transparent bg-transparent text-slate-600 hover:border-orange-200 hover:bg-white hover:text-orange-600"
                }`}
              >
                {child.label}
                {renderBadge(visiblePrimaryBadgeCount, "primary")}
                {renderBadge(visibleSecondaryBadgeCount, "danger")}
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
