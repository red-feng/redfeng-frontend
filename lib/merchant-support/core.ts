import { Resend } from "resend"
import { getOptionalEnv } from "@/lib/env"
import { getAdminResendFromEmail, getAdminSupportEmail } from "@/lib/contact-config"
import { isAdminPortalRole } from "@/lib/internal-roles"

type AdminSupabase = ReturnType<typeof import("@/lib/supabase/admin").createAdminClient>

export type MerchantSupportRoom = {
  id: string
  merchant_id: string
  merchant_user_id: string
  status: string
  created_at: string | null
  updated_at: string | null
  last_message_at: string | null
  last_message_sender_role: string | null
  merchant_last_read_at: string | null
  admin_last_read_at: string | null
}

export type MerchantSupportMessage = {
  id: string
  room_id: string
  sender_user_id: string | null
  sender_role: "merchant" | "admin" | "system"
  message: string
  created_at: string | null
}

export const MERCHANT_SUPPORT_PAGE_SIZE = 50

export type MerchantSupportRoomItem = {
  id: string
  merchantId: string
  merchantUserId: string
  merchantLabel: string
  merchantCode: string
  merchantEmail: string | null
  status: string
  updatedAt: string | null
  lastMessageAt: string | null
  lastMessageSenderRole: "merchant" | "admin" | "system" | null
  merchantLastReadAt: string | null
  adminLastReadAt: string | null
  lastMessagePreview: string | null
}

export type MerchantSupportMerchantContext = {
  merchantId: string
  merchantUserId: string
  merchantLabel: string
  merchantEmail: string | null
  merchantCode: string
}

export async function getMerchantSupportContextForUser(adminSupabase: AdminSupabase, userId: string) {
  const { data, error } = await adminSupabase
    .from("merchants")
    .select("id, user_id, brand_name, company_name, email")
    .eq("user_id", userId)
    .maybeSingle()

  if (error) {
    throw new Error(error.message || "Gagal membaca data merchant.")
  }

  const merchant = data as {
    id: string
    user_id: string
    brand_name: string | null
    company_name: string | null
    email: string | null
  } | null

  if (!merchant?.id) {
    throw new Error("Merchant tidak ditemukan.")
  }

  return {
    merchantId: merchant.id,
    merchantUserId: merchant.user_id,
    merchantLabel: merchant.brand_name || merchant.company_name || "Merchant",
    merchantEmail: merchant.email || null,
    merchantCode: `M-${merchant.id.slice(0, 8).toUpperCase()}`,
  } satisfies MerchantSupportMerchantContext
}

export async function ensureMerchantSupportRoom(
  adminSupabase: AdminSupabase,
  context: MerchantSupportMerchantContext,
) {
  const existingResult = await adminSupabase
    .from("merchant_support_rooms")
    .select("id, merchant_id, merchant_user_id, status, created_at, updated_at, last_message_at, last_message_sender_role, merchant_last_read_at, admin_last_read_at")
    .eq("merchant_id", context.merchantId)
    .maybeSingle()

  if (existingResult.error) {
    throw new Error(existingResult.error.message || "Gagal membaca room bantuan merchant.")
  }

  let room = existingResult.data as MerchantSupportRoom | null

  if (!room) {
    const nowIso = new Date().toISOString()
    const createdRoomResult = await adminSupabase
      .from("merchant_support_rooms")
      .insert({
        merchant_id: context.merchantId,
        merchant_user_id: context.merchantUserId,
        status: "open",
        updated_at: nowIso,
        merchant_last_read_at: nowIso,
      })
      .select("id, merchant_id, merchant_user_id, status, created_at, updated_at, last_message_at, last_message_sender_role, merchant_last_read_at, admin_last_read_at")
      .single()

    if (createdRoomResult.error || !createdRoomResult.data) {
      throw new Error(createdRoomResult.error?.message || "Gagal membuat room bantuan merchant.")
    }

    room = createdRoomResult.data as MerchantSupportRoom

    await adminSupabase.from("merchant_support_messages").insert({
      room_id: room.id,
      sender_role: "system",
      message:
        "Halo, ini kanal bantuan merchant Red Feng. Jelaskan kendala Anda terkait verifikasi, paket, booking, atau payout, lalu tim admin akan menindaklanjuti.",
    })
  }

  return room
}

