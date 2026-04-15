"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { dictionaries, type Locale } from "@/lib/i18n"
import { shouldRefreshPublicAuthShell } from "@/lib/chat/auth-flow-policy.mjs"
import SignOutButton from "@/app/components/SignOutButton"
import {
  getPublicAccountHomePath,
  resolvePublicAccountRole,
  type PublicAccountRole,
} from "@/lib/login-role-lock"

export default function PublicHeaderAccountControls({
  locale,
  redirectSuperadminFromHome = false,
  initialRole = "guest",
}: {
  locale: Locale
  redirectSuperadminFromHome?: boolean
  initialRole?: PublicAccountRole
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [supabase] = useState(() => createClient())
  const t = dictionaries[locale].header
  const guestLoginLabel = locale === "zh" ? "登录" : locale === "en" ? "Login" : "Masuk"
  const registerLabel = locale === "zh" ? "注册" : locale === "en" ? "Register" : "Daftar"
  const signOutLabel = locale === "zh" ? "退出登录" : locale === "en" ? "Logout" : "Keluar"
  const [accountRole, setAccountRole] = useState<PublicAccountRole>(initialRole)
  const [isAuthenticated, setIsAuthenticated] = useState(initialRole !== "guest")

  const accountHref = accountRole === "guest" ? "/login" : getPublicAccountHomePath(accountRole)
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

      const resolvedRole = resolvePublicAccountRole(profile?.role)
      setAccountRole(resolvedRole)
      setIsAuthenticated(true)
      if (resolvedRole === "superadmin" && redirectSuperadminFromHome && pathname === "/") {
        router.replace(getPublicAccountHomePath("superadmin"))
      }
    }

    void syncSession()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      void syncSession()
      if (shouldRefreshPublicAuthShell(event)) {
        router.refresh()
      }
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [initialRole, pathname, redirectSuperadminFromHome, router, supabase])

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
