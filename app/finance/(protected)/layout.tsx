import { redirect } from "next/navigation"
import AdminNavLinks from "@/app/components/AdminNavLinks"
import FinanceNavSeenTracker from "@/app/components/FinanceNavSeenTracker"
import SignOutButton from "@/app/components/SignOutButton"
import { getInternalChatUnreadBadgeCount } from "@/lib/internal-chat-badge"
import { formatFinanceCode } from "@/lib/merchant-code"
import { buildPortalSessionError } from "@/lib/portal-session"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { getRoleLabel, isFinancePortalRole } from "@/lib/internal-roles"
import { FINANCE_ACTIVE_PAYOUT_BADGE_STATUSES, FINANCE_ACTIVE_REFUND_BADGE_STATUSES, isStatusInSet } from "@/lib/nav-badge-policy"

export default async function FinanceProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const adminSupabase = createAdminClient()

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
  const [refundsResult, payoutsResult, internalChatUnreadBadgeCount] = await Promise.all([
    adminSupabase
      .from("refund_requests")
      .select("id, status, created_at, updated_at"),
    adminSupabase
      .from("payout_requests")
      .select("id, status, requested_at, processed_at, updated_at"),
    getInternalChatUnreadBadgeCount(adminSupabase, user.id),
  ])

  const refundRows =
    ((refundsResult.data as Array<{ id: string; status: string | null; created_at: string | null; updated_at: string | null }> | null) || []).filter(
      (refund) => isStatusInSet(refund.status, FINANCE_ACTIVE_REFUND_BADGE_STATUSES),
    )
  const payoutRows =
    ((payoutsResult.data as Array<{ id: string; status: string | null; requested_at: string | null; processed_at: string | null; updated_at: string | null }> | null) || []).filter(
      (payout) => isStatusInSet(payout.status, FINANCE_ACTIVE_PAYOUT_BADGE_STATUSES),
    )

  const refundBadgeCount = refundRows.length
  const payoutBadgeCount = payoutRows.length

  const financeNav = isFinanceManager
      ? [
          { href: "/finance/dashboard", label: "Dashboard" },
          { href: "/finance/internal-chat", label: "Internal Chat", badgeCount: internalChatUnreadBadgeCount },
          { href: "/finance/refunds", label: "Refund Queue", badgeCount: refundBadgeCount },
          { href: "/finance/payouts", label: "Payout Queue", badgeCount: payoutBadgeCount },
          { href: "/finance/settings", label: "Finance Settings" },
          { href: "/finance/team-accounts", label: "Team Accounts" },
        ]
      : [
          { href: "/finance/dashboard", label: "Dashboard" },
          { href: "/finance/internal-chat", label: "Internal Chat", badgeCount: internalChatUnreadBadgeCount },
          { href: "/finance/refunds", label: "Refund Queue", badgeCount: refundBadgeCount },
          { href: "/finance/payouts", label: "Payout Queue", badgeCount: payoutBadgeCount },
        ]

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#fff8f1_0%,#f7f1e8_100%)]">
      <FinanceNavSeenTracker />
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
              <AdminNavLinks items={financeNav} />
            </nav>
          </div>
        </div>
      </header>
      {children}
    </div>
  )
}
