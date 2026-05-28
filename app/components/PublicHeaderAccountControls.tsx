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
  variant = "default",
}: {
  locale: Locale
  redirectSuperadminFromHome?: boolean
  initialRole?: PublicAccountRole
  variant?: "default" | "overlay"
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [supabase] = useState(() => createClient("customer"))
  const t = dictionaries[locale].header
  const guestLoginLabel = locale === "zh" ? "\u767b\u5f55" : locale === "en" ? "Login" : "Masuk"
  const guestLoginRegisterLabel = locale === "zh" ? "\u767b\u5f55 / \u6ce8\u518c" : locale === "en" ? "Login / Register" : "Login / Daftar"
  const registerLabel = locale === "zh" ? "\u6ce8\u518c" : locale === "en" ? "Register" : "Daftar"
  const signOutLabel = locale === "zh" ? "\u9000\u51fa\u767b\u5f55" : locale === "en" ? "Logout" : "Keluar"
  const [accountRole, setAccountRole] = useState<PublicAccountRole>(initialRole)
  const [isAuthenticated, setIsAuthenticated] = useState(initialRole !== "guest")

  const accountHref = accountRole === "guest" ? "/login" : getPublicAccountHomePath(accountRole)
  const accountLabel = isAuthenticated ? t.account : guestLoginLabel
  const isOverlay = variant === "overlay"

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

      const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle()

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
      {!isAuthenticated && isOverlay ? (
        <Link
          href="/login"
          className="whitespace-nowrap rounded-[16px] bg-[#ff5a43] px-5 py-3 text-[14px] font-semibold text-white shadow-[0_16px_30px_-18px_rgba(239,90,67,0.72)] transition hover:bg-[#ef5b2a]"
        >
          {guestLoginRegisterLabel}
        </Link>
      ) : null}
      {!isAuthenticated && !isOverlay ? (
        <Link
          href="/login"
          className="whitespace-nowrap rounded-[16px] bg-[#ff5a43] px-5 py-3 text-[14px] font-semibold text-white shadow-[0_16px_30px_-18px_rgba(239,90,67,0.72)] transition hover:bg-[#ef5b2a]"
        >
          {guestLoginRegisterLabel}
        </Link>
      ) : null}
      {(isOverlay || isAuthenticated) && (
        <Link
          href={accountHref}
          className="rounded-2xl bg-gradient-to-r from-orange-500 to-orange-600 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_14px_26px_-16px_rgba(249,115,22,0.9)] transition hover:bg-orange-600"
        >
          {accountLabel}
        </Link>
      )}
      {isAuthenticated && (
        <SignOutButton
          label={signOutLabel}
          className={isOverlay ? "rounded-2xl border border-white/80 bg-white/80 px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:text-rose-600" : "rounded-2xl border border-slate-200 bg-white/90 px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-rose-300 hover:text-rose-600"}
        />
      )}
    </div>
  )
}
