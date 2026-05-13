import { redirect } from "next/navigation"
import AdminNavLinks from "@/app/components/AdminNavLinks"
import SignOutButton from "@/app/components/SignOutButton"
import { formatMarketingCode } from "@/lib/merchant-code"
import { buildPortalSessionError } from "@/lib/portal-session"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { getRoleLabel, isMarketingPortalRole } from "@/lib/internal-roles"

export default async function MarketingProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient("marketing")
  const adminSupabase = createAdminClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/marketing/login?error=session-ended")
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (!profile) {
    redirect("/marketing/login?error=no-profile")
  }

  if (!isMarketingPortalRole(profile.role)) {
    redirect(`/marketing/login?error=${encodeURIComponent(buildPortalSessionError("session-changed", profile.role))}`)
  }

  const isMarketingManager = profile.role === "marketing_manager"
  const [{ count: activeSubscribers }, { count: promoCount }, { count: articleCount }] = await Promise.all([
    adminSupabase.from("newsletter_subscribers").select("id", { count: "exact", head: true }).eq("status", "active"),
    adminSupabase.from("marketing_promos").select("id", { count: "exact", head: true }).eq("is_active", true),
    adminSupabase.from("marketing_inspiration_articles").select("id", { count: "exact", head: true }).eq("is_active", true),
  ])

  const navItems = isMarketingManager
    ? [
        { href: "/marketing/dashboard", label: "Dashboard" },
        { href: "/marketing/newsletters", label: "Newsletter", badgeCount: activeSubscribers || 0 },
        { href: "/marketing/promos", label: "Promo Content", badgeCount: promoCount || 0 },
        { href: "/marketing/inspiration", label: "Inspiration Content", badgeCount: articleCount || 0 },
        { href: "/marketing/team-accounts", label: "Team Accounts" },
      ]
    : [
        { href: "/marketing/dashboard", label: "Dashboard" },
        { href: "/marketing/newsletters", label: "Newsletter", badgeCount: activeSubscribers || 0 },
        { href: "/marketing/promos", label: "Promo Content", badgeCount: promoCount || 0 },
        { href: "/marketing/inspiration", label: "Inspiration Content", badgeCount: articleCount || 0 },
      ]

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#fff8f1_0%,#f7f1e8_100%)]">
      <header className="sticky top-0 z-40 border-b border-[#ecd9c2] bg-white/90 backdrop-blur-xl">
        <div className="mx-auto w-full max-w-7xl px-4 py-4 sm:px-8 lg:px-10">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="inline-flex rounded-full border border-[#ecd9c2] bg-[#fffaf3] px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.28em] text-orange-500 sm:px-4">
                  Marketing Workspace
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-950">
                  {isMarketingManager ? "Marketing manager workspace Red Feng" : "Dashboard marketing internal Red Feng"}
                </p>
                <p className="text-xs text-slate-500">
                  Area subscriber newsletter, promo campaign, dan blok inspirasi homepage.
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="inline-flex rounded-full border border-[#ecd9c2] bg-[#fffaf3] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-orange-600">
                    {formatMarketingCode(user.id)}
                  </span>
                  <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-700">
                    {getRoleLabel(profile.role)}
                  </span>
                </div>
              </div>
              <div className="flex w-full items-center gap-2 md:w-auto">
                <SignOutButton
                  portal="marketing"
                  redirectTo="https://app.redfeng.co/marketing/login"
                  className="w-full rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:border-rose-300 hover:bg-rose-100 md:w-auto"
                />
              </div>
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
