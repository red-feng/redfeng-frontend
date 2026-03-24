import Link from "next/link"
import { createAdminClient } from "@/lib/supabase/admin"
import { redirect } from "next/navigation"
import SignOutButton from "@/app/components/SignOutButton"
import { createClient } from "@/lib/supabase/server"

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
    { href: "/admin/merchants", label: "Merchants", badgeCount: pendingMerchants },
    { href: "/admin/packages", label: "Review Queue", badgeCount: pendingPackages },
    { href: "/admin/bookings", label: "Bookings", badgeCount: financeReadyCount },
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
              <div className="flex min-w-max gap-2">
                {adminNav.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="inline-flex items-center gap-2 rounded-full border border-[#ecd9c2] bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-orange-200 hover:bg-[#fff7ef] hover:text-orange-600"
                  >
                    {item.label}
                    {item.badgeCount > 0 && (
                      <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-orange-500 px-1.5 py-0.5 text-[11px] font-semibold leading-none text-white">
                        {item.badgeCount > 99 ? "99+" : item.badgeCount}
                      </span>
                    )}
                  </Link>
                ))}
              </div>
            </nav>
          </div>
        </div>
      </header>
      {children}
    </div>
  )
}
