import { NextResponse } from "next/server"

import { syncDharmawisataFlightRoutes } from "@/lib/flights/dharmawisataRouteCache"
import { syncDharmawisataHotelDestinations } from "@/lib/hotels/dharmawisataDestinationCache"
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
    const url = new URL(request.url)
    const product = url.searchParams.get("product")

    if (product === "hotel") {
      const hotel = await syncDharmawisataHotelDestinations()
      return NextResponse.json({ ok: hotel.ok, hotel })
    }

    if (product === "flight") {
      const flight = await syncDharmawisataFlightRoutes()
      return NextResponse.json({ ok: flight.ok, flight })
    }

    const hotel = await syncDharmawisataHotelDestinations()
    const flight = await syncDharmawisataFlightRoutes()

    return NextResponse.json({
      ok: hotel.ok && flight.ok,
      hotel,
      flight,
    })
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Sync Dharmawisata catalog gagal.",
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
