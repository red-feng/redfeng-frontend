"use server"

import { redirect } from "next/navigation"
import { getDharmawisataAgentBalance } from "@/lib/dharmawisata/agentBalance"
import { createClient } from "@/lib/supabase/server"

type FinanceBalancePortal = "finance" | "superadmin"

function resolvePortal(formData: FormData): FinanceBalancePortal {
  return String(formData.get("portal") || "").trim() === "superadmin" ? "superadmin" : "finance"
}

function resolvePaths(portal: FinanceBalancePortal) {
  return {
    loginPath: portal === "superadmin" ? "/superadmin/login" : "/finance/login",
    balancePath: portal === "superadmin" ? "/superadmin/supplier-balances" : "/finance/supplier-balances",
  }
}

function buildResultPayload(value: unknown) {
  return JSON.stringify(value)
}

function rethrowNextRedirect(error: unknown) {
  const digest =
    error && typeof error === "object" && "digest" in error ? String((error as { digest?: unknown }).digest || "") : ""
  if (digest.startsWith("NEXT_REDIRECT")) throw error
}

async function ensureSupplierBalanceAccess(portal: FinanceBalancePortal) {
  const supabase = await createClient(portal)
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect(resolvePaths(portal).loginPath)

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
  if (portal === "superadmin" ? profile?.role !== "superadmin" : profile?.role !== "finance_manager") {
    redirect(resolvePaths(portal).loginPath)
  }
}

export async function checkDharmawisataSupplierBalance(formData: FormData) {
  const portal = resolvePortal(formData)
  await ensureSupplierBalanceAccess(portal)
  const startedAt = Date.now()

  try {
    const result = await getDharmawisataAgentBalance()
    const status = result.ok ? "success" : result.skipped ? "warning" : "error"
    const params = new URLSearchParams({
      status,
      result: buildResultPayload({
        title: "Saldo agent Dharmawisata",
        elapsedMs: Date.now() - startedAt,
        status: result.status || (result.skipped ? "SKIPPED" : "FAILED"),
        respMessage: result.message,
        respTime: result.respTime || "",
        userID: result.userId || "",
        balance: result.balance,
        balanceFormatted: result.balanceFormatted,
        hasBalance: result.balance !== null,
        raw: result.raw,
      }),
    })

    redirect(`${resolvePaths(portal).balancePath}?${params.toString()}#dharmawisata-balance-result`)
  } catch (error) {
    rethrowNextRedirect(error)
    const params = new URLSearchParams({
      status: "error",
      result: buildResultPayload({
        title: "Cek saldo agent gagal",
        elapsedMs: Date.now() - startedAt,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
    })

    redirect(`${resolvePaths(portal).balancePath}?${params.toString()}#dharmawisata-balance-result`)
  }
}
