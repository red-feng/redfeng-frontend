"use client"

import { useEffect } from "react"
import { usePathname } from "next/navigation"
import { SUPERADMIN_NAV_ROUTE_SECTION_MAP } from "@/lib/superadmin-nav-seen"

export default function SuperadminAdminRouteSeenBridge({ enabled }: { enabled: boolean }) {
  const pathname = usePathname()

  useEffect(() => {
    if (!enabled) return

    const matched = SUPERADMIN_NAV_ROUTE_SECTION_MAP.find((entry) => pathname.startsWith(entry.prefix))
    if (!matched) return
    if (!["bookings", "audit_log"].includes(matched.section)) return

    void fetch("/api/superadmin/nav-seen", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ section: matched.section }),
      keepalive: true,
    })
  }, [enabled, pathname])

  return null
}
