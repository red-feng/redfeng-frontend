"use client"

import { useEffect } from "react"
import { usePathname } from "next/navigation"
import { FINANCE_NAV_ROUTE_SECTION_MAP } from "@/lib/finance-nav-seen"

export default function FinanceNavSeenTracker() {
  const pathname = usePathname()

  useEffect(() => {
    const target = FINANCE_NAV_ROUTE_SECTION_MAP.find((item) => pathname.startsWith(item.prefix))
    if (!target) return

    void fetch("/api/finance/nav-seen", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ section: target.section }),
    }).catch(() => null)
  }, [pathname])

  return null
}
