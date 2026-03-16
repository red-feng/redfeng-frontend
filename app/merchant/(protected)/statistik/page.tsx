import Link from "next/link"
import { createAdminClient } from "@/lib/supabase/admin"
import { type Locale, normalizeLocale } from "@/lib/i18n"
import { getCurrentLocale } from "@/lib/locale"
import { createClient } from "@/lib/supabase/server"

type StatsBookingRow = {
  id: string
  created_at: string | null
  total_amount: number | null
  payment_status: string | null
  booking_status: string | null
  package_id: string | null
}

function getStatisticsText(locale: Locale) {
  const dict = {
    id: {
      merchantMissing: "Data merchant tidak ditemukan.",
      heroBadge: "Merchant Statistics",
      heroTitle: "Statistik performa merchant yang bisa langsung dipakai.",
      heroDescription: "Pantau revenue, funnel traffic ke booking, kesehatan pembayaran, performa paket, dan kualitas customer experience dalam satu dashboard analytics.",
      managePackages: "Kelola paket",
      openOrders: "Buka pesanan",
      loadError: "Gagal memuat statistik merchant.",
    },
    en: {
      merchantMissing: "Merchant data not found.",
      heroBadge: "Merchant Statistics",
      heroTitle: "Merchant performance statistics you can use right away.",
      heroDescription: "Monitor revenue, traffic-to-booking funnel, payment health, package performance, and customer experience quality in one analytics dashboard.",
      managePackages: "Manage packages",
      openOrders: "Open orders",
      loadError: "Failed to load merchant statistics.",
    },
    zh: {
      merchantMissing: "未找到商家数据。",
      heroBadge: "商家统计",
      heroTitle: "可直接使用的商家表现统计。",
      heroDescription: "在一个分析面板中查看营收、流量到预订漏斗、付款健康度、套餐表现以及客户体验质量。",
      managePackages: "管理套餐",
      openOrders: "查看订单",
      loadError: "加载商家统计失败。",
    },
  } satisfies Record<Locale, Record<string, string>>

  return dict[locale]
}

type PackageRow = {
  id: string
  title: string | null
  status: string | null
  created_at?: string | null
}

type PackageViewRow = {
  package_id: string
  viewed_at?: string | null
}

type ReviewRow = {
  rating: number | null
}

type PeriodKey = "7d" | "30d" | "90d" | "6m"

const periodOptions: { key: PeriodKey; label: string; days: number }[] = [
  { key: "7d", label: "7 hari", days: 7 },
  { key: "30d", label: "30 hari", days: 30 },
  { key: "90d", label: "90 hari", days: 90 },
  { key: "6m", label: "6 bulan", days: 180 },
]

function formatMoney(value: number) {
  return `Rp ${value.toLocaleString("id-ID")}`
}

function normalizeStatus(value: string | null) {
  return (value || "").trim().toLowerCase()
}

function formatPercent(value: number) {
  return `${value.toFixed(1)}%`
}

function formatMonthLabel(date: Date) {
  return date.toLocaleDateString("id-ID", {
    month: "short",
    year: "2-digit",
  })
}

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
}

function isRevenueBooking(booking: StatsBookingRow) {
  const paymentStatus = normalizeStatus(booking.payment_status)
  const bookingStatus = normalizeStatus(booking.booking_status)
  return (
    paymentStatus === "paid" ||
    bookingStatus === "confirmed" ||
    bookingStatus === "completed" ||
    bookingStatus === "awaiting_admin_handoff" ||
    bookingStatus === "finance_review" ||
    bookingStatus === "payout_completed"
  )
}

