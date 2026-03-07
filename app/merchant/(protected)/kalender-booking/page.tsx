import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { formatTravelStyleLabel } from "@/lib/travelStyles"

type BookingCalendarRow = {
  id: string
  booking_code: string | null
  pickup_date: string | null
  adult_count: number | null
  child_count: number | null
  payment_status: string | null
  booking_status: string | null
  package_id: string | null
  packages: {
    id: string
    title: string | null
    travel_style: string | null
    minimal_peserta: number | null
    merchant_id: string | null
  } | null
}

type CalendarEntry = {
  key: string
  tripDate: string
  packageName: string
  travelStyle: string | null
  totalParticipants: number
  capacityTarget: number | null
  remainingCapacity: number | null
  bookings: BookingCalendarRow[]
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return "-"
  const date = new Date(dateStr)
  if (Number.isNaN(date.getTime())) return dateStr
  return date.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })
}

function normalizeStatus(value: string | null) {
  return (value || "").trim().toLowerCase()
}

function badgeClass(value: string | null, type: "payment" | "trip") {
  const normalized = normalizeStatus(value)
  if (normalized === "paid" || normalized === "confirmed" || normalized === "completed") {
    return "bg-emerald-50 text-emerald-700"
  }
  if (normalized === "pending") {
    return type === "payment" ? "bg-amber-50 text-amber-700" : "bg-sky-50 text-sky-700"
  }
  if (normalized === "cancelled" || normalized === "refund" || normalized === "rejected") {
    return "bg-rose-50 text-rose-700"
  }
  return "bg-slate-100 text-slate-700"
}

function isOpenTripOrUmroh(pkg: BookingCalendarRow["packages"]) {
  const title = (pkg?.title || "").toLowerCase()
  const style = (pkg?.travel_style || "").toLowerCase()
  return (
    title.includes("open trip") ||
    title.includes("umroh") ||
    style === "open_trip" ||
    style === "umroh" ||
    style === "group" ||
    style === "religious"
  )
}

