import { isInternalRole } from "@/lib/internal-roles"
import { uploadCommerceChatAttachment } from "@/lib/commerce-chat/attachments"
import {
  canDeleteCommerceThread,
  decideCommerceInquiryThreadResolution,
  isCommerceThreadUnreadForActor,
} from "@/lib/commerce-chat/policy.mjs"

type AdminSupabase = ReturnType<typeof import("@/lib/supabase/admin").createAdminClient>

type CommerceProfileRow = {
  id: string
  username: string | null
  role: string | null
}

type CommerceMerchantRow = {
  id: string
  user_id: string
  brand_name: string | null
  company_name: string | null
  email: string | null
}

type CommercePackageRow = {
  id: string
  title: string | null
  merchant_id: string | null
}

export type CommerceChatActorRole = "customer" | "merchant"

export type CommerceChatThreadRow = {
  id: string
  thread_type: "inquiry" | "booking"
  source_context: "public_package" | "checkout" | "booking" | "reorder"
  subject_package_id: string | null
  subject_booking_id: string | null
  customer_user_id: string
  merchant_id: string
  merchant_user_id: string
  status: "open" | "archived" | "blocked" | "resolved"
  safety_state: "normal" | "flagged" | "frozen"
  created_at: string | null
  updated_at: string | null
  last_message_at: string | null
  last_message_sender_role: "customer" | "merchant" | "system" | null
  customer_last_read_at: string | null
  merchant_last_read_at: string | null
  deleted_for_all_at: string | null
  deleted_by_user_id: string | null
  deleted_by_role: "customer" | "merchant" | null
  purge_after_at: string | null
}

type CommerceMessagePreviewRow = {
  thread_id: string
  body: string
  created_at: string | null
}

export type CommerceChatMessageItem = {
  id: string
  thread_id: string
  sender_user_id: string | null
  sender_role: "customer" | "merchant" | "system"
  message_type: "text" | "attachment" | "system_event"
  body: string
  attachment_url: string | null
  attachment_name: string | null
  attachment_mime_type: string | null
  moderation_state: "clean" | "flagged" | "blocked"
  client_message_id: string | null
  created_at: string | null
}

export type CommerceChatThreadItem = {
  id: string
  threadType: "inquiry" | "booking"
  sourceContext: "public_package" | "checkout" | "booking" | "reorder"
  subjectPackageId: string | null
  subjectBookingId: string | null
  customerUserId: string
  merchantId: string
  merchantUserId: string
  merchantLabel: string
  customerLabel: string
  packageTitle: string | null
  status: "open" | "archived" | "blocked" | "resolved"
  safetyState: "normal" | "flagged" | "frozen"
  createdAt: string | null
  updatedAt: string | null
  lastMessageAt: string | null
  lastMessageSenderRole: "customer" | "merchant" | "system" | null
  currentUserActorRole: CommerceChatActorRole
  currentUserLastReadAt: string | null
  lastMessagePreview: string | null
}

export const COMMERCE_CHAT_DELETED_NOTICE = "Room chat ini telah dihapus."

type CommerceChatThreadDeletionRow = {
  thread_id: string
  thread_type: "inquiry" | "booking" | null
  subject_package_id: string | null
  subject_booking_id: string | null
  customer_user_id: string
  merchant_id: string
  merchant_user_id: string
  deleted_by_user_id: string | null
  deleted_by_role: CommerceChatActorRole
  created_at: string | null
}

export const COMMERCE_CHAT_PAGE_SIZE = 50
export const COMMERCE_CHAT_ROLE_POLICY_VERSION = "2026-04-17"
const COMMERCE_CHAT_RECENT_DELETE_GUARD_WINDOW_MS = 30 * 60 * 1000
const COMMERCE_CHAT_PURGE_AFTER_DELETE_MS = 30 * 24 * 60 * 60 * 1000

function isMissingCommerceThreadDeletionTableError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error || "")
  return /commerce_chat_thread_deletions/i.test(message) && /does not exist|relation|column/i.test(message)
}

async function wasCommerceInquiryThreadRecentlyDeleted(
  adminSupabase: AdminSupabase,
  params: {
    customerUserId: string
    merchantId: string
    packageId: string
  },
) {
  const cutoffIso = new Date(Date.now() - COMMERCE_CHAT_RECENT_DELETE_GUARD_WINDOW_MS).toISOString()
  const { data, error } = await adminSupabase
    .from("commerce_chat_thread_deletions")
    .select("thread_id")
    .eq("thread_type", "inquiry")
    .eq("customer_user_id", params.customerUserId)
    .eq("merchant_id", params.merchantId)
    .eq("subject_package_id", params.packageId)
    .gte("created_at", cutoffIso)
    .order("created_at", { ascending: false })
    .limit(1)

  if (error) {
    if (isMissingCommerceThreadDeletionTableError(error)) {
      return false
    }
    throw new Error(error.message || "Gagal membaca status penghapusan inquiry commerce.")
  }

  return Boolean(((data as Array<{ thread_id: string }> | null) || [])[0]?.thread_id)
}

