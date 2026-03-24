import Link from "next/link"
import { notFound } from "next/navigation"
import { createAdminClient } from "@/lib/supabase/admin"
import { normalizeLocale } from "@/lib/i18n"
import { getCurrentLocale } from "@/lib/locale"
import { formatPackageMoney } from "@/lib/package-pricing"
import { handoffBookingToFinance } from "../actions"

export const dynamic = "force-dynamic"

type BookingDetailRow = {
  id: string
  booking_code: string | null
  customer_name: string | null
  customer_email: string | null
  pickup_date: string | null
  created_at: string | null
  total_amount: number | null
  subtotal_amount: number | null
  customer_admin_fee_amount: number | null
  customer_tax_amount: number | null
  final_payment_amount: number | null
  display_currency: string | null
  display_subtotal_amount: number | null
  display_price_adult: number | null
  display_price_child: number | null
  exchange_rate_date: string | null
  booking_status: string | null
  payment_status: string | null
  package_id: string | null
  escrow_status: string | null
  merchant_arrived_at: string | null
  customer_picked_up_at: string | null
  merchant_picked_up_at: string | null
}

type PackageRow = {
  id: string
  title: string | null
  merchant_id: string | null
  city: string | null
  country: string | null
}

type MerchantRow = {
  id: string
  brand_name: string | null
  company_name: string | null
  email: string | null
  city: string | null
  province: string | null
  bank_name: string | null
  bank_account_number: string | null
  bank_account_holder: string | null
}

