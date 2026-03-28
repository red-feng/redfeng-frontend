"use server"

import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import {
  buildInternalAdminEmail,
  buildInternalFinanceEmail,
  isValidInternalUsername,
  normalizeInternalUsername,
} from "@/lib/internal-auth"
import {
  isAdminManagedRole,
  isFinanceManagedRole,
} from "@/lib/internal-roles"

async function getInternalManagerRole(returnTo?: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const loginPath = returnTo?.startsWith("/superadmin")
    ? "/superadmin/login"
    : returnTo?.startsWith("/finance")
      ? "/finance/login"
      : "/admin/login"

  if (!user) {
    redirect(loginPath)
  }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
  if (!profile || !["admin", "operations_manager", "finance", "finance_manager", "superadmin"].includes(profile.role || "")) {
    redirect(loginPath)
  }

  return profile.role
}

async function ensureFinanceAccountOperator(returnTo?: string) {
  const role = await getInternalManagerRole(returnTo)
  if (!["operations_manager", "superadmin"].includes(role)) {
    backToAdminUsers("Hanya operations manager atau superadmin yang dapat mengelola akun operasional.", "error")
  }
  return role
}

function resolveReturnTo(formData: FormData, fallbackPath: string) {
  const returnTo = String(formData.get("return_to") || "").trim()
  return returnTo.startsWith("/") ? returnTo : fallbackPath
}

function redirectWithMessage(path: string, message: string, type: "success" | "error"): never {
  redirect(`${path}?${type}=${encodeURIComponent(message)}`)
}

function formatAccountErrorMessage(message: string, requestedRole: string) {
  if (message.includes("profiles_role_check")) {
    return `Database role internal belum mengenali role ${requestedRole}. Jalankan migration profiles role terbaru terlebih dahulu.`
  }
  return message
}

function backToAdminUsers(message: string, type: "success" | "error"): never {
  redirectWithMessage("/finance/admin-users", message, type)
}

export async function createAdminAccount(formData: FormData) {
  const returnTo = resolveReturnTo(formData, "/admin/team-accounts")
  const actorRole = await ensureFinanceAccountOperator(returnTo)

  const username = normalizeInternalUsername(String(formData.get("username") || ""))
  const password = String(formData.get("password") || "")
  const requestedRole = String(formData.get("role") || "admin").trim().toLowerCase()

  if (!username || !password) {
    redirectWithMessage(returnTo, "Username dan password wajib diisi", "error")
  }

  if (!isAdminManagedRole(requestedRole)) {
    redirectWithMessage(returnTo, "Role akun operasional tidak valid", "error")
  }

  if (actorRole !== "superadmin" && requestedRole !== "admin") {
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
  redirectWithMessage(returnTo, `Akun ${roleLabel} ${username} berhasil dibuat`, "success")
}

export async function resetAdminPassword(formData: FormData) {
  const returnTo = resolveReturnTo(formData, "/admin/team-accounts")
  const actorRole = await ensureFinanceAccountOperator(returnTo)

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

  if (actorRole !== "superadmin" && targetProfile.role !== "admin") {
    redirectWithMessage(returnTo, "Operations manager hanya dapat reset password admin team.", "error")
  }

  const { error } = await adminSupabase.auth.admin.updateUserById(adminId, {
    password,
  })

  if (error) {
    redirectWithMessage(returnTo, error.message, "error")
  }

  redirectWithMessage(returnTo, "Password admin berhasil diperbarui", "success")
}

export async function deleteAdminAccount(formData: FormData) {
  const returnTo = resolveReturnTo(formData, "/admin/team-accounts")
  const actorRole = await ensureFinanceAccountOperator(returnTo)

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

  if (actorRole !== "superadmin" && targetProfile.role !== "admin") {
    redirectWithMessage(returnTo, "Operations manager hanya dapat menghapus akun admin team.", "error")
  }

  await adminSupabase.from("profiles").delete().eq("id", adminId)
  const { error: deleteError } = await adminSupabase.auth.admin.deleteUser(adminId)

  if (deleteError) {
    redirectWithMessage(returnTo, deleteError.message, "error")
  }

  const roleLabel = targetProfile.role === "operations_manager" ? "operations manager" : "admin"
  redirectWithMessage(returnTo, `Akun ${roleLabel} ${targetProfile.username || adminId} berhasil dihapus`, "success")
}

export async function createFinanceAccount(formData: FormData) {
  const returnTo = resolveReturnTo(formData, "/finance/admin-users")
  const actorRole = await getInternalManagerRole(returnTo)
  if (!["finance_manager", "superadmin"].includes(actorRole)) {
    redirectWithMessage(returnTo, "Hanya finance manager atau superadmin yang dapat mengelola akun finance.", "error")
  }

  const username = normalizeInternalUsername(String(formData.get("username") || ""))
  const password = String(formData.get("password") || "")
  const requestedRole = String(formData.get("role") || "finance").trim().toLowerCase()

  if (!username || !password) {
    redirectWithMessage(returnTo, "Username dan password akun finance wajib diisi", "error")
  }

  if (!isFinanceManagedRole(requestedRole)) {
    redirectWithMessage(returnTo, "Role akun finance tidak valid", "error")
  }

  if (actorRole !== "superadmin" && requestedRole !== "finance") {
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

  const roleLabel = requestedRole === "finance_manager" ? "finance manager" : "finance"
  redirectWithMessage(returnTo, `Akun ${roleLabel} ${username} berhasil dibuat`, "success")
}

export async function resetFinancePassword(formData: FormData) {
  const returnTo = resolveReturnTo(formData, "/finance/admin-users")
  const actorRole = await getInternalManagerRole(returnTo)
  if (!["finance_manager", "superadmin"].includes(actorRole)) {
    redirectWithMessage(returnTo, "Hanya finance manager atau superadmin yang dapat mengelola akun finance.", "error")
  }

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

  if (actorRole !== "superadmin" && targetProfile.role !== "finance") {
    redirectWithMessage(returnTo, "Finance manager hanya dapat reset password finance team.", "error")
  }

  const { error } = await adminSupabase.auth.admin.updateUserById(financeId, {
    password,
  })

  if (error) {
    redirectWithMessage(returnTo, error.message, "error")
  }

  redirectWithMessage(returnTo, "Password finance berhasil diperbarui", "success")
}

export async function deleteFinanceAccount(formData: FormData) {
  const returnTo = resolveReturnTo(formData, "/finance/admin-users")
  const actorRole = await getInternalManagerRole(returnTo)
  if (!["finance_manager", "superadmin"].includes(actorRole)) {
    redirectWithMessage(returnTo, "Hanya finance manager atau superadmin yang dapat mengelola akun finance.", "error")
  }

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

  if (actorRole !== "superadmin" && targetProfile.role !== "finance") {
    redirectWithMessage(returnTo, "Finance manager hanya dapat menghapus akun finance team.", "error")
  }

  await adminSupabase.from("profiles").delete().eq("id", financeId)
  const { error: deleteError } = await adminSupabase.auth.admin.deleteUser(financeId)

  if (deleteError) {
    redirectWithMessage(returnTo, deleteError.message, "error")
  }

  const roleLabel = targetProfile.role === "finance_manager" ? "finance manager" : "finance"
  redirectWithMessage(returnTo, `Akun ${roleLabel} berhasil dihapus`, "success")
}
