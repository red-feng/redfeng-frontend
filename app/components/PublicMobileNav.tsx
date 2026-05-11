"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import CustomerPreferencesSyncBootstrap from "@/app/components/customer-preferences/CustomerPreferencesSyncBootstrap"
import { mobileWebNavLock } from "@/app/components/home/shared/mobileWebNavLock"
import { defaultNotificationItems } from "@/app/components/notifications/defaultNotifications"
import { type NotificationEntry } from "@/app/components/notifications/notificationsStore"
import { type Locale } from "@/lib/i18n"
import { createClient } from "@/lib/supabase/client"
import {
  getPublicAccountHomePath,
  resolvePublicAccountRole,
  type PublicAccountRole,
} from "@/lib/login-role-lock"

type PublicMobileNavProps = {
  locale: Locale
  notificationDefaults?: NotificationEntry[]
}

export default function PublicMobileNav({ locale, notificationDefaults = defaultNotificationItems }: PublicMobileNavProps) {
  const pathname = usePathname()
  const [supabase] = useState(() => createClient("customer"))
  const [accountRole, setAccountRole] = useState<PublicAccountRole>("guest")

  useEffect(() => {
    let isMounted = true

    const syncSession = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!isMounted) return

      if (!user) {
        setAccountRole("guest")
        return
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle()

      if (!isMounted) return

      setAccountRole(resolvePublicAccountRole(profile?.role))
    }

    void syncSession()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void syncSession()
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [supabase])

  const accountHref =
    accountRole === "guest" ? "/login?next=%2Fcustomer%2Fdashboard" : getPublicAccountHomePath(accountRole)

  const copy = {
    id: {
      home: "Beranda",
      promo: "Promo",
      orders: "Pesanan",
      account: "Akun Saya",
    },
    en: {
      home: "Home",
      promo: "Promo",
      orders: "Orders",
      account: "My Account",
    },
    zh: {
      home: "\u9996\u9875",
      promo: "\u4f18\u60e0",
      orders: "\u8ba2\u5355",
      account: "\u8d26\u6237",
    },
  }[locale]

  const items = [
    {
      href: "/",
      label: copy.home,
      accent: "from-[#ef5b2a] to-[#f59e0b]",
      icon: (
        <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current stroke-[1.8]">
          <path d="M3 10.5L12 3l9 7.5" />
          <path d="M5.5 9.5V20h13V9.5" />
        </svg>
      ),
    },
    {
      href: "/promo",
      label: copy.promo,
      accent: "from-[#94a3b8] to-[#64748b]",
      icon: (
        <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current stroke-[1.8]">
          <path d="m12 4 6 6-6 6-6-6 6-6Z" />
          <path d="M12 8.2v3.6M10.2 10h3.6" />
        </svg>
      ),
    },
    {
      href: "/customer/bookings",
      label: copy.orders,
      accent: "from-[#94a3b8] to-[#64748b]",
      icon: (
        <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current stroke-[1.8]">
          <path d="M7 5.5h10a1.5 1.5 0 0 1 1.5 1.5v11A1.5 1.5 0 0 1 17 19.5H7A1.5 1.5 0 0 1 5.5 18V7A1.5 1.5 0 0 1 7 5.5Z" />
          <path d="M9 4v3M15 4v3M8.5 10h7M8.5 14H12" />
        </svg>
      ),
    },
    {
      href: accountHref,
      label: copy.account,
      accent: "from-[#94a3b8] to-[#64748b]",
      icon: (
        <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current stroke-[1.8]">
          <circle cx="12" cy="8" r="3.5" />
          <path d="M5 19c1.8-3 4.2-4.5 7-4.5S17.2 16 19 19" />
        </svg>
      ),
    },
  ]

  return (
    <>
      <CustomerPreferencesSyncBootstrap notificationDefaults={notificationDefaults} />
      <nav className={mobileWebNavLock.navShellClass}>
        <div className={mobileWebNavLock.shellCardClass}>
          <div className={mobileWebNavLock.gridClass}>
            {items.map((item) => {
              const isActive =
                item.href === "/" ? pathname === "/" : pathname === item.href || pathname.startsWith(`${item.href}/`)

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`${mobileWebNavLock.itemClass} ${
                    isActive ? "text-slate-950" : "text-slate-500 hover:bg-slate-50/80 hover:text-slate-800"
                  }`}
                >
                  <span
                    className={`${mobileWebNavLock.iconClass} ${
                      isActive
                        ? item.href === "/"
                          ? "bg-[linear-gradient(180deg,#fff1eb_0%,#fffaf7_100%)] text-[#ef5b2a] shadow-[0_14px_24px_-18px_rgba(239,91,42,0.28)] ring-1 ring-[#ffe3d8]"
                          : `bg-gradient-to-br ${item.accent} text-white shadow-[0_14px_24px_-18px_rgba(100,116,139,0.18)]`
                        : "bg-transparent text-slate-500"
                    }`}
                  >
                    {item.icon}
                  </span>
                  <span className={`public-mobile-nav-label mt-1 ${isActive ? "font-bold text-[#ef5b2a]" : "font-semibold"}`}>{item.label}</span>
                  {isActive ? (
                    <span className="public-mobile-nav-indicator mt-1 h-[3px] w-4 rounded-full bg-[#ef5b2a]" />
                  ) : (
                    <span className="public-mobile-nav-indicator mt-1 h-[3px] w-4 rounded-full bg-transparent" />
                  )}
                </Link>
              )
            })}
          </div>
        </div>
      </nav>
    </>
  )
}
