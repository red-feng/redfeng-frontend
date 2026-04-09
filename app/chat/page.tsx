import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getCurrentLocale } from "@/lib/locale"
import { dictionaries } from "@/lib/i18n"
import CustomerChatRealtimeClient from "./CustomerChatRealtimeClient"

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
  bookings?:
    | {
        booking_code: string | null
        booking_status: string | null
        customer_name?: string | null
      }
    | {
        booking_code: string | null
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
  const ui =
    locale === "en"
      ? {
          allConversations: "All conversations",
          totalConversations: "Total active conversations",
          newChats: "New chats",
          unreadLabel: "Unread",
          activeRoomLabel: "Current active room",
          leadBadge: "Inquiry",
          bookingBadge: "Active booking",
          completedBadge: "Completed booking",
          activeStatus: "Active booking",
          completedStatus: "Booking completed",
          leadStatus: "Lead / inquiry",
          newBadge: "New",
        }
      : locale === "zh"
        ? {
            allConversations: "全部会话",
            totalConversations: "当前活跃会话总数",
            newChats: "新消息",
            unreadLabel: "未读",
            activeRoomLabel: "当前活跃房间",
            leadBadge: "咨询",
            bookingBadge: "进行中的预订",
            newBadge: "新消息",
          }
        : {
            allConversations: "Semua percakapan",
            totalConversations: "Total percakapan aktif",
            newChats: "Chat baru",
            unreadLabel: "Belum dibaca",
            activeRoomLabel: "Room aktif saat ini",
            leadBadge: "Lead",
            bookingBadge: "Booking aktif",
            completedBadge: "Booking selesai",
            activeStatus: "Booking aktif",
            completedStatus: "Booking selesai",
            leadStatus: "Lead / inquiry",
            newBadge: "Baru",
          }

  const completedBadgeLabel =
    locale === "en" ? "Completed booking" : locale === "zh" ? "已完成预订" : "Booking selesai"
  const activeStatusLabel =
    locale === "en" ? "Active booking" : locale === "zh" ? "进行中的预订" : "Booking aktif"
  const completedStatusLabel =
    locale === "en" ? "Booking completed" : locale === "zh" ? "预订已完成" : "Booking selesai"
  const leadStatusLabel =
    locale === "en" ? "Lead / inquiry" : locale === "zh" ? "咨询 / 线索" : "Lead / inquiry"
  const bookingLabel = locale === "en" ? "Booking" : locale === "zh" ? "预订" : "Booking"

  function getBookingInfo(room: ChatRoomRow) {
    if (Array.isArray(room.bookings)) return room.bookings[0] || null
    return room.bookings || null
  }

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
      "id, package_id, customer_id, merchant_user_id, booking_id, updated_at, last_message_at, last_message_sender_id, customer_last_read_at, bookings(booking_code, booking_status, customer_name)",
    )
    .order("updated_at", { ascending: false })

  const roomResult = isMerchant
    ? await roomQuery.eq("merchant_user_id", user.id)
    : await roomQuery.eq("customer_id", user.id)

  if (roomResult.error && roomResult.error.message.includes("last_message")) {
    const fallbackQuery = adminSupabase
      .from("package_chat_rooms")
      .select("id, package_id, customer_id, merchant_user_id, booking_id, updated_at")
      .order("updated_at", { ascending: false })
    const fallbackResult = isMerchant
      ? await fallbackQuery.eq("merchant_user_id", user.id)
      : await fallbackQuery.eq("customer_id", user.id)
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

        <CustomerChatRealtimeClient
          locale={locale}
          userId={user.id}
          initialRooms={rooms.map((room) => {
            const pkg = packageMap.get(room.package_id)
            const booking = getBookingInfo(room)
            return {
              id: room.id,
              packageId: room.package_id,
              packageTitle: pkg?.title || null,
              packageSlug: pkg?.slug || null,
              customerId: room.customer_id,
              merchantUserId: room.merchant_user_id,
              bookingId: room.booking_id || null,
              bookingCode: booking?.booking_code || null,
              bookingStatus: booking?.booking_status || null,
              customerName: booking?.customer_name || null,
              updatedAt: room.updated_at || null,
              lastMessageAt: room.last_message_at || null,
              lastMessageSenderId: room.last_message_sender_id || null,
              customerLastReadAt: room.customer_last_read_at || null,
            }
          })}
          initialActiveRoomId={activeRoomId}
          initialMessages={messages}
          packageLabel={t.packageLabel}
          packageFallback={t.packageFallback}
          noChats={t.noChats}
          noMessages={t.noMessages}
          sendLabel={t.send}
          writeMessageLabel={t.writeMessage}
          viewPackageDetailLabel={t.viewPackageDetail}
          title={t.chatRooms}
          allConversations={ui.allConversations}
          totalConversations={ui.totalConversations}
          newChats={ui.newChats}
          unreadLabel={ui.unreadLabel}
          activeRoomLabel={ui.activeRoomLabel}
          leadBadge={ui.leadBadge}
          bookingBadge={ui.bookingBadge}
          completedBadge={completedBadgeLabel}
          activeStatus={activeStatusLabel}
          completedStatus={completedStatusLabel}
          leadStatus={leadStatusLabel}
          newBadge={ui.newBadge}
          bookingLabel={bookingLabel}
        />
      </div>
    </main>
  )
}
