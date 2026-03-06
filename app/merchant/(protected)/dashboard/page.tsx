'use client'

console.log("DASHBOARD VERSION 2")


import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '../../../../lib/supabase/client'
import Link from 'next/link'

type Merchant = {
  brand_name: string
  verification_status: string
  onboarding_completed: boolean
}

const merchantMenus = [
  { label: 'Kelola Paket', href: '/merchant/paket', available: true },
  { label: 'Pesanan', href: '/merchant/pesanan', available: true },
  { label: 'Chat Customer', href: '', available: false },
  { label: 'Kalender Booking', href: '', available: false },
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

      const { data: merchantData, error } = await supabase
        .from('merchants')
        .select('*')
        .eq('user_id', user.id)
        .single()

      console.log("USER ID:", user.id)
      console.log("MERCHANT DATA:", merchantData)
      console.log("ERROR:", error)

      if (!merchantData) {
  router.replace('/merchant/pending')
  return
}

// BELUM DIAPPROVE ADMIN
if (merchantData.verification_status !== 'approved') {
  router.replace('/merchant/pending')
  return
}

// SUDAH APPROVE TAPI BELUM SELESAI ONBOARDING
if (!merchantData.onboarding_completed) {
  router.replace('/merchant/onboarding')
  return
}

      setMerchant(merchantData)
      setLoading(false)
    }

    checkAccess()
  }, [router])

  if (loading) return <div>Checking access...</div>

  return (
    <div className="p-10">
      <h1 className="text-2xl font-bold">
        Dashboard Marchant {merchant.brand_name}
      </h1>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {merchantMenus.map((menu) =>
          menu.available ? (
            <Link
              key={menu.label}
              href={menu.href}
              className="rounded-md bg-blue-600 px-4 py-3 font-medium text-white transition hover:bg-blue-700"
            >
              {menu.label}
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
