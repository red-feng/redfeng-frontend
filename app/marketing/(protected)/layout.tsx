import { redirect } from "next/navigation"
import AdminSidebarShell from "@/app/components/AdminSidebarShell"
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
  const [
    { count: activeSubscribers },
    { count: promoCount },
    { count: articleCount },
    { count: draftLikeInactivePromos },
    { count: draftLikeInactiveArticles },
  ] = await Promise.all([
    adminSupabase.from("newsletter_subscribers").select("id", { count: "exact", head: true }).eq("status", "active"),
    adminSupabase.from("marketing_promos").select("id", { count: "exact", head: true }).eq("is_active", true),
    adminSupabase.from("marketing_inspiration_articles").select("id", { count: "exact", head: true }).eq("is_active", true),
    adminSupabase.from("marketing_promos").select("id", { count: "exact", head: true }).eq("is_active", false),
    adminSupabase.from("marketing_inspiration_articles").select("id", { count: "exact", head: true }).eq("is_active", false),
  ])

  const navItems = isMarketingManager
    ? [
        { label: "Overview" },
        { href: "/marketing/dashboard", label: "Dashboard", badgeCount: 0 },
        { label: "Audience" },
        { href: "/marketing/newsletters", label: "Newsletter", badgeCount: activeSubscribers || 0 },
        { label: "Campaign" },
        { href: "/marketing/promos", label: "Promo Content", badgeCount: promoCount || 0, secondaryBadgeCount: draftLikeInactivePromos || 0 },
        {
          href: "/marketing/inspiration",
          label: "Inspiration Content",
          badgeCount: articleCount || 0,
          secondaryBadgeCount: draftLikeInactiveArticles || 0,
        },
        { label: "System" },
        { href: "/marketing/team-accounts", label: "Team Accounts" },
      ]
    : [
        { label: "Overview" },
        { href: "/marketing/dashboard", label: "Dashboard", badgeCount: 0 },
        { label: "Audience" },
        { href: "/marketing/newsletters", label: "Newsletter", badgeCount: activeSubscribers || 0 },
        { label: "Campaign" },
        { href: "/marketing/promos", label: "Promo Content", badgeCount: promoCount || 0, secondaryBadgeCount: draftLikeInactivePromos || 0 },
        {
          href: "/marketing/inspiration",
          label: "Inspiration Content",
          badgeCount: articleCount || 0,
          secondaryBadgeCount: draftLikeInactiveArticles || 0,
        },
      ]

  return (
    <div className="min-h-screen bg-[#f4f7fb]">
      <AdminSidebarShell
        adminCode={formatMarketingCode(user.id)}
        isOperationsManager={false}
        items={navItems}
        portal="marketing"
        roleLabel={getRoleLabel(profile.role)}
        showFullBrand
      >
        {children}
      </AdminSidebarShell>
    </div>
  )
}
