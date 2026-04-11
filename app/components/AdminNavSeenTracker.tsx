"use client"

import { useEffect } from "react"
import { usePathname } from "next/navigation"
import { ADMIN_NAV_ROUTE_SECTION_MAP } from "@/lib/admin-nav-seen"

export default function AdminNavSeenTracker() {
  const pathname = usePathname()

  useEffect(() => {
    const target = ADMIN_NAV_ROUTE_SECTION_MAP.find((item) => pathname.startsWith(item.prefix))
    if (!target) return

    void fetch("/api/admin/nav-seen", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ section: target.section }),
    }).catch(() => null)
  }, [pathname])

  return null
}
