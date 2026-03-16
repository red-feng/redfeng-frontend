"use client"

import { useEffect } from "react"
import { usePathname } from "next/navigation"

const MENU_COOKIE_KEYS: Array<{ prefix: string; cookie: string }> = [
  { prefix: "/merchant/paket", cookie: "merchant_nav_seen_packages" },
  { prefix: "/merchant/pesanan", cookie: "merchant_nav_seen_orders" },
  { prefix: "/merchant/chat", cookie: "merchant_nav_seen_chat" },
  { prefix: "/merchant/kalender-booking", cookie: "merchant_nav_seen_calendar" },
  { prefix: "/merchant/saldo-payout", cookie: "merchant_nav_seen_payout" },
  { prefix: "/merchant/review", cookie: "merchant_nav_seen_review" },
]

export default function MerchantNavSeenTracker() {
  const pathname = usePathname()

  useEffect(() => {
    const target = MENU_COOKIE_KEYS.find((item) => pathname.startsWith(item.prefix))
    if (!target) return

    const nowIso = new Date().toISOString()
    document.cookie = `${target.cookie}=${encodeURIComponent(nowIso)}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`
  }, [pathname])

  return null
}
