"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import { type Locale } from "@/lib/i18n"
import { createClient } from "@/lib/supabase/client"
import {
  getPublicAccountHomePath,
  resolvePublicAccountRole,
  type PublicAccountRole,
} from "@/lib/login-role-lock"

type PublicMobileNavProps = {
  locale: Locale
}

export default function PublicMobileNav({ locale }: PublicMobileNavProps) {
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
      packages: "Pesanan",
      verify: "Promo",
      account: "Akun Saya",
    },
    en: {
      home: "Home",
      packages: "Orders",
      verify: "Promo",
      account: "My Account",
    },
    zh: {
      home: "首页",
      packages: "套餐",
      verify: "发票",
      account: "账户",
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
      href: "/customer/bookings",
      label: copy.packages,
      accent: "from-[#94a3b8] to-[#64748b]",
      icon: (
        <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current stroke-[1.8]">
          <path d="M7 5.5h10a1.5 1.5 0 0 1 1.5 1.5v11A1.5 1.5 0 0 1 17 19.5H7A1.5 1.5 0 0 1 5.5 18V7A1.5 1.5 0 0 1 7 5.5Z" />
          <path d="M9 4v3M15 4v3M8.5 10h7M8.5 14H12" />
        </svg>
      ),
    },
    {
      href: "/promo",
      label: copy.verify,
      accent: "from-[#94a3b8] to-[#64748b]",
      icon: (
        <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current stroke-[1.8]">
          <path d="m12 4 6 6-6 6-6-6 6-6Z" />
          <path d="M12 8.2v3.6M10.2 10h3.6" />
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
    <nav className="fixed inset-x-0 bottom-0 z-[80] px-3 pb-[calc(env(safe-area-inset-bottom)+10px)] pt-2 md:hidden">
      <div className="mx-auto max-w-xl rounded-[28px] border border-white/70 bg-white/96 px-2.5 py-2 shadow-[0_-18px_48px_-28px_rgba(15,23,42,0.38)] backdrop-blur">
        <div className="grid grid-cols-4 gap-1.5">
        {items.map((item) => {
          const isActive =
            item.href === "/" ? pathname === "/" : pathname === item.href || pathname.startsWith(`${item.href}/`)

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center rounded-[22px] px-2 py-2 text-[11px] font-semibold transition ${
                isActive ? "text-slate-950" : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
              }`}
            >
              <span
                className={`flex h-10 w-10 items-center justify-center rounded-full transition ${
                  isActive
                    ? item.href === "/"
                      ? "bg-[linear-gradient(180deg,#ffede8_0%,#fff6f3_100%)] text-[#ef5b2a] shadow-[0_16px_30px_-18px_rgba(239,91,42,0.36)]"
                      : `bg-gradient-to-br ${item.accent} text-white shadow-[0_16px_30px_-18px_rgba(100,116,139,0.35)]`
                    : "bg-white text-slate-500"
                }`}
              >
                {item.icon}
              </span>
              <span className={`mt-1.5 ${isActive ? "font-bold text-[#ef5b2a]" : "font-semibold"}`}>{item.label}</span>
              {isActive ? <span className="mt-1 h-1 w-5 rounded-full bg-[#ef5b2a]" /> : <span className="mt-1 h-1 w-5 rounded-full bg-transparent" />}
            </Link>
          )
        })}
        </div>
      </div>
    </nav>
  )
}
