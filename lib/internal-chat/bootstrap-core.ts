import {
  canInternalUsersDirectMessageLocked,
  ensureInternalDirectRoom,
} from "@/lib/internal-chat/core"

type AdminSupabase = ReturnType<typeof import("@/lib/supabase/admin").createAdminClient>

type InternalRoleCode =
  | "admin"
  | "operations_manager"
  | "finance"
  | "finance_manager"
  | "marketing"
  | "marketing_manager"
  | "superadmin"

type InternalProfileRow = {
  id: string
  role: string | null
}

function normalizeRole(role: string | null | undefined): InternalRoleCode | null {
  const normalized = String(role || "").trim().toLowerCase()
  if (
    normalized === "admin" ||
    normalized === "operations_manager" ||
    normalized === "finance" ||
    normalized === "finance_manager" ||
    normalized === "marketing" ||
    normalized === "marketing_manager" ||
    normalized === "superadmin"
  ) {
    return normalized
  }
  return null
}

async function findFirstProfileByRole(adminSupabase: AdminSupabase, role: InternalRoleCode) {
  const { data } = await adminSupabase
    .from("profiles")
    .select("id, role")
    .eq("role", role)
    .order("username", { ascending: true })
    .limit(1)
    .maybeSingle()

  return (data as InternalProfileRow | null) || null
}

async function seedWelcomeMessage(
  adminSupabase: AdminSupabase,
  senderId: string,
  senderRole: string | null | undefined,
  targetId: string,
  targetRole: string | null | undefined,
  message: string,
) {
  if (!canInternalUsersDirectMessageLocked(senderRole, targetRole)) {
    return false
  }

  const roomId = await ensureInternalDirectRoom(adminSupabase, senderId, targetId)
  const nowIso = new Date().toISOString()

  const { error: insertError } = await adminSupabase
    .from("internal_chat_messages")
    .insert({
      room_id: roomId,
      sender_id: senderId,
      message,
      created_at: nowIso,
    })

  if (insertError) {
    return false
  }

  await adminSupabase
    .from("internal_chat_rooms")
    .update({
      updated_at: nowIso,
      last_message_at: nowIso,
      last_message_sender_id: senderId,
    })
    .eq("id", roomId)

  await adminSupabase
    .from("internal_chat_room_members")
    .update({ last_read_at: nowIso })
    .eq("room_id", roomId)
    .eq("user_id", senderId)

  return true
}

function buildWelcomeMessage(createdRole: InternalRoleCode) {
  switch (createdRole) {
    case "superadmin":
      return "Selamat datang di internal chat Red Feng. Akun superadmin Anda sudah aktif."
    case "operations_manager":
      return "Selamat bergabung. Akun operations manager Anda sudah aktif untuk koordinasi internal."
    case "finance_manager":
      return "Selamat bergabung. Akun finance manager Anda sudah aktif untuk koordinasi internal."
    case "admin":
      return "Selamat bergabung. Akun admin Anda sudah aktif, silakan gunakan chat internal untuk koordinasi harian."
    case "finance":
      return "Selamat bergabung. Akun finance Anda sudah aktif, silakan gunakan chat internal untuk koordinasi harian."
    case "marketing_manager":
      return "Selamat bergabung. Akun marketing manager Anda sudah aktif untuk koordinasi internal."
    case "marketing":
      return "Selamat bergabung. Akun marketing Anda sudah aktif, silakan gunakan chat internal untuk koordinasi harian."
    default:
      return "Selamat datang di internal chat Red Feng."
  }
}

export async function bootstrapInternalChatForNewAccount(params: {
  adminSupabase: AdminSupabase
  actorId: string
  actorRole: string | null | undefined
  createdUserId: string
  createdRole: string | null | undefined
}) {
  const { adminSupabase, actorId, actorRole, createdUserId, createdRole } = params
  const normalizedCreatedRole = normalizeRole(createdRole)
  const normalizedActorRole = normalizeRole(actorRole)
  if (!normalizedCreatedRole || !normalizedActorRole) return

  const welcomeMessage = buildWelcomeMessage(normalizedCreatedRole)

  const seededByActor = await seedWelcomeMessage(
    adminSupabase,
    actorId,
    normalizedActorRole,
    createdUserId,
    normalizedCreatedRole,
    welcomeMessage,
  )

  if (seededByActor) return

  if (normalizedCreatedRole === "admin") {
    const operationsManager = await findFirstProfileByRole(adminSupabase, "operations_manager")
    if (!operationsManager || operationsManager.id === createdUserId) return
    await seedWelcomeMessage(
      adminSupabase,
      operationsManager.id,
      operationsManager.role,
      createdUserId,
      normalizedCreatedRole,
      welcomeMessage,
    )
    return
  }

  if (normalizedCreatedRole === "finance") {
    const financeManager = await findFirstProfileByRole(adminSupabase, "finance_manager")
    if (!financeManager || financeManager.id === createdUserId) return
    await seedWelcomeMessage(
      adminSupabase,
      financeManager.id,
      financeManager.role,
      createdUserId,
      normalizedCreatedRole,
      welcomeMessage,
    )
    return
  }

  if (normalizedCreatedRole === "marketing") {
    const marketingManager = await findFirstProfileByRole(adminSupabase, "marketing_manager")
    if (!marketingManager || marketingManager.id === createdUserId) return
    await seedWelcomeMessage(
      adminSupabase,
      marketingManager.id,
      marketingManager.role,
      createdUserId,
      normalizedCreatedRole,
      welcomeMessage,
    )
  }
}
