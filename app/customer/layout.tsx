import Image from "next/image"
import Link from "next/link"
import { redirect } from "next/navigation"
import MerchantLanguageSwitcher from "@/app/components/MerchantLanguageSwitcher"
import { normalizeLocale } from "@/lib/i18n"
import { getCurrentLocale } from "@/lib/locale"
import { formatCustomerCode } from "@/lib/merchant-code"
import { CUSTOMER_PORTAL_DEFAULT_REDIRECT } from "@/lib/portal-context"
import { isAdminPortalRole, isFinancePortalRole, isMarketingPortalRole } from "@/lib/internal-roles"
import { createAdminClient } from "@/lib/supabase/admin"
import { getCommerceChatUnreadBadgeCount } from "@/lib/commerce-chat"
import { createClient } from "@/lib/supabase/server"
import SignOutButton from "@/app/components/SignOutButton"
import CustomerHeaderNav from "@/app/components/CustomerHeaderNav"
import { ensureCustomerBaselineRole, hasActiveAccountRole } from "@/lib/account-roles"
import { buildAppUrl, getSiteBaseUrl } from "@/lib/site-config"

export default async function CustomerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient("customer")
  const adminSupabase = createAdminClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(CUSTOMER_PORTAL_DEFAULT_REDIRECT)}`)
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle()
  if (!profile) {
    await adminSupabase.from("profiles").upsert({
      id: user.id,
      role: "customer",
    })
    await ensureCustomerBaselineRole(adminSupabase, user.id, "customer_layout_profile_created")
  } else if (profile.role === "merchant") {
    const { data: merchant } = await adminSupabase
      .from("merchants")
      .select("id, verification_status")
      .eq("user_id", user.id)
      .maybeSingle()
    await ensureCustomerBaselineRole(adminSupabase, user.id, "customer_layout_merchant_customer_access")

    if (!merchant?.id || merchant.verification_status === "deleted") {
      await ensureCustomerBaselineRole(adminSupabase, user.id, "customer_layout_stale_merchant_repair")
      const { error: repairError } = await adminSupabase
        .from("profiles")
        .update({ role: "customer" })
        .eq("id", user.id)
        .eq("role", "merchant")

      if (repairError) {
        console.error("[customer/layout] failed to repair stale merchant role", {
          userId: user.id,
          error: repairError.message,
        })
      }
    }
  } else if (profile.role === "superadmin") {
    redirect("/superadmin/login")
  } else if (isAdminPortalRole(profile.role)) {
    redirect("/admin/login")
  } else if (isFinancePortalRole(profile.role)) {
    redirect("/finance/login")
  } else if (isMarketingPortalRole(profile.role)) {
    redirect("/marketing/login")
  } else if (profile.role === "customer") {
    await ensureCustomerBaselineRole(adminSupabase, user.id, "customer_layout_customer_access")
  } else if (profile.role !== "customer") {
    redirect("/login")
  }

  const hasCustomerAccess = await hasActiveAccountRole(adminSupabase, user.id, "customer")
  if (!hasCustomerAccess) {
    redirect("/login")
  }

  const customerCode = formatCustomerCode(user.id)
  const locale = normalizeLocale(await getCurrentLocale())
  const languageLabel = locale === "en" ? "Language" : locale === "zh" ? "语言" : "Bahasa"
  const settingsLabel = locale === "en" ? "Settings" : locale === "zh" ? "设置" : "Pengaturan"
  const accountLabel = locale === "en" ? "Account" : locale === "zh" ? "账户" : "Akun"
  const bookingsLabel = locale === "en" ? "Bookings" : locale === "zh" ? "订单" : "Booking"
  const backToSiteLabel = locale === "en" ? "Back to site" : locale === "zh" ? "返回网站" : "Kembali ke Situs"
  const customerSpaceLabel = locale === "en" ? "Customer Space" : locale === "zh" ? "客户空间" : "Ruang Customer"
  const customerHubTitle = locale === "en" ? "RedFeng customer hub" : locale === "zh" ? "RedFeng 客户中心" : "Pusat customer RedFeng"
  const customerHubBody =
    locale === "en"
      ? "Account, bookings, and preferences in one place."
      : locale === "zh"
        ? "账户、订单和偏好集中在一个地方。"
        : "Akun, booking, dan preferensi dalam satu tempat."
  const languageOptions = [
    { value: "id" as const, label: "Bahasa Indonesia" },
    { value: "en" as const, label: "English" },
    { value: "zh" as const, label: "中文" },
  ]

  const navItems = [
    { href: "/customer", label: accountLabel },
    { href: "/customer/bookings", label: bookingsLabel },
    { href: "/chat", label: locale === "en" ? "Chat" : locale === "zh" ? "聊天" : "Chat", badgeCount: await getCommerceChatUnreadBadgeCount(adminSupabase, user.id) },
    { href: "/customer/settings", label: settingsLabel },
  ]

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#fff8f1_0%,#f7f1e8_38%,#f3eee7_100%)]">
      <header className="sticky top-0 z-40 border-b border-orange-100 bg-white/85 backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-4 py-3 sm:px-6 md:px-10 md:py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3 sm:gap-4">
              <Link href="/customer" className="inline-flex items-center">
                <Image
                  src="/home-assets/logo-redfeng-header.png"
                  alt="RedFeng"
                  width={1536}
                  height={1024}
                  priority
                  className="h-10 w-auto sm:h-11 md:h-12 lg:h-14"
                />
              </Link>
              <div className="hidden h-10 w-px bg-[#ead8c0] lg:block" />
              <div className="min-w-0">
                <p className="inline-flex rounded-full border border-[#ecd9c2] bg-[#fffaf3] px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.28em] text-orange-500">
                  {customerSpaceLabel}
                </p>
                <p className="mt-2 truncate text-sm font-semibold text-slate-950">{customerHubTitle}</p>
                <p className="mt-1 truncate text-[11px] font-semibold uppercase tracking-[0.22em] text-orange-600">{customerCode}</p>
                <p className="hidden text-xs text-slate-500 lg:block">{customerHubBody}</p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <MerchantLanguageSwitcher locale={locale} label={languageLabel} options={languageOptions} />
                <Link
                  href={getSiteBaseUrl()}
                className="hidden rounded-full border border-[#ecd9c2] bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-orange-200 hover:bg-[#fff7ef] hover:text-orange-600 lg:inline-flex"
              >
                {backToSiteLabel}
              </Link>
                <SignOutButton
                  portal="customer"
                  redirectTo={buildAppUrl("/login")}
                className="rounded-full border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 transition hover:border-rose-300 hover:bg-rose-100 sm:px-4"
              />
            </div>
          </div>
          <CustomerHeaderNav items={navItems} />
        </div>
      </header>
      <div className="mx-auto w-full max-w-7xl">{children}</div>
    </div>
  )
}
