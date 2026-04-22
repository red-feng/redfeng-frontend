"use server"

import { redirect } from "next/navigation"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

function resolveReturnTo(formData: FormData, fallbackPath: string) {
  const returnTo = String(formData.get("return_to") || "").trim()
  return returnTo.startsWith("/") ? returnTo : fallbackPath
}

function backToDashboard(path: string, message: string, type: "success" | "error"): never {
  redirect(`${path}?${type}=${encodeURIComponent(message)}`)
}

function readText(formData: FormData, key: string) {
  return String(formData.get(key) || "").trim()
}

export async function submitOperationsManagerReport(formData: FormData) {
  const returnTo = resolveReturnTo(formData, "/admin/dashboard")
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(returnTo.startsWith("/superadmin") ? "/superadmin/login" : "/admin/login")
  }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
  if (!profile || !["operations_manager", "superadmin"].includes(profile.role || "")) {
    backToDashboard(returnTo, "Hanya operations manager atau superadmin yang dapat mengirim laporan operasional.", "error")
  }

  const title = readText(formData, "title")
  const summary = readText(formData, "summary")
  const queueStatus = readText(formData, "queue_status")
  const slaStatus = readText(formData, "sla_status")
  const customerTransactionSummary = readText(formData, "customer_transaction_summary")
  const customerFundsStatus = readText(formData, "customer_funds_status")
  const decisionQuality = readText(formData, "decision_quality")
  const teamCapacity = readText(formData, "team_capacity")
  const escalations = readText(formData, "escalations")
  const financeHandoffStatus = readText(formData, "finance_handoff_status")
  const blockers = readText(formData, "blockers")
  const transactionAnomalies = readText(formData, "transaction_anomalies")
  const operationalRisks = readText(formData, "operational_risks")
  const nextSteps = readText(formData, "next_steps")
  const supportNeeded = readText(formData, "support_needed")
  const metricSnapshotRaw = String(formData.get("metric_snapshot") || "{}")

  if (!title || !summary || !queueStatus || !slaStatus || !customerTransactionSummary || !customerFundsStatus || !escalations || !operationalRisks || !supportNeeded) {
    backToDashboard(returnTo, "Judul, ringkasan eksekutif, status queue, status SLA, ringkasan transaksi customer, status dana customer, eskalasi, risiko, dan kebutuhan keputusan wajib diisi.", "error")
  }

  let metricSnapshot: Record<string, unknown> = {}
  try {
    metricSnapshot = JSON.parse(metricSnapshotRaw)
  } catch {
    metricSnapshot = {}
  }

  metricSnapshot = {
    ...metricSnapshot,
    queueStatus,
    slaStatus,
    customerTransactionSummary,
    customerFundsStatus,
    decisionQuality: decisionQuality || null,
    teamCapacity: teamCapacity || null,
    escalations,
    financeHandoffStatus: financeHandoffStatus || null,
    transactionAnomalies: transactionAnomalies || null,
    operationalRisks,
    supportNeeded,
  }

  const adminSupabase = createAdminClient()
  const { error } = await adminSupabase.from("manager_reports").insert({
    author_id: user.id,
    author_role: "operations_manager",
    report_type: "operations",
    title,
    summary,
    blockers: blockers || null,
    next_steps: nextSteps || null,
    metric_snapshot: metricSnapshot,
  })

  if (error) {
    backToDashboard(returnTo, error.message, "error")
  }

  backToDashboard(returnTo, "Laporan operations manager berhasil dikirim ke superadmin.", "success")
}
