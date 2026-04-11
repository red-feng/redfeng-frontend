"use server"

import { getOptionalEnv } from "@/lib/env"
import { createAdminClient } from "@/lib/supabase/admin"
import { revalidatePath } from "next/cache"
import { Resend } from "resend"
import { createClient } from "@/lib/supabase/server"
import { createAdminAuditLog } from "@/lib/admin-audit"
import { isAdminExecutionRole } from "@/lib/internal-roles"
import { normalizeLocale, type Locale } from "@/lib/i18n"
import { redirectWithMessage } from "@/lib/internal-account-management"
import { purgeMerchantAccountRecords } from "@/lib/merchant-review-cleanup"

function revalidateMerchantPages() {
  revalidatePath("/admin/merchants")
  revalidatePath("/merchant/dashboard")
  revalidatePath("/merchant/login")
  revalidatePath("/admin/packages")
  revalidatePath("/finance/payouts")
  revalidatePath("/finance/refunds")
}

function backToMerchants(message: string, type: "success" | "error"): never {
  redirectWithMessage("/admin/merchants", message, type)
}

function isMissingMerchantReviewRequestsTableError(error: { message?: string | null; code?: string | null } | null | undefined) {
  const message = String(error?.message || "").toLowerCase()
  return message.includes("merchant_review_requests") && message.includes("schema cache")
}

function getMerchantReviewRequestsUnavailableMessage() {
  return "Fitur review manager merchant belum aktif karena migration database merchant_review_requests belum dijalankan di Supabase."
}

async function getAdminActor() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error("Sesi admin tidak ditemukan.")
  }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
  if (!profile || !isAdminExecutionRole(profile.role)) {
    throw new Error("Akses admin tidak valid.")
  }

  return {
    id: user.id,
    role: profile.role,
  }
}

async function getMerchantManagerReviewer() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error("Sesi reviewer tidak ditemukan.")
  }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
  const role = String(profile?.role || "").trim().toLowerCase()
  if (!["operations_manager", "superadmin"].includes(role)) {
    throw new Error("Hanya operations manager atau superadmin yang dapat mereview merchant.")
  }

  return {
    id: user.id,
    role,
  }
}

async function findPendingMerchantReviewRequest(adminSupabase: ReturnType<typeof createAdminClient>, merchantId: string) {
  const { data, error } = await adminSupabase
    .from("merchant_review_requests")
    .select("id, status, request_type, requested_by")
    .eq("merchant_id", merchantId)
    .eq("status", "pending")
    .maybeSingle()

  if (error) {
    throw error
  }

  return data
}

async function findPendingDeletionRequest(
  adminSupabase: ReturnType<typeof createAdminClient>,
  target: { merchantId?: string; profileId?: string },
) {
  if (target.merchantId) {
    const { data } = await adminSupabase
      .from("merchant_deletion_requests")
      .select("id, status")
      .eq("merchant_id", target.merchantId)
      .in("status", ["pending", "manager_rejected"])
      .maybeSingle()
    return data
  }

  if (target.profileId) {
    const { data } = await adminSupabase
      .from("merchant_deletion_requests")
      .select("id, status")
      .eq("profile_id", target.profileId)
      .in("status", ["pending", "manager_rejected"])
      .maybeSingle()
    return data
  }

  return null
}

async function sendAdminDeletionReviewEmail({
  email,
  merchantName,
  reason,
}: {
  email: string | null
  merchantName: string
  reason: string
}) {
  if (!email) return

  const resendApiKey = getOptionalEnv("RESEND_API_KEY")
  if (!resendApiKey) {
    console.error("RESEND_API_KEY not found")
    return
  }

  const resend = new Resend(resendApiKey)
  await resend.emails.send({
    from: "RedFeng Admin <admin@redfeng.co>",
    to: email,
    subject: "RedFeng Internal: Pengajuan hapus merchant ditolak operations manager",
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.7;color:#0f172a;max-width:640px;">
        <h2 style="margin:0 0 12px;">Halo Admin,</h2>
        <p style="margin:0 0 14px;">Pengajuan hapus merchant untuk <strong>${merchantName}</strong> tidak disetujui oleh operations manager.</p>
        <p style="margin:0 0 8px;"><strong>Alasan operations manager</strong></p>
        <p style="margin:0 0 18px;">${reason}</p>
        <p style="margin:0;">Silakan buka Merchant Directory untuk meninjau alasan tersebut dan klik <strong>Batalkan penghapusan</strong> jika request ini ingin ditutup.</p>
      </div>
    `,
  })
}

async function sendAdminMerchantReviewRejectionEmail({
  email,
  merchantName,
  reason,
  deadlineAt,
}: {
  email: string | null
  merchantName: string
  reason: string
  deadlineAt: string
}) {
  if (!email) return

  const resendApiKey = getOptionalEnv("RESEND_API_KEY")
  if (!resendApiKey) {
    console.error("RESEND_API_KEY not found")
    return
  }

  const deadlineLabel = new Date(deadlineAt).toLocaleString("id-ID", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: "Asia/Jakarta",
  })

  const resend = new Resend(resendApiKey)
  await resend.emails.send({
    from: "RedFeng Admin <admin@redfeng.co>",
    to: email,
    subject: "RedFeng Internal: Merchant ditolak operations manager",
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.7;color:#0f172a;max-width:640px;">
        <h2 style="margin:0 0 12px;">Halo Admin,</h2>
        <p style="margin:0 0 14px;">Merchant <strong>${merchantName}</strong> ditolak oleh operations manager pada review final.</p>
        <p style="margin:0 0 8px;"><strong>Alasan operations manager</strong></p>
        <p style="margin:0 0 14px;">${reason}</p>
        <p style="margin:0 0 8px;"><strong>Batas revisi merchant</strong></p>
        <p style="margin:0 0 18px;">${deadlineLabel}</p>
        <p style="margin:0;">Silakan pantau Merchant Directory. Jika merchant tidak memperbaiki data sampai batas waktu tersebut, akun akan dijadwalkan untuk dihapus permanen.</p>
      </div>
    `,
  })
}

