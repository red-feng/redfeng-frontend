"use client"

import Image from "next/image"
import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { dictionaries, type Locale } from "@/lib/i18n"
import SignOutButton from "@/app/components/SignOutButton"

type PublicHeaderProps = {
  locale: Locale
  languageOptions?: Locale[]
}

export default function PublicHeader({ locale, languageOptions }: PublicHeaderProps) {
  const router = useRouter()
  const supabase = createClient()
  const t = dictionaries[locale].header
  const availableLocales = languageOptions && languageOptions.length > 0
    ? languageOptions
    : (["id", "en", "zh"] as Locale[])
  const guestLoginLabel = locale === "zh" ? "登录" : locale === "en" ? "Login" : "Masuk"
  const registerLabel = locale === "zh" ? "注册" : locale === "en" ? "Register" : "Daftar"
  const signOutLabel = locale === "zh" ? "退出登录" : locale === "en" ? "Logout" : "Keluar"
  const [accountHref, setAccountHref] = useState("/login")
  const [accountLabel, setAccountLabel] = useState(guestLoginLabel)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLanguageOpen, setIsLanguageOpen] = useState(false)
  const languageMenuRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const syncSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.user) {
        setAccountHref("/login")
        setAccountLabel(guestLoginLabel)
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
        setAccountHref("/superadmin/dashboard")
        setAccountLabel(t.account)
        setIsAuthenticated(true)
        return
      }

      if (normalizedRole === "admin" || normalizedRole === "operations_manager") {
        setAccountHref("/admin/dashboard")
        setAccountLabel(t.account)
        setIsAuthenticated(true)
        return
      }

      if (normalizedRole === "finance" || normalizedRole === "finance_manager") {
        setAccountHref("/finance/dashboard")
        setAccountLabel(t.account)
        setIsAuthenticated(true)
        return
      }

      if (normalizedRole === "merchant") {
        setAccountHref("/merchant/dashboard")
        setAccountLabel(t.account)
        setIsAuthenticated(true)
        return
      }

      setAccountHref("/customer/dashboard")
      setAccountLabel(t.account)
      setIsAuthenticated(true)
    }

    syncSession()
  }, [guestLoginLabel, supabase, t.account])

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
    await fetch("/api/locale", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locale: nextLocale }),
    })
    router.refresh()
  }

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 py-5 md:px-6">
        <div className="flex flex-wrap items-center justify-between gap-5">
          <a href="https://redfeng.co/" className="flex items-center gap-3">
            <Image
              src="/logo-redfeng.png"
              alt="Red Feng"
              width={295}
              height={101}
              priority
              className="h-16 w-auto md:h-20"
            />
          </a>

          <nav className="hidden flex-wrap items-center gap-8 text-[15px] font-medium text-slate-700 lg:flex">
            <a href="https://redfeng.co/promo/" className="hover:text-orange-600">{t.promo}</a>
            <a href="https://redfeng.co/pesanan/" className="hover:text-orange-600">{t.orders}</a>
            <a href="https://redfeng.co/kemitraan_tour/" className="hover:text-orange-600">{t.partnerTour}</a>
            <Link href="/verifikasi-invoice" className="hover:text-orange-600">{t.verifyInvoice}</Link>
            <a href="https://redfeng.co/bantuan/" className="hover:text-orange-600">{t.help}</a>
            <div ref={languageMenuRef} className="relative">
              <button
                type="button"
                onClick={() => setIsLanguageOpen((current) => !current)}
                className="cursor-pointer hover:text-orange-600"
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

          <div className="flex items-center gap-5">
            <button type="button" className="text-slate-600 hover:text-orange-600" aria-label="Search">
              <svg viewBox="0 0 24 24" className="h-[22px] w-[22px] fill-none stroke-current stroke-2">
                <circle cx="11" cy="11" r="7" />
                <path d="M20 20L16.65 16.65" />
              </svg>
            </button>
            {!isAuthenticated && (
              <Link
                href="/register"
                className="rounded-md border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:border-orange-300 hover:text-orange-600"
              >
                {registerLabel}
              </Link>
            )}
            <Link
              href={accountHref}
              className="rounded-md bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-orange-600"
            >
              {accountLabel}
            </Link>
            {isAuthenticated && (
              <SignOutButton
                label={signOutLabel}
                className="rounded-md border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:border-rose-300 hover:text-rose-600"
              />
            )}
          </div>
        </div>

        <nav className="mt-4 flex flex-wrap items-center gap-5 text-[15px] font-medium text-slate-700">
          <a href="https://redfeng.co/paket-tour/" className="hover:text-orange-600">{t.packageTour}</a>
          <a href="https://redfeng.co/pesawat/" className="hover:text-orange-600">{t.flight}</a>
          <a href="https://redfeng.co/hotel/" className="hover:text-orange-600">{t.hotel}</a>
          <a href="https://redfeng.co/bus-travel/" className="hover:text-orange-600">{t.busTravel}</a>
          <a href="https://redfeng.co/kereta_api/" className="hover:text-orange-600">{t.train}</a>
          <a href="https://redfeng.co/kapal_laut/" className="hover:text-orange-600">{t.seaShip}</a>
          <a href="https://redfeng.co/kapal_pesiar/" className="hover:text-orange-600">{t.cruise}</a>
        </nav>
      </div>
    </header>
  )
}
