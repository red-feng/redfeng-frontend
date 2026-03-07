import { createClient } from "@/lib/supabase/server"

type PayoutBookingRow = {
  id: string
  booking_code: string | null
  created_at: string | null
  total_amount: number | null
  payment_status: string | null
  booking_status: string | null
  packages: {
    merchant_id: string | null
    title: string | null
  } | null
}

function formatMoney(value: number) {
  return `Rp ${value.toLocaleString("id-ID")}`
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

function normalizeStatus(value: string | null) {
  return (value || "").trim().toLowerCase()
}

export default async function MerchantSaldoPayoutPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data, error } = await supabase
    .from("bookings")
    .select("id, booking_code, created_at, total_amount, payment_status, booking_status, packages!inner(merchant_id, title)")
    .eq("packages.merchant_id", user.id)
    .order("created_at", { ascending: false })

  const bookings = (data as PayoutBookingRow[] | null) || []

  const saldoTersedia = bookings
    .filter((booking) => {
      const paymentStatus = normalizeStatus(booking.payment_status)
      const bookingStatus = normalizeStatus(booking.booking_status)
      return paymentStatus === "paid" || bookingStatus === "confirmed" || bookingStatus === "completed"
    })
    .reduce((sum, booking) => sum + (booking.total_amount ?? 0), 0)

  const saldoTertahan = bookings
    .filter((booking) => normalizeStatus(booking.payment_status) === "pending")
    .reduce((sum, booking) => sum + (booking.total_amount ?? 0), 0)

  return (
    <div className="p-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Saldo & Payout</h1>
        <p className="text-sm text-slate-500">Ringkasan saldo merchant dan kesiapan pencairan dana.</p>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
          Gagal memuat data saldo merchant.
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border bg-white p-6 shadow-sm">
              <p className="text-sm text-slate-500">Saldo tersedia</p>
              <p className="mt-2 text-3xl font-bold text-slate-900">{formatMoney(saldoTersedia)}</p>
              <p className="mt-1 text-xs text-slate-500">Contoh: Saldo tersedia Rp 12.000.000</p>
            </div>
            <div className="rounded-2xl border bg-white p-6 shadow-sm">
              <p className="text-sm text-slate-500">Saldo pending</p>
              <p className="mt-2 text-3xl font-bold text-slate-900">{formatMoney(saldoTertahan)}</p>
              <p className="mt-1 text-xs text-slate-500">Contoh: Saldo pending Rp 4.500.000</p>
            </div>
          </div>

          <section className="mt-8 rounded-2xl border bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Tarik dana</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Pengajuan payout belum tersambung ke tabel pencairan. Saat ini halaman menampilkan saldo siap cair
                  dan saldo tertahan lebih dulu.
                </p>
              </div>
              <button
                type="button"
                disabled
                className="rounded-xl bg-slate-300 px-5 py-3 text-sm font-semibold text-white"
              >
                Tarik Dana
              </button>
            </div>
          </section>

          <section className="mt-8 rounded-2xl border bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">Riwayat pencairan</h2>
            <p className="mt-1 text-sm text-slate-500">Sementara menampilkan transaksi booking sebagai basis saldo.</p>

            {bookings.length === 0 ? (
              <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                Belum ada transaksi untuk ditampilkan.
              </div>
            ) : (
              <div className="mt-5 overflow-x-auto rounded-xl border border-slate-200">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-600">
                    <tr>
                      <th className="border-b p-3">Tanggal</th>
                      <th className="border-b p-3">ID Booking</th>
                      <th className="border-b p-3">Paket</th>
                      <th className="border-b p-3">Nominal</th>
                      <th className="border-b p-3">Status Pembayaran</th>
                      <th className="border-b p-3">Status Trip</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bookings.map((booking) => (
                      <tr key={booking.id} className="hover:bg-slate-50">
                        <td className="border-b p-3">{formatDate(booking.created_at)}</td>
                        <td className="border-b p-3">{booking.booking_code || booking.id}</td>
                        <td className="border-b p-3">{booking.packages?.title || "-"}</td>
                        <td className="border-b p-3">{formatMoney(booking.total_amount ?? 0)}</td>
                        <td className="border-b p-3">{booking.payment_status || "-"}</td>
                        <td className="border-b p-3">{booking.booking_status || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  )
}