async function sendMerchantDecisionEmail({
  email,
  brandName,
  locale,
  type,
  reason,
  deadlineAt,
}: {
  email: string | null
  brandName: string | null
  locale?: string | null
  type: "approved" | "rejected" | "inactive" | "deleted"
  reason?: string
  deadlineAt?: string
}) {
  if (!email) return

  const resendApiKey = getOptionalEnv("RESEND_API_KEY")
  if (!resendApiKey) {
    console.error("RESEND_API_KEY not found")
    return
  }

  const resend = new Resend(resendApiKey)
  const merchantName = brandName || email
  const accountLabel = brandName ? `${brandName} (${email})` : email
  const activeLocale = normalizeLocale(locale)

  const emailCopy: Record<
    Locale,
    {
      greeting: string
      approvedSubject: string
      approvedIntro: string
      approvedStatus: string
      approvedGuidance: string
      approvedReminder: string
      inactiveSubject: string
      inactiveIntro: string
      inactiveStatus: string
      inactiveReasonLabel: string
      inactiveImpact: string
      inactiveGuidance: string
      deletedSubject: string
      deletedIntro: string
      deletedStatus: string
      deletedReasonLabel: string
      deletedGuidance: string
      rejectedSubject: string
      rejectedIntro: string
      rejectedStatus: string
      rejectedReasonLabel: string
      rejectedGuidance: string
      rejectedDeadlineLabel: string
      accountSummary: string
      merchantLabel: string
      emailLabel: string
      statusLabel: string
      closing: string
      defaultReason: string
    }
  > = {
    id: {
      greeting: "Halo",
      approvedSubject: "RedFeng Merchant: Akun Anda Disetujui",
      approvedIntro: "Kami informasikan bahwa akun merchant Anda telah disetujui oleh tim Red Feng.",
      approvedStatus: "Approved",
      approvedGuidance:
        "Anda sudah dapat masuk ke dashboard merchant untuk melengkapi profil bisnis, mengelola paket, dan melanjutkan operasional di platform Red Feng.",
      approvedReminder:
        "Mohon pastikan seluruh data profil, dokumen, rekening payout, dan paket yang ditampilkan selalu sesuai dengan ketentuan operasional Red Feng.",
      inactiveSubject: "RedFeng Merchant: Akses Merchant Dinonaktifkan Sementara",
      inactiveIntro:
        "Kami informasikan bahwa akses merchant Anda saat ini dinonaktifkan sementara oleh tim Red Feng.",
      inactiveStatus: "Inactive",
      inactiveReasonLabel: "Catatan admin",
      inactiveImpact:
        "Selama status ini aktif, merchant tidak dapat mengakses dashboard maupun menjalankan operasional merchant di sistem.",
      inactiveGuidance:
        "Apabila Anda memerlukan klarifikasi atau tindak lanjut, silakan hubungi tim Red Feng melalui kanal komunikasi resmi agar akun dapat ditinjau kembali sesuai kebijakan yang berlaku.",
      deletedSubject: "RedFeng Merchant: Akses Merchant Dicabut",
      deletedIntro: "Kami informasikan bahwa akses merchant Anda telah dicabut dari sistem Red Feng.",
      deletedStatus: "Deleted / Access Removed",
      deletedReasonLabel: "Alasan admin",
      deletedGuidance:
        "Sejak notifikasi ini diterbitkan, akun merchant tidak lagi dapat digunakan untuk mengakses area merchant maupun melanjutkan operasional di platform Red Feng. Jika Anda memerlukan penjelasan lebih lanjut, silakan hubungi tim Red Feng melalui kanal komunikasi resmi.",
      rejectedSubject: "RedFeng Merchant: Pengajuan Perlu Diperbaiki",
      rejectedIntro:
        "Pengajuan merchant Anda belum dapat kami setujui pada tahap review saat ini dan masih memerlukan perbaikan.",
      rejectedStatus: "Rejected / Revision Required",
      rejectedReasonLabel: "Catatan admin",
      rejectedGuidance:
        "Silakan masuk kembali ke akun merchant Anda, lakukan perbaikan sesuai catatan admin, lalu ajukan ulang untuk proses review berikutnya.",
      rejectedDeadlineLabel: "Batas waktu revisi",
      accountSummary: "Ringkasan akun",
      merchantLabel: "Merchant",
      emailLabel: "Email akun",
      statusLabel: "Status akun",
      closing: "Hormat kami,<br/><strong>Tim Admin Red Feng</strong>",
      defaultReason:
        "Silakan hubungi tim Red Feng melalui kanal komunikasi resmi untuk memperoleh penjelasan lebih lanjut.",
    },
    en: {
      greeting: "Hello",
      approvedSubject: "RedFeng Merchant: Your Account Has Been Approved",
      approvedIntro: "We would like to inform you that your merchant account has been approved by the Red Feng team.",
      approvedStatus: "Approved",
      approvedGuidance:
        "You may now access the merchant dashboard to complete your business profile, manage packages, and continue your operations on the Red Feng platform.",
      approvedReminder:
        "Please ensure that your business profile, supporting documents, payout account, and package information remain accurate and compliant with Red Feng operational standards.",
      inactiveSubject: "RedFeng Merchant: Merchant Access Temporarily Disabled",
      inactiveIntro:
        "We would like to inform you that your merchant access has been temporarily disabled by the Red Feng team.",
      inactiveStatus: "Inactive",
      inactiveReasonLabel: "Admin note",
      inactiveImpact:
        "While this status remains active, the merchant account cannot access the dashboard or carry out merchant operations in the system.",
      inactiveGuidance:
        "If you need clarification or follow-up, please contact the Red Feng team through the official communication channel so your account can be reviewed in accordance with our policy.",
      deletedSubject: "RedFeng Merchant: Merchant Access Removed",
      deletedIntro: "We would like to inform you that your merchant access has been removed from the Red Feng system.",
      deletedStatus: "Deleted / Access Removed",
      deletedReasonLabel: "Admin reason",
      deletedGuidance:
        "From the time this notice is issued, the merchant account can no longer be used to access the merchant area or continue operations on the Red Feng platform. If you require further clarification, please contact the Red Feng team through the official communication channel.",
      rejectedSubject: "RedFeng Merchant: Submission Requires Revision",
      rejectedIntro:
        "Your merchant submission cannot be approved at this review stage and still requires revision.",
      rejectedStatus: "Rejected / Revision Required",
      rejectedReasonLabel: "Admin note",
      rejectedGuidance:
        "Please log back into your merchant account, make the necessary revisions based on the admin note, and submit it again for the next review process.",
      rejectedDeadlineLabel: "Revision deadline",
      accountSummary: "Account summary",
      merchantLabel: "Merchant",
      emailLabel: "Account email",
      statusLabel: "Account status",
      closing: "Sincerely,<br/><strong>Red Feng Admin Team</strong>",
      defaultReason:
        "Please contact the Red Feng team through the official communication channel for further clarification.",
    },
    zh: {
      greeting: "您好",
      approvedSubject: "RedFeng Merchant：您的账号已获批准",
      approvedIntro: "谨此通知，您的商家账号已通过 Red Feng 团队审核。",
      approvedStatus: "Approved",
      approvedGuidance:
        "您现在可以登录商家后台，完善企业资料、管理套餐，并继续在 Red Feng 平台开展业务。",
      approvedReminder:
        "请确保您的企业资料、证明文件、结算账户以及套餐信息始终准确无误，并符合 Red Feng 的运营标准。",
      inactiveSubject: "RedFeng Merchant：商家权限已被临时停用",
      inactiveIntro: "谨此通知，您的商家权限目前已被 Red Feng 团队临时停用。",
      inactiveStatus: "Inactive",
      inactiveReasonLabel: "管理员说明",
      inactiveImpact: "在该状态下，商家账号将无法访问后台，也无法继续在系统中进行商家运营操作。",
      inactiveGuidance:
        "如需进一步说明或后续处理，请通过 Red Feng 官方沟通渠道联系我们，以便根据相关政策重新审核您的账号。",
      deletedSubject: "RedFeng Merchant：商家权限已被移除",
      deletedIntro: "谨此通知，您的商家权限已从 Red Feng 系统中移除。",
      deletedStatus: "Deleted / Access Removed",
      deletedReasonLabel: "管理员原因",
      deletedGuidance:
        "自本通知发出起，该商家账号将无法继续访问商家区域，也无法在 Red Feng 平台继续开展业务。如需进一步说明，请通过 Red Feng 官方沟通渠道联系我们。",
      rejectedSubject: "RedFeng Merchant：申请需修改后重新提交",
      rejectedIntro: "您的商家申请在本轮审核中暂未通过，仍需根据要求进行修改。",
      rejectedStatus: "Rejected / Revision Required",
      rejectedReasonLabel: "管理员说明",
      rejectedGuidance:
        "请重新登录商家账号，按照管理员说明完成修改后，再次提交进入下一轮审核。",
      rejectedDeadlineLabel: "修改截止时间",
      accountSummary: "账号摘要",
      merchantLabel: "商家",
      emailLabel: "账号邮箱",
      statusLabel: "账号状态",
      closing: "此致敬礼，<br/><strong>Red Feng 管理团队</strong>",
      defaultReason: "如需进一步说明，请通过 Red Feng 官方沟通渠道联系我们。",
    },  }
  const copy = emailCopy[activeLocale]
  const resolvedReason = reason || copy.defaultReason
  const deadlineText =
    deadlineAt && type === "rejected"
      ? new Date(deadlineAt).toLocaleString(
          activeLocale === "id" ? "id-ID" : activeLocale === "zh" ? "zh-CN" : "en-US",
          { dateStyle: "full", timeStyle: "short", timeZone: "Asia/Jakarta" },
        )
      : ""

  if (type === "approved") {
    await resend.emails.send({
      from: "RedFeng Admin <admin@redfeng.co>",
      to: email,
      subject: copy.approvedSubject,
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.7;color:#0f172a;max-width:640px;">
          <h2 style="margin:0 0 12px;">${copy.greeting} ${merchantName},</h2>
          <p style="margin:0 0 14px;">${copy.approvedIntro}</p>
          <p style="margin:0 0 8px;"><strong>${copy.accountSummary}</strong></p>
          <ul style="margin:0 0 16px 18px;padding:0;">
            <li>${copy.merchantLabel}: ${merchantName}</li>
            <li>${copy.emailLabel}: ${email}</li>
            <li>${copy.statusLabel}: ${copy.approvedStatus}</li>
          </ul>
          <p style="margin:0 0 14px;">${copy.approvedGuidance}</p>
          <p style="margin:0 0 18px;">${copy.approvedReminder}</p>
          <p style="margin:0;">${copy.closing}</p>
        </div>
      `,
    })
    return
  }

  if (type === "inactive") {
    await resend.emails.send({
      from: "RedFeng Admin <admin@redfeng.co>",
      to: email,
      subject: copy.inactiveSubject,
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.7;color:#0f172a;max-width:640px;">
          <h2 style="margin:0 0 12px;">${copy.greeting} ${merchantName},</h2>
          <p style="margin:0 0 14px;">${copy.inactiveIntro}</p>
          <p style="margin:0 0 8px;"><strong>${copy.accountSummary}</strong></p>
          <ul style="margin:0 0 16px 18px;padding:0;">
            <li>${copy.merchantLabel}: ${merchantName}</li>
            <li>${copy.emailLabel}: ${email}</li>
            <li>${copy.statusLabel}: ${copy.inactiveStatus}</li>
          </ul>
          <p style="margin:0 0 8px;"><strong>${copy.inactiveReasonLabel}</strong></p>
          <p style="margin:0 0 14px;">${resolvedReason}</p>
          <p style="margin:0 0 14px;">${copy.inactiveImpact}</p>
          <p style="margin:0 0 18px;">${copy.inactiveGuidance}</p>
          <p style="margin:0;">${copy.closing}</p>
        </div>
      `,
    })
    return
  }

  if (type === "deleted") {
    await resend.emails.send({
      from: "RedFeng Admin <admin@redfeng.co>",
      to: email,
      subject: copy.deletedSubject,
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.7;color:#0f172a;max-width:640px;">
          <h2 style="margin:0 0 12px;">${copy.greeting} ${merchantName},</h2>
          <p style="margin:0 0 14px;">${copy.deletedIntro}</p>
          <p style="margin:0 0 8px;"><strong>${copy.accountSummary}</strong></p>
          <ul style="margin:0 0 16px 18px;padding:0;">
            <li>${copy.merchantLabel}: ${accountLabel}</li>
            <li>${copy.statusLabel}: ${copy.deletedStatus}</li>
          </ul>
          <p style="margin:0 0 8px;"><strong>${copy.deletedReasonLabel}</strong></p>
          <p style="margin:0 0 14px;">${resolvedReason}</p>
          <p style="margin:0 0 18px;">${copy.deletedGuidance}</p>
          <p style="margin:0;">${copy.closing}</p>
        </div>
      `,
    })
    return
  }

  await resend.emails.send({
    from: "RedFeng Admin <admin@redfeng.co>",
    to: email,
    subject: copy.rejectedSubject,
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.7;color:#0f172a;max-width:640px;">
        <h2 style="margin:0 0 12px;">${copy.greeting} ${merchantName},</h2>
        <p style="margin:0 0 14px;">${copy.rejectedIntro}</p>
        <p style="margin:0 0 8px;"><strong>${copy.accountSummary}</strong></p>
        <ul style="margin:0 0 16px 18px;padding:0;">
          <li>${copy.merchantLabel}: ${merchantName}</li>
          <li>${copy.emailLabel}: ${email}</li>
          <li>${copy.statusLabel}: ${copy.rejectedStatus}</li>
        </ul>
        <p style="margin:0 0 8px;"><strong>${copy.rejectedReasonLabel}</strong></p>
        <p style="margin:0 0 14px;">${resolvedReason}</p>
        ${deadlineText ? `<p style="margin:0 0 8px;"><strong>${copy.rejectedDeadlineLabel}</strong></p><p style="margin:0 0 14px;">${deadlineText}</p>` : ""}
        <p style="margin:0 0 18px;">${copy.rejectedGuidance}</p>
        <p style="margin:0;">${copy.closing}</p>
      </div>
    `,
  })
}

export async function submitMerchantApprovalRequest(formData: FormData) {
  const merchantId = formData.get("merchantId") as string
  const adminNote = String(formData.get("reason") || "").trim()
  if (!merchantId) {
    backToMerchants("Merchant tidak ditemukan.", "error")
  }

  const supabaseAdmin = createAdminClient()
  const actor = await getAdminActor()

  let existingRequest = null
  try {
    existingRequest = await findPendingMerchantReviewRequest(supabaseAdmin, merchantId)
  } catch (error) {
    console.error("Load merchant review request error:", error)
    if (isMissingMerchantReviewRequestsTableError(error as { message?: string | null; code?: string | null })) {
      backToMerchants(getMerchantReviewRequestsUnavailableMessage(), "error")
    }
    backToMerchants("Gagal memeriksa request review merchant yang sedang berjalan.", "error")
  }
  if (existingRequest) {
    backToMerchants("Merchant ini sudah punya request review yang masih menunggu keputusan operations manager.", "error")
  }

  const { data: merchant } = await supabaseAdmin
    .from("merchants")
    .select("email, brand_name, default_locale, verification_status")
    .eq("id", merchantId)
    .maybeSingle()

  const { data: request, error: requestError } = await supabaseAdmin
    .from("merchant_review_requests")
    .insert({
      merchant_id: merchantId,
      request_type: "approve",
      admin_note: adminNote || null,
      requested_by: actor.id,
    })
    .select("id")
    .single()

  if (requestError || !request?.id) {
    console.error("Submit merchant approval request error:", requestError)
    if (isMissingMerchantReviewRequestsTableError(requestError)) {
      backToMerchants(getMerchantReviewRequestsUnavailableMessage(), "error")
    }
    backToMerchants(requestError?.message || "Gagal mengirim request approval merchant ke operations manager.", "error")
  }

  const { error } = await supabaseAdmin
    .from("merchants")
    .update({
      verification_status: "awaiting_manager_approval",
      admin_reviewed_at: new Date().toISOString(),
      admin_reviewed_by: actor.id,
      manager_review_requested_at: new Date().toISOString(),
      manager_review_request_id: request.id,
    })
    .eq("id", merchantId)

  if (error) {
    console.error("Update merchant after approval request error:", error)
    backToMerchants(error.message || "Request approval terkirim, tetapi status merchant gagal diperbarui.", "error")
  }

  revalidateMerchantPages()

  await createAdminAuditLog({
    actorId: actor.id,
    actorRole: actor.role,
    targetType: "merchant",
    targetId: merchantId,
    action: "submit_for_manager_approval",
    summary: `Merchant ${merchantId} diajukan admin ke operations manager untuk approval`,
    metadata: {
      requestId: request.id,
      requestType: "approve",
      previousStatus: merchant?.verification_status ?? null,
      status: "awaiting_manager_approval",
      adminNote: adminNote || null,
      brandName: merchant?.brand_name ?? null,
    },
  })

  backToMerchants(`Merchant ${merchant?.brand_name || merchant?.email || merchantId} berhasil diajukan ke operations manager untuk approval final.`, "success")
}

export async function submitMerchantRejectionRequest(formData: FormData) {
  const merchantId = formData.get("merchantId") as string
  const reason = String(formData.get("reason") || "").trim()

  if (!merchantId || !reason) {
    backToMerchants("Merchant dan alasan pengajuan reject ke operations manager wajib diisi.", "error")
  }

  const supabaseAdmin = createAdminClient()
  const actor = await getAdminActor()

  let existingRequest = null
  try {
    existingRequest = await findPendingMerchantReviewRequest(supabaseAdmin, merchantId)
  } catch (error) {
    console.error("Load merchant rejection review request error:", error)
    if (isMissingMerchantReviewRequestsTableError(error as { message?: string | null; code?: string | null })) {
      backToMerchants(getMerchantReviewRequestsUnavailableMessage(), "error")
    }
    backToMerchants("Gagal memeriksa request review merchant yang sedang berjalan.", "error")
  }
  if (existingRequest) {
    backToMerchants("Merchant ini sudah punya request review yang masih menunggu keputusan operations manager.", "error")
  }

  const { data: merchant } = await supabaseAdmin
    .from("merchants")
    .select("email, brand_name, default_locale, verification_status")
    .eq("id", merchantId)
    .maybeSingle()

  const { data: request, error: requestError } = await supabaseAdmin
    .from("merchant_review_requests")
    .insert({
      merchant_id: merchantId,
      request_type: "reject",
      admin_note: reason,
      requested_by: actor.id,
    })
    .select("id")
    .single()

  if (requestError || !request?.id) {
    console.error("Submit merchant rejection request error:", requestError)
    if (isMissingMerchantReviewRequestsTableError(requestError)) {
      backToMerchants(getMerchantReviewRequestsUnavailableMessage(), "error")
    }
    backToMerchants(requestError?.message || "Gagal mengirim request reject merchant ke operations manager.", "error")
  }

  const { error } = await supabaseAdmin
    .from("merchants")
    .update({
      verification_status: "awaiting_manager_rejection",
      admin_reviewed_at: new Date().toISOString(),
      admin_reviewed_by: actor.id,
      manager_review_requested_at: new Date().toISOString(),
      manager_review_request_id: request.id,
    })
    .eq("id", merchantId)

  if (error) {
    console.error("Update merchant after rejection request error:", error)
    backToMerchants(error.message || "Request rejection terkirim, tetapi status merchant gagal diperbarui.", "error")
  }

  revalidateMerchantPages()

  await createAdminAuditLog({
    actorId: actor.id,
    actorRole: actor.role,
    targetType: "merchant",
    targetId: merchantId,
    action: "submit_for_manager_rejection",
    summary: `Merchant ${merchantId} diajukan admin ke operations manager untuk rejection review`,
    metadata: {
      requestId: request.id,
      requestType: "reject",
      previousStatus: merchant?.verification_status ?? null,
      status: "awaiting_manager_rejection",
      reason,
      brandName: merchant?.brand_name ?? null,
    },
  })

  backToMerchants(`Merchant ${merchant?.brand_name || merchant?.email || merchantId} berhasil diajukan ke operations manager untuk keputusan reject final.`, "success")
}

export async function approveMerchantReviewRequest(formData: FormData) {
  const requestId = String(formData.get("requestId") || "").trim()
  const reviewNote = String(formData.get("reviewNote") || "").trim()

  if (!requestId) {
    backToMerchants("Request review merchant tidak ditemukan.", "error")
  }

  const supabaseAdmin = createAdminClient()
  const reviewer = await getMerchantManagerReviewer()
  const { data: request, error: requestError } = await supabaseAdmin
    .from("merchant_review_requests")
    .select("id, merchant_id, request_type, admin_note, requested_by, status")
    .eq("id", requestId)
    .maybeSingle()

  if (requestError && isMissingMerchantReviewRequestsTableError(requestError)) {
    console.error("Approve merchant review request schema error:", requestError)
    backToMerchants(getMerchantReviewRequestsUnavailableMessage(), "error")
  }

  if (requestError || !request || request.status !== "pending") {
    console.error("Approve merchant review request error:", requestError)
    backToMerchants("Request review merchant tidak valid atau sudah diproses.", "error")
  }

  const { data: merchant } = await supabaseAdmin
    .from("merchants")
    .select("id, email, brand_name, default_locale")
    .eq("id", request.merchant_id)
    .maybeSingle()

  if (!merchant) {
    backToMerchants("Data merchant untuk request ini tidak ditemukan.", "error")
  }

  const now = new Date().toISOString()
  const { error: merchantError } = await supabaseAdmin
    .from("merchants")
    .update({
      verification_status: "approved",
      rejection_reason: null,
      verified_at: now,
      manager_decision: "approved",
      manager_decided_at: now,
      manager_decided_by: reviewer.id,
      manager_rejection_reason: null,
      revision_requested_at: null,
      revision_deadline_at: null,
      expired_at: null,
      purge_scheduled_at: null,
    })
    .eq("id", request.merchant_id)

  if (merchantError) {
    console.error("Approve merchant final decision error:", merchantError)
    backToMerchants(merchantError.message || "Gagal menyetujui merchant.", "error")
  }

  const { error: reviewUpdateError } = await supabaseAdmin
    .from("merchant_review_requests")
    .update({
      status: "approved",
      manager_reason: reviewNote || null,
      reviewed_by: reviewer.id,
      reviewed_at: now,
    })
    .eq("id", requestId)
    .eq("status", "pending")

  if (reviewUpdateError) {
    if (isMissingMerchantReviewRequestsTableError(reviewUpdateError)) {
      backToMerchants(getMerchantReviewRequestsUnavailableMessage(), "error")
    }
    backToMerchants(reviewUpdateError.message || "Merchant disetujui, tetapi status request review gagal diperbarui.", "error")
  }

  try {
    await sendMerchantDecisionEmail({
      email: merchant.email ?? null,
      brandName: merchant.brand_name ?? null,
      locale: merchant.default_locale ?? "id",
      type: "approved",
    })
  } catch (emailError) {
    console.error("Approve merchant final email error:", emailError)
  }

  revalidateMerchantPages()

  await createAdminAuditLog({
    actorId: reviewer.id,
    actorRole: reviewer.role,
    targetType: "merchant",
    targetId: request.merchant_id,
    action: "manager_approve_merchant",
    summary: `Merchant ${request.merchant_id} disetujui operations manager`,
    metadata: {
      requestId: request.id,
      requestType: request.request_type,
      adminNote: request.admin_note || null,
      reviewNote: reviewNote || null,
      status: "approved",
      brandName: merchant.brand_name ?? null,
    },
  })

  backToMerchants(`Merchant ${merchant.brand_name || merchant.email || request.merchant_id} berhasil disetujui oleh operations manager.`, "success")
}

export async function rejectMerchantReviewRequest(formData: FormData) {
  const requestId = String(formData.get("requestId") || "").trim()
  const reviewNote = String(formData.get("reviewNote") || "").trim()

  if (!requestId) {
    backToMerchants("Request review merchant tidak ditemukan.", "error")
  }
  if (!reviewNote) {
    backToMerchants("Alasan penolakan dari operations manager wajib diisi.", "error")
  }

  const supabaseAdmin = createAdminClient()
  const reviewer = await getMerchantManagerReviewer()
  const { data: request, error: requestError } = await supabaseAdmin
    .from("merchant_review_requests")
    .select("id, merchant_id, request_type, admin_note, requested_by, status")
    .eq("id", requestId)
    .maybeSingle()

  if (requestError && isMissingMerchantReviewRequestsTableError(requestError)) {
    console.error("Reject merchant review request schema error:", requestError)
    backToMerchants(getMerchantReviewRequestsUnavailableMessage(), "error")
  }

  if (requestError || !request || request.status !== "pending") {
    console.error("Reject merchant review request error:", requestError)
    backToMerchants("Request review merchant tidak valid atau sudah diproses.", "error")
  }

  const { data: merchant } = await supabaseAdmin
    .from("merchants")
    .select("id, email, brand_name, default_locale")
    .eq("id", request.merchant_id)
    .maybeSingle()

  if (!merchant) {
    backToMerchants("Data merchant untuk request ini tidak ditemukan.", "error")
  }

  const nowDate = new Date()
  const deadlineDate = new Date(nowDate.getTime() + 7 * 24 * 60 * 60 * 1000)
  const now = nowDate.toISOString()
  const deadlineAt = deadlineDate.toISOString()

  const { error: merchantError } = await supabaseAdmin
    .from("merchants")
    .update({
      verification_status: "rejected",
      rejection_reason: reviewNote,
      manager_decision: "rejected",
      manager_decided_at: now,
      manager_decided_by: reviewer.id,
      manager_rejection_reason: reviewNote,
      revision_requested_at: now,
      revision_deadline_at: deadlineAt,
      purge_scheduled_at: deadlineAt,
    })
    .eq("id", request.merchant_id)

  if (merchantError) {
    console.error("Reject merchant final decision error:", merchantError)
    backToMerchants(merchantError.message || "Gagal menolak merchant.", "error")
  }

  const { error: reviewUpdateError } = await supabaseAdmin
    .from("merchant_review_requests")
    .update({
      status: "rejected",
      manager_reason: reviewNote,
      reviewed_by: reviewer.id,
      reviewed_at: now,
      expires_at: deadlineAt,
    })
    .eq("id", requestId)
    .eq("status", "pending")

  if (reviewUpdateError) {
    if (isMissingMerchantReviewRequestsTableError(reviewUpdateError)) {
      backToMerchants(getMerchantReviewRequestsUnavailableMessage(), "error")
    }
    backToMerchants(reviewUpdateError.message || "Merchant ditolak, tetapi status request review gagal diperbarui.", "error")
  }

  try {
    await sendMerchantDecisionEmail({
      email: merchant.email ?? null,
      brandName: merchant.brand_name ?? null,
      locale: merchant.default_locale ?? "id",
      type: "rejected",
      reason: reviewNote,
      deadlineAt,
    })
  } catch (emailError) {
    console.error("Reject merchant final email error:", emailError)
  }

  if (request.requested_by) {
    const { data: requestedByAuth, error: requestedByAuthError } = await supabaseAdmin.auth.admin.getUserById(request.requested_by)
    if (requestedByAuthError) {
      console.error("Load requesting admin auth user error:", requestedByAuthError)
    }
    try {
      await sendAdminMerchantReviewRejectionEmail({
        email: requestedByAuth?.user?.email || null,
        merchantName: merchant.brand_name || merchant.email || request.merchant_id,
        reason: reviewNote,
        deadlineAt,
      })
    } catch (emailError) {
      console.error("Reject merchant admin email error:", emailError)
    }
  }

  revalidateMerchantPages()

  await createAdminAuditLog({
    actorId: reviewer.id,
    actorRole: reviewer.role,
    targetType: "merchant",
    targetId: request.merchant_id,
    action: "manager_reject_merchant",
    summary: `Merchant ${request.merchant_id} ditolak operations manager`,
    metadata: {
      requestId: request.id,
      requestType: request.request_type,
      adminNote: request.admin_note || null,
      managerReason: reviewNote,
      revisionDeadlineAt: deadlineAt,
      status: "rejected",
      brandName: merchant.brand_name ?? null,
    },
  })

  backToMerchants(`Merchant ${merchant.brand_name || merchant.email || request.merchant_id} berhasil ditolak oleh operations manager. Alasan sudah dikirim ke merchant dan admin.`, "success")
}

export async function deactivateMerchant(formData: FormData) {
  const merchantId = formData.get("merchantId") as string
  const reason = ((formData.get("reason") as string) || "").trim()

  if (!merchantId) {
    backToMerchants("Merchant tidak ditemukan.", "error")
  }

  const supabaseAdmin = createAdminClient()
  const actor = await getAdminActor()
  const { data: merchant } = await supabaseAdmin
    .from("merchants")
    .select("email, brand_name, default_locale")
    .eq("id", merchantId)
    .maybeSingle()

  const { error } = await supabaseAdmin
    .from("merchants")
    .update({
      verification_status: "inactive",
      rejection_reason: reason || "Merchant dinonaktifkan sementara oleh admin.",
    })
    .eq("id", merchantId)
    .eq("verification_status", "approved")

  if (error) {
    console.error("Deactivate merchant error:", error)
    backToMerchants(error.message || "Gagal menonaktifkan merchant.", "error")
  }

  try {
    await sendMerchantDecisionEmail({
      email: merchant?.email ?? null,
      brandName: merchant?.brand_name ?? null,
      locale: merchant?.default_locale ?? "id",
      type: "inactive",
      reason,
    })
  } catch (emailError) {
    console.error("Deactivate merchant email error:", emailError)
  }

  revalidateMerchantPages()

  await createAdminAuditLog({
    actorId: actor.id,
    actorRole: actor.role,
    targetType: "merchant",
    targetId: merchantId,
    action: "deactivate",
    summary: `Merchant ${merchantId} dinonaktifkan sementara`,
    metadata: {
      status: "inactive",
      reason: reason || "Merchant dinonaktifkan sementara oleh admin.",
    },
  })

  backToMerchants(`Merchant ${merchant?.brand_name || merchant?.email || merchantId} berhasil dinonaktifkan sementara.`, "success")
}

export async function reactivateMerchant(formData: FormData) {
  const merchantId = formData.get("merchantId") as string
  if (!merchantId) {
    backToMerchants("Merchant tidak ditemukan.", "error")
  }

  const supabaseAdmin = createAdminClient()
  const actor = await getAdminActor()

  const { error } = await supabaseAdmin
    .from("merchants")
    .update({
      verification_status: "approved",
      rejection_reason: null,
      verified_at: new Date().toISOString(),
    })
    .eq("id", merchantId)
    .eq("verification_status", "inactive")

  if (error) {
    console.error("Reactivate merchant error:", error)
    backToMerchants(error.message || "Gagal mengaktifkan kembali merchant.", "error")
  }

  revalidateMerchantPages()

  await createAdminAuditLog({
    actorId: actor.id,
    actorRole: actor.role,
    targetType: "merchant",
    targetId: merchantId,
    action: "reactivate",
    summary: `Merchant ${merchantId} diaktifkan kembali`,
    metadata: {
      status: "approved",
    },
  })

  backToMerchants(`Merchant ${merchantId} berhasil diaktifkan kembali.`, "success")
}

export async function requestMerchantDeletion(formData: FormData) {
  const merchantId = ((formData.get("merchantId") as string) || "").trim()
  const profileId = ((formData.get("profileId") as string) || "").trim()
  const reason = ((formData.get("reason") as string) || "").trim()

  if ((!merchantId && !profileId) || !reason) {
    backToMerchants("Alasan pengajuan hapus merchant wajib diisi.", "error")
  }

  const supabaseAdmin = createAdminClient()
  const actor = await getAdminActor()

  if (merchantId) {
    const { data: merchant } = await supabaseAdmin
      .from("merchants")
      .select("id, user_id, verification_status, email, brand_name, default_locale")
      .eq("id", merchantId)
      .maybeSingle()

    if (!merchant) {
      console.error("Request merchant deletion error: merchant not found", merchantId)
      backToMerchants("Merchant tidak ditemukan.", "error")
    }

    const existingRequest = await findPendingDeletionRequest(supabaseAdmin, { merchantId })
    if (existingRequest) {
      const message =
        existingRequest.status === "manager_rejected"
          ? "Merchant ini punya pengajuan hapus yang sudah ditolak operations manager dan masih menunggu admin menutup request."
          : "Merchant ini sudah punya pengajuan hapus yang masih menunggu review operations manager."
      backToMerchants(message, "error")
    }

    const { error: insertRequestError } = await supabaseAdmin.from("merchant_deletion_requests").insert({
      merchant_id: merchantId,
      profile_id: merchant.user_id,
      merchant_email: merchant.email,
      merchant_name: merchant.brand_name || merchant.email || merchantId,
      reason,
      requested_by: actor.id,
    })

    if (insertRequestError) {
      console.error("Request merchant deletion insert error:", insertRequestError)
      backToMerchants(insertRequestError.message || "Gagal membuat pengajuan hapus merchant.", "error")
    }

    await createAdminAuditLog({
      actorId: actor.id,
      actorRole: actor.role,
      targetType: "merchant",
      targetId: merchantId,
      action: "request_delete",
      summary: `Pengajuan hapus merchant ${merchantId} dibuat admin`,
      metadata: {
        mode: "deletion_request",
        reason,
        userId: merchant?.user_id ?? null,
      },
    })

    revalidateMerchantPages()
    return backToMerchants(`Pengajuan hapus merchant ${merchant.brand_name || merchant.email || merchantId} berhasil dikirim ke operations manager.`, "success")
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("id, role")
    .eq("id", profileId)
    .maybeSingle()

  if (profileError || !profile || profile.role !== "merchant") {
    console.error("Delete orphan merchant profile error:", profileError)
    backToMerchants("Akun merchant tanpa data merchant tidak ditemukan.", "error")
  }

  const { data: authUserData, error: authUserError } = await supabaseAdmin.auth.admin.getUserById(profileId)
  if (authUserError) {
    console.error("Load orphan merchant auth user error:", authUserError)
  }
  const orphanMerchantEmail = authUserData?.user?.email || null

  const { data: relatedMerchant } = await supabaseAdmin
    .from("merchants")
    .select("id")
    .eq("user_id", profileId)
    .maybeSingle()

  if (relatedMerchant?.id) {
    console.error("Delete orphan merchant profile aborted: merchant row exists", relatedMerchant.id)
    backToMerchants("Akun ini masih memiliki data merchant yang aktif, jadi tidak bisa dihapus dari blok anomali.", "error")
  }

  const existingRequest = await findPendingDeletionRequest(supabaseAdmin, { profileId })
  if (existingRequest) {
    const message =
      existingRequest.status === "manager_rejected"
        ? "Akun merchant ini punya pengajuan hapus yang sudah ditolak operations manager dan masih menunggu admin menutup request."
        : "Akun merchant ini sudah punya pengajuan hapus yang masih menunggu review operations manager."
    backToMerchants(message, "error")
  }

  const { error: insertRequestError } = await supabaseAdmin.from("merchant_deletion_requests").insert({
    profile_id: profileId,
    merchant_email: orphanMerchantEmail,
    merchant_name: orphanMerchantEmail || profileId,
    reason,
    requested_by: actor.id,
  })
  if (insertRequestError) {
    console.error("Request orphan merchant deletion insert error:", insertRequestError)
    backToMerchants(insertRequestError.message || "Gagal membuat pengajuan hapus akun merchant.", "error")
  }

  await createAdminAuditLog({
    actorId: actor.id,
    actorRole: actor.role,
    targetType: "merchant",
    targetId: profileId,
    action: "request_delete",
    summary: `Pengajuan hapus akun merchant tanpa row merchants dibuat untuk user ${profileId}`,
    metadata: {
      mode: "deletion_request",
      reason,
      fallbackTarget: "profile_only_merchant",
    },
  })

  revalidateMerchantPages()
  backToMerchants(`Pengajuan hapus akun merchant ${orphanMerchantEmail || profileId} berhasil dikirim ke operations manager.`, "success")
}

export async function approveMerchantDeletion(formData: FormData) {
  const requestId = String(formData.get("requestId") || "").trim()
  const reviewNote = String(formData.get("reviewNote") || "").trim()

  if (!requestId) {
    backToMerchants("Request penghapusan merchant tidak ditemukan.", "error")
  }

  const supabaseAdmin = createAdminClient()
  const reviewer = await getMerchantManagerReviewer()
  const { data: request, error: requestError } = await supabaseAdmin
    .from("merchant_deletion_requests")
    .select("id, merchant_id, profile_id, merchant_email, merchant_name, reason, status")
    .eq("id", requestId)
    .maybeSingle()

  if (requestError || !request || request.status !== "pending") {
    console.error("Approve merchant deletion request error:", requestError)
    backToMerchants("Request penghapusan merchant tidak valid atau sudah diproses.", "error")
  }

  if (request.merchant_id) {
    const { data: merchant } = await supabaseAdmin
      .from("merchants")
      .select("id, user_id, email, brand_name, default_locale, ktp_file_url, npwp_file_url, nib_file_url, logo_url")
      .eq("id", request.merchant_id)
      .maybeSingle()

    if (!merchant) {
      backToMerchants("Data merchant untuk request ini sudah tidak ditemukan.", "error")
    }

    try {
      await sendMerchantDecisionEmail({
        email: merchant.email ?? null,
        brandName: merchant.brand_name ?? null,
        locale: merchant.default_locale ?? "id",
        type: "deleted",
        reason: reviewNote || "Penghapusan merchant telah disetujui operations manager Red Feng.",
      })
    } catch (emailError) {
      console.error("Approve merchant deletion email error:", emailError)
    }

    try {
      await purgeMerchantAccountRecords(supabaseAdmin, {
        id: request.merchant_id,
        user_id: merchant.user_id,
        ktp_file_url: merchant.ktp_file_url ?? null,
        npwp_file_url: merchant.npwp_file_url ?? null,
        nib_file_url: merchant.nib_file_url ?? null,
        logo_url: merchant.logo_url ?? null,
      })
    } catch (deleteError) {
      console.error("Approve merchant deletion purge error:", deleteError)
      backToMerchants(deleteError instanceof Error ? deleteError.message : "Gagal menghapus merchant secara permanen.", "error")
    }
  } else if (request.profile_id) {
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("id, role")
      .eq("id", request.profile_id)
      .maybeSingle()

    if (!profile || profile.role !== "merchant") {
      backToMerchants("Profile merchant untuk request ini sudah tidak ditemukan.", "error")
    }

    const { error: deleteProfileError } = await supabaseAdmin
      .from("profiles")
      .delete()
      .eq("id", request.profile_id)
      .eq("role", "merchant")

    if (deleteProfileError) {
      backToMerchants(deleteProfileError.message || "Gagal menghapus profile merchant.", "error")
    }

    const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(request.profile_id)
    if (authDeleteError) {
      backToMerchants(authDeleteError.message || "Gagal menghapus akun auth merchant.", "error")
    }

    try {
      await sendMerchantDecisionEmail({
        email: request.merchant_email ?? null,
        brandName: null,
        type: "deleted",
        reason: reviewNote || "Penghapusan merchant telah disetujui operations manager Red Feng.",
      })
    } catch (emailError) {
      console.error("Approve orphan merchant deletion email error:", emailError)
    }
  } else {
    backToMerchants("Request penghapusan merchant tidak punya target yang valid.", "error")
  }

  const { error: updateRequestError } = await supabaseAdmin
    .from("merchant_deletion_requests")
    .update({
      status: "approved",
      review_note: reviewNote || "Penghapusan merchant disetujui operations manager.",
      reviewed_by: reviewer.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", requestId)
    .eq("status", "pending")

  if (updateRequestError) {
    backToMerchants(updateRequestError.message || "Penghapusan merchant berhasil, tetapi status request gagal diperbarui.", "error")
  }

  await createAdminAuditLog({
    actorId: reviewer.id,
    actorRole: reviewer.role,
    targetType: "merchant",
    targetId: request.merchant_id || request.profile_id || requestId,
    action: "approve_delete_request",
    summary: `Request penghapusan merchant ${request.id} disetujui operations manager`,
    metadata: {
      requestId: request.id,
      reason: request.reason,
      reviewNote: reviewNote || null,
      targetMerchantId: request.merchant_id || null,
      targetProfileId: request.profile_id || null,
    },
  })

  revalidateMerchantPages()
  backToMerchants(`Penghapusan merchant ${request.merchant_name || request.merchant_email || request.id} berhasil disetujui dan diproses permanen.`, "success")
}

export async function rejectMerchantDeletion(formData: FormData) {
  const requestId = String(formData.get("requestId") || "").trim()
  const reviewNote = String(formData.get("reviewNote") || "").trim()

  if (!requestId) {
    backToMerchants("Request penghapusan merchant tidak ditemukan.", "error")
  }
  if (!reviewNote) {
    backToMerchants("Alasan penolakan penghapusan dari operations manager wajib diisi.", "error")
  }

  const supabaseAdmin = createAdminClient()
  const reviewer = await getMerchantManagerReviewer()
  const { data: request, error: requestError } = await supabaseAdmin
    .from("merchant_deletion_requests")
    .select("id, merchant_id, profile_id, merchant_email, merchant_name, reason, status, requested_by")
    .eq("id", requestId)
    .maybeSingle()

  if (requestError || !request || request.status !== "pending") {
    console.error("Reject merchant deletion request error:", requestError)
    backToMerchants("Request penghapusan merchant tidak valid atau sudah diproses.", "error")
  }

  const { error: rejectError } = await supabaseAdmin
    .from("merchant_deletion_requests")
    .update({
      status: "manager_rejected",
      review_note: reviewNote,
      reviewed_by: reviewer.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", requestId)
    .eq("status", "pending")

  if (rejectError) {
    backToMerchants(rejectError.message || "Gagal menolak pengajuan hapus merchant.", "error")
  }

  if (request.requested_by) {
    const { data: requestedByAuth, error: requestedByAuthError } = await supabaseAdmin.auth.admin.getUserById(request.requested_by)
    if (requestedByAuthError) {
      console.error("Load requesting admin auth user error:", requestedByAuthError)
    }
    try {
      await sendAdminDeletionReviewEmail({
        email: requestedByAuth?.user?.email || null,
        merchantName: request.merchant_name || request.merchant_email || request.id,
        reason: reviewNote,
      })
    } catch (emailError) {
      console.error("Reject merchant deletion admin email error:", emailError)
    }
  }

  await createAdminAuditLog({
    actorId: reviewer.id,
    actorRole: reviewer.role,
    targetType: "merchant",
    targetId: request.merchant_id || request.profile_id || requestId,
    action: "reject_delete_request",
    summary: `Request penghapusan merchant ${request.id} ditolak operations manager`,
    metadata: {
      requestId: request.id,
      reason: request.reason,
      reviewNote,
      targetMerchantId: request.merchant_id || null,
      targetProfileId: request.profile_id || null,
    },
  })

  revalidateMerchantPages()
  backToMerchants(`Pengajuan hapus merchant ${request.merchant_name || request.merchant_email || request.id} berhasil ditolak dan alasannya sudah dikirim ke admin.`, "success")
}

export async function finalizeMerchantDeletionCancellation(formData: FormData) {
  const requestId = String(formData.get("requestId") || "").trim()
  const cancelNote = String(formData.get("cancelNote") || "").trim()

  if (!requestId) {
    backToMerchants("Request penghapusan merchant tidak ditemukan.", "error")
  }

  const supabaseAdmin = createAdminClient()
  const actor = await getAdminActor()
  const { data: request, error: requestError } = await supabaseAdmin
    .from("merchant_deletion_requests")
    .select("id, merchant_id, profile_id, merchant_email, merchant_name, reason, review_note, status, requested_by, reviewed_at")
    .eq("id", requestId)
    .maybeSingle()

  if (requestError || !request || request.status !== "manager_rejected") {
    console.error("Finalize merchant deletion cancellation error:", requestError)
    backToMerchants("Request penghapusan merchant tidak valid atau belum ditolak operations manager.", "error")
  }

  if (actor.role !== "superadmin" && request.requested_by && request.requested_by !== actor.id) {
    backToMerchants("Hanya admin pengaju atau superadmin yang dapat menutup pengajuan yang ditolak manager.", "error")
  }

  const { error: cancelError } = await supabaseAdmin
    .from("merchant_deletion_requests")
    .update({
      status: "cancelled",
      review_note: request.review_note,
      reviewed_at: request.reviewed_at || new Date().toISOString(),
    })
    .eq("id", requestId)
    .eq("status", "manager_rejected")

  if (cancelError) {
    backToMerchants(cancelError.message || "Gagal menutup pengajuan hapus merchant.", "error")
  }

  await createAdminAuditLog({
    actorId: actor.id,
    actorRole: actor.role,
    targetType: "merchant",
    targetId: request.merchant_id || request.profile_id || request.id,
    action: "cancel_delete_request_after_manager_rejection",
    summary: `Pengajuan penghapusan merchant ${request.id} ditutup admin setelah ditolak operations manager`,
    metadata: {
      requestId: request.id,
      adminReason: request.reason,
      managerReason: request.review_note || null,
      cancelNote: cancelNote || null,
      targetMerchantId: request.merchant_id || null,
      targetProfileId: request.profile_id || null,
    },
  })

  revalidateMerchantPages()
  backToMerchants(`Pengajuan hapus merchant ${request.merchant_name || request.merchant_email || request.id} berhasil dibatalkan admin.`, "success")
}

