"use server"

import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { buildInternalAdminEmail, isValidInternalUsername, normalizeInternalUsername } from "@/lib/internal-auth"

async function getInternalManagerRole() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/finance/login")
  }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
  if (!profile || !["finance", "superadmin"].includes(profile.role)) {
    redirect("/finance/login")
  }

  return profile.role
}

function backToAdminUsers(message: string, type: "success" | "error"): never {
  redirect(`/finance/admin-users?${type}=${encodeURIComponent(message)}`)
}

export async function createAdminAccount(formData: FormData) {
  await getInternalManagerRole()

  const username = normalizeInternalUsername(String(formData.get("username") || ""))
  const password = String(formData.get("password") || "")

  if (!username || !password) {
    backToAdminUsers("Username dan password wajib diisi", "error")
  }

  if (!isValidInternalUsername(username)) {
    backToAdminUsers("Username admin harus 3-32 karakter dan hanya boleh berisi huruf kecil, angka, titik, garis bawah, atau dash", "error")
  }

  if (password.length < 8) {
    backToAdminUsers("Password admin minimal 8 karakter", "error")
  }

  const adminSupabase = createAdminClient()
  const email = buildInternalAdminEmail(username)

  const { data: existingProfile } = await adminSupabase
    .from("profiles")
    .select("id")
    .eq("username", username)
    .maybeSingle()

  if (existingProfile) {
    backToAdminUsers("Username admin sudah dipakai", "error")
  }

  const { data: createdUser, error: createError } = await adminSupabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      internal_username: username,
      account_type: "admin",
    },
  })

  if (createError || !createdUser.user) {
    backToAdminUsers(createError?.message || "Gagal membuat akun admin", "error")
  }

  const { error: profileError } = await adminSupabase.from("profiles").upsert({
    id: createdUser.user.id,
    role: "admin",
    username,
  })

  if (profileError) {
    await adminSupabase.auth.admin.deleteUser(createdUser.user.id)
    backToAdminUsers(profileError.message, "error")
  }

  backToAdminUsers(`Akun admin ${username} berhasil dibuat`, "success")
}

export async function resetAdminPassword(formData: FormData) {
  await getInternalManagerRole()

  const adminId = String(formData.get("adminId") || "")
  const password = String(formData.get("password") || "")

  if (!adminId || !password) {
    backToAdminUsers("Akun admin dan password baru wajib diisi", "error")
  }

  if (password.length < 8) {
    backToAdminUsers("Password baru admin minimal 8 karakter", "error")
  }

  const adminSupabase = createAdminClient()
  const { error } = await adminSupabase.auth.admin.updateUserById(adminId, {
    password,
  })

  if (error) {
    backToAdminUsers(error.message, "error")
  }

  backToAdminUsers("Password admin berhasil diperbarui", "success")
}

export async function deleteAdminAccount(formData: FormData) {
  await getInternalManagerRole()

  const adminId = String(formData.get("adminId") || "")

  if (!adminId) {
    backToAdminUsers("Akun admin tidak valid", "error")
  }

  const adminSupabase = createAdminClient()

  const { data: targetProfile } = await adminSupabase
    .from("profiles")
    .select("role, username")
    .eq("id", adminId)
    .maybeSingle()

  if (!targetProfile || targetProfile.role !== "admin") {
    backToAdminUsers("Akun yang dipilih bukan admin biasa", "error")
  }

  await adminSupabase.from("profiles").delete().eq("id", adminId)
  const { error: deleteError } = await adminSupabase.auth.admin.deleteUser(adminId)

  if (deleteError) {
    backToAdminUsers(deleteError.message, "error")
  }

  backToAdminUsers(`Akun admin ${targetProfile.username || adminId} berhasil dihapus`, "success")
}

async function ensureSuperadmin() {
  const role = await getInternalManagerRole()
  if (role !== "superadmin") {
    backToAdminUsers("Hanya superadmin yang dapat mengelola akun finance", "error")
  }
}

export async function createFinanceAccount(formData: FormData) {
  await ensureSuperadmin()

  const email = String(formData.get("email") || "").trim().toLowerCase()
  const password = String(formData.get("password") || "")

  if (!email || !password) {
    backToAdminUsers("Email dan password akun finance wajib diisi", "error")
  }

  if (!email.includes("@")) {
    backToAdminUsers("Email akun finance tidak valid", "error")
  }

  if (password.length < 8) {
    backToAdminUsers("Password akun finance minimal 8 karakter", "error")
  }

  const adminSupabase = createAdminClient()
  const { data: createdUser, error: createError } = await adminSupabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      account_type: "finance",
    },
  })

  if (createError || !createdUser.user) {
    backToAdminUsers(createError?.message || "Gagal membuat akun finance", "error")
  }

  const { error: profileError } = await adminSupabase.from("profiles").upsert({
    id: createdUser.user.id,
    role: "finance",
    username: null,
  })

  if (profileError) {
    await adminSupabase.auth.admin.deleteUser(createdUser.user.id)
    backToAdminUsers(profileError.message, "error")
  }

  backToAdminUsers(`Akun finance ${email} berhasil dibuat`, "success")
}

export async function resetFinancePassword(formData: FormData) {
  await ensureSuperadmin()

  const financeId = String(formData.get("financeId") || "")
  const password = String(formData.get("password") || "")

  if (!financeId || !password) {
    backToAdminUsers("Akun finance dan password baru wajib diisi", "error")
  }

  if (password.length < 8) {
    backToAdminUsers("Password baru finance minimal 8 karakter", "error")
  }

  const adminSupabase = createAdminClient()
  const { error } = await adminSupabase.auth.admin.updateUserById(financeId, {
    password,
  })

  if (error) {
    backToAdminUsers(error.message, "error")
  }

  backToAdminUsers("Password finance berhasil diperbarui", "success")
}

export async function deleteFinanceAccount(formData: FormData) {
  await ensureSuperadmin()

  const financeId = String(formData.get("financeId") || "")

  if (!financeId) {
    backToAdminUsers("Akun finance tidak valid", "error")
  }

  const adminSupabase = createAdminClient()
  const { data: targetProfile } = await adminSupabase
    .from("profiles")
    .select("role")
    .eq("id", financeId)
    .maybeSingle()

  if (!targetProfile || targetProfile.role !== "finance") {
    backToAdminUsers("Akun yang dipilih bukan finance", "error")
  }

  await adminSupabase.from("profiles").delete().eq("id", financeId)
  const { error: deleteError } = await adminSupabase.auth.admin.deleteUser(financeId)

  if (deleteError) {
    backToAdminUsers(deleteError.message, "error")
  }

  backToAdminUsers("Akun finance berhasil dihapus", "success")
}
