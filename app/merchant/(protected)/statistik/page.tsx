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

type PackageViewRow = {
  package_id: string
}

function formatMoney(value: number) {
  return `Rp ${value.toLocaleString("id-ID")}`
}

function normalizeStatus(value: string | null) {
  return (value || "").trim().toLowerCase()
}

function isRevenueBooking(booking: StatsBookingRow) {
  const paymentStatus = normalizeStatus(booking.payment_status)
  const bookingStatus = normalizeStatus(booking.booking_status)
  return paymentStatus === "paid" || bookingStatus === "confirmed" || bookingStatus === "completed"
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
    .select("id")
    .eq("user_id", user.id)
    .single()

  if (!merchant) return <div className="p-10">Data merchant tidak ditemukan.</div>

  const [{ data, error }, packageViewsResult] = await Promise.all([
    adminSupabase
      .from("bookings")
      .select("id, created_at, total_amount, payment_status, booking_status, packages!inner(id, title, merchant_id)")
      .eq("packages.merchant_id", merchant.id)
      .order("created_at", { ascending: false }),
    adminSupabase
      .from("package_views")
      .select("package_id, packages!inner(merchant_id)")
      .eq("packages.merchant_id", merchant.id),
  ])

  const bookings = (data as StatsBookingRow[] | null) || []
  const packageViews = (packageViewsResult.data as PackageViewRow[] | null) || []
  const now = new Date()
  const currentMonth = now.getMonth()
  const currentYear = now.getFullYear()

  const revenueBookings = bookings.filter(isRevenueBooking)
  const totalPenjualan = bookings.length
  const totalRevenue = revenueBookings.reduce((sum, item) => sum + (item.total_amount ?? 0), 0)
  const totalVisitors = packageViews.length
  const conversionRate = totalVisitors > 0 ? ((totalPenjualan / totalVisitors) * 100).toFixed(1) : "0.0"

  const packageTotals = new Map<string, { title: string; count: number }>()
  for (const booking of bookings) {
    const packageId = booking.packages?.id || booking.id
    const packageTitle = booking.packages?.title || "Paket tidak ditemukan"
    const current = packageTotals.get(packageId)
    packageTotals.set(packageId, {
      title: packageTitle,
      count: (current?.count || 0) + 1,
    })
  }

  const topPaket = Array.from(packageTotals.values()).sort((a, b) => b.count - a.count)[0]?.title || "-"

  const monthlyBookings = bookings.filter((booking) => {
    if (!booking.created_at) return false
    const date = new Date(booking.created_at)
    return date.getMonth() === currentMonth && date.getFullYear() === currentYear
  })

  const monthlyRevenueBookings = monthlyBookings.filter(isRevenueBooking)
  const monthlyRevenue = monthlyRevenueBookings.reduce((sum, item) => sum + (item.total_amount ?? 0), 0)

  const monthlyPackageTotals = new Map<string, { title: string; count: number }>()
  for (const booking of monthlyBookings) {
    const packageId = booking.packages?.id || booking.id
    const packageTitle = booking.packages?.title || "Paket tidak ditemukan"
    const current = monthlyPackageTotals.get(packageId)
    monthlyPackageTotals.set(packageId, {
      title: packageTitle,
      count: (current?.count || 0) + 1,
    })
  }

  const topPaketBulanan =
    Array.from(monthlyPackageTotals.values()).sort((a, b) => b.count - a.count)[0]?.title || "-"

  const metricCards = [
    { label: "Total penjualan", value: String(totalPenjualan), note: "Total booking merchant" },
    { label: "Paket terlaris", value: topPaket, note: "Berdasarkan jumlah booking" },
    { label: "Conversion rate", value: `${conversionRate}%`, note: `${totalPenjualan} booking dari ${totalVisitors} visitor` },
    { label: "Pengunjung paket", value: String(totalVisitors), note: "Page view unik harian" },
    { label: "Revenue", value: formatMoney(totalRevenue), note: "Total booking terbayar" },
  ]

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)] p-6 md:p-10">
      <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">Statistik</h1>
        <p className="mt-1 text-sm text-slate-500">Pantau performa paket, traffic, dan revenue merchant secara lebih presisi.</p>
      </section>

      {error || packageViewsResult.error ? (
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
          Gagal memuat statistik.
        </div>
      ) : (
        <>
          <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            {metricCards.map((card) => (
              <div key={card.label} className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-sm text-slate-500">{card.label}</p>
                <p className="mt-2 text-3xl font-bold text-slate-900">{card.value}</p>
                <p className="mt-2 text-xs text-slate-500">{card.note}</p>
              </div>
            ))}
          </section>

          <section className="mt-8 rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">Revenue bulanan</h2>
            <p className="mt-1 text-sm text-slate-500">Ringkasan bulan berjalan untuk evaluasi performa merchant.</p>
            <div className="mt-5 grid gap-4 md:grid-cols-3">
              <div className="rounded-[20px] bg-slate-50 p-5">
                <p className="text-sm text-slate-500">Total Booking</p>
                <p className="mt-2 text-3xl font-bold text-slate-900">{monthlyBookings.length}</p>
              </div>
              <div className="rounded-[20px] bg-slate-50 p-5">
                <p className="text-sm text-slate-500">Revenue</p>
                <p className="mt-2 text-3xl font-bold text-slate-900">{formatMoney(monthlyRevenue)}</p>
              </div>
              <div className="rounded-[20px] bg-slate-50 p-5">
                <p className="text-sm text-slate-500">Top Paket</p>
                <p className="mt-2 text-2xl font-bold text-slate-900">{topPaketBulanan}</p>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  )
}
