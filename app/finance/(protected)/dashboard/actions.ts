"use server"

import { redirect } from "next/navigation"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

function backToDashboard(message: string, type: "success" | "error"): never {
  redirect(`/finance/dashboard?${type}=${encodeURIComponent(message)}`)
}

function readText(formData: FormData, key: string) {
  return String(formData.get(key) || "").trim()
}

export async function submitFinanceManagerReport(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/finance/login")
  }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
  if (!profile || !["finance_manager", "superadmin"].includes(profile.role || "")) {
    backToDashboard("Hanya finance manager atau superadmin yang dapat mengirim laporan finance.", "error")
  }

  const title = readText(formData, "title")
  const summary = readText(formData, "summary")
  const payoutQueueStatus = readText(formData, "payout_queue_status")
  const agingStatus = readText(formData, "aging_status")
  const financialPosition = readText(formData, "financial_position")
  const executionQuality = readText(formData, "execution_quality")
  const transferIssues = readText(formData, "transfer_issues")
  const blockers = readText(formData, "blockers")
  const financialRisks = readText(formData, "financial_risks")
  const nextSteps = readText(formData, "next_steps")
  const supportNeeded = readText(formData, "support_needed")
  const metricSnapshotRaw = String(formData.get("metric_snapshot") || "{}")

  if (!title || !summary || !payoutQueueStatus || !agingStatus || !financialPosition || !financialRisks || !supportNeeded) {
    backToDashboard("Judul, ringkasan eksekutif, status queue payout, aging, posisi keuangan, risiko, dan kebutuhan keputusan wajib diisi.", "error")
  }

  let metricSnapshot: Record<string, unknown> = {}
  try {
    metricSnapshot = JSON.parse(metricSnapshotRaw)
  } catch {
    metricSnapshot = {}
  }

  metricSnapshot = {
    ...metricSnapshot,
    payoutQueueStatus,
    agingStatus,
    financialPosition,
    executionQuality: executionQuality || null,
    transferIssues: transferIssues || null,
    financialRisks,
    supportNeeded,
  }

  const adminSupabase = createAdminClient()
  const { error } = await adminSupabase.from("manager_reports").insert({
    author_id: user.id,
    author_role: "finance_manager",
    report_type: "finance",
    title,
    summary,
    blockers: blockers || null,
    next_steps: nextSteps || null,
    metric_snapshot: metricSnapshot,
  })

  if (error) {
    backToDashboard(error.message, "error")
  }

  backToDashboard("Laporan finance manager berhasil dikirim ke superadmin.", "success")
}
