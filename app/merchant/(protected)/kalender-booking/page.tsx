import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { type Locale, normalizeLocale } from "@/lib/i18n"
import { getCurrentLocale } from "@/lib/locale"
import { formatTravelStyleLabel } from "@/lib/travelStyles"

type BookingCalendarRow = {
  id: string
  booking_code: string | null
  customer_name: string | null
  pickup_date: string | null
  adult_count: number | null
  child_count: number | null
  payment_status: string | null
  booking_status: string | null
  package_id: string | null
}

function getCalendarText(locale: Locale) {
  const dict = {
    id: {
      merchantMissing: "Data merchant tidak ditemukan.",
      packageMissing: "Paket tidak ditemukan",
      heroBadge: "Booking Calendar",
      heroTitle: "Kalender trip merchant yang lebih rapi untuk mengelola kapasitas dan jadwal keberangkatan.",
      heroDescription: "Pantau tanggal trip, peserta terkonfirmasi, kapasitas open trip, dan status pembayaran dalam satu panel operasional yang lebih siap untuk ritme OTA harian.",
      loadError: "Gagal memuat kalender booking.",
      emptyState: "Belum ada jadwal trip.",
    },
    en: {
      merchantMissing: "Merchant data not found.",
      packageMissing: "Package not found",
      heroBadge: "Booking Calendar",
      heroTitle: "A cleaner merchant trip calendar to manage capacity and departure schedules.",
      heroDescription: "Monitor trip dates, confirmed participants, open-trip capacity, and payment status in one operations panel built for daily OTA rhythm.",
      loadError: "Failed to load booking calendar.",
      emptyState: "There are no trip schedules yet.",
    },
    zh: {
      merchantMissing: "未找到商家数据。",
      packageMissing: "未找到套餐",
      heroBadge: "预订日历",
      heroTitle: "更清晰地管理商家行程日历、容量与出发排期。",
      heroDescription: "在一个更适合 OTA 日常运营的面板中查看出发日期、确认人数、开放团容量与付款状态。",
      loadError: "加载预订日历失败。",
      emptyState: "暂时还没有行程安排。",
    },
  } satisfies Record<Locale, Record<string, string>>

  return dict[locale]
}

type MerchantPackageRow = {
  id: string
  title: string | null
  travel_style: string | null
  minimal_peserta: number | null
}

