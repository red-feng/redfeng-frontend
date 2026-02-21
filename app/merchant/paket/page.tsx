'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export default function PaketList() {
  const [tours, setTours] = useState<any[]>([])

  useEffect(() => {
    const fetchTours = async () => {
      const { data } = await supabase
        .from('tours')
        .select('*')
        .order('created_at', { ascending: false })

      setTours(data || [])
    }

    fetchTours()
  }, [])

  return (
    <div className="p-10">
      <h1 className="text-xl font-bold mb-4">Daftar Paket</h1>

      <Link
        href="/merchant/paket/tambah"
        className="bg-green-600 text-white px-4 py-2 rounded"
      >
        + Tambah Paket
      </Link>

      <div className="mt-6 space-y-4">
        {tours.map((tour) => (
          <div
            key={tour.id}
            className="border p-4 rounded shadow"
          >
            <h2 className="font-semibold">{tour.title}</h2>
            <p>Status: {tour.status}</p>
          </div>
        ))}
      </div>
    </div>
  )
}