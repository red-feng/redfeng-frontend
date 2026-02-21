'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import Link from 'next/link'

export default function Dashboard() {
  const [merchant, setMerchant] = useState<any>(null)

  useEffect(() => {
    const getMerchant = async () => {
      const { data: userData } = await supabase.auth.getUser()

      if (!userData.user) return

      const { data } = await supabase
        .from('merchants')
        .select('*')
        .eq('user_id', userData.user.id)
        .single()

      setMerchant(data)
    }

    getMerchant()
  }, [])

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