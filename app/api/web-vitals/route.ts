import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

type RawPayload = {
  type?: unknown
  name?: unknown
  value?: unknown
  path?: unknown
  id?: unknown
  rating?: unknown
}

function normalizeMetricPayload(payload: RawPayload) {
  const eventType = payload.type === "web-vital" || payload.type === "navigation" ? payload.type : null
  const metricName = typeof payload.name === "string" ? payload.name.trim() : ""
  const path = typeof payload.path === "string" ? payload.path.trim() : ""
  const metricValue = Number(payload.value)
  const metricId = typeof payload.id === "string" ? payload.id.trim() : null
  const ratingValue = typeof payload.rating === "string" ? payload.rating.trim() : ""
  const rating =
    ratingValue === "good" || ratingValue === "needs-improvement" || ratingValue === "poor"
      ? ratingValue
      : null

  if (!eventType || !metricName || !path || !Number.isFinite(metricValue)) {
    return null
  }

  return {
    event_type: eventType,
    metric_name: metricName,
    metric_value: metricValue,
    path,
    metric_id: metricId || null,
    rating,
  }
}

export async function POST(request: Request) {
  try {
    const payload = normalizeMetricPayload(await request.json())

    if (!payload) {
      return NextResponse.json({ ok: false, error: "Invalid payload" }, { status: 400 })
    }

    const supabase = createAdminClient()
    const { error } = await supabase.from("web_vitals_events").insert({
      ...payload,
      user_agent: request.headers.get("user-agent"),
    })

    if (error) {
      console.error("[web-vitals] insert failed", error)

      if (process.env.NODE_ENV !== "production") {
        console.log("[web-vitals:fallback]", payload)
      }

      return NextResponse.json({ ok: false }, { status: 500 })
    }

    return NextResponse.json({ ok: true }, { status: 202 })
  } catch (error) {
    console.error("[web-vitals] request failed", error)
    return NextResponse.json({ ok: false }, { status: 400 })
  }
}