function getMerchantLabel(merchant: Pick<CommerceMerchantRow, "brand_name" | "company_name" | "id"> | null | undefined) {
  if (!merchant) return "Merchant"
  return merchant.brand_name || merchant.company_name || `Merchant ${merchant.id.slice(0, 8).toUpperCase()}`
}

export async function getCommerceChatProfile(adminSupabase: AdminSupabase, userId: string) {
  const { data, error } = await adminSupabase
    .from("profiles")
    .select("id, username, role")
    .eq("id", userId)
    .maybeSingle()

  if (error) {
    throw new Error(error.message || "Gagal membaca profil akun.")
  }

  return (data as CommerceProfileRow | null) || null
}

export function isBlockedCommerceProfileRole(role: string | null | undefined) {
  return isInternalRole(role)
}

export async function getOwnedMerchantsForUser(adminSupabase: AdminSupabase, userId: string) {
  const { data, error } = await adminSupabase
    .from("merchants")
    .select("id, user_id, brand_name, company_name, email")
    .eq("user_id", userId)

  if (error) {
    throw new Error(error.message || "Gagal membaca data merchant.")
  }

  return ((data as CommerceMerchantRow[] | null) || []).filter((merchant) => merchant.user_id === userId)
}

export function resolveCommerceThreadActorRole(
  userId: string,
  thread: Pick<CommerceChatThreadRow, "customer_user_id" | "merchant_user_id" | "merchant_id">,
  ownedMerchantIds: ReadonlySet<string>,
): CommerceChatActorRole | null {
  if (thread.customer_user_id === userId) {
    return "customer"
  }

  if (thread.merchant_user_id === userId && ownedMerchantIds.has(thread.merchant_id)) {
    return "merchant"
  }

  return null
}

function sortThreadsByActivity(threads: CommerceChatThreadItem[]) {
  return [...threads].sort((left, right) => {
    const leftDate = left.lastMessageAt || left.updatedAt || left.createdAt || ""
    const rightDate = right.lastMessageAt || right.updatedAt || right.createdAt || ""
    return rightDate.localeCompare(leftDate)
  })
}

function getCommerceThreadActivityRank(thread: Pick<CommerceChatThreadRow, "last_message_at" | "updated_at" | "created_at" | "id">) {
  return `${thread.last_message_at || thread.updated_at || thread.created_at || ""}::${thread.updated_at || ""}::${thread.created_at || ""}::${thread.id}`
}

function isPreferredCommerceThreadRow(
  candidate: CommerceChatThreadRow,
  current: CommerceChatThreadRow | undefined,
) {
  if (!current) return true
  return getCommerceThreadActivityRank(candidate).localeCompare(getCommerceThreadActivityRank(current)) > 0
}

function getCommerceThreadLogicalKey(
  thread: Pick<CommerceChatThreadRow, "thread_type" | "subject_booking_id" | "subject_package_id" | "customer_user_id" | "merchant_id" | "id">,
) {
  if (thread.thread_type === "booking" && thread.subject_booking_id) {
    return `booking:${thread.subject_booking_id}`
  }
  if (thread.thread_type === "inquiry" && thread.subject_package_id) {
    return `inquiry:${thread.customer_user_id}:${thread.merchant_id}:${thread.subject_package_id}`
  }
  return `thread:${thread.id}`
}

async function getPackagesByIds(adminSupabase: AdminSupabase, packageIds: string[]) {
  if (packageIds.length === 0) return new Map<string, CommercePackageRow>()

  const { data, error } = await adminSupabase
    .from("packages")
    .select("id, title, merchant_id")
    .in("id", packageIds)

  if (error) {
    throw new Error(error.message || "Gagal membaca data paket chat commerce.")
  }

  return new Map(
    (((data as CommercePackageRow[] | null) || [])).map((pkg) => [pkg.id, pkg]),
  )
}

async function getMerchantMapByIds(adminSupabase: AdminSupabase, merchantIds: string[]) {
  if (merchantIds.length === 0) return new Map<string, CommerceMerchantRow>()

  const { data, error } = await adminSupabase
    .from("merchants")
    .select("id, user_id, brand_name, company_name, email")
    .in("id", merchantIds)

  if (error) {
    throw new Error(error.message || "Gagal membaca merchant chat commerce.")
  }

  return new Map(
    (((data as CommerceMerchantRow[] | null) || [])).map((merchant) => [merchant.id, merchant]),
  )
}

