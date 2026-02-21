'use client'

import { useEffect, useState } from 'react'
import { createClient } from '../../../lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function PaketList() {
  const [tours, setTours] = useState<any[]>([])
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const fetchTours = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login')
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (profile?.role !== 'merchant') {
        router.push('/')
        return
      }

      const { data } = await supabase
        .from('merchant_packages')
        .select('*')
        .eq('merchant_id', user.id)
        .order('created_at', { ascending: false })

      setTours(data || [])
    }

    fetchTours()
  }, [])

  return (
    <div className="p-10">
      <h1 className="text-xl font-bold mb-4">Daftar Paket</h1>

      <Link href="/merchant/paket/tambah">
        <button className="bg-black text-white px-4 py-2 rounded">
          Tambah Paket
        </button>
      </Link>

      {tours.map((tour) => (
        <div key={tour.id} className="border p-4 mt-4 rounded">
          <h2 className="font-semibold">{tour.name}</h2>
          <p>Rp {tour.price_adult}</p>
        </div>
      ))}
    </div>
  )
}