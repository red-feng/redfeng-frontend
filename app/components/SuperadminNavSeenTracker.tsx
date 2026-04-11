"use client"

import { useEffect } from "react"
import { usePathname } from "next/navigation"
import { SUPERADMIN_NAV_ROUTE_SECTION_MAP } from "@/lib/superadmin-nav-seen"

export default function SuperadminNavSeenTracker() {
  const pathname = usePathname()

  useEffect(() => {
    const matched = SUPERADMIN_NAV_ROUTE_SECTION_MAP.find((entry) => pathname.startsWith(entry.prefix))
    if (!matched) return

    void fetch("/api/superadmin/nav-seen", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ section: matched.section }),
      keepalive: true,
    })
  }, [pathname])

  return null
}
