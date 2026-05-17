"use server"

import { revalidatePath } from "next/cache"
import { createAdminAuditLog } from "@/lib/admin-audit"
import { sendNewsletterCampaign } from "@/lib/marketing-newsletter-campaigns"
import { isMarketingPromoStatus, shouldPromoBeIndexable } from "@/lib/marketing-promo-status"
import { normalizeBookingProductType } from "@/lib/booking-products"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { buildInternalMarketingEmail, isValidInternalUsername, normalizeInternalUsername } from "@/lib/internal-auth"
import { isMarketingPromoPlacementKey, marketingPromoPlacementKeys } from "@/lib/marketing-promo-placements"
import { isFinanceApprovalRole, isMarketingApprovalRole, isMarketingManagedRole } from "@/lib/internal-roles"
import { bootstrapInternalChatForNewAccount } from "@/lib/internal-chat/bootstrap"
import { isTransactionPromoChannel, isTransactionPromoDiscountType, normalizeTransactionPromoCode } from "@/lib/transaction-promos"
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

async function ensureMarketingCampaignApprover(returnTo?: string) {
  const actor = await getMarketingActor(returnTo)
  if (!isMarketingApprovalRole(actor.role)) {
    redirectWithMessage(returnTo || "/marketing/email-campaigns", "Hanya marketing manager atau superadmin yang dapat menyetujui dan mengirim campaign.", "error")
  }
  return actor
}

async function ensureTransactionPromoMarketingApprover(returnTo?: string) {
  const actor = await getInternalManagerActor(returnTo)
  if (!isMarketingApprovalRole(actor.role)) {
    redirectWithMessage(returnTo || "/marketing/transaction-promos", "Hanya marketing manager atau superadmin yang dapat menyetujui promo transaksi dari sisi marketing.", "error")
  }
  return actor
}