async function getProfileMapByIds(adminSupabase: AdminSupabase, userIds: string[]) {
  if (userIds.length === 0) return new Map<string, CommerceProfileRow>()

  const { data, error } = await adminSupabase
    .from("profiles")
    .select("id, username, role")
    .in("id", userIds)

  if (error) {
    throw new Error(error.message || "Gagal membaca profil participant commerce chat.")
  }

  return new Map(
    (((data as CommerceProfileRow[] | null) || [])).map((profile) => [profile.id, profile]),
  )
}

async function getLatestMessageMap(adminSupabase: AdminSupabase, threadIds: string[]) {
  if (threadIds.length === 0) return new Map<string, CommerceMessagePreviewRow>()

  const { data, error } = await adminSupabase
    .from("commerce_chat_messages")
    .select("thread_id, body, created_at")
    .in("thread_id", threadIds)
    .order("created_at", { ascending: false })

  if (error) {
    throw new Error(error.message || "Gagal membaca preview commerce chat.")
  }

  const latestMap = new Map<string, CommerceMessagePreviewRow>()
  for (const row of (data as CommerceMessagePreviewRow[] | null) || []) {
    if (!row.thread_id || latestMap.has(row.thread_id)) continue
    latestMap.set(row.thread_id, row)
  }

  return latestMap
}

export async function ensureCommerceInquiryThread(
  adminSupabase: AdminSupabase,
  params: {
    customerUserId: string
    packageId: string
    sourceContext?: CommerceChatThreadRow["source_context"]
  },
) {
  const { data: pkg, error: packageError } = await adminSupabase
    .from("packages")
    .select("id, title, merchant_id")
    .eq("id", params.packageId)
    .maybeSingle()

  if (packageError) {
    throw new Error(packageError.message || "Gagal membaca paket chat commerce.")
  }

  const packageRow = (pkg as CommercePackageRow | null) || null
  if (!packageRow?.id || !packageRow.merchant_id) {
    throw new Error("Paket tidak valid untuk memulai chat.")
  }

  const { data: merchantData, error: merchantError } = await adminSupabase
    .from("merchants")
    .select("id, user_id, brand_name, company_name, email")
    .eq("id", packageRow.merchant_id)
    .maybeSingle()

  if (merchantError) {
    throw new Error(merchantError.message || "Gagal membaca merchant paket.")
  }

  const merchant = (merchantData as CommerceMerchantRow | null) || null
  if (!merchant?.id || !merchant.user_id) {
    throw new Error("Merchant belum siap menerima chat.")
  }

  if (merchant.user_id === params.customerUserId) {
    throw new Error("Akun merchant tidak dapat membuka chat inquiry sebagai customer.")
  }

  const { data: existingThreads, error: existingError } = await adminSupabase
    .from("commerce_chat_threads")
    .select("id, created_at, updated_at, last_message_at")
    .eq("thread_type", "inquiry")
    .eq("subject_package_id", params.packageId)
    .eq("customer_user_id", params.customerUserId)
    .eq("merchant_id", merchant.id)
    .is("deleted_for_all_at", null)
    .order("last_message_at", { ascending: false, nullsFirst: false })
    .order("updated_at", { ascending: false })
    .order("created_at", { ascending: false })

  if (existingError) {
    throw new Error(existingError.message || "Gagal membaca thread inquiry commerce.")
  }

  const existingThread = ((existingThreads as Array<{ id: string }> | null) || [])[0] || null

  if (decideCommerceInquiryThreadResolution({ hasExistingInquiryThread: Boolean(existingThread?.id) }) === "reuse_inquiry_thread") {
    return {
      threadId: existingThread?.id as string,
      created: false,
    }
  }

  const wasRecentlyDeleted = await wasCommerceInquiryThreadRecentlyDeleted(adminSupabase, {
    customerUserId: params.customerUserId,
    merchantId: merchant.id,
    packageId: params.packageId,
  })

  if (wasRecentlyDeleted) {
    throw new Error("Room chat untuk paket ini baru saja dihapus. Silakan tunggu sebentar sebelum membuat thread baru.")
  }

  const nowIso = new Date().toISOString()
  const { data: createdThread, error: createError } = await adminSupabase
    .from("commerce_chat_threads")
    .insert({
      thread_type: "inquiry",
      source_context: params.sourceContext || "public_package",
      subject_package_id: params.packageId,
      customer_user_id: params.customerUserId,
      merchant_id: merchant.id,
      merchant_user_id: merchant.user_id,
      status: "open",
      safety_state: "normal",
      customer_last_read_at: nowIso,
    })
    .select("id")
    .single()

  if (createError || !createdThread?.id) {
    throw new Error(createError?.message || "Gagal membuat thread inquiry commerce.")
  }

  const systemBody = `Thread inquiry dibuat untuk paket "${packageRow.title || "Paket"}".`
  const { data: systemMessage, error: systemMessageError } = await adminSupabase
    .from("commerce_chat_messages")
    .insert({
      thread_id: createdThread.id,
      sender_role: "system",
      message_type: "system_event",
      body: systemBody,
      moderation_state: "clean",
    })
    .select("created_at")
    .single()

  if (systemMessageError) {
    throw new Error(systemMessageError.message || "Gagal membuat pesan sistem inquiry commerce.")
  }

  const systemCreatedAt = systemMessage?.created_at || nowIso
  const { error: updateError } = await adminSupabase
    .from("commerce_chat_threads")
    .update({
      updated_at: systemCreatedAt,
      last_message_at: systemCreatedAt,
      last_message_sender_role: "system",
    })
    .eq("id", createdThread.id)

  if (updateError) {
    throw new Error(updateError.message || "Gagal memperbarui thread inquiry commerce.")
  }

  const { error: eventError } = await adminSupabase
    .from("commerce_chat_events")
    .insert({
      thread_id: createdThread.id,
      actor_user_id: params.customerUserId,
      event_type: "created",
      payload_json: {
        thread_type: "inquiry",
        source_context: params.sourceContext || "public_package",
        package_id: params.packageId,
      },
    })

  if (eventError) {
    console.error("[commerce-chat] failed to persist inquiry thread event", {
      threadId: createdThread.id,
      customerUserId: params.customerUserId,
      packageId: params.packageId,
      sourceContext: params.sourceContext || "public_package",
      error: eventError.message || "Unknown commerce chat event insert error",
    })
  }

  return {
    threadId: createdThread.id,
    created: true,
  }
}

