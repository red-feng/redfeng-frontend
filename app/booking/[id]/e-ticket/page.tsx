import Link from "next/link"
import { redirect } from "next/navigation"
import SimplePublicLogoHeader from "@/app/components/SimplePublicLogoHeader"
import { formatBookingCode } from "@/lib/merchant-code"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

type PageProps = {
  params: Promise<{ id: string }>
}

type BookingRow = {
  id: string
  booking_code: string | null
  customer_name: string | null
  customer_email: string | null
  customer_phone: string | null
  customer_locale: string | null
  user_id: string | null
  payment_status: string | null
  booking_product_type: string | null
  created_at: string | null
}

type FlightDetailRow = {
  lifecycle_status: string | null
  issue_status: string | null
  airline_code: string | null
  airline_name: string | null
  flight_number: string | null
  origin_airport_code: string | null
  origin_airport_name: string | null
  destination_airport_code: string | null
  destination_airport_name: string | null
  departure_at: string | null
  arrival_at: string | null
  cabin_class: string | null
  passenger_count: number | null
  pnr_code: string | null
  ticket_number: string | null
  issued_at: string | null
}

type ParticipantRow = {
  id: string
  participant_type: string | null
  sequence_no: number | null
  full_name: string | null
  identity_number: string | null
  nationality: string | null
}

