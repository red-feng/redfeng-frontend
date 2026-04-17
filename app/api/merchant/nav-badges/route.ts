import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import {
  MERCHANT_ACTIVE_PAYOUT_ESCROW_STATUSES,
  MERCHANT_REVIEWED_PACKAGE_BADGE_STATUSES,
  isNewerThan,
  isStatusInSet,
  latestTimestamp,
} from "@/lib/nav-badge-policy"
import { getCommerceChatUnreadBadgeCount } from "@/lib/commerce-chat"

export async function GET() {
  const supabase = await createClient()
  const adminSupabase = createAdminClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { data: merchant } = await supabase
    .from("merchants")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle()

  if (!merchant?.id) {
    return NextResponse.json({ error: "Merchant not found" }, { status: 404 })
  }

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

  const [packageResult, reviewResult, seenStateResult] = await Promise.all([
    adminSupabase.from("packages").select("id, status, reviewed_at").eq("merchant_id", merchant.id),
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
    (seenStateResult.data as Partial<
      Record<"seen_packages_at" | "seen_orders_at" | "seen_calendar_at" | "seen_payout_at" | "seen_review_at", string | null>
    > | null) || null

  const merchantPackages =
    (packageResult.data as Array<{ id: string; status: string | null; reviewed_at: string | null }> | null) || []
  const packageIds = merchantPackages.map((pkg) => pkg.id)

  const packageBadgeCount = merchantPackages.filter((pkg) => {
    if (!isStatusInSet(pkg.status, MERCHANT_REVIEWED_PACKAGE_BADGE_STATUSES)) return false
    return isNewerThan(pkg.reviewed_at, seenState?.seen_packages_at || undefined)
  }).length

  const bookingsResult = packageIds.length
    ? await adminSupabase
        .from("bookings")
        .select(
          "id, created_at, pickup_date, booking_status, payment_status, escrow_status, merchant_arrived_at, merchant_picked_up_at, customer_picked_up_at",
        )
        .in("package_id", packageIds)
    : {
        data: [] as Array<{
          id: string
          created_at: string | null
          pickup_date: string | null
          booking_status: string | null
          payment_status: string | null
          escrow_status: string | null
          merchant_arrived_at: string | null
          merchant_picked_up_at: string | null
          customer_picked_up_at: string | null
        }>,
      }

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
    (booking) =>
      isStatusInSet(booking.booking_status, ["pending"]) &&
      isNewerThan(booking.created_at, seenState?.seen_orders_at || undefined),
  ).length

  const calendarBadgeCount =
    seenState?.seen_calendar_at && seenState.seen_calendar_at.slice(0, 10) === todayJakarta
      ? 0
      : bookings.filter((booking) => booking.pickup_date === tomorrowJakarta).length

  const payoutBadgeCount = bookings.filter((booking) => {
    const eligible =
      isStatusInSet(booking.payment_status, ["paid"]) &&
      isStatusInSet(booking.escrow_status, MERCHANT_ACTIVE_PAYOUT_ESCROW_STATUSES)
    if (!eligible) return false

    return isNewerThan(
      latestTimestamp([
        booking.customer_picked_up_at,
        booking.merchant_picked_up_at,
        booking.merchant_arrived_at,
        booking.created_at,
      ]),
      seenState?.seen_payout_at || undefined,
    )
  }).length

  const reviewBadgeCount =
    ((reviewResult.data as Array<{ id: string; created_at: string | null }> | null) || []).filter((review) =>
      isNewerThan(review.created_at, seenState?.seen_review_at || undefined),
    ).length
  const commerceChatBadgeCount = await getCommerceChatUnreadBadgeCount(adminSupabase, user.id)

  return NextResponse.json({
    badgeCounts: {
      "/merchant/dashboard": 0,
      "/merchant/paket": packageBadgeCount,
      "/merchant/pesanan": orderBadgeCount,
      "/merchant/chat": commerceChatBadgeCount,
      "/merchant/statistik": 0,
      "/merchant/kalender-booking": calendarBadgeCount,
      "/merchant/saldo-payout": payoutBadgeCount,
      "/merchant/review": reviewBadgeCount,
      "/merchant/profil": 0,
    },
  })
}
