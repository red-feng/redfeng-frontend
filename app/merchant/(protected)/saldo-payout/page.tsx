import { createAdminClient } from "@/lib/supabase/admin"
import { type Locale, normalizeLocale } from "@/lib/i18n"
import { getCurrentLocale } from "@/lib/locale"
import { createClient } from "@/lib/supabase/server"

type PayoutBookingRow = {
  id: string
  package_id: string | null
  booking_code: string | null
  created_at: string | null
  pickup_date: string | null
  customer_name: string | null
  total_amount: number | null
  adult_count: number | null
  child_count: number | null
  payment_status: string | null
  booking_status: string | null
  escrow_status: string | null
  merchant_arrived_at: string | null
  merchant_picked_up_at: string | null
  customer_picked_up_at: string | null
}

function getPayoutText(locale: Locale) {
  const dict = {
    id: {
      merchantMissing: "Data merchant tidak ditemukan.",
      heroBadge: "Wallet & Payout",
      heroTitle: "Kontrol saldo merchant dan ritme pencairan dalam workspace yang lebih profesional.",
      heroDescription: "Pantau escrow, dana siap payout, request yang sedang diproses, dan riwayat pencairan tanpa kehilangan konteks operasional booking merchant.",
      loadError: "Gagal memuat data saldo merchant.",
    },
    en: {
      merchantMissing: "Merchant data not found.",
      heroBadge: "Wallet & Payout",
      heroTitle: "Control merchant balance and payout rhythm in a more professional workspace.",
      heroDescription: "Monitor escrow, funds ready for payout, requests being processed, and payout history without losing merchant booking context.",
      loadError: "Failed to load merchant balance data.",
    },
    zh: {
      merchantMissing: "未找到商家数据。",
      heroBadge: "钱包与结算",
      heroTitle: "以更专业的方式掌控商家余额与结算节奏。",
      heroDescription: "查看托管资金、待结算金额、处理中请求以及历史打款记录，同时保留完整的商家订单运营上下文。",
      loadError: "加载商家余额数据失败。",
    },
  } satisfies Record<Locale, Record<string, string>>

  return dict[locale]
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
  return (
    normalizeStatus(booking.payment_status) === "paid" &&
    ["awaiting_admin_handoff", "finance_review", "payout_processing", "paid_out"].includes(
      normalizeStatus(booking.escrow_status),
    )
  )
}

