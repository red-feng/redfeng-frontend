import { createAdminClient } from "@/lib/supabase/admin"
import { redirect } from "next/navigation"
import SignOutButton from "@/app/components/SignOutButton"
import { createClient } from "@/lib/supabase/server"
import AdminNavLinks from "@/app/components/AdminNavLinks"

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

  if (!["admin", "superadmin"].includes(profile.role)) {
    redirect("/admin/login")
  }

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

  const adminNav = [
    { href: "/admin/dashboard", label: "Dashboard", badgeCount: 0 },
    {
      label: "Paket Tour",
      children: [
        { href: "/admin/paket-tour", label: "Workspace", badgeCount: 0 },
        { href: "/admin/merchants", label: "Merchant", badgeCount: pendingMerchants },
        { href: "/admin/packages", label: "Review Queue", badgeCount: pendingPackages },
        { href: "/admin/bookings?product=paket-tour", label: "Bookings", badgeCount: financeReadyCount },
      ],
    },
    {
      label: "Pesawat",
      children: [
        { href: "/admin/pesawat", label: "Workspace", badgeCount: 0 },
        { href: "/admin/bookings?product=pesawat", label: "Bookings", badgeCount: 0 },
      ],
    },
    {
      label: "Hotel",
      children: [
        { href: "/admin/hotel", label: "Workspace", badgeCount: 0 },
        { href: "/admin/bookings?product=hotel", label: "Bookings", badgeCount: 0 },
      ],
    },
    {
      label: "Bus & Travel",
      children: [
        { href: "/admin/bus-travel", label: "Workspace", badgeCount: 0 },
        { href: "/admin/bookings?product=bus-travel", label: "Bookings", badgeCount: 0 },
      ],
    },
    {
      label: "Kereta Api",
      children: [
        { href: "/admin/kereta-api", label: "Workspace", badgeCount: 0 },
        { href: "/admin/bookings?product=kereta-api", label: "Bookings", badgeCount: 0 },
      ],
    },
    {
      label: "Kapal Laut",
      children: [
        { href: "/admin/kapal-laut", label: "Workspace", badgeCount: 0 },
        { href: "/admin/bookings?product=kapal-laut", label: "Bookings", badgeCount: 0 },
      ],
    },
    {
      label: "Kapal Pesiar",
      children: [
        { href: "/admin/kapal-pesiar", label: "Workspace", badgeCount: 0 },
        { href: "/admin/bookings?product=kapal-pesiar", label: "Bookings", badgeCount: 0 },
      ],
    },
    { href: "/admin/bookings", label: "Booking Center", badgeCount: financeReadyCount },
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
                <p className="mt-1 text-sm font-semibold text-slate-950">Dashboard admin internal Red Feng</p>
                <p className="text-xs text-slate-500">Area approval merchant, paket, dan booking operasional</p>
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
