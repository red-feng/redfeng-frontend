import { NextResponse } from "next/server"

import { syncDharmawisataFlightRoutes } from "@/lib/flights/dharmawisataRouteCache"
import { getOptionalEnv } from "@/lib/env"

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
    const flight = await syncDharmawisataFlightRoutes()
    return NextResponse.json({ ok: flight.ok, flight })
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
