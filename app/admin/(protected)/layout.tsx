import { createAdminClient } from "@/lib/supabase/admin"
import { formatAdminCode } from "@/lib/merchant-code"
import { redirect } from "next/navigation"
import SignOutButton from "@/app/components/SignOutButton"
import { createClient } from "@/lib/supabase/server"
import AdminNavLinks from "@/app/components/AdminNavLinks"
import AdminNavSeenTracker from "@/app/components/AdminNavSeenTracker"
import SuperadminAdminRouteSeenBridge from "@/app/components/SuperadminAdminRouteSeenBridge"
import { getInternalChatUnreadBadgeCount } from "@/lib/internal-chat/badge"
import { getRoleLabel, isAdminPortalRole } from "@/lib/internal-roles"
import { getMerchantSupportUnreadCountForAdmin, loadMerchantSupportRoomsForAdmin } from "@/lib/merchant-support/index"
import { ADMIN_ACTIVE_BOOKING_BADGE_STATUSES, ADMIN_ACTIVE_PACKAGE_BADGE_STATUSES } from "@/lib/nav-badge-policy"

export default async function AdminProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient("admin")
  const adminSupabase = createAdminClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/admin/login?error=no-session")
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (!profile) {
    redirect("/admin/login?error=no-profile")
  }

  if (profile.role === "merchant") {
    redirect("/merchant/dashboard")
  }

  if (!isAdminPortalRole(profile.role) && profile.role !== "superadmin") {
    redirect(`/admin/login?error=${encodeURIComponent(`wrong-role:${String(profile.role || "unknown")}`)}`)
  }

  const isOperationsManager = profile.role === "operations_manager"
  const adminCode = formatAdminCode(user.id)
  const roleLabel = getRoleLabel(profile.role)

  const [merchantResult, packageResult, bookingResult, merchantDeletionRequestResult, internalChatUnreadBadgeCount, merchantSupportRooms] = await Promise.all([
    adminSupabase
      .from("merchants")
      .select("id", { count: "exact", head: true })
      .eq("verification_status", "pending"),
    adminSupabase
      .from("packages")
      .select("id", { count: "exact", head: true })
      .in("status", [...ADMIN_ACTIVE_PACKAGE_BADGE_STATUSES]),
    adminSupabase
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .in("booking_status", [...ADMIN_ACTIVE_BOOKING_BADGE_STATUSES]),
    adminSupabase
      .from("merchant_deletion_requests")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
    getInternalChatUnreadBadgeCount(adminSupabase, user.id),
    loadMerchantSupportRoomsForAdmin(adminSupabase),
  ])

  // Merchant directory badge should reflect the active registration queue, not a transient "seen" state.
  // Keep it visible until each merchant is actually approved/rejected or the deletion request is resolved.
  const pendingMerchantsBadgeCount = merchantResult.count || 0
  const pendingMerchantDeletionBadgeCount = merchantDeletionRequestResult.count || 0
  // Package and booking badges should also stay visible while items remain in their active queue.
  const pendingPackagesBadgeCount = packageResult.count || 0
  const financeReadyBadgeCount = bookingResult.count || 0
  const merchantSupportBadgeCount = getMerchantSupportUnreadCountForAdmin(merchantSupportRooms)

  const merchantNavChildren = [
    {
      href: "/admin/merchants",
      label: "Directory",
      badgeCount: 0,
    },
    {
      href: "/admin/merchants/pending-approvals",
      label: "Pending approvals",
      badgeCount: pendingMerchantsBadgeCount,
      secondaryBadgeCount: pendingMerchantDeletionBadgeCount,
    },
    { href: "/admin/packages", label: "Package Review", badgeCount: pendingPackagesBadgeCount },
    { href: "/admin/merchants/anomalies", label: "Anomalis", badgeCount: 0 },
  ]
  const productNavChildren = [
    { href: "/admin/paket-tour", label: "Paket Tour", badgeCount: pendingPackagesBadgeCount },
    { href: "/admin/pesawat", label: "Pesawat", badgeCount: 0 },
    { href: "/admin/hotel", label: "Hotel", badgeCount: 0 },
    { href: "/admin/kereta-api", label: "Kereta Api", badgeCount: 0 },
    { href: "/admin/bus-travel", label: "Bus & Travel", badgeCount: 0 },
    { href: "/admin/kapal-laut", label: "Kapal Laut", badgeCount: 0 },
    { href: "/admin/kapal-pesiar", label: "Kapal Pesiar", badgeCount: 0 },
  ]
  const adminNav = isOperationsManager
    ? [
        { href: "/admin/dashboard", label: "Dashboard", badgeCount: 0 },
        { href: "/admin/internal-chat", label: "Internal Chat", badgeCount: internalChatUnreadBadgeCount },
        { href: "/admin/merchant-support", label: "Merchant Support", badgeCount: merchantSupportBadgeCount },
        { label: "Merchant", children: merchantNavChildren },
        { label: "Produk", children: productNavChildren },
        { href: "/admin/bookings", label: "Booking Center", badgeCount: financeReadyBadgeCount },
        { href: "/admin/team-accounts", label: "Team Accounts", badgeCount: 0 },
        { href: "/admin/audit-log", label: "Audit Log", badgeCount: 0 },
      ]
    : [
        { href: "/admin/dashboard", label: "Dashboard", badgeCount: 0 },
        { label: "Merchant", children: merchantNavChildren },
        { label: "Produk", children: productNavChildren },
        { href: "/admin/bookings", label: "Booking Center", badgeCount: financeReadyBadgeCount },
        { href: "/admin/internal-chat", label: "Internal Chat", badgeCount: internalChatUnreadBadgeCount },
        { href: "/admin/merchant-support", label: "Merchant Support", badgeCount: merchantSupportBadgeCount },
        { href: "/admin/audit-log", label: "Audit Log", badgeCount: 0 },
      ]

  return (
    <div className="min-h-screen bg-[#fbfaf8] text-slate-900 lg:flex">
      <AdminNavSeenTracker />
      <SuperadminAdminRouteSeenBridge enabled={profile.role === "superadmin"} />
      <aside className="sticky top-0 z-40 flex max-h-screen w-full flex-col border-b border-[#eee5dc] bg-white lg:h-screen lg:w-[280px] lg:shrink-0 lg:border-b-0 lg:border-r">
        <div className="flex items-center justify-between gap-3 px-5 py-5 lg:px-6 lg:py-7">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-2xl bg-orange-600 text-sm font-black text-white">RF</span>
            <span className="text-lg font-semibold tracking-[-0.03em] text-slate-950">Red Feng</span>
          </div>
          <span className="rounded-full border border-[#efd8c8] bg-[#fff7f1] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-orange-600 lg:hidden">
            {roleLabel}
          </span>
        </div>
        <div className="hidden px-6 pb-4 lg:block">
          <p className="text-[10px] font-semibold uppercase tracking-[0.34em] text-slate-400">Admin Workspace</p>
          <p className="mt-3 text-xs font-semibold text-slate-700">{roleLabel}</p>
          <p className="mt-1 text-[11px] text-slate-400">{adminCode}</p>
        </div>
        <nav className="flex-1 overflow-auto px-4 pb-4 lg:px-5">
          <AdminNavLinks items={adminNav} />
        </nav>
        <div className="hidden border-t border-[#f0e6dd] px-6 py-5 lg:block">
          <SignOutButton
            portal="admin"
            redirectTo="https://app.redfeng.co/admin/login"
            className="inline-flex w-full items-center justify-center rounded-[16px] border border-rose-200 bg-white px-4 py-3 text-sm font-semibold text-rose-600 transition hover:bg-rose-50"
          />
        </div>
      </aside>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  )
}
