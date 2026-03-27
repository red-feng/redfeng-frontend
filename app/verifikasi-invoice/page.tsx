import Link from "next/link"
import PublicHeader from "@/app/components/PublicHeader"
import { getCurrentLocale } from "@/lib/locale"
import { formatMerchantCode } from "@/lib/merchant-code"
import { normalizeLocale } from "@/lib/i18n"
import { formatPackageMoney } from "@/lib/package-pricing"
import { createAdminClient } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"

type VerificationPageProps = {
  searchParams?: Promise<{ booking_id?: string }>
}

type BookingVerificationRow = {
  id: string
  booking_code: string | null
  customer_name: string | null
  pickup_date: string | null
  total_amount: number | null
  subtotal_amount: number | null
  customer_admin_fee_amount: number | null
  customer_tax_amount: number | null
  final_payment_amount: number | null
  display_currency?: string | null
  display_subtotal_amount?: number | null
  display_price_adult?: number | null
  display_price_child?: number | null
  exchange_rate_date?: string | null
  booking_status: string | null
  payment_status: string | null
  escrow_status: string | null
  merchant_arrived_at: string | null
  customer_picked_up_at: string | null
  merchant_picked_up_at: string | null
  package_id: string | null
  created_at: string | null
}

function formatMoney(value: number | null | undefined) {
  return `Rp ${Number(value || 0).toLocaleString("id-ID")}`
}

