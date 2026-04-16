import type { SupabaseClient } from "@supabase/supabase-js"
import {
  buildBookingLinkedSystemMessage,
  buildPackageInquirySystemMessage,
  createSystemChatMessageIfMissing,
} from "@/lib/chat/system-messages"
import { decideBookingRoomResolution, decidePackageRoomResolution } from "@/lib/chat/customer-room-policy.mjs"

type BookingChatRow = {
  id: string
  package_id: string | null
  customer_email: string | null
  booking_code?: string | null
  payment_status?: string | null
}

type PackageMerchantRow = {
  merchant_id: string | null
}

type MerchantOwnerRow = {
  user_id: string | null
}

type RoomIdRow = {
  id: string
}

export class ChatRoomFlowError extends Error {
  code:
    | "invalid_booking"
    | "invalid_package"
    | "merchant_not_ready"
    | "migration_missing"
    | "room_link_failed"
    | "room_create_failed"

  constructor(
    code: ChatRoomFlowError["code"],
    message: string,
  ) {
    super(message)
    this.name = "ChatRoomFlowError"
    this.code = code
  }
}

async function getMerchantUserIdForPackage(
  supabase: SupabaseClient,
  packageId: string,
) {
  const { data: pkg, error: packageError } = await supabase
    .from("packages")
    .select("merchant_id")
    .eq("id", packageId)
    .single<PackageMerchantRow>()

  if (packageError || !pkg?.merchant_id) {
    throw new ChatRoomFlowError("invalid_package", "Package tidak valid untuk chat.")
  }

  const { data: merchantOwner, error: merchantError } = await supabase
    .from("merchants")
    .select("user_id")
    .eq("id", pkg.merchant_id)
    .single<MerchantOwnerRow>()

  if (merchantError || !merchantOwner?.user_id) {
    throw new ChatRoomFlowError("merchant_not_ready", "Merchant belum siap menerima chat.")
  }

  return merchantOwner.user_id
}

