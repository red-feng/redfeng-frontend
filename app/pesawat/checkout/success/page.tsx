import Link from "next/link"
import { redirect } from "next/navigation"
import BookingPaymentButton from "@/app/components/BookingPaymentButton"
import FlightPaymentCountdown from "@/app/components/FlightPaymentCountdown"
import SimplePublicLogoHeader from "@/app/components/SimplePublicLogoHeader"
import { getCustomerFlightStatus } from "@/lib/flights/customerFlightStatus"
import { formatBookingCode } from "@/lib/merchant-code"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

type AdminSupabaseClient = ReturnType<typeof createAdminClient>

type BookingRow = {
  id: string
  booking_code: string | null
  customer_name: string | null
  customer_email: string | null
  user_id: string | null
  total_amount: number | null
  payment_status: string | null
  created_at: string | null
  expiry_time: string | null
}

type FlightDetailRow = {
  lifecycle_status: string | null
  issue_status: string | null
  airline_name: string | null
  flight_number: string | null
  origin_airport_code: string | null
  destination_airport_code: string | null
  departure_at: string | null
  arrival_at: string | null
  pnr_code: string | null
  ticket_number: string | null
  booking_hold_expires_at: string | null
}

function firstParam(params: Record<string, string | string[] | undefined>, key: string) {
  const value = params[key]
  return Array.isArray(value) ? value[0] || "" : value || ""
}

function formatMoney(value: number | null) {
  return `IDR ${Number(value || 0).toLocaleString("id-ID")}`
}

