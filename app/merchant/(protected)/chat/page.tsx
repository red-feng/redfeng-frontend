import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { sendMerchantChatMessage } from "./actions"

type ChatRoomRow = {
  id: string
  package_id: string
  customer_id: string
  merchant_user_id: string
  booking_id?: string | null
  updated_at: string | null
  last_message_at?: string | null
  last_message_sender_id?: string | null
  merchant_last_read_at?: string | null
  bookings?:
    | {
        booking_code: string | null
        payment_status: string | null
        booking_status: string | null
        customer_name?: string | null
      }
    | {
        booking_code: string | null
        payment_status: string | null
        booking_status: string | null
        customer_name?: string | null
      }[]
    | null
}

type ChatMessageRow = {
  id: string
  room_id: string
  sender_id: string
  message: string
  created_at: string | null
}

type PackageRow = {
  id: string
  title: string | null
  slug: string | null
}

type MerchantChatParams = {
  tab?: string
  room_id?: string
  error?: string
}

function getBookingInfo(room: ChatRoomRow) {
  if (Array.isArray(room.bookings)) return room.bookings[0] || null
  return room.bookings || null
}

function getCustomerLabel(room: ChatRoomRow) {
  const booking = getBookingInfo(room)
  if (booking?.customer_name) return booking.customer_name
  return `Customer ${room.customer_id.slice(0, 8)}`
}

