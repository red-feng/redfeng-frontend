import Link from "next/link"
import { type Locale, normalizeLocale } from "@/lib/i18n"
import { getCurrentLocale } from "@/lib/locale"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import MerchantChatRealtimeClient from "./MerchantChatRealtimeClient"

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
  merchant_hidden_at?: string | null
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
  packages?:
    | {
        merchant_id: string | null
      }
    | {
        merchant_id: string | null
      }[]
    | null
}

function getChatText(locale: Locale) {
  const dict = {
    id: {
      heroBadge: "Merchant Inbox",
      heroTitle: "Percakapan customer yang siap ditangani dalam satu command center.",
      heroDescription: "Kelola pertanyaan sebelum booking, follow-up sesudah pembayaran, dan jaga response time merchant dengan inbox yang lebih rapi dan lebih siap untuk operasional OTA.",
      allChats: "Semua percakapan",
      totalRoomsOnInbox: "Total room pada inbox merchant",
      newChats: "Chat baru",
      unreadByMerchant: "Belum dibaca merchant",
      activeRoomMessages: "Pesan dalam room aktif",
      currentConversation: "Percakapan saat ini",
      selectRoomToView: "Pilih room untuk melihat isi",
      businessSnapshot: "Business Snapshot",
      inboxLens: "Inbox Lens",
      inboxLensDescription: "Semua percakapan customer kini ada dalam satu inbox, dengan badge yang membedakan lead biasa dan room yang sudah terkait booking.",
      beforeBooking: "Lead",
      afterBooking: "Booking aktif",
      completedBooking: "Booking selesai",
      loadRoomsError: "Gagal memuat ruang chat",
      afterBookingMigration: "Fitur tab sesudah booking membutuhkan migration `20260306_add_booking_id_to_package_chat_rooms.sql`.",
      unreadBadgeMigration: "Badge chat baru membutuhkan migration `20260307_add_read_tracking_to_package_chat_rooms.sql`.",
      customerRooms: "Customer Rooms",
      conversationList: "Daftar percakapan",
      searchPlaceholder: "Cari customer, kode booking, atau paket...",
      searchButton: "Cari",
      clearSearch: "Reset",
      allFilter: "Semua",
      unreadFilter: "Unread",
      bookingFilter: "Booking aktif",
      searchResultLabel: "Hasil pencarian",
      noSearchResult: "Tidak ada percakapan yang cocok dengan kata kunci ini.",
      newBadge: "baru",
      noChats: "Belum ada percakapan customer untuk merchant ini.",
      packageLabel: "Paket",
      packageNotFound: "Paket tidak ditemukan",
      bookingLabel: "Booking",
      lastUpdated: "Update terakhir",
      viewPackage: "Lihat paket",
      conversationFocus: "Conversation Focus",
      selectChatRoom: "Pilih ruang chat",
      selectRoomToViewMerchant: "Pilih room untuk melihat isi percakapan merchant.",
      viewPackageDetail: "Lihat detail paket",
      threadType: "Jenis Thread",
      statusLabel: "Status",
      activeTransaction: "Transaksi aktif",
      completedTransaction: "Booking selesai",
      leadInquiry: "Lead / inquiry",
      noMessages: "Belum ada pesan di ruang chat ini.",
      attachmentLabel: "Lampiran",
      attachmentHint: "Maksimal 10 MB. Gambar, PDF, DOCX, XLSX, atau TXT.",
      openAttachment: "Buka lampiran",
      replyPlaceholder: "Tulis balasan untuk customer...",
      sendButton: "Kirim",
    },
    en: {
      heroBadge: "Merchant Inbox",
      heroTitle: "Customer conversations ready to be handled in one command center.",
      heroDescription: "Manage pre-booking questions, post-payment follow-ups, and merchant response time in a cleaner inbox built for OTA operations.",
      allChats: "All conversations",
      totalRoomsOnInbox: "Total rooms in the merchant inbox",
      newChats: "New chats",
      unreadByMerchant: "Not yet read by merchant",
      activeRoomMessages: "Messages in active room",
      currentConversation: "Current conversation",
      selectRoomToView: "Select a room to view its content",
      businessSnapshot: "Business Snapshot",
      inboxLens: "Inbox Lens",
      inboxLensDescription: "All customer conversations now live in one inbox, with badges that separate regular leads from booking-linked rooms.",
      beforeBooking: "Lead",
      afterBooking: "Active booking",
      completedBooking: "Completed booking",
      loadRoomsError: "Failed to load chat rooms",
      afterBookingMigration: "The post-booking tab requires migration `20260306_add_booking_id_to_package_chat_rooms.sql`.",
      unreadBadgeMigration: "The new chat badge requires migration `20260307_add_read_tracking_to_package_chat_rooms.sql`.",
      customerRooms: "Customer Rooms",
      conversationList: "Conversation list",
      searchPlaceholder: "Search customer, booking code, or package...",
      searchButton: "Search",
      clearSearch: "Reset",
      allFilter: "All",
      unreadFilter: "Unread",
      bookingFilter: "Active booking",
      searchResultLabel: "Search results",
      noSearchResult: "No conversations match this keyword.",
      newBadge: "new",
      noChats: "There are no customer conversations for this merchant yet.",
      packageLabel: "Package",
      packageNotFound: "Package not found",
      bookingLabel: "Booking",
      lastUpdated: "Last updated",
      viewPackage: "View package",
      conversationFocus: "Conversation Focus",
      selectChatRoom: "Select a chat room",
      selectRoomToViewMerchant: "Select a room to view the merchant conversation.",
      viewPackageDetail: "View package detail",
      threadType: "Thread Type",
      statusLabel: "Status",
      activeTransaction: "Active transaction",
      completedTransaction: "Completed booking",
      leadInquiry: "Lead / inquiry",
      noMessages: "There are no messages in this chat room yet.",
      attachmentLabel: "Attachment",
      attachmentHint: "Maximum 10 MB. Image, PDF, DOCX, XLSX, or TXT.",
      openAttachment: "Open attachment",
      replyPlaceholder: "Write a reply for the customer...",
      sendButton: "Send",
    },
    zh: {
      heroBadge: "商家收件箱",
      heroTitle: "在一个指挥中心中处理客户对话。",
      heroDescription: "更有条理地管理预订前咨询、付款后跟进以及商家回复效率，适配 OTA 日常运营。",
      allChats: "全部会话",
      totalRoomsOnInbox: "商家收件箱中的会话总数",
      newChats: "新消息",
      unreadByMerchant: "商家尚未阅读",
      activeRoomMessages: "当前会话消息数",
      currentConversation: "当前对话",
      selectRoomToView: "请选择一个会话查看内容",
      businessSnapshot: "业务概览",
      inboxLens: "收件箱视图",
      inboxLensDescription: "所有客户对话现在集中在一个收件箱中，并通过徽标区分普通线索与已关联预订的会话。",
      beforeBooking: "线索",
      afterBooking: "进行中的预订",
      completedBooking: "已完成预订",
      loadRoomsError: "加载聊天会话失败",
      afterBookingMigration: "预订后标签需要 migration `20260306_add_booking_id_to_package_chat_rooms.sql`。",
      unreadBadgeMigration: "新消息徽标需要 migration `20260307_add_read_tracking_to_package_chat_rooms.sql`。",
      customerRooms: "客户会话",
      conversationList: "对话列表",
      searchPlaceholder: "搜索客户、预订编号或套餐...",
      searchButton: "搜索",
      clearSearch: "重置",
      allFilter: "全部",
      unreadFilter: "未读",
      bookingFilter: "进行中的预订",
      searchResultLabel: "搜索结果",
      noSearchResult: "没有找到匹配此关键词的会话。",
      newBadge: "新消息",
      noChats: "该商家暂时还没有客户会话。",
      packageLabel: "套餐",
      packageNotFound: "未找到套餐",
      bookingLabel: "预订",
      lastUpdated: "最后更新",
      viewPackage: "查看套餐",
      conversationFocus: "当前对话",
      selectChatRoom: "请选择聊天房间",
      selectRoomToViewMerchant: "请选择一个房间以查看商家与客户的对话内容。",
      viewPackageDetail: "查看套餐详情",
      threadType: "会话类型",
      statusLabel: "状态",
      activeTransaction: "进行中的交易",
      completedTransaction: "预订已完成",
      leadInquiry: "咨询 / 线索",
      noMessages: "该聊天房间里暂时还没有消息。",
      attachmentLabel: "附件",
      attachmentHint: "最大 10 MB。支持图片、PDF、DOCX、XLSX 或 TXT。",
      openAttachment: "打开附件",
      replyPlaceholder: "输入发送给客户的回复...",
      sendButton: "发送",
    },  } satisfies Record<Locale, Record<string, string>>

  return dict[locale]
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
}