function titleCaseStatus(value: string | null) {
  const normalized = normalizeStatus(value)
  if (!normalized) return "-"

  return normalized
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

function findMostCommonStatus(bookings: StatsBookingRow[]) {
  const counts = new Map<string, number>()

  for (const booking of bookings) {
    const status = normalizeStatus(booking.booking_status)
    if (!status) continue
    counts.set(status, (counts.get(status) || 0) + 1)
  }

  let topStatus = ""
  let topCount = 0

  for (const [status, count] of counts.entries()) {
    if (count > topCount) {
      topStatus = status
      topCount = count
    }
  }

  return topStatus || "-"
}

function resolvePeriod(raw: string | string[] | undefined): PeriodKey {
  const value = Array.isArray(raw) ? raw[0] : raw
  return periodOptions.some((option) => option.key === value) ? (value as PeriodKey) : "30d"
}

function isWithinDays(dateStr: string | null | undefined, days: number, endDate: Date) {
  if (!dateStr) return false
  const date = new Date(dateStr)
  if (Number.isNaN(date.getTime())) return false
  const start = new Date(endDate)
  start.setHours(23, 59, 59, 999)
  start.setDate(start.getDate() - (days - 1))
  start.setHours(0, 0, 0, 0)
  return date >= start && date <= endDate
}

function compareDelta(current: number, previous: number) {
  if (previous === 0 && current === 0) return { label: "stabil", tone: "text-slate-500" }
  if (previous === 0) return { label: "+100%", tone: "text-emerald-700" }
  const delta = ((current - previous) / previous) * 100
  const tone = delta >= 0 ? "text-emerald-700" : "text-rose-700"
  const prefix = delta >= 0 ? "+" : ""
  return { label: `${prefix}${delta.toFixed(1)}%`, tone }
}

export default async function MerchantStatisticsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = (await searchParams) || {}
  const locale = normalizeLocale(await getCurrentLocale())
  const t = getStatisticsText(locale)
  const selectedPeriod = resolvePeriod(params.period)
  const selectedPeriodMeta = periodOptions.find((option) => option.key === selectedPeriod) || periodOptions[1]
  const previousEndDate = new Date()
  previousEndDate.setDate(previousEndDate.getDate() - selectedPeriodMeta.days)
  const supabase = await createClient()
  const adminSupabase = createAdminClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data: merchant } = await adminSupabase
    .from("merchants")
    .select("id, brand_name, company_name")
    .eq("user_id", user.id)
    .single()

  if (!merchant) {
    return <div className="p-10">{t.merchantMissing}</div>
  }

  const [
    { data: packagesData, error: packagesError },
  ] = await Promise.all([
    adminSupabase
      .from("packages")
      .select("id, title, status, created_at")
      .eq("merchant_id", merchant.id)
      .order("created_at", { ascending: false }),
  ])

  const packages = (packagesData as PackageRow[] | null) || []
  const packageIds = packages.map((pkg) => pkg.id)

  const emptyAnalyticsState = {
    bookings: [] as StatsBookingRow[],
    packageViews: [] as PackageViewRow[],
    reviews: [] as ReviewRow[],
    bookingsError: null as { message?: string } | null,
    packageViewsError: null as { message?: string } | null,
    reviewsError: null as { message?: string } | null,
  }

  const analyticsState =
    packageIds.length === 0
      ? emptyAnalyticsState
      : await (async () => {
          const [{ data: bookingsData, error: bookingsError }, packageViewsResult, reviewsResult] = await Promise.all([
            adminSupabase
              .from("bookings")
              .select("id, created_at, total_amount, payment_status, booking_status, package_id")
              .in("package_id", packageIds)
              .order("created_at", { ascending: false }),
            adminSupabase.from("package_views").select("package_id, viewed_at").in("package_id", packageIds),
            adminSupabase.from("package_reviews").select("rating").in("package_id", packageIds),
          ])

          return {
            bookings: (bookingsData as StatsBookingRow[] | null) || [],
            packageViews: packageViewsResult.error ? [] : (packageViewsResult.data as PackageViewRow[] | null) || [],
            reviews: reviewsResult.error ? [] : (reviewsResult.data as ReviewRow[] | null) || [],
            bookingsError,
            packageViewsError: packageViewsResult.error,
            reviewsError: reviewsResult.error,
          }
        })()

  const bookings = analyticsState.bookings
  const packageViews = analyticsState.packageViews
  const reviews = analyticsState.reviews
  const error = packagesError || analyticsState.bookingsError
  const analyticsWarnings = [analyticsState.packageViewsError, analyticsState.reviewsError].filter(Boolean)

  const filteredBookings = bookings.filter((booking) => isWithinDays(booking.created_at, selectedPeriodMeta.days, new Date()))
  const filteredViews = packageViews.filter((view) => isWithinDays(view.viewed_at, selectedPeriodMeta.days, new Date()))
  const filteredReviews = reviews

  const previousBookings = bookings.filter((booking) => isWithinDays(booking.created_at, selectedPeriodMeta.days, previousEndDate))
  const previousViews = packageViews.filter((view) => isWithinDays(view.viewed_at, selectedPeriodMeta.days, previousEndDate))

  const revenueBookings = filteredBookings.filter(isRevenueBooking)
  const totalBookings = filteredBookings.length
  const totalRevenue = revenueBookings.reduce((sum, booking) => sum + (booking.total_amount ?? 0), 0)
  const totalVisitors = filteredViews.length
  const conversionRate = totalVisitors > 0 ? (totalBookings / totalVisitors) * 100 : 0

  const pendingPaymentCount = filteredBookings.filter((booking) => {
    const status = normalizeStatus(booking.payment_status)
    return status === "pending" || status === "dp_paid"
  }).length

  const confirmedTripCount = filteredBookings.filter((booking) => {
    const status = normalizeStatus(booking.booking_status)
    return ["confirmed", "awaiting_admin_handoff", "finance_review", "payout_completed", "completed"].includes(status)
  }).length

  const cancelledBookingCount = filteredBookings.filter(
    (booking) => normalizeStatus(booking.booking_status) === "cancelled",
  ).length

  const averageOrderValue = revenueBookings.length > 0 ? totalRevenue / revenueBookings.length : 0
  const averageRating =
    filteredReviews.length > 0
      ? filteredReviews.reduce((sum, review) => sum + (review.rating ?? 0), 0) / filteredReviews.length
      : 0

  const activePackages = packages.filter((pkg) => normalizeStatus(pkg.status) === "approved").length
  const draftPackages = packages.filter((pkg) => normalizeStatus(pkg.status) === "draft").length
  const pendingPackages = packages.filter((pkg) => normalizeStatus(pkg.status) === "pending").length

  const packageStats = new Map<
    string,
    { title: string; bookings: number; revenue: number; paidBookings: number; views: number }
  >()

  for (const pkg of packages) {
    packageStats.set(pkg.id, {
      title: pkg.title || "Paket tanpa judul",
      bookings: 0,
      revenue: 0,
      paidBookings: 0,
      views: 0,
    })
  }

  for (const booking of filteredBookings) {
    const packageId = booking.package_id || booking.id
    const packageTitle = packageStats.get(packageId)?.title || "Paket tidak ditemukan"
    const current = packageStats.get(packageId) || {
      title: packageTitle,
      bookings: 0,
      revenue: 0,
      paidBookings: 0,
      views: 0,
    }

    current.bookings += 1
    if (isRevenueBooking(booking)) {
      current.revenue += booking.total_amount ?? 0
      current.paidBookings += 1
    }

    packageStats.set(packageId, current)
  }

  for (const view of filteredViews) {
    const current = packageStats.get(view.package_id) || {
      title: "Paket tidak ditemukan",
      bookings: 0,
      revenue: 0,
      paidBookings: 0,
      views: 0,
    }
    current.views += 1
    packageStats.set(view.package_id, current)
  }

  const topPackages = Array.from(packageStats.entries())
    .map(([packageId, stats]) => ({
      packageId,
      ...stats,
      conversion: stats.views > 0 ? (stats.bookings / stats.views) * 100 : 0,
    }))
    .sort((a, b) => {
      if (b.revenue !== a.revenue) return b.revenue - a.revenue
      if (b.bookings !== a.bookings) return b.bookings - a.bookings
      return b.views - a.views
    })
    .slice(0, 5)

  const topViewedPackage = Array.from(packageStats.values()).sort((a, b) => b.views - a.views)[0] || null
  const lowConversionHighViewPackage =
    Array.from(packageStats.values())
      .filter((pkg) => pkg.views >= 3 && pkg.bookings === 0)
      .sort((a, b) => b.views - a.views)[0] || null
  const packagesWithoutViews = Array.from(packageStats.values()).filter((pkg) => pkg.views === 0).length

  const now = new Date()
  const monthBuckets = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1)
    return {
      key: monthKey(date),
      label: formatMonthLabel(date),
      bookings: 0,
      revenue: 0,
      views: 0,
    }
  })
  const bucketMap = new Map(monthBuckets.map((bucket) => [bucket.key, bucket]))

  for (const booking of filteredBookings) {
    if (!booking.created_at) continue
    const date = new Date(booking.created_at)
    if (Number.isNaN(date.getTime())) continue
    const bucket = bucketMap.get(monthKey(date))
    if (!bucket) continue
    bucket.bookings += 1
    if (isRevenueBooking(booking)) {
      bucket.revenue += booking.total_amount ?? 0
    }
  }

  for (const view of filteredViews) {
    if (!view.viewed_at) continue
    const date = new Date(view.viewed_at)
    if (Number.isNaN(date.getTime())) continue
    const bucket = bucketMap.get(monthKey(date))
    if (!bucket) continue
    bucket.views += 1
  }

  const maxRevenue = Math.max(...monthBuckets.map((bucket) => bucket.revenue), 1)
  const metricCards = [
    {
      label: "Total revenue",
      value: formatMoney(totalRevenue),
      note: `${revenueBookings.length} booking menghasilkan revenue dalam ${selectedPeriodMeta.label}`,
    },
    {
      label: "Total booking",
      value: String(totalBookings),
      note: `${confirmedTripCount} booking confirmed/completed`,
    },
    {
      label: "Conversion rate",
      value: formatPercent(conversionRate),
      note: `${totalBookings} booking dari ${totalVisitors} total view paket`,
    },
    {
      label: "Average order value",
      value: formatMoney(averageOrderValue),
      note: "Rata-rata nilai booking yang berhasil menghasilkan revenue",
    },
  ]

  const metricDeltas = {
    revenue: compareDelta(
      totalRevenue,
      previousBookings.filter(isRevenueBooking).reduce((sum, booking) => sum + (booking.total_amount ?? 0), 0),
    ),
    bookings: compareDelta(totalBookings, previousBookings.length),
    visitors: compareDelta(totalVisitors, previousViews.length),
  }

  const healthCards = [
    { label: "Menunggu pembayaran", value: String(pendingPaymentCount), tone: "text-amber-700" },
    { label: "Trip terkonfirmasi", value: String(confirmedTripCount), tone: "text-emerald-700" },
    { label: "Booking dibatalkan", value: String(cancelledBookingCount), tone: "text-rose-700" },
    {
      label: "Rating customer",
      value: filteredReviews.length > 0 ? averageRating.toFixed(1) : "-",
      tone: "text-orange-700",
    },
  ]
  const dominantBookingStatus = titleCaseStatus(findMostCommonStatus(filteredBookings))

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fff8f1_0%,#f7f1e8_38%,#f3eee7_100%)] px-6 py-8 md:px-8 lg:px-10">
      <div className="mx-auto max-w-7xl space-y-8">
        <section className="overflow-hidden rounded-[36px] border border-orange-200/60 bg-[linear-gradient(135deg,#7c2d12_0%,#c2410c_34%,#f97316_68%,#fdba74_100%)] px-8 py-9 text-white shadow-[0_36px_110px_rgba(146,64,14,0.18)] sm:px-10 lg:px-12">
          <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
            <div>
              <span className="inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.34em] text-orange-50">
                {t.heroBadge}
              </span>
              <h1 className="mt-5 text-4xl font-semibold tracking-tight sm:text-5xl">
                {t.heroTitle}
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-8 text-orange-50/92">
                {t.heroDescription}
              </p>
            </div>

            <div className="grid gap-4">
              <div className="rounded-[28px] border border-white/18 bg-slate-950/16 p-6 backdrop-blur">
                <p className="text-[11px] uppercase tracking-[0.32em] text-orange-100/80">Business snapshot</p>
                <p className="mt-4 text-3xl font-semibold text-white">
                  {merchant.brand_name || merchant.company_name || "Merchant"}
                </p>
                <p className="mt-2 text-sm leading-7 text-orange-50/85">
                  Statistik periode {selectedPeriodMeta.label.toLowerCase()} ini dihitung dari booking, package
                  views, dan review yang terkait langsung dengan merchant Anda.
                </p>
              </div>

              <div className="rounded-[28px] border border-white/18 bg-white/10 p-6 backdrop-blur">
                <p className="text-[11px] uppercase tracking-[0.32em] text-orange-100/80">Quick actions</p>
                <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-orange-50/80">
                  {periodOptions.map((option) => (
                    <Link
                      key={option.key}
                      href={`/merchant/statistik?period=${option.key}`}
                      className={`rounded-full border px-3 py-2 transition ${
                        option.key === selectedPeriod
                          ? "border-white/40 bg-white/15 text-white"
                          : "border-white/18 bg-white/5 text-orange-50/75 hover:bg-white/10"
                      }`}
                    >
                      {option.label}
                    </Link>
                  ))}
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <Link
                    href="/merchant/paket"
                    className="rounded-[18px] border border-white/18 bg-white/10 px-4 py-3 text-sm font-medium text-orange-50 transition hover:bg-white/15"
                  >
                     {t.managePackages}
                  </Link>
                  <Link
                    href="/merchant/pesanan"
                    className="rounded-[18px] border border-white/18 bg-white/10 px-4 py-3 text-sm font-medium text-orange-50 transition hover:bg-white/15"
                  >
                     {t.openOrders}
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {error ? (
          <div className="rounded-[24px] border border-red-200 bg-red-50 p-5 text-red-700">
              {t.loadError}
          </div>
        ) : (
          <>
            {analyticsWarnings.length > 0 ? (
              <div className="rounded-[24px] border border-amber-200 bg-amber-50 p-5 text-amber-800">
                Beberapa data analytics tambahan belum tersedia di production. Statistik utama tetap dihitung dari
                data paket dan booking merchant.
              </div>
            ) : null}
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {metricCards.map((card) => (
                <article
                  key={card.label}
                  className="rounded-[28px] border border-orange-100 bg-white p-6 shadow-[0_18px_60px_rgba(15,23,42,0.06)]"
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.26em] text-slate-500">{card.label}</p>
                  <p className="mt-4 text-4xl font-semibold tracking-tight text-slate-950">{card.value}</p>
                  <p className="mt-3 text-sm leading-7 text-slate-600">{card.note}</p>
                  {card.label === "Total revenue" ? (
                    <p className={`mt-3 text-xs font-semibold uppercase tracking-[0.18em] ${metricDeltas.revenue.tone}`}>
                      vs periode sebelumnya {metricDeltas.revenue.label}
                    </p>
                  ) : null}
                  {card.label === "Total booking" ? (
                    <p className={`mt-3 text-xs font-semibold uppercase tracking-[0.18em] ${metricDeltas.bookings.tone}`}>
                      vs periode sebelumnya {metricDeltas.bookings.label}
                    </p>
                  ) : null}
                  {card.label === "Conversion rate" ? (
                    <p className={`mt-3 text-xs font-semibold uppercase tracking-[0.18em] ${metricDeltas.visitors.tone}`}>
                      trafik paket {metricDeltas.visitors.label}
                    </p>
                  ) : null}
                </article>
              ))}
            </section>

            <section className="grid gap-4 xl:grid-cols-4">
              <article className="rounded-[28px] border border-orange-100 bg-white p-6 shadow-[0_18px_60px_rgba(15,23,42,0.06)]">
                <p className="text-xs font-semibold uppercase tracking-[0.26em] text-slate-500">Paket aktif</p>
                <p className="mt-4 text-4xl font-semibold tracking-tight text-slate-950">{activePackages}</p>
                <p className="mt-3 text-sm leading-7 text-slate-600">Listing siap jual yang bisa langsung menerima booking.</p>
              </article>
              <article className="rounded-[28px] border border-orange-100 bg-white p-6 shadow-[0_18px_60px_rgba(15,23,42,0.06)]">
                <p className="text-xs font-semibold uppercase tracking-[0.26em] text-slate-500">Draft paket</p>
                <p className="mt-4 text-4xl font-semibold tracking-tight text-slate-950">{draftPackages}</p>
                <p className="mt-3 text-sm leading-7 text-slate-600">Paket belum selesai yang masih bisa dioptimasi sebelum diajukan.</p>
              </article>
              <article className="rounded-[28px] border border-orange-100 bg-white p-6 shadow-[0_18px_60px_rgba(15,23,42,0.06)]">
                <p className="text-xs font-semibold uppercase tracking-[0.26em] text-slate-500">Pending review</p>
                <p className="mt-4 text-4xl font-semibold tracking-tight text-slate-950">{pendingPackages}</p>
                <p className="mt-3 text-sm leading-7 text-slate-600">Paket yang sudah dikirim dan masih menunggu approval admin.</p>
              </article>
              <article className="rounded-[28px] border border-orange-100 bg-white p-6 shadow-[0_18px_60px_rgba(15,23,42,0.06)]">
                <p className="text-xs font-semibold uppercase tracking-[0.26em] text-slate-500">Tanpa views</p>
                <p className="mt-4 text-4xl font-semibold tracking-tight text-slate-950">{packagesWithoutViews}</p>
                <p className="mt-3 text-sm leading-7 text-slate-600">Paket yang belum tersentuh trafik pada periode yang dipilih.</p>
              </article>
            </section>

            <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
              <div className="rounded-[32px] border border-orange-100 bg-white p-6 shadow-[0_18px_60px_rgba(15,23,42,0.06)] sm:p-7">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <span className="inline-flex rounded-full border border-orange-200 bg-orange-50 px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.3em] text-orange-700">
                      Revenue Trend
                    </span>
                    <h2 className="mt-4 text-2xl font-semibold tracking-tight text-slate-950">
                      Performa 6 bulan terakhir
                    </h2>
                    <p className="mt-2 text-sm leading-7 text-slate-600">
                      Baca tren revenue, booking, dan page view untuk melihat momentum merchant dari bulan ke
                      bulan.
                    </p>
                  </div>
                </div>

                <div className="mt-6 grid gap-4">
                  {monthBuckets.map((bucket) => (
                    <div key={bucket.key} className="rounded-[24px] border border-slate-200 bg-slate-50/70 p-5">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="text-base font-semibold text-slate-950">{bucket.label}</p>
                        <p className="text-sm font-medium text-slate-600">{formatMoney(bucket.revenue)}</p>
                      </div>

                      <div className="mt-4 h-3 rounded-full bg-slate-200">
                        <div
                          className="h-3 rounded-full bg-[linear-gradient(90deg,#c2410c_0%,#fb923c_100%)]"
                          style={{ width: `${Math.max((bucket.revenue / maxRevenue) * 100, bucket.revenue > 0 ? 10 : 0)}%` }}
                        />
                      </div>

                      <div className="mt-4 grid gap-3 text-sm text-slate-600 sm:grid-cols-3">
                        <div>
                          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Booking</p>
                          <p className="mt-1 font-semibold text-slate-900">{bucket.bookings}</p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Views</p>
                          <p className="mt-1 font-semibold text-slate-900">{bucket.views}</p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Conversion</p>
                          <p className="mt-1 font-semibold text-slate-900">
                            {bucket.views > 0 ? formatPercent((bucket.bookings / bucket.views) * 100) : "0.0%"}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <aside className="space-y-6">
                <div className="rounded-[32px] border border-orange-100 bg-white p-6 shadow-[0_18px_60px_rgba(15,23,42,0.06)]">
                  <span className="inline-flex rounded-full border border-orange-200 bg-orange-50 px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.3em] text-orange-700">
                    Funnel Health
                  </span>
                  <div className="mt-5 space-y-4">
                    <div className="rounded-[22px] border border-slate-200 bg-slate-50/80 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Views paket</p>
                      <p className="mt-2 text-2xl font-semibold text-slate-950">{totalVisitors}</p>
                    </div>
                    <div className="rounded-[22px] border border-slate-200 bg-slate-50/80 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Booking masuk</p>
                      <p className="mt-2 text-2xl font-semibold text-slate-950">{totalBookings}</p>
                    </div>
                    <div className="rounded-[22px] border border-slate-200 bg-slate-50/80 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Booking jadi revenue</p>
                      <p className="mt-2 text-2xl font-semibold text-slate-950">{revenueBookings.length}</p>
                    </div>
                  </div>
                </div>

                <div className="rounded-[32px] border border-slate-200 bg-[linear-gradient(180deg,#fffdfa_0%,#fff6ec_100%)] p-6 shadow-[0_18px_60px_rgba(15,23,42,0.06)]">
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Booking quality</p>
                  <div className="mt-5 grid gap-4 sm:grid-cols-2">
                    {healthCards.map((card) => (
                      <div key={card.label} className="rounded-[20px] border border-orange-100 bg-white p-4">
                        <p className="text-xs uppercase tracking-[0.18em] text-slate-400">{card.label}</p>
                        <p className={`mt-2 text-2xl font-semibold ${card.tone}`}>{card.value}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-[32px] border border-orange-100 bg-white p-6 shadow-[0_18px_60px_rgba(15,23,42,0.06)]">
                  <span className="inline-flex rounded-full border border-orange-200 bg-orange-50 px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.3em] text-orange-700">
                    Package insight
                  </span>
                  <div className="mt-5 space-y-4 text-sm text-slate-600">
                    <div className="rounded-[22px] border border-slate-200 bg-slate-50/80 p-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Paket paling dilihat</p>
                      <p className="mt-2 font-semibold text-slate-900">
                        {topViewedPackage ? topViewedPackage.title : "Belum ada trafik paket"}
                      </p>
                      <p className="mt-1">{topViewedPackage ? `${topViewedPackage.views} views` : "Dorong trafik dari promo atau SEO."}</p>
                    </div>
                    <div className="rounded-[22px] border border-slate-200 bg-slate-50/80 p-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Perlu optimasi conversion</p>
                      <p className="mt-2 font-semibold text-slate-900">
                        {lowConversionHighViewPackage ? lowConversionHighViewPackage.title : "Belum ada kandidat utama"}
                      </p>
                      <p className="mt-1">
                        {lowConversionHighViewPackage
                          ? `${lowConversionHighViewPackage.views} views tanpa booking pada periode ini.`
                          : "Saat trafik sudah cukup, paket dengan views tinggi tanpa booking akan muncul di sini."}
                      </p>
                    </div>
                  </div>
                </div>
              </aside>
            </section>

            <section className="rounded-[32px] border border-orange-100 bg-white p-6 shadow-[0_18px_60px_rgba(15,23,42,0.06)] sm:p-7">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <span className="inline-flex rounded-full border border-orange-200 bg-orange-50 px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.3em] text-orange-700">
                    Top Packages
                  </span>
                  <h2 className="mt-4 text-2xl font-semibold tracking-tight text-slate-950">
                    Paket dengan performa terbaik
                  </h2>
                  <p className="mt-2 text-sm leading-7 text-slate-600">
                    Prioritaskan optimasi pada paket yang sudah punya booking tinggi atau conversion yang bagus.
                  </p>
                </div>
              </div>

              {topPackages.length === 0 ? (
                <div className="mt-6 rounded-[24px] border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600">
                  Belum ada data paket yang cukup untuk ditampilkan pada statistik.
                </div>
              ) : (
                <div className="mt-6 overflow-x-auto rounded-[24px] border border-slate-200">
                  <table className="min-w-full text-left text-sm">
                    <thead className="bg-slate-50 text-slate-600">
                      <tr>
                        <th className="border-b p-4">Paket</th>
                        <th className="border-b p-4">Views</th>
                        <th className="border-b p-4">Booking</th>
                        <th className="border-b p-4">Conversion</th>
                        <th className="border-b p-4">Revenue</th>
                        <th className="border-b p-4">Paid</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white">
                      {topPackages.map((pkg) => (
                        <tr key={pkg.packageId} className="hover:bg-slate-50">
                          <td className="border-b p-4 font-medium text-slate-900">{pkg.title}</td>
                          <td className="border-b p-4 text-slate-700">{pkg.views}</td>
                          <td className="border-b p-4 text-slate-700">{pkg.bookings}</td>
                          <td className="border-b p-4 text-slate-700">{formatPercent(pkg.conversion)}</td>
                          <td className="border-b p-4 font-medium text-slate-900">{formatMoney(pkg.revenue)}</td>
                          <td className="border-b p-4 text-slate-700">{pkg.paidBookings}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section className="rounded-[32px] border border-slate-200 bg-[linear-gradient(180deg,#fffdfa_0%,#fff8f1_100%)] p-6 shadow-[0_18px_60px_rgba(15,23,42,0.06)] sm:p-7">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Recommended actions</p>
              <div className="mt-5 grid gap-4 lg:grid-cols-3">
                <div className="rounded-[22px] border border-orange-100 bg-white p-5">
                  <p className="text-sm font-semibold text-slate-950">Optimasi paket dengan view tinggi</p>
                  <p className="mt-2 text-sm leading-7 text-slate-600">
                    {lowConversionHighViewPackage
                      ? `${lowConversionHighViewPackage.title} punya trafik tinggi tetapi belum menghasilkan booking. Periksa harga, foto, itinerary, dan CTA paket.`
                      : "Jika view tinggi tapi conversion rendah, periksa harga, foto, itinerary, dan CTA paket."}
                  </p>
                </div>
                <div className="rounded-[22px] border border-orange-100 bg-white p-5">
                  <p className="text-sm font-semibold text-slate-950">Turunkan pembayaran pending</p>
                  <p className="mt-2 text-sm leading-7 text-slate-600">
                    {pendingPaymentCount > 0
                      ? `${pendingPaymentCount} booking masih pending atau dp paid. Follow up agar funnel tidak bocor.`
                      : "Belum ada pembayaran pending pada periode ini. Jaga kecepatan follow up saat booking baru masuk."}
                  </p>
                </div>
                <div className="rounded-[22px] border border-orange-100 bg-white p-5">
                  <p className="text-sm font-semibold text-slate-950">Jaga rating merchant</p>
                  <p className="mt-2 text-sm leading-7 text-slate-600">
                    {filteredReviews.length > 0
                      ? `Rating rata-rata saat ini ${averageRating.toFixed(1)}. Fokus pada pengalaman trip dan respons cepat ke customer.`
                      : "Belum ada review customer. Prioritaskan kualitas trip dan follow up pasca perjalanan agar review mulai terkumpul."}
                  </p>
                </div>
              </div>

              <div className="mt-6 rounded-[24px] border border-slate-200 bg-white p-5 text-sm text-slate-600">
                Status booking dominan saat ini:{" "}
                <span className="font-semibold text-slate-900">{dominantBookingStatus}</span>
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  )
}
