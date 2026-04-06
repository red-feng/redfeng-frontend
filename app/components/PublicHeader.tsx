"use client"

import Image from "next/image"
import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { dictionaries, type Locale } from "@/lib/i18n"
import SignOutButton from "@/app/components/SignOutButton"

type AccountRole = "guest" | "customer" | "admin" | "finance" | "superadmin"

type PublicHeaderProps = {
  locale: Locale
  languageOptions?: Locale[]
  redirectSuperadminFromHome?: boolean
}

export default function PublicHeader({ locale, languageOptions, redirectSuperadminFromHome = false }: PublicHeaderProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [supabase] = useState(() => createClient())
  const t = dictionaries[locale].header
  const availableLocales = languageOptions && languageOptions.length > 0
    ? languageOptions
    : (["id", "en", "zh"] as Locale[])
  const guestLoginLabel = locale === "zh" ? "登录" : locale === "en" ? "Login" : "Masuk"
  const registerLabel = locale === "zh" ? "注册" : locale === "en" ? "Register" : "Daftar"
  const signOutLabel = locale === "zh" ? "退出登录" : locale === "en" ? "Logout" : "Keluar"
  const [accountRole, setAccountRole] = useState<AccountRole>("guest")
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLanguageOpen, setIsLanguageOpen] = useState(false)
  const languageMenuRef = useRef<HTMLDivElement | null>(null)
  const accountHref =
    accountRole === "superadmin"
      ? "/superadmin/dashboard"
      : accountRole === "admin"
        ? "/admin/dashboard"
        : accountRole === "finance"
          ? "/finance/dashboard"
          : accountRole === "customer"
            ? "/customer/dashboard"
            : "/login"
  const accountLabel = isAuthenticated ? t.account : guestLoginLabel

  useEffect(() => {
    const syncSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.user) {
        setAccountRole("guest")
        setIsAuthenticated(false)
        return
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", session.user.id)
        .maybeSingle()

      const normalizedRole = String(profile?.role || "").trim().toLowerCase()

      if (normalizedRole === "superadmin") {
        setAccountRole("superadmin")
        setIsAuthenticated(true)
        if (redirectSuperadminFromHome && pathname === "/") {
          router.replace("/superadmin/dashboard")
        }
        return
      }

      if (normalizedRole === "admin" || normalizedRole === "operations_manager") {
        setAccountRole("admin")
        setIsAuthenticated(true)
        return
      }

      if (normalizedRole === "finance" || normalizedRole === "finance_manager") {
        setAccountRole("finance")
        setIsAuthenticated(true)
        return
      }

      setAccountRole("customer")
      setIsAuthenticated(true)
    }

    syncSession()
  }, [pathname, redirectSuperadminFromHome, router, supabase])

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!languageMenuRef.current?.contains(event.target as Node)) {
        setIsLanguageOpen(false)
      }
    }

    document.addEventListener("mousedown", handlePointerDown)
    return () => document.removeEventListener("mousedown", handlePointerDown)
  }, [])

  const changeLocale = async (nextLocale: Locale) => {
    setIsLanguageOpen(false)
    const response = await fetch("/api/locale", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locale: nextLocale }),
    })

    if (!response.ok) return
    window.location.reload()
  }

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 py-4 md:px-6 md:py-5">
        <div className="flex flex-col gap-4 lg:gap-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <a href="https://redfeng.co/" className="flex items-center gap-3">
            <Image
              src="/logo-redfeng.png"
              alt="Red Feng"
              width={295}
              height={101}
              priority
              className="h-12 w-auto sm:h-14 md:h-16 lg:h-20"
            />
          </a>

          <div className="flex flex-wrap items-center gap-3 sm:gap-4">
            <button type="button" className="rounded-full border border-slate-200 p-2.5 text-slate-600 transition hover:border-orange-200 hover:text-orange-600" aria-label="Search">
              <svg viewBox="0 0 24 24" className="h-[22px] w-[22px] fill-none stroke-current stroke-2">
                <circle cx="11" cy="11" r="7" />
                <path d="M20 20L16.65 16.65" />
              </svg>
            </button>
            {!isAuthenticated && (
              <Link
                href="/register"
                className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-orange-300 hover:text-orange-600"
              >
                {registerLabel}
              </Link>
            )}
            <Link
              href={accountHref}
              className="rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-600"
            >
              {accountLabel}
            </Link>
            {isAuthenticated && (
              <SignOutButton
                label={signOutLabel}
                className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-rose-300 hover:text-rose-600"
              />
            )}
          </div>
        </div>

          <div className="overflow-x-auto pb-1">
            <nav className="flex min-w-max items-center gap-4 text-sm font-medium text-slate-700 sm:gap-5 sm:text-[15px]">
              <a href="https://redfeng.co/promo/" className="whitespace-nowrap rounded-full px-1 py-1 transition hover:text-orange-600">{t.promo}</a>
              <a href="https://redfeng.co/pesanan/" className="whitespace-nowrap rounded-full px-1 py-1 transition hover:text-orange-600">{t.orders}</a>
              <a href="https://redfeng.co/kemitraan_tour/" className="whitespace-nowrap rounded-full px-1 py-1 transition hover:text-orange-600">{t.partnerTour}</a>
              <Link href="/verifikasi-invoice" className="whitespace-nowrap rounded-full px-1 py-1 transition hover:text-orange-600">{t.verifyInvoice}</Link>
              <a href="https://redfeng.co/bantuan/" className="whitespace-nowrap rounded-full px-1 py-1 transition hover:text-orange-600">{t.help}</a>
              <div ref={languageMenuRef} className="relative shrink-0">
                <button
                  type="button"
                  onClick={() => setIsLanguageOpen((current) => !current)}
                  className="whitespace-nowrap rounded-full px-1 py-1 transition hover:text-orange-600"
                >
                  {t.language}
                </button>
                {isLanguageOpen && (
                  <div className="absolute right-0 z-20 mt-2 w-40 rounded-lg border border-slate-200 bg-white p-1 shadow-lg">
                    {availableLocales.includes("id") && (
                      <button type="button" onClick={() => changeLocale("id")} className="block w-full rounded-md px-3 py-2 text-left text-sm hover:bg-slate-100">{t.langId}</button>
                    )}
                    {availableLocales.includes("en") && (
                      <button type="button" onClick={() => changeLocale("en")} className="block w-full rounded-md px-3 py-2 text-left text-sm hover:bg-slate-100">{t.langEn}</button>
                    )}
                    {availableLocales.includes("zh") && (
                      <button type="button" onClick={() => changeLocale("zh")} className="block w-full rounded-md px-3 py-2 text-left text-sm hover:bg-slate-100">{t.langZh}</button>
                    )}
                  </div>
                )}
              </div>
            </nav>
          </div>

          <div className="overflow-x-auto pb-1">
            <nav className="flex min-w-max items-center gap-4 text-sm font-medium text-slate-700 sm:gap-5 sm:text-[15px]">
              <a href="https://redfeng.co/paket-tour/" className="whitespace-nowrap rounded-full px-1 py-1 transition hover:text-orange-600">{t.packageTour}</a>
              <a href="https://redfeng.co/pesawat/" className="whitespace-nowrap rounded-full px-1 py-1 transition hover:text-orange-600">{t.flight}</a>
              <a href="https://redfeng.co/hotel/" className="whitespace-nowrap rounded-full px-1 py-1 transition hover:text-orange-600">{t.hotel}</a>
              <a href="https://redfeng.co/bus-travel/" className="whitespace-nowrap rounded-full px-1 py-1 transition hover:text-orange-600">{t.busTravel}</a>
              <a href="https://redfeng.co/kereta_api/" className="whitespace-nowrap rounded-full px-1 py-1 transition hover:text-orange-600">{t.train}</a>
              <a href="https://redfeng.co/kapal_laut/" className="whitespace-nowrap rounded-full px-1 py-1 transition hover:text-orange-600">{t.seaShip}</a>
              <a href="https://redfeng.co/kapal_pesiar/" className="whitespace-nowrap rounded-full px-1 py-1 transition hover:text-orange-600">{t.cruise}</a>
            </nav>
          </div>
        </div>
      </div>
    </header>
  )
}