function formatDateTime(value: string | null) {
  if (!value) return "-"
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return "-"
  return parsed.toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function normalizeStatus(value: string | null | undefined) {
  return String(value || "").trim().toLowerCase()
}

function isExpiredDateTime(value: string | null | undefined) {
  if (!value) return false
  const parsed = new Date(value)
  return !Number.isNaN(parsed.getTime()) && parsed.getTime() <= Date.now()
}

function canOpenFlightPayment(detail: FlightDetailRow | null, booking: BookingRow) {
  return (
    normalizeStatus(detail?.lifecycle_status) === "booking_hold_created" &&
    ["pending", "unpaid", ""].includes(normalizeStatus(booking.payment_status)) &&
    !isExpiredDateTime(detail?.booking_hold_expires_at) &&
    !isExpiredDateTime(booking.expiry_time)
  )
}

function getSuccessCopy(detail: FlightDetailRow | null) {
  const customerStatus = getCustomerFlightStatus({
    lifecycleStatus: detail?.lifecycle_status,
    issueStatus: detail?.issue_status,
    paymentStatus: "pending",
    ticketNumber: detail?.ticket_number,
    pnrCode: detail?.pnr_code,
  })
  return {
    eyebrow: customerStatus.label,
    title: customerStatus.headline,
    body: customerStatus.body,
    statusLabel: customerStatus.label,
  }
}

function getPaymentGateCopy(detail: FlightDetailRow | null, booking: BookingRow) {
  const lifecycle = String(detail?.lifecycle_status || "").trim().toLowerCase()
  const holdUntil = detail?.booking_hold_expires_at ? formatDateTime(detail.booking_hold_expires_at) : ""
  const paymentUntil = booking.expiry_time ? formatDateTime(booking.expiry_time) : ""

  if (lifecycle === "booking_hold_created") {
    return {
      label: "Pembayaran siap",
      title: "Kursi berhasil diamankan.",
      body: paymentUntil
        ? `Link pembayaran sudah bisa dibuka dari detail booking. Selesaikan pembayaran maksimal ${paymentUntil}.`
        : holdUntil
          ? `Link pembayaran sudah bisa dibuka dari detail booking. Selesaikan sebelum batas pembayaran ${holdUntil}.`
          : "Link pembayaran sudah bisa dibuka dari detail booking.",
      tone: "border-emerald-200 bg-emerald-50 text-emerald-800",
    }
  }

  return {
    label: "Pembayaran belum dibuka",
    title: "Tidak ada pembayaran yang perlu dilakukan sekarang.",
    body: "Red Feng sedang memastikan harga dan ketersediaan kursi. Link pembayaran baru dibuka setelah semuanya valid.",
    tone: "border-sky-200 bg-sky-50 text-sky-800",
  }
}

function isMissingSchemaColumnError(error: { message?: string | null } | null | undefined) {
  const message = String(error?.message || "").toLowerCase()
  return message.includes("schema cache") && message.includes("column")
}

async function getFlightDetailForSuccess(adminSupabase: AdminSupabaseClient, bookingId: string) {
  const fullResult = await adminSupabase
    .from("flight_booking_details")
    .select("lifecycle_status, issue_status, airline_name, flight_number, origin_airport_code, destination_airport_code, departure_at, arrival_at, pnr_code, ticket_number, booking_hold_expires_at")
    .eq("booking_id", bookingId)
    .maybeSingle<FlightDetailRow>()

  if (!fullResult.error || !isMissingSchemaColumnError(fullResult.error)) {
    return fullResult.data || null
  }

  const fallbackResult = await adminSupabase
    .from("flight_booking_details")
    .select("airline_name, flight_number, origin_airport_code, destination_airport_code, departure_at")
    .eq("booking_id", bookingId)
    .maybeSingle<Pick<FlightDetailRow, "airline_name" | "flight_number" | "origin_airport_code" | "destination_airport_code" | "departure_at">>()

  if (fallbackResult.error || !fallbackResult.data) return null

  return {
    lifecycle_status: "fare_recheck_required",
    issue_status: "pending_confirmation",
    airline_name: fallbackResult.data.airline_name,
    flight_number: fallbackResult.data.flight_number,
    origin_airport_code: fallbackResult.data.origin_airport_code,
    destination_airport_code: fallbackResult.data.destination_airport_code,
    departure_at: fallbackResult.data.departure_at,
    arrival_at: null,
    pnr_code: null,
    ticket_number: null,
    booking_hold_expires_at: null,
  } satisfies FlightDetailRow
}

export default async function FlightCheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const bookingId = firstParam(params, "booking_id")

  if (!bookingId) {
    redirect("/pesawat/catalog")
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/pesawat/checkout/success?booking_id=${bookingId}`)}`)
  }

  const adminSupabase = createAdminClient()
  const { data: booking } = await adminSupabase
    .from("bookings")
    .select("id, booking_code, customer_name, customer_email, user_id, total_amount, payment_status, created_at, expiry_time")
    .eq("id", bookingId)
    .maybeSingle<BookingRow>()

  const userEmail = String(user.email || "").trim().toLowerCase()
  const bookingEmail = String(booking?.customer_email || "").trim().toLowerCase()
  const isOwner = booking && (booking.user_id === user.id || (bookingEmail && userEmail && bookingEmail === userEmail))

  if (!booking || !isOwner) {
    redirect("/customer/bookings?error=Booking%20pesawat%20tidak%20ditemukan")
  }

  const flightDetail = await getFlightDetailForSuccess(adminSupabase, booking.id)

  const copy = getSuccessCopy(flightDetail || null)
  const paymentGateCopy = getPaymentGateCopy(flightDetail || null, booking)
  const paymentReady = canOpenFlightPayment(flightDetail || null, booking)
  const route = `${flightDetail?.origin_airport_code || "-"} -> ${flightDetail?.destination_airport_code || "-"}`

  return (
    <main className="min-h-screen bg-[#fffaf6] text-slate-950">
      <SimplePublicLogoHeader />

      <section className="mx-auto grid max-w-6xl gap-5 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:px-8">
        <div className="rounded-[24px] border border-orange-100 bg-white p-6 shadow-[0_18px_48px_rgba(255,75,0,0.08)] sm:p-8">
          <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-4 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
            {copy.eyebrow}
          </span>
          <h1 className="mt-5 max-w-2xl text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
            {copy.title}
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600">
            {copy.body}
          </p>

          <div className={`mt-6 rounded-[20px] border p-5 ${paymentGateCopy.tone}`}>
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em]">{paymentGateCopy.label}</p>
            <h2 className="mt-2 text-lg font-bold">{paymentGateCopy.title}</h2>
            <p className="mt-2 text-sm leading-7">{paymentGateCopy.body}</p>
            {paymentReady ? (
              <FlightPaymentCountdown deadline={booking.expiry_time} refreshOnExpire className="mt-4" />
            ) : null}
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <div className="rounded-[18px] border border-orange-100 bg-orange-50 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-orange-600">Kode booking</p>
              <p className="mt-2 text-lg font-bold text-slate-950">{formatBookingCode(booking.booking_code, booking.id)}</p>
            </div>
            <div className="rounded-[18px] border border-sky-100 bg-sky-50 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-sky-600">Status</p>
              <p className="mt-2 text-sm font-bold text-slate-950">{copy.statusLabel}</p>
            </div>
            <div className="rounded-[18px] border border-emerald-100 bg-emerald-50 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-600">Estimasi total</p>
              <p className="mt-2 text-lg font-bold text-slate-950">{formatMoney(booking.total_amount)}</p>
            </div>
          </div>

          <div className="mt-7 rounded-[20px] border border-orange-100 bg-[#fffaf3] p-5">
            <h2 className="text-base font-bold text-slate-950">Langkah berikutnya</h2>
            <div className="mt-4 grid gap-3">
              {[
                "Red Feng memastikan harga dan ketersediaan kursi.",
                "Jika data valid, sistem mengamankan kode booking maskapai.",
                "Pembayaran dibuka setelah kursi berhasil diamankan.",
                "Setelah pembayaran sukses, Red Feng menerbitkan tiket dan mengirim e-ticket.",
              ].map((item, index) => (
                <div key={item} className="flex gap-3 rounded-[16px] border border-white bg-white p-4">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#ff4b00] text-xs font-bold text-white">
                    {index + 1}
                  </span>
                  <p className="text-sm leading-6 text-slate-700">{item}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-7 flex flex-wrap gap-3">
            {paymentReady ? (
              <BookingPaymentButton
                bookingId={booking.id}
                label="Bayar sekarang"
                className="inline-flex items-center justify-center rounded-[16px] bg-[#ff4b00] px-5 py-3 text-sm font-bold text-white shadow-[0_10px_24px_rgba(255,75,0,0.2)] transition hover:bg-[#e64400]"
              />
            ) : null}
            <Link
              href={`/booking/${booking.id}`}
              className={`inline-flex items-center justify-center rounded-[16px] px-5 py-3 text-sm font-bold transition ${
                paymentReady
                  ? "border border-orange-200 bg-white text-[#ff4b00] hover:bg-orange-50"
                  : "bg-[#ff4b00] text-white shadow-[0_10px_24px_rgba(255,75,0,0.2)] hover:bg-[#e64400]"
              }`}
            >
              Lihat status booking
            </Link>
            <Link
              href="/customer/bookings"
              className="inline-flex items-center justify-center rounded-[16px] border border-orange-200 bg-white px-5 py-3 text-sm font-bold text-[#ff4b00] transition hover:bg-orange-50"
            >
              Pesanan saya
            </Link>
          </div>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          <div className="rounded-[22px] border border-orange-100 bg-white p-5 shadow-[0_18px_48px_rgba(255,75,0,0.08)]">
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-orange-500">Ringkasan flight</p>
            <h2 className="mt-3 text-xl font-bold text-slate-950">{route}</h2>
            <div className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
              <p>
                <span className="font-semibold text-slate-900">Airline:</span>{" "}
                {flightDetail?.airline_name || "-"} {flightDetail?.flight_number || ""}
              </p>
              <p>
                <span className="font-semibold text-slate-900">Berangkat:</span>{" "}
                {formatDateTime(flightDetail?.departure_at || null)}
              </p>
              <p>
                <span className="font-semibold text-slate-900">Tiba:</span>{" "}
                {formatDateTime(flightDetail?.arrival_at || null)}
              </p>
              {flightDetail?.pnr_code ? (
                <p>
                  <span className="font-semibold text-slate-900">PNR:</span> {flightDetail.pnr_code}
                </p>
              ) : null}
              {flightDetail?.booking_hold_expires_at ? (
                <p>
                  <span className="font-semibold text-slate-900">Batas pembayaran:</span>{" "}
                  {formatDateTime(flightDetail.booking_hold_expires_at)}
                </p>
              ) : null}
            </div>
          </div>

          <div className="rounded-[22px] border border-emerald-100 bg-emerald-50 p-5 text-sm leading-6 text-emerald-800">
            Pembayaran diproses aman via Midtrans dan dibuka setelah harga serta kursi dipastikan.
          </div>
        </aside>
      </section>
    </main>
  )
}
