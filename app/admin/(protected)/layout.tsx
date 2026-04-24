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
import { getAccessibleInternalProducts, toAdminProductNavHref } from "@/lib/internal-product-access"
import { getBookingProductLabel } from "@/lib/booking-products"
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
  const accessibleProducts = await getAccessibleInternalProducts(adminSupabase, user.id, profile.role)
  const visibleProductTypes = accessibleProducts.map((entry) => entry.productType)

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
  const canAccessPackageTour = visibleProductTypes.includes("package_tour")

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
  const productNavChildren = visibleProductTypes.map((productType) => ({
    href: toAdminProductNavHref(productType),
    label: getBookingProductLabel(productType),
    badgeCount: productType === "package_tour" ? pendingPackagesBadgeCount : 0,
  }))
  const adminNav = isOperationsManager
    ? [
        { label: "OPERASIONAL" },
        { href: "/admin/dashboard", label: "Dashboard", badgeCount: 0 },
        { href: "/admin/bookings", label: "Booking Center", badgeCount: financeReadyBadgeCount },
        ...(canAccessPackageTour ? [{ href: "/admin/packages", label: "Paket Review", badgeCount: pendingPackagesBadgeCount }] : []),
        ...(canAccessPackageTour ? [{ href: "/admin/merchants/anomalies", label: "Anomali", badgeCount: pendingMerchantDeletionBadgeCount }] : []),
        { href: "/admin/dashboard?workspace=alerts_overview", label: "SLA Monitoring", badgeCount: pendingMerchantsBadgeCount + pendingPackagesBadgeCount },
        { href: "/admin/merchants", label: "Merchant", badgeCount: pendingMerchantsBadgeCount },
        { href: "/admin/internal-chat", label: "Internal Chat", badgeCount: internalChatUnreadBadgeCount },
        { href: "/admin/merchant-support", label: "Merchant Support", badgeCount: merchantSupportBadgeCount },
        { label: "PRODUK & LAYANAN" },
        ...productNavChildren,
        { label: "LAPORAN" },
        { href: "/admin/dashboard", label: "Report Harian", badgeCount: 0 },
        { href: "/admin/audit-log", label: "Report Operasional", badgeCount: 0 },
        { href: "/admin/dashboard/widgets", label: "Data Export", badgeCount: 0 },
      ]
    : [
        { href: "/admin/dashboard", label: "Dashboard", badgeCount: 0 },
        ...(canAccessPackageTour ? [{ label: "Merchant", children: merchantNavChildren }] : []),
        ...(productNavChildren.length > 0 ? [{ label: "Produk", children: productNavChildren }] : []),
        { href: "/admin/bookings", label: "Booking Center", badgeCount: financeReadyBadgeCount },
        { href: "/admin/internal-chat", label: "Internal Chat", badgeCount: internalChatUnreadBadgeCount },
        { href: "/admin/merchant-support", label: "Merchant Support", badgeCount: merchantSupportBadgeCount },
        { href: "/admin/audit-log", label: "Audit Log", badgeCount: 0 },
      ]

  return (
    <div className="min-h-screen bg-[#fbfaf8] text-slate-900 lg:flex">
      <AdminNavSeenTracker />
      <SuperadminAdminRouteSeenBridge enabled={profile.role === "superadmin"} />
      <aside className={`sticky top-0 z-40 flex max-h-screen w-full flex-col border-b bg-white lg:h-screen lg:shrink-0 lg:border-b-0 lg:border-r ${isOperationsManager ? "border-[#eef2f7] lg:w-[308px]" : "border-[#eee5dc] lg:w-[280px]"}`}>
        <div className={`flex items-center justify-between gap-3 px-5 lg:px-7 ${isOperationsManager ? "py-7" : "py-5 lg:py-7"}`}>
          <div className="flex items-center gap-3">
            <span className={`inline-flex items-center justify-center rounded-2xl ${isOperationsManager ? "h-10 w-10 bg-[#fff1eb] text-orange-600" : "h-8 w-8 bg-orange-600 text-white"} text-sm font-black`}>
              {isOperationsManager ? (
                <svg viewBox="0 0 24 24" aria-hidden="true" className="h-6 w-6">
                  <path d="M8 3c3 0 5 1.8 5 4.5 0 2.2-1.2 4-3.5 5.1L7 14l2.3-4H6.5C5.1 10 4 8.8 4 7.2 4 4.8 5.8 3 8 3zm6.3 5.5c2.1 0 3.7 1.5 3.7 3.4 0 2-1.5 3.7-4.2 4.7l-4 1.5 1.8-3.1H9.8l1.1-1.9 2.6-.9c1.5-.5 2.4-1.2 2.4-2.2 0-.8-.7-1.5-1.8-1.5z" fill="currentColor" />
                </svg>
              ) : "RF"}
            </span>
            <div>
              <span className="text-[1.8rem] font-semibold tracking-[-0.05em] text-slate-950">{isOperationsManager ? "RedFeng" : "Red Feng"}</span>
              {isOperationsManager ? <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.26em] text-slate-400">Operational</p> : null}
            </div>
          </div>
          <span className="rounded-full border border-[#efd8c8] bg-[#fff7f1] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-orange-600 lg:hidden">
            {roleLabel}
          </span>
        </div>
        <div className={`hidden px-7 pb-4 lg:block ${isOperationsManager ? "pt-1" : ""}`}>
          <p className="text-[10px] font-semibold uppercase tracking-[0.34em] text-slate-400">{isOperationsManager ? "Dashboard Operasional" : "Admin Workspace"}</p>
          <p className="mt-3 text-xs font-semibold text-slate-700">{roleLabel}</p>
          <p className="mt-1 text-[11px] text-slate-400">{adminCode}</p>
        </div>
        <nav className={`flex-1 overflow-auto pb-5 ${isOperationsManager ? "px-5" : "px-4 lg:px-5"}`}>
          <AdminNavLinks items={adminNav} />
        </nav>
        <div className={`hidden px-7 py-6 lg:block ${isOperationsManager ? "" : "border-t border-[#f0e6dd]"}`}>
          {isOperationsManager ? (
            <div className="mb-4 flex items-center gap-3 rounded-[18px] border border-[#eef2f7] bg-[#f8fafc] px-4 py-3">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-slate-200 text-sm font-semibold text-slate-700">
                {roleLabel
                  .split(" ")
                  .map((part) => part[0] || "")
                  .join("")
                  .slice(0, 2)
                  .toUpperCase()}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-900">{roleLabel}</p>
                <p className="mt-1 text-xs text-slate-400">{adminCode}</p>
              </div>
            </div>
          ) : null}
          <SignOutButton
            portal="admin"
            redirectTo="https://app.redfeng.co/admin/login"
            className={`inline-flex w-full items-center justify-center rounded-[16px] px-4 py-3 text-sm font-semibold transition ${isOperationsManager ? "border border-[#f4d7d7] bg-white text-rose-500 hover:bg-rose-50" : "border border-rose-200 bg-white text-rose-600 hover:bg-rose-50"}`}
          />
        </div>
      </aside>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  )
}
