import { redirect } from "next/navigation"
import MerchantSupportInboxClient from "./MerchantSupportInboxClient"
import {
  getAdminMerchantSupportAccessProfile,
  loadMerchantSupportMessages,
  loadMerchantSupportRoomsForAdmin,
  markMerchantSupportRoomReadByAdmin,
} from "@/lib/merchant-support/index"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

type MerchantSupportPortal = "admin" | "superadmin"

export default async function AdminMerchantSupportPage({
  searchParams,
  portal = "admin",
}: {
  searchParams: Promise<{ room_id?: string }>
  portal?: MerchantSupportPortal
}) {
  const params = await searchParams
  const supabase = await createClient(portal)
  const adminSupabase = createAdminClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/${portal}/login?error=no-session`)
  }

  const profile = await getAdminMerchantSupportAccessProfile(adminSupabase, user.id)
  if (!profile) {
    redirect(`/${portal}/login?error=wrong-role`)
  }

  const rooms = await loadMerchantSupportRoomsForAdmin(adminSupabase)
  const requestedRoomId = String(params.room_id || "").trim()
  const activeRoomId = requestedRoomId || rooms[0]?.id || ""

  if (activeRoomId) {
    await markMerchantSupportRoomReadByAdmin(adminSupabase, activeRoomId)
  }

  const initialMessages = activeRoomId ? await loadMerchantSupportMessages(adminSupabase, activeRoomId) : []
  const patchedRooms = rooms.map((room) =>
    room.id === activeRoomId ? { ...room, adminLastReadAt: new Date().toISOString() } : room,
  )

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fff8f1_0%,#f6efe5_100%)] px-6 py-8 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <section className="rounded-[32px] border border-orange-200/70 bg-[linear-gradient(135deg,#7c2d12_0%,#c2410c_38%,#f97316_72%,#fdba74_100%)] px-8 py-10 text-white shadow-[0_26px_90px_rgba(146,64,14,0.2)]">
          <p className="inline-flex rounded-full border border-white/25 bg-white/10 px-4 py-1 text-[10px] font-semibold uppercase tracking-[0.3em] text-orange-50">
            Merchant Support Inbox
          </p>
          <h1 className="mt-5 max-w-4xl text-4xl font-semibold tracking-[-0.03em] sm:text-5xl">
            Semua permintaan bantuan merchant masuk ke satu inbox admin.
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-orange-50/90 md:text-base">
            Gunakan workspace ini untuk membalas kendala verifikasi, paket, booking, dan payout tanpa keluar dari portal admin.
          </p>
        </section>

        <div className="min-h-0">
          <MerchantSupportInboxClient
            portal={portal}
            initialRooms={patchedRooms}
            initialMessages={initialMessages}
            initialActiveRoomId={activeRoomId}
          />
        </div>
      </div>
    </main>
  )
}
