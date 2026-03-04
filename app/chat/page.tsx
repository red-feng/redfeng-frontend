import Link from "next/link"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { sendChatMessage } from "./actions"

type ChatRoomRow = {
  id: string
  package_id: string
  customer_id: string
  merchant_user_id: string
  updated_at: string | null
}

type ChatMessageRow = {
  id: string
  room_id: string
  sender_id: string
  message: string
  created_at: string | null
}

type PackageRow = {
  id: string
  title: string | null
  slug: string | null
  merchant_id: string | null
}

export const dynamic = "force-dynamic"

export default async function ChatPage({
  searchParams,
}: {
  searchParams: Promise<{ room_id?: string; package_id?: string; error?: string }>
}) {
  const params = await searchParams
  const roomId = params.room_id || ""
  const packageId = params.package_id || ""
  const errorMessage = params.error || ""

  const supabase = await createClient()
  const adminSupabase = createAdminClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const { data: merchantMe } = await adminSupabase
    .from("merchants")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle()
  const isMerchant = !!merchantMe

  let activeRoomId = roomId
  let activePackage: PackageRow | null = null

  if (!isMerchant && packageId) {
    const { data: pkg } = await adminSupabase
      .from("packages")
      .select("id, title, slug, merchant_id")
      .eq("id", packageId)
      .single()
    activePackage = (pkg as PackageRow | null) || null

    if (activePackage?.merchant_id) {
      const { data: merchantOwner } = await adminSupabase
        .from("merchants")
        .select("user_id")
        .eq("id", activePackage.merchant_id)
        .single()

      if (merchantOwner?.user_id) {
        const { data: existingRoom } = await adminSupabase
          .from("package_chat_rooms")
          .select("id")
          .eq("package_id", packageId)
          .eq("customer_id", user.id)
          .eq("merchant_user_id", merchantOwner.user_id)
          .maybeSingle()

        if (existingRoom?.id) {
          activeRoomId = existingRoom.id
        } else {
          const { data: newRoom, error: createRoomError } = await adminSupabase
            .from("package_chat_rooms")
            .insert({
              package_id: packageId,
              customer_id: user.id,
              merchant_user_id: merchantOwner.user_id,
            })
            .select("id")
            .single()

          if (createRoomError) {
            const msg = createRoomError.message.includes("does not exist")
              ? "Tabel chat belum tersedia. Jalankan migration chat terlebih dulu."
              : `Gagal membuat ruang chat: ${createRoomError.message}`
            return (
              <main className="mx-auto max-w-3xl p-6">
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                  {msg}
                </div>
              </main>
            )
          }

          activeRoomId = newRoom.id
        }
      }
    }
  }

  const roomQuery = adminSupabase
    .from("package_chat_rooms")
    .select("id, package_id, customer_id, merchant_user_id, updated_at")
    .order("updated_at", { ascending: false })

  const { data: roomsData, error: roomsError } = isMerchant
    ? await roomQuery.eq("merchant_user_id", user.id)
    : await roomQuery.eq("customer_id", user.id)

  if (roomsError) {
    const msg = roomsError.message.includes("does not exist")
      ? "Tabel chat belum tersedia. Jalankan migration chat terlebih dulu."
      : `Gagal memuat ruang chat: ${roomsError.message}`
    return (
      <main className="mx-auto max-w-3xl p-6">
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {msg}
        </div>
      </main>
    )
  }

  const rooms = (roomsData as ChatRoomRow[] | null) || []

  if (!activeRoomId && rooms.length > 0) {
    activeRoomId = rooms[0].id
  }

  const activeRoom = rooms.find((room) => room.id === activeRoomId) || null

  const packageIds = [...new Set(rooms.map((room) => room.package_id))]
  const { data: packageRows } = packageIds.length
    ? await adminSupabase
        .from("packages")
        .select("id, title, slug, merchant_id")
        .in("id", packageIds)
    : { data: [] as PackageRow[] }
  const packageMap = new Map((packageRows || []).map((p: PackageRow) => [p.id, p]))

  const { data: messagesData, error: messagesError } = activeRoomId
    ? await adminSupabase
        .from("package_chat_messages")
        .select("id, room_id, sender_id, message, created_at")
        .eq("room_id", activeRoomId)
        .order("created_at", { ascending: true })
    : { data: [], error: null }

  if (messagesError) {
    const msg = messagesError.message.includes("does not exist")
      ? "Tabel chat belum tersedia. Jalankan migration chat terlebih dulu."
      : `Gagal memuat pesan: ${messagesError.message}`
    return (
      <main className="mx-auto max-w-3xl p-6">
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {msg}
        </div>
      </main>
    )
  }

  const messages = (messagesData as ChatMessageRow[] | null) || []
  const activePackageForRoom = activeRoom ? packageMap.get(activeRoom.package_id) : null

  return (
    <main className="min-h-screen bg-slate-100">
      <div className="mx-auto max-w-6xl px-4 py-6 md:px-6 md:py-8">
        <h1 className="text-2xl font-semibold text-slate-900">Chat</h1>
        <p className="mt-1 text-sm text-slate-600">
          {isMerchant ? "Inbox merchant" : "Chat dengan merchant paket"}
        </p>

        {errorMessage && (
          <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
            {errorMessage}
          </div>
        )}

        <div className="mt-6 grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">Ruang Chat</h2>
            <div className="mt-3 space-y-2">
              {rooms.length === 0 && (
                <p className="text-sm text-slate-500">Belum ada chat.</p>
              )}
              {rooms.map((room) => {
                const pkg = packageMap.get(room.package_id)
                return (
                  <Link
                    key={room.id}
                    href={`/chat?room_id=${room.id}`}
                    className={`block rounded-lg border px-3 py-2 text-sm transition ${
                      room.id === activeRoomId
                        ? "border-orange-300 bg-orange-50 text-orange-700"
                        : "border-slate-200 text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <p className="line-clamp-2 font-medium">{pkg?.title || "Paket"}</p>
                    <p className="mt-1 text-xs text-slate-500">{room.updated_at || "-"}</p>
                  </Link>
                )
              })}
            </div>
          </aside>

          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-5 py-4">
              <p className="text-sm text-slate-500">Paket</p>
              <p className="text-base font-semibold text-slate-900">
                {activePackageForRoom?.title || activePackage?.title || "Pilih ruang chat"}
              </p>
              {(activePackageForRoom?.slug || activePackage?.slug) && (
                <Link
                  href={`/packages/${encodeURIComponent(activePackageForRoom?.slug || activePackage?.slug || "")}`}
                  className="mt-1 inline-block text-xs text-orange-600 hover:text-orange-700"
                >
                  Lihat detail paket
                </Link>
              )}
            </div>

            <div className="h-[52vh] space-y-3 overflow-y-auto px-5 py-4">
              {messages.length === 0 && (
                <p className="text-sm text-slate-500">Belum ada pesan. Mulai percakapan sekarang.</p>
              )}
              {messages.map((message) => {
                const mine = message.sender_id === user.id
                return (
                  <div key={message.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${
                        mine
                          ? "bg-orange-500 text-white"
                          : "border border-slate-200 bg-slate-50 text-slate-700"
                      }`}
                    >
                      <p className="whitespace-pre-line">{message.message}</p>
                      <p className={`mt-1 text-[11px] ${mine ? "text-orange-100" : "text-slate-400"}`}>
                        {message.created_at || ""}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>

            <form action={sendChatMessage} className="border-t border-slate-200 p-4">
              <input type="hidden" name="room_id" value={activeRoomId} />
              <div className="flex gap-2">
                <textarea
                  name="message"
                  required
                  placeholder="Tulis pesan..."
                  className="h-20 flex-1 rounded-xl border border-slate-300 p-3 text-sm outline-none ring-orange-500 focus:ring-2"
                />
                <button
                  type="submit"
                  disabled={!activeRoomId}
                  className="self-end rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  Kirim
                </button>
              </div>
            </form>
          </section>
        </div>
      </div>
    </main>
  )
}
