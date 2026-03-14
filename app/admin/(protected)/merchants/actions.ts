"use server"

import { getOptionalEnv } from "@/lib/env"
import { createAdminClient } from "@/lib/supabase/admin"
import { revalidatePath } from "next/cache"
import { Resend } from "resend"

function revalidateMerchantPages() {
  revalidatePath("/admin/merchants")
  revalidatePath("/merchant/dashboard")
  revalidatePath("/merchant/login")
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
        <h2>Halo ${merchantName},</h2>
        <p>Kabar baik. Akun merchant Anda telah disetujui oleh tim RedFeng.</p>
        <p>Anda sekarang dapat login ke dashboard merchant dan mulai mengelola paket wisata Anda.</p>
        <br/>
        <p>Terima kasih,<br/>Tim RedFeng</p>
      `,
    })
    return
  }

  await resend.emails.send({
    from: "RedFeng Admin <admin@redfeng.co>",
    to: email,
    subject: "RedFeng Merchant: Pengajuan Perlu Diperbaiki",
    html: `
      <h2>Halo ${merchantName},</h2>
      <p>Pengajuan merchant Anda belum dapat kami setujui saat ini.</p>
      <p><strong>Catatan admin:</strong></p>
      <p>${reason || "Mohon periksa kembali data dan dokumen yang Anda unggah."}</p>
      <p>Silakan login kembali, perbaiki data yang diminta, lalu ajukan ulang untuk review admin.</p>
      <br/>
      <p>Terima kasih,<br/>Tim RedFeng</p>
    `,
  })
}

export async function approveMerchant(formData: FormData) {
  const merchantId = formData.get("merchantId") as string
  if (!merchantId) return

  const supabaseAdmin = createAdminClient()

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
}

export async function rejectMerchant(formData: FormData) {
  const merchantId = formData.get("merchantId") as string
  const reason = formData.get("reason") as string

  if (!merchantId || !reason) return

  const supabaseAdmin = createAdminClient()

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
}

export async function deactivateMerchant(formData: FormData) {
  const merchantId = formData.get("merchantId") as string
  const reason = ((formData.get("reason") as string) || "").trim()

  if (!merchantId) return

  const supabaseAdmin = createAdminClient()

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
}

export async function reactivateMerchant(formData: FormData) {
  const merchantId = formData.get("merchantId") as string
  if (!merchantId) return

  const supabaseAdmin = createAdminClient()

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
}

export async function deleteMerchant(formData: FormData) {
  const merchantId = formData.get("merchantId") as string
  const reason = ((formData.get("reason") as string) || "").trim()

  if (!merchantId || !reason) return

  const supabaseAdmin = createAdminClient()

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
}
