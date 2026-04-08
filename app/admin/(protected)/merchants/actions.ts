"use server"

import { getOptionalEnv } from "@/lib/env"
import { createAdminClient } from "@/lib/supabase/admin"
import { revalidatePath } from "next/cache"
import { Resend } from "resend"
import { createClient } from "@/lib/supabase/server"
import { createAdminAuditLog } from "@/lib/admin-audit"
import { isAdminExecutionRole } from "@/lib/internal-roles"
import { normalizeLocale, type Locale } from "@/lib/i18n"
import { purgePackageRecords } from "@/lib/package-delete"
import { redirectWithMessage } from "@/lib/internal-account-management"

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

async function purgeMerchantAccountRecords(adminSupabase: ReturnType<typeof createAdminClient>, merchantId: string, userId?: string | null) {
  const { data: packageRows, error: packageRowsError } = await adminSupabase
    .from("packages")
    .select("id")
    .eq("merchant_id", merchantId)

  if (packageRowsError) {
    throw new Error(`Gagal memuat paket merchant: ${packageRowsError.message}`)
  }

  const packageIds = (((packageRows as Array<{ id: string }> | null) || []) as Array<{ id: string }>)
    .map((item) => item.id)
    .filter(Boolean)

  for (const packageId of packageIds) {
    await purgePackageRecords(adminSupabase, packageId)
  }

  const { error: refundDeleteError } = await adminSupabase
    .from("refund_requests")
    .delete()
    .eq("merchant_id", merchantId)

  if (refundDeleteError) {
    throw new Error(`Gagal menghapus refund merchant: ${refundDeleteError.message}`)
  }

  const { error: merchantDeleteError } = await adminSupabase
    .from("merchants")
    .delete()
    .eq("id", merchantId)

  if (merchantDeleteError) {
    throw new Error(`Gagal menghapus data merchant utama: ${merchantDeleteError.message}`)
  }

  if (!userId) return

  const { error: profileDeleteError } = await adminSupabase
    .from("profiles")
    .delete()
    .eq("id", userId)

  if (profileDeleteError) {
    throw new Error(`Gagal menghapus profil merchant: ${profileDeleteError.message}`)
  }

  const { error: authDeleteError } = await adminSupabase.auth.admin.deleteUser(userId)
  if (authDeleteError) {
    throw new Error(`Gagal menghapus akun auth merchant: ${authDeleteError.message}`)
  }
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

async function getMerchantDeletionReviewer() {
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
    throw new Error("Hanya operations manager atau superadmin yang dapat mereview penghapusan merchant.")
  }

  return {
    id: user.id,
    role,
  }
}

async function findPendingDeletionRequest(
  adminSupabase: ReturnType<typeof createAdminClient>,
  target: { merchantId?: string; profileId?: string },
) {
  if (target.merchantId) {
    const { data } = await adminSupabase
      .from("merchant_deletion_requests")
      .select("id")
      .eq("merchant_id", target.merchantId)
      .eq("status", "pending")
      .maybeSingle()
    return data
  }

  if (target.profileId) {
    const { data } = await adminSupabase
      .from("merchant_deletion_requests")
      .select("id")
      .eq("profile_id", target.profileId)
      .eq("status", "pending")
      .maybeSingle()
    return data
  }

  return null
}

