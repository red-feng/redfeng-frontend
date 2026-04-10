"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { dictionaries, type Locale } from "@/lib/i18n"
import SignOutButton from "@/app/components/SignOutButton"

type AccountRole = "guest" | "customer" | "admin" | "finance" | "superadmin"

export default function PublicHeaderAccountControls({
  locale,
  redirectSuperadminFromHome = false,
}: {
  locale: Locale
  redirectSuperadminFromHome?: boolean
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [supabase] = useState(() => createClient())
  const t = dictionaries[locale].header
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
    let isMounted = true

    const syncSession = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!isMounted) return

      if (!user) {
        setAccountRole("guest")
        setIsAuthenticated(false)
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

    void syncSession()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      void syncSession()
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") {
        router.refresh()
      }
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [pathname, redirectSuperadminFromHome, router, supabase])

  return (
    <div className="flex flex-wrap items-center gap-2.5 sm:gap-4">
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
  )
}
