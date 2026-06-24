import { NextResponse } from "next/server"

import { syncDharmawisataHotelDestinations } from "@/lib/hotels/dharmawisataDestinationCache"
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
    const offset = Number(url.searchParams.get("offset") || "0")
    const limit = Number(url.searchParams.get("limit") || "15")
    const hotel = await syncDharmawisataHotelDestinations({
      countryOffset: Number.isFinite(offset) ? offset : 0,
      countryLimit: Number.isFinite(limit) ? limit : 15,
    })
    return NextResponse.json({ ok: hotel.ok, hotel })
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Sync destinasi hotel Dharmawisata gagal.",
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
