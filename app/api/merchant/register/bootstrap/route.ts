import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      userId?: string
      email?: string
    }

    const userId = body.userId?.trim()
    const email = body.email?.trim().toLowerCase() ?? null

    if (!userId) {
      return NextResponse.json({ error: "Missing merchant user id." }, { status: 400 })
    }

    const adminSupabase = createAdminClient()

    const { error: profileError } = await adminSupabase.from("profiles").upsert({
      id: userId,
      role: "merchant",
    })

    if (profileError) {
      return NextResponse.json(
        { error: `Failed to prepare merchant profile: ${profileError.message}` },
        { status: 500 },
      )
    }

    const { error: merchantError } = await adminSupabase.from("merchants").upsert(
      {
        user_id: userId,
        email,
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