type PayoutRow = {
  id: string
  status: string | null
  amount: number | null
  gross_booking_amount: number | null
  created_at: string | null
  note: string | null
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

function formatDateTime(value: string | null) {
  if (!value) return "-"
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return parsed.toLocaleString("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  })
}

function formatDate(value: string | null) {
  if (!value) return "-"
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return parsed.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

function formatMoney(value: number | null | undefined) {
  return `Rp ${Number(value || 0).toLocaleString("id-ID")}`
}

function paymentTone(status: string | null) {
  const normalized = normalizeStatus(status)
  if (normalized === "paid") return "border-emerald-200 bg-emerald-50 text-emerald-700"
  if (normalized === "dp_paid") return "border-amber-200 bg-amber-50 text-amber-700"
  if (normalized === "cancelled") return "border-rose-200 bg-rose-50 text-rose-700"
  return "border-slate-200 bg-slate-100 text-slate-700"
}

function escrowTone(status: string | null) {
  const normalized = normalizeStatus(status)
  if (normalized === "held" || normalized === "partial_hold") return "border-orange-200 bg-orange-50 text-orange-700"
  if (normalized === "awaiting_admin_handoff" || normalized === "ready_for_payout" || normalized === "finance_review") {
    return "border-sky-200 bg-sky-50 text-sky-700"
  }
  if (normalized === "paid_out") return "border-violet-200 bg-violet-50 text-violet-700"
  return "border-slate-200 bg-slate-100 text-slate-700"
}

function journeyPhase(booking: BookingDetailRow) {
  if (normalizeStatus(booking.escrow_status) === "paid_out") {
    return { label: "Paid Out", tone: "border-violet-200 bg-violet-50 text-violet-700" }
  }
  if (normalizeStatus(booking.booking_status) === "finance_review") {
    return { label: "Ready for Finance", tone: "border-sky-200 bg-sky-50 text-sky-700" }
  }
  if (booking.merchant_picked_up_at) {
    return { label: "Go Confirmed", tone: "border-emerald-200 bg-emerald-50 text-emerald-700" }
  }
  if (booking.customer_picked_up_at) {
    return { label: "Picked Up", tone: "border-emerald-200 bg-emerald-50 text-emerald-700" }
  }
  if (booking.merchant_arrived_at) {
    return { label: "Awaiting Pickup", tone: "border-amber-200 bg-amber-50 text-amber-700" }
  }
  if (normalizeStatus(booking.payment_status) === "paid") {
    return { label: "Fully Paid", tone: "border-emerald-200 bg-emerald-50 text-emerald-700" }
  }
  if (normalizeStatus(booking.payment_status) === "dp_paid") {
    return { label: "DP Paid", tone: "border-amber-200 bg-amber-50 text-amber-700" }
  }
  return { label: titleCaseStatus(booking.booking_status), tone: "border-slate-200 bg-slate-100 text-slate-700" }
}

function canHandoffToFinance(booking: BookingDetailRow) {
  return (
    normalizeStatus(booking.payment_status) === "paid" &&
    Boolean(booking.merchant_arrived_at) &&
    Boolean(booking.customer_picked_up_at) &&
    Boolean(booking.merchant_picked_up_at) &&
    !["finance_review", "finance_processing", "payout_completed"].includes(normalizeStatus(booking.booking_status))
  )
}

function isPickupFlowIncomplete(booking: BookingDetailRow) {
  return !booking.merchant_arrived_at || !booking.customer_picked_up_at || !booking.merchant_picked_up_at
}

function isOverduePickup(booking: BookingDetailRow) {
  if (!booking.pickup_date) return false
  const pickupDate = new Date(booking.pickup_date)
  if (Number.isNaN(pickupDate.getTime())) return false
  return pickupDate.getTime() < Date.now() && isPickupFlowIncomplete(booking)
}

function deriveAttentionReasons(booking: BookingDetailRow) {
  const reasons: string[] = []
  if (normalizeStatus(booking.payment_status) !== "paid") reasons.push("Payment belum lunas")
  if (normalizeStatus(booking.payment_status) === "paid" && isPickupFlowIncomplete(booking)) {
    reasons.push("Urutan pickup belum lengkap")
  }
  if (isOverduePickup(booking)) reasons.push("Pickup date lewat jadwal")
  if (canHandoffToFinance(booking)) reasons.push("Siap handoff ke finance")
  return reasons
}

export default async function AdminBookingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const adminSupabase = createAdminClient()
  const locale = normalizeLocale(await getCurrentLocale())

  const { data: booking, error } = await adminSupabase
    .from("bookings")
    .select(
      "id, booking_code, customer_name, customer_email, pickup_date, created_at, total_amount, subtotal_amount, customer_admin_fee_amount, customer_tax_amount, final_payment_amount, display_currency, display_subtotal_amount, display_price_adult, display_price_child, exchange_rate_date, booking_status, payment_status, package_id, escrow_status, merchant_arrived_at, customer_picked_up_at, merchant_picked_up_at",
    )
    .eq("id", id)
    .maybeSingle<BookingDetailRow>()

  if (error || !booking) {
    notFound()
  }

  const { data: pkg } = booking.package_id
    ? await adminSupabase
        .from("packages")
        .select("id, title, merchant_id, city, country")
        .eq("id", booking.package_id)
        .maybeSingle<PackageRow>()
    : { data: null as PackageRow | null }

  const { data: merchant } = pkg?.merchant_id
    ? await adminSupabase
        .from("merchants")
        .select("id, brand_name, company_name, email, city, province, bank_name, bank_account_number, bank_account_holder")
        .eq("id", pkg.merchant_id)
        .maybeSingle<MerchantRow>()
    : { data: null as MerchantRow | null }

  const { data: payout } = await adminSupabase
    .from("payout_requests")
    .select("id, status, amount, gross_booking_amount, created_at, note")
    .eq("booking_id", booking.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<PayoutRow>()

  const phase = journeyPhase(booking)
  const ready = canHandoffToFinance(booking)
  const attentionReasons = deriveAttentionReasons(booking)
  const productLabel = booking.package_id ? "Paket Tour" : "Pesawat"
  const merchantName = merchant?.brand_name || merchant?.company_name || merchant?.id || "-"
  const timeline = [
    {
      label: "Merchant Arrived",
      value: booking.merchant_arrived_at,
      done: Boolean(booking.merchant_arrived_at),
    },
    {
      label: "Customer Picked Up",
      value: booking.customer_picked_up_at,
      done: Boolean(booking.customer_picked_up_at),
    },
    {
      label: "Merchant Go",
      value: booking.merchant_picked_up_at,
      done: Boolean(booking.merchant_picked_up_at),
    },
  ]

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fff8f1_0%,#f7f1e8_100%)] px-6 py-8 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-7xl space-y-8">
        <section className="rounded-[32px] border border-orange-200/60 bg-[linear-gradient(135deg,#7c2d12_0%,#c2410c_38%,#f97316_72%,#fdba74_100%)] px-8 py-10 text-white shadow-[0_30px_100px_rgba(146,64,14,0.18)]">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-3xl">
              <p className="inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.34em] text-orange-50">
                Booking Detail
              </p>
              <h1 className="mt-5 text-4xl font-semibold tracking-tight sm:text-5xl">{booking.booking_code || booking.id}</h1>
              <p className="mt-4 text-base leading-8 text-orange-50/90">
                Detail lengkap booking untuk investigasi admin, pengecekan handoff, dan koordinasi ke merchant atau finance.
              </p>
            </div>
            <Link
              href="/admin/bookings"
              className="inline-flex items-center justify-center rounded-[18px] border border-white/25 bg-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/15"
            >
              Kembali ke Booking Center
            </Link>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-[26px] border border-[#f0ddc7] bg-white px-5 py-5 shadow-[0_18px_44px_rgba(15,23,42,0.06)]">
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-orange-500">Produk</p>
            <p className="mt-3 text-2xl font-semibold text-slate-950">{productLabel}</p>
          </div>
          <div className="rounded-[26px] border border-[#f0ddc7] bg-white px-5 py-5 shadow-[0_18px_44px_rgba(15,23,42,0.06)]">
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-orange-500">Total</p>
            <p className="mt-3 text-2xl font-semibold text-slate-950">{formatMoney(booking.total_amount)}</p>
          </div>
          <div className="rounded-[26px] border border-[#f0ddc7] bg-white px-5 py-5 shadow-[0_18px_44px_rgba(15,23,42,0.06)]">
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-orange-500">Journey Phase</p>
            <span className={`mt-3 inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${phase.tone}`}>
              {phase.label}
            </span>
          </div>
          <div className="rounded-[26px] border border-[#f0ddc7] bg-white px-5 py-5 shadow-[0_18px_44px_rgba(15,23,42,0.06)]">
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-orange-500">Pickup Date</p>
            <p className="mt-3 text-2xl font-semibold text-slate-950">{formatDate(booking.pickup_date)}</p>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[32px] border border-[#f3dbc3] bg-white/85 p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-orange-500">Booking context</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950">Informasi customer, package, dan merchant</h2>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="rounded-[22px] border border-slate-200 bg-slate-50/80 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Customer</p>
                <p className="mt-2 text-sm font-medium text-slate-900">{booking.customer_name || "-"}</p>
                <p className="mt-2 text-sm text-slate-600">{booking.customer_email || "-"}</p>
              </div>
              <div className="rounded-[22px] border border-slate-200 bg-slate-50/80 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Booking dibuat</p>
                <p className="mt-2 text-sm font-medium text-slate-900">{formatDateTime(booking.created_at)}</p>
              </div>
              <div className="rounded-[22px] border border-slate-200 bg-white p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Package</p>
                <p className="mt-2 text-sm font-medium text-slate-900">{pkg?.title || "-"}</p>
                <p className="mt-2 text-sm text-slate-600">{[pkg?.city, pkg?.country].filter(Boolean).join(", ") || "-"}</p>
                {pkg?.id ? (
                  <Link href={`/admin/packages/${pkg.id}`} className="mt-3 inline-flex text-sm font-semibold text-orange-600 hover:text-orange-700">
                    Buka detail package
                  </Link>
                ) : null}
              </div>
              <div className="rounded-[22px] border border-slate-200 bg-white p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Merchant</p>
                <p className="mt-2 text-sm font-medium text-slate-900">{merchantName}</p>
                <p className="mt-2 text-sm text-slate-600">{merchant?.email || "-"}</p>
                <p className="mt-2 text-sm text-slate-600">{[merchant?.city, merchant?.province].filter(Boolean).join(", ") || "-"}</p>
                {merchant?.id ? (
                  <Link href={`/admin/merchants/${merchant.id}`} className="mt-3 inline-flex text-sm font-semibold text-orange-600 hover:text-orange-700">
                    Buka workspace merchant
                  </Link>
                ) : null}
              </div>
            </div>
          </div>

          <div className="rounded-[32px] border border-[#f3dbc3] bg-white/85 p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-orange-500">Handoff readiness</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950">Kesiapan ke finance</h2>
            <div className="mt-5 flex flex-wrap gap-2 text-xs font-semibold">
              <span className={`rounded-full border px-3 py-1 ${paymentTone(booking.payment_status)}`}>{titleCaseStatus(booking.payment_status)}</span>
              <span className={`rounded-full border px-3 py-1 ${phase.tone}`}>{phase.label}</span>
              <span className={`rounded-full border px-3 py-1 ${escrowTone(booking.escrow_status)}`}>Escrow {titleCaseStatus(booking.escrow_status)}</span>
            </div>
            <div className="mt-6 space-y-3">
              {attentionReasons.map((reason) => (
                <div key={reason} className="rounded-[18px] border border-[#efe1cf] bg-[#fffaf3] px-4 py-3 text-sm text-slate-700">
                  {reason}
                </div>
              ))}
              {!attentionReasons.length ? (
                <div className="rounded-[18px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  Booking ini bersih dari blocker utama.
                </div>
              ) : null}
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <form action={handoffBookingToFinance}>
                <input type="hidden" name="booking_id" value={booking.id} />
                <button
                  type="submit"
                  disabled={!ready}
                  className="rounded-[20px] bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  Kirim ke Finance
                </button>
              </form>
              {!ready ? (
                <span className="rounded-[20px] border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-700">
                  Handoff terkunci sampai payment lunas dan urutan pickup lengkap.
                </span>
              ) : null}
            </div>
            {payout ? (
              <div className="mt-6 rounded-[22px] border border-slate-200 bg-slate-50/80 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Payout request terbaru</p>
                <p className="mt-2 text-sm font-medium text-slate-900">Status: {titleCaseStatus(payout.status)}</p>
                <p className="mt-2 text-sm text-slate-600">Net amount: {formatMoney(payout.amount)}</p>
                <p className="mt-2 text-sm text-slate-600">Gross booking: {formatMoney(payout.gross_booking_amount)}</p>
                <p className="mt-2 text-sm text-slate-600">Dibuat: {formatDateTime(payout.created_at)}</p>
                {payout.note ? <p className="mt-2 text-sm text-slate-600">{payout.note}</p> : null}
              </div>
            ) : null}
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <div className="rounded-[32px] border border-[#f3dbc3] bg-white/85 p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-orange-500">Financial breakdown</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950">Rincian nominal booking</h2>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="rounded-[20px] border border-white bg-white p-4">
                <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400">Subtotal Paket</p>
                <p className="mt-2 text-sm font-semibold text-slate-900">{formatMoney(booking.subtotal_amount)}</p>
              </div>
              <div className="rounded-[20px] border border-white bg-white p-4">
                <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400">Admin Fee</p>
                <p className="mt-2 text-sm font-semibold text-slate-900">{formatMoney(booking.customer_admin_fee_amount)}</p>
              </div>
              <div className="rounded-[20px] border border-white bg-white p-4">
                <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400">Pajak</p>
                <p className="mt-2 text-sm font-semibold text-slate-900">{formatMoney(booking.customer_tax_amount)}</p>
              </div>
              <div className="rounded-[20px] border border-white bg-white p-4">
                <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400">Sisa Pelunasan</p>
                <p className="mt-2 text-sm font-semibold text-slate-900">{formatMoney(booking.final_payment_amount)}</p>
              </div>
            </div>

            {(booking.display_currency || booking.display_subtotal_amount || booking.exchange_rate_date) && (
              <div className="mt-6 rounded-[24px] border border-blue-100 bg-blue-50 p-5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-blue-600">Display pricing</p>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <div className="rounded-[18px] border border-blue-100 bg-white p-4">
                    <p className="text-sm text-slate-500">Harga Dewasa</p>
                    <p className="mt-2 text-sm font-semibold text-slate-900">
                      {formatPackageMoney(booking.display_price_adult, booking.display_currency, locale)}
                    </p>
                  </div>
                  <div className="rounded-[18px] border border-blue-100 bg-white p-4">
                    <p className="text-sm text-slate-500">Harga Anak</p>
                    <p className="mt-2 text-sm font-semibold text-slate-900">
                      {formatPackageMoney(booking.display_price_child, booking.display_currency, locale)}
                    </p>
                  </div>
                  <div className="rounded-[18px] border border-blue-100 bg-white p-4">
                    <p className="text-sm text-slate-500">Subtotal Display</p>
                    <p className="mt-2 text-sm font-semibold text-slate-900">
                      {formatPackageMoney(booking.display_subtotal_amount, booking.display_currency, locale)}
                    </p>
                  </div>
                  <div className="rounded-[18px] border border-blue-100 bg-white p-4">
                    <p className="text-sm text-slate-500">Tanggal Kurs</p>
                    <p className="mt-2 text-sm font-semibold text-slate-900">{booking.exchange_rate_date || "-"}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="rounded-[32px] border border-[#f3dbc3] bg-white/85 p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-orange-500">Operational timeline</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950">Progress meeting point</h2>
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {timeline.map((item) => (
                <div key={item.label} className="rounded-[20px] border border-slate-200 bg-slate-50/80 p-4">
                  <p className="text-sm font-semibold text-slate-900">{item.label}</p>
                  <p className={`mt-2 text-xs font-semibold ${item.done ? "text-emerald-600" : "text-slate-500"}`}>
                    {item.done ? "Selesai" : "Menunggu"}
                  </p>
                  <p className="mt-2 text-xs text-slate-500">{formatDateTime(item.value)}</p>
                </div>
              ))}
            </div>
            <div className="mt-6 rounded-[22px] border border-slate-200 bg-white p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Merchant payout destination</p>
              <p className="mt-2 text-sm text-slate-700">Bank: {merchant?.bank_name || "-"}</p>
              <p className="mt-2 text-sm text-slate-700">No. Rekening: {merchant?.bank_account_number || "-"}</p>
              <p className="mt-2 text-sm text-slate-700">Atas Nama: {merchant?.bank_account_holder || "-"}</p>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
