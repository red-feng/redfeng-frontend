"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

type Item = {
  href: string
  label: string
  badgeCount?: number
}

export default function CustomerHeaderNav({ items }: { items: Item[] }) {
  const pathname = usePathname()
  const getPathOnly = (href: string) => href.split("?")[0] || href

  return (
    <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600 sm:gap-3">
      {items.map((item) => {
        const itemPath = getPathOnly(item.href)
        const isActive = pathname === itemPath || pathname.startsWith(`${itemPath}/`)

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition ${
              isActive
                ? "border-orange-200 bg-[#fff3e7] text-orange-700 shadow-[0_14px_28px_-20px_rgba(239,91,42,0.8)]"
                : "border-[#ecd9c2] bg-white text-slate-700 hover:border-orange-200 hover:bg-[#fff7ef] hover:text-orange-600"
            }`}
          >
            <span>{item.label}</span>
            {item.badgeCount && item.badgeCount > 0 ? (
              <span
                className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                  isActive ? "bg-orange-600 text-white" : "bg-rose-500 text-white"
                }`}
              >
                {item.badgeCount}
              </span>
            ) : null}
          </Link>
        )
      })}
    </div>
  )
}
