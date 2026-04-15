import { redirect } from "next/navigation"
import { cookies } from "next/headers"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getCurrentLocale } from "@/lib/locale"
import { dictionaries } from "@/lib/i18n"
import { parseChatSystemMessage } from "@/lib/chat/system-messages"
import {
  ChatRoomFlowError,
  ensureCustomerBookingChatRoom,
  ensureCustomerPackageChatRoom,
} from "@/lib/chat/customer-room"
import { buildChatLoginNextTarget } from "@/lib/chat/auth-flow-policy.mjs"
import { shouldUseMerchantChatPortal } from "@/lib/chat/customer-room-policy.mjs"
import { ACTIVE_PORTAL_COOKIE, normalizeActivePortal } from "@/lib/portal-context"
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
  merchant_last_read_at?: string | null
  customer_hidden_at?: string | null
  bookings?:
    | {
        booking_code: string | null
        booking_status: string | null
        payment_status: string | null
        customer_name?: string | null
      }
    | {
        booking_code: string | null
        booking_status: string | null
        payment_status: string | null
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
  cover_image: string | null
}

type MerchantRow = {
  id: string
  brand_name: string | null
  company_name: string | null
  logo_url: string | null
}

export const dynamic = "force-dynamic"
const CHAT_PAGE_SIZE = 50
const CHAT_ROOM_PAGE_SIZE = 30

