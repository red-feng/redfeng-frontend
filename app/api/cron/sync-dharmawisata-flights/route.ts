import { NextResponse } from "next/server"

import { syncDharmawisataFlightRoutes } from "@/lib/flights/dharmawisataRouteCache"
import { getOptionalEnv } from "@/lib/env"

export const maxDuration = 60

function isAuthorized(request: Request) {
  const secret = getOptionalEnv("CRON_SECRET").trim()
  if (!secret) return true

  const authorization = request.headers.get("authorization") || ""
  const isTrustedVercelCron = request.headers.get("x-vercel-cron") === "1"
  return isTrustedVercelCron || authorization === `Bearer ${secret}`
}

async function handleSync(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 })
  }

  try {
    const url = new URL(request.url)
    const mode = url.searchParams.get("mode")
    const airline = url.searchParams.get("airline")
    const routesParam = url.searchParams.get("routes")
    const offset = Number(url.searchParams.get("offset") || "0")
    const limit = Number(url.searchParams.get("limit") || "500")
    const syncRoutes = mode === "routes" || routesParam === "1" || Boolean(airline)
    const flight = await syncDharmawisataFlightRoutes({
      syncAirports: mode !== "routes",
      syncRoutes,
      airlineCodes: airline ? airline.split(",") : undefined,
      routeOffset: Number.isFinite(offset) ? offset : 0,
      routeLimit: Number.isFinite(limit) ? limit : 500,
    })
    return NextResponse.json({ ok: flight.ok, flight }, { status: flight.ok ? 200 : 422 })
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Sync rute pesawat Dharmawisata gagal.",
      },
      { status: 500 },
    )
  }
}

export async function GET(request: Request) {
  return handleSync(request)
}

export async function POST(request: Request) {
  return handleSync(request)
}
