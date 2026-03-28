"use server"

import { createAdminClient } from "@/lib/supabase/admin"
import { createAdminAuditLog } from "@/lib/admin-audit"
import {
  buildInternalAdminEmail,
  isValidInternalUsername,
  normalizeInternalUsername,
} from "@/lib/internal-auth"
import { isAdminManagedRole } from "@/lib/internal-roles"
import {
  formatAccountErrorMessage,
  getInternalManagerActor,
  redirectWithMessage,
  resolveReturnTo,
} from "@/lib/internal-account-management"

function backToAdminUsers(message: string, type: "success" | "error"): never {
  redirectWithMessage("/admin/team-accounts", message, type)
}

async function ensureOperationsAccountOperator(returnTo?: string) {
  const actor = await getInternalManagerActor(returnTo)
  if (!["operations_manager", "superadmin"].includes(actor.role)) {
    backToAdminUsers("Hanya operations manager atau superadmin yang dapat mengelola akun operasional.", "error")
  }
  return actor
}

export async function createAdminAccount(formData: FormData) {
  const returnTo = resolveReturnTo(formData, "/admin/team-accounts")
  const actor = await ensureOperationsAccountOperator(returnTo)

  const username = normalizeInternalUsername(String(formData.get("username") || ""))
  const password = String(formData.get("password") || "")
  const requestedRole = String(formData.get("role") || "admin").trim().toLowerCase()

  if (!username || !password) {
    redirectWithMessage(returnTo, "Username dan password wajib diisi", "error")
  }

  if (!isAdminManagedRole(requestedRole)) {
    redirectWithMessage(returnTo, "Role akun operasional tidak valid", "error")
  }

  if (actor.role !== "superadmin" && requestedRole !== "admin") {
    redirectWithMessage(returnTo, "Hanya superadmin yang dapat membuat operations manager.", "error")
  }

  if (!isValidInternalUsername(username)) {
    redirectWithMessage(
      returnTo,
      "Username admin harus 3-32 karakter dan hanya boleh berisi huruf kecil, angka, titik, garis bawah, atau dash",
      "error",
    )
  }

  if (password.length < 8) {
    redirectWithMessage(returnTo, "Password admin minimal 8 karakter", "error")
  }

  const adminSupabase = createAdminClient()
  const email = buildInternalAdminEmail(username)

  const { data: existingProfile } = await adminSupabase
    .from("profiles")
    .select("id")
    .eq("username", username)
    .maybeSingle()

  if (existingProfile) {
    redirectWithMessage(returnTo, "Username admin sudah dipakai", "error")
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
    redirectWithMessage(returnTo, createError?.message || "Gagal membuat akun admin", "error")
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

  const roleLabel = requestedRole === "operations_manager" ? "operations manager" : "admin"
  await createAdminAuditLog({
    actorId: actor.id,
    actorRole: actor.role,
    targetType: "internal_account",
    targetId: createdUser.user.id,
    action: "create_account",
    summary: `Akun ${roleLabel} ${username} dibuat`,
    metadata: {
      scope: "operations_team",
      username,
      requestedRole,
    },
  })
  redirectWithMessage(returnTo, `Akun ${roleLabel} ${username} berhasil dibuat`, "success")
}

export async function resetAdminPassword(formData: FormData) {
  const returnTo = resolveReturnTo(formData, "/admin/team-accounts")
  const actor = await ensureOperationsAccountOperator(returnTo)

  const adminId = String(formData.get("adminId") || "")
  const password = String(formData.get("password") || "")

  if (!adminId || !password) {
    redirectWithMessage(returnTo, "Akun admin dan password baru wajib diisi", "error")
  }

  if (password.length < 8) {
    redirectWithMessage(returnTo, "Password baru admin minimal 8 karakter", "error")
  }

  const adminSupabase = createAdminClient()
  const { data: targetProfile } = await adminSupabase
    .from("profiles")
    .select("role")
    .eq("id", adminId)
    .maybeSingle()

  if (!targetProfile || !isAdminManagedRole(targetProfile.role)) {
    redirectWithMessage(returnTo, "Akun yang dipilih bukan akun operasional yang valid", "error")
  }

  if (actor.role !== "superadmin" && targetProfile.role !== "admin") {
    redirectWithMessage(returnTo, "Operations manager hanya dapat reset password admin team.", "error")
  }

  const { error } = await adminSupabase.auth.admin.updateUserById(adminId, {
    password,
  })

  if (error) {
    redirectWithMessage(returnTo, error.message, "error")
  }

  await createAdminAuditLog({
    actorId: actor.id,
    actorRole: actor.role,
    targetType: "internal_account",
    targetId: adminId,
    action: "reset_password",
    summary: `Password akun ${targetProfile.role === "operations_manager" ? "operations manager" : "admin"} diperbarui`,
    metadata: {
      scope: "operations_team",
      targetRole: targetProfile.role,
    },
  })
  redirectWithMessage(returnTo, "Password admin berhasil diperbarui", "success")
}

export async function deleteAdminAccount(formData: FormData) {
  const returnTo = resolveReturnTo(formData, "/admin/team-accounts")
  const actor = await ensureOperationsAccountOperator(returnTo)

  const adminId = String(formData.get("adminId") || "")

  if (!adminId) {
    redirectWithMessage(returnTo, "Akun admin tidak valid", "error")
  }

  const adminSupabase = createAdminClient()

  const { data: targetProfile } = await adminSupabase
    .from("profiles")
    .select("role, username")
    .eq("id", adminId)
    .maybeSingle()

  if (!targetProfile || !isAdminManagedRole(targetProfile.role)) {
    redirectWithMessage(returnTo, "Akun yang dipilih bukan akun operasional yang valid", "error")
  }

  if (actor.role !== "superadmin" && targetProfile.role !== "admin") {
    redirectWithMessage(returnTo, "Operations manager hanya dapat menghapus akun admin team.", "error")
  }

  await adminSupabase.from("profiles").delete().eq("id", adminId)
  const { error: deleteError } = await adminSupabase.auth.admin.deleteUser(adminId)

  if (deleteError) {
    redirectWithMessage(returnTo, deleteError.message, "error")
  }

  await createAdminAuditLog({
    actorId: actor.id,
    actorRole: actor.role,
    targetType: "internal_account",
    targetId: adminId,
    action: "delete_account",
    summary: `Akun ${targetProfile.role === "operations_manager" ? "operations manager" : "admin"} ${targetProfile.username || adminId} dihapus`,
    metadata: {
      scope: "operations_team",
      username: targetProfile.username,
      targetRole: targetProfile.role,
    },
  })
  const roleLabel = targetProfile.role === "operations_manager" ? "operations manager" : "admin"
  redirectWithMessage(returnTo, `Akun ${roleLabel} ${targetProfile.username || adminId} berhasil dihapus`, "success")
}