export default async function ChatPage({
  searchParams,
}: {
  searchParams: Promise<{ room_id?: string; package_id?: string; booking_id?: string; error?: string }>
}) {
  const params = await searchParams
  const cookieStore = await cookies()
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
    const nextTarget = buildChatLoginNextTarget({ bookingId, packageId, roomId })
    redirect(`/login?next=${encodeURIComponent(nextTarget)}`)
  }

  const { data: merchantMe } = await adminSupabase
    .from("merchants")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle()
  const activePortal = normalizeActivePortal(cookieStore.get(ACTIVE_PORTAL_COOKIE)?.value)
  const isMerchant = shouldUseMerchantChatPortal({
    activePortal,
    hasMerchantRecord: Boolean(merchantMe),
  })

  let activeRoomId = roomId

  if (!isMerchant && bookingId) {
    const { data: booking } = await adminSupabase
      .from("bookings")
      .select("id, package_id, customer_email")
      .eq("id", bookingId)
      .single()

    if (booking?.package_id && user.email && booking.customer_email === user.email) {
      try {
        const targetRoom = await ensureCustomerBookingChatRoom(adminSupabase, {
          bookingId,
          customerId: user.id,
          customerEmail: user.email,
          senderId: user.id,
          markCustomerRead: true,
        })
        activeRoomId = targetRoom.roomId
      } catch (error) {
        if (!(error instanceof ChatRoomFlowError)) throw error
      }
    }
  }

  if (!isMerchant && packageId && !bookingId) {
    try {
      const targetRoom = await ensureCustomerPackageChatRoom(adminSupabase, {
        packageId,
        customerId: user.id,
        senderId: user.id,
        markCustomerRead: true,
      })
      activeRoomId = targetRoom.roomId
    } catch (error) {
      const msg =
        error instanceof ChatRoomFlowError && error.code === "migration_missing"
          ? t.migrationMissing
          : error instanceof Error
            ? `${t.createRoomFailed}: ${error.message}`
            : t.createRoomFailed
      return (
        <main className="mx-auto max-w-3xl p-6">
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
            {msg}
          </div>
        </main>
      )
    }
  }

  let roomsData: ChatRoomRow[] | null = null
  let roomsError: { message: string } | null = null

  const roomQuery = adminSupabase
    .from("package_chat_rooms")
    .select(
      "id, package_id, customer_id, merchant_user_id, booking_id, updated_at, last_message_at, last_message_sender_id, customer_last_read_at, merchant_last_read_at, customer_hidden_at, bookings(booking_code, booking_status, payment_status, customer_name)",
    )
    .is("customer_hidden_at", null)
    .order("updated_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(CHAT_ROOM_PAGE_SIZE + 1)

  const roomResult = isMerchant
    ? await roomQuery.eq("merchant_user_id", user.id)
    : await roomQuery.eq("customer_id", user.id)

  if (roomResult.error && roomResult.error.message.includes("last_message")) {
    const fallbackQuery = adminSupabase
      .from("package_chat_rooms")
      .select("id, package_id, customer_id, merchant_user_id, booking_id, updated_at, customer_hidden_at")
      .is("customer_hidden_at", null)
      .order("updated_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(CHAT_ROOM_PAGE_SIZE + 1)
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

  const roomRows = roomsData || []
  const initialRoomsHasMore = roomRows.length > CHAT_ROOM_PAGE_SIZE
  const roomFirstPage = initialRoomsHasMore ? roomRows.slice(0, CHAT_ROOM_PAGE_SIZE) : roomRows
  let initialRooms = roomFirstPage
  const initialRoomsCursor =
    initialRoomsHasMore && roomFirstPage.length > 0
      ? {
          updatedAt: roomFirstPage[roomFirstPage.length - 1]?.updated_at || "",
          roomId: roomFirstPage[roomFirstPage.length - 1]?.id || "",
        }
      : null

  if (activeRoomId && !initialRooms.some((room) => room.id === activeRoomId)) {
    const requestedRoomQuery = adminSupabase
      .from("package_chat_rooms")
      .select(
        "id, package_id, customer_id, merchant_user_id, booking_id, updated_at, last_message_at, last_message_sender_id, customer_last_read_at, merchant_last_read_at, customer_hidden_at, bookings(booking_code, booking_status, payment_status, customer_name)",
      )
      .eq("id", activeRoomId)
      .is("customer_hidden_at", null)
      .maybeSingle()
    const requestedRoomResult = isMerchant
      ? await requestedRoomQuery.eq("merchant_user_id", user.id)
      : await requestedRoomQuery.eq("customer_id", user.id)

    if (requestedRoomResult.data) {
      initialRooms = [requestedRoomResult.data as ChatRoomRow, ...initialRooms]
    }
  }

  if (!activeRoomId && initialRooms.length > 0) {
    activeRoomId = initialRooms[0].id
  }

  const activeRoom = initialRooms.find((room) => room.id === activeRoomId) || null

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

  const packageIds = [...new Set(initialRooms.map((room) => room.package_id))]
  const roomIds = initialRooms.map((room) => room.id)
  const { data: packageRows } = packageIds.length
    ? await adminSupabase
        .from("packages")
        .select("id, title, slug, merchant_id, cover_image")
        .in("id", packageIds)
    : { data: [] as PackageRow[] }
  const packageMap = new Map((packageRows || []).map((p: PackageRow) => [p.id, p]))
  const merchantIds = [...new Set((packageRows || []).map((pkg) => pkg.merchant_id).filter(Boolean))]
  const { data: merchantRows } = merchantIds.length
    ? await adminSupabase
        .from("merchants")
        .select("id, brand_name, company_name, logo_url")
        .in("id", merchantIds)
    : { data: [] as MerchantRow[] }
  const merchantMap = new Map((merchantRows || []).map((merchant: MerchantRow) => [merchant.id, merchant]))

  const { data: latestMessageRows } = roomIds.length
    ? await adminSupabase
        .from("package_chat_messages")
        .select("room_id, message, attachment_name, created_at")
        .in("room_id", roomIds)
        .order("created_at", { ascending: false })
    : { data: [] as Array<{ room_id: string; message: string; attachment_name?: string | null; created_at?: string | null }> }

  const latestMessageMap = new Map<string, { message: string; attachmentName: string | null }>()
  for (const row of latestMessageRows || []) {
    if (!row.room_id || latestMessageMap.has(row.room_id)) continue
    const systemMessage = parseChatSystemMessage(row.message)
    let preview = row.message || ""
    if (systemMessage?.type === "package_inquiry") {
      preview = locale === "en" ? "You asked about this package" : locale === "zh" ? "你正在咨询这个套餐" : "Kamu menanyakan paket ini"
    } else if (systemMessage?.type === "booking_linked") {
      preview = locale === "en" ? "Your order is linked to this chat" : locale === "zh" ? "此聊天已关联订单" : "Pesanan sudah terhubung ke chat ini"
    } else if (!preview && row.attachment_name) {
      preview = row.attachment_name
    }
    latestMessageMap.set(row.room_id, {
      message: preview,
      attachmentName: row.attachment_name || null,
    })
  }

  const { data: messagesData, error: messagesError } = activeRoomId
    ? await adminSupabase
        .from("package_chat_messages")
        .select("id, room_id, sender_id, message, attachment_url, attachment_name, attachment_mime_type, created_at")
        .eq("room_id", activeRoomId)
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .limit(CHAT_PAGE_SIZE + 1)
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

  const descMessages = (messagesData as ChatMessageRow[] | null) || []
  const initialHasMore = descMessages.length > CHAT_PAGE_SIZE
  const limitedMessages = initialHasMore ? descMessages.slice(0, CHAT_PAGE_SIZE) : descMessages
  const messages = [...limitedMessages].sort((left, right) => {
    const leftDate = left.created_at || ""
    const rightDate = right.created_at || ""
    if (leftDate === rightDate) return left.id.localeCompare(right.id)
    return leftDate.localeCompare(rightDate)
  })
  const initialOldestCreatedAt = messages[0]?.created_at || null
  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)] p-0 md:p-10">
      <div className="max-w-6xl md:mx-auto">
        <section className="hidden rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm md:block">
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
          initialRooms={initialRooms.map((room) => {
            const pkg = packageMap.get(room.package_id)
            const merchant = pkg?.merchant_id ? merchantMap.get(pkg.merchant_id) : null
            const booking = getBookingInfo(room)
            return {
              id: room.id,
              packageId: room.package_id,
              packageTitle: pkg?.title || null,
              packageSlug: pkg?.slug || null,
              packageCoverImage: pkg?.cover_image || null,
              merchantName: merchant?.brand_name || merchant?.company_name || null,
              merchantLogoUrl: merchant?.logo_url || null,
              customerId: room.customer_id,
              merchantUserId: room.merchant_user_id,
               bookingId: room.booking_id || null,
               bookingCode: booking?.booking_code || null,
               bookingStatus: booking?.booking_status || null,
               paymentStatus: booking?.payment_status || null,
               customerName: booking?.customer_name || null,
               lastMessagePreview: latestMessageMap.get(room.id)?.message || null,
               updatedAt: room.updated_at || null,
              lastMessageAt: room.last_message_at || null,
              lastMessageSenderId: room.last_message_sender_id || null,
              customerLastReadAt: room.customer_last_read_at || null,
               merchantLastReadAt: room.merchant_last_read_at || null,
            }
          })}
          initialRoomsHasMore={initialRoomsHasMore}
          initialRoomsCursor={initialRoomsCursor}
          initialActiveRoomId={activeRoomId}
          initialMessages={messages}
          initialHasMore={initialHasMore}
          initialOldestCreatedAt={initialOldestCreatedAt}
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
           hideRoomLabel={locale === "en" ? "Remove from list" : locale === "zh" ? "从列表移除" : "Hapus dari daftar"}
           hidingRoomLabel={locale === "en" ? "Removing..." : locale === "zh" ? "正在移除..." : "Menghapus..."}
         />
      </div>
    </main>
  )
}