async function getAccessibleThreadsForUser(adminSupabase: AdminSupabase, userId: string) {
  const ownedMerchants = await getOwnedMerchantsForUser(adminSupabase, userId)
  const ownedMerchantIds = new Set(ownedMerchants.map((merchant) => merchant.id))

  const customerThreadsPromise = adminSupabase
    .from("commerce_chat_threads")
    .select("id, thread_type, source_context, subject_package_id, subject_booking_id, customer_user_id, merchant_id, merchant_user_id, status, safety_state, created_at, updated_at, last_message_at, last_message_sender_role, customer_last_read_at, merchant_last_read_at, deleted_for_all_at, deleted_by_user_id, deleted_by_role, purge_after_at")
    .eq("customer_user_id", userId)
    .is("deleted_for_all_at", null)

  const merchantThreadsPromise = ownedMerchants.length
    ? adminSupabase
        .from("commerce_chat_threads")
        .select("id, thread_type, source_context, subject_package_id, subject_booking_id, customer_user_id, merchant_id, merchant_user_id, status, safety_state, created_at, updated_at, last_message_at, last_message_sender_role, customer_last_read_at, merchant_last_read_at, deleted_for_all_at, deleted_by_user_id, deleted_by_role, purge_after_at")
        .eq("merchant_user_id", userId)
        .is("deleted_for_all_at", null)
    : Promise.resolve({ data: [] as CommerceChatThreadRow[], error: null as { message?: string } | null })

  const [customerResult, merchantResult] = await Promise.all([customerThreadsPromise, merchantThreadsPromise])

  if (customerResult.error) {
    throw new Error(customerResult.error.message || "Gagal membaca thread commerce customer.")
  }

  if (merchantResult.error) {
    throw new Error(merchantResult.error.message || "Gagal membaca thread commerce merchant.")
  }

  const threadMap = new Map<string, CommerceChatThreadRow>()
  for (const thread of (customerResult.data as CommerceChatThreadRow[] | null) || []) {
    threadMap.set(thread.id, thread)
  }
  for (const thread of (merchantResult.data as CommerceChatThreadRow[] | null) || []) {
    if (ownedMerchantIds.has(thread.merchant_id)) {
      threadMap.set(thread.id, thread)
    }
  }

  const logicalThreadMap = new Map<string, CommerceChatThreadRow>()
  for (const thread of threadMap.values()) {
    const logicalKey = getCommerceThreadLogicalKey(thread)
    const current = logicalThreadMap.get(logicalKey)
    if (isPreferredCommerceThreadRow(thread, current)) {
      logicalThreadMap.set(logicalKey, thread)
    }
  }

  return {
    threads: Array.from(logicalThreadMap.values()),
    ownedMerchants,
    ownedMerchantIds,
  }
}

