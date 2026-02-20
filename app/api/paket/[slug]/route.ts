import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await context.params;

    const res = await fetch(
      `https://redfeng.co/wp-json/redfeng/v1/paket/${slug}`
    );

    if (!res.ok) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}