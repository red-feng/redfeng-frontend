import Image from "next/image"
import Link from "next/link"
import { redirect } from "next/navigation"
import MerchantNavLinks from "@/app/components/MerchantNavLinks"
import MerchantNavSeenTracker from "@/app/components/MerchantNavSeenTracker"
import RoleAutoRefresh from "@/app/components/RoleAutoRefresh"
import SignOutButton from "@/app/components/SignOutButton"
import MerchantLanguageSwitcher from "@/app/components/MerchantLanguageSwitcher"
import MerchantAdminHelpWidget from "@/app/components/MerchantAdminHelpWidget"
import { formatMerchantLocationLabel } from "@/lib/location-labels"
import { formatMerchantCode } from "@/lib/merchant-code"
import { buildPortalSessionError } from "@/lib/portal-session"
import { createAdminClient } from "@/lib/supabase/admin"
import { getCurrentLocale } from "@/lib/locale"
import { MERCHANT_NAV_SECTION_TO_COLUMN } from "@/lib/merchant-nav-seen"
import {
  MERCHANT_ACTIVE_PAYOUT_ESCROW_STATUSES,
  MERCHANT_REVIEWED_PACKAGE_BADGE_STATUSES,
  isNewerThan,
  isStatusInSet,
  latestTimestamp,
} from "@/lib/nav-badge-policy"
import { getMerchantShellText } from "@/lib/merchant-shell-i18n"
import { createClient } from "@/lib/supabase/server"