export async function loadMerchantSupportMessages(adminSupabase: AdminSupabase, roomId: string) {
  const { data, error } = await adminSupabase
    .from("merchant_support_messages")
    .select("id, room_id, sender_user_id, sender_role, message, created_at")
    .eq("room_id", roomId)
    .order("created_at", { ascending: true })

  if (error) {
    throw new Error(error.message || "Gagal membaca pesan bantuan merchant.")
  }

  return ((data as MerchantSupportMessage[] | null) || []).map((message) => ({
    ...message,
    sender_role: message.sender_role as MerchantSupportMessage["sender_role"],
  }))
}

export async function loadMerchantSupportMessagesPage(
  adminSupabase: AdminSupabase,
  roomId: string,
  options?: {
    beforeCreatedAt?: string | null
    limit?: number
  },
) {
  const requestedLimit = Number(options?.limit || MERCHANT_SUPPORT_PAGE_SIZE)
  const safeLimit = Number.isFinite(requestedLimit)
    ? Math.min(Math.max(Math.trunc(requestedLimit), 10), 200)
    : MERCHANT_SUPPORT_PAGE_SIZE

  let query = adminSupabase
    .from("merchant_support_messages")
    .select("id, room_id, sender_user_id, sender_role, message, created_at")
    .eq("room_id", roomId)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(safeLimit + 1)

  const beforeCreatedAt = String(options?.beforeCreatedAt || "").trim()
  if (beforeCreatedAt) {
    query = query.lt("created_at", beforeCreatedAt)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(error.message || "Gagal membaca pesan bantuan merchant.")
  }

  const descRows = ((data as MerchantSupportMessage[] | null) || []).map((message) => ({
    ...message,
    sender_role: message.sender_role as MerchantSupportMessage["sender_role"],
  }))
  const hasMore = descRows.length > safeLimit
  const limited = hasMore ? descRows.slice(0, safeLimit) : descRows
  const messages = [...limited].sort((left, right) => {
    const leftDate = left.created_at || ""
    const rightDate = right.created_at || ""
    if (leftDate === rightDate) return left.id.localeCompare(right.id)
    return leftDate.localeCompare(rightDate)
  })

  return {
    messages,
    hasMore,
    oldestCreatedAt: messages[0]?.created_at || null,
  }
}

export async function markMerchantSupportRoomReadByMerchant(
  adminSupabase: AdminSupabase,
  roomId: string,
  readAtIso = new Date().toISOString(),
) {
  const { error } = await adminSupabase
    .from("merchant_support_rooms")
    .update({ merchant_last_read_at: readAtIso })
    .eq("id", roomId)

  if (error) {
    throw new Error(error.message || "Gagal update status baca merchant support.")
  }
}

export async function notifyAdminAboutMerchantSupportMessage(input: {
  merchantLabel: string
  merchantCode: string
  merchantEmail: string | null
  message: string
}) {
  const resendApiKey = getOptionalEnv("RESEND_API_KEY")
  if (!resendApiKey) return

  const resend = new Resend(resendApiKey)
  const preview = input.message.length > 500 ? `${input.message.slice(0, 500)}...` : input.message
  const safePreview = preview.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")

  await resend.emails.send({
    from: getAdminResendFromEmail(),
    to: getAdminSupportEmail(),
    subject: `Merchant Support Baru - ${input.merchantLabel} (${input.merchantCode})`,
    html: `
      <div style="font-family:'Segoe UI',sans-serif;line-height:1.7;color:#0f172a;">
        <h2 style="margin:0 0 10px;">Pesan bantuan merchant baru</h2>
        <p style="margin:0 0 8px;"><strong>Merchant:</strong> ${input.merchantLabel}</p>
        <p style="margin:0 0 8px;"><strong>Kode merchant:</strong> ${input.merchantCode}</p>
        <p style="margin:0 0 8px;"><strong>Email:</strong> ${input.merchantEmail || "-"}</p>
        <div style="margin-top:16px;padding:14px 16px;border:1px solid #fed7aa;border-radius:14px;background:#fff7ed;">
          <p style="margin:0;white-space:pre-line;">${safePreview}</p>
        </div>
      </div>
    `,
  })
}

export async function getAdminMerchantSupportAccessProfile(adminSupabase: AdminSupabase, userId: string) {
  const { data, error } = await adminSupabase
    .from("profiles")
    .select("id, role")
    .eq("id", userId)
    .maybeSingle()

  if (error) {
    throw new Error(error.message || "Gagal membaca profil admin.")
  }

  const profile = data as { id: string; role: string | null } | null
  const role = String(profile?.role || "")
  if (!profile?.id || (!isAdminPortalRole(role) && role !== "superadmin")) {
    return null
  }

  return profile
}

