export const INTERNAL_CHAT_ENGINE = Object.freeze({
  key: "internal-chat",
  navHrefSuffix: "/internal-chat",
  unreadCountEndpoint: "/api/internal-chat/unread-count",
  snapshotEndpoint: "/api/internal-chat/snapshot",
  roomMetaEndpoint: "/api/internal-chat/room-meta",
  messagesEndpoint: "/api/internal-chat/messages",
  ensureDmEndpoint: "/api/internal-chat/ensure-dm",
  sendEndpoint: "/api/internal-chat/send",
  realtimeChannelPrefix: "internal-chat-live",
  navRealtimeChannel: "internal-chat-nav-badge-live",
  realtimeTables: ["internal_chat_rooms", "internal_chat_room_members", "internal_chat_messages"] as const,
})

export const MERCHANT_SUPPORT_ENGINE = Object.freeze({
  key: "merchant-support",
  navHrefSuffix: "/merchant-support",
  merchantUnreadCountEndpoint: "/api/merchant-support/unread-count",
  adminUnreadCountEndpoint: "/api/admin/merchant-support/unread-count",
  merchantRoomEndpoint: "/api/merchant-support/room",
  adminSnapshotEndpoint: "/api/admin/merchant-support/snapshot",
  merchantSendEndpoint: "/api/merchant-support/send",
  adminSendEndpoint: "/api/admin/merchant-support/send",
  realtimeChannelPrefix: "merchant-support-live",
  adminRealtimeChannel: "admin-merchant-support-live",
  realtimeTables: ["merchant_support_rooms", "merchant_support_messages"] as const,
})

