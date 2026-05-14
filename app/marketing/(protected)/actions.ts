"use server"

import { revalidatePath } from "next/cache"
import { createAdminAuditLog } from "@/lib/admin-audit"
import { isMarketingPromoStatus, shouldPromoBeIndexable } from "@/lib/marketing-promo-status"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { buildInternalMarketingEmail, isValidInternalUsername, normalizeInternalUsername } from "@/lib/internal-auth"
import { isMarketingPromoPlacementKey, marketingPromoPlacementKeys } from "@/lib/marketing-promo-placements"
import { isMarketingManagedRole } from "@/lib/internal-roles"
import { bootstrapInternalChatForNewAccount } from "@/lib/internal-chat/bootstrap"
import {
  formatAccountErrorMessage,
  getInternalManagerActor,
  redirectWithMessage,
  resolveReturnTo,
} from "@/lib/internal-account-management"

async function getMarketingActor(returnTo?: string) {
  const supabase = await createClient("marketing")
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirectWithMessage(returnTo || "/marketing/dashboard", "Silakan login ulang ke portal marketing.", "error")
  }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()

  if (!profile || !["marketing", "marketing_manager", "superadmin"].includes(profile.role || "")) {
    redirectWithMessage(returnTo || "/marketing/dashboard", "Akun ini tidak memiliki akses marketing.", "error")
  }

  return { id: user.id, role: profile.role }
}

async function ensureMarketingContentOperator(returnTo?: string) {
  const actor = await getMarketingActor(returnTo)
  if (!["marketing", "marketing_manager", "superadmin"].includes(actor.role)) {
    redirectWithMessage(returnTo || "/marketing/dashboard", "Akun ini belum bisa mengelola konten marketing.", "error")
  }
  return actor
}

async function ensureMarketingAccountOperator(returnTo?: string) {
  const actor = await getInternalManagerActor(returnTo)
  if (!["marketing_manager", "superadmin"].includes(actor.role)) {
    redirectWithMessage(returnTo || "/marketing/team-accounts", "Hanya marketing manager atau superadmin yang dapat mengelola akun marketing.", "error")
  }
  return actor
}

function parseSortOrder(value: FormDataEntryValue | null) {
  const parsed = Number(String(value || "").trim())
  return Number.isFinite(parsed) ? parsed : 0
}

function getText(formData: FormData, key: string) {
  return String(formData.get(key) || "").trim()
}

function getSelectedPromoPlacements(formData: FormData) {
  const selected = formData
    .getAll("placements")
    .map((value) => String(value || "").trim())
    .filter(isMarketingPromoPlacementKey)

  return Array.from(new Set(selected.length ? selected : [...marketingPromoPlacementKeys]))
}

function parseDateTimeValue(value: FormDataEntryValue | null) {
  const raw = String(value || "").trim()
  if (!raw) return null

  const parsed = new Date(raw)
  if (Number.isNaN(parsed.getTime())) return null
  return parsed.toISOString()
}