function formatDate(value: string | null) {
  if (!value) return "-"
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return parsed.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
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

function statusBadgeTone(status: string | null) {
  const normalized = normalizeStatus(status)
  if (normalized === "paid") return "border-emerald-200 bg-emerald-50 text-emerald-700"
  if (normalized === "dp_paid") return "border-amber-200 bg-amber-50 text-amber-700"
  if (normalized === "cancelled" || normalized === "rejected") return "border-rose-200 bg-rose-50 text-rose-700"
  return "border-slate-200 bg-slate-100 text-slate-700"
}

function escrowBadgeTone(status: string | null) {
  const normalized = normalizeStatus(status)
  if (normalized === "ready_for_payout" || normalized === "awaiting_admin_handoff") {
    return "border-sky-200 bg-sky-50 text-sky-700"
  }
  if (normalized === "held" || normalized === "partial_hold") return "border-orange-200 bg-orange-50 text-orange-700"
  if (normalized === "paid_out") return "border-violet-200 bg-violet-50 text-violet-700"
  return "border-slate-200 bg-slate-100 text-slate-700"
}

function resolveJourneyPhase(booking: BookingVerificationRow) {
  const paymentStatus = normalizeStatus(booking.payment_status)
  const bookingStatus = normalizeStatus(booking.booking_status)
  const escrowStatus = normalizeStatus(booking.escrow_status)

  if (escrowStatus === "paid_out") {
    return {
      label: "Paid Out",
      tone: "border-violet-200 bg-violet-50 text-violet-700",
      description: "Dana merchant sudah ditransfer oleh finance.",
    }
  }

  if (bookingStatus === "awaiting_admin_handoff" || escrowStatus === "awaiting_admin_handoff") {
    return {
      label: "Ready for Finance",
      tone: "border-sky-200 bg-sky-50 text-sky-700",
      description: "Pickup tervalidasi dan booking siap diteruskan admin ke finance.",
    }
  }

  if (booking.merchant_picked_up_at) {
    return {
      label: "Go Confirmed",
      tone: "border-emerald-200 bg-emerald-50 text-emerald-700",
      description: "Merchant sudah klik Go setelah customer naik kendaraan.",
    }
  }

  if (booking.customer_picked_up_at) {
    return {
      label: "Picked Up",
      tone: "border-emerald-200 bg-emerald-50 text-emerald-700",
      description: "Customer sudah klik Picked up dan menunggu konfirmasi Go dari merchant.",
    }
  }

  if (booking.merchant_arrived_at) {
    return {
      label: "Awaiting Pickup",
      tone: "border-amber-200 bg-amber-50 text-amber-700",
      description: "Merchant sudah tiba di meeting point dan menunggu customer naik.",
    }
  }

  if (paymentStatus === "paid") {
    return {
      label: "Fully Paid",
      tone: "border-emerald-200 bg-emerald-50 text-emerald-700",
      description: "Pembayaran lunas, menunggu proses pickup di hari H.",
    }
  }

  if (paymentStatus === "dp_paid") {
    return {
      label: "DP Paid",
      tone: "border-amber-200 bg-amber-50 text-amber-700",
      description: "DP sudah diterima, booking menunggu pelunasan.",
    }
  }

  return {
    label: titleCaseStatus(bookingStatus) || "Pending",
    tone: "border-slate-200 bg-slate-100 text-slate-700",
    description: "Booking tercatat di sistem dan menunggu progres berikutnya.",
  }
}

function maskName(value: string | null) {
  if (!value) return "-"
  return value
    .split(" ")
    .filter(Boolean)
    .map((part) => {
      if (part.length <= 2) return `${part.charAt(0)}*`
      return `${part.slice(0, 2)}${"*".repeat(Math.max(2, part.length - 2))}`
    })
    .join(" ")
}

async function getBookingForVerification(bookingId: string) {
  const supabase = createAdminClient()

  const baseQuery = "id, booking_code, customer_name, pickup_date, total_amount, subtotal_amount, customer_admin_fee_amount, customer_tax_amount, final_payment_amount, display_currency, display_subtotal_amount, display_price_adult, display_price_child, exchange_rate_date, booking_status, payment_status, escrow_status, merchant_arrived_at, customer_picked_up_at, merchant_picked_up_at, package_id, created_at"

  let booking: BookingVerificationRow | null = null

  const { data: bookingByCode } = await supabase
    .from("bookings")
    .select(baseQuery)
    .eq("booking_code", bookingId)
    .maybeSingle<BookingVerificationRow>()

  booking = bookingByCode || null

  if (!booking) {
    const { data: bookingById } = await supabase
      .from("bookings")
      .select(baseQuery)
      .eq("id", bookingId)
      .maybeSingle<BookingVerificationRow>()

    booking = bookingById || null
  }

  if (!booking) {
    return null
  }

  const { data: packageRow } = booking.package_id
    ? await supabase
        .from("packages")
        .select("slug, title, city, country, merchant_id")
        .eq("id", booking.package_id)
        .maybeSingle()
    : { data: null }

  const { data: merchantRow } = packageRow?.merchant_id
    ? await supabase
        .from("merchants")
        .select("id, brand_name, company_name")
        .eq("id", packageRow.merchant_id)
        .maybeSingle()
    : { data: null }

  return {
    booking,
    packageRow,
    merchantName: merchantRow?.brand_name || merchantRow?.company_name || "-",
    merchantCode: merchantRow?.id ? formatMerchantCode(merchantRow.id) : "-",
  }
}

export default async function VerificationPage({ searchParams }: VerificationPageProps) {
  const locale = await getCurrentLocale()
  const normalizedLocale = normalizeLocale(locale)
  const resolvedSearchParams = (await searchParams) || {}
  const bookingId = (resolvedSearchParams.booking_id || "").trim()
  const verification = bookingId ? await getBookingForVerification(bookingId) : null
  const journeyPhase = verification ? resolveJourneyPhase(verification.booking) : null

  const timeline = verification
    ? [
        {
          label: "Merchant Arrived",
          done: Boolean(verification.booking.merchant_arrived_at),
        },
        {
          label: "Customer Picked up",
          done: Boolean(verification.booking.customer_picked_up_at),
        },
        {
          label: "Merchant Go",
          done: Boolean(verification.booking.merchant_picked_up_at),
        },
      ]
    : []

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#fff7ed_0%,#fffbf5_24%,#f5f5f4_100%)]">
      <PublicHeader locale={locale} />

      <main className="mx-auto max-w-6xl px-4 py-10 md:px-6 md:py-14">
        <section className="overflow-hidden rounded-[36px] border border-orange-200/80 bg-[linear-gradient(135deg,#8a2d0a_0%,#f76707_62%,#ffb55a_100%)] p-8 text-white shadow-[0_32px_80px_-40px_rgba(124,45,18,0.7)] md:p-10">
          <p className="inline-flex rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-orange-50">
            Booking Verification Desk
          </p>
          <div className="mt-5 grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
            <div>
              <h1 className="max-w-3xl text-3xl font-semibold leading-tight md:text-5xl">
                Verifikasi Booking ID dan pastikan invoice sesuai dengan paket yang dipesan.
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-orange-50/90 md:text-base">
                Masukkan Booking ID dari invoice Red Feng untuk mengecek validitas booking, status pembayaran, status escrow,
                detail paket, merchant, dan progress pickup customer.
              </p>
            </div>

            <form className="rounded-[28px] border border-white/20 bg-white/12 p-5 backdrop-blur">
              <label htmlFor="booking_id" className="text-[11px] font-semibold uppercase tracking-[0.24em] text-orange-50/80">
                Booking ID
              </label>
              <input
                id="booking_id"
                name="booking_id"
                defaultValue={bookingId}
                placeholder="Contoh: RF-2026-0001"
                className="mt-3 w-full rounded-2xl border border-white/20 bg-white/95 px-4 py-3 text-sm font-medium text-slate-900 outline-none ring-0 placeholder:text-slate-400"
              />
              <button
                type="submit"
                className="mt-4 inline-flex w-full items-center justify-center rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Verifikasi Sekarang
              </button>
              <p className="mt-3 text-xs leading-6 text-orange-50/80">
                Booking ID tersedia di invoice PDF dan di barcode invoice. Anda juga dapat menempel hasil scan barcode ke kolom ini.
              </p>
            </form>
          </div>
        </section>

        {!bookingId && (
          <section className="mt-8 grid gap-4 md:grid-cols-3">
            <div className="rounded-[28px] border border-orange-100 bg-white/90 p-6 shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-orange-500">Validasi Invoice</p>
              <h2 className="mt-3 text-xl font-semibold text-slate-900">Cek keaslian booking</h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                Sistem akan memvalidasi Booking ID yang tercetak di invoice Red Feng dan memastikan booking itu benar ada di sistem.
              </p>
            </div>
            <div className="rounded-[28px] border border-orange-100 bg-white/90 p-6 shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-orange-500">Paket Terkait</p>
              <h2 className="mt-3 text-xl font-semibold text-slate-900">Lihat paket yang dipesan</h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                Halaman ini menampilkan nama paket, operator merchant, tanggal perjalanan, dan status operasional pickup yang relevan.
              </p>
            </div>
            <div className="rounded-[28px] border border-orange-100 bg-white/90 p-6 shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-orange-500">Escrow Status</p>
              <h2 className="mt-3 text-xl font-semibold text-slate-900">Pantau status dana</h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                Informasi pembayaran, escrow, dan kesiapan payout merchant bisa dicek langsung dari hasil verifikasi booking.
              </p>
            </div>
          </section>
        )}

        {bookingId && !verification && (
          <section className="mt-8 rounded-[30px] border border-rose-200 bg-rose-50 p-8 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-rose-500">Booking Tidak Ditemukan</p>
            <h2 className="mt-3 text-2xl font-semibold text-slate-900">Booking ID tidak terverifikasi.</h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
              Pastikan Booking ID sama persis dengan yang tercetak pada invoice Red Feng. Jika masalah tetap terjadi, hubungi tim
              support dengan melampirkan invoice PDF Anda.
            </p>
          </section>
        )}

        {verification && (
          <>
            <section className="mt-8 grid gap-4 md:grid-cols-4">
              <div className="rounded-[28px] border border-orange-100 bg-white p-5 shadow-sm">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-orange-500">Verification Result</p>
                <span className="mt-3 inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold uppercase tracking-[0.18em] text-emerald-700">
                  Valid
                </span>
                <p className="mt-2 text-sm text-slate-500">Booking ID cocok dengan invoice Red Feng.</p>
              </div>
              <div className="rounded-[28px] border border-orange-100 bg-white p-5 shadow-sm">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-orange-500">Booking ID</p>
                <p className="mt-3 text-xl font-semibold text-slate-900">{verification.booking.booking_code || verification.booking.id}</p>
                <p className="mt-2 text-sm text-slate-500">Dibuat {formatDate(verification.booking.created_at)}</p>
              </div>
              <div className="rounded-[28px] border border-orange-100 bg-white p-5 shadow-sm">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-orange-500">Payment Status</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className={`inline-flex rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] ${statusBadgeTone(verification.booking.payment_status)}`}>
                    {titleCaseStatus(verification.booking.payment_status)}
                  </span>
                  <span className={`inline-flex rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] ${escrowBadgeTone(verification.booking.escrow_status)}`}>
                    Escrow {titleCaseStatus(verification.booking.escrow_status)}
                  </span>
                </div>
              </div>
              <div className="rounded-[28px] border border-orange-100 bg-white p-5 shadow-sm">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-orange-500">Journey Phase</p>
                <span className={`mt-3 inline-flex rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] ${journeyPhase?.tone || "border-slate-200 bg-slate-100 text-slate-700"}`}>
                  {journeyPhase?.label || "-"}
                </span>
                <p className="mt-3 text-sm text-slate-500">{journeyPhase?.description || `Pickup ${formatDate(verification.booking.pickup_date)}`}</p>
              </div>
            </section>

            <section className="mt-8 grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
              <div className="rounded-[32px] border border-orange-100 bg-white p-7 shadow-sm">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-orange-500">Booking Detail</p>
                <h2 className="mt-3 text-2xl font-semibold text-slate-900">
                  {verification.packageRow?.title || "Paket terhubung di sistem"}
                </h2>
                <div className="mt-6 grid gap-5 md:grid-cols-2">
                  <div>
                    <p className="text-sm text-slate-500">Customer</p>
                    <p className="mt-2 font-medium text-slate-900">{maskName(verification.booking.customer_name)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Merchant / Operator</p>
                    <p className="mt-2 font-medium text-slate-900">{verification.merchantName}</p>
                    <p className="mt-1 text-xs font-semibold uppercase tracking-[0.22em] text-orange-600">{verification.merchantCode}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Lokasi Paket</p>
                    <p className="mt-2 font-medium text-slate-900">
                      {[verification.packageRow?.city, verification.packageRow?.country].filter(Boolean).join(", ") || "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Tanggal Perjalanan</p>
                    <p className="mt-2 font-medium text-slate-900">{formatDate(verification.booking.pickup_date)}</p>
                  </div>
                </div>

                {verification.packageRow?.slug && (
                  <Link
                    href={`/packages/${verification.packageRow.slug}`}
                    className="mt-6 inline-flex rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm font-semibold text-orange-700 transition hover:bg-orange-100"
                  >
                    Lihat Detail Paket
                  </Link>
                )}
              </div>

              <div className="rounded-[32px] border border-orange-100 bg-white p-7 shadow-sm">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-orange-500">Payment Breakdown</p>
                <div className="mt-5 space-y-4">
                  <div className="rounded-[22px] border border-stone-200 bg-stone-50 px-5 py-4">
                    <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Subtotal Paket</p>
                    <p className="mt-2 text-2xl font-semibold text-slate-900">{formatMoney(verification.booking.subtotal_amount)}</p>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-[22px] border border-stone-200 bg-stone-50 px-5 py-4">
                      <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Admin Fee</p>
                      <p className="mt-2 text-xl font-semibold text-slate-900">{formatMoney(verification.booking.customer_admin_fee_amount)}</p>
                    </div>
                    <div className="rounded-[22px] border border-stone-200 bg-stone-50 px-5 py-4">
                      <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Pajak</p>
                      <p className="mt-2 text-xl font-semibold text-slate-900">{formatMoney(verification.booking.customer_tax_amount)}</p>
                    </div>
                  </div>
                  <div className="rounded-[22px] border border-orange-200 bg-[linear-gradient(135deg,#fff7ed_0%,#ffffff_100%)] px-5 py-4">
                    <p className="text-xs uppercase tracking-[0.22em] text-orange-500">Total Customer Payment</p>
                    <p className="mt-2 text-3xl font-semibold text-slate-950">{formatMoney(verification.booking.total_amount)}</p>
                    <p className="mt-2 text-sm text-slate-500">
                      Sisa pelunasan: {formatMoney(verification.booking.final_payment_amount)}
                    </p>
                  </div>
                  {verification.booking.display_currency && (
                    <div className="rounded-[22px] border border-sky-200 bg-sky-50 px-5 py-4">
                      <p className="text-xs uppercase tracking-[0.22em] text-sky-600">Harga sesuai bahasa customer</p>
                      <p className="mt-2 text-sm font-semibold text-slate-900">
                        {formatPackageMoney(
                          verification.booking.display_subtotal_amount,
                          verification.booking.display_currency,
                          normalizedLocale,
                        )}
                      </p>
                      <p className="mt-2 text-xs text-slate-500">
                        Adult:{" "}
                        {formatPackageMoney(
                          verification.booking.display_price_adult,
                          verification.booking.display_currency,
                          normalizedLocale,
                        )}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Child:{" "}
                        {formatPackageMoney(
                          verification.booking.display_price_child,
                          verification.booking.display_currency,
                          normalizedLocale,
                        )}
                      </p>
                      <p className="mt-2 text-xs text-slate-500">
                        Kurs: {verification.booking.exchange_rate_date || "-"}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </section>

            <section className="mt-8 rounded-[32px] border border-orange-100 bg-white p-7 shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-orange-500">Pickup Timeline</p>
              <h2 className="mt-3 text-2xl font-semibold text-slate-900">Status operasional customer dan merchant</h2>
              <div className="mt-6 grid gap-4 md:grid-cols-3">
                {timeline.map((item) => (
                  <div
                    key={item.label}
                    className={`rounded-[24px] border px-5 py-5 ${
                      item.done ? "border-emerald-200 bg-emerald-50" : "border-stone-200 bg-stone-50"
                    }`}
                  >
                    <p className="text-sm font-semibold text-slate-900">{item.label}</p>
                    <p className={`mt-3 text-sm font-semibold ${item.done ? "text-emerald-600" : "text-slate-500"}`}>
                      {item.done ? "Tervalidasi" : "Menunggu"}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  )
}
