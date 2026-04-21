import { createAdminClient } from "@/lib/supabase/admin"
import { type Locale, normalizeLocale } from "@/lib/i18n"
import { getCurrentLocale } from "@/lib/locale"
import { getPayoutRequestTone, normalizeStatus } from "@/lib/status-tones"
import { formatBookingCode } from "@/lib/merchant-code"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

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
      packageUntitled: "Paket tanpa nama",
      availableBalance: "Saldo tersedia",
      availableBalanceNote: "Sudah full payment dari customer, pickup tervalidasi, dan siap payout",
      heldBalance: "Saldo tertahan",
      heldBalanceNote: "Masih ditahan di escrow RedFeng",
      payoutInProgress: "Payout diproses",
      payoutInProgressNote: "Request pending atau processing",
      payoutCompleted: "Payout selesai",
      payoutCompletedNote: "Dana yang sudah pernah dicairkan",
      payoutSnapshot: "Payout Snapshot",
      pendingRequests: "Request pending",
      pendingRequestsNote: "Menunggu approval atau transfer",
      destinationAccount: "Rekening tujuan",
      destinationAccountNote: "Akun yang dipakai saat payout",
      payoutHistory: "Payout History",
      payoutHistoryTitle: "Riwayat pencairan",
      payoutHistoryDescription: "Semua request payout merchant berikut status proses dan rekening tujuan.",
      noPayoutHistory: "Belum ada riwayat pencairan.",
      requestDate: "Tanggal Request",
      amount: "Nominal",
      status: "Status",
      processed: "Diproses",
      financeControlled: "Finance Controlled",
      internalPayoutTitle: "Payout diproses internal",
      internalPayoutDescription: "Merchant tidak lagi menarik dana manual. Setelah Arrived, customer Picked up, dan merchant Go selesai, booking normal yang sudah lunas akan menunggu admin mengirimkannya ke finance.",
      payoutReadyEstimate: "Estimasi payout yang siap diproses saat ini:",
      payoutFlowNote: "Dana customer tetap ditahan sampai merchant klik Arrived, customer klik Picked up, dan merchant klik Go. Setelah itu admin akan mengirim booking yang sudah lunas ke finance untuk proses transfer.",
      readyForPayout: "Ready For Payout",
      readyForPayoutTitle: "Booking siap payout",
      readyForPayoutDescription: "Booking yang sudah full payment dari customer dan pickup-nya sudah dikonfirmasi merchant dan customer.",
      noReadyPayoutBookings: "Belum ada booking yang siap payout.",
      fundsOnHold: "Funds On Hold",
      fundsOnHoldTitle: "Dana masih ditahan",
      fundsOnHoldDescription: "Booking yang dananya masih berada di escrow RedFeng, masih DP customer, atau belum full payment.",
      noFundsOnHold: "Tidak ada dana yang sedang ditahan.",
      booking: "Booking",
      packageLabel: "Paket",
      customer: "Customer",
      trip: "Trip",
      participants: "Peserta",
      escrow: "Escrow",
    },
    en: {
      merchantMissing: "Merchant data not found.",
      heroBadge: "Wallet & Payout",
      heroTitle: "Control merchant balance and payout rhythm in a more professional workspace.",
      heroDescription: "Monitor escrow, funds ready for payout, requests being processed, and payout history without losing merchant booking context.",
      loadError: "Failed to load merchant balance data.",
      packageUntitled: "Untitled package",
      availableBalance: "Available balance",
      availableBalanceNote: "Customer full payment is complete, pickup is validated, and the booking is ready for payout",
      heldBalance: "Held balance",
      heldBalanceNote: "Still being held in RedFeng escrow",
      payoutInProgress: "Payout in progress",
      payoutInProgressNote: "Pending or processing requests",
      payoutCompleted: "Completed payouts",
      payoutCompletedNote: "Funds that have already been disbursed",
      payoutSnapshot: "Payout Snapshot",
      pendingRequests: "Pending requests",
      pendingRequestsNote: "Awaiting approval or transfer",
      destinationAccount: "Destination account",
      destinationAccountNote: "Account used for payouts",
      payoutHistory: "Payout History",
      payoutHistoryTitle: "Payout history",
      payoutHistoryDescription: "All merchant payout requests with their processing status and destination account.",
      noPayoutHistory: "There is no payout history yet.",
      requestDate: "Request date",
      amount: "Amount",
      status: "Status",
      processed: "Processed",
      financeControlled: "Finance Controlled",
      internalPayoutTitle: "Payout is processed internally",
      internalPayoutDescription: "Merchants no longer withdraw funds manually. After Arrived, customer Picked up, and merchant Go are completed, normal fully paid bookings will wait for admin handoff to finance.",
      payoutReadyEstimate: "Estimated payout currently ready to process:",
      payoutFlowNote: "Customer funds remain held until the merchant clicks Arrived, the customer clicks Picked up, and the merchant clicks Go. After that, admin will hand off fully paid bookings to finance for transfer processing.",
      readyForPayout: "Ready For Payout",
      readyForPayoutTitle: "Bookings ready for payout",
      readyForPayoutDescription: "Bookings where customer full payment is complete and pickup has been confirmed by merchant and customer.",
      noReadyPayoutBookings: "There are no bookings ready for payout yet.",
      fundsOnHold: "Funds On Hold",
      fundsOnHoldTitle: "Funds still on hold",
      fundsOnHoldDescription: "Bookings whose funds are still in RedFeng escrow, still only covered by customer DP, or not yet fully paid.",
      noFundsOnHold: "There are no funds currently on hold.",
      booking: "Booking",
      packageLabel: "Package",
      customer: "Customer",
      trip: "Trip",
      participants: "Participants",
      escrow: "Escrow",
    },
    zh: {
      merchantMissing: "未找到商家数据。",
      heroBadge: "钱包与结算",
      heroTitle: "以更专业的方式掌控商家余额与结算节奏。",
      heroDescription: "查看托管资金、待结算金额、处理中请求以及历史打款记录，同时保留完整的商家订单运营上下文。",
      loadError: "加载商家余额数据失败。",
      packageUntitled: "未命名套餐",
      availableBalance: "可用余额",
      availableBalanceNote: "已完成接送确认，可进入结算",
      heldBalance: "冻结余额",
      heldBalanceNote: "仍在 RedFeng 托管中",
      payoutInProgress: "处理中结算",
      payoutInProgressNote: "待处理或处理中请求",
      payoutCompleted: "已完成结算",
      payoutCompletedNote: "已经打款完成的资金",
      payoutSnapshot: "结算概览",
      pendingRequests: "待处理请求",
      pendingRequestsNote: "等待批准或转账",
      destinationAccount: "收款账户",
      destinationAccountNote: "用于结算的账户",
      payoutHistory: "结算记录",
      payoutHistoryTitle: "打款历史",
      payoutHistoryDescription: "所有商家结算请求及其处理状态与收款账户。",
      noPayoutHistory: "暂时还没有打款记录。",
      requestDate: "申请日期",
      amount: "金额",
      status: "状态",
      processed: "处理日期",
      financeControlled: "财务控制",
      internalPayoutTitle: "结算由内部处理",
      internalPayoutDescription: "商家不再手动提取资金。完成 Arrived、客户 Picked up 与商家 Go 后，管理员会将订单移交给财务。",
      payoutReadyEstimate: "当前预计可处理的结算金额：",
      payoutFlowNote: "客户资金会持续托管，直到商家点击 Arrived、客户点击 Picked up、商家点击 Go，随后管理员再将订单交给财务打款。",
      readyForPayout: "可结算",
      readyForPayoutTitle: "可结算订单",
      readyForPayoutDescription: "已全额付款，且商家与客户都已确认接送的订单。",
      noReadyPayoutBookings: "暂时还没有可结算订单。",
      fundsOnHold: "冻结资金",
      fundsOnHoldTitle: "仍被冻结的资金",
      fundsOnHoldDescription: "资金仍在 RedFeng 托管中或尚未全额付款的订单。",
      noFundsOnHold: "当前没有正在冻结的资金。",
      booking: "预订",
      packageLabel: "套餐",
      customer: "客户",
      trip: "行程",
      participants: "人数",
      escrow: "托管",
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
  return getPayoutRequestTone(value)
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
  const supabase = await createClient("merchant")
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
  const packageMap = new Map(packageRows.map((pkg) => [pkg.id, pkg.title || t.packageUntitled]))

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
      label: t.availableBalance,
      value: formatMoney(saldoTersedia),
      note: t.availableBalanceNote,
    },
    {
      label: t.heldBalance,
      value: formatMoney(saldoTertahan),
      note: t.heldBalanceNote,
    },
    {
      label: t.payoutInProgress,
      value: formatMoney(reservedPayout),
      note: t.payoutInProgressNote,
    },
    {
      label: t.payoutCompleted,
      value: formatMoney(paidPayout),
      note: t.payoutCompletedNote,
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
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-white/75">{t.payoutSnapshot}</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                <div className="rounded-[20px] border border-white/20 bg-white/10 px-4 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/70">{t.pendingRequests}</p>
                  <p className="mt-2 text-2xl font-semibold text-white">{payoutCounts.pending}</p>
                  <p className="mt-1 text-xs leading-5 text-white/70">{t.pendingRequestsNote}</p>
                </div>
                <div className="rounded-[20px] border border-white/20 bg-white/10 px-4 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/70">{t.destinationAccount}</p>
                  <p className="mt-2 text-sm font-semibold text-white">{destinationAccount}</p>
                  <p className="mt-1 text-xs leading-5 text-white/70">{t.destinationAccountNote}</p>
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
                <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-orange-500">{t.payoutHistory}</p>
                <h2 className="text-2xl font-semibold tracking-[-0.03em] text-slate-950">{t.payoutHistoryTitle}</h2>
                <p className="text-sm leading-6 text-slate-500">
                  {t.payoutHistoryDescription}
                </p>
              </div>

              {payouts.length === 0 ? (
                <div className="mt-5 rounded-[22px] border border-[#eadfce] bg-[#fffaf3] p-5 text-sm text-slate-600">
                  {t.noPayoutHistory}
                </div>
              ) : (
                <div className="mt-5 overflow-x-auto rounded-[24px] border border-[#efe3d1]">
                  <table className="min-w-full text-left text-sm">
                    <thead className="bg-[#fff8ef] text-slate-600">
                      <tr>
                        <th className="border-b border-[#efe3d1] p-4">{t.requestDate}</th>
                        <th className="border-b border-[#efe3d1] p-4">{t.amount}</th>
                        <th className="border-b border-[#efe3d1] p-4">{t.status}</th>
                        <th className="border-b border-[#efe3d1] p-4">{t.destinationAccount}</th>
                        <th className="border-b border-[#efe3d1] p-4">{t.processed}</th>
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
                <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-orange-500">{t.financeControlled}</p>
                <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950">{t.internalPayoutTitle}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  {t.internalPayoutDescription}
                </p>
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div className="rounded-[22px] border border-[#efe3d1] bg-[#fffaf3] p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">{t.pendingRequests}</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-950">{payoutCounts.pending}</p>
                </div>
                <div className="rounded-[22px] border border-[#efe3d1] bg-[#fffaf3] p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">{t.payoutCompleted}</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-950">{payoutCounts.paid}</p>
                </div>
              </div>

              <div className="mt-5 rounded-[22px] border border-[#efe3d1] bg-[#fffaf3] p-5">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">{t.destinationAccount}</p>
                <p className="mt-3 text-sm leading-7 text-slate-700">{destinationAccount}</p>
              </div>

              <div className="mt-5 space-y-4">
                <div className="rounded-[22px] border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                  {t.payoutReadyEstimate} <span className="font-semibold">{formatMoney(saldoTersedia)}</span>
                </div>
                <div className="rounded-[22px] border border-[#efe3d1] bg-[#fffaf3] p-4 text-sm leading-6 text-slate-600">
                  {t.payoutFlowNote}
                </div>
              </div>
            </div>
          </section>

          <section className="mt-8 grid gap-6 xl:grid-cols-2">
            <div className="rounded-[32px] border border-[#f3dbc3] bg-white/85 p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur-sm lg:p-7">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-orange-500">{t.readyForPayout}</p>
                  <h3 className="mt-2 text-xl font-semibold text-slate-950">{t.readyForPayoutTitle}</h3>
                  <p className="mt-1 text-sm leading-6 text-slate-500">
                    {t.readyForPayoutDescription}
                  </p>
                </div>
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                  {availableBookings.length} booking
                </span>
              </div>

              {availableBookings.length === 0 ? (
                <div className="mt-5 rounded-[22px] border border-[#eadfce] bg-[#fffaf3] p-4 text-sm text-slate-600">
                  {t.noReadyPayoutBookings}
                </div>
              ) : (
                <div className="mt-5 overflow-x-auto rounded-[24px] border border-[#efe3d1]">
                  <table className="min-w-full text-left text-sm">
                    <thead className="bg-[#fff8ef] text-slate-600">
                      <tr>
                          <th className="border-b border-[#efe3d1] p-4">{t.booking}</th>
                          <th className="border-b border-[#efe3d1] p-4">{t.packageLabel}</th>
                          <th className="border-b border-[#efe3d1] p-4">{t.customer}</th>
                          <th className="border-b border-[#efe3d1] p-4">{t.trip}</th>
                          <th className="border-b border-[#efe3d1] p-4">{t.participants}</th>
                          <th className="border-b border-[#efe3d1] p-4">{t.amount}</th>
                          <th className="border-b border-[#efe3d1] p-4">{t.escrow}</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white">
                      {availableBookings.map((booking) => (
                        <tr key={booking.id} className="hover:bg-[#fffdf9]">
                          <td className="border-b border-[#f3ebdf] p-4 font-medium text-slate-950">
                            {formatBookingCode(booking.booking_code, booking.id)}
                          </td>
                          <td className="border-b border-[#f3ebdf] p-4 text-slate-700">
                            {packageMap.get(booking.package_id || "") || t.packageUntitled}
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
                  <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-orange-500">{t.fundsOnHold}</p>
                  <h3 className="mt-2 text-xl font-semibold text-slate-950">{t.fundsOnHoldTitle}</h3>
                  <p className="mt-1 text-sm leading-6 text-slate-500">
                    {t.fundsOnHoldDescription}
                  </p>
                </div>
                <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                  {heldBookings.length} booking
                </span>
              </div>

              {heldBookings.length === 0 ? (
                <div className="mt-5 rounded-[22px] border border-[#eadfce] bg-[#fffaf3] p-4 text-sm text-slate-600">
                  {t.noFundsOnHold}
                </div>
              ) : (
                <div className="mt-5 overflow-x-auto rounded-[24px] border border-[#efe3d1]">
                  <table className="min-w-full text-left text-sm">
                    <thead className="bg-[#fff8ef] text-slate-600">
                      <tr>
                          <th className="border-b border-[#efe3d1] p-4">{t.booking}</th>
                          <th className="border-b border-[#efe3d1] p-4">{t.packageLabel}</th>
                          <th className="border-b border-[#efe3d1] p-4">{t.customer}</th>
                          <th className="border-b border-[#efe3d1] p-4">{t.trip}</th>
                          <th className="border-b border-[#efe3d1] p-4">{t.participants}</th>
                          <th className="border-b border-[#efe3d1] p-4">{t.amount}</th>
                          <th className="border-b border-[#efe3d1] p-4">{t.escrow}</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white">
                      {heldBookings.map((booking) => (
                        <tr key={booking.id} className="hover:bg-[#fffdf9]">
                          <td className="border-b border-[#f3ebdf] p-4 font-medium text-slate-950">
                            {formatBookingCode(booking.booking_code, booking.id)}
                          </td>
                          <td className="border-b border-[#f3ebdf] p-4 text-slate-700">
                            {packageMap.get(booking.package_id || "") || t.packageUntitled}
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