export default async function MerchantLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const adminSupabase = createAdminClient()
  const locale = await getCurrentLocale()
  const t = getMerchantShellText(locale)

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/merchant/login?error=session-ended")
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (error || !profile) {
    redirect("/merchant/login?error=no-profile")
  }

  if (profile.role !== "merchant") {
    redirect(`/merchant/login?error=${encodeURIComponent(buildPortalSessionError("session-changed", profile.role))}`)
  }

  const { data: merchant } = await supabase
    .from("merchants")
    .select("id, verification_status, onboarding_completed, brand_name, company_name, city, province")
    .eq("user_id", user.id)
    .single()

  if (!merchant) {
    redirect("/merchant/onboarding")
  }

  if (merchant.verification_status === "pending") {
    redirect("/merchant/pending")
  }

  if (merchant.verification_status === "rejected") {
    redirect("/merchant/rejected")
  }

  if (merchant.verification_status === "inactive") {
    redirect("/merchant/login?blocked=inactive")
  }

  if (merchant.verification_status === "deleted") {
    redirect("/merchant/login?blocked=deleted")
  }

  if (!merchant.onboarding_completed) {
    redirect("/merchant/onboarding")
  }

  const merchantLabel = merchant.brand_name || merchant.company_name || "Merchant"
  const merchantCode = formatMerchantCode(merchant.id)
  const locationLabel = formatMerchantLocationLabel(
    { city: merchant.city, province: merchant.province, country: "Indonesia" },
    locale,
  )
  const todayJakarta = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date())
  const tomorrowJakartaDate = new Date()
  tomorrowJakartaDate.setDate(tomorrowJakartaDate.getDate() + 1)
  const tomorrowJakarta = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(tomorrowJakartaDate)

  const [packageResult, chatRoomsResult, reviewResult, seenStateResult] = await Promise.all([
    adminSupabase
      .from("packages")
      .select("id, status, reviewed_at")
      .eq("merchant_id", merchant.id),
    adminSupabase
      .from("package_chat_rooms")
      .select("id, last_message_at, last_message_sender_id, merchant_last_read_at")
      .eq("merchant_user_id", user.id)
      .order("updated_at", { ascending: false }),
    adminSupabase
      .from("package_reviews")
      .select("id, created_at, packages!inner(merchant_id)")
      .eq("packages.merchant_id", merchant.id)
      .order("created_at", { ascending: false }),
    adminSupabase
      .from("merchant_nav_seen_states")
      .select("seen_packages_at, seen_orders_at, seen_calendar_at, seen_payout_at, seen_review_at")
      .eq("merchant_user_id", user.id)
      .maybeSingle(),
  ])

  const seenState =
    (seenStateResult.data as Partial<Record<(typeof MERCHANT_NAV_SECTION_TO_COLUMN)[keyof typeof MERCHANT_NAV_SECTION_TO_COLUMN], string | null>> | null) ||
    null
  const seenPackagesAt = seenState?.seen_packages_at || undefined
  const seenOrdersAt = seenState?.seen_orders_at || undefined
  const seenCalendarAt = seenState?.seen_calendar_at || undefined
  const seenPayoutAt = seenState?.seen_payout_at || undefined
  const seenReviewAt = seenState?.seen_review_at || undefined

  const merchantPackages = (packageResult.data as Array<{ id: string; status: string | null; reviewed_at: string | null }> | null) || []
  const packageIds = merchantPackages.map((pkg) => pkg.id)
  const packageBadgeCount = merchantPackages.filter((pkg) => {
    if (!isStatusInSet(pkg.status, MERCHANT_REVIEWED_PACKAGE_BADGE_STATUSES)) return false
    return isNewerThan(pkg.reviewed_at, seenPackagesAt)
  }).length

  const bookingsResult = packageIds.length
    ? await adminSupabase
        .from("bookings")
        .select("id, created_at, pickup_date, booking_status, payment_status, escrow_status, merchant_arrived_at, merchant_picked_up_at, customer_picked_up_at")
        .in("package_id", packageIds)
    : { data: [] as Array<{ id: string; created_at: string | null; pickup_date: string | null; booking_status: string | null; payment_status: string | null; escrow_status: string | null; merchant_arrived_at: string | null; merchant_picked_up_at: string | null; customer_picked_up_at: string | null }> }

  const bookings =
    (bookingsResult.data as Array<{
      id: string
      created_at: string | null
      pickup_date: string | null
      booking_status: string | null
      payment_status: string | null
      escrow_status: string | null
      merchant_arrived_at: string | null
      merchant_picked_up_at: string | null
      customer_picked_up_at: string | null
    }> | null) || []

  const orderBadgeCount = bookings.filter(
    (booking) => isStatusInSet(booking.booking_status, ["pending"]) && isNewerThan(booking.created_at, seenOrdersAt),
  ).length

  const calendarBadgeCount =
    seenCalendarAt && seenCalendarAt.slice(0, 10) === todayJakarta
      ? 0
      : bookings.filter((booking) => booking.pickup_date === tomorrowJakarta).length

  const payoutBadgeCount = bookings.filter((booking) => {
    const eligible = isStatusInSet(booking.payment_status, ["paid"]) && isStatusInSet(booking.escrow_status, MERCHANT_ACTIVE_PAYOUT_ESCROW_STATUSES)
    if (!eligible) return false

    return isNewerThan(
      latestTimestamp([
        booking.customer_picked_up_at,
        booking.merchant_picked_up_at,
        booking.merchant_arrived_at,
        booking.created_at,
      ]),
      seenPayoutAt,
    )
  }).length

  const chatBadgeCount = (((chatRoomsResult.data as Array<{
    id: string
    last_message_at: string | null
    last_message_sender_id: string | null
    merchant_last_read_at: string | null
  }> | null) || []).filter((room) => {
    if (!room.last_message_sender_id || room.last_message_sender_id === user.id) return false
    if (!room.last_message_at) return false
    if (!room.merchant_last_read_at) return true
    return room.last_message_at > room.merchant_last_read_at
  })).length

  const reviewBadgeCount =
    ((reviewResult.data as Array<{ id: string; created_at: string | null }> | null) || []).filter((review) =>
      isNewerThan(review.created_at, seenReviewAt),
    ).length

  const merchantNav = [
    { href: "/merchant/dashboard", label: t.nav.dashboard, badgeCount: 0 },
    { href: "/merchant/paket", label: t.nav.packages, badgeCount: packageBadgeCount },
    { href: "/merchant/pesanan", label: t.nav.orders, badgeCount: orderBadgeCount },
    { href: "/merchant/statistik", label: t.nav.statistics, badgeCount: 0 },
    { href: "/merchant/chat", label: t.nav.chat, badgeCount: chatBadgeCount },
    { href: "/merchant/kalender-booking", label: t.nav.calendar, badgeCount: calendarBadgeCount },
    { href: "/merchant/saldo-payout", label: t.nav.payout, badgeCount: payoutBadgeCount },
    { href: "/merchant/review", label: t.nav.review, badgeCount: reviewBadgeCount },
    { href: "/merchant/profil", label: t.nav.profile, badgeCount: 0 },
  ]

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#fff8f1_0%,#f7f1e8_38%,#f3eee7_100%)]">
      <MerchantNavSeenTracker />
      <RoleAutoRefresh
        intervalMs={30000}
        excludeOnPaths={["/merchant/chat"]}
        realtimeTables={["package_chat_rooms", "package_chat_messages"]}
        realtimeDelayMs={220}
        disableOnMobile
      />
      <header className="sticky top-0 z-40 border-b border-[#ecd9c2] bg-white/90 backdrop-blur-xl">
        <div className="mx-auto w-full max-w-[1480px] px-4 py-4 sm:px-6 md:px-8 xl:px-10">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-3 sm:gap-4">
                <Link href="/merchant/dashboard" className="inline-flex items-center">
                  <Image
                    src="/logo-redfeng.png"
                    alt="Red Feng"
                    width={220}
                    height={64}
                    priority
                    className="h-10 w-auto sm:h-12 md:h-14"
                  />
                </Link>

                <div className="hidden h-10 w-px bg-[#ead8c0] lg:block" />

                <div className="hidden lg:block">
                  <p className="inline-flex rounded-full border border-[#ecd9c2] bg-[#fffaf3] px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.28em] text-orange-500">
                    {t.suiteBadge}
                  </p>
                  <p className="mt-2 text-sm font-semibold text-slate-950">{merchantLabel}</p>
                  <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-orange-600">{merchantCode}</p>
                  <p className="text-xs text-slate-500">{locationLabel}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <div className="rounded-full border border-[#ecd9c2] bg-[#fffaf3] px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">
                  {t.merchantBadge}
                </div>
                <MerchantLanguageSwitcher
                  locale={locale}
                  label={t.languageLabel}
                  options={[
                    { value: "id", label: t.langId },
                    { value: "en", label: t.langEn },
                    { value: "zh", label: t.langZh },
                  ]}
                />
                <Link
                  href="/"
                  className="rounded-full border border-[#ecd9c2] bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-orange-200 hover:text-orange-600"
                >
                  {t.viewSite}
                </Link>
                <SignOutButton
                  label={t.logout}
                  redirectTo="https://app.redfeng.co/merchant/login"
                  className="rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:border-rose-300 hover:bg-rose-100"
                />
              </div>
            </div>

            <nav className="overflow-x-auto pb-1">
              <MerchantNavLinks items={merchantNav} />
            </nav>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-[1480px] px-0 sm:px-2 xl:px-4">{children}</div>
      <MerchantAdminHelpWidget locale={locale} merchantLabel={merchantLabel} merchantCode={merchantCode} />
    </div>
  )
}