async function findLatestPackageRoom(
  supabase: SupabaseClient,
  params: {
    packageId: string
    customerId: string
    merchantUserId: string
  },
) {
  const { data: room } = await supabase
    .from("package_chat_rooms")
    .select("id")
    .eq("package_id", params.packageId)
    .eq("customer_id", params.customerId)
    .eq("merchant_user_id", params.merchantUserId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle<RoomIdRow>()

  return room?.id || null
}

function classifyRoomMutationError(
  errorMessage: string | null | undefined,
  fallbackMessage: string,
) {
  const text = String(errorMessage || "")
  if (text.includes("does not exist") || text.includes("booking_id")) {
    return new ChatRoomFlowError("migration_missing", text || fallbackMessage)
  }
  return new ChatRoomFlowError("room_create_failed", text || fallbackMessage)
}

function isPaidBookingStatus(value: string | null | undefined) {
  const normalized = String(value || "").trim().toLowerCase()
  return normalized === "paid" || normalized === "dp_paid"
}

export async function ensureCustomerPackageChatRoom(
  supabase: SupabaseClient,
  params: {
    packageId: string
    customerId: string
    senderId: string
    markCustomerRead?: boolean
  },
) {
  const merchantUserId = await getMerchantUserIdForPackage(supabase, params.packageId)
  const existingRoomId = await findLatestPackageRoom(supabase, {
    packageId: params.packageId,
    customerId: params.customerId,
    merchantUserId,
  })

  if (decidePackageRoomResolution({ hasExistingPackageRoom: Boolean(existingRoomId) }) === "reuse_package_room") {
    await createSystemChatMessageIfMissing(supabase, {
      roomId: existingRoomId as string,
      senderId: params.senderId,
      message: buildPackageInquirySystemMessage({ packageId: params.packageId }),
    })
    return { roomId: existingRoomId as string, created: false, merchantUserId }
  }

  const nowIso = new Date().toISOString()
  const insertPayload: Record<string, string> = {
    package_id: params.packageId,
    customer_id: params.customerId,
    merchant_user_id: merchantUserId,
  }
  if (params.markCustomerRead) {
    insertPayload.customer_last_read_at = nowIso
  }

  let { data: newRoom, error: createRoomError } = await supabase
    .from("package_chat_rooms")
    .insert(insertPayload)
    .select("id")
    .single<RoomIdRow>()

  if (createRoomError && createRoomError.message.includes("customer_last_read_at")) {
    const fallbackRoom = await supabase
      .from("package_chat_rooms")
      .insert({
        package_id: params.packageId,
        customer_id: params.customerId,
        merchant_user_id: merchantUserId,
      })
      .select("id")
      .single<RoomIdRow>()
    newRoom = fallbackRoom.data
    createRoomError = fallbackRoom.error
  }

  if (createRoomError || !newRoom?.id) {
    throw classifyRoomMutationError(createRoomError?.message, "Ruang chat tidak dapat dibuat.")
  }

  await createSystemChatMessageIfMissing(supabase, {
    roomId: newRoom.id,
    senderId: params.senderId,
    message: buildPackageInquirySystemMessage({ packageId: params.packageId }),
  })

  return { roomId: newRoom.id, created: true, merchantUserId }
}

export async function ensureCustomerBookingChatRoom(
  supabase: SupabaseClient,
  params: {
    bookingId: string
    customerId: string
    customerEmail: string | null | undefined
    senderId: string
    markCustomerRead?: boolean
    touchUpdatedAt?: boolean
  },
) {
  const { data: booking, error: bookingError } = await supabase
    .from("bookings")
    .select("id, package_id, customer_email, booking_code, payment_status")
    .eq("id", params.bookingId)
    .single<BookingChatRow>()

  if (bookingError || !booking?.package_id || !params.customerEmail || booking.customer_email !== params.customerEmail) {
    throw new ChatRoomFlowError("invalid_booking", "Booking tidak valid untuk chat.")
  }

  const merchantUserId = await getMerchantUserIdForPackage(supabase, booking.package_id)
  const { data: existingBookingRoom } = await supabase
    .from("package_chat_rooms")
    .select("id")
    .eq("booking_id", params.bookingId)
    .eq("customer_id", params.customerId)
    .eq("merchant_user_id", merchantUserId)
    .maybeSingle<RoomIdRow>()

  const bookingStrategy = decideBookingRoomResolution({
    hasExistingBookingRoom: Boolean(existingBookingRoom?.id),
    hasExistingPackageRoom: false,
  })
  const shouldCreateBookingMarker = isPaidBookingStatus(booking.payment_status)

  if (bookingStrategy === "reuse_booking_room" && existingBookingRoom?.id) {
    if (shouldCreateBookingMarker) {
      await createSystemChatMessageIfMissing(supabase, {
        roomId: existingBookingRoom.id,
        senderId: params.senderId,
        message: buildBookingLinkedSystemMessage({
          bookingId: params.bookingId,
          bookingCode: booking.booking_code || null,
        }),
      })
    }
    if (params.touchUpdatedAt) {
      await supabase
        .from("package_chat_rooms")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", existingBookingRoom.id)
    }
    return {
      roomId: existingBookingRoom.id,
      packageId: booking.package_id,
      bookingCode: booking.booking_code || null,
      merchantUserId,
      created: false,
      linkedExistingPackageRoom: false,
    }
  }

  const sourceRoomId = await findLatestPackageRoom(supabase, {
    packageId: booking.package_id,
    customerId: params.customerId,
    merchantUserId,
  })

  const nowIso = new Date().toISOString()
  const sourceRoomStrategy = decideBookingRoomResolution({
    hasExistingBookingRoom: false,
    hasExistingPackageRoom: Boolean(sourceRoomId),
  })
  if (sourceRoomStrategy === "link_existing_package_room" && sourceRoomId) {
    const updatePayload: Record<string, string> = {
      booking_id: params.bookingId,
      updated_at: nowIso,
    }
    if (params.markCustomerRead) {
      updatePayload.customer_last_read_at = nowIso
    }

    const { error: linkRoomError } = await supabase
      .from("package_chat_rooms")
      .update(updatePayload)
      .eq("id", sourceRoomId)

    if (linkRoomError) {
      const code = linkRoomError.message.includes("booking_id") ? "migration_missing" : "room_link_failed"
      throw new ChatRoomFlowError(code, linkRoomError.message || "Ruang chat booking tidak dapat dipakai.")
    }

    if (shouldCreateBookingMarker) {
      await createSystemChatMessageIfMissing(supabase, {
        roomId: sourceRoomId,
        senderId: params.senderId,
        message: buildBookingLinkedSystemMessage({
          bookingId: params.bookingId,
          bookingCode: booking.booking_code || null,
        }),
      })
    }

    return {
      roomId: sourceRoomId,
      packageId: booking.package_id,
      bookingCode: booking.booking_code || null,
      merchantUserId,
      created: false,
      linkedExistingPackageRoom: true,
    }
  }

  const insertPayload: Record<string, string> = {
    package_id: booking.package_id,
    customer_id: params.customerId,
    merchant_user_id: merchantUserId,
    booking_id: params.bookingId,
  }
  if (params.markCustomerRead) {
    insertPayload.customer_last_read_at = nowIso
  }

  let { data: newRoom, error: createRoomError } = await supabase
    .from("package_chat_rooms")
    .insert(insertPayload)
    .select("id")
    .single<RoomIdRow>()

  if (createRoomError && createRoomError.message.includes("customer_last_read_at")) {
    const fallbackRoom = await supabase
      .from("package_chat_rooms")
      .insert({
        package_id: booking.package_id,
        customer_id: params.customerId,
        merchant_user_id: merchantUserId,
        booking_id: params.bookingId,
      })
      .select("id")
      .single<RoomIdRow>()
    newRoom = fallbackRoom.data
    createRoomError = fallbackRoom.error
  }

  if (createRoomError || !newRoom?.id) {
    throw classifyRoomMutationError(createRoomError?.message, "Ruang chat booking tidak dapat dibuat.")
  }

  if (shouldCreateBookingMarker) {
    await createSystemChatMessageIfMissing(supabase, {
      roomId: newRoom.id,
      senderId: params.senderId,
      message: buildBookingLinkedSystemMessage({
        bookingId: params.bookingId,
        bookingCode: booking.booking_code || null,
      }),
    })
  }

  return {
    roomId: newRoom.id,
    packageId: booking.package_id,
    bookingCode: booking.booking_code || null,
    merchantUserId,
    created: true,
    linkedExistingPackageRoom: false,
  }
}
