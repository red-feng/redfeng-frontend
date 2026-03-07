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
    <main className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)] p-6 md:p-10">
      <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">Chat Customer</h1>
        <p className="mt-1 text-sm text-slate-500">
          Kelola pertanyaan customer dari halaman paket dan komunikasi setelah booking dalam satu inbox.
        </p>
      </section>

      {roomsError && (
        <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          Gagal memuat ruang chat: {roomsError.message}
        </div>
      )}

      {errorMessage && (
        <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {errorMessage}
        </div>
      )}

      {!bookingLinkReady && (
        <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
          Fitur tab sesudah booking membutuhkan migration `20260306_add_booking_id_to_package_chat_rooms.sql`.
        </div>
      )}

      {!readTrackingReady && (
        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
          Badge chat baru membutuhkan migration `20260307_add_read_tracking_to_package_chat_rooms.sql`.
        </div>
      )}

      <section className="mt-6 grid gap-4 md:grid-cols-3">
        {metricCards.map((card) => (
          <div key={card.label} className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">{card.label}</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">{card.value}</p>
            <p className="mt-2 text-xs text-slate-500">{card.note}</p>
          </div>
        ))}
      </section>

      <section className="mt-8 rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap gap-3">
          <Link
            href="/merchant/chat?tab=pre"
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${
              activeTab === "pre"
                ? "bg-slate-900 text-white"
                : "border border-slate-300 bg-white text-slate-700 hover:border-orange-300 hover:text-orange-600"
            }`}
          >
            Sebelum Booking
          </Link>
          <Link
            href="/merchant/chat?tab=post"
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${
              activeTab === "post"
                ? "bg-slate-900 text-white"
                : "border border-slate-300 bg-white text-slate-700 hover:border-orange-300 hover:text-orange-600"
            }`}
          >
            Sesudah Booking
          </Link>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="rounded-[24px] border border-slate-200 bg-slate-50/60 p-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-slate-900">Daftar Chat</h2>
              {unreadCount > 0 && (
                <span className="rounded-full bg-rose-500 px-2.5 py-1 text-xs font-semibold text-white">
                  {unreadCount}
                </span>
              )}
            </div>
            <div className="mt-4 space-y-3">
              {rooms.length === 0 && activeTab === "pre" && (
                <div className="rounded-[20px] border border-slate-200 bg-white p-4 text-sm text-slate-600">
                  Belum ada chat customer dari halaman detail paket.
                </div>
              )}
              {rooms.length === 0 && activeTab === "post" && (
                <div className="rounded-[20px] border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-600">
                  Tab ini siap digunakan. Data sesudah booking akan muncul setelah room chat terhubung ke booking.
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
                    className={`rounded-[20px] border px-4 py-3 transition ${
                      room.id === activeRoomId
                        ? "border-orange-300 bg-orange-50"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                  >
                    <Link href={`/merchant/chat?tab=${activeTab}&room_id=${room.id}`} className="block">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-medium text-slate-900">{getCustomerLabel(room)}</p>
                        {hasUnread && (
                          <span className="rounded-full bg-rose-500 px-2 py-0.5 text-[10px] font-semibold text-white">
                            Baru
                          </span>
                        )}
                      </div>
                      <p className="mt-1 line-clamp-2 text-xs text-slate-600">
                        Paket: {pkg?.title || "Paket tidak ditemukan"}
                      </p>
                      {room.booking_id && (
                        <p className="mt-2 text-[11px] text-emerald-700">
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
                        className="mt-2 inline-block text-xs font-medium text-orange-600 hover:text-orange-700"
                      >
                        Lihat paket
                      </Link>
                    )}
                  </div>
                )
              })}
            </div>
          </aside>

          <section className="overflow-hidden rounded-[24px] border border-slate-200 bg-white">
            <div className="border-b border-slate-200 px-5 py-4">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Customer</p>
                  <p className="mt-1 text-lg font-semibold text-slate-900">
                    {activeRoom ? getCustomerLabel(activeRoom) : "Pilih ruang chat"}
                  </p>
                  <p className="mt-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Paket</p>
                  <p className="mt-1 text-base font-medium text-slate-900">
                    {activeRoom ? packageMap.get(activeRoom.package_id)?.title || "-" : "Pilih ruang chat"}
                  </p>
                  {activeRoom && packageMap.get(activeRoom.package_id)?.slug && (
                    <Link
                      href={`/packages/${encodeURIComponent(packageMap.get(activeRoom.package_id)?.slug || "")}`}
                      className="mt-2 inline-block text-xs font-medium text-orange-600 hover:text-orange-700"
                    >
                      Lihat detail paket
                    </Link>
                  )}
                </div>
                {activeRoom?.booking_id && (
                  <div className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                    Thread booking aktif
                  </div>
                )}
              </div>
            </div>

            <div className="h-[56vh] space-y-3 overflow-y-auto bg-slate-50/50 px-5 py-4">
              {messages.length === 0 && (
                <div className="rounded-[20px] border border-slate-200 bg-white p-4 text-sm text-slate-600">
                  Belum ada pesan di ruang chat ini.
                </div>
              )}
              {messages.map((message) => {
                const mine = message.sender_id === user.id
                return (
                  <div key={message.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[80%] rounded-[20px] px-4 py-3 text-sm shadow-sm ${
                        mine
                          ? "bg-slate-900 text-white"
                          : "border border-slate-200 bg-white text-slate-700"
                      }`}
                    >
                      <p className="whitespace-pre-line leading-6">{message.message}</p>
                      <p className={`mt-2 text-[11px] ${mine ? "text-slate-300" : "text-slate-400"}`}>
                        {formatDateTime(message.created_at)}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>

            <form action={sendMerchantChatMessage} className="border-t border-slate-200 bg-white p-4">
              <input type="hidden" name="room_id" value={activeRoomId} />
              <input type="hidden" name="tab" value={activeTab} />
              <div className="flex gap-3">
                <textarea
                  name="message"
                  required
                  disabled={!activeRoomId}
                  placeholder="Tulis balasan untuk customer..."
                  className="h-24 flex-1 rounded-[20px] border border-slate-300 bg-white p-3 text-sm outline-none ring-orange-500 transition focus:ring-2 disabled:cursor-not-allowed disabled:bg-slate-100"
                />
                <button
                  type="submit"
                  disabled={!activeRoomId}
                  className="self-end rounded-[20px] bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
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
