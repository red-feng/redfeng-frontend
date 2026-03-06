'use client'

import { useEffect, useState } from 'react'
import { createClient } from '../../../../lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

type Tour = {
  id: string
  name: string
  price_adult: number
}

const packageMenus = [
  { label: 'Tambah Paket', href: '/merchant/paket/tambah', available: true },
  { label: 'Edit Paket', href: '', available: false },
  { label: 'Draft Paket', href: '', available: false },
  { label: 'Paket Aktif', href: '', available: false },
  { label: 'Paket Nonaktif', href: '', available: false },
  { label: 'Paket Pending Review', href: '', available: false },
  { label: 'Paket Ditolak', href: '', available: false },
  { label: 'Duplicate Paket', href: '', available: false },
]

export default function PaketList() {
  const [tours, setTours] = useState<Tour[]>([])
  const router = useRouter()

  useEffect(() => {
    const fetchTours = async () => {
      const supabase = createClient()
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
  }, [router])

  return (
    <div className="p-10">
      <h1 className="text-xl font-bold mb-4">Daftar Paket</h1>

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {packageMenus.map((menu) =>
          menu.available ? (
            <Link
              key={menu.label}
              href={menu.href}
              className="rounded-md bg-black px-4 py-3 text-white"
            >
              {menu.label}
            </Link>
          ) : (
            <div
              key={menu.label}
              className="rounded-md border border-gray-300 bg-white px-4 py-3 text-gray-600"
            >
              <p className="font-medium">{menu.label}</p>
              <p className="text-sm">Segera hadir</p>
            </div>
          ),
        )}
      </div>

      {tours.map((tour) => (
        <div key={tour.id} className="border p-4 mt-4 rounded">
          <h2 className="font-semibold">{tour.name}</h2>
          <p>Rp {tour.price_adult}</p>
        </div>
      ))}
    </div>
  )
}
