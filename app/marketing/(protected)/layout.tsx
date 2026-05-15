import { redirect } from "next/navigation"
import AdminSidebarShell from "@/app/components/AdminSidebarShell"
import { getInternalChatUnreadBadgeCount } from "@/lib/internal-chat/badge"
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
    { count: transactionPromoCount },
    { count: articleCount },
    { count: draftLikeInactivePromos },
    { count: queuedTransactionPromos },
    { count: draftLikeInactiveArticles },
    { count: draftCampaignCount },
    { count: approvedCampaignCount },
    internalChatUnreadBadgeCount,
  ] = await Promise.all([
    adminSupabase.from("newsletter_subscribers").select("id", { count: "exact", head: true }).eq("status", "active"),
    adminSupabase.from("marketing_promos").select("id", { count: "exact", head: true }).eq("is_active", true),
    adminSupabase.from("transaction_promo_rules").select("id", { count: "exact", head: true }).eq("status", "active"),
    adminSupabase.from("marketing_inspiration_articles").select("id", { count: "exact", head: true }).eq("is_active", true),
    adminSupabase.from("marketing_promos").select("id", { count: "exact", head: true }).eq("is_active", false),
    adminSupabase.from("transaction_promo_rules").select("id", { count: "exact", head: true }).in("status", ["draft", "approved"]),
    adminSupabase.from("marketing_inspiration_articles").select("id", { count: "exact", head: true }).eq("is_active", false),
    adminSupabase.from("marketing_newsletter_campaigns").select("id", { count: "exact", head: true }).eq("status", "draft"),
    adminSupabase.from("marketing_newsletter_campaigns").select("id", { count: "exact", head: true }).eq("status", "approved"),
    getInternalChatUnreadBadgeCount(adminSupabase, user.id),
  ])

  const navItems = isMarketingManager
    ? [
        { label: "Ringkasan" },
        { href: "/marketing/dashboard", label: "Dashboard", badgeCount: 0 },
        { label: "Audience" },
        { href: "/marketing/newsletters", label: "Newsletter Audience", badgeCount: activeSubscribers || 0 },
        { label: "Campaign" },
        {
          href: "/marketing/email-campaigns",
          label: "Email Campaigns",
          badgeCount: draftCampaignCount || 0,
          secondaryBadgeCount: approvedCampaignCount || 0,
        },
        { href: "/marketing/promos", label: "Promo Content", badgeCount: promoCount || 0, secondaryBadgeCount: draftLikeInactivePromos || 0 },
        {
          href: "/marketing/transaction-promos",
          label: "Transaction Promos",
          badgeCount: transactionPromoCount || 0,
          secondaryBadgeCount: queuedTransactionPromos || 0,
        },
        { href: "/marketing/promo-analytics", label: "Promo Analytics" },
        {
          href: "/marketing/inspiration",
          label: "Inspiration Content",
          badgeCount: articleCount || 0,
          secondaryBadgeCount: draftLikeInactiveArticles || 0,
        },
        { href: "/marketing/internal-chat", label: "Internal Chat", badgeCount: internalChatUnreadBadgeCount },
        { label: "Sistem" },
        { href: "/marketing/team-accounts", label: "Team Accounts" },
      ]
    : [
        { label: "Ringkasan" },
        { href: "/marketing/dashboard", label: "Dashboard", badgeCount: 0 },
        { label: "Audience" },
        { href: "/marketing/newsletters", label: "Newsletter Audience", badgeCount: activeSubscribers || 0 },
        { label: "Campaign" },
        {
          href: "/marketing/email-campaigns",
          label: "Email Campaigns",
          badgeCount: draftCampaignCount || 0,
          secondaryBadgeCount: approvedCampaignCount || 0,
        },
        { href: "/marketing/promos", label: "Promo Content", badgeCount: promoCount || 0, secondaryBadgeCount: draftLikeInactivePromos || 0 },
        {
          href: "/marketing/transaction-promos",
          label: "Transaction Promos",
          badgeCount: transactionPromoCount || 0,
          secondaryBadgeCount: queuedTransactionPromos || 0,
        },
        { href: "/marketing/promo-analytics", label: "Promo Analytics" },
        {
          href: "/marketing/inspiration",
          label: "Inspiration Content",
          badgeCount: articleCount || 0,
          secondaryBadgeCount: draftLikeInactiveArticles || 0,
        },
        { href: "/marketing/internal-chat", label: "Internal Chat", badgeCount: internalChatUnreadBadgeCount },
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
