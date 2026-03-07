import Link from "next/link"
import { createClient } from "@/lib/supabase/server"

type MerchantRow = {
  id: string
  brand_name: string | null
  company_name: string | null
}

type PackageRow = {
  id: string
  status: string | null
}

type BookingRow = {
  id: string
  total_amount: number | null
  payment_status: string | null
  booking_status: string | null
}

type ChatRoomRow = {
  last_message_at: string | null
  last_message_sender_id: string | null
  merchant_last_read_at: string | null
}

type ReviewRow = {
  rating: number | null
}

function normalizeStatus(value: string | null) {
  return (value || "").trim().toLowerCase()
}

function formatMoney(value: number) {
  return `Rp ${value.toLocaleString("id-ID")}`
}

const merchantMenus = [
  { label: "Kelola Paket", href: "/merchant/paket" },
  { label: "Pesanan", href: "/merchant/pesanan" },
  { label: "Chat Customer", href: "/merchant/chat" },
  { label: "Kalender Booking", href: "/merchant/kalender-booking" },
  { label: "Statistik", href: "/merchant/statistik" },
  { label: "Saldo & Payout", href: "/merchant/saldo-payout" },
  { label: "Review", href: "/merchant/review" },
  { label: "Profil Merchant", href: "/merchant/profil" },
]

export default async function MerchantDashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data: merchantData } = await supabase
    .from("merchants")
    .select("id, brand_name, company_name")
    .eq("user_id", user.id)
    .single()

  const merchant = merchantData as MerchantRow | null
  if (!merchant) return <div className="p-10">Merchant belum terdaftar.</div>

  const [{ data: packagesData }, { data: bookingsData }, { data: chatRoomsData }] = await Promise.all([
    supabase.from("packages").select("id, status").eq("merchant_id", merchant.id),
    supabase
      .from("bookings")
      .select("id, total_amount, payment_status, booking_status, packages!inner(merchant_id)")
      .eq("packages.merchant_id", merchant.id),
    supabase
      .from("package_chat_rooms")
      .select("last_message_at, last_message_sender_id, merchant_last_read_at")
      .eq("merchant_user_id", user.id),
  ])

  const reviewsResult = await supabase
    .from("package_reviews")
    .select("rating, packages!inner(merchant_id)")
    .eq("packages.merchant_id", merchant.id)

  const packages = (packagesData as PackageRow[] | null) || []
  const bookings = (bookingsData as BookingRow[] | null) || []
  const chatRooms = (chatRoomsData as ChatRoomRow[] | null) || []
  const reviews = (reviewsResult.data as ReviewRow[] | null) || []

  const totalPackages = packages.length
  const activePackages = packages.filter((pkg) => normalizeStatus(pkg.status) === "approved").length
  const draftPackages = packages.filter((pkg) => normalizeStatus(pkg.status) === "draft").length
  const pendingPackages = packages.filter((pkg) => normalizeStatus(pkg.status) === "pending").length

  const totalBookings = bookings.length
  const paidBookings = bookings.filter((booking) => normalizeStatus(booking.payment_status) === "paid")
  const monthlyRevenue = paidBookings.reduce((sum, booking) => sum + (booking.total_amount ?? 0), 0)
  const pendingPayments = bookings.filter((booking) => normalizeStatus(booking.payment_status) === "pending").length
  const unreadChats = chatRooms.filter((room) => {
    if (!room.last_message_sender_id || room.last_message_sender_id === user.id) return false
    if (!room.last_message_at) return false
    if (!room.merchant_last_read_at) return true
    return room.last_message_at > room.merchant_last_read_at
  }).length

  const averageRating =
    reviews.length > 0
      ? (reviews.reduce((sum, review) => sum + (review.rating ?? 0), 0) / reviews.length).toFixed(1)
      : "-"

  const spotlightCards = [
    { label: "Total Paket", value: String(totalPackages), note: `${activePackages} aktif • ${draftPackages} draft` },
    { label: "Total Booking", value: String(totalBookings), note: `${pendingPayments} menunggu pembayaran` },
    { label: "Revenue", value: formatMoney(monthlyRevenue), note: `${paidBookings.length} booking terbayar` },
    { label: "Rating", value: averageRating, note: `${reviews.length} review customer` },
  ]

  const menuMeta: Record<string, string> = {
    "Kelola Paket": `${activePackages} aktif • ${pendingPackages} pending review`,
    Pesanan: `${totalBookings} total booking`,
    "Chat Customer": unreadChats > 0 ? `${unreadChats} chat baru` : "Inbox customer",
    "Kalender Booking": "Jadwal trip & kapasitas peserta",
    Statistik: "Revenue, top paket, conversion",
    "Saldo & Payout": "Saldo tersedia & pending payout",
    Review: reviews.length > 0 ? `${reviews.length} ulasan masuk` : "Rating & komentar customer",
    "Profil Merchant": merchant.company_name || "Profil bisnis merchant",
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f6f7fb_0%,#eef2f7_100%)] p-6 md:p-10">
      <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-[radial-gradient(circle_at_top_left,#fff7ed,transparent_30%),linear-gradient(135deg,#0f172a,#1e293b)] p-8 text-white shadow-[0_24px_60px_rgba(15,23,42,0.18)]">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-orange-200">Merchant Command Center</p>
        <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-3xl font-semibold md:text-4xl">
              {merchant.brand_name || merchant.company_name || "Merchant Dashboard"}
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-300 md:text-base">
              Pantau paket, booking, revenue, chat customer, dan kualitas layanan dalam satu dashboard merchant.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 backdrop-blur">
              <p className="text-xs uppercase tracking-wide text-slate-300">Chat Baru</p>
              <p className="mt-1 text-2xl font-bold">{unreadChats}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 backdrop-blur">
              <p className="text-xs uppercase tracking-wide text-slate-300">Pending Review</p>
              <p className="mt-1 text-2xl font-bold">{pendingPackages}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 backdrop-blur">
              <p className="text-xs uppercase tracking-wide text-slate-300">Paid Booking</p>
              <p className="mt-1 text-2xl font-bold">{paidBookings.length}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {spotlightCards.map((card) => (
          <div key={card.label} className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">{card.label}</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">{card.value}</p>
            <p className="mt-2 text-xs text-slate-500">{card.note}</p>
          </div>
        ))}
      </section>

      <section className="mt-8 rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-5 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Merchant Tools</h2>
            <p className="text-sm text-slate-500">Akses cepat ke seluruh area operasional merchant.</p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {merchantMenus.map((menu) => (
            <Link
              key={menu.label}
              href={menu.href}
              className="group rounded-[24px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-orange-300 hover:shadow-lg"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-semibold text-slate-900">{menu.label}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-500">{menuMeta[menu.label]}</p>
                </div>
                {menu.label === "Chat Customer" && unreadChats > 0 && (
                  <span className="rounded-full bg-rose-500 px-2.5 py-1 text-xs font-semibold text-white">
                    {unreadChats}
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}
