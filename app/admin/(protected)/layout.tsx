import { createAdminClient } from "@/lib/supabase/admin"
import { formatAdminCode } from "@/lib/merchant-code"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import AdminSidebarShell from "@/app/components/AdminSidebarShell"
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
      label: "Direktori",
      badgeCount: 0,
    },
    {
      href: "/admin/merchants/pending-approvals",
      label: "Pending approvals",
      badgeCount: pendingMerchantsBadgeCount,
      secondaryBadgeCount: pendingMerchantDeletionBadgeCount,
    },
    { href: "/admin/packages", label: "Package Review", badgeCount: pendingPackagesBadgeCount },
    { href: "/admin/merchants/anomalies", label: "Anomali", badgeCount: 0 },
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
        { href: "/admin/dashboard", label: "Operations Dashboard", badgeCount: 0 },
        { href: "/admin/audit-log", label: "Audit Trail", badgeCount: 0 },
        { href: "/admin/dashboard/widgets", label: "Widget & Export", badgeCount: 0 },
      ]
    : [
        { href: "/admin/dashboard", label: "Dashboard", badgeCount: 0 },
        ...(canAccessPackageTour ? [{ label: "Merchant", children: merchantNavChildren }] : []),
        ...(productNavChildren.length > 0 ? [{ label: "Produk", children: productNavChildren }] : []),
        { href: "/admin/bookings", label: "Booking Center", badgeCount: financeReadyBadgeCount },
        { href: "/admin/internal-chat", label: "Internal Chat", badgeCount: internalChatUnreadBadgeCount },
        { href: "/admin/merchant-support", label: "Merchant Support", badgeCount: merchantSupportBadgeCount },
        { href: "/admin/audit-log", label: "Audit Trail", badgeCount: 0 },
      ]

  return (
    <AdminSidebarShell adminCode={adminCode} isOperationsManager={isOperationsManager} items={adminNav} roleLabel={roleLabel}>
      <AdminNavSeenTracker />
      <SuperadminAdminRouteSeenBridge enabled={profile.role === "superadmin"} />
      {children}
    </AdminSidebarShell>
  )
}