function normalizeStatus(value: string | null | undefined) {
  return String(value || "").trim().toLowerCase()
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "-"
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return "-"
  return parsed.toLocaleString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function formatCabin(value: string | null | undefined) {
  const normalized = String(value || "economy").replace(/_/g, " ")
  return normalized.charAt(0).toUpperCase() + normalized.slice(1)
}

function isIssued(detail: FlightDetailRow | null) {
  return normalizeStatus(detail?.lifecycle_status) === "issued" || normalizeStatus(detail?.issue_status) === "issued"
}

export default async function FlightETicketPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/booking/${id}/e-ticket`)}`)
  }

  const adminSupabase = createAdminClient()
  const { data: booking } = await adminSupabase
    .from("bookings")
    .select("id, booking_code, customer_name, customer_email, customer_phone, customer_locale, user_id, payment_status, booking_product_type, created_at")
    .eq("id", id)
    .maybeSingle<BookingRow>()

  const userEmail = String(user.email || "").trim().toLowerCase()
  const bookingEmail = String(booking?.customer_email || "").trim().toLowerCase()
  const isOwner = booking && (booking.user_id === user.id || (bookingEmail && bookingEmail === userEmail))

  if (!booking || !isOwner || normalizeStatus(booking.booking_product_type) !== "flight") {
    redirect("/customer/bookings?error=E-ticket%20tidak%20ditemukan")
  }

  const { data: flightDetail } = await adminSupabase
    .from("flight_booking_details")
    .select("lifecycle_status, issue_status, airline_code, airline_name, flight_number, origin_airport_code, origin_airport_name, destination_airport_code, destination_airport_name, departure_at, arrival_at, cabin_class, passenger_count, pnr_code, ticket_number, issued_at")
    .eq("booking_id", booking.id)
    .maybeSingle<FlightDetailRow>()

  if (!isIssued(flightDetail || null) || (!flightDetail?.ticket_number && !flightDetail?.pnr_code)) {
    redirect(`/booking/${booking.id}?error=E-ticket%20belum%20tersedia`)
  }

  const { data: participantRows } = await adminSupabase
    .from("booking_participants")
    .select("id, participant_type, sequence_no, full_name, identity_number, nationality")
    .eq("booking_id", booking.id)
    .order("sequence_no", { ascending: true })

  const participants = (participantRows as ParticipantRow[] | null) || []
  const bookingCode = formatBookingCode(booking.booking_code, booking.id)
  const route = `${flightDetail.origin_airport_code || "-"} -> ${flightDetail.destination_airport_code || "-"}`
  const flightCode = [flightDetail.airline_code, flightDetail.flight_number].filter(Boolean).join(" ") || flightDetail.flight_number || "-"

  return (
    <main className="min-h-screen bg-[#fffaf6] text-slate-950 print:bg-white">
      <div className="print:hidden">
        <SimplePublicLogoHeader />
      </div>

      <section className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8 print:max-w-none print:px-0 print:py-0">
        <div className="overflow-hidden rounded-[28px] border border-orange-100 bg-white shadow-[0_24px_70px_rgba(255,75,0,0.1)] print:rounded-none print:border-slate-200 print:shadow-none">
          <div className="bg-[#ff4b00] px-6 py-6 text-white sm:px-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-orange-100">Red Feng E-ticket</p>
                <h1 className="mt-3 text-3xl font-bold tracking-tight">{route}</h1>
                <p className="mt-2 text-sm text-orange-50">
                  Data tiket diterbitkan berdasarkan konfirmasi resmi maskapai.
                </p>
              </div>
              <div className="rounded-[18px] border border-white/30 bg-white/15 px-5 py-4 text-left sm:text-right">
                <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-orange-100">Kode Red Feng</p>
                <p className="mt-2 text-xl font-bold">{bookingCode}</p>
              </div>
            </div>
          </div>

          <div className="grid gap-5 p-6 sm:p-8 lg:grid-cols-[1fr_320px]">
            <div className="space-y-5">
              <section className="rounded-[22px] border border-orange-100 bg-[#fffaf3] p-5">
                <h2 className="text-lg font-bold text-slate-950">Detail Penerbangan</h2>
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Maskapai</p>
                    <p className="mt-2 font-semibold">{flightDetail.airline_name || "-"}</p>
                    <p className="mt-1 text-sm text-slate-500">{flightCode}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Kelas</p>
                    <p className="mt-2 font-semibold">{formatCabin(flightDetail.cabin_class)}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Berangkat</p>
                    <p className="mt-2 font-semibold">{flightDetail.origin_airport_code || "-"}</p>
                    <p className="mt-1 text-sm text-slate-500">{formatDateTime(flightDetail.departure_at)}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Tiba</p>
                    <p className="mt-2 font-semibold">{flightDetail.destination_airport_code || "-"}</p>
                    <p className="mt-1 text-sm text-slate-500">{formatDateTime(flightDetail.arrival_at)}</p>
                  </div>
                </div>
              </section>

              <section className="rounded-[22px] border border-slate-200 bg-white p-5">
                <h2 className="text-lg font-bold text-slate-950">Penumpang</h2>
                <div className="mt-4 divide-y divide-slate-100">
                  {(participants.length > 0 ? participants : [{ id: "contact", full_name: booking.customer_name, identity_number: null, nationality: null, participant_type: "adult", sequence_no: 1 }]).map((participant, index) => (
                    <div key={participant.id || index} className="grid gap-3 py-4 sm:grid-cols-[1fr_180px_140px]">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                          {participant.participant_type === "child" ? "Anak" : "Dewasa"} {participant.sequence_no || index + 1}
                        </p>
                        <p className="mt-2 font-semibold text-slate-950">{participant.full_name || booking.customer_name || "-"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-400">Identitas</p>
                        <p className="mt-2 text-sm font-medium">{participant.identity_number || "-"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-400">Kewarganegaraan</p>
                        <p className="mt-2 text-sm font-medium">{participant.nationality || "-"}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            <aside className="space-y-5">
              <section className="rounded-[22px] border border-emerald-200 bg-emerald-50 p-5 text-emerald-900">
                <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-emerald-700">Status</p>
                <h2 className="mt-2 text-xl font-bold">Issued</h2>
                <p className="mt-2 text-sm leading-6">Tiket sudah diterbitkan. Simpan PNR dan nomor tiket untuk check-in.</p>
              </section>

              <section className="rounded-[22px] border border-orange-100 bg-white p-5">
                <div className="space-y-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">PNR</p>
                    <p className="mt-2 text-lg font-bold text-slate-950">{flightDetail.pnr_code || "-"}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Nomor tiket</p>
                    <p className="mt-2 break-all text-lg font-bold text-slate-950">{flightDetail.ticket_number || "-"}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Issued at</p>
                    <p className="mt-2 text-sm font-semibold text-slate-700">{formatDateTime(flightDetail.issued_at)}</p>
                  </div>
                </div>
              </section>

              <section className="rounded-[22px] border border-slate-200 bg-slate-50 p-5 text-sm leading-6 text-slate-600">
                Pastikan nama penumpang sesuai identitas. Untuk perubahan data, hubungi tim Red Feng sebelum waktu keberangkatan.
              </section>

              <div className="flex flex-col gap-3 print:hidden">
                <Link
                  href={`/booking/${booking.id}`}
                  className="inline-flex items-center justify-center rounded-[16px] border border-orange-200 bg-white px-5 py-3 text-sm font-bold text-[#ff4b00] transition hover:bg-orange-50"
                >
                  Kembali ke booking
                </Link>
              </div>
            </aside>
          </div>
        </div>
      </section>
    </main>
  )
}
