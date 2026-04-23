import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { ensureAccountRole, ensureCustomerBaselineRole } from "@/lib/account-roles"

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      userId?: string
      email?: string
      defaultLocale?: string
    }

    const userId = body.userId?.trim()
    const email = body.email?.trim().toLowerCase() ?? null
    const defaultLocale =
      body.defaultLocale === "en" || body.defaultLocale === "zh" || body.defaultLocale === "id"
        ? body.defaultLocale
        : "id"

    if (!userId) {
      return NextResponse.json({ error: "Missing merchant user id." }, { status: 400 })
    }

    const adminSupabase = createAdminClient()

    const { data: existingProfile } = await adminSupabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .maybeSingle()
    const { error: profileError } = await adminSupabase.from("profiles").upsert({
      id: userId,
      role: existingProfile?.role || "customer",
    })

    if (profileError) {
      return NextResponse.json(
        { error: `Failed to prepare merchant profile: ${profileError.message}` },
        { status: 500 },
      )
    }

    await ensureCustomerBaselineRole(adminSupabase, userId, "merchant_register_bootstrap")
    await ensureAccountRole(adminSupabase, userId, "merchant", "merchant_register_bootstrap")

    const { error: merchantError } = await adminSupabase.from("merchants").upsert(
      {
        user_id: userId,
        email,
        default_locale: defaultLocale,
        verification_status: "draft",
        onboarding_step: 1,
        onboarding_completed: false,
      },
      { onConflict: "user_id" },
    )

    if (merchantError) {
      return NextResponse.json(
        { error: `Failed to prepare merchant draft: ${merchantError.message}` },
        { status: 500 },
      )
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ error: `Merchant bootstrap failed: ${message}` }, { status: 500 })
  }
}