export async function updateNewsletterSubscriberStatus(formData: FormData) {
  const returnTo = resolveReturnTo(formData, "/marketing/newsletters")
  const actor = await ensureMarketingContentOperator(returnTo)
  const subscriberId = getText(formData, "subscriber_id")
  const nextStatus = getText(formData, "next_status")

  if (!subscriberId || !["active", "unsubscribed"].includes(nextStatus)) {
    redirectWithMessage(returnTo, "Data subscriber tidak valid.", "error")
  }

  const adminSupabase = createAdminClient()
  const { error } = await adminSupabase
    .from("newsletter_subscribers")
    .update({
      status: nextStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("id", subscriberId)

  if (error) {
    redirectWithMessage(returnTo, error.message, "error")
  }

  await createAdminAuditLog({
    actorId: actor.id,
    actorRole: actor.role,
    targetType: "internal_account",
    targetId: subscriberId,
    action: "newsletter_status_update",
    summary: `Status subscriber newsletter diperbarui menjadi ${nextStatus}`,
    metadata: {
      scope: "marketing_content",
      section: "newsletter",
      status: nextStatus,
    },
  })

  revalidatePath("/marketing/dashboard")
  revalidatePath("/marketing/newsletters")
  redirectWithMessage(returnTo, "Status subscriber berhasil diperbarui.", "success")
}

export async function upsertMarketingPromo(formData: FormData) {
  const returnTo = resolveReturnTo(formData, "/marketing/promos")
  const actor = await ensureMarketingContentOperator(returnTo)
  const promoId = getText(formData, "promo_id")
  const selectedPlacements = getSelectedPromoPlacements(formData)
  const status = getText(formData, "status").toLowerCase()
  const startsAt = parseDateTimeValue(formData.get("starts_at"))
  const endsAt = parseDateTimeValue(formData.get("ends_at"))
  const slug = getText(formData, "slug")
  const titleId = getText(formData, "title_id")
  const titleEn = getText(formData, "title_en")
  const titleZh = getText(formData, "title_zh")

  if (!slug || !titleId || !titleEn || !titleZh) {
    redirectWithMessage(returnTo, "Slug dan seluruh judul promo wajib diisi.", "error")
  }

  if (!isMarketingPromoStatus(status)) {
    redirectWithMessage(returnTo, "Status promo tidak valid.", "error")
  }

  if (status === "scheduled" && !startsAt) {
    redirectWithMessage(returnTo, "Promo scheduled wajib memiliki tanggal mulai tayang.", "error")
  }

  if (startsAt && endsAt && new Date(endsAt).getTime() < new Date(startsAt).getTime()) {
    redirectWithMessage(returnTo, "Tanggal akhir promo tidak boleh lebih awal dari tanggal mulai.", "error")
  }

  const shouldBeIndexable = shouldPromoBeIndexable(status)

  const payload = {
    ...(promoId ? { id: promoId } : {}),
    slug,
    title_id: titleId,
    title_en: titleEn,
    title_zh: titleZh,
    badge_id: getText(formData, "badge_id") || null,
    badge_en: getText(formData, "badge_en") || null,
    badge_zh: getText(formData, "badge_zh") || null,
    eyebrow_id: getText(formData, "eyebrow_id"),
    eyebrow_en: getText(formData, "eyebrow_en"),
    eyebrow_zh: getText(formData, "eyebrow_zh"),
    price_id: getText(formData, "price_id"),
    price_en: getText(formData, "price_en"),
    price_zh: getText(formData, "price_zh"),
    cta_id: getText(formData, "cta_id"),
    cta_en: getText(formData, "cta_en"),
    cta_zh: getText(formData, "cta_zh"),
    image: getText(formData, "image"),
    gradient: getText(formData, "gradient"),
    image_class: getText(formData, "image_class"),
    overlay_class: getText(formData, "overlay_class"),
    glow_class: getText(formData, "glow_class"),
    target_href: getText(formData, "target_href") || "/promo",
    is_active: shouldBeIndexable && String(formData.get("is_active") || "") === "on",
    status,
    starts_at: startsAt,
    ends_at: endsAt,
    sort_order: parseSortOrder(formData.get("sort_order")),
    updated_by: actor.id,
    updated_at: new Date().toISOString(),
  }

  const adminSupabase = createAdminClient()
  const { data, error } = await adminSupabase
    .from("marketing_promos")
    .upsert(
      promoId ? payload : { ...payload, created_by: actor.id },
      { onConflict: "id" },
    )
    .select("id")
    .single()

  if (error) {
    redirectWithMessage(returnTo, error.message, "error")
  }

  const placementRows = selectedPlacements.map((placementKey) => ({
    promo_id: data.id,
    placement_key: placementKey,
    sort_order: payload.sort_order,
    is_active: payload.is_active,
    updated_at: new Date().toISOString(),
  }))

  const { error: deletePlacementError } = await adminSupabase.from("marketing_promo_placements").delete().eq("promo_id", data.id)

  if (deletePlacementError) {
    redirectWithMessage(returnTo, deletePlacementError.message, "error")
  }

  const { error: placementError } = await adminSupabase.from("marketing_promo_placements").insert(placementRows)

  if (placementError) {
    redirectWithMessage(returnTo, placementError.message, "error")
  }

  await createAdminAuditLog({
    actorId: actor.id,
    actorRole: actor.role,
    targetType: "internal_account",
    targetId: data.id,
    action: promoId ? "update_marketing_promo" : "create_marketing_promo",
    summary: promoId ? `Promo ${slug} diperbarui` : `Promo ${slug} dibuat`,
    metadata: {
      scope: "marketing_content",
      section: "promos",
      slug,
      status,
      startsAt,
      endsAt,
      placements: selectedPlacements,
    },
  })

  revalidatePath("/")
  revalidatePath("/packages")
  revalidatePath("/promo")
  revalidatePath("/wishlist")
  revalidatePath("/marketing/dashboard")
  revalidatePath("/marketing/promos")
  redirectWithMessage(returnTo, promoId ? "Promo berhasil diperbarui." : "Promo berhasil dibuat.", "success")
}

export async function deleteMarketingPromo(formData: FormData) {
  const returnTo = resolveReturnTo(formData, "/marketing/promos")
  const actor = await ensureMarketingContentOperator(returnTo)
  const promoId = getText(formData, "promo_id")
  const slug = getText(formData, "slug")

  if (!promoId) {
    redirectWithMessage(returnTo, "Promo tidak valid.", "error")
  }

  const adminSupabase = createAdminClient()
  const { error } = await adminSupabase.from("marketing_promos").delete().eq("id", promoId)

  if (error) {
    redirectWithMessage(returnTo, error.message, "error")
  }

  await createAdminAuditLog({
    actorId: actor.id,
    actorRole: actor.role,
    targetType: "internal_account",
    targetId: promoId,
    action: "delete_marketing_promo",
    summary: `Promo ${slug || promoId} dihapus`,
    metadata: {
      scope: "marketing_content",
      section: "promos",
      slug,
    },
  })

  revalidatePath("/")
  revalidatePath("/packages")
  revalidatePath("/promo")
  revalidatePath("/wishlist")
  revalidatePath("/marketing/dashboard")
  revalidatePath("/marketing/promos")
  redirectWithMessage(returnTo, "Promo berhasil dihapus.", "success")
}

export async function upsertMarketingInspiration(formData: FormData) {
  const returnTo = resolveReturnTo(formData, "/marketing/inspiration")
  const actor = await ensureMarketingContentOperator(returnTo)
  const articleId = getText(formData, "article_id")
  const slug = getText(formData, "slug")
  const titleId = getText(formData, "title_id")
  const titleEn = getText(formData, "title_en")
  const titleZh = getText(formData, "title_zh")

  if (!slug || !titleId || !titleEn || !titleZh) {
    redirectWithMessage(returnTo, "Slug dan seluruh judul artikel wajib diisi.", "error")
  }

  const payload = {
    ...(articleId ? { id: articleId } : {}),
    slug,
    category_id: getText(formData, "category_id"),
    category_en: getText(formData, "category_en"),
    category_zh: getText(formData, "category_zh"),
    title_id: titleId,
    title_en: titleEn,
    title_zh: titleZh,
    read_time_id: getText(formData, "read_time_id"),
    read_time_en: getText(formData, "read_time_en"),
    read_time_zh: getText(formData, "read_time_zh"),
    body_intro_id: getText(formData, "body_intro_id"),
    body_intro_en: getText(formData, "body_intro_en"),
    body_intro_zh: getText(formData, "body_intro_zh"),
    section_one_id: getText(formData, "section_one_id"),
    section_one_en: getText(formData, "section_one_en"),
    section_one_zh: getText(formData, "section_one_zh"),
    section_two_id: getText(formData, "section_two_id"),
    section_two_en: getText(formData, "section_two_en"),
    section_two_zh: getText(formData, "section_two_zh"),
    section_three_id: getText(formData, "section_three_id"),
    section_three_en: getText(formData, "section_three_en"),
    section_three_zh: getText(formData, "section_three_zh"),
    image: getText(formData, "image"),
    href: getText(formData, "href") || "/packages",
    is_active: String(formData.get("is_active") || "") === "on",
    sort_order: parseSortOrder(formData.get("sort_order")),
    updated_by: actor.id,
    updated_at: new Date().toISOString(),
  }

  const adminSupabase = createAdminClient()
  const { data, error } = await adminSupabase
    .from("marketing_inspiration_articles")
    .upsert(articleId ? payload : { ...payload, created_by: actor.id }, { onConflict: "id" })
    .select("id")
    .single()

  if (error) {
    redirectWithMessage(returnTo, error.message, "error")
  }

  await createAdminAuditLog({
    actorId: actor.id,
    actorRole: actor.role,
    targetType: "internal_account",
    targetId: data.id,
    action: articleId ? "update_marketing_article" : "create_marketing_article",
    summary: articleId ? `Artikel inspirasi ${slug} diperbarui` : `Artikel inspirasi ${slug} dibuat`,
    metadata: {
      scope: "marketing_content",
      section: "inspiration",
      slug,
    },
  })

  revalidatePath("/")
  revalidatePath("/marketing/dashboard")
  revalidatePath("/marketing/inspiration")
  redirectWithMessage(returnTo, articleId ? "Artikel berhasil diperbarui." : "Artikel berhasil dibuat.", "success")
}

export async function deleteMarketingInspiration(formData: FormData) {
  const returnTo = resolveReturnTo(formData, "/marketing/inspiration")
  const actor = await ensureMarketingContentOperator(returnTo)
  const articleId = getText(formData, "article_id")
  const slug = getText(formData, "slug")

  if (!articleId) {
    redirectWithMessage(returnTo, "Artikel tidak valid.", "error")
  }

  const adminSupabase = createAdminClient()
  const { error } = await adminSupabase.from("marketing_inspiration_articles").delete().eq("id", articleId)

  if (error) {
    redirectWithMessage(returnTo, error.message, "error")
  }

  await createAdminAuditLog({
    actorId: actor.id,
    actorRole: actor.role,
    targetType: "internal_account",
    targetId: articleId,
    action: "delete_marketing_article",
    summary: `Artikel inspirasi ${slug || articleId} dihapus`,
    metadata: {
      scope: "marketing_content",
      section: "inspiration",
      slug,
    },
  })

  revalidatePath("/")
  revalidatePath("/marketing/dashboard")
  revalidatePath("/marketing/inspiration")
  redirectWithMessage(returnTo, "Artikel berhasil dihapus.", "success")
}

export async function createMarketingAccount(formData: FormData) {
  const returnTo = resolveReturnTo(formData, "/marketing/team-accounts")
  const actor = await ensureMarketingAccountOperator(returnTo)
  const username = normalizeInternalUsername(getText(formData, "username"))
  const password = getText(formData, "password")
  const requestedRole = getText(formData, "role").toLowerCase() || "marketing"

  if (!username || !password) {
    redirectWithMessage(returnTo, "Username dan password akun marketing wajib diisi", "error")
  }

  if (!isMarketingManagedRole(requestedRole)) {
    redirectWithMessage(returnTo, "Role akun marketing tidak valid", "error")
  }

  if (actor.role !== "superadmin" && requestedRole !== "marketing") {
    redirectWithMessage(returnTo, "Hanya superadmin yang dapat membuat marketing manager.", "error")
  }

  if (!isValidInternalUsername(username)) {
    redirectWithMessage(returnTo, "Username marketing harus 3-32 karakter dan hanya boleh berisi huruf kecil, angka, titik, garis bawah, atau dash", "error")
  }

  if (password.length < 8) {
    redirectWithMessage(returnTo, "Password akun marketing minimal 8 karakter", "error")
  }

  const adminSupabase = createAdminClient()
  const email = buildInternalMarketingEmail(username)
  const { data: existingProfile } = await adminSupabase.from("profiles").select("id").eq("username", username).maybeSingle()
  if (existingProfile) {
    redirectWithMessage(returnTo, "Username marketing sudah dipakai", "error")
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
    redirectWithMessage(returnTo, createError?.message || "Gagal membuat akun marketing", "error")
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

  const roleLabel = requestedRole === "marketing_manager" ? "marketing manager" : "marketing"
  await createAdminAuditLog({
    actorId: actor.id,
    actorRole: actor.role,
    targetType: "internal_account",
    targetId: createdUser.user.id,
    action: "create_account",
    summary: `Akun ${roleLabel} ${username} dibuat`,
    metadata: {
      scope: "marketing_team",
      username,
      requestedRole,
    },
  })

  redirectWithMessage(returnTo, `Akun ${roleLabel} ${username} berhasil dibuat`, "success")
}

export async function resetMarketingPassword(formData: FormData) {
  const returnTo = resolveReturnTo(formData, "/marketing/team-accounts")
  const actor = await ensureMarketingAccountOperator(returnTo)
  const marketingId = getText(formData, "marketingId")
  const password = getText(formData, "password")

  if (!marketingId || !password) {
    redirectWithMessage(returnTo, "Akun marketing dan password baru wajib diisi", "error")
  }

  if (password.length < 8) {
    redirectWithMessage(returnTo, "Password baru marketing minimal 8 karakter", "error")
  }

  if (marketingId === actor.id) {
    redirectWithMessage(returnTo, "Akun yang sedang Anda pakai tidak boleh reset password dari panel ini", "error")
  }

  const adminSupabase = createAdminClient()
  const { data: targetProfile } = await adminSupabase.from("profiles").select("role").eq("id", marketingId).maybeSingle()

  if (!targetProfile || !isMarketingManagedRole(targetProfile.role)) {
    redirectWithMessage(returnTo, "Akun yang dipilih bukan akun marketing yang valid", "error")
  }

  if (actor.role !== "superadmin" && targetProfile.role !== "marketing") {
    redirectWithMessage(returnTo, "Marketing manager hanya dapat reset password marketing team.", "error")
  }

  const { error } = await adminSupabase.auth.admin.updateUserById(marketingId, { password })
  if (error) {
    redirectWithMessage(returnTo, error.message, "error")
  }

  await createAdminAuditLog({
    actorId: actor.id,
    actorRole: actor.role,
    targetType: "internal_account",
    targetId: marketingId,
    action: "reset_password",
    summary: `Password akun ${targetProfile.role === "marketing_manager" ? "marketing manager" : "marketing"} diperbarui`,
    metadata: {
      scope: "marketing_team",
      targetRole: targetProfile.role,
    },
  })

  redirectWithMessage(returnTo, "Password marketing berhasil diperbarui", "success")
}

export async function deleteMarketingAccount(formData: FormData) {
  const returnTo = resolveReturnTo(formData, "/marketing/team-accounts")
  const actor = await ensureMarketingAccountOperator(returnTo)
  const marketingId = getText(formData, "marketingId")

  if (!marketingId) {
    redirectWithMessage(returnTo, "Akun marketing tidak valid", "error")
  }

  if (marketingId === actor.id) {
    redirectWithMessage(returnTo, "Akun yang sedang Anda pakai tidak boleh dihapus dari panel ini", "error")
  }

  const adminSupabase = createAdminClient()
  const { data: targetProfile } = await adminSupabase.from("profiles").select("role, username").eq("id", marketingId).maybeSingle()

  if (!targetProfile || !isMarketingManagedRole(targetProfile.role)) {
    redirectWithMessage(returnTo, "Akun yang dipilih bukan akun marketing yang valid", "error")
  }

  if (actor.role !== "superadmin" && targetProfile.role !== "marketing") {
    redirectWithMessage(returnTo, "Marketing manager hanya dapat menghapus akun marketing team.", "error")
  }

  await adminSupabase.from("profiles").delete().eq("id", marketingId)
  const { error: deleteError } = await adminSupabase.auth.admin.deleteUser(marketingId)

  if (deleteError) {
    redirectWithMessage(returnTo, deleteError.message, "error")
  }

  await createAdminAuditLog({
    actorId: actor.id,
    actorRole: actor.role,
    targetType: "internal_account",
    targetId: marketingId,
    action: "delete_account",
    summary: `Akun ${targetProfile.role === "marketing_manager" ? "marketing manager" : "marketing"} ${targetProfile.username || marketingId} dihapus`,
    metadata: {
      scope: "marketing_team",
      username: targetProfile.username,
      targetRole: targetProfile.role,
    },
  })

  redirectWithMessage(returnTo, `Akun ${targetProfile.role === "marketing_manager" ? "marketing manager" : "marketing"} berhasil dihapus`, "success")
}