export async function getDeletedCommerceChatNoticeForUser(
  adminSupabase: AdminSupabase,
  threadId: string,
  userId: string,
) {
  const ownedMerchants = await getOwnedMerchantsForUser(adminSupabase, userId)
  const ownedMerchantIds = new Set(ownedMerchants.map((merchant) => merchant.id))
  const { data, error } = await adminSupabase
    .from("commerce_chat_threads")
    .select("id, customer_user_id, merchant_id, merchant_user_id, deleted_for_all_at")
    .eq("id", threadId)
    .maybeSingle()

  if (error) {
    throw new Error(error.message || "Gagal membaca status thread commerce.")
  }

  const thread = (data as Pick<CommerceChatThreadRow, "id" | "customer_user_id" | "merchant_id" | "merchant_user_id" | "deleted_for_all_at"> | null) || null
  if (!thread?.id) return null

  const actorRole = resolveCommerceThreadActorRole(
    userId,
    {
      customer_user_id: thread.customer_user_id,
      merchant_user_id: thread.merchant_user_id,
      merchant_id: thread.merchant_id,
    },
    ownedMerchantIds,
  )

  if (!actorRole) return null
  if (!thread.deleted_for_all_at) return null
  return COMMERCE_CHAT_DELETED_NOTICE
}

export async function loadCommerceChatThreadsForUser(adminSupabase: AdminSupabase, userId: string) {
  const { threads, ownedMerchants, ownedMerchantIds } = await getAccessibleThreadsForUser(adminSupabase, userId)
  if (threads.length === 0) return [] as CommerceChatThreadItem[]

  const threadIds = threads.map((thread) => thread.id)
  const merchantMap = await getMerchantMapByIds(adminSupabase, [...new Set(threads.map((thread) => thread.merchant_id))])
  for (const merchant of ownedMerchants) {
    merchantMap.set(merchant.id, merchant)
  }
  const packageMap = await getPackagesByIds(
    adminSupabase,
    [...new Set(threads.map((thread) => thread.subject_package_id).filter(Boolean))] as string[],
  )
  const profileMap = await getProfileMapByIds(
    adminSupabase,
    [...new Set(threads.map((thread) => thread.customer_user_id))],
  )
  const latestMessageMap = await getLatestMessageMap(adminSupabase, threadIds)

  const items = threads
    .map((thread) => {
      const actorRole = resolveCommerceThreadActorRole(userId, thread, ownedMerchantIds)
      if (!actorRole) return null

      const merchant = merchantMap.get(thread.merchant_id) || null
      const customerProfile = profileMap.get(thread.customer_user_id) || null
      const latestMessage = latestMessageMap.get(thread.id)
      return {
        id: thread.id,
        threadType: thread.thread_type,
        sourceContext: thread.source_context,
        subjectPackageId: thread.subject_package_id,
        subjectBookingId: thread.subject_booking_id,
        customerUserId: thread.customer_user_id,
        merchantId: thread.merchant_id,
        merchantUserId: thread.merchant_user_id,
        merchantLabel: getMerchantLabel(merchant),
        customerLabel: customerProfile?.username || "Customer",
        packageTitle: thread.subject_package_id ? packageMap.get(thread.subject_package_id)?.title || null : null,
        status: thread.status,
        safetyState: thread.safety_state,
        createdAt: thread.created_at,
        updatedAt: thread.updated_at,
        lastMessageAt: thread.last_message_at,
        lastMessageSenderRole: thread.last_message_sender_role,
        currentUserActorRole: actorRole,
        currentUserLastReadAt:
          actorRole === "customer" ? thread.customer_last_read_at : thread.merchant_last_read_at,
        lastMessagePreview: latestMessage?.body || null,
      } satisfies CommerceChatThreadItem
    })
    .filter(Boolean) as CommerceChatThreadItem[]

  return sortThreadsByActivity(items)
}

export async function getCommerceChatThreadMetaForUser(adminSupabase: AdminSupabase, threadId: string, userId: string) {
  const threads = await loadCommerceChatThreadsForUser(adminSupabase, userId)
  return threads.find((thread) => thread.id === threadId) || null
}

async function getAccessibleThreadRowForUser(adminSupabase: AdminSupabase, threadId: string, userId: string) {
  const { threads, ownedMerchantIds } = await getAccessibleThreadsForUser(adminSupabase, userId)
  const thread = threads.find((item) => item.id === threadId) || null
  if (!thread) {
    throw new Error("Anda tidak punya akses ke thread commerce ini.")
  }
  if (thread.deleted_for_all_at) {
    throw new Error("Thread commerce tidak ditemukan.")
  }

  const actorRole = resolveCommerceThreadActorRole(userId, thread, ownedMerchantIds)
  if (!actorRole) {
    throw new Error("Anda tidak punya akses ke thread commerce ini.")
  }

  return { thread, actorRole }
}

