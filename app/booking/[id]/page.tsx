import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import ReviewForm from "./ReviewForm"
import BookingPaymentButton from "@/app/components/BookingPaymentButton"
import { confirmCustomerPickedUp, submitPackageReview } from "./actions"
import { getCurrentLocale } from "@/lib/locale"
import { formatPackageMoney } from "@/lib/package-pricing"
import { normalizeLocale } from "@/lib/i18n"

export const dynamic = "force-dynamic"

type BookingPageProps = {
  params: Promise<{ id: string }>
  searchParams: Promise<{ success?: string; error?: string }>
}

type BookingDetailRow = {
  id: string
  booking_code: string | null
  customer_name: string | null
  customer_email: string | null
  total_amount: number | null
  subtotal_amount?: number | null
  customer_admin_fee_amount?: number | null
  customer_tax_amount?: number | null
  final_payment_amount?: number | null
  display_currency?: string | null
  display_subtotal_amount?: number | null
  display_price_adult?: number | null
  display_price_child?: number | null
  exchange_rate_date?: string | null
  booking_status: string | null
  payment_status: string | null
  package_id: string | null
  escrow_status: string | null
  merchant_arrived_at: string | null
  merchant_picked_up_at: string | null
  customer_picked_up_at: string | null
}

function formatDateTime(dateStr: string | null) {
  if (!dateStr) return "-"
  const date = new Date(dateStr)
  if (Number.isNaN(date.getTime())) return dateStr
  return date.toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function titleCaseStatus(value: string | null) {
  const normalized = (value || "").trim().toLowerCase()
  if (!normalized) return "-"
  return normalized
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

function normalizeStatus(value: string | null) {
  return (value || "").trim().toLowerCase()
}

function badgeTone(status: string | null) {
  const normalized = normalizeStatus(status)
  if (normalized === "paid") return "border-emerald-200 bg-emerald-50 text-emerald-700"
  if (normalized === "dp_paid") return "border-amber-200 bg-amber-50 text-amber-700"
  if (normalized === "cancelled") return "border-rose-200 bg-rose-50 text-rose-700"
  return "border-slate-200 bg-slate-100 text-slate-700"
}

function escrowBadgeTone(status: string | null) {
  const normalized = normalizeStatus(status)
  if (normalized === "held" || normalized === "partial_hold") return "border-orange-200 bg-orange-50 text-orange-700"
  if (normalized === "awaiting_admin_handoff" || normalized === "ready_for_payout") {
    return "border-sky-200 bg-sky-50 text-sky-700"
  }
  if (normalized === "paid_out") return "border-violet-200 bg-violet-50 text-violet-700"
  return "border-slate-200 bg-slate-100 text-slate-700"
}

function resolveJourneyPhase(booking: BookingDetailRow) {
  if (normalizeStatus(booking.escrow_status) === "paid_out") {
    return { label: "Paid Out", tone: "border-violet-200 bg-violet-50 text-violet-700" }
  }
  if (normalizeStatus(booking.booking_status) === "awaiting_admin_handoff" || normalizeStatus(booking.escrow_status) === "awaiting_admin_handoff") {
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

function formatIdr(value: number | null | undefined) {
  return `Rp ${Number(value || 0).toLocaleString("id-ID")}`
}

export default async function BookingPage({ params, searchParams }: BookingPageProps) {
  const { id } = await params
  const resolvedSearchParams = await searchParams
  const authSupabase = await createClient()
  const adminSupabase = createAdminClient()
  const locale = normalizeLocale(await getCurrentLocale())
  const {
    data: { user },
  } = await authSupabase.auth.getUser()

  if (!user) {
    return <div className="p-10">Silakan login untuk melihat booking Anda.</div>
  }

  const { data: booking, error } = await adminSupabase
    .from("bookings")
    .select("id, booking_code, customer_name, customer_email, total_amount, subtotal_amount, customer_admin_fee_amount, customer_tax_amount, final_payment_amount, display_currency, display_subtotal_amount, display_price_adult, display_price_child, exchange_rate_date, booking_status, payment_status, package_id, escrow_status, merchant_arrived_at, merchant_picked_up_at, customer_picked_up_at")
    .eq("id", id)
    .single<BookingDetailRow>()

  if (error || !booking || !user.email || booking.customer_email !== user.email) {
    return <div className="p-10">Booking tidak ditemukan</div>
  }

  const { data: existingReview } = await adminSupabase
    .from("package_reviews")
    .select("id, rating, comment")
    .eq("booking_id", booking.id)
    .maybeSingle()

  const timeline = [
    {
      label: "Merchant tiba di meeting point",
      done: Boolean(booking.merchant_arrived_at),
      value: booking.merchant_arrived_at,
    },
    {
      label: "Customer klik Picked up",
      done: Boolean(booking.customer_picked_up_at),
      value: booking.customer_picked_up_at,
    },
    {
      label: "Merchant klik Go",
      done: Boolean(booking.merchant_picked_up_at),
      value: booking.merchant_picked_up_at,
    },
  ]

  const canConfirmPickup = Boolean(booking.merchant_arrived_at) && !booking.customer_picked_up_at
  const canPayRemaining = normalizeStatus(booking.payment_status) === "dp_paid"
  const phase = resolveJourneyPhase(booking)

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)] p-6 md:p-10">
      <div className="mx-auto max-w-4xl">
        <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-3xl font-bold text-slate-900">Booking Berhasil</h1>
          <p className="mt-2 text-sm text-slate-500">
            Dana customer masuk ke rekening RedFeng dan tetap ditahan sampai pickup dikonfirmasi merchant dan customer.
          </p>
        </section>

        {resolvedSearchParams.success && (
          <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
            {resolvedSearchParams.success}
          </div>
        )}

        {resolvedSearchParams.error && (
          <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
            {resolvedSearchParams.error}
          </div>
        )}

        <section className="mt-6 grid gap-4 md:grid-cols-4">
          <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Kode Booking</p>
            <p className="mt-2 text-xl font-bold text-slate-900">{booking.booking_code || booking.id}</p>
          </div>
          <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Total</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">
              {formatIdr(booking.total_amount)}
            </p>
          </div>
          <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Status Pembayaran</p>
            <span className={`mt-3 inline-flex rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] ${badgeTone(booking.payment_status)}`}>
              {titleCaseStatus(booking.payment_status)}
            </span>
          </div>
          <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Status Escrow</p>
            <span className={`mt-3 inline-flex rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] ${escrowBadgeTone(booking.escrow_status)}`}>
              {titleCaseStatus(booking.escrow_status)}
            </span>
          </div>
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-4">
          <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Subtotal Paket</p>
            <p className="mt-2 text-xl font-bold text-slate-900">
              {formatIdr(booking.subtotal_amount)}
            </p>
          </div>
          <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Admin Fee</p>
            <p className="mt-2 text-xl font-bold text-slate-900">
              {formatIdr(booking.customer_admin_fee_amount)}
            </p>
          </div>
          <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Pajak</p>
            <p className="mt-2 text-xl font-bold text-slate-900">
              {formatIdr(booking.customer_tax_amount)}
            </p>
          </div>
          <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Sisa Pelunasan</p>
            <p className="mt-2 text-xl font-bold text-slate-900">
              {formatIdr(booking.final_payment_amount)}
            </p>
          </div>
        </section>

        {(booking.display_currency || booking.display_subtotal_amount || booking.exchange_rate_date) && (
          <section className="mt-6 rounded-[28px] border border-blue-100 bg-blue-50 p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">Ringkasan Harga Sesuai Bahasa Anda</h2>
            <p className="mt-2 text-sm text-slate-600">
              Tampilan harga paket mengikuti bahasa yang Anda pilih saat checkout. Pembayaran tetap diproses dalam IDR.
            </p>
            <div className="mt-5 grid gap-4 md:grid-cols-4">
              <div className="rounded-[20px] border border-blue-100 bg-white p-4">
                <p className="text-sm text-slate-500">Harga Dewasa</p>
                <p className="mt-2 text-lg font-semibold text-slate-900">
                  {formatPackageMoney(booking.display_price_adult, booking.display_currency, locale)}
                </p>
              </div>
              <div className="rounded-[20px] border border-blue-100 bg-white p-4">
                <p className="text-sm text-slate-500">Harga Anak</p>
                <p className="mt-2 text-lg font-semibold text-slate-900">
                  {formatPackageMoney(booking.display_price_child, booking.display_currency, locale)}
                </p>
              </div>
              <div className="rounded-[20px] border border-blue-100 bg-white p-4">
                <p className="text-sm text-slate-500">Subtotal Display</p>
                <p className="mt-2 text-lg font-semibold text-slate-900">
                  {formatPackageMoney(booking.display_subtotal_amount, booking.display_currency, locale)}
                </p>
              </div>
              <div className="rounded-[20px] border border-blue-100 bg-white p-4">
                <p className="text-sm text-slate-500">Tanggal Kurs</p>
                <p className="mt-2 text-lg font-semibold text-slate-900">
                  {booking.exchange_rate_date || "-"}
                </p>
              </div>
            </div>
          </section>
        )}

        <section className="mt-8 rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">Detail Booking</h2>
          <div className="mt-5 grid gap-5 md:grid-cols-2">
            <div>
              <p className="text-sm text-slate-500">Nama</p>
              <p className="mt-2 font-medium text-slate-900">{booking.customer_name || "-"}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Email</p>
              <p className="mt-2 font-medium text-slate-900">{booking.customer_email || "-"}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Journey Phase</p>
              <span className={`mt-2 inline-flex rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] ${phase.tone}`}>
                {phase.label}
              </span>
            </div>
            <div>
              <p className="text-sm text-slate-500">Status Pembayaran</p>
              <span className={`mt-2 inline-flex rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] ${badgeTone(booking.payment_status)}`}>
                {titleCaseStatus(booking.payment_status)}
              </span>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <a
              href={`/chat?booking_id=${booking.id}`}
              className="rounded-2xl border border-orange-300 bg-orange-50 px-5 py-3 text-sm font-semibold text-orange-700 transition hover:bg-orange-100"
            >
              Chat Sesudah Booking
            </a>
            {booking.package_id && (
              <a
                href={`/chat?package_id=${booking.package_id}`}
                className="rounded-2xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-orange-300 hover:text-orange-600"
              >
                Lihat Chat Sebelum Booking
              </a>
            )}
          </div>
        </section>

        <section className="mt-8 rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-2">
            <h2 className="text-xl font-semibold text-slate-900">Progress Meeting Point</h2>
            <p className="text-sm text-slate-500">
              Dana baru bisa dilanjutkan ke finance setelah merchant klik Arrived, customer klik Picked up, dan merchant klik Go.
            </p>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {timeline.map((item) => (
              <div key={item.label} className="rounded-[20px] border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-900">{item.label}</p>
                <p className={`mt-2 text-xs font-semibold ${item.done ? "text-emerald-600" : "text-slate-500"}`}>
                  {item.done ? "Selesai" : "Menunggu"}
                </p>
                <p className="mt-2 text-xs text-slate-500">{formatDateTime(item.value)}</p>
              </div>
            ))}
          </div>

          {canConfirmPickup && (
            <form action={confirmCustomerPickedUp} className="mt-6">
              <input type="hidden" name="booking_id" value={booking.id} />
              <button
                type="submit"
                className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  Picked up
                </button>
              </form>
            )}
          {canPayRemaining && (
            <div className="mt-4">
              <BookingPaymentButton
                bookingId={booking.id}
                label="Bayar Pelunasan"
                className="rounded-2xl border border-orange-300 bg-orange-50 px-5 py-3 text-sm font-semibold text-orange-700 transition hover:bg-orange-100"
              />
            </div>
          )}
        </section>

        {existingReview ? (
          <div className="mt-8 rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">Review Anda</h2>
            <p className="mt-3 text-sm text-slate-600">Rating: {existingReview.rating ?? "-"} / 5</p>
            <p className="mt-2 text-sm text-slate-700">{existingReview.comment || "-"}</p>
          </div>
        ) : booking.package_id ? (
          <ReviewForm
            bookingId={booking.id}
            packageId={booking.package_id}
            customerName={booking.customer_name || "Customer"}
            submitAction={submitPackageReview}
          />
        ) : null}
      </div>
    </main>
  )
}
