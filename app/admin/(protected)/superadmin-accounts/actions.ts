"use server"

import { redirect } from "next/navigation"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import {
  buildInternalSuperadminEmail,
  isValidInternalUsername,
  normalizeInternalUsername,
} from "@/lib/internal-auth"
import { bootstrapInternalChatForNewAccount } from "@/lib/internal-chat-bootstrap"

function resolveReturnTo(formData: FormData, fallbackPath: string) {
  const returnTo = String(formData.get("return_to") || "").trim()
  return returnTo.startsWith("/") ? returnTo : fallbackPath
}

function redirectWithMessage(path: string, message: string, type: "success" | "error"): never {
  redirect(`${path}?${type}=${encodeURIComponent(message)}`)
}

async function ensureSuperadminOperator() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/superadmin/login")
  }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()

  if (!profile || profile.role !== "superadmin") {
    redirect("/superadmin/dashboard")
  }

  return user.id
}

export async function createSuperadminAccount(formData: FormData) {
  const returnTo = resolveReturnTo(formData, "/superadmin/superadmin-accounts")
  const actorId = await ensureSuperadminOperator()

  const username = normalizeInternalUsername(String(formData.get("username") || ""))
  const password = String(formData.get("password") || "")

  if (!username || !password) {
    redirectWithMessage(returnTo, "Username dan password superadmin wajib diisi", "error")
  }

  if (!isValidInternalUsername(username)) {
    redirectWithMessage(
      returnTo,
      "Username superadmin harus 3-32 karakter dan hanya boleh berisi huruf kecil, angka, titik, garis bawah, atau dash",
      "error",
    )
  }

  if (password.length < 8) {
    redirectWithMessage(returnTo, "Password superadmin minimal 8 karakter", "error")
  }

  const adminSupabase = createAdminClient()
  const { data: existingProfile } = await adminSupabase
    .from("profiles")
    .select("id")
    .eq("username", username)
    .maybeSingle()

  if (existingProfile) {
    redirectWithMessage(returnTo, "Username superadmin sudah dipakai", "error")
  }

  const { data: createdUser, error: createError } = await adminSupabase.auth.admin.createUser({
    email: buildInternalSuperadminEmail(username),
    password,
    email_confirm: true,
    user_metadata: {
      internal_username: username,
      account_type: "superadmin",
    },
  })

  if (createError || !createdUser.user) {
    redirectWithMessage(returnTo, createError?.message || "Gagal membuat akun superadmin", "error")
  }

  const { error: profileError } = await adminSupabase.from("profiles").upsert({
    id: createdUser.user.id,
    role: "superadmin",
    username,
  })

  if (profileError) {
    await adminSupabase.auth.admin.deleteUser(createdUser.user.id)
    redirectWithMessage(returnTo, profileError.message, "error")
  }
  await bootstrapInternalChatForNewAccount({
    adminSupabase,
    actorId,
    actorRole: "superadmin",
    createdUserId: createdUser.user.id,
    createdRole: "superadmin",
  })

  redirectWithMessage(returnTo, `Akun superadmin ${username} berhasil dibuat`, "success")
}

export async function resetSuperadminPassword(formData: FormData) {
  const returnTo = resolveReturnTo(formData, "/superadmin/superadmin-accounts")
  await ensureSuperadminOperator()

  const superadminId = String(formData.get("superadminId") || "")
  const password = String(formData.get("password") || "")

  if (!superadminId || !password) {
    redirectWithMessage(returnTo, "Akun superadmin dan password baru wajib diisi", "error")
  }

  if (password.length < 8) {
    redirectWithMessage(returnTo, "Password baru superadmin minimal 8 karakter", "error")
  }

  const adminSupabase = createAdminClient()
  const { data: targetProfile } = await adminSupabase
    .from("profiles")
    .select("role")
    .eq("id", superadminId)
    .maybeSingle()

  if (!targetProfile || targetProfile.role !== "superadmin") {
    redirectWithMessage(returnTo, "Akun yang dipilih bukan superadmin yang valid", "error")
  }

  const { error } = await adminSupabase.auth.admin.updateUserById(superadminId, {
    password,
  })

  if (error) {
    redirectWithMessage(returnTo, error.message, "error")
  }

  redirectWithMessage(returnTo, "Password superadmin berhasil diperbarui", "success")
}

export async function deleteSuperadminAccount(formData: FormData) {
  const returnTo = resolveReturnTo(formData, "/superadmin/superadmin-accounts")
  const actorId = await ensureSuperadminOperator()

  const superadminId = String(formData.get("superadminId") || "")

  if (!superadminId) {
    redirectWithMessage(returnTo, "Akun superadmin tidak valid", "error")
  }

  if (superadminId === actorId) {
    redirectWithMessage(returnTo, "Akun superadmin yang sedang dipakai tidak boleh dihapus dari panel ini", "error")
  }

  const adminSupabase = createAdminClient()
  const { data: targetProfile } = await adminSupabase
    .from("profiles")
    .select("role, username")
    .eq("id", superadminId)
    .maybeSingle()

  if (!targetProfile || targetProfile.role !== "superadmin") {
    redirectWithMessage(returnTo, "Akun yang dipilih bukan superadmin yang valid", "error")
  }

  await adminSupabase.from("profiles").delete().eq("id", superadminId)
  const { error: deleteError } = await adminSupabase.auth.admin.deleteUser(superadminId)

  if (deleteError) {
    redirectWithMessage(returnTo, deleteError.message, "error")
  }

  redirectWithMessage(returnTo, `Akun superadmin ${targetProfile.username || superadminId} berhasil dihapus`, "success")
}
