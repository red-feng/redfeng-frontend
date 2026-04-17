"use server"

import { createAdminClient } from "@/lib/supabase/admin"
import { createAdminAuditLog } from "@/lib/admin-audit"
import {
  buildInternalFinanceEmail,
  isValidInternalUsername,
  normalizeInternalUsername,
} from "@/lib/internal-auth"
import { isFinanceManagedRole } from "@/lib/internal-roles"
import { bootstrapInternalChatForNewAccount } from "@/lib/internal-chat/bootstrap"
import {
  formatAccountErrorMessage,
  getInternalManagerActor,
  redirectWithMessage,
  resolveReturnTo,
} from "@/lib/internal-account-management"

async function ensureFinanceAccountOperator(returnTo?: string) {
  const actor = await getInternalManagerActor(returnTo)
  if (!["finance_manager", "superadmin"].includes(actor.role)) {
    redirectWithMessage(returnTo || "/finance/team-accounts", "Hanya finance manager atau superadmin yang dapat mengelola akun finance.", "error")
  }
  return actor
}

export async function createFinanceAccount(formData: FormData) {
  const returnTo = resolveReturnTo(formData, "/finance/team-accounts")
  const actor = await ensureFinanceAccountOperator(returnTo)

  const username = normalizeInternalUsername(String(formData.get("username") || ""))
  const password = String(formData.get("password") || "")
  const requestedRole = String(formData.get("role") || "finance").trim().toLowerCase()

  if (!username || !password) {
    redirectWithMessage(returnTo, "Username dan password akun finance wajib diisi", "error")
  }

  if (!isFinanceManagedRole(requestedRole)) {
    redirectWithMessage(returnTo, "Role akun finance tidak valid", "error")
  }

  if (actor.role !== "superadmin" && requestedRole !== "finance") {
    redirectWithMessage(returnTo, "Hanya superadmin yang dapat membuat finance manager.", "error")
  }

  if (!isValidInternalUsername(username)) {
    redirectWithMessage(
      returnTo,
      "Username finance harus 3-32 karakter dan hanya boleh berisi huruf kecil, angka, titik, garis bawah, atau dash",
      "error",
    )
  }

  if (password.length < 8) {
    redirectWithMessage(returnTo, "Password akun finance minimal 8 karakter", "error")
  }

  const adminSupabase = createAdminClient()
  const email = buildInternalFinanceEmail(username)
  const { data: existingProfile } = await adminSupabase
    .from("profiles")
    .select("id")
    .eq("username", username)
    .maybeSingle()

  if (existingProfile) {
    redirectWithMessage(returnTo, "Username finance sudah dipakai", "error")
  }

  const { data: createdUser, error: createError } = await adminSupabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      internal_username: username,
      account_type: requestedRole,
    },
  })

  if (createError || !createdUser.user) {
    redirectWithMessage(returnTo, createError?.message || "Gagal membuat akun finance", "error")
  }

  const { error: profileError } = await adminSupabase.from("profiles").upsert({
    id: createdUser.user.id,
    role: requestedRole,
    username,
  })

  if (profileError) {
    await adminSupabase.auth.admin.deleteUser(createdUser.user.id)
    redirectWithMessage(returnTo, formatAccountErrorMessage(profileError.message, requestedRole), "error")
  }
  await bootstrapInternalChatForNewAccount({
    adminSupabase,
    actorId: actor.id,
    actorRole: actor.role,
    createdUserId: createdUser.user.id,
    createdRole: requestedRole,
  })

  const roleLabel = requestedRole === "finance_manager" ? "finance manager" : "finance"
  await createAdminAuditLog({
    actorId: actor.id,
    actorRole: actor.role,
    targetType: "internal_account",
    targetId: createdUser.user.id,
    action: "create_account",
    summary: `Akun ${roleLabel} ${username} dibuat`,
    metadata: {
      scope: "finance_team",
      username,
      requestedRole,
    },
  })
  redirectWithMessage(returnTo, `Akun ${roleLabel} ${username} berhasil dibuat`, "success")
}

export async function resetFinancePassword(formData: FormData) {
  const returnTo = resolveReturnTo(formData, "/finance/team-accounts")
  const actor = await ensureFinanceAccountOperator(returnTo)

  const financeId = String(formData.get("financeId") || "")
  const password = String(formData.get("password") || "")

  if (!financeId || !password) {
    redirectWithMessage(returnTo, "Akun finance dan password baru wajib diisi", "error")
  }

  if (password.length < 8) {
    redirectWithMessage(returnTo, "Password baru finance minimal 8 karakter", "error")
  }

  const adminSupabase = createAdminClient()
  const { data: targetProfile } = await adminSupabase
    .from("profiles")
    .select("role")
    .eq("id", financeId)
    .maybeSingle()

  if (!targetProfile || !isFinanceManagedRole(targetProfile.role)) {
    redirectWithMessage(returnTo, "Akun yang dipilih bukan akun finance yang valid", "error")
  }

  if (actor.role !== "superadmin" && targetProfile.role !== "finance") {
    redirectWithMessage(returnTo, "Finance manager hanya dapat reset password finance team.", "error")
  }

  const { error } = await adminSupabase.auth.admin.updateUserById(financeId, {
    password,
  })

  if (error) {
    redirectWithMessage(returnTo, error.message, "error")
  }

  await createAdminAuditLog({
    actorId: actor.id,
    actorRole: actor.role,
    targetType: "internal_account",
    targetId: financeId,
    action: "reset_password",
    summary: `Password akun ${targetProfile.role === "finance_manager" ? "finance manager" : "finance"} diperbarui`,
    metadata: {
      scope: "finance_team",
      targetRole: targetProfile.role,
    },
  })
  redirectWithMessage(returnTo, "Password finance berhasil diperbarui", "success")
}

export async function deleteFinanceAccount(formData: FormData) {
  const returnTo = resolveReturnTo(formData, "/finance/team-accounts")
  const actor = await ensureFinanceAccountOperator(returnTo)

  const financeId = String(formData.get("financeId") || "")

  if (!financeId) {
    redirectWithMessage(returnTo, "Akun finance tidak valid", "error")
  }

  const adminSupabase = createAdminClient()
  const { data: targetProfile } = await adminSupabase
    .from("profiles")
    .select("role")
    .eq("id", financeId)
    .maybeSingle()

  if (!targetProfile || !isFinanceManagedRole(targetProfile.role)) {
    redirectWithMessage(returnTo, "Akun yang dipilih bukan akun finance yang valid", "error")
  }

  if (actor.role !== "superadmin" && targetProfile.role !== "finance") {
    redirectWithMessage(returnTo, "Finance manager hanya dapat menghapus akun finance team.", "error")
  }

  await adminSupabase.from("profiles").delete().eq("id", financeId)
  const { error: deleteError } = await adminSupabase.auth.admin.deleteUser(financeId)

  if (deleteError) {
    redirectWithMessage(returnTo, deleteError.message, "error")
  }

  await createAdminAuditLog({
    actorId: actor.id,
    actorRole: actor.role,
    targetType: "internal_account",
    targetId: financeId,
    action: "delete_account",
    summary: `Akun ${targetProfile.role === "finance_manager" ? "finance manager" : "finance"} dihapus`,
    metadata: {
      scope: "finance_team",
      targetRole: targetProfile.role,
    },
  })
  const roleLabel = targetProfile.role === "finance_manager" ? "finance manager" : "finance"
  redirectWithMessage(returnTo, `Akun ${roleLabel} berhasil dihapus`, "success")
}
