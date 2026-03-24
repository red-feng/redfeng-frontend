"use server"

import { getOptionalEnv } from "@/lib/env"
import { createAdminClient } from "@/lib/supabase/admin"
import { revalidatePath } from "next/cache"
import { Resend } from "resend"
import { createClient } from "@/lib/supabase/server"
import { createAdminAuditLog } from "@/lib/admin-audit"

function revalidateMerchantPages() {
  revalidatePath("/admin/merchants")
  revalidatePath("/merchant/dashboard")
  revalidatePath("/merchant/login")
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
  if (!profile || !["admin", "superadmin"].includes(profile.role)) {
    throw new Error("Akses admin tidak valid.")
  }

  return {
    id: user.id,
    role: profile.role,
  }
}

function assertSuperadmin(role: string) {
  if (role !== "superadmin") {
    throw new Error("Hanya superadmin yang dapat menghapus merchant.")
  }
}

async function sendMerchantDecisionEmail({
  email,
  brandName,
  type,
  reason,
}: {
  email: string | null
  brandName: string | null
  type: "approved" | "rejected"
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

  if (type === "approved") {
    await resend.emails.send({
      from: "RedFeng Admin <admin@redfeng.co>",
      to: email,
      subject: "RedFeng Merchant: Akun Anda Disetujui",
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.7;color:#0f172a;">
          <h2 style="margin-bottom:8px;">Halo ${merchantName},</h2>
          <p style="margin:0 0 14px;">Kabar baik. Akun merchant Anda telah <strong>disetujui</strong> oleh tim RedFeng.</p>
          <p style="margin:0 0 14px;">Anda sekarang dapat login ke dashboard merchant untuk mulai mengelola profil bisnis dan mengunggah paket wisata.</p>
          <p style="margin:0 0 18px;">Silakan gunakan akun merchant Anda untuk melanjutkan operasional di platform RedFeng.</p>
          <p style="margin:0;">Terima kasih,<br/><strong>Tim Admin RedFeng</strong></p>
        </div>
      `,
    })
    return
  }

  await resend.emails.send({
    from: "RedFeng Admin <admin@redfeng.co>",
    to: email,
    subject: "RedFeng Merchant: Pengajuan Perlu Diperbaiki",
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.7;color:#0f172a;">
        <h2 style="margin-bottom:8px;">Halo ${merchantName},</h2>
        <p style="margin:0 0 14px;">Pengajuan merchant Anda belum dapat kami setujui saat ini dan masih perlu diperbaiki.</p>
        <p style="margin:0 0 8px;"><strong>Catatan admin:</strong></p>
        <p style="margin:0 0 14px;">${reason || "Mohon periksa kembali data dan dokumen yang Anda unggah."}</p>
        <p style="margin:0 0 18px;">Silakan login kembali ke akun merchant Anda, lengkapi atau perbaiki data yang diminta, lalu ajukan ulang untuk review admin.</p>
        <p style="margin:0;">Terima kasih,<br/><strong>Tim Admin RedFeng</strong></p>
      </div>
    `,
  })
}

export async function approveMerchant(formData: FormData) {
  const merchantId = formData.get("merchantId") as string
  if (!merchantId) return

  const supabaseAdmin = createAdminClient()
  const actor = await getAdminActor()

  const { data: merchant } = await supabaseAdmin
    .from("merchants")
    .select("email, brand_name")
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
    return
  }

  try {
    await sendMerchantDecisionEmail({
      email: merchant?.email ?? null,
      brandName: merchant?.brand_name ?? null,
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
}

export async function rejectMerchant(formData: FormData) {
  const merchantId = formData.get("merchantId") as string
  const reason = formData.get("reason") as string

  if (!merchantId || !reason) return

  const supabaseAdmin = createAdminClient()
  const actor = await getAdminActor()

  const { data: merchant } = await supabaseAdmin
    .from("merchants")
    .select("email, brand_name")
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
    return
  }

  try {
    await sendMerchantDecisionEmail({
      email: merchant?.email ?? null,
      brandName: merchant?.brand_name ?? null,
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
}

export async function deactivateMerchant(formData: FormData) {
  const merchantId = formData.get("merchantId") as string
  const reason = ((formData.get("reason") as string) || "").trim()

  if (!merchantId) return

  const supabaseAdmin = createAdminClient()
  const actor = await getAdminActor()

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
    return
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
}

export async function reactivateMerchant(formData: FormData) {
  const merchantId = formData.get("merchantId") as string
  if (!merchantId) return

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
    return
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
}

export async function deleteMerchant(formData: FormData) {
  const merchantId = formData.get("merchantId") as string
  const reason = ((formData.get("reason") as string) || "").trim()

  if (!merchantId || !reason) return

  const supabaseAdmin = createAdminClient()
  const actor = await getAdminActor()
  assertSuperadmin(actor.role)

  const { error } = await supabaseAdmin
    .from("merchants")
    .update({
      verification_status: "deleted",
      rejection_reason: reason,
    })
    .eq("id", merchantId)
    .in("verification_status", ["approved", "inactive"])

  if (error) {
    console.error("Delete merchant error:", error)
    return
  }

  revalidateMerchantPages()

  await createAdminAuditLog({
    actorId: actor.id,
    actorRole: actor.role,
    targetType: "merchant",
    targetId: merchantId,
    action: "delete",
    summary: `Merchant ${merchantId} ditandai deleted`,
    metadata: {
      status: "deleted",
      reason,
    },
  })
}