function formatDateTime(dateStr: string | null) {
  if (!dateStr) return "-"
  const date = new Date(dateStr)
  if (Number.isNaN(date.getTime())) return dateStr
  return date.toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export const dynamic = "force-dynamic"

export default async function MerchantChatPage({
  searchParams,
}: {
  searchParams: Promise<MerchantChatParams>
}) {
  const params = await searchParams
  const activeTab = params.tab === "post" ? "post" : "pre"
  const requestedRoomId = params.room_id || ""
  const errorMessage = params.error || ""

  const supabase = await createClient()
  const adminSupabase = createAdminClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  let roomsError: { message: string } | null = null
  let bookingLinkReady = true
  let readTrackingReady = true

  const roomsWithBooking = await adminSupabase
    .from("package_chat_rooms")
    .select(
      "id, package_id, customer_id, merchant_user_id, booking_id, updated_at, last_message_at, last_message_sender_id, merchant_last_read_at, bookings(booking_code, payment_status, booking_status, customer_name)",
    )
    .eq("merchant_user_id", user.id)
    .order("updated_at", { ascending: false })

  let allRooms: ChatRoomRow[] = []
  if (roomsWithBooking.error) {
    if (roomsWithBooking.error.message.includes("booking_id")) {
      bookingLinkReady = false
    }
    if (
      roomsWithBooking.error.message.includes("last_message") ||
      roomsWithBooking.error.message.includes("merchant_last_read_at")
    ) {
      readTrackingReady = false
    }
    const fallback = await adminSupabase
      .from("package_chat_rooms")
      .select(
        "id, package_id, customer_id, merchant_user_id, updated_at, last_message_at, last_message_sender_id, merchant_last_read_at",
      )
      .eq("merchant_user_id", user.id)
      .order("updated_at", { ascending: false })
    allRooms = (fallback.data as ChatRoomRow[] | null) || []
    roomsError = fallback.error
  } else {
    allRooms = (roomsWithBooking.data as ChatRoomRow[] | null) || []
    roomsError = roomsWithBooking.error
  }

  const preBookingRooms = allRooms.filter((room) => !room.booking_id)
  const postBookingRooms = allRooms.filter((room) => Boolean(room.booking_id))
  const rooms = activeTab === "post" ? postBookingRooms : preBookingRooms
  const activeRoomId = requestedRoomId || rooms[0]?.id || ""
  const activeRoom = rooms.find((room) => room.id === activeRoomId) || null

  if (
    activeRoom &&
    activeRoom.last_message_sender_id &&
    activeRoom.last_message_sender_id !== user.id &&
    (!activeRoom.merchant_last_read_at ||
      (activeRoom.last_message_at || "") > activeRoom.merchant_last_read_at)
  ) {
    const readIso = new Date().toISOString()
    const { error: markReadError } = await adminSupabase
      .from("package_chat_rooms")
      .update({ merchant_last_read_at: readIso })
      .eq("id", activeRoom.id)
    if (!markReadError) {
      activeRoom.merchant_last_read_at = readIso
    }
  }

  const packageIds = [...new Set(rooms.map((room) => room.package_id))]
  const { data: packageRows } = packageIds.length
    ? await adminSupabase.from("packages").select("id, title, slug").in("id", packageIds)
    : { data: [] as PackageRow[] }
  const packageMap = new Map((packageRows || []).map((pkg: PackageRow) => [pkg.id, pkg]))

  const { data: messagesData } = activeRoomId
    ? await adminSupabase
        .from("package_chat_messages")
        .select("id, room_id, sender_id, message, created_at")
        .eq("room_id", activeRoomId)
        .order("created_at", { ascending: true })
    : { data: [] as ChatMessageRow[] }
  const messages = (messagesData as ChatMessageRow[] | null) || []

  const unreadCount = rooms.filter((room) => {
    if (!room.last_message_sender_id || room.last_message_sender_id === user.id) return false
    if (!room.last_message_at) return false
    if (!room.merchant_last_read_at) return true
    return room.last_message_at > room.merchant_last_read_at
  }).length

  const metricCards = [
    {
      label: activeTab === "post" ? "Chat sesudah booking" : "Chat sebelum booking",
      value: String(rooms.length),
      note: "Total room pada tab aktif",
    },
    {
      label: "Chat baru",
      value: String(unreadCount),
      note: "Belum dibaca merchant",
    },
    {
      label: "Pesan dalam room aktif",
      value: String(messages.length),
      note: activeRoom ? "Percakapan saat ini" : "Pilih room untuk melihat isi",
    },
  ]

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fff8f1_0%,#f7f1e8_38%,#f3eee7_100%)] p-6 md:p-10">
      <section className="overflow-hidden rounded-[34px] border border-orange-100 bg-[linear-gradient(135deg,#983108_0%,#f76707_52%,#ffb357_100%)] text-white shadow-[0_28px_80px_rgba(194,65,12,0.24)]">
        <div className="grid gap-6 px-7 py-8 lg:grid-cols-[minmax(0,1.4fr)_420px] lg:px-10 lg:py-10">
          <div>
            <div className="inline-flex rounded-full border border-white/25 bg-white/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-white/90">
              Merchant Inbox
            </div>
            <h1 className="mt-5 max-w-3xl text-4xl font-semibold leading-[1.05] tracking-[-0.04em] text-white md:text-5xl">
              Percakapan customer yang siap ditangani dalam satu command center.
            </h1>
            <p className="mt-5 max-w-3xl text-sm leading-7 text-white/90 md:text-base">
              Kelola pertanyaan sebelum booking, follow-up sesudah pembayaran, dan jaga response time
              merchant dengan inbox yang lebih rapi dan lebih siap untuk operasional OTA.
            </p>
          </div>

          <div className="grid gap-4">
            <div className="rounded-[28px] border border-white/30 bg-white/12 p-5 backdrop-blur-sm">
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-white/75">Business Snapshot</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
                {metricCards.map((card) => (
                  <div key={card.label} className="rounded-[20px] border border-white/20 bg-white/10 px-4 py-3">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/70">{card.label}</p>
                    <p className="mt-2 text-2xl font-semibold text-white">{card.value}</p>
                    <p className="mt-1 text-xs leading-5 text-white/70">{card.note}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[28px] border border-white/30 bg-white/10 p-5 backdrop-blur-sm">
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-white/75">Inbox Lens</p>
              <p className="mt-3 text-sm leading-6 text-white/90">
                Gunakan tab untuk memisahkan lead pre-booking dan percakapan yang sudah terkait transaksi.
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <Link
                  href="/merchant/chat?tab=pre"
                  className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                    activeTab === "pre"
                      ? "border-white bg-white text-orange-700"
                      : "border-white/30 bg-white/10 text-white hover:bg-white/15"
                  }`}
                >
                  Sebelum Booking
                </Link>
                <Link
                  href="/merchant/chat?tab=post"
                  className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                    activeTab === "post"
                      ? "border-white bg-white text-orange-700"
                      : "border-white/30 bg-white/10 text-white hover:bg-white/15"
                  }`}
                >
                  Sesudah Booking
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {roomsError && (
        <div className="mt-6 rounded-[24px] border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
          Gagal memuat ruang chat: {roomsError.message}
        </div>
      )}

      {errorMessage && (
        <div className="mt-4 rounded-[24px] border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
          {errorMessage}
        </div>
      )}

      {!bookingLinkReady && (
        <div className="mt-4 rounded-[24px] border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-700">
          Fitur tab sesudah booking membutuhkan migration `20260306_add_booking_id_to_package_chat_rooms.sql`.
        </div>
      )}

      {!readTrackingReady && (
        <div className="mt-4 rounded-[24px] border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-700">
          Badge chat baru membutuhkan migration `20260307_add_read_tracking_to_package_chat_rooms.sql`.
        </div>
      )}

      <section className="mt-8 rounded-[32px] border border-[#f3dbc3] bg-white/80 p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur-sm lg:p-7">
        <div className="grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
          <aside className="rounded-[28px] border border-[#f3dbc3] bg-[#fffaf3] p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-orange-500">Customer Rooms</p>
                <h2 className="mt-2 text-lg font-semibold text-slate-950">Daftar percakapan</h2>
              </div>
              {unreadCount > 0 && (
                <span className="rounded-full bg-orange-600 px-3 py-1 text-xs font-semibold text-white">{unreadCount} baru</span>
              )}
            </div>

            <div className="mt-4 space-y-3">
              {rooms.length === 0 && activeTab === "pre" && (
                <div className="rounded-[22px] border border-[#eadfce] bg-white px-4 py-4 text-sm leading-6 text-slate-600">
                  Belum ada chat customer dari halaman detail paket.
                </div>
              )}
              {rooms.length === 0 && activeTab === "post" && (
                <div className="rounded-[22px] border border-dashed border-[#e3d4be] bg-white px-4 py-4 text-sm leading-6 text-slate-600">
                  Tab ini siap digunakan. Percakapan booking akan muncul begitu room terhubung ke transaksi.
                </div>
              )}

              {rooms.map((room) => {
                const pkg = packageMap.get(room.package_id)
                const booking = getBookingInfo(room)
                const hasUnread =
                  room.last_message_sender_id &&
                  room.last_message_sender_id !== user.id &&
                  (!room.merchant_last_read_at ||
                    (room.last_message_at || "") > room.merchant_last_read_at)

                return (
                  <div
                    key={room.id}
                    className={`rounded-[22px] border px-4 py-4 transition ${
                      room.id === activeRoomId
                        ? "border-orange-200 bg-[linear-gradient(135deg,#fff3e8_0%,#ffffff_100%)] shadow-sm"
                        : "border-[#eadfce] bg-white hover:border-orange-200 hover:bg-[#fffdf9]"
                    }`}
                  >
                    <Link href={`/merchant/chat?tab=${activeTab}&room_id=${room.id}`} className="block">
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-sm font-semibold text-slate-950">{getCustomerLabel(room)}</p>
                        {hasUnread && (
                          <span className="rounded-full bg-orange-600 px-2.5 py-1 text-[10px] font-semibold text-white">
                            Baru
                          </span>
                        )}
                      </div>
                      <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600">
                        Paket: {pkg?.title || "Paket tidak ditemukan"}
                      </p>
                      {room.booking_id && (
                        <p className="mt-2 text-xs font-medium text-emerald-700">
                          Booking: {booking?.booking_code || room.booking_id}
                        </p>
                      )}
                      <p className="mt-2 text-xs text-slate-500">
                        Update terakhir: {formatDateTime(room.last_message_at || room.updated_at)}
                      </p>
                    </Link>
                    {pkg?.slug && (
                      <Link
                        href={`/packages/${encodeURIComponent(pkg.slug)}`}
                        className="mt-3 inline-flex text-xs font-semibold text-orange-600 transition hover:text-orange-700"
                      >
                        Lihat paket
                      </Link>
                    )}
                  </div>
                )
              })}
            </div>
          </aside>

          <section className="overflow-hidden rounded-[28px] border border-[#f3dbc3] bg-white">
            <div className="border-b border-[#efe3d1] bg-[linear-gradient(180deg,#fff9f2_0%,#fffefc_100%)] px-5 py-5 lg:px-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="max-w-3xl">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-orange-500">Conversation Focus</p>
                  <p className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-slate-950">
                    {activeRoom ? getCustomerLabel(activeRoom) : "Pilih ruang chat"}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {activeRoom ? packageMap.get(activeRoom.package_id)?.title || "-" : "Pilih room untuk melihat isi percakapan merchant."}
                  </p>
                  {activeRoom && packageMap.get(activeRoom.package_id)?.slug && (
                    <Link
                      href={`/packages/${encodeURIComponent(packageMap.get(activeRoom.package_id)?.slug || "")}`}
                      className="mt-3 inline-flex text-xs font-semibold text-orange-600 transition hover:text-orange-700"
                    >
                      Lihat detail paket
                    </Link>
                  )}
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-[20px] border border-[#efe3d1] bg-white px-4 py-3">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">Jenis Thread</p>
                    <p className="mt-2 text-sm font-semibold text-slate-950">
                      {activeRoom?.booking_id ? "Sesudah booking" : "Sebelum booking"}
                    </p>
                  </div>
                  <div className="rounded-[20px] border border-[#efe3d1] bg-white px-4 py-3">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">Status</p>
                    <p className="mt-2 text-sm font-semibold text-slate-950">
                      {activeRoom?.booking_id ? "Transaksi aktif" : "Lead / inquiry"}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="h-[56vh] space-y-4 overflow-y-auto bg-[#fffaf5] px-5 py-5 lg:px-6">
              {messages.length === 0 && (
                <div className="rounded-[22px] border border-[#eadfce] bg-white px-4 py-4 text-sm leading-6 text-slate-600">
                  Belum ada pesan di ruang chat ini.
                </div>
              )}

              {messages.map((message) => {
                const mine = message.sender_id === user.id
                return (
                  <div key={message.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[82%] rounded-[24px] px-4 py-3 text-sm shadow-sm ${
                        mine
                          ? "bg-[linear-gradient(135deg,#a33a0b_0%,#f76707_100%)] text-white"
                          : "border border-[#eadfce] bg-white text-slate-700"
                      }`}
                    >
                      <p className="whitespace-pre-line leading-7">{message.message}</p>
                      <p className={`mt-2 text-[11px] ${mine ? "text-white/70" : "text-slate-400"}`}>
                        {formatDateTime(message.created_at)}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>

            <form action={sendMerchantChatMessage} className="border-t border-[#efe3d1] bg-white px-5 py-4 lg:px-6">
              <input type="hidden" name="room_id" value={activeRoomId} />
              <input type="hidden" name="tab" value={activeTab} />
              <div className="flex gap-3">
                <textarea
                  name="message"
                  required
                  disabled={!activeRoomId}
                  placeholder="Tulis balasan untuk customer..."
                  className="h-24 flex-1 rounded-[22px] border border-[#e6d8c2] bg-[#fffdf9] px-4 py-3 text-sm text-slate-700 outline-none ring-orange-500 transition focus:ring-2 disabled:cursor-not-allowed disabled:bg-slate-100"
                />
                <button
                  type="submit"
                  disabled={!activeRoomId}
                  className="self-end rounded-[22px] bg-[linear-gradient(135deg,#a33a0b_0%,#f76707_100%)] px-6 py-3 text-sm font-semibold text-white shadow-[0_14px_34px_rgba(194,65,12,0.22)] transition hover:translate-y-[-1px] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
                >
                  Kirim
                </button>
              </div>
            </form>
          </section>
        </div>
      </section>
    </main>
  )
}
