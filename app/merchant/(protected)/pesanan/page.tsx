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
  merchant_packages: {
    name: string | null
    merchant_id: string | null
  } | null
}

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

export default async function MerchantOrdersPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data, error } = await supabase
    .from("bookings")
    .select(
      "id, booking_code, customer_name, pickup_date, adult_count, child_count, payment_status, booking_status, merchant_packages!inner(name, merchant_id)",
    )
    .eq("merchant_packages.merchant_id", user.id)
    .order("created_at", { ascending: false })

  const bookings = (data as BookingRow[] | null) ?? []

  return (
    <div className="p-10">
      <h1 className="mb-6 text-2xl font-bold">Pesanan</h1>

      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-red-700">
          Gagal memuat data pesanan.
        </div>
      ) : bookings.length === 0 ? (
        <div className="rounded-md border border-gray-200 bg-white p-4 text-gray-600">
          Belum ada pesanan.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-md border border-gray-200 bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-gray-100 text-gray-700">
              <tr>
                <th className="border-b p-3">ID Booking</th>
                <th className="border-b p-3">Nama Customer</th>
                <th className="border-b p-3">Paket</th>
                <th className="border-b p-3">Tanggal Wisata</th>
                <th className="border-b p-3">Jumlah Peserta</th>
                <th className="border-b p-3">Status Pembayaran</th>
                <th className="border-b p-3">Status Trip</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((booking) => {
                const totalPeserta =
                  (booking.adult_count ?? 0) + (booking.child_count ?? 0)

                return (
                  <tr key={booking.id} className="hover:bg-gray-50">
                    <td className="border-b p-3">
                      {booking.booking_code || booking.id}
                    </td>
                    <td className="border-b p-3">{booking.customer_name || "-"}</td>
                    <td className="border-b p-3">
                      {booking.merchant_packages?.name || "-"}
                    </td>
                    <td className="border-b p-3">
                      {formatDate(booking.pickup_date)}
                    </td>
                    <td className="border-b p-3">{totalPeserta}</td>
                    <td className="border-b p-3">{booking.payment_status || "-"}</td>
                    <td className="border-b p-3">{booking.booking_status || "-"}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
