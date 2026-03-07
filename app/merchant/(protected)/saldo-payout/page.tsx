import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { requestPayout } from "./actions"

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

  const [{ data, error }, payoutResult] = await Promise.all([
    adminSupabase
      .from("bookings")
      .select("id, booking_code, created_at, total_amount, payment_status, booking_status, packages!inner(merchant_id, title)")
      .eq("packages.merchant_id", merchant.id)
      .order("created_at", { ascending: false }),
    adminSupabase
      .from("payout_requests")
      .select("id, amount, status, requested_at, processed_at, bank_name, bank_account_number, bank_account_holder")
      .eq("merchant_id", merchant.id)
      .order("requested_at", { ascending: false }),
  ])

  const bookings = (data as PayoutBookingRow[] | null) || []
  const payouts = (payoutResult.data as PayoutRequestRow[] | null) || []

  const grossAvailable = bookings
    .filter((booking) => {
      const paymentStatus = normalizeStatus(booking.payment_status)
      const bookingStatus = normalizeStatus(booking.booking_status)
      return paymentStatus === "paid" || bookingStatus === "confirmed" || bookingStatus === "completed"
    })
    .reduce((sum, booking) => sum + (booking.total_amount ?? 0), 0)

  const reservedPayout = payouts
    .filter((payout) => {
      const status = normalizeStatus(payout.status)
      return status === "pending" || status === "approved" || status === "processing"
    })
    .reduce((sum, payout) => sum + Number(payout.amount || 0), 0)

  const saldoTersedia = Math.max(grossAvailable - reservedPayout, 0)
  const saldoTertahan = bookings
    .filter((booking) => normalizeStatus(booking.payment_status) === "pending")
    .reduce((sum, booking) => sum + (booking.total_amount ?? 0), 0)

  const metricCards = [
    {
      label: "Saldo tersedia",
      value: formatMoney(saldoTersedia),
      note: "Bisa diajukan untuk pencairan",
    },
    {
      label: "Saldo tertahan",
      value: formatMoney(saldoTertahan),
      note: "Booking masih menunggu pembayaran",
    },
    {
      label: "Request payout",
      value: String(payouts.length),
      note: "Total riwayat pengajuan",
    },
    {
      label: "Dana dicadangkan",
      value: formatMoney(reservedPayout),
      note: "Payout pending atau sedang diproses",
    },
  ]

  const destinationAccount =
    [merchant.bank_name, merchant.bank_account_holder, merchant.bank_account_number]
      .filter(Boolean)
      .join(" | ") || "-"

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)] p-6 md:p-10">
      <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">Saldo & Payout</h1>
        <p className="mt-1 text-sm text-slate-500">
          Pantau arus dana merchant, nominal yang masih tertahan, dan histori pencairan dalam satu tampilan.
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
                  Semua request payout merchant berikut status prosesnya.
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
                              {payout.status || "-"}
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
                  Pengajuan payout akan dikirim ke rekening merchant yang tersimpan.
                </p>
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
        </>
      )}
    </div>
  )
}