export async function loadCommerceChatMessagesPageForUser(
  adminSupabase: AdminSupabase,
  threadId: string,
  userId: string,
  options?: {
    beforeCreatedAt?: string | null
    limit?: number
  },
) {
  await getAccessibleThreadRowForUser(adminSupabase, threadId, userId)

  const requestedLimit = Number(options?.limit || COMMERCE_CHAT_PAGE_SIZE)
  const safeLimit = Number.isFinite(requestedLimit)
    ? Math.min(Math.max(Math.trunc(requestedLimit), 10), 200)
    : COMMERCE_CHAT_PAGE_SIZE

  let query = adminSupabase
    .from("commerce_chat_messages")
    .select("id, thread_id, sender_user_id, sender_role, message_type, body, attachment_url, attachment_name, attachment_mime_type, moderation_state, client_message_id, created_at")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(safeLimit + 1)

  const beforeCreatedAt = String(options?.beforeCreatedAt || "").trim()
  if (beforeCreatedAt) {
    query = query.lt("created_at", beforeCreatedAt)
  }

  const { data: rows, error } = await query
  if (error) {
    throw new Error(error.message || "Gagal membaca pesan commerce chat.")
  }

  const descRows = (rows as CommerceChatMessageItem[] | null) || []
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

export async function markCommerceThreadRead(
  adminSupabase: AdminSupabase,
  threadId: string,
  userId: string,
  readAtIso = new Date().toISOString(),
) {
  const { actorRole } = await getAccessibleThreadRowForUser(adminSupabase, threadId, userId)
  const payload =
    actorRole === "customer"
      ? { customer_last_read_at: readAtIso }
      : { merchant_last_read_at: readAtIso }

  const { error } = await adminSupabase
    .from("commerce_chat_threads")
    .update(payload)
    .eq("id", threadId)

  if (error) {
    throw new Error(error.message || "Gagal memperbarui status baca commerce chat.")
  }

  return actorRole
}

export async function getCommerceChatUnreadBadgeCount(adminSupabase: AdminSupabase, userId: string) {
  const threads = await loadCommerceChatThreadsForUser(adminSupabase, userId)
  return threads.filter((thread) =>
    isCommerceThreadUnreadForActor({
      actorRole: thread.currentUserActorRole,
      lastMessageSenderRole: thread.lastMessageSenderRole,
      lastMessageAt: thread.lastMessageAt,
      customerLastReadAt: thread.currentUserActorRole === "customer" ? thread.currentUserLastReadAt : null,
      merchantLastReadAt: thread.currentUserActorRole === "merchant" ? thread.currentUserLastReadAt : null,
    }),
  ).length
}

export async function hardDeleteCommerceThreadForUser(
  adminSupabase: AdminSupabase,
  threadId: string,
  userId: string,
) {
  const { thread, actorRole } = await getAccessibleThreadRowForUser(adminSupabase, threadId, userId)
  if (!canDeleteCommerceThread(actorRole)) {
    throw new Error("Role akun ini tidak diizinkan menghapus thread commerce.")
  }

  let relatedThreads = [thread]
  if (thread.thread_type === "inquiry" && thread.subject_package_id) {
      const { data, error } = await adminSupabase
      .from("commerce_chat_threads")
      .select("id, thread_type, source_context, subject_package_id, subject_booking_id, customer_user_id, merchant_id, merchant_user_id, status, safety_state, created_at, updated_at, last_message_at, last_message_sender_role, customer_last_read_at, merchant_last_read_at, deleted_for_all_at, deleted_by_user_id, deleted_by_role, purge_after_at")
      .eq("thread_type", "inquiry")
      .eq("subject_package_id", thread.subject_package_id)
      .eq("customer_user_id", thread.customer_user_id)
      .eq("merchant_id", thread.merchant_id)
      .is("deleted_for_all_at", null)

    if (error) {
      throw new Error(error.message || "Gagal membaca duplikat thread inquiry commerce.")
    }

    relatedThreads = ((data as CommerceChatThreadRow[] | null) || []).filter((item) => item.id)
  } else if (thread.thread_type === "booking" && thread.subject_booking_id) {
      const { data, error } = await adminSupabase
      .from("commerce_chat_threads")
      .select("id, thread_type, source_context, subject_package_id, subject_booking_id, customer_user_id, merchant_id, merchant_user_id, status, safety_state, created_at, updated_at, last_message_at, last_message_sender_role, customer_last_read_at, merchant_last_read_at, deleted_for_all_at, deleted_by_user_id, deleted_by_role, purge_after_at")
      .eq("thread_type", "booking")
      .eq("subject_booking_id", thread.subject_booking_id)
      .is("deleted_for_all_at", null)

    if (error) {
      throw new Error(error.message || "Gagal membaca duplikat thread booking commerce.")
    }

    relatedThreads = ((data as CommerceChatThreadRow[] | null) || []).filter((item) => item.id)
  }

  const targetThreadIds = [...new Set(relatedThreads.map((item) => item.id).filter(Boolean))]
  const deletedAtIso = new Date().toISOString()
  const purgeAfterIso = new Date(Date.now() + COMMERCE_CHAT_PURGE_AFTER_DELETE_MS).toISOString()

  const deletionMarkerRows = relatedThreads.map((item) => ({
    thread_id: item.id,
    thread_type: item.thread_type,
    subject_package_id: item.subject_package_id,
    subject_booking_id: item.subject_booking_id,
    customer_user_id: item.customer_user_id,
    merchant_id: item.merchant_id,
    merchant_user_id: item.merchant_user_id,
    deleted_by_user_id: userId,
    deleted_by_role: actorRole,
  }))

  const { error: deletionMarkerError } = await adminSupabase
    .from("commerce_chat_thread_deletions")
    .insert(deletionMarkerRows)

  if (deletionMarkerError) {
    console.error("[commerce-chat] failed to persist thread deletion marker", {
      threadId,
      targetThreadIds,
      userId,
      actorRole,
      error: deletionMarkerError.message,
    })
  }

  const { data: deletedThreads, error } = await adminSupabase
    .from("commerce_chat_threads")
    .update({
      deleted_for_all_at: deletedAtIso,
      deleted_by_user_id: userId,
      deleted_by_role: actorRole,
      purge_after_at: purgeAfterIso,
      updated_at: deletedAtIso,
    })
    .in("id", targetThreadIds)
    .is("deleted_for_all_at", null)
    .select("id, deleted_for_all_at, purge_after_at")

  if (error) {
    throw new Error(
      error.message || `Gagal menandai thread commerce sebagai terhapus. target=${targetThreadIds.length}`,
    )
  }

  const updatedThreads = ((deletedThreads as Array<{ id: string; deleted_for_all_at?: string | null; purge_after_at?: string | null }> | null) || [])
  if (!updatedThreads.length) {
    throw new Error("Thread commerce tidak ditemukan atau sudah terhapus.")
  }

  const verifiedUpdatedIds = updatedThreads
    .filter((item) => item.id && item.deleted_for_all_at && item.purge_after_at)
    .map((item) => item.id)

  if (verifiedUpdatedIds.length !== targetThreadIds.length) {
    const { data: verificationRows, error: verificationError } = await adminSupabase
      .from("commerce_chat_threads")
      .select("id, deleted_for_all_at, purge_after_at")
      .in("id", targetThreadIds)

    if (verificationError) {
      throw new Error(
        verificationError.message ||
          `Gagal memverifikasi status hapus thread commerce. target=${targetThreadIds.length} updated=${updatedThreads.length}`,
      )
    }

    const successfullyDeletedIds = (((verificationRows as Array<{ id: string; deleted_for_all_at?: string | null; purge_after_at?: string | null }> | null) || []))
      .filter((item) => item.id && item.deleted_for_all_at && item.purge_after_at)
      .map((item) => item.id)

    if (successfullyDeletedIds.length !== targetThreadIds.length) {
      throw new Error(
        `Server belum berhasil menandai room chat sebagai terhapus. target=${targetThreadIds.length} updated=${updatedThreads.length} verified=${successfullyDeletedIds.length}`,
      )
    }
  }

  return {
    deletedThreadId: threadId,
    actorRole,
  }
}

export async function loadRecentCommerceThreadDeletionIdsForUser(adminSupabase: AdminSupabase, userId: string) {
  const cutoffIso = new Date(Date.now() - 15 * 60 * 1000).toISOString()
  const { data, error } = await adminSupabase
    .from("commerce_chat_thread_deletions")
    .select("thread_id, customer_user_id, merchant_id, merchant_user_id, deleted_by_user_id, deleted_by_role, created_at")
    .or(`customer_user_id.eq.${userId},merchant_user_id.eq.${userId}`)
    .gte("created_at", cutoffIso)
    .order("created_at", { ascending: false })
    .limit(50)

  if (error) {
    if (isMissingCommerceThreadDeletionTableError(error)) {
      return []
    }
    throw new Error(error.message || "Gagal membaca marker penghapusan thread commerce.")
  }

  return [...new Set((((data as CommerceChatThreadDeletionRow[] | null) || [])).map((item) => item.thread_id).filter(Boolean))]
}

async function findExistingMessageByClientMessageId(
  adminSupabase: AdminSupabase,
  threadId: string,
  clientMessageId: string,
) {
  const { data, error } = await adminSupabase
    .from("commerce_chat_messages")
    .select("id, thread_id, sender_user_id, sender_role, message_type, body, attachment_url, attachment_name, attachment_mime_type, moderation_state, client_message_id, created_at")
    .eq("thread_id", threadId)
    .eq("client_message_id", clientMessageId)
    .maybeSingle()

  if (error) {
    throw new Error(error.message || "Gagal membaca pesan duplikat commerce chat.")
  }

  return (data as CommerceChatMessageItem | null) || null
}

export async function sendCommerceChatMessage(
  adminSupabase: AdminSupabase,
  params: {
    threadId: string
    userId: string
    message: string
    clientMessageId?: string | null
    attachment: File | null
  },
) {
  const { thread, actorRole } = await getAccessibleThreadRowForUser(adminSupabase, params.threadId, params.userId)

  if (thread.status !== "open") {
    throw new Error("Thread commerce ini tidak dapat menerima pesan baru.")
  }

  if (thread.safety_state === "frozen") {
    throw new Error("Thread commerce ini sedang dibekukan.")
  }

  const trimmedMessage = String(params.message || "").trim()
  if (!trimmedMessage && (!params.attachment || params.attachment.size <= 0)) {
    throw new Error("Pesan atau lampiran wajib diisi.")
  }

  const clientMessageId = String(params.clientMessageId || "").trim()
  if (clientMessageId) {
    const existing = await findExistingMessageByClientMessageId(adminSupabase, params.threadId, clientMessageId)
    if (existing) {
      return { actorRole, message: existing, deduplicated: true as const }
    }
  }

  const uploadedAttachment = await uploadCommerceChatAttachment({
    threadId: params.threadId,
    senderId: params.userId,
    file: params.attachment,
  })

  if (uploadedAttachment.error) {
    throw new Error(uploadedAttachment.error)
  }

  const messageType =
    uploadedAttachment.attachment && trimmedMessage
      ? "attachment"
      : uploadedAttachment.attachment
        ? "attachment"
        : "text"

  const { data: insertedMessage, error: insertError } = await adminSupabase
    .from("commerce_chat_messages")
    .insert({
      thread_id: params.threadId,
      sender_user_id: params.userId,
      sender_role: actorRole,
      message_type: messageType,
      body: trimmedMessage || "",
      attachment_url: uploadedAttachment.attachment?.url || null,
      attachment_name: uploadedAttachment.attachment?.name || null,
      attachment_mime_type: uploadedAttachment.attachment?.mimeType || null,
      moderation_state: "clean",
      client_message_id: clientMessageId || null,
    })
    .select("id, thread_id, sender_user_id, sender_role, message_type, body, attachment_url, attachment_name, attachment_mime_type, moderation_state, client_message_id, created_at")
    .single()

  if (insertError || !insertedMessage) {
    const isDuplicate = String(insertError?.message || "").toLowerCase().includes("duplicate")
      || String(insertError?.message || "").includes("commerce_chat_messages_thread_client_message_uidx")

    if (isDuplicate && clientMessageId) {
      const existing = await findExistingMessageByClientMessageId(adminSupabase, params.threadId, clientMessageId)
      if (existing) {
        return { actorRole, message: existing, deduplicated: true as const }
      }
    }

    throw new Error(insertError?.message || "Gagal mengirim pesan commerce chat.")
  }

  const nowIso = insertedMessage.created_at || new Date().toISOString()
  const threadUpdate =
    actorRole === "customer"
      ? {
          updated_at: nowIso,
          last_message_at: nowIso,
          last_message_sender_role: "customer",
          customer_last_read_at: nowIso,
        }
      : {
          updated_at: nowIso,
          last_message_at: nowIso,
          last_message_sender_role: "merchant",
          merchant_last_read_at: nowIso,
        }

  const { error: updateError } = await adminSupabase
    .from("commerce_chat_threads")
    .update(threadUpdate)
    .eq("id", params.threadId)

  if (updateError) {
    throw new Error(updateError.message || "Gagal memperbarui ringkasan thread commerce chat.")
  }

  return {
    actorRole,
    message: insertedMessage as CommerceChatMessageItem,
    deduplicated: false as const,
  }
}