export default async function MerchantBookingCalendarPage() {
  const supabase = await createClient()
  const adminSupabase = createAdminClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data: merchant } = await adminSupabase
    .from("merchants")
    .select("id")
    .eq("user_id", user.id)
    .single()

  if (!merchant) return <div className="p-10">Data merchant tidak ditemukan.</div>

  const { data, error } = await adminSupabase
    .from("bookings")
    .select(
      "id, booking_code, pickup_date, adult_count, child_count, payment_status, booking_status, package_id, packages!inner(id, title, travel_style, minimal_peserta, merchant_id)",
    )
    .eq("packages.merchant_id", merchant.id)
    .order("pickup_date", { ascending: true })

  const bookings = (data as BookingCalendarRow[] | null) || []
  const grouped = new Map<string, CalendarEntry>()

  for (const booking of bookings) {
    const tripDate = booking.pickup_date || "tanpa-tanggal"
    const packageName = booking.packages?.title || "Paket tidak ditemukan"
    const key = `${tripDate}-${booking.package_id || booking.id}`
    const participants = (booking.adult_count ?? 0) + (booking.child_count ?? 0)

    if (!grouped.has(key)) {
      const shouldShowCapacity = isOpenTripOrUmroh(booking.packages)
      const capacityTarget = shouldShowCapacity ? booking.packages?.minimal_peserta ?? null : null

      grouped.set(key, {
        key,
        tripDate,
        packageName,
        travelStyle: booking.packages?.travel_style || null,
        totalParticipants: 0,
        capacityTarget,
        remainingCapacity: capacityTarget,
        bookings: [],
      })
    }

    const entry = grouped.get(key)
    if (!entry) continue
    entry.totalParticipants += participants
    entry.bookings.push(booking)

    if (entry.capacityTarget !== null) {
      entry.remainingCapacity = Math.max(entry.capacityTarget - entry.totalParticipants, 0)
    }
  }

  const calendarEntries = Array.from(grouped.values())
  const totalTrips = calendarEntries.length
  const totalParticipants = calendarEntries.reduce((sum, entry) => sum + entry.totalParticipants, 0)
  const openTripSchedules = calendarEntries.filter((entry) => entry.capacityTarget !== null).length

  const upcomingTrip = calendarEntries.find((entry) => {
    if (!entry.tripDate || entry.tripDate === "tanpa-tanggal") return false
    const date = new Date(entry.tripDate)
    return !Number.isNaN(date.getTime())
  })

  const metricCards = [
    { label: "Jadwal trip", value: String(totalTrips), note: "Total tanggal keberangkatan" },
    { label: "Jumlah peserta", value: String(totalParticipants), note: "Akumulasi seluruh booking" },
    { label: "Open trip / Umroh", value: String(openTripSchedules), note: "Jadwal dengan kapasitas" },
    {
      label: "Trip terdekat",
      value: upcomingTrip ? formatDate(upcomingTrip.tripDate) : "-",
      note: upcomingTrip?.packageName || "Belum ada jadwal aktif",
    },
  ]

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)] p-6 md:p-10">
      <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">Kalender Booking</h1>
        <p className="mt-1 text-sm text-slate-500">
          Monitor tanggal trip, jumlah peserta, kapasitas sisa, dan detail jadwal tour merchant.
        </p>
      </section>

      {error ? (
        <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
          Gagal memuat kalender booking.
        </div>
      ) : calendarEntries.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 text-slate-600 shadow-sm">
          Belum ada jadwal trip.
        </div>
      ) : (
        <>
          <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {metricCards.map((card) => (
              <div key={card.label} className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-sm text-slate-500">{card.label}</p>
                <p className="mt-2 text-3xl font-bold text-slate-900">{card.value}</p>
                <p className="mt-2 text-xs text-slate-500">{card.note}</p>
              </div>
            ))}
          </section>

          <div className="mt-8 space-y-5">
            {calendarEntries.map((entry) => (
              <section key={entry.key} className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Jadwal Tour</p>
                    <h2 className="mt-2 text-xl font-semibold text-slate-900">
                      {formatDate(entry.tripDate)}, {entry.packageName}
                    </h2>
                    <p className="mt-2 text-sm text-slate-500">
                      {entry.totalParticipants}
                      {entry.capacityTarget !== null ? `/${entry.capacityTarget}` : ""} peserta
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Travel Style: {formatTravelStyleLabel(entry.travelStyle)}
                    </p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3 xl:min-w-[540px]">
                    <div className="rounded-[20px] bg-slate-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Tanggal Trip</p>
                      <p className="mt-2 text-base font-semibold text-slate-900">{formatDate(entry.tripDate)}</p>
                    </div>
                    <div className="rounded-[20px] bg-slate-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Peserta</p>
                      <p className="mt-2 text-base font-semibold text-slate-900">{entry.totalParticipants} peserta</p>
                    </div>
                    <div className="rounded-[20px] bg-slate-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Kapasitas Sisa</p>
                      <p className="mt-2 text-base font-semibold text-slate-900">
                        {entry.remainingCapacity !== null ? `${entry.remainingCapacity} kursi` : "Tidak diterapkan"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-5 overflow-x-auto rounded-[24px] border border-slate-200">
                  <table className="min-w-full text-left text-sm">
                    <thead className="bg-slate-50 text-slate-600">
                      <tr>
                        <th className="border-b p-4">ID Booking</th>
                        <th className="border-b p-4">Tanggal Trip</th>
                        <th className="border-b p-4">Paket</th>
                        <th className="border-b p-4">Jumlah Peserta</th>
                        <th className="border-b p-4">Status Pembayaran</th>
                        <th className="border-b p-4">Status Trip</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white">
                      {entry.bookings.map((booking) => {
                        const participants = (booking.adult_count ?? 0) + (booking.child_count ?? 0)
                        return (
                          <tr key={booking.id} className="hover:bg-slate-50">
                            <td className="border-b p-4 font-medium text-slate-900">
                              {booking.booking_code || booking.id}
                            </td>
                            <td className="border-b p-4">{formatDate(booking.pickup_date)}</td>
                            <td className="border-b p-4">{booking.packages?.title || "-"}</td>
                            <td className="border-b p-4">{participants} peserta</td>
                            <td className="border-b p-4">
                              <span
                                className={`rounded-full px-3 py-1 text-xs font-semibold ${badgeClass(booking.payment_status, "payment")}`}
                              >
                                {booking.payment_status || "-"}
                              </span>
                            </td>
                            <td className="border-b p-4">
                              <span
                                className={`rounded-full px-3 py-1 text-xs font-semibold ${badgeClass(booking.booking_status, "trip")}`}
                              >
                                {booking.booking_status || "-"}
                              </span>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
