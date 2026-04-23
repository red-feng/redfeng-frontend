"use server"

import { redirect } from "next/navigation"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import {
  ALL_OPERATIONS_DASHBOARD_WIDGET_KEYS,
  DEFAULT_OPERATIONS_DASHBOARD_WIDGET_KEYS,
  OPERATIONS_DASHBOARD_SCOPE,
} from "@/lib/admin-dashboard-widgets"

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

function readWidgetSortOrders(formData: FormData, allKeys: string[]) {
  const fallbackOrder = new Map(allKeys.map((widgetKey, index) => [widgetKey, index]))

  return new Map(
    allKeys.map((widgetKey) => {
      const rawValue = String(formData.get(`sort_order__${widgetKey}`) || "").trim()
      const parsed = Number(rawValue)
      return [widgetKey, Number.isFinite(parsed) ? parsed : fallbackOrder.get(widgetKey) || 0]
    }),
  )
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

async function getOperationsWidgetUser(returnTo: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/admin/login")
  }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
  if (!profile || !["operations_manager", "superadmin"].includes(profile.role || "")) {
    backToDashboard(returnTo, "Hanya operations manager atau superadmin yang dapat mengatur widget dashboard.", "error")
  }

  return user
}

export async function saveOperationsDashboardWidgets(formData: FormData) {
  const returnTo = resolveReturnTo(formData, "/admin/dashboard/widgets")
  const user = await getOperationsWidgetUser(returnTo)
  const allKeys = ALL_OPERATIONS_DASHBOARD_WIDGET_KEYS
  const enabledKeys = new Set(formData.getAll("enabled_widget_keys").map((value) => String(value)))
  const sortOrderMap = readWidgetSortOrders(formData, allKeys)
  const adminSupabase = createAdminClient()
  const rows = allKeys.map((widgetKey, index) => ({
    profile_id: user.id,
    dashboard_scope: OPERATIONS_DASHBOARD_SCOPE,
    widget_key: widgetKey,
    enabled: enabledKeys.has(widgetKey),
    sort_order: sortOrderMap.get(widgetKey) ?? index,
  }))

  const { error } = await adminSupabase
    .from("dashboard_widget_preferences")
    .upsert(rows, { onConflict: "profile_id,dashboard_scope,widget_key" })

  if (error) {
    backToDashboard(returnTo, error.message, "error")
  }

  backToDashboard(returnTo, "Widget dashboard berhasil disimpan.", "success")
}

export async function resetOperationsDashboardWidgets(formData: FormData) {
  const returnTo = resolveReturnTo(formData, "/admin/dashboard/widgets")
  const user = await getOperationsWidgetUser(returnTo)
  const adminSupabase = createAdminClient()
  const rows = ALL_OPERATIONS_DASHBOARD_WIDGET_KEYS.map((widgetKey, index) => ({
    profile_id: user.id,
    dashboard_scope: OPERATIONS_DASHBOARD_SCOPE,
    widget_key: widgetKey,
    enabled: DEFAULT_OPERATIONS_DASHBOARD_WIDGET_KEYS.includes(widgetKey as (typeof DEFAULT_OPERATIONS_DASHBOARD_WIDGET_KEYS)[number]),
    sort_order: index,
  }))

  const { error } = await adminSupabase
    .from("dashboard_widget_preferences")
    .upsert(rows, { onConflict: "profile_id,dashboard_scope,widget_key" })

  if (error) {
    backToDashboard(returnTo, error.message, "error")
  }

  backToDashboard(returnTo, "Widget dashboard dikembalikan ke default.", "success")
}
