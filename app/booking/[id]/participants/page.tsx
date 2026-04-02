import Link from "next/link"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { saveBookingParticipants } from "../actions"
import { getCurrentLocale } from "@/lib/locale"
import { normalizeLocale, type Locale } from "@/lib/i18n"

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

const participantsCopy = {
  id: {
    loginRequired: "Silakan login untuk melanjutkan pengisian data peserta.",
    bookingNotFound: "Booking tidak ditemukan",
    participantData: "Data Peserta",
    completeAllParticipants: "Lengkapi data seluruh peserta",
    bookingNeedsParticipants: "membutuhkan data peserta lengkap sebelum masuk ke halaman konfirmasi booking.",
    adultParticipants: "Peserta Dewasa",
    adultBodyPrefix: "Isi",
    adultBodySuffix: "form peserta dewasa. Umur peserta dewasa minimal 18 tahun.",
    childParticipants: "Peserta Anak",
    childBodySuffix: "form peserta anak. Umur peserta anak harus di bawah 18 tahun.",
    adult: "dewasa",
    child: "anak",
    adultLabel: "Dewasa",
    childLabel: "Anak",
    fullName: "Nama lengkap",
    identityNumber: "No identitas / paspor",
    nationality: "Kewarganegaraan",
    age: "Umur",
    saveAndContinue: "Simpan dan lanjut ke konfirmasi booking",
    backToBooking: "Kembali ke konfirmasi booking",
    customerFallback: "Customer",
  },
  en: {
    loginRequired: "Please log in to continue filling participant data.",
    bookingNotFound: "Booking not found",
    participantData: "Participant Data",
    completeAllParticipants: "Complete all participant data",
    bookingNeedsParticipants: "requires complete participant data before entering the booking confirmation page.",
    adultParticipants: "Adult Participants",
    adultBodyPrefix: "Fill",
    adultBodySuffix: "adult participant forms. Adult participants must be at least 18 years old.",
    childParticipants: "Child Participants",
    childBodySuffix: "child participant forms. Child participants must be under 18 years old.",
    adult: "adults",
    child: "children",
    adultLabel: "Adult",
    childLabel: "Child",
    fullName: "Full name",
    identityNumber: "ID / passport number",
    nationality: "Nationality",
    age: "Age",
    saveAndContinue: "Save and continue to booking confirmation",
    backToBooking: "Back to booking confirmation",
    customerFallback: "Customer",
  },
  zh: {
    loginRequired: "请先登录以继续填写参团人资料。",
    bookingNotFound: "未找到订单",
    participantData: "参团人资料",
    completeAllParticipants: "完善所有参团人资料",
    bookingNeedsParticipants: "需要完整的参团人资料后才能进入订单确认页面。",
    adultParticipants: "成人参团人",
    adultBodyPrefix: "请填写",
    adultBodySuffix: "位成人参团人表单。成人年龄必须至少 18 岁。",
    childParticipants: "儿童参团人",
    childBodySuffix: "位儿童参团人表单。儿童年龄必须小于 18 岁。",
    adult: "位成人",
    child: "位儿童",
    adultLabel: "成人",
    childLabel: "儿童",
    fullName: "姓名",
    identityNumber: "证件号 / 护照号",
    nationality: "国籍",
    age: "年龄",
    saveAndContinue: "保存并进入订单确认",
    backToBooking: "返回订单确认",
    customerFallback: "客户",
  },
} satisfies Record<Locale, Record<string, string>>

