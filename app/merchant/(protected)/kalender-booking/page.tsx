import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { type Locale, normalizeLocale } from "@/lib/i18n"
import { getCurrentLocale } from "@/lib/locale"
import { getPaymentStatusTone, normalizeStatus, toneClass } from "@/lib/status-tones"
import { formatTravelStyleLabel } from "@/lib/travelStyles"
import { isBookingExpiredForNonPayment } from "@/lib/bookings/draft-cleanup"
import { formatBookingCode } from "@/lib/merchant-code"

export const dynamic = "force-dynamic"

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
      privateFlexible: "Private / fleksibel",
      full: "Penuh",
      almostFull: "Hampir penuh",
      available: "Masih tersedia",
      tripSchedules: "Jadwal trip",
      tripSchedulesNote: "Total tanggal keberangkatan",
      totalParticipants: "Jumlah peserta",
      totalParticipantsNote: "Akumulasi seluruh booking",
      openTripUmroh: "Open trip / Umroh",
      openTripUmrohNote: "Jadwal dengan kapasitas",
      nearestTrip: "Trip terdekat",
      noActiveSchedule: "Belum ada jadwal aktif",
      fullSchedules: "Jadwal penuh",
      fullSchedulesNote: "Open trip / umroh yang sudah penuh",
      operationalSnapshot: "Operational Snapshot",
      activeTrips: "Trip aktif",
      activeTripsNote: "Tanggal keberangkatan terjadwal",
      participants: "Peserta",
      participantsNote: "Total pax seluruh schedule",
      openTrip: "Open trip",
      openTripNote: "Jadwal dengan target kapasitas",
      soldOut: "Sudah penuh",
      soldOutNote: "Butuh penutupan inventory",
      nextSchedule: "Next Schedule",
      noActiveTrip: "Belum ada trip aktif",
      nextScheduleHint: "Tambahkan booking atau aktifkan lebih banyak paket agar jadwal berikutnya muncul.",
      scheduleOverview: "Schedule Overview",
      participantUnit: "peserta",
      travelStyle: "Travel style",
      pax: "pax",
      remainingCapacity: "Sisa Kapasitas",
      seats: "kursi",
      notApplied: "Tidak diterapkan",
      totalBookings: "Jumlah Booking",
      bookingUnit: "booking",
      bookingId: "ID Booking",
      customerName: "Nama Customer",
      tripDate: "Tanggal Trip",
      packageLabel: "Paket",
      paymentStatus: "Status Pembayaran",
      tripStatus: "Status Trip",
    },
    en: {
      merchantMissing: "Merchant data not found.",
      packageMissing: "Package not found",
      heroBadge: "Booking Calendar",
      heroTitle: "A cleaner merchant trip calendar to manage capacity and departure schedules.",
      heroDescription: "Monitor trip dates, confirmed participants, open-trip capacity, and payment status in one operations panel built for daily OTA rhythm.",
      loadError: "Failed to load booking calendar.",
      emptyState: "There are no trip schedules yet.",
      privateFlexible: "Private / flexible",
      full: "Full",
      almostFull: "Almost full",
      available: "Available",
      tripSchedules: "Trip schedules",
      tripSchedulesNote: "Total departure dates",
      totalParticipants: "Participants",
      totalParticipantsNote: "Accumulated from all bookings",
      openTripUmroh: "Open trip / Umrah",
      openTripUmrohNote: "Schedules with capacity targets",
      nearestTrip: "Nearest trip",
      noActiveSchedule: "No active schedule yet",
      fullSchedules: "Full schedules",
      fullSchedulesNote: "Open trip / Umrah schedules that are already full",
      operationalSnapshot: "Operational Snapshot",
      activeTrips: "Active trips",
      activeTripsNote: "Scheduled departure dates",
      participants: "Participants",
      participantsNote: "Total pax across all schedules",
      openTrip: "Open trip",
      openTripNote: "Schedules with capacity targets",
      soldOut: "Sold out",
      soldOutNote: "Needs inventory closure",
      nextSchedule: "Next Schedule",
      noActiveTrip: "No active trip yet",
      nextScheduleHint: "Add bookings or activate more packages so the next schedule appears here.",
      scheduleOverview: "Schedule Overview",
      participantUnit: "participants",
      travelStyle: "Travel style",
      pax: "pax",
      remainingCapacity: "Remaining Capacity",
      seats: "seats",
      notApplied: "Not applied",
      totalBookings: "Total Bookings",
      bookingUnit: "bookings",
      bookingId: "Booking ID",
      customerName: "Customer Name",
      tripDate: "Trip Date",
      packageLabel: "Package",
      paymentStatus: "Payment Status",
      tripStatus: "Trip Status",
    },
    zh: {
      merchantMissing: "未找到商家数据。",
      packageMissing: "未找到套餐",
      heroBadge: "预订日历",
      heroTitle: "更清晰地管理商家行程日历、容量与出发排期。",
      heroDescription: "在一个更适合 OTA 日常运营的面板中查看出发日期、确认人数、开放团容量与付款状态。",
      loadError: "加载预订日历失败。",
      emptyState: "暂时还没有行程安排。",
      privateFlexible: "私享 / 灵活",
      full: "已满",
      almostFull: "接近满员",
      available: "仍有名额",
      tripSchedules: "行程安排",
      tripSchedulesNote: "总出发日期数",
      totalParticipants: "总人数",
      totalParticipantsNote: "所有预订累计人数",
      openTripUmroh: "开放团 / 朝觐",
      openTripUmrohNote: "有容量目标的行程",
      nearestTrip: "最近行程",
      noActiveSchedule: "暂无有效行程安排",
      fullSchedules: "满员行程",
      fullSchedulesNote: "已经满员的开放团 / 朝觐行程",
      operationalSnapshot: "运营概览",
      activeTrips: "进行中行程",
      activeTripsNote: "已排期的出发日期",
      participants: "人数",
      participantsNote: "所有行程总 pax",
      openTrip: "开放团",
      openTripNote: "有容量目标的行程",
      soldOut: "已满员",
      soldOutNote: "需要关闭库存",
      nextSchedule: "下一行程",
      noActiveTrip: "暂无有效行程",
      nextScheduleHint: "添加预订或启用更多套餐后，下一趟行程会显示在这里。",
      scheduleOverview: "行程概览",
      participantUnit: "位游客",
      travelStyle: "出游类型",
      pax: "pax",
      remainingCapacity: "剩余容量",
      seats: "座位",
      notApplied: "不适用",
      totalBookings: "预订数量",
      bookingUnit: "笔预订",
      bookingId: "预订编号",
      customerName: "客户姓名",
      tripDate: "出行日期",
      packageLabel: "套餐",
      paymentStatus: "付款状态",
      tripStatus: "行程状态",
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

function badgeClass(value: string | null, type: "payment" | "trip") {
  const normalized = normalizeStatus(value)
  if (normalized === "paid" || normalized === "confirmed" || normalized === "completed") {
    return toneClass("success")
  }
  if (normalized === "pending") {
    return type === "payment" ? getPaymentStatusTone(value) : toneClass("progress")
  }
  if (normalized === "cancelled" || normalized === "refund" || normalized === "rejected") {
    return toneClass("danger")
  }
  return toneClass("neutral")
}

function isActiveCalendarBooking(booking: BookingCalendarRow) {
  const paymentStatus = normalizeStatus(booking.payment_status)
  const bookingStatus = normalizeStatus(booking.booking_status)

  if (bookingStatus.startsWith("cancelled")) return false
  if (["refund", "refund_pending_review", "expired"].includes(paymentStatus)) return false

  return true
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
  const supabase = await createClient("merchant")
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

  const bookings = ((data as BookingCalendarRow[] | null) || []).filter(
    (booking) => !isBookingExpiredForNonPayment(booking) && isActiveCalendarBooking(booking),
  )
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
      return { label: t.privateFlexible, className: toneClass("neutral") }
    }
    if (entry.remainingCapacity <= 0) {
      return { label: t.full, className: toneClass("danger") }
    }
    if (entry.remainingCapacity <= Math.max(Math.ceil(entry.capacityTarget * 0.2), 2)) {
      return { label: t.almostFull, className: toneClass("pending") }
    }
    return { label: t.available, className: toneClass("success") }
  }

  const metricCards = [
    { label: t.tripSchedules, value: String(totalTrips), note: t.tripSchedulesNote },
    { label: t.totalParticipants, value: String(totalParticipants), note: t.totalParticipantsNote },
    { label: t.openTripUmroh, value: String(openTripSchedules), note: t.openTripUmrohNote },
    {
      label: t.nearestTrip,
      value: upcomingTrip ? formatDate(upcomingTrip.tripDate) : "-",
      note: upcomingTrip?.packageName || t.noActiveSchedule,
    },
    {
      label: t.fullSchedules,
      value: String(fullSchedules),
      note: t.fullSchedulesNote,
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
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-white/75">{t.operationalSnapshot}</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-[20px] border border-white/20 bg-white/10 px-4 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/70">{t.activeTrips}</p>
                  <p className="mt-2 text-2xl font-semibold text-white">{totalTrips}</p>
                  <p className="mt-1 text-xs leading-5 text-white/70">{t.activeTripsNote}</p>
                </div>
                <div className="rounded-[20px] border border-white/20 bg-white/10 px-4 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/70">{t.participants}</p>
                  <p className="mt-2 text-2xl font-semibold text-white">{totalParticipants}</p>
                  <p className="mt-1 text-xs leading-5 text-white/70">{t.participantsNote}</p>
                </div>
                <div className="rounded-[20px] border border-white/20 bg-white/10 px-4 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/70">{t.openTrip}</p>
                  <p className="mt-2 text-2xl font-semibold text-white">{openTripSchedules}</p>
                  <p className="mt-1 text-xs leading-5 text-white/70">{t.openTripNote}</p>
                </div>
                <div className="rounded-[20px] border border-white/20 bg-white/10 px-4 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/70">{t.soldOut}</p>
                  <p className="mt-2 text-2xl font-semibold text-white">{fullSchedules}</p>
                  <p className="mt-1 text-xs leading-5 text-white/70">{t.soldOutNote}</p>
                </div>
              </div>
            </div>

            <div className="rounded-[28px] border border-white/30 bg-white/10 p-5 backdrop-blur-sm">
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-white/75">{t.nextSchedule}</p>
              <p className="mt-3 text-lg font-semibold text-white">
                {upcomingTrip ? formatDate(upcomingTrip.tripDate) : t.noActiveTrip}
              </p>
              <p className="mt-2 text-sm leading-6 text-white/85">
                {upcomingTrip?.packageName || t.nextScheduleHint}
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
                      <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-orange-500">{t.scheduleOverview}</p>
                      <h2 className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-slate-950">
                        {formatDate(entry.tripDate)}
                      </h2>
                      <p className="mt-2 text-base font-medium text-slate-900">{entry.packageName}</p>
                      <p className="mt-3 text-sm leading-6 text-slate-600">
                        {entry.totalParticipants}
                        {entry.capacityTarget !== null ? `/${entry.capacityTarget}` : ""} {t.participantUnit} • {t.travelStyle}{" "}
                        {formatTravelStyleLabel(entry.travelStyle)}
                      </p>
                      <div className="mt-4 inline-flex rounded-full px-3 py-1 text-xs font-semibold">
                        <span className={`rounded-full px-3 py-1 ${capacityStatus.className}`}>{capacityStatus.label}</span>
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2 xl:min-w-[640px] xl:grid-cols-4">
                      <div className="rounded-[22px] border border-[#efe3d1] bg-[#fffaf3] px-4 py-4">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">{t.tripDate}</p>
                        <p className="mt-2 text-base font-semibold text-slate-950">{formatDate(entry.tripDate)}</p>
                      </div>
                      <div className="rounded-[22px] border border-[#efe3d1] bg-[#fffaf3] px-4 py-4">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">{t.participants}</p>
                        <p className="mt-2 text-base font-semibold text-slate-950">{entry.totalParticipants} {t.pax}</p>
                      </div>
                      <div className="rounded-[22px] border border-[#efe3d1] bg-[#fffaf3] px-4 py-4">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">{t.remainingCapacity}</p>
                        <p className="mt-2 text-base font-semibold text-slate-950">
                          {entry.remainingCapacity !== null ? `${entry.remainingCapacity} ${t.seats}` : t.notApplied}
                        </p>
                      </div>
                      <div className="rounded-[22px] border border-[#efe3d1] bg-[#fffaf3] px-4 py-4">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">{t.totalBookings}</p>
                        <p className="mt-2 text-base font-semibold text-slate-950">{entry.bookings.length} {t.bookingUnit}</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 overflow-x-auto rounded-[24px] border border-[#efe3d1]">
                    <table className="min-w-full text-left text-sm">
                      <thead className="bg-[#fff8ef] text-slate-600">
                        <tr>
                          <th className="border-b border-[#efe3d1] p-4">{t.bookingId}</th>
                          <th className="border-b border-[#efe3d1] p-4">{t.customerName}</th>
                          <th className="border-b border-[#efe3d1] p-4">{t.tripDate}</th>
                          <th className="border-b border-[#efe3d1] p-4">{t.packageLabel}</th>
                          <th className="border-b border-[#efe3d1] p-4">{t.totalParticipants}</th>
                          <th className="border-b border-[#efe3d1] p-4">{t.paymentStatus}</th>
                          <th className="border-b border-[#efe3d1] p-4">{t.tripStatus}</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white">
                        {entry.bookings.map((booking) => {
                          const participants = (booking.adult_count ?? 0) + (booking.child_count ?? 0)
                          return (
                            <tr key={booking.id} className="hover:bg-[#fffdf9]">
                              <td className="border-b border-[#f3ebdf] p-4 font-medium text-slate-950">
                                {formatBookingCode(booking.booking_code, booking.id)}
                              </td>
                              <td className="border-b border-[#f3ebdf] p-4">{booking.customer_name || "-"}</td>
                              <td className="border-b border-[#f3ebdf] p-4">{formatDate(booking.pickup_date)}</td>
                              <td className="border-b border-[#f3ebdf] p-4">{entry.packageName}</td>
                              <td className="border-b border-[#f3ebdf] p-4">{participants} {t.participantUnit}</td>
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
