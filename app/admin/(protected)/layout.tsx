import { createAdminClient } from "@/lib/supabase/admin"
import { formatAdminCode } from "@/lib/merchant-code"
import { redirect } from "next/navigation"
import SignOutButton from "@/app/components/SignOutButton"
import { createClient } from "@/lib/supabase/server"
import AdminNavLinks from "@/app/components/AdminNavLinks"
import { getRoleLabel, isAdminPortalRole } from "@/lib/internal-roles"

function normalizeStatus(value: string | null) {
  return String(value || "").trim().toLowerCase()
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
    redirect("/admin/login")
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (!profile) {
    redirect("/admin/login")
  }

  if (profile.role === "merchant") {
    redirect("/merchant/dashboard")
  }

  if (!isAdminPortalRole(profile.role)) {
    redirect("/admin/login")
  }

  const isSuperadmin = profile.role === "superadmin"
  const isOperationsManager = profile.role === "operations_manager"
  const adminCode = formatAdminCode(user.id)
  const roleLabel = getRoleLabel(profile.role)

  const [merchantResult, packageResult, bookingResult] = await Promise.all([
    adminSupabase
      .from("merchants")
      .select("id", { count: "exact", head: true })
      .eq("verification_status", "pending"),
    adminSupabase
      .from("packages")
      .select("id, status"),
    adminSupabase
      .from("bookings")
      .select("id, booking_status"),
  ])

  const pendingMerchants = merchantResult.count || 0
  const pendingPackages = ((packageResult.data as Array<{ id: string; status: string | null }> | null) || []).filter(
    (pkg) => normalizeStatus(pkg.status) === "pending",
  ).length
  const financeReadyCount = ((bookingResult.data as Array<{ id: string; booking_status: string | null }> | null) || []).filter(
    (booking) => normalizeStatus(booking.booking_status) === "awaiting_admin_handoff",
  ).length

  const adminNav = isOperationsManager
    ? [
        { href: "/admin/dashboard", label: "Dashboard", badgeCount: 0 },
        {
          label: "Operational Review",
          children: [
            { href: "/admin/merchants", label: "Merchant Directory", badgeCount: pendingMerchants },
            { href: "/admin/packages", label: "Package Review", badgeCount: pendingPackages },
            { href: "/admin/bookings", label: "Booking Center", badgeCount: financeReadyCount },
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
            { href: "/admin/merchants", label: "Merchant Directory", badgeCount: pendingMerchants },
            { href: "/admin/packages", label: "Package Review", badgeCount: pendingPackages },
            ...(isSuperadmin ? [{ href: "/admin/team-accounts", label: "Team Accounts", badgeCount: 0 }] : []),
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
        { href: "/admin/bookings", label: "Booking Center", badgeCount: financeReadyCount },
        { href: "/admin/audit-log", label: "Audit Log", badgeCount: 0 },
      ]

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#fff8f1_0%,#f7f1e8_100%)]">
      <header className="sticky top-0 z-40 border-b border-[#ecd9c2] bg-white/90 backdrop-blur-xl">
        <div className="mx-auto w-full max-w-7xl px-6 py-4 sm:px-8 lg:px-10">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-4">
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
                  <span className={`inline-flex rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] ${
                    isSuperadmin
                      ? "border border-violet-200 bg-violet-50 text-violet-700"
                      : "border border-sky-200 bg-sky-50 text-sky-700"
                  }`}>
                    {roleLabel}
                  </span>
                  {isSuperadmin && (
                    <a
                      href="/admin/team-accounts"
                      className="inline-flex rounded-full border border-[#ecd9c2] bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-700 transition hover:border-orange-200 hover:bg-[#fff7ef] hover:text-orange-600"
                    >
                      Internal Accounts
                    </a>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
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