async function sendMerchantDecisionEmail({
  email,
  brandName,
  locale,
  type,
  reason,
}: {
  email: string | null
  brandName: string | null
  locale?: string | null
  type: "approved" | "rejected" | "inactive" | "deleted"
  reason?: string
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
      accountSummary: "账号摘要",
      merchantLabel: "商家",
      emailLabel: "账号邮箱",
      statusLabel: "账号状态",
      closing: "此致敬礼，<br/><strong>Red Feng 管理团队</strong>",
      defaultReason: "如需进一步说明，请通过 Red Feng 官方沟通渠道联系我们。",
    },  }
  const copy = emailCopy[activeLocale]
  const resolvedReason = reason || copy.defaultReason

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
        <p style="margin:0 0 18px;">${copy.rejectedGuidance}</p>
        <p style="margin:0;">${copy.closing}</p>
      </div>
    `,
  })
}

export async function approveMerchant(formData: FormData) {
  const merchantId = formData.get("merchantId") as string
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
      verification_status: "approved",
      rejection_reason: null,
      verified_at: new Date().toISOString(),
    })
    .eq("id", merchantId)

  if (error) {
    console.error("Approve error:", error)
    backToMerchants(error.message || "Gagal menyetujui merchant.", "error")
  }

  try {
    await sendMerchantDecisionEmail({
      email: merchant?.email ?? null,
      brandName: merchant?.brand_name ?? null,
      locale: merchant?.default_locale ?? "id",
      type: "approved",
    })
  } catch (emailError) {
    console.error("Approve merchant email error:", emailError)
  }

  revalidateMerchantPages()

  await createAdminAuditLog({
    actorId: actor.id,
    actorRole: actor.role,
    targetType: "merchant",
    targetId: merchantId,
    action: "approve",
    summary: `Merchant ${merchantId} disetujui admin`,
    metadata: {
      status: "approved",
      brandName: merchant?.brand_name ?? null,
    },
  })

  backToMerchants(`Merchant ${merchant?.brand_name || merchant?.email || merchantId} berhasil disetujui.`, "success")
}

export async function rejectMerchant(formData: FormData) {
  const merchantId = formData.get("merchantId") as string
  const reason = formData.get("reason") as string

  if (!merchantId || !reason) {
    backToMerchants("Merchant dan alasan penolakan wajib diisi.", "error")
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
      verification_status: "rejected",
      rejection_reason: reason,
    })
    .eq("id", merchantId)

  if (error) {
    console.error("Reject error:", error)
    backToMerchants(error.message || "Gagal menolak merchant.", "error")
  }

  try {
    await sendMerchantDecisionEmail({
      email: merchant?.email ?? null,
      brandName: merchant?.brand_name ?? null,
      locale: merchant?.default_locale ?? "id",
      type: "rejected",
      reason,
    })
  } catch (emailError) {
    console.error("Reject merchant email error:", emailError)
  }

  revalidateMerchantPages()

  await createAdminAuditLog({
    actorId: actor.id,
    actorRole: actor.role,
    targetType: "merchant",
    targetId: merchantId,
    action: "reject",
    summary: `Merchant ${merchantId} ditolak admin`,
    metadata: {
      status: "rejected",
      reason,
      brandName: merchant?.brand_name ?? null,
    },
  })

  backToMerchants(`Merchant ${merchant?.brand_name || merchant?.email || merchantId} berhasil ditolak.`, "success")
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
      backToMerchants("Merchant ini sudah punya pengajuan hapus yang masih menunggu review operations manager.", "error")
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
    backToMerchants(`Pengajuan hapus merchant ${merchant.brand_name || merchant.email || merchantId} berhasil dikirim ke operations manager.`, "success")
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("id, role, email")
    .eq("id", profileId)
    .maybeSingle()

  if (profileError || !profile || profile.role !== "merchant") {
    console.error("Delete orphan merchant profile error:", profileError)
    backToMerchants("Akun merchant tanpa data merchant tidak ditemukan.", "error")
  }

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
    backToMerchants("Akun merchant ini sudah punya pengajuan hapus yang masih menunggu review operations manager.", "error")
  }

  const { error: insertRequestError } = await supabaseAdmin.from("merchant_deletion_requests").insert({
    profile_id: profileId,
    merchant_email: profile.email,
    merchant_name: profile.email || profileId,
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
  backToMerchants(`Pengajuan hapus akun merchant ${profile.email || profileId} berhasil dikirim ke operations manager.`, "success")
}

export async function approveMerchantDeletion(formData: FormData) {
  const requestId = String(formData.get("requestId") || "").trim()
  const reviewNote = String(formData.get("reviewNote") || "").trim()

  if (!requestId) {
    backToMerchants("Request penghapusan merchant tidak ditemukan.", "error")
  }

  const supabaseAdmin = createAdminClient()
  const reviewer = await getMerchantDeletionReviewer()
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
      .select("id, user_id, email, brand_name, default_locale")
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
        reason: request.reason,
      })
    } catch (emailError) {
      console.error("Approve merchant deletion email error:", emailError)
    }

    try {
      await purgeMerchantAccountRecords(supabaseAdmin, request.merchant_id, merchant.user_id)
    } catch (deleteError) {
      console.error("Approve merchant deletion purge error:", deleteError)
      backToMerchants(deleteError instanceof Error ? deleteError.message : "Gagal menghapus merchant secara permanen.", "error")
    }
  } else if (request.profile_id) {
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("id, role, email")
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
        email: profile.email ?? null,
        brandName: null,
        type: "deleted",
        reason: request.reason,
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

export async function cancelMerchantDeletion(formData: FormData) {
  const requestId = String(formData.get("requestId") || "").trim()
  const reviewNote = String(formData.get("reviewNote") || "").trim()

  if (!requestId) {
    backToMerchants("Request penghapusan merchant tidak ditemukan.", "error")
  }

  const supabaseAdmin = createAdminClient()
  const reviewer = await getMerchantDeletionReviewer()
  const { data: request, error: requestError } = await supabaseAdmin
    .from("merchant_deletion_requests")
    .select("id, merchant_id, profile_id, merchant_email, merchant_name, reason, status")
    .eq("id", requestId)
    .maybeSingle()

  if (requestError || !request || request.status !== "pending") {
    console.error("Cancel merchant deletion request error:", requestError)
    backToMerchants("Request penghapusan merchant tidak valid atau sudah diproses.", "error")
  }

  const { error: cancelError } = await supabaseAdmin
    .from("merchant_deletion_requests")
    .update({
      status: "cancelled",
      review_note: reviewNote || "Penghapusan merchant dibatalkan operations manager.",
      reviewed_by: reviewer.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", requestId)
    .eq("status", "pending")

  if (cancelError) {
    backToMerchants(cancelError.message || "Gagal membatalkan pengajuan hapus merchant.", "error")
  }

  await createAdminAuditLog({
    actorId: reviewer.id,
    actorRole: reviewer.role,
    targetType: "merchant",
    targetId: request.merchant_id || request.profile_id || requestId,
    action: "cancel_delete_request",
    summary: `Request penghapusan merchant ${request.id} dibatalkan operations manager`,
    metadata: {
      requestId: request.id,
      reason: request.reason,
      reviewNote: reviewNote || null,
      targetMerchantId: request.merchant_id || null,
      targetProfileId: request.profile_id || null,
    },
  })

  revalidateMerchantPages()
  backToMerchants(`Pengajuan hapus merchant ${request.merchant_name || request.merchant_email || request.id} berhasil dibatalkan.`, "success")
}

