import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { isMarketingPortalRole, normalizeRole } from "@/lib/internal-roles"

type SubscriberRow = {
  email: string
  locale: string | null
  source_path: string | null
  status: string | null
  subscribed_at: string | null
  created_at: string | null
  updated_at: string | null
}

function escapeCsvValue(value: string | null | undefined) {
  const normalized = String(value || "")
  if (normalized.includes(",") || normalized.includes("\"") || normalized.includes("\n")) {
    return `"${normalized.replace(/"/g, "\"\"")}"`
  }
  return normalized
}

export async function GET(request: Request) {
  const supabase = await createClient("marketing")
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return new NextResponse("Unauthorized", { status: 401 })
  }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle()
  const role = normalizeRole(profile?.role)

  if (!(isMarketingPortalRole(role) || role === "superadmin")) {
    return new NextResponse("Forbidden", { status: 403 })
  }

  const url = new URL(request.url)
  const query = url.searchParams.get("q")?.trim() || ""
  const status = url.searchParams.get("status")?.trim() || "all"
  const source = url.searchParams.get("source")?.trim() || "all"

  const adminSupabase = createAdminClient()
  let subscriberQuery = adminSupabase
    .from("newsletter_subscribers")
    .select("email, locale, source_path, status, subscribed_at, created_at, updated_at")
    .order("subscribed_at", { ascending: false })

  if (query) {
    subscriberQuery = subscriberQuery.ilike("email", `%${query}%`)
  }

  if (status !== "all") {
    subscriberQuery = subscriberQuery.eq("status", status)
  }

  if (source !== "all") {
    subscriberQuery = subscriberQuery.eq("source_path", source)
  }

  const { data, error } = await subscriberQuery

  if (error) {
    return new NextResponse(error.message, { status: 500 })
  }

  const rows = (data as SubscriberRow[] | null) || []
  const header = ["email", "locale", "source_path", "status", "subscribed_at", "created_at", "updated_at"]
  const lines = [
    header.join(","),
    ...rows.map((row) =>
      [
        escapeCsvValue(row.email),
        escapeCsvValue(row.locale),
        escapeCsvValue(row.source_path),
        escapeCsvValue(row.status),
        escapeCsvValue(row.subscribed_at),
        escapeCsvValue(row.created_at),
        escapeCsvValue(row.updated_at),
      ].join(","),
    ),
  ]

  return new NextResponse(lines.join("\n"), {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="newsletter-subscribers-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "no-store",
    },
  })
}
