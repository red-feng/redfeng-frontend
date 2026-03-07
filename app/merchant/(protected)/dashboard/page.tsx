'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '../../../../lib/supabase/client'

type Merchant = {
  brand_name: string
  verification_status: string
  onboarding_completed: boolean
}

const merchantMenus = [
  { label: 'Kelola Paket', href: '/merchant/paket', available: true },
  { label: 'Pesanan', href: '/merchant/pesanan', available: true },
  { label: 'Chat Customer', href: '/merchant/chat', available: true },
  { label: 'Kalender Booking', href: '/merchant/kalender-booking', available: true },
  { label: 'Statistik', href: '', available: false },
  { label: 'Saldo & Payout', href: '', available: false },
  { label: 'Review', href: '', available: false },
  { label: 'Profil Merchant', href: '', available: false },
  { label: 'Support', href: '', available: false },
]

export default function Dashboard() {
  const router = useRouter()
  const [merchant, setMerchant] = useState<Merchant | null>(null)
  const [loading, setLoading] = useState(true)
  const [unreadChatCount, setUnreadChatCount] = useState(0)

  useEffect(() => {
    const checkAccess = async () => {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.replace('/login')
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (!profile || profile.role !== 'merchant') {
        router.replace('/')
        return
      }

      const { data: merchantData } = await supabase
        .from('merchants')
        .select('brand_name, verification_status, onboarding_completed')
        .eq('user_id', user.id)
        .single()

      if (!merchantData) {
        router.replace('/merchant/pending')
        return
      }

      if (merchantData.verification_status !== 'approved') {
        router.replace('/merchant/pending')
        return
      }

      if (!merchantData.onboarding_completed) {
        router.replace('/merchant/onboarding')
        return
      }

      const { data: chatRooms, error: chatRoomsError } = await supabase
        .from('package_chat_rooms')
        .select('last_message_at, last_message_sender_id, merchant_last_read_at')
        .eq('merchant_user_id', user.id)

      const unreadCount = chatRoomsError
        ? 0
        : (chatRooms || []).filter((room) => {
            if (!room.last_message_sender_id || room.last_message_sender_id === user.id) return false
            if (!room.last_message_at) return false
            if (!room.merchant_last_read_at) return true
            return room.last_message_at > room.merchant_last_read_at
          }).length

      setMerchant(merchantData)
      setUnreadChatCount(unreadCount)
      setLoading(false)
    }

    void checkAccess()
  }, [router])

  if (loading) return <div>Checking access...</div>

  if (!merchant) {
    return <div className="min-h-screen bg-gray-50 p-10">Merchant belum terdaftar</div>
  }

  return (
    <div className="p-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Welcome, {merchant.brand_name}</h1>
        <p className="text-gray-500">Manage your travel packages and bookings</p>
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border bg-white p-4">
          <p className="text-sm text-gray-500">Total Paket</p>
          <p className="text-2xl font-bold">12</p>
        </div>
        <div className="rounded-xl border bg-white p-4">
          <p className="text-sm text-gray-500">Total Booking</p>
          <p className="text-2xl font-bold">58</p>
        </div>
        <div className="rounded-xl border bg-white p-4">
          <p className="text-sm text-gray-500">Revenue Bulan Ini</p>
          <p className="text-2xl font-bold">Rp 24.5M</p>
        </div>
        <div className="rounded-xl border bg-white p-4">
          <p className="text-sm text-gray-500">Rating</p>
          <p className="text-2xl font-bold">4.8</p>
        </div>
      </div>

      <h2 className="mb-4 text-lg font-semibold">Merchant Tools</h2>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {merchantMenus.map((menu) =>
          menu.available ? (
            <Link
              key={menu.label}
              href={menu.href}
              className="rounded-xl border bg-white p-5 shadow-sm transition hover:shadow-md"
            >
              <div className="flex items-center justify-between gap-3">
                <span>{menu.label}</span>
                {menu.label === 'Chat Customer' && unreadChatCount > 0 && (
                  <span className="rounded-full bg-rose-500 px-2 py-0.5 text-xs font-semibold text-white">
                    {unreadChatCount}
                  </span>
                )}
              </div>
            </Link>
          ) : (
            <div
              key={menu.label}
              className="rounded-md border border-gray-300 bg-white px-4 py-3 text-gray-500"
            >
              <p className="font-medium">{menu.label}</p>
              <p className="text-sm">Segera hadir</p>
            </div>
          ),
        )}
      </div>
    </div>
  )
}
