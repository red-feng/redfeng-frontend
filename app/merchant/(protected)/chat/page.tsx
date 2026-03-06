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
  bookings?: {
    booking_code: string | null
    payment_status: string | null
    booking_status: string | null
  } | null
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

  const roomsWithBooking = await adminSupabase
    .from("package_chat_rooms")
    .select(
      "id, package_id, customer_id, merchant_user_id, booking_id, updated_at, bookings(booking_code, payment_status, booking_status)",
    )
    .eq("merchant_user_id", user.id)
    .order("updated_at", { ascending: false })

  let allRooms: ChatRoomRow[] = []
  if (roomsWithBooking.error && roomsWithBooking.error.message.includes("booking_id")) {
    bookingLinkReady = false
    const fallback = await adminSupabase
      .from("package_chat_rooms")
      .select("id, package_id, customer_id, merchant_user_id, updated_at")
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

  return (
    <main className="min-h-screen bg-slate-100">
      <div className="mx-auto max-w-6xl px-4 py-6 md:px-6 md:py-8">
        <h1 className="text-2xl font-semibold text-slate-900">Chat Customer</h1>
        <p className="mt-1 text-sm text-slate-600">
          Kelola chat sebelum booking dan sesudah booking dalam satu inbox.
        </p>

        {roomsError && (
          <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
            Gagal memuat ruang chat: {roomsError.message}
          </div>
        )}

        {errorMessage && (
          <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
            {errorMessage}
          </div>
        )}

        <div className="mt-4 flex gap-2">
          <Link
            href="/merchant/chat?tab=pre"
            className={`rounded-full px-4 py-2 text-sm font-medium ${
              activeTab === "pre"
                ? "bg-orange-500 text-white"
                : "border border-slate-300 bg-white text-slate-700"
            }`}
          >
            Sebelum Booking
          </Link>
          <Link
            href="/merchant/chat?tab=post"
            className={`rounded-full px-4 py-2 text-sm font-medium ${
              activeTab === "post"
                ? "bg-orange-500 text-white"
                : "border border-slate-300 bg-white text-slate-700"
            }`}
          >
            Sesudah Booking
          </Link>
        </div>

        {!bookingLinkReady && (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
            Fitur "Sesudah Booking" butuh migration terbaru. Jalankan migration `add_booking_id_to_package_chat_rooms`.
          </div>
        )}

        <div className="mt-6 grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
          <aside className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">Daftar Chat</h2>
            <div className="mt-3 space-y-2">
              {rooms.length === 0 && activeTab === "pre" && (
                <p className="text-sm text-slate-500">
                  Belum ada chat customer dari halaman detail paket.
                </p>
              )}
              {rooms.length === 0 && activeTab === "post" && (
                <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-3 text-sm text-slate-600">
                  Tab ini siap digunakan. Data sesudah booking akan aktif setelah relasi booking ke room chat
                  ditambahkan.
                </div>
              )}
              {rooms.map((room) => {
                const pkg = packageMap.get(room.package_id)
                return (
                  <Link
                    key={room.id}
                    href={`/merchant/chat?tab=${activeTab}&room_id=${room.id}`}
                    className={`block rounded-lg border px-3 py-2 text-sm transition ${
                      room.id === activeRoomId
                        ? "border-orange-300 bg-orange-50 text-orange-700"
                        : "border-slate-200 text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <p className="line-clamp-2 font-medium">{pkg?.title || "Paket tidak ditemukan"}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      Customer: {room.customer_id.slice(0, 8)}...
                    </p>
                    {room.booking_id && (
                      <p className="mt-1 text-xs text-slate-500">
                        Booking: {room.bookings?.booking_code || room.booking_id}
                      </p>
                    )}
                    <p className="mt-1 text-xs text-slate-500">{room.updated_at || "-"}</p>
                  </Link>
                )
              })}
            </div>
          </aside>

          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-5 py-4">
              <p className="text-sm text-slate-500">Paket</p>
              <p className="text-base font-semibold text-slate-900">
                {activeRoom ? packageMap.get(activeRoom.package_id)?.title || "-" : "Pilih ruang chat"}
              </p>
              {activeRoom && packageMap.get(activeRoom.package_id)?.slug && (
                <Link
                  href={`/packages/${encodeURIComponent(packageMap.get(activeRoom.package_id)?.slug || "")}`}
                  className="mt-1 inline-block text-xs text-orange-600 hover:text-orange-700"
                >
                  Lihat detail paket
                </Link>
              )}
            </div>

            <div className="h-[52vh] space-y-3 overflow-y-auto px-5 py-4">
              {messages.length === 0 && (
                <p className="text-sm text-slate-500">Belum ada pesan di ruang chat ini.</p>
              )}
              {messages.map((message) => {
                const mine = message.sender_id === user.id
                return (
                  <div key={message.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${
                        mine
                          ? "bg-orange-500 text-white"
                          : "border border-slate-200 bg-slate-50 text-slate-700"
                      }`}
                    >
                      <p className="whitespace-pre-line">{message.message}</p>
                      <p className={`mt-1 text-[11px] ${mine ? "text-orange-100" : "text-slate-400"}`}>
                        {message.created_at || ""}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>

            <form action={sendMerchantChatMessage} className="border-t border-slate-200 p-4">
              <input type="hidden" name="room_id" value={activeRoomId} />
              <input type="hidden" name="tab" value={activeTab} />
              <div className="flex gap-2">
                <textarea
                  name="message"
                  required
                  disabled={!activeRoomId}
                  placeholder="Tulis balasan untuk customer..."
                  className="h-20 flex-1 rounded-xl border border-slate-300 p-3 text-sm outline-none ring-orange-500 focus:ring-2 disabled:cursor-not-allowed disabled:bg-slate-100"
                />
                <button
                  type="submit"
                  disabled={!activeRoomId}
                  className="self-end rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  Kirim
                </button>
              </div>
            </form>
          </section>
        </div>
      </div>
    </main>
  )
}
