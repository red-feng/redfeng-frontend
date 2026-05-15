import { redirect } from "next/navigation"
import AdminSidebarShell from "@/app/components/AdminSidebarShell"
import FinanceNavSeenTracker from "@/app/components/FinanceNavSeenTracker"
import { getInternalChatUnreadBadgeCount } from "@/lib/internal-chat/badge"
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
  const supabase = await createClient("finance")
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
  const [refundsResult, payoutsResult, internalChatUnreadBadgeCount, { count: transactionPromoReadyCount }, { count: transactionPromoActiveCount }] = await Promise.all([
    adminSupabase
      .from("refund_requests")
      .select("id, status, created_at, updated_at"),
    adminSupabase
      .from("payout_requests")
      .select("id, status, requested_at, processed_at, updated_at"),
    getInternalChatUnreadBadgeCount(adminSupabase, user.id),
    adminSupabase.from("transaction_promo_rules").select("id", { count: "exact", head: true }).eq("status", "approved"),
    adminSupabase.from("transaction_promo_rules").select("id", { count: "exact", head: true }).eq("status", "active"),
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
        { label: "FINANCE" },
        { href: "/finance/dashboard", label: "Dashboard", badgeCount: 0 },
        { href: "/finance/refunds", label: "Refund Queue", badgeCount: refundBadgeCount },
        { href: "/finance/payouts", label: "Payout Queue", badgeCount: payoutBadgeCount },
        {
          href: "/finance/transaction-promos",
          label: "Transaction Promos",
          badgeCount: transactionPromoReadyCount || 0,
          secondaryBadgeCount: transactionPromoActiveCount || 0,
        },
        { href: "/finance/internal-chat", label: "Internal Chat", badgeCount: internalChatUnreadBadgeCount },
        { label: "SISTEM" },
        { href: "/finance/settings", label: "Finance Settings" },
        { href: "/finance/team-accounts", label: "Team Accounts" },
      ]
    : [
        { label: "FINANCE" },
        { href: "/finance/dashboard", label: "Dashboard", badgeCount: 0 },
        { href: "/finance/refunds", label: "Refund Queue", badgeCount: refundBadgeCount },
        { href: "/finance/payouts", label: "Payout Queue", badgeCount: payoutBadgeCount },
        {
          href: "/finance/transaction-promos",
          label: "Transaction Promos",
          badgeCount: transactionPromoReadyCount || 0,
          secondaryBadgeCount: transactionPromoActiveCount || 0,
        },
        { href: "/finance/internal-chat", label: "Internal Chat", badgeCount: internalChatUnreadBadgeCount },
      ]

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#fff8f1_0%,#f7f1e8_100%)]">
      <FinanceNavSeenTracker />
      <AdminSidebarShell
        adminCode={financeCode}
        isOperationsManager={false}
        items={financeNav}
        portal="finance"
        roleLabel={roleLabel}
        showFullBrand
      >
        {children}
      </AdminSidebarShell>
    </div>
  )
}
