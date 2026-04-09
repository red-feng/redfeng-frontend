import Link from "next/link"
import { type Locale, normalizeLocale } from "@/lib/i18n"
import { getCurrentLocale } from "@/lib/locale"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { isImageAttachment } from "@/lib/chat/attachments"
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

function isCompletedBooking(room: ChatRoomRow) {
  const booking = getBookingInfo(room)
  const bookingStatus = String(booking?.booking_status || "")
    .trim()
    .toLowerCase()

  return bookingStatus === "completed" || bookingStatus === "done"
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

  const unreadRoomsCount = allRooms.filter((room) => {
    if (!room.last_message_sender_id || room.last_message_sender_id === user.id) return false
    if (!room.last_message_at) return false
    if (!room.merchant_last_read_at) return true
    return room.last_message_at > room.merchant_last_read_at
  }).length
  const bookingRoomsCount = allRooms.filter((room) => Boolean(room.booking_id)).length

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

      <section className="mt-8 rounded-[32px] border border-[#f3dbc3] bg-white/80 p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur-sm lg:p-7">
        <div className="grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
          <aside className="rounded-[28px] border border-[#f3dbc3] bg-[#fffaf3] p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-orange-500">{t.customerRooms}</p>
                <h2 className="mt-2 text-lg font-semibold text-slate-950">{t.conversationList}</h2>
              </div>
              {unreadCount > 0 && (
                  <span className="rounded-full bg-orange-600 px-3 py-1 text-xs font-semibold text-white">{unreadCount} {t.newBadge}</span>
                )}
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {[
                { key: "all", label: t.allFilter, count: allRooms.length },
                { key: "unread", label: t.unreadFilter, count: unreadRoomsCount },
                { key: "booking", label: t.bookingFilter, count: bookingRoomsCount },
              ].map((item) => {
                const href = searchQuery
                  ? `/merchant/chat?filter=${item.key}&q=${encodeURIComponent(searchQuery)}`
                  : `/merchant/chat?filter=${item.key}`
                const isActive = activeFilter === item.key
                return (
                  <Link
                    key={item.key}
                    href={href}
                    className={`rounded-full border px-3 py-2 text-xs font-semibold transition ${
                      isActive
                        ? "border-orange-200 bg-orange-100 text-orange-700"
                        : "border-[#e6d8c2] bg-white text-slate-600 hover:border-orange-200 hover:text-orange-700"
                    }`}
                  >
                    <span>{item.label}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        isActive ? "bg-white/80 text-orange-700" : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {item.count}
                    </span>
                  </Link>
                )
              })}
            </div>

            <form action="/merchant/chat" method="get" className="mt-4 flex gap-2">
              <input type="hidden" name="filter" value={activeFilter} />
              <input
                type="text"
                name="q"
                defaultValue={searchQuery}
                placeholder={t.searchPlaceholder}
                className="h-11 flex-1 rounded-[18px] border border-[#e6d8c2] bg-white px-4 text-sm text-slate-700 outline-none ring-orange-500 transition focus:ring-2"
              />
              <button
                type="submit"
                className="rounded-[18px] border border-orange-200 bg-orange-50 px-4 text-sm font-semibold text-orange-700 transition hover:bg-orange-100"
              >
                {t.searchButton}
              </button>
              {(searchQuery || activeFilter !== "all") ? (
                <Link
                  href="/merchant/chat"
                  className="inline-flex items-center rounded-[18px] border border-[#e6d8c2] bg-white px-4 text-sm font-semibold text-slate-600 transition hover:border-orange-200 hover:text-orange-700"
                >
                  {t.clearSearch}
                </Link>
              ) : null}
            </form>

            {searchQuery ? (
              <p className="mt-3 text-xs font-medium text-slate-500">
                {t.searchResultLabel}: <span className="text-slate-700">&quot;{searchQuery}&quot;</span>
              </p>
            ) : null}

            <div className="mt-4 space-y-3">
              {rooms.length === 0 && searchQuery && (
                <div className="rounded-[22px] border border-[#eadfce] bg-white px-4 py-4 text-sm leading-6 text-slate-600">
                  {t.noSearchResult}
                </div>
              )}
              {rooms.length === 0 && !searchQuery && (
                <div className="rounded-[22px] border border-dashed border-[#e3d4be] bg-white px-4 py-4 text-sm leading-6 text-slate-600">
                  {t.noChats}
                </div>
              )}

              {rooms.map((room) => {
                const pkg = packageMap.get(room.package_id)
                const booking = getBookingInfo(room)
                const completedBooking = isCompletedBooking(room)
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
                    <Link href={`/merchant/chat?room_id=${room.id}`} className="block">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-950">{getCustomerLabel(room)}</p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            <span
                              className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                                completedBooking
                                  ? "bg-sky-100 text-sky-700"
                                  : room.booking_id
                                    ? "bg-emerald-100 text-emerald-700"
                                    : "bg-slate-100 text-slate-600"
                              }`}
                            >
                              {completedBooking ? t.completedBooking : room.booking_id ? t.afterBooking : t.beforeBooking}
                            </span>
                            {hasUnread && (
                              <span className="rounded-full bg-orange-600 px-2.5 py-1 text-[10px] font-semibold text-white">
                                {t.newBadge}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600">
                        {t.packageLabel}: {pkg?.title || t.packageNotFound}
                      </p>
                      {room.booking_id && (
                        <p className="mt-2 text-xs font-medium text-emerald-700">
                          {t.bookingLabel}: {booking?.booking_code || room.booking_id}
                        </p>
                      )}
                      <p className="mt-2 text-xs text-slate-500">
                        {t.lastUpdated}: {formatDateTime(room.last_message_at || room.updated_at)}
                      </p>
                    </Link>
                    {pkg?.slug && (
                      <Link
                        href={`/packages/${encodeURIComponent(pkg.slug)}`}
                        className="mt-3 inline-flex text-xs font-semibold text-orange-600 transition hover:text-orange-700"
                      >
                          {t.viewPackage}
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
                  <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-orange-500">{t.conversationFocus}</p>
                  <p className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-slate-950">
                    {activeRoom ? getCustomerLabel(activeRoom) : t.selectChatRoom}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {activeRoom ? packageMap.get(activeRoom.package_id)?.title || "-" : t.selectRoomToViewMerchant}
                  </p>
                  {activeRoom && packageMap.get(activeRoom.package_id)?.slug && (
                    <Link
                      href={`/packages/${encodeURIComponent(packageMap.get(activeRoom.package_id)?.slug || "")}`}
                      className="mt-3 inline-flex text-xs font-semibold text-orange-600 transition hover:text-orange-700"
                    >
                      {t.viewPackageDetail}
                    </Link>
                  )}
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-[20px] border border-[#efe3d1] bg-white px-4 py-3">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">{t.threadType}</p>
                    <p className="mt-2 text-sm font-semibold text-slate-950">
                      {activeRoom ? (isCompletedBooking(activeRoom) ? t.completedBooking : activeRoom.booking_id ? t.afterBooking : t.beforeBooking) : t.beforeBooking}
                    </p>
                  </div>
                  <div className="rounded-[20px] border border-[#efe3d1] bg-white px-4 py-3">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">{t.statusLabel}</p>
                    <p className="mt-2 text-sm font-semibold text-slate-950">
                      {activeRoom
                        ? isCompletedBooking(activeRoom)
                          ? t.completedTransaction
                          : activeRoom.booking_id
                            ? t.activeTransaction
                            : t.leadInquiry
                        : t.leadInquiry}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="h-[56vh] space-y-4 overflow-y-auto bg-[#fffaf5] px-5 py-5 lg:px-6">
              {messages.length === 0 && (
                <div className="rounded-[22px] border border-[#eadfce] bg-white px-4 py-4 text-sm leading-6 text-slate-600">
                  {t.noMessages}
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
                      {message.message ? (
                        <p className="whitespace-pre-line leading-7">{message.message}</p>
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
                                alt={message.attachment_name || t.attachmentLabel}
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
                              {message.attachment_name || t.openAttachment}
                            </a>
                          )}
                        </div>
                      ) : null}
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
              <div className="mb-3">
                <label className="flex flex-col gap-2 text-xs font-medium text-slate-500">
                  <span>{t.attachmentLabel}</span>
                  <input
                    type="file"
                    name="attachment"
                    disabled={!activeRoomId}
                    accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                    className="block w-full rounded-[18px] border border-[#e6d8c2] bg-[#fffdf9] px-4 py-3 text-sm text-slate-600 file:mr-3 file:rounded-full file:border-0 file:bg-orange-100 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-orange-700"
                  />
                </label>
                <p className="mt-2 text-xs text-slate-400">{t.attachmentHint}</p>
              </div>
              <div className="flex gap-3">
                <textarea
                  name="message"
                  disabled={!activeRoomId}
                  placeholder={t.replyPlaceholder}
                  className="h-24 flex-1 rounded-[22px] border border-[#e6d8c2] bg-[#fffdf9] px-4 py-3 text-sm text-slate-700 outline-none ring-orange-500 transition focus:ring-2 disabled:cursor-not-allowed disabled:bg-slate-100"
                />
                <button
                  type="submit"
                  disabled={!activeRoomId}
                  className="self-end rounded-[22px] bg-[linear-gradient(135deg,#a33a0b_0%,#f76707_100%)] px-6 py-3 text-sm font-semibold text-white shadow-[0_14px_34px_rgba(194,65,12,0.22)] transition hover:translate-y-[-1px] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
                >
                  {t.sendButton}
                </button>
              </div>
            </form>
          </section>
        </div>
      </section>
    </main>
  )
}

