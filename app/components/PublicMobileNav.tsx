"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { type Locale } from "@/lib/i18n"

type PublicMobileNavProps = {
  locale: Locale
}

export default function PublicMobileNav({ locale }: PublicMobileNavProps) {
  const pathname = usePathname()
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
      icon: (
        <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current stroke-[1.8]">
          <path d="M7 4h8l4 4v11a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z" />
          <path d="M15 4v4h4M9 13h6M9 17h4" />
        </svg>
      ),
    },
    {
      href: "/customer/dashboard",
      label: copy.account,
      icon: (
        <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current stroke-[1.8]">
          <circle cx="12" cy="8" r="3.5" />
          <path d="M5 19c1.8-3 4.2-4.5 7-4.5S17.2 16 19 19" />
        </svg>
      ),
    },
  ]

  return (
    <nav className="fixed inset-x-0 bottom-0 z-[80] border-t border-slate-200/80 bg-white/95 px-3 pb-[calc(env(safe-area-inset-bottom)+10px)] pt-2 shadow-[0_-18px_45px_-30px_rgba(15,23,42,0.35)] backdrop-blur md:hidden">
      <div className="mx-auto grid max-w-xl grid-cols-4 gap-2">
        {items.map((item) => {
          const isActive =
            item.href === "/" ? pathname === "/" : pathname === item.href || pathname.startsWith(`${item.href}/`)

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center rounded-2xl px-2 py-2.5 text-[11px] font-semibold transition ${
                isActive
                  ? "bg-orange-50 text-orange-600 shadow-[0_12px_28px_-18px_rgba(249,115,22,0.75)]"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
              }`}
            >
              {item.icon}
              <span className="mt-1">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
