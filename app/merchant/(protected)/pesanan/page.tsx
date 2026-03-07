import Link from "next/link"
import { createClient } from "@/lib/supabase/server"

type BookingRow = {
  id: string
  booking_code: string | null
  customer_name: string | null
  pickup_date: string | null
  adult_count: number | null
  child_count: number | null
  payment_status: string | null
  booking_status: string | null
  packages: {
    title: string | null
    merchant_id: string | null
  } | null
}

type OrderFilter = {
  key: string
  label: string
}

const orderFilters: OrderFilter[] = [
  { key: "all", label: "Semua Pesanan" },
  { key: "new", label: "Pesanan Baru" },
  { key: "waiting-payment", label: "Menunggu Pembayaran" },
  { key: "paid", label: "Terbayar" },
  { key: "done", label: "Selesai" },
  { key: "refund", label: "Refund" },
  { key: "cancelled", label: "Dibatalkan" },
]

function formatDate(dateStr: string | null) {
  if (!dateStr) return "-"
  const date = new Date(dateStr)
  if (Number.isNaN(date.getTime())) return dateStr
  return date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  })
}

function normalizeStatus(value: string | null) {
  return (value || "").trim().toLowerCase()
}

function isMatchingFilter(booking: BookingRow, filter: string) {
  const paymentStatus = normalizeStatus(booking.payment_status)
  const tripStatus = normalizeStatus(booking.booking_status)

  if (filter === "all") return true
  if (filter === "new") return tripStatus === "pending" && paymentStatus !== "paid"
  if (filter === "waiting-payment") return paymentStatus === "pending"
  if (filter === "paid") return paymentStatus === "paid"
  if (filter === "done") return tripStatus === "completed" || tripStatus === "done"
  if (filter === "refund") return paymentStatus === "refund" || tripStatus === "refund"
  if (filter === "cancelled") return tripStatus === "cancelled" || paymentStatus === "cancelled"

  return true
}

function badgeClass(value: string | null, type: "payment" | "trip") {
  const normalized = normalizeStatus(value)
  if (normalized === "paid" || normalized === "confirmed" || normalized === "completed") {
    return "bg-emerald-50 text-emerald-700"
  }
  if (normalized === "pending") {
    return type === "payment" ? "bg-amber-50 text-amber-700" : "bg-sky-50 text-sky-700"
  }
  if (normalized === "cancelled" || normalized === "refund" || normalized === "rejected") {
    return "bg-rose-50 text-rose-700"
  }
  return "bg-slate-100 text-slate-700"
}

export default async function MerchantOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>
}) {
  const params = await searchParams
  const activeFilter = orderFilters.some((item) => item.key === params.filter)
    ? String(params.filter)
    : "all"

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data, error } = await supabase
    .from("bookings")
    .select(
      "id, booking_code, customer_name, pickup_date, adult_count, child_count, payment_status, booking_status, packages!inner(title, merchant_id)",
    )
    .eq("packages.merchant_id", user.id)
    .order("created_at", { ascending: false })

  const allBookings = (data as BookingRow[] | null) ?? []
  const bookings = allBookings.filter((booking) => isMatchingFilter(booking, activeFilter))

  const summaryCards = [
    { label: "Total Pesanan", value: allBookings.length },
    {
      label: "Menunggu Pembayaran",
      value: allBookings.filter((booking) => normalizeStatus(booking.payment_status) === "pending").length,
    },
    {
      label: "Terbayar",
      value: allBookings.filter((booking) => normalizeStatus(booking.payment_status) === "paid").length,
    },
    {
      label: "Selesai",
      value: allBookings.filter((booking) => {
        const status = normalizeStatus(booking.booking_status)
        return status === "completed" || status === "done"
      }).length,
    },
  ]

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)] p-6 md:p-10">
      <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">Pesanan</h1>
        <p className="mt-1 text-sm text-slate-500">
          Kelola pesanan customer dengan tampilan operasional yang lebih rapi dan cepat dipindai.
        </p>
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => (
          <div key={card.label} className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">{card.label}</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">{card.value}</p>
          </div>
        ))}
      </section>

      <section className="mt-8 rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-6 flex flex-wrap gap-3">
          {orderFilters.map((filter) => {
            const active = filter.key === activeFilter
            return (
              <Link
                key={filter.key}
                href={`/merchant/pesanan?filter=${filter.key}`}
                className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                  active
                    ? "bg-slate-900 text-white"
                    : "border border-slate-300 bg-white text-slate-700 hover:border-orange-300 hover:text-orange-600"
                }`}
              >
                {filter.label}
              </Link>
            )
          })}
        </div>

        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
            Gagal memuat data pesanan.
          </div>
        ) : bookings.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 text-slate-600">
            Belum ada data pada kategori ini.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-[24px] border border-slate-200">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="border-b p-4">ID Booking</th>
                  <th className="border-b p-4">Nama Customer</th>
                  <th className="border-b p-4">Paket</th>
                  <th className="border-b p-4">Tanggal Wisata</th>
                  <th className="border-b p-4">Jumlah Peserta</th>
                  <th className="border-b p-4">Status Pembayaran</th>
                  <th className="border-b p-4">Status Trip</th>
                </tr>
              </thead>
              <tbody className="bg-white">
                {bookings.map((booking) => {
                  const totalPeserta = (booking.adult_count ?? 0) + (booking.child_count ?? 0)

                  return (
                    <tr key={booking.id} className="hover:bg-slate-50">
                      <td className="border-b p-4 font-medium text-slate-900">
                        {booking.booking_code || booking.id}
                      </td>
                      <td className="border-b p-4">{booking.customer_name || "-"}</td>
                      <td className="border-b p-4">{booking.packages?.title || "-"}</td>
                      <td className="border-b p-4">{formatDate(booking.pickup_date)}</td>
                      <td className="border-b p-4">{totalPeserta}</td>
                      <td className="border-b p-4">
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${badgeClass(booking.payment_status, "payment")}`}>
                          {booking.payment_status || "-"}
                        </span>
                      </td>
                      <td className="border-b p-4">
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${badgeClass(booking.booking_status, "trip")}`}>
                          {booking.booking_status || "-"}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
