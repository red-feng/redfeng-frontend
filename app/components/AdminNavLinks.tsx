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

export type { AdminNavChild, AdminNavItem }

function NavIcon({
  label,
  className,
}: {
  label: string
  className?: string
}) {
  const normalized = label.toLowerCase()

  if (normalized.includes("dashboard")) {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
        <path d="M4 5h7v6H4V5zm9 0h7v10h-7V5zM4 13h7v6H4v-6zm9 4h7v2h-7v-2z" fill="currentColor" />
      </svg>
    )
  }
  if (normalized.includes("booking")) {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
        <path d="M6 5h12a2 2 0 012 2v10a2 2 0 01-2 2H6a2 2 0 01-2-2V7a2 2 0 012-2zm0 2v10h12V7H6zm2 2h8v2H8V9zm0 4h5v2H8v-2z" fill="currentColor" />
      </svg>
    )
  }
  if (normalized.includes("paket") || normalized.includes("package")) {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
        <path d="M12 3l2.6 5.3L20 9l-4 3.9.9 5.6-4.9-2.6-4.9 2.6.9-5.6L4 9l5.4-.7L12 3z" fill="currentColor" />
      </svg>
    )
  }
  if (normalized.includes("anom")) {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
        <path d="M12 2l10 18H2L12 2zm0 4.2L5.4 18h13.2L12 6.2zM11 9h2v4h-2V9zm0 5h2v2h-2v-2z" fill="currentColor" />
      </svg>
    )
  }
  if (normalized.includes("sla")) {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
        <path d="M12 4a8 8 0 100 16 8 8 0 000-16zm0-2a10 10 0 110 20 10 10 0 010-20zm1 5v5.2l3.6 2.1-1 1.7L11 13V7h2z" fill="currentColor" />
      </svg>
    )
  }
  if (normalized.includes("merchant")) {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
        <path d="M5 5h14l1 4a3 3 0 01-3 3h-1v7h-2v-7h-4v7H8v-7H7a3 3 0 01-3-3l1-4zm2 .5L6.4 8A1.5 1.5 0 007.9 10h8.2A1.5 1.5 0 0017.6 8L17 5.5H7z" fill="currentColor" />
      </svg>
    )
  }
  if (normalized.includes("chat")) {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
        <path d="M4 5h16a2 2 0 012 2v8a2 2 0 01-2 2H8l-4 3v-3H4a2 2 0 01-2-2V7a2 2 0 012-2zm2 4v2h8V9H6zm0 4v2h12v-2H6z" fill="currentColor" />
      </svg>
    )
  }
  if (normalized.includes("support")) {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
        <path d="M12 3a8 8 0 00-8 8v3a2 2 0 002 2h2v-6H6a6 6 0 1112 0h-2v6h2a2 2 0 002-2v-3a8 8 0 00-8-8zm-4 9h2v6H8v-6zm6 0h2v6h-2v-6z" fill="currentColor" />
      </svg>
    )
  }
  if (normalized.includes("pesawat")) {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
        <path d="M3 14.5l7-1.8 5.8-6.2a1.8 1.8 0 012.6 2.5l-6.1 5.8-1.8 7-2.1-.8 1.1-5.1-3.6 2.8H3.8l3.6-4.2-5-2z" fill="currentColor" />
      </svg>
    )
  }
  if (normalized.includes("hotel")) {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
        <path d="M6 3h8v18H6V3zm2 2v3h4V5H8zm8 5h2a2 2 0 012 2v9h-4v-8h-2v8h-2V3h2v7z" fill="currentColor" />
      </svg>
    )
  }
  if (normalized.includes("kereta")) {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
        <path d="M7 3h10a3 3 0 013 3v7.5a3.5 3.5 0 01-3.5 3.5l1.5 2.5h-2.3L14 17H10l-1.7 2.5H6l1.5-2.5A3.5 3.5 0 014 13.5V6a3 3 0 013-3z" fill="currentColor" />
      </svg>
    )
  }
  if (normalized.includes("bus")) {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
        <path d="M7 4h10c2 0 3 1.3 3 3v8a3 3 0 01-2 2.8V20h-2v-2H8v2H6v-2.2A3 3 0 014 15V7c0-1.7 1-3 3-3z" fill="currentColor" />
      </svg>
    )
  }
  if (normalized.includes("kapal")) {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
        <path d="M10 4h4v3h3v5l2 1.5V16l-7 4-7-4v-2.5l2-1.5V9h4V4z" fill="currentColor" />
      </svg>
    )
  }
  if (normalized.includes("audit") || normalized.includes("report") || normalized.includes("data")) {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
        <path d="M6 3h8l4 4v14H6V3zm8 1.5V8h3.5L14 4.5zM8 11h8v2H8v-2zm0 4h8v2H8v-2z" fill="currentColor" />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <circle cx="12" cy="12" r="9" fill="currentColor" />
    </svg>
  )
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
  onNavigate,
}: {
  items: AdminNavItem[]
  onNavigate?: () => void
}) {
  const supabase = useMemo(() => createClient(), [])
  const pathname = usePathname()
  const normalizeHref = (href: string) => href.split("?")[0]
  const allNavHrefs = items.flatMap((item) => [
    ...(item.href ? [item.href] : []),
    ...((item.children || []).map((child) => child.href)),
  ])
  const activeHref =
    allNavHrefs
      .map(normalizeHref)
      .filter((href) => pathname === href || pathname.startsWith(`${href}/`))
      .sort((a, b) => b.length - a.length)[0] || null
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
    items.find((item) => item.children?.some((child) => normalizeHref(child.href) === activeHref))?.label || null
  const [openGroupLabel, setOpenGroupLabel] = useState<string | null>(activeGroupLabel)
  const [liveBadgeCounts, setLiveBadgeCounts] = useState<Record<string, number | null>>({})
  const visibleGroupLabel = openGroupLabel || activeGroupLabel
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
    <div className="space-y-2.5">
      {items.map((item) => {
          const isSectionHeading = !item.href && !item.children
          if (isSectionHeading) {
            return (
              <div key={item.label} className="px-3 pt-4 text-[10px] font-semibold uppercase tracking-[0.26em] text-slate-400">
                {item.label}
              </div>
            )
          }

          const isActiveLink = item.href ? normalizeHref(item.href) === activeHref : false
          const isActiveGroup = item.children
            ? item.children.some((child) => normalizeHref(child.href) === activeHref)
            : false
          const isHighlighted = isActiveLink || isActiveGroup || visibleGroupLabel === item.label

          if (item.children) {
            const totalPrimaryBadgeCount = item.children.reduce(
              (total, child) => total + resolveBadgeCount(Number(child.badgeCount || 0), child.href),
              0,
            )
            const totalSecondaryBadgeCount = item.children.reduce((total, child) => total + Number(child.secondaryBadgeCount || 0), 0)

            return (
              <div key={item.label}>
                <button
                  type="button"
                  onClick={() =>
                    setOpenGroupLabel((current) => (current === item.label ? null : item.label))
                  }
                  className={`flex w-full items-center justify-between gap-3 rounded-[14px] px-3.5 py-3 text-[13px] font-semibold transition ${
                    isHighlighted
                      ? "bg-[#fff2e8] text-orange-600"
                      : "text-slate-600 hover:bg-[#fff7f1] hover:text-orange-600"
                  }`}
                >
                  <span className="inline-flex items-center gap-3">
                    <span className="inline-flex h-5 w-5 items-center justify-center text-slate-400">
                      <NavIcon label={item.label} className="h-4 w-4" />
                    </span>
                    <span>{item.label}</span>
                  </span>
                  <span className="inline-flex items-center gap-2">
                    {renderBadge(totalPrimaryBadgeCount, "primary")}
                    {renderBadge(totalSecondaryBadgeCount, "danger")}
                    <span className={`text-xs transition ${visibleGroupLabel === item.label ? "rotate-180" : ""}`}>v</span>
                  </span>
                </button>
                {visibleGroupLabel === item.label ? (
                  <div className="ml-4 mt-1 space-y-1 border-l border-[#f0e6dd] pl-3">
                    {item.children.map((child) => {
                      const isActive = normalizeHref(child.href) === activeHref
                      const visiblePrimaryBadgeCount = resolveBadgeCount(Number(child.badgeCount || 0), child.href)
                      const visibleSecondaryBadgeCount = Number(child.secondaryBadgeCount || 0)

                      return (
                        <Link
                          key={child.href}
                          href={child.href}
                          onClick={onNavigate}
                          className={`flex items-center justify-between gap-3 rounded-[12px] px-4 py-2.5 text-[13px] font-medium transition ${
                            isActive
                              ? "bg-[#fff2e8] text-orange-600"
                              : "text-slate-500 hover:bg-[#fff7f1] hover:text-orange-600"
                          }`}
                        >
                          <span className="inline-flex items-center gap-3">
                            <span className="inline-flex h-4 w-4 items-center justify-center text-slate-400">
                              <NavIcon label={child.label} className="h-3.5 w-3.5" />
                            </span>
                            <span>{child.label}</span>
                          </span>
                          <span className="inline-flex items-center gap-1.5">
                            {renderBadge(visiblePrimaryBadgeCount, "primary")}
                            {renderBadge(visibleSecondaryBadgeCount, "danger")}
                          </span>
                        </Link>
                      )
                    })}
                  </div>
                ) : null}
              </div>
            )
          }

          if (item.href) {
            return (
              <Link
                key={item.label}
                href={item.href}
                onClick={onNavigate}
                className={`flex items-center justify-between gap-3 rounded-[14px] px-3.5 py-3 text-[13px] font-semibold transition ${
                  isHighlighted
                    ? "bg-[#fff2e8] text-orange-600"
                    : "text-slate-600 hover:bg-[#fff7f1] hover:text-orange-600"
                }`}
              >
                <span className="inline-flex items-center gap-3">
                  <span className="inline-flex h-5 w-5 items-center justify-center text-slate-400">
                    <NavIcon label={item.label} className="h-4 w-4" />
                  </span>
                  <span>{item.label}</span>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  {renderBadge(resolveBadgeCount(Number(item.badgeCount || 0), item.href), "primary")}
                  {renderBadge(Number(item.secondaryBadgeCount || 0), "danger")}
                </span>
              </Link>
            )
          }

          return (
            <span
              key={item.label}
              className="flex items-center rounded-[14px] px-4 py-3 text-sm font-semibold text-slate-400"
            >
              {item.label}
            </span>
          )
        })}
    </div>
  )
}
