import { redirect } from "next/navigation"
import InternalChatRealtimeClient from "@/app/internal-chat/InternalChatRealtimeClient"
import {
  INTERNAL_CHAT_PAGE_SIZE,
  getInternalProfileById,
  listInternalChatUsers,
  loadInternalChatMessagesPageForUser,
  loadInternalChatRoomsForUser,
  markInternalRoomRead,
} from "@/lib/internal-chat/index"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

type Props = {
  portal: "admin" | "finance" | "marketing" | "superadmin"
  searchParams: Promise<{ room_id?: string; error?: string }>
}

const PORTAL_HEADLINES: Record<Props["portal"], { badge: string; title: string; description: string }> = {
  admin: {
    badge: "Admin Internal Chat",
    title: "Komunikasi internal realtime untuk tim operasional.",
    description:
      "Gunakan chat pribadi antar akun internal untuk koordinasi cepat lintas role.",
  },
  finance: {
    badge: "Finance Internal Chat",
    title: "Komunikasi internal realtime untuk tim finance.",
    description:
      "Sinkronkan keputusan payout, refund, dan koordinasi lintas role lewat chat pribadi internal.",
  },
  marketing: {
    badge: "Marketing Internal Chat",
    title: "Komunikasi internal realtime untuk tim marketing.",
    description:
      "Gunakan chat pribadi internal untuk koordinasi campaign, approval, dan ritme kerja harian bersama marketing manager.",
  },
  superadmin: {
    badge: "Superadmin Internal Chat",
    title: "Chat internal pribadi lintas semua manager.",
    description:
      "Superadmin dapat berkomunikasi langsung dengan semua role internal dalam satu inbox japri.",
  },
}

export const dynamic = "force-dynamic"

export default async function InternalChatWorkspace({ portal, searchParams }: Props) {
  const params = await searchParams
  const supabase = await createClient(portal)
  const adminSupabase = createAdminClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/${portal}/login`)
  }

  const profile = await getInternalProfileById(adminSupabase, user.id)
  if (!profile) {
    redirect(`/${portal}/login`)
  }

  const rooms = await loadInternalChatRoomsForUser(adminSupabase, user.id)
  const requestedRoomId = String(params.room_id || "").trim()
  const activeRoomId = requestedRoomId || rooms[0]?.id || ""
  const activeRoom = rooms.find((room) => room.id === activeRoomId) || null

  if (
    activeRoom &&
    activeRoom.lastMessageSenderId &&
    activeRoom.lastMessageSenderId !== user.id &&
    (!activeRoom.currentUserLastReadAt ||
      (activeRoom.lastMessageAt || "") > activeRoom.currentUserLastReadAt)
  ) {
    const readIso = new Date().toISOString()
    await markInternalRoomRead(adminSupabase, activeRoom.id, user.id, readIso)
    activeRoom.currentUserLastReadAt = readIso
  }

  const initialPage = activeRoomId
    ? await loadInternalChatMessagesPageForUser(adminSupabase, activeRoomId, user.id, {
        limit: INTERNAL_CHAT_PAGE_SIZE,
      })
    : { messages: [], hasMore: false, oldestCreatedAt: null as string | null }
  const messages = initialPage.messages
  const users = await listInternalChatUsers(adminSupabase, user.id)
  const headline = PORTAL_HEADLINES[portal]

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fff8f1_0%,#f6efe5_100%)] px-6 py-8 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <section className="rounded-[32px] border border-orange-200/70 bg-[linear-gradient(135deg,#7c2d12_0%,#c2410c_38%,#f97316_72%,#fdba74_100%)] px-8 py-10 text-white shadow-[0_26px_90px_rgba(146,64,14,0.2)]">
          <p className="inline-flex rounded-full border border-white/25 bg-white/10 px-4 py-1 text-[10px] font-semibold uppercase tracking-[0.3em] text-orange-50">
            {headline.badge}
          </p>
          <h1 className="mt-5 max-w-4xl text-4xl font-semibold tracking-[-0.03em] sm:text-5xl">
            {headline.title}
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-orange-50/90 md:text-base">
            {headline.description}
          </p>
        </section>

        {params.error ? (
          <div className="mt-6 rounded-[20px] border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
            {params.error}
          </div>
        ) : null}

        <InternalChatRealtimeClient
          userId={user.id}
          initialRooms={rooms}
          initialMessages={messages}
          initialHasMore={initialPage.hasMore}
          initialOldestCreatedAt={initialPage.oldestCreatedAt}
          initialActiveRoomId={activeRoomId}
          availableUsers={users}
        />
      </div>
    </main>
  )
}
