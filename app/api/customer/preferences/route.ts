import { NextResponse } from "next/server"
import {
  normalizeFavoriteItems,
  normalizeNotificationItems,
} from "@/lib/customer-preferences"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

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

  if (error) {
    return NextResponse.json({ error: error.message || "Gagal memuat preferensi customer" }, { status: 500 })
  }

  return NextResponse.json({
    favorites: normalizeFavoriteItems(data?.favorite_items),
    notifications: normalizeNotificationItems(data?.notification_items),
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
  const { data: existing } = await adminSupabase
    .from("customer_experience_preferences")
    .select("favorite_items, notification_items")
    .eq("profile_id", user.id)
    .maybeSingle()

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

  if (error) {
    return NextResponse.json({ error: error.message || "Gagal menyimpan preferensi customer" }, { status: 500 })
  }

  return NextResponse.json({
    ok: true,
    favorites: favoriteItems,
    notifications: notificationItems,
  })
}
