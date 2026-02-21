'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export default function Dashboard() {
  const router = useRouter()
  const [merchant, setMerchant] = useState<any>(null)

  useEffect(() => {
    const checkUser = async () => {
      const { data } = await supabase.auth.getUser()

      if (!data.user) {
        router.push('/login')
        return
      }

      const { data: merchantData } = await supabase
        .from('merchants')
        .select('*')
        .eq('user_id', data.user.id)
        .single()

      setMerchant(merchantData)
    }

    checkUser()
  }, [router])

  if (!merchant) return <div>Loading...</div>

  return (
    <div className="p-10">
      <h1 className="text-2xl font-bold">
        Dashboard {merchant.brand_name}
      </h1>

      <Link
        href="/merchant/paket"
        className="bg-blue-600 text-white px-4 py-2 mt-4 inline-block rounded"
      >
        Kelola Paket
      </Link>
    </div>
  )
}