async function ensureTransactionPromoFinanceApprover(returnTo?: string) {
  const actor = await getInternalManagerActor(returnTo)
  if (!isFinanceApprovalRole(actor.role)) {
    redirectWithMessage(returnTo || "/finance/transaction-promos", "Hanya finance manager atau superadmin yang dapat memberi persetujuan angka promo transaksi.", "error")
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

function parseOptionalPositiveInteger(value: FormDataEntryValue | null) {
  const raw = String(value || "").trim()
  if (!raw) return null
  const parsed = Number(raw)
  if (!Number.isInteger(parsed) || parsed <= 0) return null
  return parsed
}

function parseOptionalNonNegativeNumber(value: FormDataEntryValue | null) {
  const raw = String(value || "").trim()
  if (!raw) return null
  const parsed = Number(raw)
  if (!Number.isFinite(parsed) || parsed < 0) return null
  return parsed
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

function getSelectedTransactionPromoProductTypes(formData: FormData) {
  return Array.from(
    new Set(
      formData
        .getAll("product_types")
        .map((value) => normalizeBookingProductType(String(value || "").trim()))
        .filter((value): value is NonNullable<ReturnType<typeof normalizeBookingProductType>> => Boolean(value)),
    ),
  )
}

function getSelectedLinkedTransactionPromoRuleIds(formData: FormData) {
  return Array.from(
    new Set(
      formData
        .getAll("linked_transaction_promo_rule_ids")
        .map((value) => String(value || "").trim())
        .filter(Boolean),
    ),
  )
}

function parseDateTimeValue(value: FormDataEntryValue | null) {
  const raw = String(value || "").trim()
  if (!raw) return null

  const parsed = new Date(raw)
  if (Number.isNaN(parsed.getTime())) return null
  return parsed.toISOString()
}

function revalidateMarketingPromoPublicPaths() {
  revalidatePath("/")
  revalidatePath("/packages")
  revalidatePath("/promo")
  revalidatePath("/wishlist")
  revalidatePath("/pesawat")
  revalidatePath("/hotel")
  revalidatePath("/kereta")
  revalidatePath("/bus")
  revalidatePath("/kapal")
  revalidatePath("/kapal-pesiar")
  revalidatePath("/aktivitas")
}

function getRecommendedMarketingPromoPlacementsByHref(targetHref?: string | null) {
  const href = String(targetHref || "").trim().toLowerCase()

  if (href.startsWith("/packages")) return ["packages_featured", "promo_listing"]
  if (href.startsWith("/pesawat")) return ["flights_featured", "promo_listing"]
  if (href.startsWith("/hotel")) return ["hotels_featured", "promo_listing"]
  if (href.startsWith("/kereta")) return ["trains_featured", "promo_listing"]
  if (href.startsWith("/bus")) return ["buses_featured", "promo_listing"]
  if (href.startsWith("/kapal-pesiar")) return ["cruises_featured", "promo_listing"]
  if (href.startsWith("/kapal")) return ["ships_featured", "promo_listing"]
  if (href.startsWith("/aktivitas")) return ["activities_featured", "promo_listing"]
  if (href.startsWith("/promo")) return ["promo_listing"]

  return ["homepage_feed", "promo_listing"]
}

function getRecommendedMarketingPromoProductTypesByHref(targetHref?: string | null) {
  const href = String(targetHref || "").trim().toLowerCase()

  if (href.startsWith("/packages")) return ["package_tour"]
  if (href.startsWith("/pesawat")) return ["flight"]
  if (href.startsWith("/hotel")) return ["hotel"]
  if (href.startsWith("/kereta")) return ["train"]
  if (href.startsWith("/bus")) return ["bus"]
  if (href.startsWith("/kapal-pesiar")) return ["cruise"]
  if (href.startsWith("/kapal")) return ["sea"]
  if (href.startsWith("/aktivitas")) return []
  if (href.startsWith("/promo")) return []

  return []
}

async function syncRecommendedMarketingPromoPlacementsForPromoIds(
  promoIds: string[],
  options: {
    mode: "apply" | "keep"
  },
) {
  const uniquePromoIds = Array.from(new Set(promoIds.map((value) => String(value || "").trim()).filter(Boolean)))
  if (!uniquePromoIds.length) {
    return {
      processedCount: 0,
      placementCount: 0,
      promoSlugs: [] as string[],
    }
  }

  const adminSupabase = createAdminClient()
  const { data: promos, error: promoError } = await adminSupabase
    .from("marketing_promos")
    .select("id, slug, sort_order, target_href")
    .in("id", uniquePromoIds)

  if (promoError) {
    return {
      error: promoError.message,
      processedCount: 0,
      placementCount: 0,
      promoSlugs: [] as string[],
    }
  }

  const promoRecords = ((promos as Array<{ id: string | null; slug: string | null; sort_order: number | null; target_href: string | null }> | null) || []).filter(
    (promo) => promo?.id,
  )

  if (!promoRecords.length) {
    return {
      processedCount: 0,
      placementCount: 0,
      promoSlugs: [] as string[],
    }
  }

  const nowIso = new Date().toISOString()
  let placementCount = 0

  for (const promo of promoRecords) {
    const promoId = String(promo.id || "")
    const recommendedPlacements = getRecommendedMarketingPromoPlacementsByHref(promo.target_href).filter(isMarketingPromoPlacementKey)

    if (!recommendedPlacements.length) continue

    placementCount += recommendedPlacements.length

    const rows = recommendedPlacements.map((placementKey) => ({
      promo_id: promoId,
      placement_key: placementKey,
      sort_order: promo.sort_order || 0,
      is_active: true,
      updated_at: nowIso,
    }))

    const { error: upsertError } = await adminSupabase.from("marketing_promo_placements").upsert(rows, {
      onConflict: "promo_id,placement_key",
    })

    if (upsertError) {
      return {
        error: upsertError.message,
        processedCount: 0,
        placementCount: 0,
        promoSlugs: [],
      }
    }

    if (options.mode === "keep") {
      const { error: cleanupError } = await adminSupabase
        .from("marketing_promo_placements")
        .delete()
        .eq("promo_id", promoId)
        .filter("placement_key", "not.in", `(${recommendedPlacements.map((value) => `"${value}"`).join(",")})`)

      if (cleanupError) {
        return {
          error: cleanupError.message,
          processedCount: 0,
          placementCount: 0,
          promoSlugs: [],
        }
      }
    }
  }

  return {
    processedCount: promoRecords.length,
    placementCount,
    promoSlugs: promoRecords.map((promo) => String(promo.slug || promo.id || "")).filter(Boolean),
  }
}

function getOptionalText(formData: FormData, key: string) {
  const value = getText(formData, key)
  return value || null
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

export async function upsertMarketingNewsletterCampaign(formData: FormData) {
  const returnTo = resolveReturnTo(formData, "/marketing/email-campaigns")
  const actor = await ensureMarketingContentOperator(returnTo)
  const campaignId = getText(formData, "campaign_id")
  const title = getText(formData, "title")
  const subject = getText(formData, "subject")
  const bodyHtml = getText(formData, "body_html")

  if (!title || !subject || !bodyHtml) {
    redirectWithMessage(returnTo, "Judul, subject, dan body HTML campaign wajib diisi.", "error")
  }

  const adminSupabase = createAdminClient()
  let approvalReset = false

  if (campaignId) {
    const { data: existingCampaign, error: existingCampaignError } = await adminSupabase
      .from("marketing_newsletter_campaigns")
      .select("id, status")
      .eq("id", campaignId)
      .maybeSingle()

    if (existingCampaignError || !existingCampaign) {
      redirectWithMessage(returnTo, existingCampaignError?.message || "Campaign email tidak ditemukan.", "error")
    }

    if (existingCampaign.status === "sent") {
      redirectWithMessage(returnTo, "Campaign yang sudah terkirim tidak bisa diubah lagi.", "error")
    }

    approvalReset = existingCampaign.status === "approved"
  }

  const payload = {
    ...(campaignId ? { id: campaignId } : {}),
    title,
    subject,
    preview_text: getOptionalText(formData, "preview_text"),
    body_html: bodyHtml,
    body_text: getOptionalText(formData, "body_text"),
    status: "draft",
    approved_by: null,
    approved_at: null,
    updated_by: actor.id,
    updated_at: new Date().toISOString(),
  }

  const { data, error } = await adminSupabase
    .from("marketing_newsletter_campaigns")
    .upsert(campaignId ? payload : { ...payload, created_by: actor.id }, { onConflict: "id" })
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
    action: campaignId ? "update_marketing_newsletter_campaign" : "create_marketing_newsletter_campaign",
    summary: campaignId ? `Campaign newsletter ${title} diperbarui` : `Campaign newsletter ${title} dibuat`,
    metadata: {
      scope: "marketing_content",
      section: "email_campaigns",
      title,
      subject,
      status: "draft",
      approvalReset,
    },
  })

  revalidatePath("/marketing/dashboard")
  revalidatePath("/marketing/email-campaigns")
  redirectWithMessage(
    returnTo,
    campaignId
      ? approvalReset
        ? "Campaign email diperbarui dan kembali ke draft untuk menunggu approval ulang."
        : "Campaign email berhasil diperbarui."
      : "Campaign email berhasil dibuat.",
    "success",
  )
}

export async function approveMarketingNewsletterCampaign(formData: FormData) {
  const returnTo = resolveReturnTo(formData, "/marketing/email-campaigns")
  const actor = await ensureMarketingCampaignApprover(returnTo)
  const campaignId = getText(formData, "campaign_id")

  if (!campaignId) {
    redirectWithMessage(returnTo, "Campaign email tidak valid.", "error")
  }

  const adminSupabase = createAdminClient()
  const { data: campaign, error: campaignError } = await adminSupabase
    .from("marketing_newsletter_campaigns")
    .select("id, title, status")
    .eq("id", campaignId)
    .maybeSingle()

  if (campaignError || !campaign) {
    redirectWithMessage(returnTo, campaignError?.message || "Campaign email tidak ditemukan.", "error")
  }

  if (campaign.status === "sent") {
    redirectWithMessage(returnTo, "Campaign ini sudah pernah dikirim.", "error")
  }

  if (campaign.status === "approved") {
    redirectWithMessage(returnTo, "Campaign ini sudah disetujui dan siap dikirim.", "error")
  }

  const now = new Date().toISOString()
  const { error: updateError } = await adminSupabase
    .from("marketing_newsletter_campaigns")
    .update({
      status: "approved",
      approved_by: actor.id,
      approved_at: now,
      updated_by: actor.id,
      updated_at: now,
    })
    .eq("id", campaignId)

  if (updateError) {
    redirectWithMessage(returnTo, updateError.message, "error")
  }

  await createAdminAuditLog({
    actorId: actor.id,
    actorRole: actor.role,
    targetType: "internal_account",
    targetId: campaignId,
    action: "approve_marketing_newsletter_campaign",
    summary: `Campaign newsletter ${campaign.title} disetujui`,
    metadata: {
      scope: "marketing_content",
      section: "email_campaigns",
      status: "approved",
    },
  })

  revalidatePath("/marketing/dashboard")
  revalidatePath("/marketing/email-campaigns")
  redirectWithMessage(returnTo, "Campaign email berhasil disetujui dan siap dikirim.", "success")
}

export async function sendMarketingNewsletterCampaign(formData: FormData) {
  const returnTo = resolveReturnTo(formData, "/marketing/email-campaigns")
  const actor = await ensureMarketingCampaignApprover(returnTo)
  const campaignId = getText(formData, "campaign_id")

  if (!campaignId) {
    redirectWithMessage(returnTo, "Campaign email tidak valid.", "error")
  }

  const adminSupabase = createAdminClient()
  const { data: campaign, error: campaignError } = await adminSupabase
    .from("marketing_newsletter_campaigns")
    .select("id, title, subject, preview_text, body_html, body_text, status, last_sent_at")
    .eq("id", campaignId)
    .maybeSingle()

  if (campaignError || !campaign) {
    redirectWithMessage(returnTo, campaignError?.message || "Campaign email tidak ditemukan.", "error")
  }

  if (campaign.status === "sent") {
    redirectWithMessage(returnTo, "Campaign ini sudah pernah dikirim.", "error")
  }

  if (campaign.status !== "approved") {
    redirectWithMessage(returnTo, "Campaign harus disetujui marketing manager atau superadmin sebelum dikirim.", "error")
  }

  const { data: subscribers, error: subscribersError } = await adminSupabase
    .from("newsletter_subscribers")
    .select("email, locale")
    .eq("status", "active")
    .order("subscribed_at", { ascending: false })

  if (subscribersError) {
    redirectWithMessage(returnTo, subscribersError.message, "error")
  }

  const audience = ((subscribers as Array<{ email: string | null; locale: string | null }> | null) || [])
    .map((subscriber) => ({
      email: String(subscriber.email || "").trim(),
      locale: subscriber.locale,
    }))
    .filter((subscriber) => subscriber.email)

  if (!audience.length) {
    redirectWithMessage(returnTo, "Belum ada subscriber aktif untuk menerima campaign ini.", "error")
  }

  try {
    const { data: existingDeliveries, error: existingDeliveriesError } = await adminSupabase
      .from("marketing_newsletter_campaign_deliveries")
      .select("email, status")
      .eq("campaign_id", campaignId)

    if (existingDeliveriesError) {
      redirectWithMessage(returnTo, existingDeliveriesError.message, "error")
    }

    const sentEmailSet = new Set(
      ((existingDeliveries as Array<{ email: string | null; status: string | null }> | null) || [])
        .filter((delivery) => delivery.status === "sent")
        .map((delivery) => String(delivery.email || "").trim().toLowerCase())
        .filter(Boolean),
    )

    const pendingAudience = audience.filter((subscriber) => !sentEmailSet.has(String(subscriber.email || "").trim().toLowerCase()))

    if (!pendingAudience.length) {
      const { error: completeUpdateError } = await adminSupabase
        .from("marketing_newsletter_campaigns")
        .update({
          status: "sent",
          audience_count: audience.length,
          sent_count: audience.length,
          last_sent_at: new Date().toISOString(),
          updated_by: actor.id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", campaignId)

      if (completeUpdateError) {
        redirectWithMessage(returnTo, completeUpdateError.message, "error")
      }

      revalidatePath("/marketing/dashboard")
      revalidatePath("/marketing/email-campaigns")
      redirectWithMessage(returnTo, "Semua subscriber aktif untuk campaign ini sudah pernah menerima emailnya.", "success")
    }

    const delivery = await sendNewsletterCampaign({
      subject: String(campaign.subject || "").trim(),
      previewText: String(campaign.preview_text || "").trim() || null,
      bodyHtml: String(campaign.body_html || "").trim(),
      bodyText: String(campaign.body_text || "").trim() || null,
      subscribers: pendingAudience,
    })

    const deliveryRows = delivery.results.map((result) => ({
      campaign_id: campaignId,
      email: result.email,
      locale: result.locale,
      status: result.status,
      error_message: result.errorMessage || null,
      sent_at: result.status === "sent" ? new Date().toISOString() : null,
      last_attempt_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }))

    if (deliveryRows.length) {
      const { error: deliveryLogError } = await adminSupabase
        .from("marketing_newsletter_campaign_deliveries")
        .upsert(deliveryRows, { onConflict: "campaign_id,email" })

      if (deliveryLogError) {
        redirectWithMessage(returnTo, deliveryLogError.message, "error")
      }
    }

    const totalSentCount = sentEmailSet.size + delivery.sentCount
    const isComplete = totalSentCount >= audience.length

    const { error: updateError } = await adminSupabase
      .from("marketing_newsletter_campaigns")
      .update({
        status: isComplete ? "sent" : "approved",
        audience_count: audience.length,
        sent_count: totalSentCount,
        last_sent_at: delivery.sentCount > 0 ? new Date().toISOString() : campaign.last_sent_at,
        updated_by: actor.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", campaignId)

    if (updateError) {
      redirectWithMessage(returnTo, updateError.message, "error")
    }

    await createAdminAuditLog({
      actorId: actor.id,
      actorRole: actor.role,
      targetType: "internal_account",
        targetId: campaignId,
        action: "send_marketing_newsletter_campaign",
        summary: `Campaign newsletter ${campaign.title} dikirim`,
        metadata: {
          scope: "marketing_content",
          section: "email_campaigns",
          audienceCount: audience.length,
          pendingAudienceCount: pendingAudience.length,
          sentCount: totalSentCount,
          sentThisAttempt: delivery.sentCount,
          failedThisAttempt: delivery.failedCount,
          completed: isComplete,
        },
      })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Pengiriman campaign email gagal."
    redirectWithMessage(returnTo, message, "error")
  }

  revalidatePath("/marketing/dashboard")
  revalidatePath("/marketing/email-campaigns")
  const { data: finalDeliveryRows } = await adminSupabase
    .from("marketing_newsletter_campaign_deliveries")
    .select("status")
    .eq("campaign_id", campaignId)

  const sentAfterAttempt = ((finalDeliveryRows as Array<{ status: string | null }> | null) || []).filter((row) => row.status === "sent").length
  if (sentAfterAttempt >= audience.length) {
    redirectWithMessage(returnTo, "Campaign email berhasil dikirim ke semua subscriber aktif.", "success")
  }

  redirectWithMessage(
    returnTo,
    `Pengiriman campaign dijalankan, tetapi masih ada subscriber yang belum sukses terkirim. Retry berikutnya akan melanjutkan sisanya tanpa mengulang yang sudah sukses.`,
    "success",
  )
}

export async function deleteMarketingNewsletterCampaign(formData: FormData) {
  const returnTo = resolveReturnTo(formData, "/marketing/email-campaigns")
  const actor = await ensureMarketingContentOperator(returnTo)
  const campaignId = getText(formData, "campaign_id")
  const title = getText(formData, "title")

  if (!campaignId) {
    redirectWithMessage(returnTo, "Campaign email tidak valid.", "error")
  }

  const adminSupabase = createAdminClient()
  const { error } = await adminSupabase.from("marketing_newsletter_campaigns").delete().eq("id", campaignId)

  if (error) {
    redirectWithMessage(returnTo, error.message, "error")
  }

  await createAdminAuditLog({
    actorId: actor.id,
    actorRole: actor.role,
    targetType: "internal_account",
    targetId: campaignId,
    action: "delete_marketing_newsletter_campaign",
    summary: `Campaign newsletter ${title || campaignId} dihapus`,
    metadata: {
      scope: "marketing_content",
      section: "email_campaigns",
      title,
    },
  })

  revalidatePath("/marketing/dashboard")
  revalidatePath("/marketing/email-campaigns")
  redirectWithMessage(returnTo, "Campaign email berhasil dihapus.", "success")
}

export async function upsertMarketingPromo(formData: FormData) {
  const returnTo = resolveReturnTo(formData, "/marketing/promos")
  const actor = await ensureMarketingContentOperator(returnTo)
  const promoId = getText(formData, "promo_id")
  const selectedPlacements = getSelectedPromoPlacements(formData)
  const linkedTransactionPromoRuleIds = getSelectedLinkedTransactionPromoRuleIds(formData)
  const status = getText(formData, "status").toLowerCase()
  const startsAt = parseDateTimeValue(formData.get("starts_at"))
  const endsAt = parseDateTimeValue(formData.get("ends_at"))
  const slug = getText(formData, "slug")
  const titleId = getText(formData, "title_id")
  const titleEn = getText(formData, "title_en")
  const titleZh = getText(formData, "title_zh")
  const targetHref = getText(formData, "target_href") || "/promo"

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
  const adminSupabase = createAdminClient()

  if (linkedTransactionPromoRuleIds.length) {
    const { data: linkedRules, error: linkedRulesError } = await adminSupabase
      .from("transaction_promo_rules")
      .select("id, name, transaction_promo_rule_targets(product_type)")
      .in("id", linkedTransactionPromoRuleIds)

    if (linkedRulesError) {
      redirectWithMessage(returnTo, linkedRulesError.message, "error")
    }

    const loadedRules =
      ((linkedRules as Array<{
        id: string | null
        name?: string | null
        transaction_promo_rule_targets?: Array<{ product_type?: string | null }> | null
      }> | null) || [])

    if (loadedRules.length !== linkedTransactionPromoRuleIds.length) {
      redirectWithMessage(returnTo, "Ada promo transaksi yang dipilih tetapi tidak ditemukan.", "error")
    }

    const requiredProductTypes = new Set(getRecommendedMarketingPromoProductTypesByHref(targetHref))
    if (requiredProductTypes.size) {
      const mismatchedRule = loadedRules.find((rule) => {
        const targetProductTypes = new Set(
          (rule.transaction_promo_rule_targets || [])
            .map((target) => normalizeBookingProductType(target.product_type))
            .filter(Boolean),
        )

        if (!targetProductTypes.size) return true

        for (const productType of targetProductTypes) {
          if (!requiredProductTypes.has(String(productType))) {
            return true
          }
        }

        return false
      })

      if (mismatchedRule) {
        redirectWithMessage(returnTo, `Promo transaksi ${String(mismatchedRule.name || mismatchedRule.id)} tidak cocok dengan target landing campaign ini.`, "error")
      }
    }
  }

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
    target_href: targetHref,
    is_active: shouldBeIndexable && String(formData.get("is_active") || "") === "on",
    status,
    starts_at: startsAt,
    ends_at: endsAt,
    sort_order: parseSortOrder(formData.get("sort_order")),
    updated_by: actor.id,
    updated_at: new Date().toISOString(),
  }

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

  const { error: deleteLinkError } = await adminSupabase
    .from("marketing_promo_transaction_rules")
    .delete()
    .eq("marketing_promo_id", data.id)

  if (deleteLinkError) {
    redirectWithMessage(returnTo, deleteLinkError.message, "error")
  }

  if (linkedTransactionPromoRuleIds.length) {
    const linkRows = linkedTransactionPromoRuleIds.map((transactionPromoRuleId) => ({
      marketing_promo_id: data.id,
      transaction_promo_rule_id: transactionPromoRuleId,
      created_by: actor.id,
      updated_by: actor.id,
    }))

    const { error: linkError } = await adminSupabase.from("marketing_promo_transaction_rules").insert(linkRows)
    if (linkError) {
      redirectWithMessage(returnTo, linkError.message, "error")
    }
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
      linkedTransactionPromoRuleIds,
    },
  })

  revalidateMarketingPromoPublicPaths()
  revalidatePath("/marketing/dashboard")
  revalidatePath("/marketing/promos")
  redirectWithMessage(returnTo, promoId ? "Promo berhasil diperbarui." : "Promo berhasil dibuat.", "success")
}

export async function upsertTransactionPromoRule(formData: FormData) {
  const returnTo = resolveReturnTo(formData, "/marketing/transaction-promos")
  const actor = await ensureMarketingContentOperator(returnTo)
  const ruleId = getText(formData, "rule_id")
  const name = getText(formData, "name")
  const description = getOptionalText(formData, "description")
  const code = normalizeTransactionPromoCode(getText(formData, "code"))
  const discountType = getText(formData, "discount_type").toLowerCase()
  const channel = getText(formData, "channel").toLowerCase() || "public_web"
  const startsAt = parseDateTimeValue(formData.get("starts_at"))
  const endsAt = parseDateTimeValue(formData.get("ends_at"))
  const productTypes = getSelectedTransactionPromoProductTypes(formData)
  const isAutoApply = String(formData.get("is_auto_apply") || "") === "on"
  const newUserOnly = String(formData.get("new_user_only") || "") === "on"
  const discountValue = parseOptionalNonNegativeNumber(formData.get("discount_value"))
  const maxDiscountAmount = parseOptionalNonNegativeNumber(formData.get("max_discount_amount"))
  const minimumOrderAmount = parseOptionalNonNegativeNumber(formData.get("minimum_order_amount")) ?? 0
  const quotaTotal = parseOptionalPositiveInteger(formData.get("quota_total"))
  const quotaPerUser = parseOptionalPositiveInteger(formData.get("quota_per_user"))
  const productId = getOptionalText(formData, "product_id")
  const productReference = getOptionalText(formData, "product_reference")
  const merchantId = getOptionalText(formData, "merchant_id")
  const paymentMethod = getOptionalText(formData, "payment_method")
  const customerLocale = getOptionalText(formData, "customer_locale")
  const originAirportCode = getOptionalText(formData, "origin_airport_code")
  const destinationAirportCode = getOptionalText(formData, "destination_airport_code")
  const airlineCode = getOptionalText(formData, "airline_code")
  const cabinClass = getOptionalText(formData, "cabin_class")
  const tripType = getOptionalText(formData, "trip_type")
  const departureStartsAt = parseDateTimeValue(formData.get("departure_starts_at"))
  const departureEndsAt = parseDateTimeValue(formData.get("departure_ends_at"))
  const returnStartsAt = parseDateTimeValue(formData.get("return_starts_at"))
  const returnEndsAt = parseDateTimeValue(formData.get("return_ends_at"))

  if (!name) {
    redirectWithMessage(returnTo, "Nama promo transaksi wajib diisi.", "error")
  }

  if (!isTransactionPromoDiscountType(discountType)) {
    redirectWithMessage(returnTo, "Jenis diskon promo transaksi tidak valid.", "error")
  }

  if (!isTransactionPromoChannel(channel)) {
    redirectWithMessage(returnTo, "Channel promo transaksi tidak valid.", "error")
  }

  if (!discountValue || discountValue <= 0) {
    redirectWithMessage(returnTo, "Nilai diskon promo transaksi wajib lebih dari nol.", "error")
  }

  if (!isAutoApply && !code) {
    redirectWithMessage(returnTo, "Promo manual wajib memiliki kode promo.", "error")
  }

  if (startsAt && endsAt && new Date(endsAt).getTime() < new Date(startsAt).getTime()) {
    redirectWithMessage(returnTo, "Tanggal akhir promo transaksi tidak boleh lebih awal dari tanggal mulai.", "error")
  }

  if (!productTypes.length) {
    redirectWithMessage(returnTo, "Pilih minimal satu jenis transaksi untuk promo ini.", "error")
  }

  if (quotaTotal && quotaPerUser && quotaPerUser > quotaTotal) {
    redirectWithMessage(returnTo, "Kuota per user tidak boleh melebihi kuota total.", "error")
  }

  if (
    departureStartsAt &&
    departureEndsAt &&
    new Date(departureEndsAt).getTime() < new Date(departureStartsAt).getTime()
  ) {
    redirectWithMessage(returnTo, "Window berangkat flight-ready tidak boleh berakhir lebih awal dari tanggal mulai.", "error")
  }

  if (
    returnStartsAt &&
    returnEndsAt &&
    new Date(returnEndsAt).getTime() < new Date(returnStartsAt).getTime()
  ) {
    redirectWithMessage(returnTo, "Window pulang flight-ready tidak boleh berakhir lebih awal dari tanggal mulai.", "error")
  }

  const hasFlightTargeting =
    Boolean(originAirportCode) ||
    Boolean(destinationAirportCode) ||
    Boolean(airlineCode) ||
    Boolean(cabinClass) ||
    Boolean(tripType) ||
    Boolean(departureStartsAt) ||
    Boolean(departureEndsAt) ||
    Boolean(returnStartsAt) ||
    Boolean(returnEndsAt)

  if (hasFlightTargeting && !productTypes.includes("flight")) {
    redirectWithMessage(returnTo, "Target flight-ready hanya boleh dipakai jika jenis transaksi mencakup pesawat.", "error")
  }

  const adminSupabase = createAdminClient()

  if (ruleId) {
    const { data: existingRule, error: existingRuleError } = await adminSupabase
      .from("transaction_promo_rules")
      .select("id")
      .eq("id", ruleId)
      .maybeSingle()

    if (existingRuleError || !existingRule) {
      redirectWithMessage(returnTo, existingRuleError?.message || "Promo transaksi tidak ditemukan.", "error")
    }
  }

  const nowIso = new Date().toISOString()

  const payload = {
    ...(ruleId ? { id: ruleId } : {}),
    code,
    name,
    description,
    discount_type: discountType,
    discount_value: discountValue,
    max_discount_amount: maxDiscountAmount,
    minimum_order_amount: minimumOrderAmount,
    quota_total: quotaTotal,
    quota_per_user: quotaPerUser,
    starts_at: startsAt,
    ends_at: endsAt,
    status: "draft",
    is_auto_apply: isAutoApply,
    new_user_only: newUserOnly,
    marketing_approved_by: null,
    marketing_approved_at: null,
    finance_approved_by: null,
    finance_approved_at: null,
    approved_by: null,
    approved_at: null,
    updated_by: actor.id,
    updated_at: nowIso,
  }

  const { data, error } = await adminSupabase
    .from("transaction_promo_rules")
    .upsert(ruleId ? payload : { ...payload, created_by: actor.id }, { onConflict: "id" })
    .select("id")
    .single()

  if (error) {
    redirectWithMessage(returnTo, error.message, "error")
  }

  const { error: deleteTargetsError } = await adminSupabase.from("transaction_promo_rule_targets").delete().eq("rule_id", data.id)
  if (deleteTargetsError) {
    redirectWithMessage(returnTo, deleteTargetsError.message, "error")
  }

  const targetRows = productTypes.map((productType) => ({
    rule_id: data.id,
    product_type: productType,
    product_id: productId,
    product_reference: productReference,
    merchant_id: merchantId,
    payment_method: paymentMethod,
    customer_locale: customerLocale,
    channel,
    origin_airport_code: originAirportCode,
    destination_airport_code: destinationAirportCode,
    airline_code: airlineCode,
    cabin_class: cabinClass,
    trip_type: tripType,
    departure_starts_at: departureStartsAt,
    departure_ends_at: departureEndsAt,
    return_starts_at: returnStartsAt,
    return_ends_at: returnEndsAt,
    updated_at: nowIso,
  }))

  const { error: targetError } = await adminSupabase.from("transaction_promo_rule_targets").insert(targetRows)
  if (targetError) {
    redirectWithMessage(returnTo, targetError.message, "error")
  }

  await createAdminAuditLog({
    actorId: actor.id,
    actorRole: actor.role,
    targetType: "internal_account",
    targetId: data.id,
    action: ruleId ? "update_transaction_promo_rule" : "create_transaction_promo_rule",
    summary: ruleId ? `Promo transaksi ${name} diperbarui` : `Promo transaksi ${name} dibuat`,
    metadata: {
      scope: "marketing_content",
      section: "transaction_promos",
      name,
        status: "draft",
        isAutoApply,
        newUserOnly,
        productTypes,
        channel,
        flightReady: hasFlightTargeting,
        approvalReset: Boolean(ruleId),
    },
  })

  revalidatePath("/marketing/dashboard")
  revalidatePath("/marketing/transaction-promos")
  revalidatePath("/finance/transaction-promos")
  redirectWithMessage(returnTo, ruleId ? "Promo transaksi diperbarui dan dikembalikan ke draft untuk peninjauan ulang." : "Promo transaksi berhasil dibuat sebagai draft.", "success")
}

export async function deleteTransactionPromoRule(formData: FormData) {
  const returnTo = resolveReturnTo(formData, "/marketing/transaction-promos")
  const actor = await ensureMarketingContentOperator(returnTo)
  const ruleId = getText(formData, "rule_id")
  const name = getText(formData, "name")

  if (!ruleId) {
    redirectWithMessage(returnTo, "Promo transaksi tidak valid.", "error")
  }

  const adminSupabase = createAdminClient()
  const { error } = await adminSupabase.from("transaction_promo_rules").delete().eq("id", ruleId)

  if (error) {
    redirectWithMessage(returnTo, error.message, "error")
  }

  await createAdminAuditLog({
    actorId: actor.id,
    actorRole: actor.role,
    targetType: "internal_account",
    targetId: ruleId,
    action: "delete_transaction_promo_rule",
    summary: `Promo transaksi ${name || ruleId} dihapus`,
    metadata: {
      scope: "marketing_content",
      section: "transaction_promos",
      name,
    },
  })

  revalidatePath("/marketing/dashboard")
  revalidatePath("/marketing/transaction-promos")
  revalidatePath("/finance/transaction-promos")
  redirectWithMessage(returnTo, "Promo transaksi berhasil dihapus.", "success")
}

export async function approveTransactionPromoForMarketing(formData: FormData) {
  const returnTo = resolveReturnTo(formData, "/marketing/transaction-promos")
  const actor = await ensureTransactionPromoMarketingApprover(returnTo)
  const ruleId = getText(formData, "rule_id")

  if (!ruleId) {
    redirectWithMessage(returnTo, "Promo transaksi tidak valid.", "error")
  }

  const adminSupabase = createAdminClient()
  const { data: rule, error: ruleError } = await adminSupabase
    .from("transaction_promo_rules")
    .select("id, name, status, finance_approved_at")
    .eq("id", ruleId)
    .maybeSingle()

  if (ruleError || !rule) {
    redirectWithMessage(returnTo, ruleError?.message || "Promo transaksi tidak ditemukan.", "error")
  }

  if (String(rule.status || "").toLowerCase() === "active" && rule.finance_approved_at) {
    redirectWithMessage(returnTo, "Promo transaksi ini sudah aktif dan telah lolos persetujuan finance.", "error")
  }

  const nowIso = new Date().toISOString()
  const { error: updateError } = await adminSupabase
    .from("transaction_promo_rules")
    .update({
      status: "approved",
      marketing_approved_by: actor.id,
      marketing_approved_at: nowIso,
      finance_approved_by: null,
      finance_approved_at: null,
      approved_by: null,
      approved_at: null,
      updated_by: actor.id,
      updated_at: nowIso,
    })
    .eq("id", ruleId)

  if (updateError) {
    redirectWithMessage(returnTo, updateError.message, "error")
  }

  await createAdminAuditLog({
    actorId: actor.id,
    actorRole: actor.role,
    targetType: "internal_account",
    targetId: ruleId,
    action: "approve_transaction_promo_marketing",
    summary: `Promo transaksi ${rule.name || ruleId} lolos persetujuan marketing`,
    metadata: {
      scope: "marketing_content",
      section: "transaction_promos",
      status: "approved",
    },
  })

  revalidatePath("/marketing/dashboard")
  revalidatePath("/marketing/transaction-promos")
  revalidatePath("/finance/transaction-promos")
  redirectWithMessage(returnTo, "Promo transaksi berhasil disetujui dari sisi marketing dan siap direview finance.", "success")
}

export async function approveTransactionPromoForFinance(formData: FormData) {
  const returnTo = resolveReturnTo(formData, "/finance/transaction-promos")
  const actor = await ensureTransactionPromoFinanceApprover(returnTo)
  const ruleId = getText(formData, "rule_id")

  if (!ruleId) {
    redirectWithMessage(returnTo, "Promo transaksi tidak valid.", "error")
  }

  const adminSupabase = createAdminClient()
  const { data: rule, error: ruleError } = await adminSupabase
    .from("transaction_promo_rules")
    .select("id, name, status, marketing_approved_at")
    .eq("id", ruleId)
    .maybeSingle()

  if (ruleError || !rule) {
    redirectWithMessage(returnTo, ruleError?.message || "Promo transaksi tidak ditemukan.", "error")
  }

  if (!rule.marketing_approved_at) {
    redirectWithMessage(returnTo, "Promo transaksi harus lolos persetujuan marketing manager terlebih dahulu.", "error")
  }

  const nowIso = new Date().toISOString()
  const { error: updateError } = await adminSupabase
    .from("transaction_promo_rules")
    .update({
      status: "active",
      finance_approved_by: actor.id,
      finance_approved_at: nowIso,
      approved_by: actor.id,
      approved_at: nowIso,
      updated_by: actor.id,
      updated_at: nowIso,
    })
    .eq("id", ruleId)

  if (updateError) {
    redirectWithMessage(returnTo, updateError.message, "error")
  }

  await createAdminAuditLog({
    actorId: actor.id,
    actorRole: actor.role,
    targetType: "internal_account",
    targetId: ruleId,
    action: "approve_transaction_promo_finance",
    summary: `Promo transaksi ${rule.name || ruleId} lolos persetujuan finance`,
    metadata: {
      scope: "finance_control",
      section: "transaction_promos",
      status: "active",
    },
  })

  revalidatePath("/marketing/dashboard")
  revalidatePath("/marketing/transaction-promos")
  revalidatePath("/finance/transaction-promos")
  redirectWithMessage(returnTo, "Promo transaksi berhasil diaktifkan setelah persetujuan finance.", "success")
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

  revalidateMarketingPromoPublicPaths()
  revalidatePath("/marketing/dashboard")
  revalidatePath("/marketing/promos")
  redirectWithMessage(returnTo, "Promo berhasil dihapus.", "success")
}

export async function toggleMarketingPromoPlacement(formData: FormData) {
  const returnTo = resolveReturnTo(formData, "/marketing/promos")
  const actor = await ensureMarketingContentOperator(returnTo)
  const promoId = getText(formData, "promo_id")
  const placementKey = getText(formData, "placement_key")
  const mode = getText(formData, "mode")
  const slug = getText(formData, "slug")

  if (!promoId || !placementKey || !isMarketingPromoPlacementKey(placementKey)) {
    redirectWithMessage(returnTo, "Placement promo tidak valid.", "error")
  }

  if (!["enable", "disable"].includes(mode)) {
    redirectWithMessage(returnTo, "Aksi placement tidak valid.", "error")
  }

  const adminSupabase = createAdminClient()
  const { data: promo, error: promoError } = await adminSupabase
    .from("marketing_promos")
    .select("id, sort_order, is_active")
    .eq("id", promoId)
    .maybeSingle()

  if (promoError || !promo) {
    redirectWithMessage(returnTo, promoError?.message || "Promo tidak ditemukan.", "error")
  }

  if (mode === "enable") {
    const { error: placementError } = await adminSupabase.from("marketing_promo_placements").upsert(
      {
        promo_id: promoId,
        placement_key: placementKey,
        sort_order: promo.sort_order || 0,
        is_active: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "promo_id,placement_key" },
    )

    if (placementError) {
      redirectWithMessage(returnTo, placementError.message, "error")
    }
  } else {
    const { error: placementError } = await adminSupabase
      .from("marketing_promo_placements")
      .delete()
      .eq("promo_id", promoId)
      .eq("placement_key", placementKey)

    if (placementError) {
      redirectWithMessage(returnTo, placementError.message, "error")
    }
  }

  await createAdminAuditLog({
    actorId: actor.id,
    actorRole: actor.role,
    targetType: "internal_account",
    targetId: promoId,
    action: mode === "enable" ? "enable_marketing_promo_placement" : "disable_marketing_promo_placement",
    summary: `Placement ${placementKey} untuk promo ${slug || promoId} ${mode === "enable" ? "diaktifkan" : "dinonaktifkan"}`,
    metadata: {
      scope: "marketing_content",
      section: "promos",
      slug,
      placementKey,
      mode,
    },
  })

  revalidateMarketingPromoPublicPaths()
  revalidatePath("/marketing/dashboard")
  revalidatePath("/marketing/promos")
  redirectWithMessage(returnTo, `Placement ${placementKey} berhasil ${mode === "enable" ? "diaktifkan" : "dinonaktifkan"}.`, "success")
}

export async function applyRecommendedMarketingPromoPlacements(formData: FormData) {
  const returnTo = resolveReturnTo(formData, "/marketing/promos")
  const actor = await ensureMarketingContentOperator(returnTo)
  const promoId = getText(formData, "promo_id")
  const slug = getText(formData, "slug")

  if (!promoId) {
    redirectWithMessage(returnTo, "Promo tidak valid.", "error")
  }

  const adminSupabase = createAdminClient()
  const { data: promo, error: promoError } = await adminSupabase
    .from("marketing_promos")
    .select("id, sort_order, target_href")
    .eq("id", promoId)
    .maybeSingle()

  if (promoError || !promo) {
    redirectWithMessage(returnTo, promoError?.message || "Promo tidak ditemukan.", "error")
  }

  const recommendedPlacements = getRecommendedMarketingPromoPlacementsByHref(promo.target_href).filter(isMarketingPromoPlacementKey)

  if (!recommendedPlacements.length) {
    redirectWithMessage(returnTo, "Promo ini belum punya slot rekomendasi yang valid.", "error")
  }

  const nowIso = new Date().toISOString()
  const rows = recommendedPlacements.map((placementKey) => ({
    promo_id: promoId,
    placement_key: placementKey,
    sort_order: promo.sort_order || 0,
    is_active: true,
    updated_at: nowIso,
  }))

  const { error: placementError } = await adminSupabase.from("marketing_promo_placements").upsert(rows, {
    onConflict: "promo_id,placement_key",
  })

  if (placementError) {
    redirectWithMessage(returnTo, placementError.message, "error")
  }

  await createAdminAuditLog({
    actorId: actor.id,
    actorRole: actor.role,
    targetType: "internal_account",
    targetId: promoId,
    action: "apply_recommended_marketing_promo_placements",
    summary: `Slot rekomendasi untuk promo ${slug || promoId} diaktifkan`,
    metadata: {
      scope: "marketing_content",
      section: "promos",
      slug,
      placementKeys: recommendedPlacements,
      targetHref: promo.target_href,
    },
  })

  revalidateMarketingPromoPublicPaths()
  revalidatePath("/marketing/dashboard")
  revalidatePath("/marketing/promos")
  redirectWithMessage(returnTo, "Slot rekomendasi promo berhasil diaktifkan.", "success")
}

export async function applyRecommendedMarketingPromoPlacementsBulk(formData: FormData) {
  const returnTo = resolveReturnTo(formData, "/marketing/promos")
  const actor = await ensureMarketingContentOperator(returnTo)
  const promoIds = formData.getAll("promo_ids").map((value) => String(value || ""))

  const result = await syncRecommendedMarketingPromoPlacementsForPromoIds(promoIds, { mode: "apply" })

  if ("error" in result && result.error) {
    redirectWithMessage(returnTo, result.error, "error")
  }

  if (!result.processedCount) {
    redirectWithMessage(returnTo, "Belum ada promo hasil filter yang bisa diproses.", "error")
  }

  await createAdminAuditLog({
    actorId: actor.id,
    actorRole: actor.role,
    targetType: "internal_account",
    targetId: result.promoSlugs[0] || "marketing_promos_bulk",
    action: "apply_recommended_marketing_promo_placements_bulk",
    summary: `${result.processedCount} promo hasil filter diaktifkan ke slot rekomendasi`,
    metadata: {
      scope: "marketing_content",
      section: "promos",
      processedCount: result.processedCount,
      placementCount: result.placementCount,
      promoSlugs: result.promoSlugs,
    },
  })

  revalidateMarketingPromoPublicPaths()
  revalidatePath("/marketing/dashboard")
  revalidatePath("/marketing/promos")
  redirectWithMessage(returnTo, `${result.processedCount} promo hasil filter berhasil diaktifkan ke slot rekomendasi.`, "success")
}

export async function bulkAssignMarketingPromoPlacement(formData: FormData) {
  const returnTo = resolveReturnTo(formData, "/marketing/promos")
  const actor = await ensureMarketingContentOperator(returnTo)
  const promoIds = Array.from(new Set(formData.getAll("promo_ids").map((value) => String(value || "").trim()).filter(Boolean)))
  const placementKey = getText(formData, "placement_key")

  if (!promoIds.length) {
    redirectWithMessage(returnTo, "Belum ada promo hasil filter yang bisa diproses.", "error")
  }

  if (!placementKey || !isMarketingPromoPlacementKey(placementKey)) {
    redirectWithMessage(returnTo, "Placement bulk tidak valid.", "error")
  }

  const adminSupabase = createAdminClient()
  const { data: promos, error: promoError } = await adminSupabase
    .from("marketing_promos")
    .select("id, slug, sort_order")
    .in("id", promoIds)

  if (promoError) {
    redirectWithMessage(returnTo, promoError.message, "error")
  }

  const promoRecords = ((promos as Array<{ id: string | null; slug: string | null; sort_order: number | null }> | null) || []).filter((promo) => promo?.id)

  if (!promoRecords.length) {
    redirectWithMessage(returnTo, "Promo hasil filter tidak ditemukan.", "error")
  }

  const nowIso = new Date().toISOString()
  const rows = promoRecords.map((promo) => ({
    promo_id: String(promo.id),
    placement_key: placementKey,
    sort_order: promo.sort_order || 0,
    is_active: true,
    updated_at: nowIso,
  }))

  const { error: upsertError } = await adminSupabase.from("marketing_promo_placements").upsert(rows, {
    onConflict: "promo_id,placement_key",
  })

  if (upsertError) {
    redirectWithMessage(returnTo, upsertError.message, "error")
  }

  await createAdminAuditLog({
    actorId: actor.id,
    actorRole: actor.role,
    targetType: "internal_account",
    targetId: promoRecords[0]?.id || "marketing_promos_bulk",
    action: "bulk_assign_marketing_promo_placement",
    summary: `${promoRecords.length} promo hasil filter dihubungkan ke placement ${placementKey}`,
    metadata: {
      scope: "marketing_content",
      section: "promos",
      placementKey,
      processedCount: promoRecords.length,
      promoSlugs: promoRecords.map((promo) => String(promo.slug || promo.id || "")).filter(Boolean),
    },
  })

  revalidateMarketingPromoPublicPaths()
  revalidatePath("/marketing/dashboard")
  revalidatePath("/marketing/promos")
  redirectWithMessage(returnTo, `${promoRecords.length} promo hasil filter berhasil ditambahkan ke slot ${placementKey}.`, "success")
}

export async function bulkRemoveMarketingPromoPlacement(formData: FormData) {
  const returnTo = resolveReturnTo(formData, "/marketing/promos")
  const actor = await ensureMarketingContentOperator(returnTo)
  const promoIds = Array.from(new Set(formData.getAll("promo_ids").map((value) => String(value || "").trim()).filter(Boolean)))
  const placementKey = getText(formData, "placement_key")

  if (!promoIds.length) {
    redirectWithMessage(returnTo, "Belum ada promo hasil filter yang bisa diproses.", "error")
  }

  if (!placementKey || !isMarketingPromoPlacementKey(placementKey)) {
    redirectWithMessage(returnTo, "Placement bulk tidak valid.", "error")
  }

  const adminSupabase = createAdminClient()
  const { data: promos, error: promoError } = await adminSupabase
    .from("marketing_promos")
    .select("id, slug")
    .in("id", promoIds)

  if (promoError) {
    redirectWithMessage(returnTo, promoError.message, "error")
  }

  const promoRecords = ((promos as Array<{ id: string | null; slug: string | null }> | null) || []).filter((promo) => promo?.id)

  if (!promoRecords.length) {
    redirectWithMessage(returnTo, "Promo hasil filter tidak ditemukan.", "error")
  }

  const promoIdSet = promoRecords.map((promo) => String(promo.id))
  const { error: deleteError } = await adminSupabase
    .from("marketing_promo_placements")
    .delete()
    .eq("placement_key", placementKey)
    .in("promo_id", promoIdSet)

  if (deleteError) {
    redirectWithMessage(returnTo, deleteError.message, "error")
  }

  await createAdminAuditLog({
    actorId: actor.id,
    actorRole: actor.role,
    targetType: "internal_account",
    targetId: promoRecords[0]?.id || "marketing_promos_bulk",
    action: "bulk_remove_marketing_promo_placement",
    summary: `${promoRecords.length} promo hasil filter dilepas dari placement ${placementKey}`,
    metadata: {
      scope: "marketing_content",
      section: "promos",
      placementKey,
      processedCount: promoRecords.length,
      promoSlugs: promoRecords.map((promo) => String(promo.slug || promo.id || "")).filter(Boolean),
    },
  })

  revalidateMarketingPromoPublicPaths()
  revalidatePath("/marketing/dashboard")
  revalidatePath("/marketing/promos")
  redirectWithMessage(returnTo, `${promoRecords.length} promo hasil filter berhasil dilepas dari slot ${placementKey}.`, "success")
}

export async function keepOnlyRecommendedMarketingPromoPlacements(formData: FormData) {
  const returnTo = resolveReturnTo(formData, "/marketing/promos")
  const actor = await ensureMarketingContentOperator(returnTo)
  const promoId = getText(formData, "promo_id")
  const slug = getText(formData, "slug")

  if (!promoId) {
    redirectWithMessage(returnTo, "Promo tidak valid.", "error")
  }

  const adminSupabase = createAdminClient()
  const { data: promo, error: promoError } = await adminSupabase
    .from("marketing_promos")
    .select("id, sort_order, target_href")
    .eq("id", promoId)
    .maybeSingle()

  if (promoError || !promo) {
    redirectWithMessage(returnTo, promoError?.message || "Promo tidak ditemukan.", "error")
  }

  const recommendedPlacements = getRecommendedMarketingPromoPlacementsByHref(promo.target_href).filter(isMarketingPromoPlacementKey)

  if (!recommendedPlacements.length) {
    redirectWithMessage(returnTo, "Promo ini belum punya slot rekomendasi yang valid.", "error")
  }

  const recommendedPlacementSet = new Set(recommendedPlacements)
  const nowIso = new Date().toISOString()
  const rows = recommendedPlacements.map((placementKey) => ({
    promo_id: promoId,
    placement_key: placementKey,
    sort_order: promo.sort_order || 0,
    is_active: true,
    updated_at: nowIso,
  }))

  const { error: upsertError } = await adminSupabase.from("marketing_promo_placements").upsert(rows, {
    onConflict: "promo_id,placement_key",
  })

  if (upsertError) {
    redirectWithMessage(returnTo, upsertError.message, "error")
  }

  const { error: cleanupError } = await adminSupabase
    .from("marketing_promo_placements")
    .delete()
    .eq("promo_id", promoId)
    .filter("placement_key", "not.in", `(${recommendedPlacements.map((value) => `"${value}"`).join(",")})`)

  if (cleanupError) {
    redirectWithMessage(returnTo, cleanupError.message, "error")
  }

  await createAdminAuditLog({
    actorId: actor.id,
    actorRole: actor.role,
    targetType: "internal_account",
    targetId: promoId,
    action: "keep_only_recommended_marketing_promo_placements",
    summary: `Promo ${slug || promoId} dirapikan agar hanya memakai slot rekomendasi`,
    metadata: {
      scope: "marketing_content",
      section: "promos",
      slug,
      placementKeys: recommendedPlacements,
      placementCount: recommendedPlacementSet.size,
      targetHref: promo.target_href,
    },
  })

  revalidateMarketingPromoPublicPaths()
  revalidatePath("/marketing/dashboard")
  revalidatePath("/marketing/promos")
  redirectWithMessage(returnTo, "Slot promo berhasil dirapikan ke rekomendasi saja.", "success")
}

export async function keepOnlyRecommendedMarketingPromoPlacementsBulk(formData: FormData) {
  const returnTo = resolveReturnTo(formData, "/marketing/promos")
  const actor = await ensureMarketingContentOperator(returnTo)
  const promoIds = formData.getAll("promo_ids").map((value) => String(value || ""))

  const result = await syncRecommendedMarketingPromoPlacementsForPromoIds(promoIds, { mode: "keep" })

  if ("error" in result && result.error) {
    redirectWithMessage(returnTo, result.error, "error")
  }

  if (!result.processedCount) {
    redirectWithMessage(returnTo, "Belum ada promo hasil filter yang bisa diproses.", "error")
  }

  await createAdminAuditLog({
    actorId: actor.id,
    actorRole: actor.role,
    targetType: "internal_account",
    targetId: result.promoSlugs[0] || "marketing_promos_bulk",
    action: "keep_only_recommended_marketing_promo_placements_bulk",
    summary: `${result.processedCount} promo hasil filter dirapikan ke slot rekomendasi`,
    metadata: {
      scope: "marketing_content",
      section: "promos",
      processedCount: result.processedCount,
      placementCount: result.placementCount,
      promoSlugs: result.promoSlugs,
    },
  })

  revalidateMarketingPromoPublicPaths()
  revalidatePath("/marketing/dashboard")
  revalidatePath("/marketing/promos")
  redirectWithMessage(returnTo, `${result.processedCount} promo hasil filter berhasil dirapikan ke slot rekomendasi.`, "success")
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
