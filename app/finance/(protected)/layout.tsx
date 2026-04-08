import Link from "next/link"
import { redirect } from "next/navigation"
import SignOutButton from "@/app/components/SignOutButton"
import RoleAutoRefresh from "@/app/components/RoleAutoRefresh"
import { formatFinanceCode } from "@/lib/merchant-code"
import { buildPortalSessionError } from "@/lib/portal-session"
import { createClient } from "@/lib/supabase/server"
import { getRoleLabel, isFinancePortalRole } from "@/lib/internal-roles"

export default async function FinanceProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/finance/login?error=session-ended")
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (!profile) {
    redirect("/finance/login?error=no-profile")
  }

  if (!isFinancePortalRole(profile.role)) {
    redirect(`/finance/login?error=${encodeURIComponent(buildPortalSessionError("session-changed", profile.role))}`)
  }

  const isFinanceManager = profile.role === "finance_manager"
  const financeCode = formatFinanceCode(user.id)
  const roleLabel = getRoleLabel(profile.role)
  const financeNav = isFinanceManager
      ? [
          { href: "/finance/dashboard", label: "Dashboard" },
          { href: "/finance/refunds", label: "Refund Queue" },
          { href: "/finance/payouts", label: "Payout Queue" },
          { href: "/finance/settings", label: "Finance Settings" },
          { href: "/finance/team-accounts", label: "Team Accounts" },
        ]
      : [
          { href: "/finance/dashboard", label: "Dashboard" },
          { href: "/finance/refunds", label: "Refund Queue" },
          { href: "/finance/payouts", label: "Payout Queue" },
        ]

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#fff8f1_0%,#f7f1e8_100%)]">
      <RoleAutoRefresh
        onlyOnPaths={[
          "/finance/dashboard",
          "/finance/payouts",
          "/finance/refunds",
        ]}
      />
      <header className="sticky top-0 z-40 border-b border-[#ecd9c2] bg-white/90 backdrop-blur-xl">
        <div className="mx-auto w-full max-w-7xl px-4 py-4 sm:px-8 lg:px-10">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="inline-flex rounded-full border border-[#ecd9c2] bg-[#fffaf3] px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.28em] text-orange-500 sm:px-4">
                  Finance Workspace
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-950">
                  {isFinanceManager ? "Finance manager workspace Red Feng" : "Dashboard finance internal Red Feng"}
                </p>
                <p className="text-xs text-slate-500">
                  {isFinanceManager
                    ? "Area monitoring payout aging, outstanding, dan ritme kerja tim finance"
                    : "Area payout, fee, dan pengaturan dana internal"}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="inline-flex rounded-full border border-[#ecd9c2] bg-[#fffaf3] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-orange-600">
                    {financeCode}
                  </span>
                  <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-700">
                    {roleLabel}
                  </span>
                </div>
              </div>
              <div className="flex w-full items-center gap-2 md:w-auto">
                <SignOutButton
                  redirectTo="https://app.redfeng.co/finance/login"
                  className="w-full rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:border-rose-300 hover:bg-rose-100 md:w-auto"
                />
              </div>
            </div>
            <nav className="overflow-x-auto pb-1">
              <div className="flex min-w-max gap-2">
                {financeNav.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="rounded-full border border-[#ecd9c2] bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-orange-200 hover:bg-[#fff7ef] hover:text-orange-600"
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </nav>
          </div>
        </div>
      </header>
      {children}
    </div>
  )
}