type CalendarEntry = {
  key: string
  tripDate: string
  packageName: string
  packageId: string
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

function isOpenTripOrUmroh(pkg: MerchantPackageRow | null | undefined) {
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
  const locale = normalizeLocale(await getCurrentLocale())
  const t = getCalendarText(locale)
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

  if (!merchant) return <div className="p-10">{t.merchantMissing}</div>

  const { data: packageRows, error: packageError } = await adminSupabase
    .from("packages")
    .select("id, title, travel_style, minimal_peserta")
    .eq("merchant_id", merchant.id)

  const merchantPackages = (packageRows as MerchantPackageRow[] | null) || []
  const packageIds = merchantPackages.map((pkg) => pkg.id)
  const packageMap = new Map(merchantPackages.map((pkg) => [pkg.id, pkg]))

  const { data, error } = packageIds.length
    ? await adminSupabase
        .from("bookings")
        .select("id, booking_code, customer_name, pickup_date, adult_count, child_count, payment_status, booking_status, package_id")
        .in("package_id", packageIds)
        .order("pickup_date", { ascending: true })
    : { data: [] as BookingCalendarRow[], error: packageError }

  const bookings = (data as BookingCalendarRow[] | null) || []
  const grouped = new Map<string, CalendarEntry>()

  for (const booking of bookings) {
    const pkg = packageMap.get(booking.package_id || "")
    const tripDate = booking.pickup_date || "tanpa-tanggal"
      const packageName = pkg?.title || t.packageMissing
    const key = `${tripDate}-${booking.package_id || booking.id}`
    const participants = (booking.adult_count ?? 0) + (booking.child_count ?? 0)

    if (!grouped.has(key)) {
      const shouldShowCapacity = isOpenTripOrUmroh(pkg)
      const capacityTarget = shouldShowCapacity ? pkg?.minimal_peserta ?? null : null

      grouped.set(key, {
        key,
        tripDate,
        packageName,
        packageId: booking.package_id || booking.id,
        travelStyle: pkg?.travel_style || null,
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
  const fullSchedules = calendarEntries.filter(
    (entry) => entry.capacityTarget !== null && (entry.remainingCapacity || 0) <= 0,
  ).length

  const upcomingTrip = calendarEntries.find((entry) => {
    if (!entry.tripDate || entry.tripDate === "tanpa-tanggal") return false
    const date = new Date(entry.tripDate)
    return !Number.isNaN(date.getTime()) && date >= new Date(new Date().setHours(0, 0, 0, 0))
  })

  const getCapacityStatus = (entry: CalendarEntry) => {
    if (entry.capacityTarget === null || entry.remainingCapacity === null) {
      return { label: "Private / fleksibel", className: "bg-slate-100 text-slate-700" }
    }
    if (entry.remainingCapacity <= 0) {
      return { label: "Penuh", className: "bg-rose-50 text-rose-700" }
    }
    if (entry.remainingCapacity <= Math.max(Math.ceil(entry.capacityTarget * 0.2), 2)) {
      return { label: "Hampir penuh", className: "bg-amber-50 text-amber-700" }
    }
    return { label: "Masih tersedia", className: "bg-emerald-50 text-emerald-700" }
  }

  const metricCards = [
    { label: "Jadwal trip", value: String(totalTrips), note: "Total tanggal keberangkatan" },
    { label: "Jumlah peserta", value: String(totalParticipants), note: "Akumulasi seluruh booking" },
    { label: "Open trip / Umroh", value: String(openTripSchedules), note: "Jadwal dengan kapasitas" },
    {
      label: "Trip terdekat",
      value: upcomingTrip ? formatDate(upcomingTrip.tripDate) : "-",
      note: upcomingTrip?.packageName || "Belum ada jadwal aktif",
    },
    {
      label: "Jadwal penuh",
      value: String(fullSchedules),
      note: "Open trip / umroh yang sudah penuh",
    },
  ]

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fff8f1_0%,#f7f1e8_38%,#f3eee7_100%)] p-6 md:p-10">
      <section className="overflow-hidden rounded-[34px] border border-orange-100 bg-[linear-gradient(135deg,#983108_0%,#f76707_52%,#ffb357_100%)] text-white shadow-[0_28px_80px_rgba(194,65,12,0.24)]">
        <div className="grid gap-6 px-7 py-8 lg:grid-cols-[minmax(0,1.45fr)_440px] lg:px-10 lg:py-10">
          <div>
            <div className="inline-flex rounded-full border border-white/25 bg-white/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-white/90">
              {t.heroBadge}
            </div>
            <h1 className="mt-5 max-w-3xl text-4xl font-semibold leading-[1.05] tracking-[-0.04em] text-white md:text-5xl">
              {t.heroTitle}
            </h1>
            <p className="mt-5 max-w-3xl text-sm leading-7 text-white/90 md:text-base">
              {t.heroDescription}
            </p>
          </div>

          <div className="grid gap-4">
            <div className="rounded-[28px] border border-white/30 bg-white/12 p-5 backdrop-blur-sm">
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-white/75">Operational Snapshot</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-[20px] border border-white/20 bg-white/10 px-4 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/70">Trip aktif</p>
                  <p className="mt-2 text-2xl font-semibold text-white">{totalTrips}</p>
                  <p className="mt-1 text-xs leading-5 text-white/70">Tanggal keberangkatan terjadwal</p>
                </div>
                <div className="rounded-[20px] border border-white/20 bg-white/10 px-4 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/70">Peserta</p>
                  <p className="mt-2 text-2xl font-semibold text-white">{totalParticipants}</p>
                  <p className="mt-1 text-xs leading-5 text-white/70">Total pax seluruh schedule</p>
                </div>
                <div className="rounded-[20px] border border-white/20 bg-white/10 px-4 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/70">Open trip</p>
                  <p className="mt-2 text-2xl font-semibold text-white">{openTripSchedules}</p>
                  <p className="mt-1 text-xs leading-5 text-white/70">Jadwal dengan target kapasitas</p>
                </div>
                <div className="rounded-[20px] border border-white/20 bg-white/10 px-4 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/70">Sudah penuh</p>
                  <p className="mt-2 text-2xl font-semibold text-white">{fullSchedules}</p>
                  <p className="mt-1 text-xs leading-5 text-white/70">Butuh penutupan inventory</p>
                </div>
              </div>
            </div>

            <div className="rounded-[28px] border border-white/30 bg-white/10 p-5 backdrop-blur-sm">
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-white/75">Next Schedule</p>
              <p className="mt-3 text-lg font-semibold text-white">
                {upcomingTrip ? formatDate(upcomingTrip.tripDate) : "Belum ada trip aktif"}
              </p>
              <p className="mt-2 text-sm leading-6 text-white/85">
                {upcomingTrip?.packageName || "Tambahkan booking atau aktifkan lebih banyak paket agar jadwal berikutnya muncul."}
              </p>
            </div>
          </div>
        </div>
      </section>

      {error || packageError ? (
        <div className="mt-6 rounded-[24px] border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
          {t.loadError}
        </div>
      ) : calendarEntries.length === 0 ? (
        <div className="mt-6 rounded-[28px] border border-[#eadfce] bg-white px-6 py-5 text-sm text-slate-600 shadow-sm">
          {t.emptyState}
        </div>
      ) : (
        <>
          <section className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            {metricCards.map((card) => (
              <div
                key={card.label}
                className="rounded-[26px] border border-[#f0ddc7] bg-white px-5 py-5 shadow-[0_18px_44px_rgba(15,23,42,0.06)]"
              >
                <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-orange-500">{card.label}</p>
                <p className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-slate-950">{card.value}</p>
                <p className="mt-2 text-xs leading-6 text-slate-500">{card.note}</p>
              </div>
            ))}
          </section>

          <div className="mt-8 space-y-6">
            {calendarEntries.map((entry) => {
              const capacityStatus = getCapacityStatus(entry)
              return (
                <section
                  key={entry.key}
                  className="rounded-[32px] border border-[#f3dbc3] bg-white/85 p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur-sm lg:p-7"
                >
                  <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                    <div className="max-w-3xl">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-orange-500">Schedule Overview</p>
                      <h2 className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-slate-950">
                        {formatDate(entry.tripDate)}
                      </h2>
                      <p className="mt-2 text-base font-medium text-slate-900">{entry.packageName}</p>
                      <p className="mt-3 text-sm leading-6 text-slate-600">
                        {entry.totalParticipants}
                        {entry.capacityTarget !== null ? `/${entry.capacityTarget}` : ""} peserta • Travel style{" "}
                        {formatTravelStyleLabel(entry.travelStyle)}
                      </p>
                      <div className="mt-4 inline-flex rounded-full px-3 py-1 text-xs font-semibold">
                        <span className={`rounded-full px-3 py-1 ${capacityStatus.className}`}>{capacityStatus.label}</span>
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2 xl:min-w-[640px] xl:grid-cols-4">
                      <div className="rounded-[22px] border border-[#efe3d1] bg-[#fffaf3] px-4 py-4">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">Tanggal Trip</p>
                        <p className="mt-2 text-base font-semibold text-slate-950">{formatDate(entry.tripDate)}</p>
                      </div>
                      <div className="rounded-[22px] border border-[#efe3d1] bg-[#fffaf3] px-4 py-4">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">Peserta</p>
                        <p className="mt-2 text-base font-semibold text-slate-950">{entry.totalParticipants} pax</p>
                      </div>
                      <div className="rounded-[22px] border border-[#efe3d1] bg-[#fffaf3] px-4 py-4">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">Sisa Kapasitas</p>
                        <p className="mt-2 text-base font-semibold text-slate-950">
                          {entry.remainingCapacity !== null ? `${entry.remainingCapacity} kursi` : "Tidak diterapkan"}
                        </p>
                      </div>
                      <div className="rounded-[22px] border border-[#efe3d1] bg-[#fffaf3] px-4 py-4">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">Jumlah Booking</p>
                        <p className="mt-2 text-base font-semibold text-slate-950">{entry.bookings.length} booking</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 overflow-x-auto rounded-[24px] border border-[#efe3d1]">
                    <table className="min-w-full text-left text-sm">
                      <thead className="bg-[#fff8ef] text-slate-600">
                        <tr>
                          <th className="border-b border-[#efe3d1] p-4">ID Booking</th>
                          <th className="border-b border-[#efe3d1] p-4">Nama Customer</th>
                          <th className="border-b border-[#efe3d1] p-4">Tanggal Trip</th>
                          <th className="border-b border-[#efe3d1] p-4">Paket</th>
                          <th className="border-b border-[#efe3d1] p-4">Jumlah Peserta</th>
                          <th className="border-b border-[#efe3d1] p-4">Status Pembayaran</th>
                          <th className="border-b border-[#efe3d1] p-4">Status Trip</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white">
                        {entry.bookings.map((booking) => {
                          const participants = (booking.adult_count ?? 0) + (booking.child_count ?? 0)
                          return (
                            <tr key={booking.id} className="hover:bg-[#fffdf9]">
                              <td className="border-b border-[#f3ebdf] p-4 font-medium text-slate-950">
                                {booking.booking_code || booking.id}
                              </td>
                              <td className="border-b border-[#f3ebdf] p-4">{booking.customer_name || "-"}</td>
                              <td className="border-b border-[#f3ebdf] p-4">{formatDate(booking.pickup_date)}</td>
                              <td className="border-b border-[#f3ebdf] p-4">{entry.packageName}</td>
                              <td className="border-b border-[#f3ebdf] p-4">{participants} peserta</td>
                              <td className="border-b border-[#f3ebdf] p-4">
                                <span
                                  className={`rounded-full px-3 py-1 text-xs font-semibold ${badgeClass(booking.payment_status, "payment")}`}
                                >
                                  {booking.payment_status || "-"}
                                </span>
                              </td>
                              <td className="border-b border-[#f3ebdf] p-4">
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
              )
            })}
          </div>
        </>
      )}
    </main>
  )
}
