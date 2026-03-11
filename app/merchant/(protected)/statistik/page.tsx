import Link from "next/link"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

type StatsBookingRow = {
  id: string
  created_at: string | null
  total_amount: number | null
  payment_status: string | null
  booking_status: string | null
  packages: {
    id: string
    title: string | null
    merchant_id: string | null
  } | null
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
    bookingStatus === "pickup_confirmed"
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

export default async function MerchantStatisticsPage() {
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
    return <div className="p-10">Data merchant tidak ditemukan.</div>
  }

  const [
    { data: packagesData, error: packagesError },
    { data: bookingsData, error: bookingsError },
    packageViewsResult,
    reviewsResult,
  ] = await Promise.all([
    adminSupabase
      .from("packages")
      .select("id, title, status, created_at")
      .eq("merchant_id", merchant.id)
      .order("created_at", { ascending: false }),
    adminSupabase
      .from("bookings")
      .select("id, created_at, total_amount, payment_status, booking_status, packages!inner(id, title, merchant_id)")
      .eq("packages.merchant_id", merchant.id)
      .order("created_at", { ascending: false }),
    adminSupabase
      .from("package_views")
      .select("package_id, viewed_at, packages!inner(merchant_id)")
      .eq("packages.merchant_id", merchant.id),
    adminSupabase
      .from("package_reviews")
      .select("rating, packages!inner(merchant_id)")
      .eq("packages.merchant_id", merchant.id),
  ])

  const packages = (packagesData as PackageRow[] | null) || []
  const bookings = (bookingsData as StatsBookingRow[] | null) || []
  const packageViews = packageViewsResult.error ? [] : (packageViewsResult.data as PackageViewRow[] | null) || []
  const reviews = reviewsResult.error ? [] : (reviewsResult.data as ReviewRow[] | null) || []
  const error = packagesError || bookingsError
  const analyticsWarnings = [packageViewsResult.error, reviewsResult.error].filter(Boolean)

  const revenueBookings = bookings.filter(isRevenueBooking)
  const totalBookings = bookings.length
  const totalRevenue = revenueBookings.reduce((sum, booking) => sum + (booking.total_amount ?? 0), 0)
  const totalVisitors = packageViews.length
  const conversionRate = totalVisitors > 0 ? (totalBookings / totalVisitors) * 100 : 0

  const pendingPaymentCount = bookings.filter((booking) => {
    const status = normalizeStatus(booking.payment_status)
    return status === "pending" || status === "dp_paid"
  }).length

  const confirmedTripCount = bookings.filter((booking) => {
    const status = normalizeStatus(booking.booking_status)
    return status === "confirmed" || status === "pickup_confirmed" || status === "completed"
  }).length

  const cancelledBookingCount = bookings.filter(
    (booking) => normalizeStatus(booking.booking_status) === "cancelled",
  ).length

  const averageOrderValue = revenueBookings.length > 0 ? totalRevenue / revenueBookings.length : 0
  const averageRating =
    reviews.length > 0
      ? reviews.reduce((sum, review) => sum + (review.rating ?? 0), 0) / reviews.length
      : 0

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

  for (const booking of bookings) {
    const packageId = booking.packages?.id || booking.id
    const packageTitle = booking.packages?.title || "Paket tidak ditemukan"
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

  for (const view of packageViews) {
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

  for (const booking of bookings) {
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

  for (const view of packageViews) {
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
      note: `${revenueBookings.length} booking terkonversi menjadi revenue`,
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

  const healthCards = [
    { label: "Menunggu pembayaran", value: String(pendingPaymentCount), tone: "text-amber-700" },
    { label: "Trip terkonfirmasi", value: String(confirmedTripCount), tone: "text-emerald-700" },
    { label: "Booking dibatalkan", value: String(cancelledBookingCount), tone: "text-rose-700" },
    {
      label: "Rating customer",
      value: reviews.length > 0 ? averageRating.toFixed(1) : "-",
      tone: "text-orange-700",
    },
  ]
  const dominantBookingStatus = titleCaseStatus(findMostCommonStatus(bookings))

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fff8f1_0%,#f7f1e8_38%,#f3eee7_100%)] px-6 py-8 md:px-8 lg:px-10">
      <div className="mx-auto max-w-7xl space-y-8">
        <section className="overflow-hidden rounded-[36px] border border-orange-200/60 bg-[linear-gradient(135deg,#7c2d12_0%,#c2410c_34%,#f97316_68%,#fdba74_100%)] px-8 py-9 text-white shadow-[0_36px_110px_rgba(146,64,14,0.18)] sm:px-10 lg:px-12">
          <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
            <div>
              <span className="inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.34em] text-orange-50">
                Merchant Statistics
              </span>
              <h1 className="mt-5 text-4xl font-semibold tracking-tight sm:text-5xl">
                Statistik performa merchant yang bisa langsung dipakai.
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-8 text-orange-50/92">
                Pantau revenue, funnel traffic ke booking, kesehatan pembayaran, performa paket, dan
                kualitas customer experience dalam satu dashboard analytics.
              </p>
            </div>

            <div className="grid gap-4">
              <div className="rounded-[28px] border border-white/18 bg-slate-950/16 p-6 backdrop-blur">
                <p className="text-[11px] uppercase tracking-[0.32em] text-orange-100/80">Business snapshot</p>
                <p className="mt-4 text-3xl font-semibold text-white">
                  {merchant.brand_name || merchant.company_name || "Merchant"}
                </p>
                <p className="mt-2 text-sm leading-7 text-orange-50/85">
                    Statistik ini dihitung dari booking, package views, dan review yang terkait langsung dengan
                    merchant Anda.
                  </p>
                </div>

              <div className="rounded-[28px] border border-white/18 bg-white/10 p-6 backdrop-blur">
                <p className="text-[11px] uppercase tracking-[0.32em] text-orange-100/80">Quick actions</p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <Link
                    href="/merchant/paket"
                    className="rounded-[18px] border border-white/18 bg-white/10 px-4 py-3 text-sm font-medium text-orange-50 transition hover:bg-white/15"
                  >
                    Kelola paket
                  </Link>
                  <Link
                    href="/merchant/pesanan"
                    className="rounded-[18px] border border-white/18 bg-white/10 px-4 py-3 text-sm font-medium text-orange-50 transition hover:bg-white/15"
                  >
                    Buka pesanan
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {error ? (
          <div className="rounded-[24px] border border-red-200 bg-red-50 p-5 text-red-700">
            Gagal memuat statistik merchant.
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
                </article>
              ))}
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
                    Jika view tinggi tapi conversion rendah, periksa harga, foto, itinerary, dan CTA paket.
                  </p>
                </div>
                <div className="rounded-[22px] border border-orange-100 bg-white p-5">
                  <p className="text-sm font-semibold text-slate-950">Turunkan pembayaran pending</p>
                  <p className="mt-2 text-sm leading-7 text-slate-600">
                    Booking dengan status pending atau dp paid perlu follow up agar funnel tidak bocor.
                  </p>
                </div>
                <div className="rounded-[22px] border border-orange-100 bg-white p-5">
                  <p className="text-sm font-semibold text-slate-950">Jaga rating merchant</p>
                  <p className="mt-2 text-sm leading-7 text-slate-600">
                    Rating customer memengaruhi trust. Fokus pada pengalaman trip dan respons cepat ke customer.
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
