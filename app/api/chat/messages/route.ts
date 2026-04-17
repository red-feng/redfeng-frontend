import { NextResponse } from "next/server"
import { buildPackageChatDisabledResponse } from "@/lib/chat/package-chat-disabled"

export async function GET() {
  return NextResponse.json(buildPackageChatDisabledResponse(), { status: 410 })
}
