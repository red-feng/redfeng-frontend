"use client"

import Image from "next/image"
import Link from "next/link"
import { useEffect, useState } from "react"
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

  const changeLocale = async (nextLocale: Locale) => {
    const response = await fetch("/api/locale", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locale: nextLocale }),
    })

    if (!response.ok) return
    window.location.reload()
  }

  return (
    <header className="border-b border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#fffaf4_100%)]">
      <div className="mx-auto max-w-7xl px-4 py-3 md:px-6 md:py-5">
        <div className="flex flex-col gap-4 lg:gap-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <a href="https://redfeng.co/" className="flex items-center gap-3">
            <Image
              src="/logo-redfeng.png"
              alt="Red Feng"
              width={295}
              height={101}
              priority
              className="h-9 w-auto sm:h-14 md:h-16 lg:h-20"
            />
          </a>

          <div className="flex flex-wrap items-center gap-2.5 sm:gap-4">
            <button type="button" className="rounded-full border border-orange-100 bg-white/90 p-2.5 text-slate-600 shadow-sm transition hover:border-orange-200 hover:text-orange-600" aria-label="Search">
              <svg viewBox="0 0 24 24" className="h-[22px] w-[22px] fill-none stroke-current stroke-2">
                <circle cx="11" cy="11" r="7" />
                <path d="M20 20L16.65 16.65" />
              </svg>
            </button>
            {!isAuthenticated && (
              <Link
                href="/register"
                className="rounded-2xl border border-slate-200 bg-white/90 px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-orange-300 hover:text-orange-600"
              >
                {registerLabel}
              </Link>
            )}
            <Link
              href={accountHref}
              className="rounded-2xl bg-gradient-to-r from-orange-500 to-orange-600 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_14px_26px_-16px_rgba(249,115,22,0.9)] transition hover:bg-orange-600"
            >
              {accountLabel}
            </Link>
            {isAuthenticated && (
              <SignOutButton
                label={signOutLabel}
                className="rounded-2xl border border-slate-200 bg-white/90 px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-rose-300 hover:text-rose-600"
              />
            )}
          </div>
        </div>

          <div className="overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <nav className="flex min-w-max items-center gap-2 text-sm font-medium text-slate-700 sm:gap-5 sm:text-[15px]">
              <a href="https://redfeng.co/promo/" className="whitespace-nowrap rounded-full border border-orange-100 bg-white/85 px-3 py-2 shadow-sm transition hover:text-orange-600 sm:border-transparent sm:bg-transparent sm:px-1 sm:py-1 sm:shadow-none">{t.promo}</a>
              <a href="https://redfeng.co/pesanan/" className="whitespace-nowrap rounded-full border border-orange-100 bg-white/85 px-3 py-2 shadow-sm transition hover:text-orange-600 sm:border-transparent sm:bg-transparent sm:px-1 sm:py-1 sm:shadow-none">{t.orders}</a>
              <a href="https://redfeng.co/kemitraan_tour/" className="whitespace-nowrap rounded-full border border-orange-100 bg-white/85 px-3 py-2 shadow-sm transition hover:text-orange-600 sm:border-transparent sm:bg-transparent sm:px-1 sm:py-1 sm:shadow-none">{t.partnerTour}</a>
              <Link href="/verifikasi-invoice" className="whitespace-nowrap rounded-full border border-orange-100 bg-white/85 px-3 py-2 shadow-sm transition hover:text-orange-600 sm:border-transparent sm:bg-transparent sm:px-1 sm:py-1 sm:shadow-none">{t.verifyInvoice}</Link>
              <a href="https://redfeng.co/bantuan/" className="whitespace-nowrap rounded-full border border-orange-100 bg-white/85 px-3 py-2 shadow-sm transition hover:text-orange-600 sm:border-transparent sm:bg-transparent sm:px-1 sm:py-1 sm:shadow-none">{t.help}</a>
              <label className="relative block shrink-0">
                <span className="sr-only">{t.language}</span>
                <select
                  value={locale}
                  onChange={(event) => {
                    const nextLocale = event.target.value as Locale
                    if (nextLocale !== locale) {
                      void changeLocale(nextLocale)
                    }
                  }}
                  className="min-h-[40px] appearance-none rounded-full border border-orange-100 bg-white/90 py-2 pl-3 pr-8 text-sm font-medium text-slate-700 shadow-sm outline-none transition hover:text-orange-600 focus:border-orange-200 focus:text-orange-600 sm:border-transparent sm:bg-transparent sm:py-1 sm:pl-1 sm:shadow-none"
                >
                  {availableLocales.includes("id") && <option value="id">{t.langId}</option>}
                  {availableLocales.includes("en") && <option value="en">{t.langEn}</option>}
                  {availableLocales.includes("zh") && <option value="zh">{t.langZh}</option>}
                </select>
                <span className="pointer-events-none absolute inset-y-0 right-1 flex items-center text-slate-400">
                  <svg viewBox="0 0 20 20" className="h-4 w-4 fill-current">
                    <path d="M5.47 7.97a.75.75 0 0 1 1.06 0L10 11.44l3.47-3.47a.75.75 0 1 1 1.06 1.06l-4 4a.75.75 0 0 1-1.06 0l-4-4a.75.75 0 0 1 0-1.06Z" />
                  </svg>
                </span>
              </label>
            </nav>
          </div>

          <div className="overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <nav className="flex min-w-max items-center gap-2 text-sm font-medium text-slate-700 sm:gap-5 sm:text-[15px]">
              <a href="https://redfeng.co/paket-tour/" className="whitespace-nowrap rounded-full border border-orange-100 bg-[#fff6ec] px-3 py-2 text-orange-700 shadow-sm transition hover:text-orange-600 sm:border-transparent sm:bg-transparent sm:px-1 sm:py-1 sm:text-inherit sm:shadow-none">{t.packageTour}</a>
              <a href="https://redfeng.co/pesawat/" className="whitespace-nowrap rounded-full border border-orange-100 bg-white/85 px-3 py-2 shadow-sm transition hover:text-orange-600 sm:border-transparent sm:bg-transparent sm:px-1 sm:py-1 sm:shadow-none">{t.flight}</a>
              <a href="https://redfeng.co/hotel/" className="whitespace-nowrap rounded-full border border-orange-100 bg-white/85 px-3 py-2 shadow-sm transition hover:text-orange-600 sm:border-transparent sm:bg-transparent sm:px-1 sm:py-1 sm:shadow-none">{t.hotel}</a>
              <a href="https://redfeng.co/bus-travel/" className="whitespace-nowrap rounded-full border border-orange-100 bg-white/85 px-3 py-2 shadow-sm transition hover:text-orange-600 sm:border-transparent sm:bg-transparent sm:px-1 sm:py-1 sm:shadow-none">{t.busTravel}</a>
              <a href="https://redfeng.co/kereta_api/" className="whitespace-nowrap rounded-full border border-orange-100 bg-white/85 px-3 py-2 shadow-sm transition hover:text-orange-600 sm:border-transparent sm:bg-transparent sm:px-1 sm:py-1 sm:shadow-none">{t.train}</a>
              <a href="https://redfeng.co/kapal_laut/" className="whitespace-nowrap rounded-full border border-orange-100 bg-white/85 px-3 py-2 shadow-sm transition hover:text-orange-600 sm:border-transparent sm:bg-transparent sm:px-1 sm:py-1 sm:shadow-none">{t.seaShip}</a>
              <a href="https://redfeng.co/kapal_pesiar/" className="whitespace-nowrap rounded-full border border-orange-100 bg-white/85 px-3 py-2 shadow-sm transition hover:text-orange-600 sm:border-transparent sm:bg-transparent sm:px-1 sm:py-1 sm:shadow-none">{t.cruise}</a>
            </nav>
          </div>
        </div>
      </div>
    </header>
  )
}
