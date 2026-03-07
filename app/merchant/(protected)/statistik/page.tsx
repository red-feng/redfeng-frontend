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
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data, error } = await supabase
    .from("bookings")
    .select("id, created_at, total_amount, payment_status, booking_status, packages!inner(id, title, merchant_id)")
    .eq("packages.merchant_id", user.id)
    .order("created_at", { ascending: false })

  const bookings = (data as StatsBookingRow[] | null) || []
  const now = new Date()
  const currentMonth = now.getMonth()
  const currentYear = now.getFullYear()

  const revenueBookings = bookings.filter(isRevenueBooking)
  const totalPenjualan = bookings.length
  const totalRevenue = revenueBookings.reduce((sum, item) => sum + (item.total_amount ?? 0), 0)

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

  const topPaket =
    Array.from(packageTotals.values()).sort((a, b) => b.count - a.count)[0]?.title || "-"

  const monthlyBookings = bookings.filter((booking) => {
    if (!booking.created_at) return false
    const date = new Date(booking.created_at)
    return date.getMonth() === currentMonth && date.getFullYear() === currentYear
  })

  const monthlyRevenueBookings = monthlyBookings.filter(isRevenueBooking)
  const monthlyRevenue = monthlyRevenueBookings.reduce(
    (sum, item) => sum + (item.total_amount ?? 0),
    0,
  )

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

  return (
    <div className="p-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Statistik</h1>
        <p className="text-sm text-gray-500">Ringkasan performa penjualan paket merchant.</p>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
          Gagal memuat statistik.
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <div className="rounded-2xl border bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">Total penjualan</p>
              <p className="mt-2 text-3xl font-bold text-slate-900">{totalPenjualan}</p>
              <p className="mt-1 text-xs text-slate-500">Total booking merchant</p>
            </div>
            <div className="rounded-2xl border bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">Paket terlaris</p>
              <p className="mt-2 text-xl font-bold text-slate-900">{topPaket}</p>
              <p className="mt-1 text-xs text-slate-500">Berdasarkan jumlah booking</p>
            </div>
            <div className="rounded-2xl border bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">Conversion rate</p>
              <p className="mt-2 text-xl font-bold text-slate-900">Belum tersedia</p>
              <p className="mt-1 text-xs text-slate-500">Butuh tracking visitor paket</p>
            </div>
            <div className="rounded-2xl border bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">Pengunjung paket</p>
              <p className="mt-2 text-xl font-bold text-slate-900">Belum tersedia</p>
              <p className="mt-1 text-xs text-slate-500">Butuh data page view</p>
            </div>
            <div className="rounded-2xl border bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">Revenue</p>
              <p className="mt-2 text-2xl font-bold text-slate-900">{formatMoney(totalRevenue)}</p>
              <p className="mt-1 text-xs text-slate-500">Total booking terbayar</p>
            </div>
          </div>

          <section className="mt-8 rounded-2xl border bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">Revenue bulanan</h2>
            <div className="mt-5 grid gap-4 md:grid-cols-3">
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-sm text-slate-500">Total Booking</p>
                <p className="mt-2 text-3xl font-bold text-slate-900">{monthlyBookings.length}</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-sm text-slate-500">Revenue</p>
                <p className="mt-2 text-3xl font-bold text-slate-900">{formatMoney(monthlyRevenue)}</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-4">
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
