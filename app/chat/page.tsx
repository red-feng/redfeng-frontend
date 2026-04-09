import Link from "next/link"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getCurrentLocale } from "@/lib/locale"
import { dictionaries } from "@/lib/i18n"
import { isImageAttachment } from "@/lib/chat/attachments"
import { sendChatMessage } from "./actions"

type ChatRoomRow = {
  id: string
  package_id: string
  customer_id: string
  merchant_user_id: string
  booking_id?: string | null
  updated_at: string | null
  last_message_at?: string | null
  last_message_sender_id?: string | null
  customer_last_read_at?: string | null
}

type ChatMessageRow = {
  id: string
  room_id: string
  sender_id: string
  message: string
  attachment_url?: string | null
  attachment_name?: string | null
  attachment_mime_type?: string | null
  created_at: string | null
}

type PackageRow = {
  id: string
  title: string | null
  slug: string | null
  merchant_id: string | null
}

export const dynamic = "force-dynamic"

export default async function ChatPage({
  searchParams,
}: {
  searchParams: Promise<{ room_id?: string; package_id?: string; booking_id?: string; error?: string }>
}) {
  const params = await searchParams
  const locale = await getCurrentLocale()
  const t = dictionaries[locale].chat
  const roomId = params.room_id || ""
  const packageId = params.package_id || ""
  const bookingId = params.booking_id || ""
  const errorMessage = params.error || ""

  const supabase = await createClient()
  const adminSupabase = createAdminClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const { data: merchantMe } = await adminSupabase
    .from("merchants")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle()
  const isMerchant = !!merchantMe

  let activeRoomId = roomId
  let activePackage: PackageRow | null = null
  const chatMode = bookingId ? "post" : "pre"

  if (!isMerchant && bookingId) {
    const { data: booking } = await adminSupabase
      .from("bookings")
      .select("id, package_id, customer_email")
      .eq("id", bookingId)
      .single()

    if (booking?.package_id && user.email && booking.customer_email === user.email) {
      const { data: pkg } = await adminSupabase
        .from("packages")
        .select("id, title, slug, merchant_id")
        .eq("id", booking.package_id)
        .single()
      activePackage = (pkg as PackageRow | null) || null

      if (activePackage?.merchant_id) {
        const { data: merchantOwner } = await adminSupabase
          .from("merchants")
          .select("user_id")
          .eq("id", activePackage.merchant_id)
          .single()

        if (merchantOwner?.user_id) {
          const { data: existingRoom } = await adminSupabase
            .from("package_chat_rooms")
            .select("id")
            .eq("booking_id", bookingId)
            .eq("customer_id", user.id)
            .eq("merchant_user_id", merchantOwner.user_id)
            .maybeSingle()

          if (existingRoom?.id) {
            activeRoomId = existingRoom.id
          }
        }
      }
    }
  }

  if (!isMerchant && packageId && !bookingId) {
    const { data: pkg } = await adminSupabase
      .from("packages")
      .select("id, title, slug, merchant_id")
      .eq("id", packageId)
      .single()
    activePackage = (pkg as PackageRow | null) || null

    if (activePackage?.merchant_id) {
      const { data: merchantOwner } = await adminSupabase
        .from("merchants")
        .select("user_id")
        .eq("id", activePackage.merchant_id)
        .single()

      if (merchantOwner?.user_id) {
        const { data: existingRoom } = await adminSupabase
          .from("package_chat_rooms")
          .select("id")
          .eq("package_id", packageId)
          .eq("customer_id", user.id)
          .eq("merchant_user_id", merchantOwner.user_id)
          .is("booking_id", null)
          .maybeSingle()

        if (existingRoom?.id) {
          activeRoomId = existingRoom.id
        } else {
          const nowIso = new Date().toISOString()
          let { data: newRoom, error: createRoomError } = await adminSupabase
            .from("package_chat_rooms")
            .insert({
              package_id: packageId,
              customer_id: user.id,
              merchant_user_id: merchantOwner.user_id,
              customer_last_read_at: nowIso,
            })
            .select("id")
            .single()

          if (createRoomError && createRoomError.message.includes("customer_last_read_at")) {
            const fallbackRoom = await adminSupabase
              .from("package_chat_rooms")
              .insert({
                package_id: packageId,
                customer_id: user.id,
                merchant_user_id: merchantOwner.user_id,
              })
              .select("id")
              .single()
            newRoom = fallbackRoom.data
            createRoomError = fallbackRoom.error
          }

          if (createRoomError) {
            const msg = createRoomError.message.includes("does not exist")
              ? t.migrationMissing
              : `${t.createRoomFailed}: ${createRoomError.message}`
            return (
              <main className="mx-auto max-w-3xl p-6">
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                  {msg}
                </div>
              </main>
            )
          }

          if (!newRoom?.id) {
            return (
              <main className="mx-auto max-w-3xl p-6">
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                  {t.createRoomFailed}
                </div>
              </main>
            )
          }

          activeRoomId = newRoom.id
        }
      }
    }
  }

  let roomsData: ChatRoomRow[] | null = null
  let roomsError: { message: string } | null = null

  const roomQuery = adminSupabase
    .from("package_chat_rooms")
    .select(
      "id, package_id, customer_id, merchant_user_id, booking_id, updated_at, last_message_at, last_message_sender_id, customer_last_read_at",
    )
    .order("updated_at", { ascending: false })

  const roomResult = isMerchant
    ? await roomQuery.eq("merchant_user_id", user.id)
    : chatMode === "post"
      ? await roomQuery.eq("customer_id", user.id).not("booking_id", "is", null)
      : await roomQuery.eq("customer_id", user.id).is("booking_id", null)

  if (roomResult.error && roomResult.error.message.includes("last_message")) {
    const fallbackQuery = adminSupabase
      .from("package_chat_rooms")
      .select("id, package_id, customer_id, merchant_user_id, booking_id, updated_at")
      .order("updated_at", { ascending: false })
    const fallbackResult = isMerchant
      ? await fallbackQuery.eq("merchant_user_id", user.id)
      : chatMode === "post"
        ? await fallbackQuery.eq("customer_id", user.id).not("booking_id", "is", null)
        : await fallbackQuery.eq("customer_id", user.id).is("booking_id", null)
    roomsData = fallbackResult.data as ChatRoomRow[] | null
    roomsError = fallbackResult.error
  } else {
    roomsData = roomResult.data as ChatRoomRow[] | null
    roomsError = roomResult.error
  }

  if (roomsError) {
    const msg = roomsError.message.includes("does not exist")
      ? t.migrationMissing
      : `${t.loadRoomsFailed}: ${roomsError.message}`
    return (
      <main className="mx-auto max-w-3xl p-6">
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {msg}
        </div>
      </main>
    )
  }

  const rooms = roomsData || []

  if (!activeRoomId && rooms.length > 0) {
    activeRoomId = rooms[0].id
  }

  const activeRoom = rooms.find((room) => room.id === activeRoomId) || null

  if (
    activeRoom &&
    activeRoom.last_message_sender_id &&
    activeRoom.last_message_sender_id !== user.id &&
    (!activeRoom.customer_last_read_at ||
      (activeRoom.last_message_at || "") > activeRoom.customer_last_read_at)
  ) {
    const readIso = new Date().toISOString()
    const { error: markReadError } = await adminSupabase
      .from("package_chat_rooms")
      .update({ customer_last_read_at: readIso })
      .eq("id", activeRoom.id)
    if (!markReadError) {
      activeRoom.customer_last_read_at = readIso
    }
  }

  const packageIds = [...new Set(rooms.map((room) => room.package_id))]
  const { data: packageRows } = packageIds.length
    ? await adminSupabase
        .from("packages")
        .select("id, title, slug, merchant_id")
        .in("id", packageIds)
    : { data: [] as PackageRow[] }
  const packageMap = new Map((packageRows || []).map((p: PackageRow) => [p.id, p]))

  const { data: messagesData, error: messagesError } = activeRoomId
    ? await adminSupabase
        .from("package_chat_messages")
        .select("id, room_id, sender_id, message, attachment_url, attachment_name, attachment_mime_type, created_at")
        .eq("room_id", activeRoomId)
        .order("created_at", { ascending: true })
    : { data: [], error: null }

  if (messagesError) {
    const msg = messagesError.message.includes("does not exist")
      ? t.migrationMissing
      : `${t.loadMessagesFailed}: ${messagesError.message}`
    return (
      <main className="mx-auto max-w-3xl p-6">
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {msg}
        </div>
      </main>
    )
  }

  const messages = (messagesData as ChatMessageRow[] | null) || []
  const activePackageForRoom = activeRoom ? packageMap.get(activeRoom.package_id) : null
  const draftPackageId = activePackageForRoom?.id || activePackage?.id || packageId
  const draftBookingId = activeRoom?.booking_id || bookingId

  const unreadCount = rooms.filter((room) => {
    if (!room.last_message_sender_id || room.last_message_sender_id === user.id) return false
    if (!room.last_message_at) return false
    if (!room.customer_last_read_at) return true
    return room.last_message_at > room.customer_last_read_at
  }).length

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)] p-6 md:p-10">
      <div className="mx-auto max-w-6xl">
        <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-bold text-slate-900">{t.title}</h1>
          <p className="mt-1 text-sm text-slate-500">{isMerchant ? t.merchantInbox : t.customerInbox}</p>
        </section>

        {errorMessage && (
          <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
            {errorMessage}
          </div>
        )}

        <section className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">{t.chatRooms}</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">{rooms.length}</p>
            <p className="mt-2 text-xs text-slate-500">Total percakapan aktif</p>
          </div>
          <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Chat Baru</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">{unreadCount}</p>
            <p className="mt-2 text-xs text-slate-500">Belum dibaca</p>
          </div>
          <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">{t.packageLabel}</p>
            <p className="mt-2 text-xl font-bold text-slate-900">
              {activePackageForRoom?.title || activePackage?.title || t.selectRoom}
            </p>
            <p className="mt-2 text-xs text-slate-500">Room aktif saat ini</p>
          </div>
        </section>

        <section className="mt-8 rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
            <aside className="rounded-[24px] border border-slate-200 bg-slate-50/60 p-4">
              <h2 className="text-sm font-semibold text-slate-900">{t.chatRooms}</h2>
              <div className="mt-4 space-y-3">
                {rooms.length === 0 && (
                  <div className="rounded-[20px] border border-slate-200 bg-white p-4 text-sm text-slate-500">
                    {t.noChats}
                  </div>
                )}
                {rooms.map((room) => {
                  const pkg = packageMap.get(room.package_id)
                  const hasUnread =
                    room.last_message_sender_id &&
                    room.last_message_sender_id !== user.id &&
                    (!room.customer_last_read_at ||
                      (room.last_message_at || "") > room.customer_last_read_at)
                  return (
                    <Link
                      key={room.id}
                      href={
                        room.booking_id
                          ? `/chat?booking_id=${room.booking_id}&room_id=${room.id}`
                          : `/chat?room_id=${room.id}`
                      }
                      className={`block rounded-[20px] border px-4 py-3 text-sm transition ${
                        room.id === activeRoomId
                          ? "border-orange-300 bg-orange-50 text-orange-700"
                          : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="line-clamp-2 font-medium">{pkg?.title || t.packageFallback}</p>
                        {hasUnread && (
                          <span className="rounded-full bg-rose-500 px-2 py-0.5 text-[10px] font-semibold text-white">
                            Baru
                          </span>
                        )}
                      </div>
                      <p className="mt-2 text-xs text-slate-500">{room.updated_at || "-"}</p>
                    </Link>
                  )
                })}
              </div>
          </aside>

          <section className="overflow-hidden rounded-[24px] border border-slate-200 bg-white">
            <div className="border-b border-slate-200 px-5 py-4">
              <p className="text-sm text-slate-500">{t.packageLabel}</p>
              <p className="text-base font-semibold text-slate-900">
                {activePackageForRoom?.title || activePackage?.title || t.selectRoom}
              </p>
              {(activePackageForRoom?.slug || activePackage?.slug) && (
                <Link
                  href={`/packages/${encodeURIComponent(activePackageForRoom?.slug || activePackage?.slug || "")}`}
                  className="mt-1 inline-block text-xs text-orange-600 hover:text-orange-700"
                >
                  {t.viewPackageDetail}
                </Link>
              )}
            </div>

            <div className="h-[56vh] space-y-3 overflow-y-auto bg-slate-50/50 px-5 py-4">
              {messages.length === 0 && (
                <div className="rounded-[20px] border border-slate-200 bg-white p-4 text-sm text-slate-500">
                  {t.noMessages}
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
                      {message.message ? (
                        <p className="whitespace-pre-line leading-6">{message.message}</p>
                      ) : null}
                      {message.attachment_url ? (
                        <div className={message.message ? "mt-3" : ""}>
                          {isImageAttachment(message.attachment_mime_type) ? (
                            <a
                              href={message.attachment_url}
                              target="_blank"
                              rel="noreferrer"
                              className="block overflow-hidden rounded-[18px] border border-white/20 bg-white/10"
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={message.attachment_url}
                                alt={message.attachment_name || "Lampiran"}
                                className="max-h-64 w-full object-cover"
                              />
                            </a>
                          ) : (
                            <a
                              href={message.attachment_url}
                              target="_blank"
                              rel="noreferrer"
                              className={`inline-flex items-center rounded-[16px] border px-3 py-2 text-xs font-semibold transition ${
                                mine
                                  ? "border-white/20 bg-white/10 text-white hover:bg-white/15"
                                  : "border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100"
                              }`}
                            >
                              {message.attachment_name || "Lampiran"}
                            </a>
                          )}
                        </div>
                      ) : null}
                      <p className={`mt-2 text-[11px] ${mine ? "text-slate-300" : "text-slate-400"}`}>
                        {message.created_at || ""}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>

            <form action={sendChatMessage} className="border-t border-slate-200 bg-white p-4">
              <input type="hidden" name="room_id" value={activeRoomId} />
              <input type="hidden" name="package_id" value={draftPackageId} />
              <input type="hidden" name="booking_id" value={draftBookingId} />
              <div className="mb-3">
                <input
                  type="file"
                  name="attachment"
                  accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                  className="block w-full rounded-[18px] border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-600 file:mr-3 file:rounded-full file:border-0 file:bg-orange-100 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-orange-700"
                />
              </div>
              <div className="flex gap-3">
                <textarea
                  name="message"
                  placeholder={t.writeMessage}
                  className="h-24 flex-1 rounded-[20px] border border-slate-300 p-3 text-sm outline-none ring-orange-500 focus:ring-2"
                />
                <button
                  type="submit"
                  disabled={!activeRoomId && !draftPackageId && !draftBookingId}
                  className="self-end rounded-[20px] bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  {t.send}
                </button>
              </div>
            </form>
          </section>
          </div>
        </section>
      </div>
    </main>
  )
}
