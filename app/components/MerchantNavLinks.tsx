"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

type MerchantNavItem = {
  href: string
  label: string
  badgeCount: number
}

export default function MerchantNavLinks({
  items,
}: {
  items: MerchantNavItem[]
}) {
  const pathname = usePathname()

  return (
    <div className="flex min-w-max gap-2">
      {items.map((item) => {
        const isActiveSection = pathname.startsWith(item.href)
        const visibleBadgeCount = isActiveSection ? 0 : item.badgeCount

        return (
          <Link
            key={item.href}
            href={item.href}
            className="inline-flex items-center gap-2 rounded-full border border-[#ecd9c2] bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-orange-200 hover:bg-[#fff7ef] hover:text-orange-600"
          >
            {item.label}
            {visibleBadgeCount > 0 && (
              <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-orange-500 px-1.5 py-0.5 text-[11px] font-semibold leading-none text-white">
                {visibleBadgeCount > 99 ? "99+" : visibleBadgeCount}
              </span>
            )}
          </Link>
        )
      })}
    </div>
  )
}
