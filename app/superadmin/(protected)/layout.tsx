import { redirect } from "next/navigation"
import SignOutButton from "@/app/components/SignOutButton"
import AdminNavLinks from "@/app/components/AdminNavLinks"
import SuperadminNavSeenTracker from "@/app/components/SuperadminNavSeenTracker"
import { formatAdminCode } from "@/lib/merchant-code"
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
  const supabase = await createClient()
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

  const [seenStateResult, bookingResult, auditLogsResult, internalAccountLogResult] = await Promise.all([
    adminSupabase
      .from("superadmin_nav_seen_states")
      .select("seen_ops_accounts_at, seen_finance_accounts_at, seen_superadmin_accounts_at, seen_bookings_at, seen_audit_log_at")
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
  ])

  const seenState =
    (seenStateResult.data as Partial<Record<(typeof SUPERADMIN_NAV_SECTION_TO_COLUMN)[keyof typeof SUPERADMIN_NAV_SECTION_TO_COLUMN], string | null>> | null) ||
    null
  const seenOpsAccountsAt = seenState?.seen_ops_accounts_at || undefined
  const seenFinanceAccountsAt = seenState?.seen_finance_accounts_at || undefined
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
  const superadminAccountsBadgeCount = internalAccountLogs.filter((log) => {
    const scope = normalizeStatus(log.metadata?.scope)
    return scope === "superadmin_accounts" && isNewerThan(log.created_at, seenSuperadminAccountsAt)
  }).length
  const bookingsBadgeCount = financeReadyRows.length
  const auditLogBadgeCount = auditLogs.filter((log) => isNewerThan(log.created_at, seenAuditLogAt)).length

  const navItems = [
    { href: "/superadmin/dashboard", label: "Dashboard", badgeCount: 0 },
    {
      label: "Manager Dashboard Preview",
      children: [
        { href: "/superadmin/operations-manager", label: "Preview Ops Manager", badgeCount: 0 },
        { href: "/superadmin/finance-manager", label: "Preview Finance Manager", badgeCount: 0 },
      ],
    },
    {
      label: "Internal Control",
      children: [
        { href: "/superadmin/team-accounts", label: "Ops Team Accounts", badgeCount: opsAccountsBadgeCount },
        { href: "/superadmin/finance-team-accounts", label: "Finance Team Accounts", badgeCount: financeAccountsBadgeCount },
        { href: "/superadmin/superadmin-accounts", label: "Superadmin Accounts", badgeCount: superadminAccountsBadgeCount },
      ],
    },
    { href: "/admin/bookings", label: "Booking Center", badgeCount: bookingsBadgeCount },
    { href: "/admin/audit-log", label: "Audit Log", badgeCount: auditLogBadgeCount },
  ]

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#fff8f1_0%,#f7f1e8_100%)]">
      <SuperadminNavSeenTracker />
      <header className="sticky top-0 z-40 border-b border-[#ecd9c2] bg-white/90 backdrop-blur-xl">
        <div className="mx-auto w-full max-w-7xl px-6 py-4 sm:px-8 lg:px-10">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="inline-flex rounded-full border border-violet-200 bg-violet-50 px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.28em] text-violet-700">
                  Superadmin Workspace
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-950">Executive control center Red Feng</p>
                <p className="text-xs text-slate-500">
                  Area pengawasan manager, preview dashboard manager, audit lintas tim, dan kontrol internal tertinggi
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="inline-flex rounded-full border border-[#ecd9c2] bg-[#fffaf3] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-orange-600">
                    {formatAdminCode(user.id)}
                  </span>
                  <span className="inline-flex rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-violet-700">
                    Superadmin
                  </span>
                </div>
              </div>
              <SignOutButton
                redirectTo="https://app.redfeng.co/superadmin/login"
                className="rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:border-rose-300 hover:bg-rose-100"
              />
            </div>
            <nav className="overflow-x-auto pb-1">
              <AdminNavLinks items={navItems} />
            </nav>
          </div>
        </div>
      </header>
      {children}
    </div>
  )
}
