import { redirect } from "next/navigation"
import MerchantSupportInboxClient from "./MerchantSupportInboxClient"
import {
  getAdminMerchantSupportAccessProfile,
  getMerchantSupportUnreadCountForAdmin,
  loadMerchantSupportMessagesPage,
  MERCHANT_SUPPORT_PAGE_SIZE,
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

  const initialPage = activeRoomId
    ? await loadMerchantSupportMessagesPage(adminSupabase, activeRoomId, {
        limit: MERCHANT_SUPPORT_PAGE_SIZE,
      })
    : { messages: [], hasMore: false, oldestCreatedAt: null as string | null }
  const patchedRooms = rooms.map((room) =>
    room.id === activeRoomId ? { ...room, adminLastReadAt: new Date().toISOString() } : room,
  )
  const openRoomsCount = rooms.length
  const unreadRoomsCount = getMerchantSupportUnreadCountForAdmin(rooms)
  const activeMessagesCount = initialPage.messages.length

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fff8f1_0%,#f6efe5_100%)] px-6 py-8 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="overflow-hidden rounded-[28px] border border-orange-200/60 bg-[linear-gradient(135deg,#7c2d12_0%,#c2410c_38%,#f97316_72%,#fdba74_100%)] px-5 py-6 text-white shadow-[0_30px_100px_rgba(146,64,14,0.18)] sm:rounded-[32px] sm:px-8 sm:py-8 lg:px-10">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.18fr)_340px]">
            <div className="max-w-4xl">
              <p className="inline-flex rounded-full border border-white/25 bg-white/10 px-4 py-1 text-[10px] font-semibold uppercase tracking-[0.3em] text-orange-50">
                Merchant Support Inbox
              </p>
              <h1 className="mt-5 text-4xl font-semibold tracking-[-0.03em] sm:text-5xl">
                Semua permintaan bantuan merchant masuk ke satu inbox operations.
              </h1>
              <p className="mt-4 max-w-3xl text-base leading-8 text-orange-50/90">
                Workspace ini menjadi pusat baca room support merchant, balas cepat, dan tindak lanjut operasional tanpa perlu berpindah ke banyak halaman.
              </p>
            </div>

            <div className="rounded-[24px] border border-white/20 bg-white/10 px-4 py-4 backdrop-blur sm:px-5 sm:py-5">
              <p className="text-[11px] uppercase tracking-[0.28em] text-orange-100/80">Support pulse</p>
              <div className="mt-5 grid gap-4">
                <div>
                  <p className="text-sm text-orange-50/80">Room aktif</p>
                  <p className="mt-1 text-3xl font-semibold text-white">{openRoomsCount}</p>
                </div>
                <div>
                  <p className="text-sm text-orange-50/80">Room belum dibaca</p>
                  <p className="mt-1 text-3xl font-semibold text-white">{unreadRoomsCount}</p>
                </div>
                <div>
                  <p className="text-sm text-orange-50/80">Pesan room aktif</p>
                  <p className="mt-1 text-3xl font-semibold text-white">{activeMessagesCount}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-3 sm:grid-cols-3 sm:gap-4">
          <div className="rounded-[22px] border border-[#f0ddc7] bg-white px-4 py-4 shadow-[0_18px_44px_rgba(15,23,42,0.06)] sm:rounded-[26px] sm:px-5 sm:py-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-orange-500">Respons cepat</p>
            <p className="mt-3 text-lg font-semibold tracking-[-0.03em] text-slate-950">Inbox tunggal</p>
            <p className="mt-2 text-xs leading-6 text-slate-500">Semua room merchant dibaca dari satu tempat agar tim operations tidak kehilangan konteks.</p>
          </div>
          <div className="rounded-[22px] border border-[#f0ddc7] bg-white px-4 py-4 shadow-[0_18px_44px_rgba(15,23,42,0.06)] sm:rounded-[26px] sm:px-5 sm:py-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-orange-500">Jalur kerja</p>
            <p className="mt-3 text-lg font-semibold tracking-[-0.03em] text-slate-950">Baca, balas, tindak lanjuti</p>
            <p className="mt-2 text-xs leading-6 text-slate-500">Room yang dipilih langsung ditandai terbaca agar antrian support tetap bersih dan terukur.</p>
          </div>
          <div className="rounded-[22px] border border-[#f0ddc7] bg-white px-4 py-4 shadow-[0_18px_44px_rgba(15,23,42,0.06)] sm:rounded-[26px] sm:px-5 sm:py-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-orange-500">Arah eskalasi</p>
            <p className="mt-3 text-lg font-semibold tracking-[-0.03em] text-slate-950">Eskalasi bila perlu</p>
            <p className="mt-2 text-xs leading-6 text-slate-500">Gunakan inbox ini untuk memilah isu yang cukup ditangani admin dan yang perlu naik ke manager.</p>
          </div>
        </section>

        <div className="min-h-0 rounded-[24px] border border-[#f3dbc3] bg-white/70 p-3 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur-sm sm:rounded-[32px] sm:p-4">
          <MerchantSupportInboxClient
            portal={portal}
            initialRooms={patchedRooms}
            initialMessages={initialPage.messages}
            initialHasMore={initialPage.hasMore}
            initialOldestCreatedAt={initialPage.oldestCreatedAt}
            initialActiveRoomId={activeRoomId}
          />
        </div>
      </div>
    </main>
  )
}