export async function loadMerchantSupportRoomsForAdmin(adminSupabase: AdminSupabase) {
  const { data: roomRows, error: roomError } = await adminSupabase
    .from("merchant_support_rooms")
    .select("id, merchant_id, merchant_user_id, status, updated_at, last_message_at, last_message_sender_role, merchant_last_read_at, admin_last_read_at")
    .order("last_message_at", { ascending: false, nullsFirst: false })
    .order("updated_at", { ascending: false })

  if (roomError) {
    throw new Error(roomError.message || "Gagal membaca room merchant support.")
  }

  const rooms = (roomRows as Array<{
    id: string
    merchant_id: string
    merchant_user_id: string
    status: string
    updated_at: string | null
    last_message_at: string | null
    last_message_sender_role: "merchant" | "admin" | "system" | null
    merchant_last_read_at: string | null
    admin_last_read_at: string | null
  }> | null) || []

  if (rooms.length === 0) return [] as MerchantSupportRoomItem[]

  const merchantIds = [...new Set(rooms.map((room) => room.merchant_id))]
  const roomIds = rooms.map((room) => room.id)

  const [merchantResult, latestMessagesResult] = await Promise.all([
    adminSupabase
      .from("merchants")
      .select("id, user_id, brand_name, company_name, email")
      .in("id", merchantIds),
    adminSupabase
      .from("merchant_support_messages")
      .select("room_id, message, created_at")
      .in("room_id", roomIds)
      .order("created_at", { ascending: false }),
  ])

  if (merchantResult.error) {
    throw new Error(merchantResult.error.message || "Gagal membaca merchant room support.")
  }

  if (latestMessagesResult.error) {
    throw new Error(latestMessagesResult.error.message || "Gagal membaca preview merchant support.")
  }

  const merchantMap = new Map(
    (((merchantResult.data as Array<{
      id: string
      user_id: string
      brand_name: string | null
      company_name: string | null
      email: string | null
    }> | null) || [])).map((merchant) => [
      merchant.id,
      {
        merchantLabel: merchant.brand_name || merchant.company_name || "Merchant",
        merchantCode: `M-${merchant.id.slice(0, 8).toUpperCase()}`,
        merchantEmail: merchant.email || null,
        merchantUserId: merchant.user_id,
      },
    ]),
  )

  const latestMessageMap = new Map<string, string>()
  for (const row of ((latestMessagesResult.data as Array<{ room_id: string; message: string; created_at: string | null }> | null) || [])) {
    if (!row.room_id || latestMessageMap.has(row.room_id)) continue
    latestMessageMap.set(row.room_id, row.message || "")
  }

  return rooms.map((room) => {
    const merchant = merchantMap.get(room.merchant_id)
    return {
      id: room.id,
      merchantId: room.merchant_id,
      merchantUserId: merchant?.merchantUserId || room.merchant_user_id,
      merchantLabel: merchant?.merchantLabel || "Merchant",
      merchantCode: merchant?.merchantCode || `M-${room.merchant_id.slice(0, 8).toUpperCase()}`,
      merchantEmail: merchant?.merchantEmail || null,
      status: room.status,
      updatedAt: room.updated_at,
      lastMessageAt: room.last_message_at,
      lastMessageSenderRole: room.last_message_sender_role,
      merchantLastReadAt: room.merchant_last_read_at,
      adminLastReadAt: room.admin_last_read_at,
      lastMessagePreview: latestMessageMap.get(room.id) || null,
    } satisfies MerchantSupportRoomItem
  })
}

export function getMerchantSupportUnreadCountForAdmin(rooms: MerchantSupportRoomItem[]) {
  return rooms.filter((room) => {
    if (room.lastMessageSenderRole !== "merchant") return false
    if (!room.lastMessageAt) return false
    if (!room.adminLastReadAt) return true
    return room.lastMessageAt > room.adminLastReadAt
  }).length
}

export async function markMerchantSupportRoomReadByAdmin(
  adminSupabase: AdminSupabase,
  roomId: string,
  readAtIso = new Date().toISOString(),
) {
  const { error } = await adminSupabase
    .from("merchant_support_rooms")
    .update({ admin_last_read_at: readAtIso })
    .eq("id", roomId)

  if (error) {
    throw new Error(error.message || "Gagal update status baca admin support.")
  }
}
