import { NextResponse } from "next/server"

import { getDarmaWisataPublicConfig } from "@/lib/darmawisata/config"

export async function GET() {
  const config = getDarmaWisataPublicConfig()

  return NextResponse.json({
    ok: true,
    provider: "partner_darmawisata",
    ...config,
  })
}
