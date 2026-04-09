export type ChatParticipantPortal = "customer" | "merchant"

export const CHAT_ROOM_HIDE_FIELD = {
  customer: "customer_hidden_at",
  merchant: "merchant_hidden_at",
} as const

// Inbox removal must stay soft-hide per participant.
// We never delete room/message history from this flow.
// Any new message should reopen the room for both sides.
export function buildHideRoomPatch(portal: ChatParticipantPortal, atIso: string) {
  return {
    [CHAT_ROOM_HIDE_FIELD[portal]]: atIso,
  }
}

export function buildReopenRoomPatch(portal: ChatParticipantPortal, atIso: string, userId: string) {
  if (portal === "merchant") {
    return {
      updated_at: atIso,
      last_message_at: atIso,
      last_message_sender_id: userId,
      merchant_last_read_at: atIso,
      merchant_hidden_at: null,
      customer_hidden_at: null,
    }
  }

  return {
    updated_at: atIso,
    last_message_at: atIso,
    last_message_sender_id: userId,
    customer_last_read_at: atIso,
    customer_hidden_at: null,
    merchant_hidden_at: null,
  }
}
