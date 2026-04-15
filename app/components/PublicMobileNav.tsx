"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import { type Locale } from "@/lib/i18n"
import { createClient } from "@/lib/supabase/client"

type AccountRole = "guest" | "customer" | "admin" | "finance" | "superadmin"

type PublicMobileNavProps = {
  locale: Locale
}

export default function PublicMobileNav({ locale }: PublicMobileNavProps) {
  const pathname = usePathname()
  const [supabase] = useState(() => createClient())
  const [accountRole, setAccountRole] = useState<AccountRole>("guest")

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

      const normalizedRole = String(profile?.role || "").trim().toLowerCase()

      if (normalizedRole === "superadmin") {
        setAccountRole("superadmin")
        return
      }
      if (normalizedRole === "admin" || normalizedRole === "operations_manager") {
        setAccountRole("admin")
        return
      }
      if (normalizedRole === "finance" || normalizedRole === "finance_manager") {
        setAccountRole("finance")
        return
      }

      setAccountRole("customer")
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
    accountRole === "superadmin"
      ? "/superadmin/dashboard"
      : accountRole === "admin"
        ? "/admin/dashboard"
        : accountRole === "finance"
          ? "/finance/dashboard"
          : accountRole === "customer"
            ? "/customer/dashboard"
            : "/login?next=%2Fcustomer%2Fdashboard"

  const copy = {
    id: {
      home: "Beranda",
      packages: "Paket",
      verify: "Invoice",
      account: "Akun",
    },
    en: {
      home: "Home",
      packages: "Packages",
      verify: "Invoice",
      account: "Account",
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
      href: "/packages",
      label: copy.packages,
      accent: "from-[#fb7185] to-[#ef5b2a]",
      icon: (
        <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current stroke-[1.8]">
          <rect x="4" y="5" width="16" height="14" rx="3" />
          <path d="M8 9h8M8 13h5" />
        </svg>
      ),
    },
    {
      href: "/verifikasi-invoice",
      label: copy.verify,
      accent: "from-[#38bdf8] to-[#06b6d4]",
      icon: (
        <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current stroke-[1.8]">
          <path d="M7 4h8l4 4v11a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z" />
          <path d="M15 4v4h4M9 13h6M9 17h4" />
        </svg>
      ),
    },
    {
      href: accountHref,
      label: copy.account,
      accent: "from-[#22c55e] to-[#84cc16]",
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
                    ? `bg-gradient-to-br ${item.accent} text-white shadow-[0_16px_30px_-18px_rgba(239,91,42,0.9)]`
                    : "bg-slate-100 text-slate-500"
                }`}
              >
                {item.icon}
              </span>
              <span className={`mt-1.5 ${isActive ? "font-bold" : "font-semibold"}`}>{item.label}</span>
              {isActive ? <span className="mt-1 h-1 w-5 rounded-full bg-[#ef5b2a]" /> : <span className="mt-1 h-1 w-5 rounded-full bg-transparent" />}
            </Link>
          )
        })}
        </div>
      </div>
    </nav>
  )
}
