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
  const signOutLabel = locale === "zh" ? "\u9000\u51fa\u767b\u5f55" : locale === "en" ? "Logout" : "Keluar"
  const [accountRole, setAccountRole] = useState<PublicAccountRole>(initialRole)
  const [isAuthenticated, setIsAuthenticated] = useState(initialRole !== "guest")

  const accountHref = accountRole === "guest" ? "/login" : getPublicAccountHomePath(accountRole)
  const accountLabel = isAuthenticated ? t.account : guestLoginLabel
  const isOverlay = variant === "overlay"
  const controlsClassName = !isAuthenticated && !isOverlay ? "flex flex-wrap items-center gap-0" : "flex flex-wrap items-center gap-2.5 sm:gap-3"

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
    <div className={controlsClassName}>
      {!isAuthenticated && isOverlay ? (
        <>
          <Link
            href="/login"
            className="whitespace-nowrap rounded-full border border-white/70 bg-white/82 px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-[0_12px_24px_-18px_rgba(15,23,42,0.28)] backdrop-blur transition hover:border-[#ffd3c4] hover:text-[#ef5b2a]"
          >
            {guestLoginLabel}
          </Link>
          <Link
            href="/login"
            className="whitespace-nowrap rounded-full bg-[linear-gradient(135deg,#ff6a3d_0%,#ef4423_100%)] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_16px_30px_-18px_rgba(239,90,67,0.72)] transition hover:brightness-105"
          >
            {guestLoginRegisterLabel}
          </Link>
        </>
      ) : null}
      {!isAuthenticated && !isOverlay ? (
        <Link
          href="/login"
          className="whitespace-nowrap rounded-[16px] bg-[#ff5a43] px-5 py-3 text-[14px] font-semibold text-white shadow-[0_16px_30px_-18px_rgba(239,90,67,0.72)] transition hover:bg-[#ef5b2a]"
        >
          {guestLoginRegisterLabel}
        </Link>
      ) : null}
      {isAuthenticated && (
        <Link
          href={accountHref}
          className={`px-4 py-2.5 text-sm font-semibold transition ${
            isOverlay
              ? "rounded-full bg-[linear-gradient(135deg,#ff6a3d_0%,#ef4423_100%)] text-white shadow-[0_16px_28px_-18px_rgba(239,68,35,0.68)] hover:brightness-105"
              : "rounded-2xl bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-[0_14px_26px_-16px_rgba(249,115,22,0.9)] hover:bg-orange-600"
          }`}
        >
          {accountLabel}
        </Link>
      )}
      {isAuthenticated && (
        <SignOutButton
          label={signOutLabel}
          className={isOverlay ? "rounded-full border border-white/80 bg-white/84 px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm backdrop-blur transition hover:text-rose-600" : "rounded-2xl border border-slate-200 bg-white/90 px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-rose-300 hover:text-rose-600"}
        />
      )}
    </div>
  )
}
