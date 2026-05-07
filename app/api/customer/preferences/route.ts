import { NextResponse } from "next/server"
import {
  normalizeFavoriteItems,
  normalizeNotificationItems,
} from "@/lib/customer-preferences"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

function isMissingPreferencesTableError(error: { code?: string | null; message?: string | null } | null) {
  const code = String(error?.code || "").trim()
  const message = String(error?.message || "").toLowerCase()
  return code === "42P01" || message.includes("customer_experience_preferences")
}

export async function GET() {
  const supabase = await createClient("customer")
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const adminSupabase = createAdminClient()
  const { data, error } = await adminSupabase
    .from("customer_experience_preferences")
    .select("favorite_items, notification_items")
    .eq("profile_id", user.id)
    .maybeSingle()

  if (isMissingPreferencesTableError(error)) {
    return NextResponse.json({
      favorites: [],
      notifications: [],
      storageMode: "local_only" as const,
    })
  }

  if (error) {
    return NextResponse.json({ error: error.message || "Gagal memuat preferensi customer" }, { status: 500 })
  }

  return NextResponse.json({
    favorites: normalizeFavoriteItems(data?.favorite_items),
    notifications: normalizeNotificationItems(data?.notification_items),
    storageMode: "account" as const,
  })
}

export async function PUT(request: Request) {
  const supabase = await createClient("customer")
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    body = {}
  }

  const payload = typeof body === "object" && body ? (body as Record<string, unknown>) : {}
  const adminSupabase = createAdminClient()
  const { data: existing, error: existingError } = await adminSupabase
    .from("customer_experience_preferences")
    .select("favorite_items, notification_items")
    .eq("profile_id", user.id)
    .maybeSingle()

  if (isMissingPreferencesTableError(existingError)) {
    const favoriteItems = "favorites" in payload ? normalizeFavoriteItems(payload.favorites) : []
    const notificationItems =
      "notifications" in payload ? normalizeNotificationItems(payload.notifications) : []

    return NextResponse.json({
      ok: true,
      favorites: favoriteItems,
      notifications: notificationItems,
      storageMode: "local_only" as const,
    })
  }

  if (existingError) {
    return NextResponse.json(
      { error: existingError.message || "Gagal membaca preferensi customer" },
      { status: 500 },
    )
  }

  const favoriteItems =
    "favorites" in payload
      ? normalizeFavoriteItems(payload.favorites)
      : normalizeFavoriteItems(existing?.favorite_items)
  const notificationItems =
    "notifications" in payload
      ? normalizeNotificationItems(payload.notifications)
      : normalizeNotificationItems(existing?.notification_items)

  const { error } = await adminSupabase
    .from("customer_experience_preferences")
    .upsert(
      {
        profile_id: user.id,
        favorite_items: favoriteItems,
        notification_items: notificationItems,
      },
      { onConflict: "profile_id" },
    )

  if (isMissingPreferencesTableError(error)) {
    return NextResponse.json({
      ok: true,
      favorites: favoriteItems,
      notifications: notificationItems,
      storageMode: "local_only" as const,
    })
  }

  if (error) {
    return NextResponse.json({ error: error.message || "Gagal menyimpan preferensi customer" }, { status: 500 })
  }

  return NextResponse.json({
    ok: true,
    favorites: favoriteItems,
    notifications: notificationItems,
    storageMode: "account" as const,
  })
}
