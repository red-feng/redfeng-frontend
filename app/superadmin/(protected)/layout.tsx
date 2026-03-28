import { redirect } from "next/navigation"
import SignOutButton from "@/app/components/SignOutButton"
import AdminNavLinks from "@/app/components/AdminNavLinks"
import { formatAdminCode } from "@/lib/merchant-code"
import { createClient } from "@/lib/supabase/server"

export default async function SuperadminProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/superadmin/login")
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (!profile) {
    redirect("/superadmin/login")
  }

  if (profile.role === "merchant") {
    redirect("/merchant/dashboard")
  }

  if (profile.role === "admin" || profile.role === "operations_manager") {
    redirect("/admin/dashboard")
  }

  if (profile.role === "finance" || profile.role === "finance_manager") {
    redirect("/finance/dashboard")
  }

  if (profile.role !== "superadmin") {
    redirect("/superadmin/login")
  }

  const navItems = [
    { href: "/superadmin/dashboard", label: "Dashboard", badgeCount: 0 },
    {
      label: "Manager Views",
      children: [
        { href: "/superadmin/operations-manager", label: "Ops Manager View", badgeCount: 0 },
        { href: "/superadmin/finance-manager", label: "Finance Manager View", badgeCount: 0 },
      ],
    },
    {
      label: "Internal Control",
      children: [
        { href: "/superadmin/team-accounts", label: "Ops Team Accounts", badgeCount: 0 },
        { href: "/superadmin/finance-team-accounts", label: "Finance Team Accounts", badgeCount: 0 },
        { href: "/superadmin/superadmin-accounts", label: "Superadmin Accounts", badgeCount: 0 },
      ],
    },
    { href: "/admin/bookings", label: "Booking Center", badgeCount: 0 },
    { href: "/admin/audit-log", label: "Audit Log", badgeCount: 0 },
  ]

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#fff8f1_0%,#f7f1e8_100%)]">
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
                  Area pengawasan manager, audit lintas tim, dan kontrol internal tertinggi
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