export default async function BookingParticipantsPage({
  params,
  searchParams,
}: BookingParticipantsPageProps) {
  const { id } = await params
  const resolvedSearchParams = await searchParams
  const authSupabase = await createClient()
  const adminSupabase = createAdminClient()
  const locale = normalizeLocale(await getCurrentLocale())
  const t = participantsCopy[locale]
  const {
    data: { user },
  } = await authSupabase.auth.getUser()

  if (!user?.email) {
    return <div className="p-10">{t.loginRequired}</div>
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
    return <div className="p-10">{t.bookingNotFound}</div>
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
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-orange-500">{t.participantData}</p>
          <h1 className="mt-3 text-3xl font-bold text-slate-900">{t.completeAllParticipants}</h1>
          <p className="mt-2 text-sm text-slate-500">
            Booking {booking.booking_code || booking.id} atas nama {booking.customer_name || t.customerFallback} {t.bookingNeedsParticipants}
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
                  <h2 className="text-xl font-semibold text-slate-900">{t.adultParticipants}</h2>
                  <p className="mt-2 text-sm text-slate-500">{t.adultBodyPrefix} {adultCount} {t.adultBodySuffix}</p>
                </div>
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
                  {adultCount} {t.adult}
                </span>
              </div>

              <div className="mt-6 space-y-4">
                {Array.from({ length: adultCount }, (_, index) => {
                  const sequenceNo = index + 1
                  const participant = participantMap.get(`adult:${sequenceNo}`)

                  return (
                    <div key={`adult-${sequenceNo}`} className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
                      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">{t.adultLabel} {sequenceNo}</p>
                      <div className="mt-4 grid gap-4 md:grid-cols-2">
                        <div>
                          <label className="mb-2 block text-sm font-medium text-slate-700">{t.fullName}</label>
                          <input name={`adult_full_name_${sequenceNo}`} defaultValue={participant?.full_name || ""} required className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none ring-orange-500 transition focus:ring-2" />
                        </div>
                        <div>
                          <label className="mb-2 block text-sm font-medium text-slate-700">{t.identityNumber}</label>
                          <input name={`adult_identity_number_${sequenceNo}`} defaultValue={participant?.identity_number || ""} required className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none ring-orange-500 transition focus:ring-2" />
                        </div>
                        <div>
                          <label className="mb-2 block text-sm font-medium text-slate-700">{t.nationality}</label>
                          <input name={`adult_nationality_${sequenceNo}`} defaultValue={participant?.nationality || ""} required className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none ring-orange-500 transition focus:ring-2" />
                        </div>
                        <div>
                          <label className="mb-2 block text-sm font-medium text-slate-700">{t.age}</label>
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
                  <h2 className="text-xl font-semibold text-slate-900">{t.childParticipants}</h2>
                  <p className="mt-2 text-sm text-slate-500">{t.adultBodyPrefix} {childCount} {t.childBodySuffix}</p>
                </div>
                <span className="rounded-full border border-sky-200 bg-sky-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">
                  {childCount} {t.child}
                </span>
              </div>

              <div className="mt-6 space-y-4">
                {Array.from({ length: childCount }, (_, index) => {
                  const sequenceNo = index + 1
                  const participant = participantMap.get(`child:${sequenceNo}`)

                  return (
                    <div key={`child-${sequenceNo}`} className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
                      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">{t.childLabel} {sequenceNo}</p>
                      <div className="mt-4 grid gap-4 md:grid-cols-2">
                        <div>
                          <label className="mb-2 block text-sm font-medium text-slate-700">{t.fullName}</label>
                          <input name={`child_full_name_${sequenceNo}`} defaultValue={participant?.full_name || ""} required className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none ring-orange-500 transition focus:ring-2" />
                        </div>
                        <div>
                          <label className="mb-2 block text-sm font-medium text-slate-700">{t.identityNumber}</label>
                          <input name={`child_identity_number_${sequenceNo}`} defaultValue={participant?.identity_number || ""} required className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none ring-orange-500 transition focus:ring-2" />
                        </div>
                        <div>
                          <label className="mb-2 block text-sm font-medium text-slate-700">{t.nationality}</label>
                          <input name={`child_nationality_${sequenceNo}`} defaultValue={participant?.nationality || ""} required className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none ring-orange-500 transition focus:ring-2" />
                        </div>
                        <div>
                          <label className="mb-2 block text-sm font-medium text-slate-700">{t.age}</label>
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
              {t.saveAndContinue}
            </button>
            <Link href={`/booking/${booking.id}?from_checkout=1`} className="rounded-2xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-orange-300 hover:text-orange-600">
              {t.backToBooking}
            </Link>
          </div>
        </form>
      </div>
    </main>
  )
}
