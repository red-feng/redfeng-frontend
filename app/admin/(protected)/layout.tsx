import { createAdminClient } from "@/lib/supabase/admin"
import { formatAdminCode } from "@/lib/merchant-code"
import { redirect } from "next/navigation"
import SignOutButton from "@/app/components/SignOutButton"
import { createClient } from "@/lib/supabase/server"
import AdminNavLinks from "@/app/components/AdminNavLinks"
import AdminNavSeenTracker from "@/app/components/AdminNavSeenTracker"
import SuperadminAdminRouteSeenBridge from "@/app/components/SuperadminAdminRouteSeenBridge"
import { ADMIN_NAV_SECTION_TO_COLUMN } from "@/lib/admin-nav-seen"
import { getRoleLabel, isAdminPortalRole } from "@/lib/internal-roles"

function normalizeStatus(value: string | null) {
  return String(value || "").trim().toLowerCase()
}

function isNewerThan(timestamp: string | null | undefined, seenAt: string | undefined) {
  if (!timestamp) return false
  if (!seenAt) return true
  return timestamp > seenAt
}

export default async function AdminProtectedLayout({
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

  const [merchantResult, packageResult, bookingResult, merchantDeletionRequestResult, seenStateResult] = await Promise.all([
    adminSupabase
      .from("merchants")
      .select("id, created_at")
      .eq("verification_status", "pending"),
    adminSupabase
      .from("packages")
      .select("id, status, updated_at"),
    adminSupabase
      .from("bookings")
      .select("id, booking_status, created_at, updated_at"),
    adminSupabase
      .from("merchant_deletion_requests")
      .select("id, created_at")
      .eq("status", "pending"),
    adminSupabase
      .from("admin_nav_seen_states")
      .select("seen_merchants_at, seen_packages_at, seen_bookings_at")
      .eq("admin_user_id", user.id)
      .maybeSingle(),
  ])

  const seenState =
    (seenStateResult.data as Partial<Record<(typeof ADMIN_NAV_SECTION_TO_COLUMN)[keyof typeof ADMIN_NAV_SECTION_TO_COLUMN], string | null>> | null) ||
    null
  const seenMerchantsAt = seenState?.seen_merchants_at || undefined
  const seenPackagesAt = seenState?.seen_packages_at || undefined
  const seenBookingsAt = seenState?.seen_bookings_at || undefined

  const pendingMerchantRows =
    (merchantResult.data as Array<{ id: string; created_at: string | null }> | null) || []
  const pendingMerchantDeletionRows =
    (merchantDeletionRequestResult.data as Array<{ id: string; created_at: string | null }> | null) || []
  const pendingPackageRows =
    ((packageResult.data as Array<{ id: string; status: string | null; updated_at: string | null }> | null) || []).filter(
      (pkg) => normalizeStatus(pkg.status) === "pending",
    )
  const financeReadyRows =
    ((bookingResult.data as Array<{ id: string; booking_status: string | null; created_at: string | null; updated_at: string | null }> | null) || []).filter(
      (booking) => ["awaiting_admin_handoff", "finance_review"].includes(normalizeStatus(booking.booking_status)),
    )

  const pendingMerchantsBadgeCount = pendingMerchantRows.filter((merchant) => isNewerThan(merchant.created_at, seenMerchantsAt)).length
  const pendingMerchantDeletionBadgeCount = pendingMerchantDeletionRows.filter((request) =>
    isNewerThan(request.created_at, seenMerchantsAt),
  ).length
  const pendingPackagesBadgeCount = pendingPackageRows.filter((pkg) => isNewerThan(pkg.updated_at, seenPackagesAt)).length
  const financeReadyBadgeCount = financeReadyRows.filter((booking) => isNewerThan(booking.updated_at || booking.created_at, seenBookingsAt)).length

  const adminNav = isOperationsManager
    ? [
        { href: "/admin/dashboard", label: "Dashboard", badgeCount: 0 },
        {
          label: "Operational Review",
          children: [
            {
              href: "/admin/merchants",
              label: "Merchant Directory",
              badgeCount: pendingMerchantsBadgeCount,
              secondaryBadgeCount: pendingMerchantDeletionBadgeCount,
            },
            { href: "/admin/packages", label: "Package Review", badgeCount: pendingPackagesBadgeCount },
            { href: "/admin/bookings", label: "Booking Center", badgeCount: financeReadyBadgeCount },
            { href: "/admin/team-accounts", label: "Team Accounts", badgeCount: 0 },
          ],
        },
        {
          label: "Product Channels",
          children: [
            { href: "/admin/paket-tour", label: "Paket Tour", badgeCount: 0 },
            { href: "/admin/pesawat", label: "Pesawat", badgeCount: 0 },
            { href: "/admin/hotel", label: "Hotel", badgeCount: 0 },
            { href: "/admin/bus-travel", label: "Bus & Travel", badgeCount: 0 },
            { href: "/admin/kereta-api", label: "Kereta Api", badgeCount: 0 },
            { href: "/admin/kapal-laut", label: "Kapal Laut", badgeCount: 0 },
            { href: "/admin/kapal-pesiar", label: "Kapal Pesiar", badgeCount: 0 },
          ],
        },
        { href: "/admin/audit-log", label: "Audit Log", badgeCount: 0 },
      ]
    : [
        { href: "/admin/dashboard", label: "Dashboard", badgeCount: 0 },
        {
          label: "Paket Tour",
          children: [
            { href: "/admin/paket-tour", label: "Workspace", badgeCount: 0 },
            {
              href: "/admin/merchants",
              label: "Merchant Directory",
              badgeCount: pendingMerchantsBadgeCount,
              secondaryBadgeCount: pendingMerchantDeletionBadgeCount,
            },
            { href: "/admin/packages", label: "Package Review", badgeCount: pendingPackagesBadgeCount },
          ],
        },
        {
          label: "Pesawat",
          children: [{ href: "/admin/pesawat", label: "Workspace", badgeCount: 0 }],
        },
        {
          label: "Hotel",
          children: [{ href: "/admin/hotel", label: "Workspace", badgeCount: 0 }],
        },
        {
          label: "Bus & Travel",
          children: [{ href: "/admin/bus-travel", label: "Workspace", badgeCount: 0 }],
        },
        {
          label: "Kereta Api",
          children: [{ href: "/admin/kereta-api", label: "Workspace", badgeCount: 0 }],
        },
        {
          label: "Kapal Laut",
          children: [{ href: "/admin/kapal-laut", label: "Workspace", badgeCount: 0 }],
        },
        {
          label: "Kapal Pesiar",
          children: [{ href: "/admin/kapal-pesiar", label: "Workspace", badgeCount: 0 }],
        },
        { href: "/admin/bookings", label: "Booking Center", badgeCount: financeReadyBadgeCount },
        { href: "/admin/audit-log", label: "Audit Log", badgeCount: 0 },
      ]

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#fff8f1_0%,#f7f1e8_100%)]">
      <AdminNavSeenTracker />
      <SuperadminAdminRouteSeenBridge enabled={profile.role === "superadmin"} />
      <header className="sticky top-0 z-40 border-b border-[#ecd9c2] bg-white/90 backdrop-blur-xl">
        <div className="mx-auto w-full max-w-7xl px-4 py-4 sm:px-6 md:px-8 lg:px-10">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="inline-flex rounded-full border border-[#ecd9c2] bg-[#fffaf3] px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.28em] text-orange-500">
                  Admin Workspace
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-950">
                  {isOperationsManager ? "Operations manager workspace Red Feng" : "Dashboard admin internal Red Feng"}
                </p>
                <p className="text-xs text-slate-500">
                  {isOperationsManager
                    ? "Area monitoring backlog, SLA, dan quality control operasional"
                    : "Area approval merchant, paket, dan booking operasional"}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="inline-flex rounded-full border border-[#ecd9c2] bg-[#fffaf3] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-orange-600">
                    {adminCode}
                  </span>
                  <span className="inline-flex rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-sky-700">
                    {roleLabel}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 self-start md:self-auto">
                <SignOutButton
                  redirectTo="https://app.redfeng.co/admin/login"
                  className="rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:border-rose-300 hover:bg-rose-100"
                />
              </div>
            </div>
            <nav className="overflow-x-auto pb-1">
              <AdminNavLinks items={adminNav} />
            </nav>
          </div>
        </div>
      </header>
      {children}
    </div>
  )
}
