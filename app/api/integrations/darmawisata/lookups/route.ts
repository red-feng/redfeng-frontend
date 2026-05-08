import { NextResponse } from "next/server"

import { getDarmaWisataPublicConfig } from "@/lib/darmawisata/config"

const SUPPORTED_SCOPES = ["flight", "hotel", "train", "bus", "ship"] as const
const SUPPORTED_FIELDS = ["origin", "destination", "passenger", "date", "time"] as const

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const scope = searchParams.get("scope") ?? ""
  const field = searchParams.get("field") ?? ""
  const query = searchParams.get("query") ?? ""
  const config = getDarmaWisataPublicConfig()

  if (!config.configured) {
    return NextResponse.json(
      {
        ok: false,
        error: "Darma Wisata credentials belum dikonfigurasi di server.",
        scope,
        field,
        query,
        items: [],
      },
      { status: 503 },
    )
  }

  if (!SUPPORTED_SCOPES.includes(scope as (typeof SUPPORTED_SCOPES)[number])) {
    return NextResponse.json(
      {
        ok: false,
        error: "Scope lookup Darma Wisata belum dikenali.",
        supportedScopes: SUPPORTED_SCOPES,
        items: [],
      },
      { status: 400 },
    )
  }

  if (!SUPPORTED_FIELDS.includes(field as (typeof SUPPORTED_FIELDS)[number])) {
    return NextResponse.json(
      {
        ok: false,
        error: "Field lookup Darma Wisata belum dikenali.",
        supportedFields: SUPPORTED_FIELDS,
        items: [],
      },
      { status: 400 },
    )
  }

  return NextResponse.json(
    {
      ok: false,
      provider: "partner_darmawisata",
      scope,
      field,
      query,
      error: "Lookup Darma Wisata belum dihubungkan ke endpoint partner.",
      items: [],
    },
    { status: 501 },
  )
}
