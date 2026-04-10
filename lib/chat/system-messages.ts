import type { SupabaseClient } from "@supabase/supabase-js"

const SYSTEM_CHAT_PREFIX = "__RF_SYSTEM__:"

export type PackageInquirySystemPayload = {
  type: "package_inquiry"
  packageId: string
}

export type BookingLinkedSystemPayload = {
  type: "booking_linked"
  bookingId: string
  bookingCode: string | null
}

export type ChatSystemPayload = PackageInquirySystemPayload | BookingLinkedSystemPayload

export function buildPackageInquirySystemMessage(payload: {
  packageId: string
}) {
  return `${SYSTEM_CHAT_PREFIX}${JSON.stringify({
    type: "package_inquiry",
    packageId: payload.packageId,
  } satisfies PackageInquirySystemPayload)}`
}

export function buildBookingLinkedSystemMessage(payload: {
  bookingId: string
  bookingCode?: string | null
}) {
  return `${SYSTEM_CHAT_PREFIX}${JSON.stringify({
    type: "booking_linked",
    bookingId: payload.bookingId,
    bookingCode: payload.bookingCode || null,
  } satisfies BookingLinkedSystemPayload)}`
}

export function parseChatSystemMessage(message: string | null | undefined): ChatSystemPayload | null {
  const text = String(message || "")
  if (!text.startsWith(SYSTEM_CHAT_PREFIX)) return null

  try {
    const parsed = JSON.parse(text.slice(SYSTEM_CHAT_PREFIX.length)) as Partial<ChatSystemPayload> | null
    if (!parsed) return null

    if (parsed.type === "package_inquiry" && "packageId" in parsed && parsed.packageId) {
      return {
        type: "package_inquiry",
        packageId: String(parsed.packageId),
      }
    }

    if (parsed.type !== "booking_linked" || !("bookingId" in parsed) || !parsed.bookingId) return null

    return {
      type: "booking_linked",
      bookingId: String(parsed.bookingId),
      bookingCode: "bookingCode" in parsed ? parsed.bookingCode || null : null,
    }
  } catch {
    return null
  }
}

export async function createSystemChatMessageIfMissing(
  supabase: SupabaseClient,
  payload: {
    roomId: string
    senderId: string
    message: string
  },
) {
  const { data: existingMessage } = await supabase
    .from("package_chat_messages")
    .select("id")
    .eq("room_id", payload.roomId)
    .eq("message", payload.message)
    .limit(1)
    .maybeSingle()

  if (existingMessage?.id) return null

  return supabase.from("package_chat_messages").insert({
    room_id: payload.roomId,
    sender_id: payload.senderId,
    message: payload.message,
  })
}
