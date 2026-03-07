import { createClient } from "@/lib/supabase/server"
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
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data, error } = await supabase
    .from("bookings")
    .select(
      "id, booking_code, pickup_date, adult_count, child_count, payment_status, booking_status, package_id, packages!inner(id, title, travel_style, minimal_peserta, merchant_id)",
    )
    .eq("packages.merchant_id", user.id)
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

    const entry = grouped.get(key)!
    entry.totalParticipants += participants
    entry.bookings.push(booking)

    if (entry.capacityTarget !== null) {
      entry.remainingCapacity = Math.max(entry.capacityTarget - entry.totalParticipants, 0)
    }
  }

  const calendarEntries = Array.from(grouped.values())

  return (
    <div className="p-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Kalender Booking</h1>
        <p className="text-sm text-gray-500">
          Tanggal trip, jumlah peserta, dan ringkasan jadwal tour merchant.
        </p>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
          Gagal memuat kalender booking.
        </div>
      ) : calendarEntries.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-4 text-gray-600">
          Belum ada jadwal trip.
        </div>
      ) : (
        <div className="space-y-4">
          {calendarEntries.map((entry) => (
            <section key={entry.key} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Jadwal Tour</p>
                  <h2 className="mt-1 text-xl font-semibold text-slate-900">
                    {formatDate(entry.tripDate)}, {entry.packageName}
                  </h2>
                  <p className="mt-2 text-sm text-slate-600">
                    {entry.totalParticipants}
                    {entry.capacityTarget !== null ? `/${entry.capacityTarget}` : ""} peserta
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Travel Style: {formatTravelStyleLabel(entry.travelStyle)}
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:min-w-[360px]">
                  <div className="rounded-xl bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Tanggal Trip</p>
                    <p className="mt-1 text-base font-semibold text-slate-900">{formatDate(entry.tripDate)}</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Jumlah Peserta</p>
                    <p className="mt-1 text-base font-semibold text-slate-900">{entry.totalParticipants} peserta</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-4 sm:col-span-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Kapasitas Sisa</p>
                    <p className="mt-1 text-base font-semibold text-slate-900">
                      {entry.remainingCapacity !== null ? `${entry.remainingCapacity} kursi` : "Tidak diterapkan"}
                    </p>
                    {entry.capacityTarget !== null && (
                      <p className="mt-1 text-xs text-slate-500">
                        Basis kapasitas sementara: {entry.capacityTarget} peserta
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-5 overflow-x-auto rounded-xl border border-slate-200">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-600">
                    <tr>
                      <th className="border-b p-3">ID Booking</th>
                      <th className="border-b p-3">Tanggal Trip</th>
                      <th className="border-b p-3">Paket</th>
                      <th className="border-b p-3">Jumlah Peserta</th>
                      <th className="border-b p-3">Status Pembayaran</th>
                      <th className="border-b p-3">Status Trip</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entry.bookings.map((booking) => {
                      const participants = (booking.adult_count ?? 0) + (booking.child_count ?? 0)
                      return (
                        <tr key={booking.id} className="hover:bg-slate-50">
                          <td className="border-b p-3">{booking.booking_code || booking.id}</td>
                          <td className="border-b p-3">{formatDate(booking.pickup_date)}</td>
                          <td className="border-b p-3">{booking.packages?.title || "-"}</td>
                          <td className="border-b p-3">{participants} peserta</td>
                          <td className="border-b p-3">{booking.payment_status || "-"}</td>
                          <td className="border-b p-3">{booking.booking_status || "-"}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
