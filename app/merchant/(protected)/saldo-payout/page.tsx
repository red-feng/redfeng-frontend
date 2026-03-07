import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { requestPayout } from "./actions"

type PayoutBookingRow = {
  id: string
  package_id: string | null
  booking_code: string | null
  created_at: string | null
  trip_date: string | null
  customer_name: string | null
  total_amount: number | null
  adult_count: number | null
  child_count: number | null
  payment_status: string | null
  booking_status: string | null
}

type PayoutRequestRow = {
  id: string
  amount: number | null
  status: string | null
  requested_at: string | null
  processed_at: string | null
  bank_name: string | null
  bank_account_number: string | null
  bank_account_holder: string | null
}

type MerchantPackageRow = {
  id: string
  title: string | null
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

function titleCaseStatus(value: string | null) {
  const normalized = normalizeStatus(value)
  if (!normalized) return "-"

  return normalized
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

function payoutStatusClass(value: string | null) {
  const status = normalizeStatus(value)
  if (status === "approved" || status === "paid" || status === "completed") {
    return "bg-emerald-50 text-emerald-700"
  }
  if (status === "pending" || status === "processing") {
    return "bg-amber-50 text-amber-700"
  }
  if (status === "rejected" || status === "cancelled") {
    return "bg-rose-50 text-rose-700"
  }
  return "bg-slate-100 text-slate-700"
}

function isAvailableBooking(booking: PayoutBookingRow) {
  const paymentStatus = normalizeStatus(booking.payment_status)
  const bookingStatus = normalizeStatus(booking.booking_status)
  return paymentStatus === "paid" || bookingStatus === "confirmed" || bookingStatus === "completed"
}

function isHeldBooking(booking: PayoutBookingRow) {
  const paymentStatus = normalizeStatus(booking.payment_status)
  const bookingStatus = normalizeStatus(booking.booking_status)
  return (
    paymentStatus === "pending" ||
    paymentStatus === "challenge" ||
    paymentStatus === "capture" ||
    bookingStatus === "pending"
  )
}

function participantCount(booking: PayoutBookingRow) {
  return (booking.adult_count || 0) + (booking.child_count || 0)
}

export default async function MerchantSaldoPayoutPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()
  const adminSupabase = createAdminClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data: merchant } = await adminSupabase
    .from("merchants")
    .select("id, bank_name, bank_account_number, bank_account_holder")
    .eq("user_id", user.id)
    .single()

  if (!merchant) return <div className="p-10">Data merchant tidak ditemukan.</div>

  const { data: merchantPackages, error: packagesError } = await adminSupabase
    .from("packages")
    .select("id, title")
    .eq("merchant_id", merchant.id)
    .order("created_at", { ascending: false })

  const packageRows = (merchantPackages as MerchantPackageRow[] | null) || []
  const packageIds = packageRows.map((pkg) => pkg.id).filter(Boolean)
  const packageMap = new Map(packageRows.map((pkg) => [pkg.id, pkg.title || "Paket tanpa nama"]))

  const [bookingResult, payoutResult] = await Promise.all([
    packageIds.length > 0
      ? adminSupabase
          .from("bookings")
          .select(
            "id, package_id, booking_code, created_at, trip_date, customer_name, total_amount, adult_count, child_count, payment_status, booking_status",
          )
          .in("package_id", packageIds)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [], error: null }),
    adminSupabase
      .from("payout_requests")
      .select("id, amount, status, requested_at, processed_at, bank_name, bank_account_number, bank_account_holder")
      .eq("merchant_id", merchant.id)
      .order("requested_at", { ascending: false }),
  ])

  const bookings = (bookingResult.data as PayoutBookingRow[] | null) || []
  const payouts = (payoutResult.data as PayoutRequestRow[] | null) || []
  const error = packagesError || bookingResult.error || payoutResult.error

  const availableBookings = bookings.filter(isAvailableBooking)
  const heldBookings = bookings.filter(isHeldBooking)

  const grossAvailable = availableBookings.reduce((sum, booking) => sum + Number(booking.total_amount || 0), 0)
  const reservedPayout = payouts
    .filter((payout) => {
      const status = normalizeStatus(payout.status)
      return status === "pending" || status === "approved" || status === "processing"
    })
    .reduce((sum, payout) => sum + Number(payout.amount || 0), 0)
  const paidPayout = payouts
    .filter((payout) => {
      const status = normalizeStatus(payout.status)
      return status === "paid" || status === "completed"
    })
    .reduce((sum, payout) => sum + Number(payout.amount || 0), 0)

  const saldoTersedia = Math.max(grossAvailable - reservedPayout, 0)
  const saldoTertahan = heldBookings.reduce((sum, booking) => sum + Number(booking.total_amount || 0), 0)

  const metricCards = [
    {
      label: "Saldo tersedia",
      value: formatMoney(saldoTersedia),
      note: "Booking sudah layak dicairkan",
    },
    {
      label: "Saldo tertahan",
      value: formatMoney(saldoTertahan),
      note: "Booking masih menunggu settlement",
    },
    {
      label: "Payout diproses",
      value: formatMoney(reservedPayout),
      note: "Request pending atau processing",
    },
    {
      label: "Payout selesai",
      value: formatMoney(paidPayout),
      note: "Dana yang sudah pernah dicairkan",
    },
  ]

  const payoutCounts = {
    pending: payouts.filter((payout) => {
      const status = normalizeStatus(payout.status)
      return status === "pending" || status === "approved" || status === "processing"
    }).length,
    paid: payouts.filter((payout) => {
      const status = normalizeStatus(payout.status)
      return status === "paid" || status === "completed"
    }).length,
  }

  const destinationAccount =
    [merchant.bank_name, merchant.bank_account_holder, merchant.bank_account_number]
      .filter(Boolean)
      .join(" | ") || "-"

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)] p-6 md:p-10">
      <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">Saldo & Payout</h1>
        <p className="mt-1 text-sm text-slate-500">
          Pantau saldo siap cair, dana tertahan, histori pencairan, dan sumber pemasukan booking merchant.
        </p>
      </section>

      {params.success && (
        <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-700">
          {params.success}
        </div>
      )}

      {params.error && (
        <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-700">
          {params.error}
        </div>
      )}

      {error ? (
        <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
          Gagal memuat data saldo merchant.
        </div>
      ) : (
        <>
          <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {metricCards.map((card) => (
              <div key={card.label} className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-sm text-slate-500">{card.label}</p>
                <p className="mt-2 text-3xl font-bold text-slate-900">{card.value}</p>
                <p className="mt-2 text-xs text-slate-500">{card.note}</p>
              </div>
            ))}
          </section>

          <section className="mt-8 grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
            <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-2">
                <h2 className="text-xl font-semibold text-slate-900">Riwayat pencairan</h2>
                <p className="text-sm text-slate-500">
                  Semua request payout merchant berikut status proses dan rekening tujuan.
                </p>
              </div>

              {payouts.length === 0 ? (
                <div className="mt-5 rounded-[20px] border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600">
                  Belum ada riwayat pencairan.
                </div>
              ) : (
                <div className="mt-5 overflow-x-auto rounded-[24px] border border-slate-200">
                  <table className="min-w-full text-left text-sm">
                    <thead className="bg-slate-50 text-slate-600">
                      <tr>
                        <th className="border-b p-4">Tanggal Request</th>
                        <th className="border-b p-4">Nominal</th>
                        <th className="border-b p-4">Status</th>
                        <th className="border-b p-4">Rekening Tujuan</th>
                        <th className="border-b p-4">Diproses</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white">
                      {payouts.map((payout) => (
                        <tr key={payout.id} className="hover:bg-slate-50">
                          <td className="border-b p-4">{formatDate(payout.requested_at)}</td>
                          <td className="border-b p-4 font-medium text-slate-900">
                            {formatMoney(Number(payout.amount || 0))}
                          </td>
                          <td className="border-b p-4">
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-semibold ${payoutStatusClass(payout.status)}`}
                            >
                              {titleCaseStatus(payout.status)}
                            </span>
                          </td>
                          <td className="border-b p-4">
                            {[payout.bank_name, payout.bank_account_holder, payout.bank_account_number]
                              .filter(Boolean)
                              .join(" | ") || "-"}
                          </td>
                          <td className="border-b p-4">{formatDate(payout.processed_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Tarik dana</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Ajukan payout ke rekening merchant yang tersimpan di profil bisnis.
                </p>
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div className="rounded-[20px] bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Request pending</p>
                  <p className="mt-2 text-2xl font-bold text-slate-900">{payoutCounts.pending}</p>
                </div>
                <div className="rounded-[20px] bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Payout selesai</p>
                  <p className="mt-2 text-2xl font-bold text-slate-900">{payoutCounts.paid}</p>
                </div>
              </div>

              <div className="mt-5 rounded-[20px] bg-slate-50 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Rekening tujuan</p>
                <p className="mt-3 text-sm leading-6 text-slate-700">{destinationAccount}</p>
              </div>

              <form action={requestPayout} className="mt-5 space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Nominal payout</label>
                  <input
                    name="amount"
                    type="number"
                    min="1"
                    max={saldoTersedia}
                    placeholder="Masukkan nominal"
                    className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none ring-orange-500 transition focus:ring-2"
                    required
                  />
                </div>
                <div className="rounded-[20px] bg-amber-50 p-4 text-sm text-amber-800">
                  Saldo tersedia saat ini: <span className="font-semibold">{formatMoney(saldoTersedia)}</span>
                </div>
                <div className="rounded-[20px] bg-slate-50 p-4 text-sm text-slate-600">
                  Dana tersedia berasal dari booking yang sudah `paid`, `confirmed`, atau `completed`.
                </div>
                <button
                  type="submit"
                  disabled={saldoTersedia <= 0}
                  className="w-full rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  Tarik Dana
                </button>
              </form>
            </div>
          </section>

          <section className="mt-8 grid gap-6 xl:grid-cols-2">
            <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">Sumber saldo tersedia</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Booking yang sudah memenuhi syarat payout dan menjadi dasar saldo merchant saat ini.
                  </p>
                </div>
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                  {availableBookings.length} booking
                </span>
              </div>

              {availableBookings.length === 0 ? (
                <div className="mt-5 rounded-[20px] border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                  Belum ada booking yang masuk ke saldo tersedia.
                </div>
              ) : (
                <div className="mt-5 overflow-x-auto rounded-[24px] border border-slate-200">
                  <table className="min-w-full text-left text-sm">
                    <thead className="bg-slate-50 text-slate-600">
                      <tr>
                        <th className="border-b p-4">Booking</th>
                        <th className="border-b p-4">Paket</th>
                        <th className="border-b p-4">Customer</th>
                        <th className="border-b p-4">Trip</th>
                        <th className="border-b p-4">Peserta</th>
                        <th className="border-b p-4">Nominal</th>
                        <th className="border-b p-4">Status</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white">
                      {availableBookings.map((booking) => (
                        <tr key={booking.id} className="hover:bg-slate-50">
                          <td className="border-b p-4 font-medium text-slate-900">
                            {booking.booking_code || booking.id.slice(0, 8)}
                          </td>
                          <td className="border-b p-4 text-slate-700">
                            {packageMap.get(booking.package_id || "") || "Paket tanpa nama"}
                          </td>
                          <td className="border-b p-4 text-slate-700">{booking.customer_name || "-"}</td>
                          <td className="border-b p-4 text-slate-700">{formatDate(booking.trip_date)}</td>
                          <td className="border-b p-4 text-slate-700">{participantCount(booking)}</td>
                          <td className="border-b p-4 font-medium text-slate-900">
                            {formatMoney(Number(booking.total_amount || 0))}
                          </td>
                          <td className="border-b p-4">
                            <div className="flex flex-wrap gap-2">
                              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                                Bayar: {titleCaseStatus(booking.payment_status)}
                              </span>
                              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                                Trip: {titleCaseStatus(booking.booking_status)}
                              </span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">Saldo tertahan</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Booking yang masih menunggu settlement atau belum layak dicairkan.
                  </p>
                </div>
                <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                  {heldBookings.length} booking
                </span>
              </div>

              {heldBookings.length === 0 ? (
                <div className="mt-5 rounded-[20px] border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                  Tidak ada saldo tertahan saat ini.
                </div>
              ) : (
                <div className="mt-5 overflow-x-auto rounded-[24px] border border-slate-200">
                  <table className="min-w-full text-left text-sm">
                    <thead className="bg-slate-50 text-slate-600">
                      <tr>
                        <th className="border-b p-4">Booking</th>
                        <th className="border-b p-4">Paket</th>
                        <th className="border-b p-4">Customer</th>
                        <th className="border-b p-4">Trip</th>
                        <th className="border-b p-4">Peserta</th>
                        <th className="border-b p-4">Nominal</th>
                        <th className="border-b p-4">Status</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white">
                      {heldBookings.map((booking) => (
                        <tr key={booking.id} className="hover:bg-slate-50">
                          <td className="border-b p-4 font-medium text-slate-900">
                            {booking.booking_code || booking.id.slice(0, 8)}
                          </td>
                          <td className="border-b p-4 text-slate-700">
                            {packageMap.get(booking.package_id || "") || "Paket tanpa nama"}
                          </td>
                          <td className="border-b p-4 text-slate-700">{booking.customer_name || "-"}</td>
                          <td className="border-b p-4 text-slate-700">{formatDate(booking.trip_date)}</td>
                          <td className="border-b p-4 text-slate-700">{participantCount(booking)}</td>
                          <td className="border-b p-4 font-medium text-slate-900">
                            {formatMoney(Number(booking.total_amount || 0))}
                          </td>
                          <td className="border-b p-4">
                            <div className="flex flex-wrap gap-2">
                              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                                Bayar: {titleCaseStatus(booking.payment_status)}
                              </span>
                              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                                Trip: {titleCaseStatus(booking.booking_status)}
                              </span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  )
}
