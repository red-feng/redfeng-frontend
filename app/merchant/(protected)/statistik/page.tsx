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
      packageUntitled: "Paket tanpa judul",
      packageMissing: "Paket tidak ditemukan",
      totalRevenue: "Total revenue",
      totalBookings: "Total booking",
      conversionRate: "Conversion rate",
      averageOrderValue: "Average order value",
      averageOrderValueNote: "Rata-rata nilai booking yang berhasil menghasilkan revenue",
      waitingPayment: "Menunggu pembayaran",
      confirmedTrips: "Trip terkonfirmasi",
      cancelledBookings: "Booking dibatalkan",
      customerRating: "Rating customer",
      businessSnapshot: "Business snapshot",
      quickActions: "Quick actions",
      activePackages: "Paket aktif",
      activePackagesNote: "Listing siap jual yang bisa langsung menerima booking.",
      draftPackages: "Draft paket",
      draftPackagesNote: "Paket belum selesai yang masih bisa dioptimasi sebelum diajukan.",
      pendingReview: "Pending review",
      pendingReviewNote: "Paket yang sudah dikirim dan masih menunggu approval admin.",
      noViews: "Tanpa views",
      noViewsNote: "Paket yang belum tersentuh trafik pada periode yang dipilih.",
      revenueTrend: "Revenue Trend",
      lastSixMonthsPerformance: "Performa 6 bulan terakhir",
      revenueTrendNote: "Baca tren revenue, booking, dan page view untuk melihat momentum merchant dari bulan ke bulan.",
      booking: "Booking",
      views: "Views",
      conversion: "Conversion",
      funnelHealth: "Funnel Health",
      packageViews: "Views paket",
      incomingBookings: "Booking masuk",
      bookingsToRevenue: "Booking jadi revenue",
      bookingQuality: "Booking quality",
      packageInsight: "Package insight",
      mostViewedPackage: "Paket paling dilihat",
      noPackageTraffic: "Belum ada trafik paket",
      pushTraffic: "Dorong trafik dari promo atau SEO.",
      optimizeConversion: "Perlu optimasi conversion",
      noMainCandidate: "Belum ada kandidat utama",
      highViewNoBooking: "Saat trafik sudah cukup, paket dengan views tinggi tanpa booking akan muncul di sini.",
      topPackages: "Top Packages",
      bestPerformingPackages: "Paket dengan performa terbaik",
      bestPerformingPackagesNote: "Prioritaskan optimasi pada paket yang sudah punya booking tinggi atau conversion yang bagus.",
      insufficientStats: "Belum ada data paket yang cukup untuk ditampilkan pada statistik.",
      recommendedActions: "Recommended actions",
      optimizeHighViewPackages: "Optimasi paket dengan view tinggi",
      optimizeHighViewPackagesFallback: "Jika view tinggi tapi conversion rendah, periksa harga, foto, itinerary, dan CTA paket.",
      reducePendingPayments: "Turunkan pembayaran pending",
      reducePendingPaymentsFallback: "Belum ada pembayaran pending pada periode ini. Jaga kecepatan follow up saat booking baru masuk.",
      maintainMerchantRating: "Jaga rating merchant",
      maintainMerchantRatingFallback: "Belum ada review customer. Prioritaskan kualitas trip dan follow up pasca perjalanan agar review mulai terkumpul.",
      dominantBookingStatus: "Status booking dominan saat ini:",
      packageLabel: "Paket",
      paidLabel: "Paid",
      previousPeriod: "vs periode sebelumnya",
      packageTrafficDelta: "trafik paket",
      additionalAnalyticsMissing: "Beberapa data analytics tambahan belum tersedia di production. Statistik utama tetap dihitung dari data paket dan booking merchant.",
      stable: "stabil",
    },
    en: {
      merchantMissing: "Merchant data not found.",
      heroBadge: "Merchant Statistics",
      heroTitle: "Merchant performance statistics you can use right away.",
      heroDescription: "Monitor revenue, traffic-to-booking funnel, payment health, package performance, and customer experience quality in one analytics dashboard.",
      managePackages: "Manage packages",
      openOrders: "Open orders",
      loadError: "Failed to load merchant statistics.",
      packageUntitled: "Untitled package",
      packageMissing: "Package not found",
      totalRevenue: "Total revenue",
      totalBookings: "Total bookings",
      conversionRate: "Conversion rate",
      averageOrderValue: "Average order value",
      averageOrderValueNote: "Average booking value that generated revenue",
      waitingPayment: "Awaiting payment",
      confirmedTrips: "Confirmed trips",
      cancelledBookings: "Cancelled bookings",
      customerRating: "Customer rating",
      businessSnapshot: "Business snapshot",
      quickActions: "Quick actions",
      activePackages: "Active packages",
      activePackagesNote: "Listings ready to sell and accept bookings.",
      draftPackages: "Draft packages",
      draftPackagesNote: "Incomplete packages that can still be optimized before submission.",
      pendingReview: "Pending review",
      pendingReviewNote: "Packages that have been submitted and are still awaiting admin approval.",
      noViews: "No views",
      noViewsNote: "Packages that have not received any traffic during the selected period.",
      revenueTrend: "Revenue Trend",
      lastSixMonthsPerformance: "Performance in the last 6 months",
      revenueTrendNote: "Read revenue, booking, and page-view trends to understand merchant momentum month by month.",
      booking: "Bookings",
      views: "Views",
      conversion: "Conversion",
      funnelHealth: "Funnel Health",
      packageViews: "Package views",
      incomingBookings: "Incoming bookings",
      bookingsToRevenue: "Bookings that became revenue",
      bookingQuality: "Booking quality",
      packageInsight: "Package insight",
      mostViewedPackage: "Most viewed package",
      noPackageTraffic: "No package traffic yet",
      pushTraffic: "Drive traffic from promotions or SEO.",
      optimizeConversion: "Needs conversion optimization",
      noMainCandidate: "No main candidate yet",
      highViewNoBooking: "Once traffic is high enough, packages with many views but no bookings will appear here.",
      topPackages: "Top Packages",
      bestPerformingPackages: "Best performing packages",
      bestPerformingPackagesNote: "Prioritize optimization on packages that already have strong bookings or conversion.",
      insufficientStats: "There is not enough package data to display in statistics yet.",
      recommendedActions: "Recommended actions",
      optimizeHighViewPackages: "Optimize high-view packages",
      optimizeHighViewPackagesFallback: "If views are high but conversion is low, review pricing, photos, itinerary, and package CTA.",
      reducePendingPayments: "Reduce pending payments",
      reducePendingPaymentsFallback: "There are no pending payments in this period. Keep follow-up response times fast when new bookings come in.",
      maintainMerchantRating: "Maintain merchant rating",
      maintainMerchantRatingFallback: "There are no customer reviews yet. Prioritize trip quality and post-trip follow-up so reviews start coming in.",
      dominantBookingStatus: "Current dominant booking status:",
      packageLabel: "Package",
      paidLabel: "Paid",
      previousPeriod: "vs previous period",
      packageTrafficDelta: "package traffic",
      additionalAnalyticsMissing: "Some additional analytics data is not yet available in production. Core statistics are still calculated from merchant package and booking data.",
      stable: "stable",
    },
    zh: {
      merchantMissing: "未找到商家数据。",
      heroBadge: "商家统计",
      heroTitle: "可直接使用的商家表现统计。",
      heroDescription: "在一个分析面板中查看营收、流量到预订漏斗、付款健康度、套餐表现以及客户体验质量。",
      managePackages: "管理套餐",
      openOrders: "查看订单",
      loadError: "加载商家统计失败。",
      packageUntitled: "未命名套餐",
      packageMissing: "未找到套餐",
      totalRevenue: "总营收",
      totalBookings: "总预订数",
      conversionRate: "转化率",
      averageOrderValue: "平均订单金额",
      averageOrderValueNote: "成功形成营收的平均订单金额",
      waitingPayment: "等待付款",
      confirmedTrips: "已确认行程",
      cancelledBookings: "已取消预订",
      customerRating: "客户评分",
      businessSnapshot: "业务概览",
      quickActions: "快捷操作",
      activePackages: "已上架套餐",
      activePackagesNote: "可立即销售并接受预订的套餐。",
      draftPackages: "草稿套餐",
      draftPackagesNote: "尚未完成、仍可在提交前优化的套餐。",
      pendingReview: "待审核",
      pendingReviewNote: "已提交但仍在等待管理员审核的套餐。",
      noViews: "无浏览量",
      noViewsNote: "在所选周期内尚未获得流量的套餐。",
      revenueTrend: "营收趋势",
      lastSixMonthsPerformance: "最近 6 个月表现",
      revenueTrendNote: "查看营收、预订和页面浏览趋势，理解商家逐月表现变化。",
      booking: "预订",
      views: "浏览量",
      conversion: "转化率",
      funnelHealth: "漏斗健康度",
      packageViews: "套餐浏览量",
      incomingBookings: "进入的预订",
      bookingsToRevenue: "形成营收的预订",
      bookingQuality: "预订质量",
      packageInsight: "套餐洞察",
      mostViewedPackage: "浏览最多的套餐",
      noPackageTraffic: "暂无套餐流量",
      pushTraffic: "通过推广或 SEO 提升流量。",
      optimizeConversion: "需要优化转化",
      noMainCandidate: "暂无重点候选",
      highViewNoBooking: "当流量足够高时，浏览量高但无预订的套餐会显示在这里。",
      topPackages: "热门套餐",
      bestPerformingPackages: "表现最好的套餐",
      bestPerformingPackagesNote: "优先优化那些已经有较高预订量或较好转化率的套餐。",
      insufficientStats: "目前还没有足够的套餐数据可用于统计展示。",
      recommendedActions: "建议操作",
      optimizeHighViewPackages: "优化高浏览套餐",
      optimizeHighViewPackagesFallback: "如果浏览量高但转化低，请检查价格、图片、行程和套餐 CTA。",
      reducePendingPayments: "降低待付款数量",
      reducePendingPaymentsFallback: "本周期暂无待付款订单。新预订进入时请保持快速跟进。",
      maintainMerchantRating: "保持商家评分",
      maintainMerchantRatingFallback: "暂时还没有客户评价。优先保证行程质量并做好行后跟进，逐步积累评价。",
      dominantBookingStatus: "当前最主要的预订状态：",
      packageLabel: "套餐",
      paidLabel: "已付款",
      previousPeriod: "对比上一周期",
      packageTrafficDelta: "套餐流量",
      additionalAnalyticsMissing: "生产环境中部分补充分析数据暂未就绪。核心统计仍会基于商家套餐和预订数据计算。",
      stable: "稳定",
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

const periodOptions: { key: PeriodKey; days: number }[] = [
  { key: "7d", days: 7 },
  { key: "30d", days: 30 },
  { key: "90d", days: 90 },
  { key: "6m", days: 180 },
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
  const periodLabels: Record<PeriodKey, string> = {
    "7d": locale === "en" ? "7 days" : locale === "zh" ? "7天" : "7 hari",
    "30d": locale === "en" ? "30 days" : locale === "zh" ? "30天" : "30 hari",
    "90d": locale === "en" ? "90 days" : locale === "zh" ? "90天" : "90 hari",
    "6m": locale === "en" ? "6 months" : locale === "zh" ? "6个月" : "6 bulan",
  }
  const selectedPeriod = resolvePeriod(params.period)
  const selectedPeriodMeta = periodOptions.find((option) => option.key === selectedPeriod) || periodOptions[1]
  const selectedPeriodLabel = periodLabels[selectedPeriodMeta.key]
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
        title: pkg.title || t.packageUntitled,
      bookings: 0,
      revenue: 0,
      paidBookings: 0,
      views: 0,
    })
  }

  for (const booking of filteredBookings) {
    const packageId = booking.package_id || booking.id
    const packageTitle = packageStats.get(packageId)?.title || t.packageMissing
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
      title: t.packageMissing,
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
      value: formatMoney(totalRevenue),
      label: t.totalRevenue,
      note: `${revenueBookings.length} ${t.booking.toLowerCase()} menghasilkan revenue dalam ${selectedPeriodLabel}`,
    },
    {
      label: t.totalBookings,
      value: String(totalBookings),
      note: `${confirmedTripCount} booking confirmed/completed`,
    },
    {
      label: t.conversionRate,
      value: formatPercent(conversionRate),
      note: `${totalBookings} booking dari ${totalVisitors} total view paket`,
    },
    {
      label: t.averageOrderValue,
      value: formatMoney(averageOrderValue),
      note: t.averageOrderValueNote,
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
    { label: t.waitingPayment, value: String(pendingPaymentCount), tone: "text-amber-700" },
    { label: t.confirmedTrips, value: String(confirmedTripCount), tone: "text-emerald-700" },
    { label: t.cancelledBookings, value: String(cancelledBookingCount), tone: "text-rose-700" },
    {
      label: t.customerRating,
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
                  <p className="text-[11px] uppercase tracking-[0.32em] text-orange-100/80">{t.businessSnapshot}</p>
                <p className="mt-4 text-3xl font-semibold text-white">
                    {merchant.brand_name || merchant.company_name || "Merchant"}
                </p>
                <p className="mt-2 text-sm leading-7 text-orange-50/85">
                  Statistik periode {selectedPeriodMeta.label.toLowerCase()} ini dihitung dari booking, package
                  views, dan review yang terkait langsung dengan merchant Anda.
                </p>
              </div>

              <div className="rounded-[28px] border border-white/18 bg-white/10 p-6 backdrop-blur">
                  <p className="text-[11px] uppercase tracking-[0.32em] text-orange-100/80">{t.quickActions}</p>
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
                      {periodLabels[option.key]}
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
                {t.additionalAnalyticsMissing}
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
                  {card.label === t.totalRevenue ? (
                    <p className={`mt-3 text-xs font-semibold uppercase tracking-[0.18em] ${metricDeltas.revenue.tone}`}>
                      {t.previousPeriod} {metricDeltas.revenue.label === "stabil" ? t.stable : metricDeltas.revenue.label}
                    </p>
                  ) : null}
                  {card.label === t.totalBookings ? (
                    <p className={`mt-3 text-xs font-semibold uppercase tracking-[0.18em] ${metricDeltas.bookings.tone}`}>
                      {t.previousPeriod} {metricDeltas.bookings.label === "stabil" ? t.stable : metricDeltas.bookings.label}
                    </p>
                  ) : null}
                  {card.label === t.conversionRate ? (
                    <p className={`mt-3 text-xs font-semibold uppercase tracking-[0.18em] ${metricDeltas.visitors.tone}`}>
                      {t.packageTrafficDelta} {metricDeltas.visitors.label === "stabil" ? t.stable : metricDeltas.visitors.label}
                    </p>
                  ) : null}
                </article>
              ))}
            </section>

            <section className="grid gap-4 xl:grid-cols-4">
              <article className="rounded-[28px] border border-orange-100 bg-white p-6 shadow-[0_18px_60px_rgba(15,23,42,0.06)]">
                <p className="text-xs font-semibold uppercase tracking-[0.26em] text-slate-500">{t.activePackages}</p>
                <p className="mt-4 text-4xl font-semibold tracking-tight text-slate-950">{activePackages}</p>
                <p className="mt-3 text-sm leading-7 text-slate-600">{t.activePackagesNote}</p>
              </article>
              <article className="rounded-[28px] border border-orange-100 bg-white p-6 shadow-[0_18px_60px_rgba(15,23,42,0.06)]">
                <p className="text-xs font-semibold uppercase tracking-[0.26em] text-slate-500">{t.draftPackages}</p>
                <p className="mt-4 text-4xl font-semibold tracking-tight text-slate-950">{draftPackages}</p>
                <p className="mt-3 text-sm leading-7 text-slate-600">{t.draftPackagesNote}</p>
              </article>
              <article className="rounded-[28px] border border-orange-100 bg-white p-6 shadow-[0_18px_60px_rgba(15,23,42,0.06)]">
                <p className="text-xs font-semibold uppercase tracking-[0.26em] text-slate-500">{t.pendingReview}</p>
                <p className="mt-4 text-4xl font-semibold tracking-tight text-slate-950">{pendingPackages}</p>
                <p className="mt-3 text-sm leading-7 text-slate-600">{t.pendingReviewNote}</p>
              </article>
              <article className="rounded-[28px] border border-orange-100 bg-white p-6 shadow-[0_18px_60px_rgba(15,23,42,0.06)]">
                <p className="text-xs font-semibold uppercase tracking-[0.26em] text-slate-500">{t.noViews}</p>
                <p className="mt-4 text-4xl font-semibold tracking-tight text-slate-950">{packagesWithoutViews}</p>
                <p className="mt-3 text-sm leading-7 text-slate-600">{t.noViewsNote}</p>
              </article>
            </section>

            <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
              <div className="rounded-[32px] border border-orange-100 bg-white p-6 shadow-[0_18px_60px_rgba(15,23,42,0.06)] sm:p-7">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <span className="inline-flex rounded-full border border-orange-200 bg-orange-50 px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.3em] text-orange-700">
                      {t.revenueTrend}
                    </span>
                    <h2 className="mt-4 text-2xl font-semibold tracking-tight text-slate-950">
                      {t.lastSixMonthsPerformance}
                    </h2>
                    <p className="mt-2 text-sm leading-7 text-slate-600">
                      {t.revenueTrendNote}
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
                          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{t.booking}</p>
                          <p className="mt-1 font-semibold text-slate-900">{bucket.bookings}</p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{t.views}</p>
                          <p className="mt-1 font-semibold text-slate-900">{bucket.views}</p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{t.conversion}</p>
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
                      {t.funnelHealth}
                  </span>
                  <div className="mt-5 space-y-4">
                    <div className="rounded-[22px] border border-slate-200 bg-slate-50/80 p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">{t.packageViews}</p>
                      <p className="mt-2 text-2xl font-semibold text-slate-950">{totalVisitors}</p>
                    </div>
                    <div className="rounded-[22px] border border-slate-200 bg-slate-50/80 p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">{t.incomingBookings}</p>
                      <p className="mt-2 text-2xl font-semibold text-slate-950">{totalBookings}</p>
                    </div>
                    <div className="rounded-[22px] border border-slate-200 bg-slate-50/80 p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">{t.bookingsToRevenue}</p>
                      <p className="mt-2 text-2xl font-semibold text-slate-950">{revenueBookings.length}</p>
                    </div>
                  </div>
                </div>

                <div className="rounded-[32px] border border-slate-200 bg-[linear-gradient(180deg,#fffdfa_0%,#fff6ec_100%)] p-6 shadow-[0_18px_60px_rgba(15,23,42,0.06)]">
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">{t.bookingQuality}</p>
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
                      {t.packageInsight}
                  </span>
                  <div className="mt-5 space-y-4 text-sm text-slate-600">
                    <div className="rounded-[22px] border border-slate-200 bg-slate-50/80 p-4">
                        <p className="text-xs uppercase tracking-[0.18em] text-slate-400">{t.mostViewedPackage}</p>
                      <p className="mt-2 font-semibold text-slate-900">
                          {topViewedPackage ? topViewedPackage.title : t.noPackageTraffic}
                      </p>
                        <p className="mt-1">{topViewedPackage ? `${topViewedPackage.views} ${t.views.toLowerCase()}` : t.pushTraffic}</p>
                    </div>
                    <div className="rounded-[22px] border border-slate-200 bg-slate-50/80 p-4">
                        <p className="text-xs uppercase tracking-[0.18em] text-slate-400">{t.optimizeConversion}</p>
                      <p className="mt-2 font-semibold text-slate-900">
                          {lowConversionHighViewPackage ? lowConversionHighViewPackage.title : t.noMainCandidate}
                      </p>
                      <p className="mt-1">
                        {lowConversionHighViewPackage
                          ? `${lowConversionHighViewPackage.views} views tanpa booking pada periode ini.`
                          : t.highViewNoBooking}
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
                      {t.topPackages}
                  </span>
                  <h2 className="mt-4 text-2xl font-semibold tracking-tight text-slate-950">
                      {t.bestPerformingPackages}
                  </h2>
                  <p className="mt-2 text-sm leading-7 text-slate-600">
                      {t.bestPerformingPackagesNote}
                  </p>
                </div>
              </div>

              {topPackages.length === 0 ? (
                <div className="mt-6 rounded-[24px] border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600">
                    {t.insufficientStats}
                </div>
              ) : (
                <div className="mt-6 overflow-x-auto rounded-[24px] border border-slate-200">
                  <table className="min-w-full text-left text-sm">
                    <thead className="bg-slate-50 text-slate-600">
                      <tr>
                        <th className="border-b p-4">{t.packageLabel}</th>
                        <th className="border-b p-4">{t.views}</th>
                        <th className="border-b p-4">{t.booking}</th>
                        <th className="border-b p-4">{t.conversion}</th>
                        <th className="border-b p-4">{t.totalRevenue}</th>
                        <th className="border-b p-4">{t.paidLabel}</th>
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
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">{t.recommendedActions}</p>
              <div className="mt-5 grid gap-4 lg:grid-cols-3">
                <div className="rounded-[22px] border border-orange-100 bg-white p-5">
                  <p className="text-sm font-semibold text-slate-950">{t.optimizeHighViewPackages}</p>
                  <p className="mt-2 text-sm leading-7 text-slate-600">
                    {lowConversionHighViewPackage
                      ? `${lowConversionHighViewPackage.title} punya trafik tinggi tetapi belum menghasilkan booking. Periksa harga, foto, itinerary, dan CTA paket.`
                      : t.optimizeHighViewPackagesFallback}
                  </p>
                </div>
                <div className="rounded-[22px] border border-orange-100 bg-white p-5">
                  <p className="text-sm font-semibold text-slate-950">{t.reducePendingPayments}</p>
                  <p className="mt-2 text-sm leading-7 text-slate-600">
                    {pendingPaymentCount > 0
                      ? `${pendingPaymentCount} booking masih pending atau dp paid. Follow up agar funnel tidak bocor.`
                      : t.reducePendingPaymentsFallback}
                  </p>
                </div>
                <div className="rounded-[22px] border border-orange-100 bg-white p-5">
                  <p className="text-sm font-semibold text-slate-950">{t.maintainMerchantRating}</p>
                  <p className="mt-2 text-sm leading-7 text-slate-600">
                    {filteredReviews.length > 0
                      ? `Rating rata-rata saat ini ${averageRating.toFixed(1)}. Fokus pada pengalaman trip dan respons cepat ke customer.`
                      : t.maintainMerchantRatingFallback}
                  </p>
                </div>
              </div>

              <div className="mt-6 rounded-[24px] border border-slate-200 bg-white p-5 text-sm text-slate-600">
                {t.dominantBookingStatus}{" "}
                <span className="font-semibold text-slate-900">{dominantBookingStatus}</span>
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  )
}