type MerchantChatParams = {
  room_id?: string
  error?: string
  q?: string
  filter?: string
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

export const dynamic = "force-dynamic"

export default async function MerchantChatPage({
  searchParams,
}: {
  searchParams: Promise<MerchantChatParams>
}) {
  const params = await searchParams
  const locale = normalizeLocale(await getCurrentLocale())
  const t = getChatText(locale)
  const requestedRoomId = params.room_id || ""
  const errorMessage = params.error || ""
  const searchQuery = String(params.q || "").trim()
  const normalizedSearchQuery = searchQuery.toLowerCase()
  const activeFilter = params.filter === "unread" || params.filter === "booking" ? params.filter : "all"

  const supabase = await createClient()
  const adminSupabase = createAdminClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data: currentMerchant } = await adminSupabase
    .from("merchants")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle()

  if (!currentMerchant?.id) return null

  let roomsError: { message: string } | null = null
  let bookingLinkReady = true
  let readTrackingReady = true

  const roomsWithBooking = await adminSupabase
    .from("package_chat_rooms")
    .select(
      "id, package_id, customer_id, merchant_user_id, booking_id, updated_at, last_message_at, last_message_sender_id, merchant_last_read_at, merchant_hidden_at, bookings(booking_code, payment_status, booking_status, customer_name), packages!inner(merchant_id)",
    )
    .eq("merchant_user_id", user.id)
    .eq("packages.merchant_id", currentMerchant.id)
    .is("merchant_hidden_at", null)
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
        "id, package_id, customer_id, merchant_user_id, updated_at, last_message_at, last_message_sender_id, merchant_last_read_at, merchant_hidden_at, packages!inner(merchant_id)",
      )
      .eq("merchant_user_id", user.id)
      .eq("packages.merchant_id", currentMerchant.id)
      .is("merchant_hidden_at", null)
      .order("updated_at", { ascending: false })
    allRooms = (fallback.data as ChatRoomRow[] | null) || []
    roomsError = fallback.error
  } else {
    allRooms = (roomsWithBooking.data as ChatRoomRow[] | null) || []
    roomsError = roomsWithBooking.error
  }

  const packageIds = [...new Set(allRooms.map((room) => room.package_id))]
  const { data: packageRows } = packageIds.length
    ? await adminSupabase.from("packages").select("id, title, slug").in("id", packageIds)
    : { data: [] as PackageRow[] }
  const packageMap = new Map((packageRows || []).map((pkg: PackageRow) => [pkg.id, pkg]))

  const matchesSearch = (room: ChatRoomRow) => {
    if (!normalizedSearchQuery) return true
    const booking = getBookingInfo(room)
    const packageTitle = packageMap.get(room.package_id)?.title || ""
    const haystack = [getCustomerLabel(room), booking?.booking_code || "", packageTitle]
      .join(" ")
      .toLowerCase()

    return haystack.includes(normalizedSearchQuery)
  }

  const matchesFilter = (room: ChatRoomRow) => {
    const hasUnread =
      room.last_message_sender_id &&
      room.last_message_sender_id !== user.id &&
      (!room.merchant_last_read_at || (room.last_message_at || "") > room.merchant_last_read_at)

    if (activeFilter === "unread") return Boolean(hasUnread)
    if (activeFilter === "booking") return Boolean(room.booking_id)
    return true
  }

  const rooms = allRooms.filter((room) => matchesSearch(room) && matchesFilter(room))
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

  const { data: messagesData } = activeRoomId
    ? await adminSupabase
        .from("package_chat_messages")
        .select("id, room_id, sender_id, message, attachment_url, attachment_name, attachment_mime_type, created_at")
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
      label: t.allChats,
      value: String(rooms.length),
      note: t.totalRoomsOnInbox,
    },
    {
      label: t.newChats,
      value: String(unreadCount),
      note: t.unreadByMerchant,
    },
    {
      label: t.activeRoomMessages,
      value: String(messages.length),
      note: activeRoom ? t.currentConversation : t.selectRoomToView,
    },
  ]

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fff8f1_0%,#f7f1e8_38%,#f3eee7_100%)] p-6 md:p-10">
      <section className="overflow-hidden rounded-[34px] border border-orange-100 bg-[linear-gradient(135deg,#983108_0%,#f76707_52%,#ffb357_100%)] text-white shadow-[0_28px_80px_rgba(194,65,12,0.24)]">
        <div className="grid gap-6 px-7 py-8 lg:grid-cols-[minmax(0,1.4fr)_420px] lg:px-10 lg:py-10">
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
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-white/75">{t.businessSnapshot}</p>
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
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-white/75">{t.inboxLens}</p>
              <p className="mt-3 text-sm leading-6 text-white/90">
                {t.inboxLensDescription}
              </p>
            </div>
          </div>
        </div>
      </section>

      {roomsError && (
        <div className="mt-6 rounded-[24px] border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
          {t.loadRoomsError}: {roomsError.message}
        </div>
      )}

      {errorMessage && (
        <div className="mt-4 rounded-[24px] border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
          {errorMessage}
        </div>
      )}

      {!bookingLinkReady && (
        <div className="mt-4 rounded-[24px] border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-700">
          {t.afterBookingMigration}
        </div>
      )}

      {!readTrackingReady && (
        <div className="mt-4 rounded-[24px] border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-700">
          {t.unreadBadgeMigration}
        </div>
      )}

      <MerchantChatRealtimeClient
        userId={user.id}
        initialRooms={allRooms.map((room) => {
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
            paymentStatus: booking?.payment_status || null,
            customerName: booking?.customer_name || null,
            updatedAt: room.updated_at || null,
            lastMessageAt: room.last_message_at || null,
            lastMessageSenderId: room.last_message_sender_id || null,
            merchantLastReadAt: room.merchant_last_read_at || null,
          }
        })}
        initialActiveRoomId={activeRoomId}
        initialMessages={messages}
        text={{
          customerRooms: t.customerRooms,
          conversationList: t.conversationList,
          searchPlaceholder: t.searchPlaceholder,
          searchButton: t.searchButton,
          clearSearch: t.clearSearch,
          hideRoom: locale === "en" ? "Remove from list" : locale === "zh" ? "从列表移除" : "Hapus dari daftar",
          hidingRoom: locale === "en" ? "Removing..." : locale === "zh" ? "正在移除..." : "Menghapus...",
          allFilter: t.allFilter,
          unreadFilter: t.unreadFilter,
          bookingFilter: t.bookingFilter,
          searchResultLabel: t.searchResultLabel,
          noSearchResult: t.noSearchResult,
          newBadge: t.newBadge,
          noChats: t.noChats,
          packageLabel: t.packageLabel,
          packageNotFound: t.packageNotFound,
          bookingLabel: t.bookingLabel,
          lastUpdated: t.lastUpdated,
          viewPackage: t.viewPackage,
          conversationFocus: t.conversationFocus,
          selectChatRoom: t.selectChatRoom,
          selectRoomToViewMerchant: t.selectRoomToViewMerchant,
          viewPackageDetail: t.viewPackageDetail,
          threadType: t.threadType,
          statusLabel: t.statusLabel,
          activeTransaction: t.activeTransaction,
          completedTransaction: t.completedTransaction,
          leadInquiry: t.leadInquiry,
          noMessages: t.noMessages,
          attachmentLabel: t.attachmentLabel,
          attachmentHint: t.attachmentHint,
          replyPlaceholder: t.replyPlaceholder,
          sendButton: t.sendButton,
          beforeBooking: t.beforeBooking,
          afterBooking: t.afterBooking,
          completedBooking: t.completedBooking,
          allChats: t.allChats,
          totalRoomsOnInbox: t.totalRoomsOnInbox,
          newChats: t.newChats,
          unreadByMerchant: t.unreadByMerchant,
          activeRoomMessages: t.activeRoomMessages,
          currentConversation: t.currentConversation,
          selectRoomToView: t.selectRoomToView,
        }}
      />
    </main>
  )
}

