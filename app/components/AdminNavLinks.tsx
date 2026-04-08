"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"

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
  const pathname = usePathname()
  const normalizeHref = (href: string) => href.split("?")[0]
  const activeGroupLabel =
    items.find((item) => item.children?.some((child) => pathname.startsWith(normalizeHref(child.href))))?.label || null
  const [openGroupLabel, setOpenGroupLabel] = useState<string | null>(activeGroupLabel)
  const visibleGroupLabel = openGroupLabel || activeGroupLabel
  const visibleChildren = items.find((item) => item.label === visibleGroupLabel)?.children || []

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
            const totalPrimaryBadgeCount = item.children.reduce((total, child) => total + Number(child.badgeCount || 0), 0)
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
                {renderBadge(Number(item.badgeCount || 0), "primary")}
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
            const visiblePrimaryBadgeCount = Number(child.badgeCount || 0)
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
