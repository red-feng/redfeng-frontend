import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import BookingPaymentButton from "@/app/components/BookingPaymentButton"
import { confirmCustomerPickedUp } from "./actions"
import { getCurrentLocale } from "@/lib/locale"
import { formatPackageMoney } from "@/lib/package-pricing"
import { normalizeLocale } from "@/lib/i18n"

export const dynamic = "force-dynamic"

type BookingPageProps = {
  params: Promise<{ id: string }>
  searchParams: Promise<{ success?: string; error?: string; from_checkout?: string }>
}

type BookingDetailRow = {
  id: string
  booking_code: string | null
  customer_name: string | null
  customer_email: string | null
  customer_phone: string | null
  pickup_date: string | null
  adult_count: number | null
  child_count: number | null
  payment_type: string | null
  dp_amount: number | null
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

type BookingParticipantRow = {
  id: string
  participant_type: "adult" | "child"
  sequence_no: number
  full_name: string | null
  identity_number: string | null
  nationality: string | null
  age: number | null
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

function resolveFinalPaymentDueDate(dateStr: string | null) {
  if (!dateStr) return "-"
  const date = new Date(`${dateStr}T00:00:00`)
  if (Number.isNaN(date.getTime())) return dateStr
  date.setDate(date.getDate() - 3)
  return formatDate(date.toISOString())
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
  if (
    normalizeStatus(booking.booking_status) === "awaiting_admin_handoff" ||
    normalizeStatus(booking.escrow_status) === "awaiting_admin_handoff"
  ) {
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
    .select("id, booking_code, customer_name, customer_email, customer_phone, pickup_date, adult_count, child_count, payment_type, dp_amount, total_amount, subtotal_amount, customer_admin_fee_amount, customer_tax_amount, final_payment_amount, display_currency, display_subtotal_amount, display_price_adult, display_price_child, exchange_rate_date, booking_status, payment_status, package_id, escrow_status, merchant_arrived_at, merchant_picked_up_at, customer_picked_up_at")
    .eq("id", id)
    .single<BookingDetailRow>()

  if (error || !booking || !user.email || booking.customer_email !== user.email) {
    return <div className="p-10">Booking tidak ditemukan</div>
  }

  const { data: participantRows } = await adminSupabase
    .from("booking_participants")
    .select("id, participant_type, sequence_no, full_name, identity_number, nationality, age")
    .eq("booking_id", booking.id)
    .order("participant_type", { ascending: true })
    .order("sequence_no", { ascending: true })

  const participants = (participantRows as BookingParticipantRow[] | null) || []
  const adultCount = Math.max(Number(booking.adult_count || 0), 0)
  const childCount = Math.max(Number(booking.child_count || 0), 0)
  const expectedParticipantCount = adultCount + childCount
  const hasCompleteParticipants = expectedParticipantCount > 0 && participants.length === expectedParticipantCount

  const canConfirmPickup = Boolean(booking.merchant_arrived_at) && !booking.customer_picked_up_at
  const canPayRemaining = normalizeStatus(booking.payment_status) === "dp_paid"
  const canStartInitialPayment = ["pending", "unpaid", ""].includes(normalizeStatus(booking.payment_status))
  const phase = resolveJourneyPhase(booking)
  const openedFromCheckout = resolvedSearchParams.from_checkout === "1"
  const normalizedPaymentType = normalizeStatus(booking.payment_type) === "dp" ? "dp" : "full"
  const amountDueNow = normalizedPaymentType === "dp" ? Number(booking.dp_amount || 0) : Number(booking.total_amount || 0)

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)] p-6 md:p-10">
      <div className="mx-auto max-w-4xl">
        <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-3xl font-bold text-slate-900">{openedFromCheckout ? "Konfirmasi Booking" : "Booking Berhasil"}</h1>
          <p className="mt-2 text-sm text-slate-500">
            {openedFromCheckout
              ? "Periksa dulu seluruh data peserta, rincian booking, dan nominal biaya. Jika sudah sesuai, lanjutkan ke pembayaran dari halaman ini."
              : "Dana customer masuk ke rekening RedFeng dan tetap ditahan sampai pickup dikonfirmasi merchant dan customer."}
          </p>
        </section>

        {openedFromCheckout ? (
          <div className="mt-6 rounded-2xl border border-orange-200 bg-orange-50 p-4 text-sm text-orange-700">
            Booking sudah dibuat. Lengkapi data peserta, lalu cek detail nominal dan data booking sebelum membuka popup Midtrans.
          </div>
        ) : null}

        {!hasCompleteParticipants ? (
          <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            Data peserta belum lengkap. Silakan isi semua data peserta terlebih dahulu sebelum melanjutkan ke pembayaran.
          </div>
        ) : null}

        {resolvedSearchParams.success ? (
          <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
            {resolvedSearchParams.success}
          </div>
        ) : null}

        {resolvedSearchParams.error ? (
          <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
            {resolvedSearchParams.error}
          </div>
        ) : null}

        <section className="mt-6 grid gap-4 md:grid-cols-4">
          <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Kode Booking</p>
            <p className="mt-2 text-xl font-bold text-slate-900">{booking.booking_code || booking.id}</p>
          </div>
          <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Total</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{formatIdr(booking.total_amount)}</p>
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
            <p className="mt-2 text-xl font-bold text-slate-900">{formatIdr(booking.subtotal_amount)}</p>
          </div>
          <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Admin Fee</p>
            <p className="mt-2 text-xl font-bold text-slate-900">{formatIdr(booking.customer_admin_fee_amount)}</p>
          </div>
          <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Pajak</p>
            <p className="mt-2 text-xl font-bold text-slate-900">{formatIdr(booking.customer_tax_amount)}</p>
          </div>
          <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Sisa Pelunasan</p>
            <p className="mt-2 text-xl font-bold text-slate-900">{formatIdr(booking.final_payment_amount)}</p>
          </div>
        </section>

        {booking.display_currency || booking.display_subtotal_amount || booking.exchange_rate_date ? (
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
                <p className="mt-2 text-lg font-semibold text-slate-900">{booking.exchange_rate_date || "-"}</p>
              </div>
            </div>
          </section>
        ) : null}

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
              <p className="text-sm text-slate-500">Nomor Telepon</p>
              <p className="mt-2 font-medium text-slate-900">{booking.customer_phone || "-"}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Jumlah Peserta</p>
              <p className="mt-2 font-medium text-slate-900">Dewasa {adultCount} · Anak {childCount}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Jenis Pembayaran</p>
              <p className="mt-2 font-medium text-slate-900">{normalizedPaymentType === "dp" ? "DP 30%" : "Full payment"}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Tagihan Sekarang</p>
              <p className="mt-2 font-medium text-slate-900">{formatIdr(amountDueNow)}</p>
            </div>
            {normalizedPaymentType === "dp" ? (
              <div>
                <p className="text-sm text-slate-500">Batas Pelunasan</p>
                <p className="mt-2 font-medium text-slate-900">{resolveFinalPaymentDueDate(booking.pickup_date || null)}</p>
              </div>
            ) : null}
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
        </section>

        <section className="mt-8 rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Data Peserta</h2>
              <p className="mt-2 text-sm text-slate-500">
                Semua peserta yang akan berangkat harus terdata lengkap sebelum pembayaran dibuka.
              </p>
            </div>
            <a
              href={`/booking/${booking.id}/participants`}
              className="rounded-2xl border border-orange-300 bg-orange-50 px-5 py-3 text-sm font-semibold text-orange-700 transition hover:bg-orange-100"
            >
              {hasCompleteParticipants ? "Ubah data peserta" : "Isi data peserta"}
            </a>
          </div>

          <div className="mt-5 rounded-[20px] border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            Status data peserta:{" "}
            <span className={`font-semibold ${hasCompleteParticipants ? "text-emerald-700" : "text-amber-700"}`}>
              {hasCompleteParticipants
                ? `${participants.length} dari ${expectedParticipantCount} peserta sudah lengkap`
                : `${participants.length} dari ${expectedParticipantCount} peserta terisi`}
            </span>
          </div>

          {participants.length > 0 ? (
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {participants.map((participant) => (
                <div key={participant.id} className="rounded-[20px] border border-slate-200 bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    {participant.participant_type === "adult" ? `Dewasa ${participant.sequence_no}` : `Anak ${participant.sequence_no}`}
                  </p>
                  <p className="mt-3 text-lg font-semibold text-slate-900">{participant.full_name || "-"}</p>
                  <dl className="mt-3 space-y-2 text-sm text-slate-600">
                    <div className="flex items-center justify-between gap-4">
                      <dt>No identitas / paspor</dt>
                      <dd className="font-medium text-slate-900">{participant.identity_number || "-"}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <dt>Kewarganegaraan</dt>
                      <dd className="font-medium text-slate-900">{participant.nationality || "-"}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <dt>Umur</dt>
                      <dd className="font-medium text-slate-900">{participant.age ?? "-"}</dd>
                    </div>
                  </dl>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-5 rounded-[20px] border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500">
              Belum ada data peserta yang disimpan untuk booking ini.
            </div>
          )}
        </section>

        <section className="mt-8 rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-2">
            <h2 className="text-xl font-semibold text-slate-900">Aksi Booking</h2>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            {canStartInitialPayment && hasCompleteParticipants ? (
              <BookingPaymentButton
                bookingId={booking.id}
                label={normalizedPaymentType === "dp" ? "Bayar DP Sekarang" : "Bayar Full Payment"}
                className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
              />
            ) : null}
            {canStartInitialPayment && !hasCompleteParticipants ? (
              <a
                href={`/booking/${booking.id}/participants`}
                className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Lengkapi Data Peserta
              </a>
            ) : null}
            {canConfirmPickup ? (
              <form action={confirmCustomerPickedUp}>
                <input type="hidden" name="booking_id" value={booking.id} />
                <button
                  type="submit"
                  className="rounded-2xl bg-orange-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-orange-600"
                >
                  Picked up
                </button>
              </form>
            ) : null}
            {canPayRemaining ? (
              <BookingPaymentButton
                bookingId={booking.id}
                label="Bayar Pelunasan"
                className="rounded-2xl border border-orange-300 bg-orange-50 px-5 py-3 text-sm font-semibold text-orange-700 transition hover:bg-orange-100"
              />
            ) : null}
          </div>
        </section>

      </div>
    </main>
  )
}
