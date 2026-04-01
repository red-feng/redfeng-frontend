import Link from "next/link"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { saveBookingParticipants } from "../actions"

export const dynamic = "force-dynamic"

type BookingParticipantsPageProps = {
  params: Promise<{ id: string }>
  searchParams: Promise<{ error?: string }>
}

type ParticipantRow = {
  id: string
  participant_type: "adult" | "child"
  sequence_no: number
  full_name: string | null
  identity_number: string | null
  nationality: string | null
  age: number | null
}

export default async function BookingParticipantsPage({
  params,
  searchParams,
}: BookingParticipantsPageProps) {
  const { id } = await params
  const resolvedSearchParams = await searchParams
  const authSupabase = await createClient()
  const adminSupabase = createAdminClient()
  const {
    data: { user },
  } = await authSupabase.auth.getUser()

  if (!user?.email) {
    return <div className="p-10">Silakan login untuk melanjutkan pengisian data peserta.</div>
  }

  const { data: booking } = await adminSupabase
    .from("bookings")
    .select("id, booking_code, customer_name, customer_email, adult_count, child_count")
    .eq("id", id)
    .maybeSingle<{
      id: string
      booking_code: string | null
      customer_name: string | null
      customer_email: string | null
      adult_count: number | null
      child_count: number | null
    }>()

  if (!booking || booking.customer_email !== user.email) {
    return <div className="p-10">Booking tidak ditemukan</div>
  }

  const { data: participantRows } = await adminSupabase
    .from("booking_participants")
    .select("id, participant_type, sequence_no, full_name, identity_number, nationality, age")
    .eq("booking_id", booking.id)
    .order("participant_type", { ascending: true })
    .order("sequence_no", { ascending: true })

  const participants = (participantRows as ParticipantRow[] | null) || []
  const adultCount = Math.max(Number(booking.adult_count || 0), 0)
  const childCount = Math.max(Number(booking.child_count || 0), 0)
  const participantMap = new Map(
    participants.map((participant) => [`${participant.participant_type}:${participant.sequence_no}`, participant]),
  )

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)] p-6 md:p-10">
      <div className="mx-auto max-w-5xl">
        <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-orange-500">Data Peserta</p>
          <h1 className="mt-3 text-3xl font-bold text-slate-900">Lengkapi data seluruh peserta</h1>
          <p className="mt-2 text-sm text-slate-500">
            Booking {booking.booking_code || booking.id} atas nama {booking.customer_name || "Customer"} membutuhkan data peserta lengkap sebelum masuk ke halaman konfirmasi booking.
          </p>
        </section>

        {resolvedSearchParams.error ? (
          <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
            {resolvedSearchParams.error}
          </div>
        ) : null}

        <form action={saveBookingParticipants} className="mt-6 space-y-6">
          <input type="hidden" name="booking_id" value={booking.id} />

          {adultCount > 0 ? (
            <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">Peserta Dewasa</h2>
                  <p className="mt-2 text-sm text-slate-500">Isi {adultCount} form peserta dewasa. Umur peserta dewasa minimal 18 tahun.</p>
                </div>
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
                  {adultCount} dewasa
                </span>
              </div>

              <div className="mt-6 space-y-4">
                {Array.from({ length: adultCount }, (_, index) => {
                  const sequenceNo = index + 1
                  const participant = participantMap.get(`adult:${sequenceNo}`)

                  return (
                    <div key={`adult-${sequenceNo}`} className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
                      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Dewasa {sequenceNo}</p>
                      <div className="mt-4 grid gap-4 md:grid-cols-2">
                        <div>
                          <label className="mb-2 block text-sm font-medium text-slate-700">Nama lengkap</label>
                          <input name={`adult_full_name_${sequenceNo}`} defaultValue={participant?.full_name || ""} required className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none ring-orange-500 transition focus:ring-2" />
                        </div>
                        <div>
                          <label className="mb-2 block text-sm font-medium text-slate-700">No identitas / paspor</label>
                          <input name={`adult_identity_number_${sequenceNo}`} defaultValue={participant?.identity_number || ""} required className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none ring-orange-500 transition focus:ring-2" />
                        </div>
                        <div>
                          <label className="mb-2 block text-sm font-medium text-slate-700">Kewarganegaraan</label>
                          <input name={`adult_nationality_${sequenceNo}`} defaultValue={participant?.nationality || ""} required className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none ring-orange-500 transition focus:ring-2" />
                        </div>
                        <div>
                          <label className="mb-2 block text-sm font-medium text-slate-700">Umur</label>
                          <input type="number" min="18" max="120" step="1" inputMode="numeric" name={`adult_age_${sequenceNo}`} defaultValue={participant?.age ?? ""} required className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none ring-orange-500 transition focus:ring-2" />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          ) : null}

          {childCount > 0 ? (
            <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">Peserta Anak</h2>
                  <p className="mt-2 text-sm text-slate-500">Isi {childCount} form peserta anak. Umur peserta anak harus di bawah 18 tahun.</p>
                </div>
                <span className="rounded-full border border-sky-200 bg-sky-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">
                  {childCount} anak
                </span>
              </div>

              <div className="mt-6 space-y-4">
                {Array.from({ length: childCount }, (_, index) => {
                  const sequenceNo = index + 1
                  const participant = participantMap.get(`child:${sequenceNo}`)

                  return (
                    <div key={`child-${sequenceNo}`} className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
                      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Anak {sequenceNo}</p>
                      <div className="mt-4 grid gap-4 md:grid-cols-2">
                        <div>
                          <label className="mb-2 block text-sm font-medium text-slate-700">Nama lengkap</label>
                          <input name={`child_full_name_${sequenceNo}`} defaultValue={participant?.full_name || ""} required className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none ring-orange-500 transition focus:ring-2" />
                        </div>
                        <div>
                          <label className="mb-2 block text-sm font-medium text-slate-700">No identitas / paspor</label>
                          <input name={`child_identity_number_${sequenceNo}`} defaultValue={participant?.identity_number || ""} required className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none ring-orange-500 transition focus:ring-2" />
                        </div>
                        <div>
                          <label className="mb-2 block text-sm font-medium text-slate-700">Kewarganegaraan</label>
                          <input name={`child_nationality_${sequenceNo}`} defaultValue={participant?.nationality || ""} required className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none ring-orange-500 transition focus:ring-2" />
                        </div>
                        <div>
                          <label className="mb-2 block text-sm font-medium text-slate-700">Umur</label>
                          <input type="number" min="0" max="17" step="1" inputMode="numeric" name={`child_age_${sequenceNo}`} defaultValue={participant?.age ?? ""} required className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none ring-orange-500 transition focus:ring-2" />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          ) : null}

          <div className="flex flex-wrap gap-3">
            <button type="submit" className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800">
              Simpan dan lanjut ke konfirmasi booking
            </button>
            <Link href={`/booking/${booking.id}?from_checkout=1`} className="rounded-2xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-orange-300 hover:text-orange-600">
              Kembali ke konfirmasi booking
            </Link>
          </div>
        </form>
      </div>
    </main>
  )
}
