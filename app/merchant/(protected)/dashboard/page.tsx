'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '../../../../lib/supabase/client'
import Link from 'next/link'

export default function Dashboard() {
  const router = useRouter()
  const supabase = createClient()

  const [merchant, setMerchant] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkAccess = async () => {
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

      setMerchant(merchantData)
      setLoading(false)
    }

    checkAccess()
  }, [router, supabase])

  if (loading) return <div>Checking access...</div>

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