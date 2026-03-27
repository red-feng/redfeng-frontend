"use server"

import { redirect } from "next/navigation"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

function backToDashboard(message: string, type: "success" | "error"): never {
  redirect(`/admin/dashboard?${type}=${encodeURIComponent(message)}`)
}

export async function submitOperationsManagerReport(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/admin/login")
  }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
  if (!profile || !["operations_manager", "superadmin"].includes(profile.role || "")) {
    backToDashboard("Hanya operations manager atau superadmin yang dapat mengirim laporan operasional.", "error")
  }

  const title = String(formData.get("title") || "").trim()
  const summary = String(formData.get("summary") || "").trim()
  const blockers = String(formData.get("blockers") || "").trim()
  const nextSteps = String(formData.get("next_steps") || "").trim()
  const metricSnapshotRaw = String(formData.get("metric_snapshot") || "{}")

  if (!title || !summary) {
    backToDashboard("Judul dan ringkasan laporan operasional wajib diisi.", "error")
  }

  let metricSnapshot: Record<string, unknown> = {}
  try {
    metricSnapshot = JSON.parse(metricSnapshotRaw)
  } catch {
    metricSnapshot = {}
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
    backToDashboard(error.message, "error")
  }

  backToDashboard("Laporan operations manager berhasil dikirim ke superadmin.", "success")
}
