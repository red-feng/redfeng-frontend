'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'

export default function TambahPaket() {
  const router = useRouter()

  const [title, setTitle] = useState('')
  const [priceAdult, setPriceAdult] = useState('')
  const [priceChild, setPriceChild] = useState('')

  const handleSubmit = async (e: any) => {
    e.preventDefault()

    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) return

    const { data: merchant } = await supabase
      .from('merchants')
      .select('id')
      .eq('user_id', userData.user.id)
      .single()

    await supabase.from('tours').insert({
      merchant_id: merchant?.id,
      title,
      price_adult: priceAdult,
      price_child: priceChild,
      status: 'draft',
    })

    router.push('/merchant/paket')
  }

  return (
    <div className="p-10">
      <h1 className="text-xl font-bold mb-6">Tambah Paket</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          placeholder="Nama Paket"
          className="border p-2 w-full"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <input
          placeholder="Harga Dewasa"
          className="border p-2 w-full"
          value={priceAdult}
          onChange={(e) => setPriceAdult(e.target.value)}
        />

        <input
          placeholder="Harga Anak"
          className="border p-2 w-full"
          value={priceChild}
          onChange={(e) => setPriceChild(e.target.value)}
        />

        <button className="bg-blue-600 text-white px-4 py-2 rounded">
          Simpan
        </button>
      </form>
    </div>
  )
}