function isHeldBooking(booking: PayoutBookingRow) {
  const paymentStatus = normalizeStatus(booking.payment_status)
  const escrowStatus = normalizeStatus(booking.escrow_status)
  return (
    paymentStatus === "pending" ||
    paymentStatus === "dp_paid" ||
    escrowStatus === "held" ||
    escrowStatus === "partial_hold"
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
  const locale = normalizeLocale(await getCurrentLocale())
  const t = getPayoutText(locale)
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

  if (!merchant) return <div className="p-10">{t.merchantMissing}</div>

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
          .select("id, package_id, booking_code, created_at, pickup_date, customer_name, total_amount, adult_count, child_count, payment_status, booking_status, escrow_status, merchant_arrived_at, merchant_picked_up_at, customer_picked_up_at")
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
      note: "Sudah lolos konfirmasi pickup dan siap payout",
    },
    {
      label: "Saldo tertahan",
      value: formatMoney(saldoTertahan),
      note: "Masih ditahan di escrow RedFeng",
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
    <main className="min-h-screen bg-[linear-gradient(180deg,#fff8f1_0%,#f7f1e8_38%,#f3eee7_100%)] p-6 md:p-10">
      <section className="overflow-hidden rounded-[34px] border border-orange-100 bg-[linear-gradient(135deg,#983108_0%,#f76707_52%,#ffb357_100%)] text-white shadow-[0_28px_80px_rgba(194,65,12,0.24)]">
        <div className="grid gap-6 px-7 py-8 lg:grid-cols-[minmax(0,1.4fr)_440px] lg:px-10 lg:py-10">
          <div>
            <div className="inline-flex rounded-full border border-white/25 bg-white/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-white/90">
              {t.heroBadge}
            </div>
            <h1 className="mt-5 max-w-3xl text-4xl font-semibold leading-[1.05] tracking-[-0.04em] text-white md:text-5xl">
              {t.heroTitle}
            </h1>
            <p className="mt-5 max-w-3xl text-sm leading-7 text-white/90 md:text-base">
              {t.heroDescription}
            </p>
          </div>

          <div className="grid gap-4">
            <div className="rounded-[28px] border border-white/30 bg-white/12 p-5 backdrop-blur-sm">
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-white/75">Payout Snapshot</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                <div className="rounded-[20px] border border-white/20 bg-white/10 px-4 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/70">Request pending</p>
                  <p className="mt-2 text-2xl font-semibold text-white">{payoutCounts.pending}</p>
                  <p className="mt-1 text-xs leading-5 text-white/70">Menunggu approval atau transfer</p>
                </div>
                <div className="rounded-[20px] border border-white/20 bg-white/10 px-4 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/70">Rekening tujuan</p>
                  <p className="mt-2 text-sm font-semibold text-white">{destinationAccount}</p>
                  <p className="mt-1 text-xs leading-5 text-white/70">Akun yang dipakai saat payout</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {params.success && (
        <div className="mt-6 rounded-[24px] border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-700">
          {params.success}
        </div>
      )}

      {params.error && (
        <div className="mt-4 rounded-[24px] border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
          {params.error}
        </div>
      )}

      {error ? (
        <div className="mt-6 rounded-[24px] border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
          {t.loadError}
        </div>
      ) : (
        <>
          <section className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {metricCards.map((card) => (
              <div
                key={card.label}
                className="rounded-[26px] border border-[#f0ddc7] bg-white px-5 py-5 shadow-[0_18px_44px_rgba(15,23,42,0.06)]"
              >
                <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-orange-500">{card.label}</p>
                <p className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-slate-950">{card.value}</p>
                <p className="mt-2 text-xs leading-6 text-slate-500">{card.note}</p>
              </div>
            ))}
          </section>

          <section className="mt-8 grid gap-6 xl:grid-cols-[1.12fr_0.88fr]">
            <div className="rounded-[32px] border border-[#f3dbc3] bg-white/85 p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur-sm lg:p-7">
              <div className="flex flex-col gap-2">
                <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-orange-500">Payout History</p>
                <h2 className="text-2xl font-semibold tracking-[-0.03em] text-slate-950">Riwayat pencairan</h2>
                <p className="text-sm leading-6 text-slate-500">
                  Semua request payout merchant berikut status proses dan rekening tujuan.
                </p>
              </div>

              {payouts.length === 0 ? (
                <div className="mt-5 rounded-[22px] border border-[#eadfce] bg-[#fffaf3] p-5 text-sm text-slate-600">
                  Belum ada riwayat pencairan.
                </div>
              ) : (
                <div className="mt-5 overflow-x-auto rounded-[24px] border border-[#efe3d1]">
                  <table className="min-w-full text-left text-sm">
                    <thead className="bg-[#fff8ef] text-slate-600">
                      <tr>
                        <th className="border-b border-[#efe3d1] p-4">Tanggal Request</th>
                        <th className="border-b border-[#efe3d1] p-4">Nominal</th>
                        <th className="border-b border-[#efe3d1] p-4">Status</th>
                        <th className="border-b border-[#efe3d1] p-4">Rekening Tujuan</th>
                        <th className="border-b border-[#efe3d1] p-4">Diproses</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white">
                      {payouts.map((payout) => (
                        <tr key={payout.id} className="hover:bg-[#fffdf9]">
                          <td className="border-b border-[#f3ebdf] p-4">{formatDate(payout.requested_at)}</td>
                          <td className="border-b border-[#f3ebdf] p-4 font-medium text-slate-950">
                            {formatMoney(Number(payout.amount || 0))}
                          </td>
                          <td className="border-b border-[#f3ebdf] p-4">
                            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${payoutStatusClass(payout.status)}`}>
                              {titleCaseStatus(payout.status)}
                            </span>
                          </td>
                          <td className="border-b border-[#f3ebdf] p-4">
                            {[payout.bank_name, payout.bank_account_holder, payout.bank_account_number]
                              .filter(Boolean)
                              .join(" | ") || "-"}
                          </td>
                          <td className="border-b border-[#f3ebdf] p-4">{formatDate(payout.processed_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="rounded-[32px] border border-[#f3dbc3] bg-white/85 p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur-sm lg:p-7">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-orange-500">Finance Controlled</p>
                <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950">Payout diproses internal</h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Merchant tidak lagi menarik dana manual. Setelah Arrived, customer Picked up, dan merchant Go selesai, admin akan handoff ke finance.
                </p>
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div className="rounded-[22px] border border-[#efe3d1] bg-[#fffaf3] p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">Request pending</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-950">{payoutCounts.pending}</p>
                </div>
                <div className="rounded-[22px] border border-[#efe3d1] bg-[#fffaf3] p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">Payout selesai</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-950">{payoutCounts.paid}</p>
                </div>
              </div>

              <div className="mt-5 rounded-[22px] border border-[#efe3d1] bg-[#fffaf3] p-5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">Rekening tujuan</p>
                <p className="mt-3 text-sm leading-7 text-slate-700">{destinationAccount}</p>
              </div>

              <div className="mt-5 space-y-4">
                <div className="rounded-[22px] border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                  Estimasi payout yang siap diproses saat ini: <span className="font-semibold">{formatMoney(saldoTersedia)}</span>
                </div>
                <div className="rounded-[22px] border border-[#efe3d1] bg-[#fffaf3] p-4 text-sm leading-6 text-slate-600">
                  Dana customer tetap ditahan sampai merchant klik <span className="font-semibold">Arrived</span>,
                  customer klik <span className="font-semibold">Picked up</span>, merchant klik <span className="font-semibold">Go</span>,
                  lalu admin mengirim booking ke finance untuk transfer.
                </div>
              </div>
            </div>
          </section>

          <section className="mt-8 grid gap-6 xl:grid-cols-2">
            <div className="rounded-[32px] border border-[#f3dbc3] bg-white/85 p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur-sm lg:p-7">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-orange-500">Ready For Payout</p>
                  <h3 className="mt-2 text-xl font-semibold text-slate-950">Booking siap payout</h3>
                  <p className="mt-1 text-sm leading-6 text-slate-500">
                    Booking yang sudah lunas dan pickup-nya sudah dikonfirmasi merchant dan customer.
                  </p>
                </div>
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                  {availableBookings.length} booking
                </span>
              </div>

              {availableBookings.length === 0 ? (
                <div className="mt-5 rounded-[22px] border border-[#eadfce] bg-[#fffaf3] p-4 text-sm text-slate-600">
                  Belum ada booking yang siap payout.
                </div>
              ) : (
                <div className="mt-5 overflow-x-auto rounded-[24px] border border-[#efe3d1]">
                  <table className="min-w-full text-left text-sm">
                    <thead className="bg-[#fff8ef] text-slate-600">
                      <tr>
                        <th className="border-b border-[#efe3d1] p-4">Booking</th>
                        <th className="border-b border-[#efe3d1] p-4">Paket</th>
                        <th className="border-b border-[#efe3d1] p-4">Customer</th>
                        <th className="border-b border-[#efe3d1] p-4">Trip</th>
                        <th className="border-b border-[#efe3d1] p-4">Peserta</th>
                        <th className="border-b border-[#efe3d1] p-4">Nominal</th>
                        <th className="border-b border-[#efe3d1] p-4">Escrow</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white">
                      {availableBookings.map((booking) => (
                        <tr key={booking.id} className="hover:bg-[#fffdf9]">
                          <td className="border-b border-[#f3ebdf] p-4 font-medium text-slate-950">
                            {booking.booking_code || booking.id.slice(0, 8)}
                          </td>
                          <td className="border-b border-[#f3ebdf] p-4 text-slate-700">
                            {packageMap.get(booking.package_id || "") || "Paket tanpa nama"}
                          </td>
                          <td className="border-b border-[#f3ebdf] p-4 text-slate-700">{booking.customer_name || "-"}</td>
                          <td className="border-b border-[#f3ebdf] p-4 text-slate-700">{formatDate(booking.pickup_date)}</td>
                          <td className="border-b border-[#f3ebdf] p-4 text-slate-700">{participantCount(booking)}</td>
                          <td className="border-b border-[#f3ebdf] p-4 font-medium text-slate-950">
                            {formatMoney(Number(booking.total_amount || 0))}
                          </td>
                          <td className="border-b border-[#f3ebdf] p-4">
                            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                              {titleCaseStatus(booking.escrow_status)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="rounded-[32px] border border-[#f3dbc3] bg-white/85 p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur-sm lg:p-7">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-orange-500">Funds On Hold</p>
                  <h3 className="mt-2 text-xl font-semibold text-slate-950">Dana masih ditahan</h3>
                  <p className="mt-1 text-sm leading-6 text-slate-500">
                    Booking yang dananya masih berada di escrow RedFeng atau belum lunas.
                  </p>
                </div>
                <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                  {heldBookings.length} booking
                </span>
              </div>

              {heldBookings.length === 0 ? (
                <div className="mt-5 rounded-[22px] border border-[#eadfce] bg-[#fffaf3] p-4 text-sm text-slate-600">
                  Tidak ada dana yang sedang ditahan.
                </div>
              ) : (
                <div className="mt-5 overflow-x-auto rounded-[24px] border border-[#efe3d1]">
                  <table className="min-w-full text-left text-sm">
                    <thead className="bg-[#fff8ef] text-slate-600">
                      <tr>
                        <th className="border-b border-[#efe3d1] p-4">Booking</th>
                        <th className="border-b border-[#efe3d1] p-4">Paket</th>
                        <th className="border-b border-[#efe3d1] p-4">Customer</th>
                        <th className="border-b border-[#efe3d1] p-4">Trip</th>
                        <th className="border-b border-[#efe3d1] p-4">Peserta</th>
                        <th className="border-b border-[#efe3d1] p-4">Nominal</th>
                        <th className="border-b border-[#efe3d1] p-4">Escrow</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white">
                      {heldBookings.map((booking) => (
                        <tr key={booking.id} className="hover:bg-[#fffdf9]">
                          <td className="border-b border-[#f3ebdf] p-4 font-medium text-slate-950">
                            {booking.booking_code || booking.id.slice(0, 8)}
                          </td>
                          <td className="border-b border-[#f3ebdf] p-4 text-slate-700">
                            {packageMap.get(booking.package_id || "") || "Paket tanpa nama"}
                          </td>
                          <td className="border-b border-[#f3ebdf] p-4 text-slate-700">{booking.customer_name || "-"}</td>
                          <td className="border-b border-[#f3ebdf] p-4 text-slate-700">{formatDate(booking.pickup_date)}</td>
                          <td className="border-b border-[#f3ebdf] p-4 text-slate-700">{participantCount(booking)}</td>
                          <td className="border-b border-[#f3ebdf] p-4 font-medium text-slate-950">
                            {formatMoney(Number(booking.total_amount || 0))}
                          </td>
                          <td className="border-b border-[#f3ebdf] p-4">
                            <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                              {titleCaseStatus(booking.escrow_status)}
                            </span>
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
    </main>
  )
}
