import { redirect } from "next/navigation"
import AdminSidebarShell from "@/app/components/AdminSidebarShell"
import SuperadminNavSeenTracker from "@/app/components/SuperadminNavSeenTracker"
import { formatAdminCode } from "@/lib/merchant-code"
import { getInternalChatUnreadBadgeCount } from "@/lib/internal-chat/badge"
import { getMerchantSupportUnreadCountForAdmin, loadMerchantSupportRoomsForAdmin } from "@/lib/merchant-support/index"
import { buildPortalSessionError } from "@/lib/portal-session"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { SUPERADMIN_NAV_SECTION_TO_COLUMN } from "@/lib/superadmin-nav-seen"
import { ADMIN_ACTIVE_BOOKING_BADGE_STATUSES, isNewerThan, isStatusInSet, normalizeStatus } from "@/lib/nav-badge-policy"

export default async function SuperadminProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient("superadmin")
  const adminSupabase = createAdminClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/superadmin/login?error=session-ended")
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (!profile) {
    redirect("/superadmin/login?error=no-profile")
  }

  if (profile.role !== "superadmin") {
    redirect(`/superadmin/login?error=${encodeURIComponent(buildPortalSessionError("session-changed", profile.role))}`)
  }

  const [seenStateResult, bookingResult, auditLogsResult, internalAccountLogResult, internalChatUnreadBadgeCount, merchantSupportRooms, activeSubscribersResult, activePromosResult, inactivePromosResult, activeArticlesResult, inactiveArticlesResult] = await Promise.all([
    adminSupabase
      .from("superadmin_nav_seen_states")
      .select("seen_ops_accounts_at, seen_finance_accounts_at, seen_marketing_accounts_at, seen_superadmin_accounts_at, seen_bookings_at, seen_audit_log_at")
      .eq("superadmin_user_id", user.id)
      .maybeSingle(),
    adminSupabase
      .from("bookings")
      .select("id, booking_status, created_at, updated_at"),
    adminSupabase
      .from("admin_action_logs")
      .select("id, created_at")
      .order("created_at", { ascending: false })
      .limit(200),
    adminSupabase
      .from("admin_action_logs")
      .select("id, action, created_at, metadata")
      .eq("target_type", "internal_account")
      .in("action", ["create_account", "reset_password", "delete_account"])
      .order("created_at", { ascending: false })
      .limit(200),
    getInternalChatUnreadBadgeCount(adminSupabase, user.id),
    loadMerchantSupportRoomsForAdmin(adminSupabase),
    adminSupabase.from("newsletter_subscribers").select("id", { count: "exact", head: true }).eq("status", "active"),
    adminSupabase.from("marketing_promos").select("id", { count: "exact", head: true }).eq("is_active", true),
    adminSupabase.from("marketing_promos").select("id", { count: "exact", head: true }).eq("is_active", false),
    adminSupabase.from("marketing_inspiration_articles").select("id", { count: "exact", head: true }).eq("is_active", true),
    adminSupabase.from("marketing_inspiration_articles").select("id", { count: "exact", head: true }).eq("is_active", false),
  ])

  const seenState =
    (seenStateResult.data as Partial<Record<(typeof SUPERADMIN_NAV_SECTION_TO_COLUMN)[keyof typeof SUPERADMIN_NAV_SECTION_TO_COLUMN], string | null>> | null) ||
    null
  const seenOpsAccountsAt = seenState?.seen_ops_accounts_at || undefined
  const seenFinanceAccountsAt = seenState?.seen_finance_accounts_at || undefined
  const seenMarketingAccountsAt = seenState?.seen_marketing_accounts_at || undefined
  const seenSuperadminAccountsAt = seenState?.seen_superadmin_accounts_at || undefined
  const seenAuditLogAt = seenState?.seen_audit_log_at || undefined

  const financeReadyRows =
    ((bookingResult.data as Array<{ id: string; booking_status: string | null; created_at: string | null; updated_at: string | null }> | null) || []).filter(
      (booking) => isStatusInSet(booking.booking_status, ADMIN_ACTIVE_BOOKING_BADGE_STATUSES),
    )

  const internalAccountLogs =
    (internalAccountLogResult.data as Array<{
      id: string
      action: string | null
      created_at: string | null
      metadata: { scope?: string | null } | null
    }> | null) || []
  const auditLogs = (auditLogsResult.data as Array<{ id: string; created_at: string | null }> | null) || []

  const opsAccountsBadgeCount = internalAccountLogs.filter((log) => {
    const scope = normalizeStatus(log.metadata?.scope)
    return scope === "operations_team" && isNewerThan(log.created_at, seenOpsAccountsAt)
  }).length
  const financeAccountsBadgeCount = internalAccountLogs.filter((log) => {
    const scope = normalizeStatus(log.metadata?.scope)
    return scope === "finance_team" && isNewerThan(log.created_at, seenFinanceAccountsAt)
  }).length
  const marketingAccountsBadgeCount = internalAccountLogs.filter((log) => {
    const scope = normalizeStatus(log.metadata?.scope)
    return scope === "marketing_team" && isNewerThan(log.created_at, seenMarketingAccountsAt)
  }).length
  const superadminAccountsBadgeCount = internalAccountLogs.filter((log) => {
    const scope = normalizeStatus(log.metadata?.scope)
    return scope === "superadmin_accounts" && isNewerThan(log.created_at, seenSuperadminAccountsAt)
  }).length
  const bookingsBadgeCount = financeReadyRows.length
  const auditLogBadgeCount = auditLogs.filter((log) => isNewerThan(log.created_at, seenAuditLogAt)).length
  const merchantSupportBadgeCount = getMerchantSupportUnreadCountForAdmin(merchantSupportRooms)
  const activeSubscribersCount = activeSubscribersResult.count || 0
  const activePromosCount = activePromosResult.count || 0
  const inactivePromosCount = inactivePromosResult.count || 0
  const activeArticlesCount = activeArticlesResult.count || 0
  const inactiveArticlesCount = inactiveArticlesResult.count || 0

  const navItems = [
    { label: "Ringkasan" },
    { href: "/superadmin/dashboard", label: "Dashboard", badgeCount: 0 },
    { href: "/superadmin/operations-manager", label: "Operations Overview", badgeCount: 0 },
    { href: "/superadmin/finance-manager", label: "Finance Overview", badgeCount: 0 },
    {
      label: "Marketing Overview",
      children: [
        { href: "/superadmin/marketing-manager", label: "Dashboard" },
        { href: "/superadmin/marketing-newsletters", label: "Newsletter Audience", badgeCount: activeSubscribersCount },
        { href: "/superadmin/marketing-promos", label: "Preview Promo", badgeCount: activePromosCount, secondaryBadgeCount: inactivePromosCount },
        { href: "/superadmin/marketing-inspiration", label: "Preview Inspiration", badgeCount: activeArticlesCount, secondaryBadgeCount: inactiveArticlesCount },
      ],
    },
    { label: "Operasional" },
    { href: "/superadmin/bookings", label: "Booking & Transaksi", badgeCount: bookingsBadgeCount },
    { href: "/superadmin/merchant-support", label: "Merchant Support", badgeCount: merchantSupportBadgeCount },
    { href: "/superadmin/internal-chat", label: "Internal Chat", badgeCount: internalChatUnreadBadgeCount },
    { label: "Sistem" },
    {
      label: "Kontrol Internal",
      children: [
        { href: "/superadmin/team-accounts", label: "Ops Team Accounts", badgeCount: opsAccountsBadgeCount },
        { href: "/superadmin/finance-team-accounts", label: "Finance Team Accounts", badgeCount: financeAccountsBadgeCount },
        { href: "/superadmin/marketing-team-accounts", label: "Marketing Team Accounts", badgeCount: marketingAccountsBadgeCount },
        { href: "/superadmin/superadmin-accounts", label: "Superadmin Accounts", badgeCount: superadminAccountsBadgeCount },
      ],
    },
    { href: "/superadmin/audit-log", label: "Audit Trail", badgeCount: auditLogBadgeCount },
  ]

  return (
    <div className="min-h-screen bg-[#f4f7fb]">
      <SuperadminNavSeenTracker />
      <AdminSidebarShell
        adminCode={formatAdminCode(user.id)}
        isOperationsManager={false}
        items={navItems}
        portal="superadmin"
        roleLabel="Super Admin"
        showFullBrand
      >
        {children}
      </AdminSidebarShell>
    </div>
  )
}
