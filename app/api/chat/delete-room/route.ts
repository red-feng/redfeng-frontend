import { NextResponse } from "next/server"
import { buildPackageChatDisabledResponse } from "@/lib/chat/package-chat-disabled"

export async function POST() {
  return NextResponse.json(buildPackageChatDisabledResponse(), { status: 410 })
}
