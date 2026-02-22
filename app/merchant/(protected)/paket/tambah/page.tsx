'use client'

import { useState } from 'react'
import { createClient } from '../../../../../lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function TambahPaket() {
  const router = useRouter()
  const supabase = createClient()

  const [title, setTitle] = useState('')
  const [priceAdult, setPriceAdult] = useState('')
  const [priceChild, setPriceChild] = useState('')

  const handleSubmit = async (e: any) => {
    e.preventDefault()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return

    const { data: merchant } = await supabase
      .from('merchants')
      .select('id')
      .eq('user_id', user.id)
      .single()

    await supabase.from('tours').insert({
      merchant_id: merchant?.id,
      title,
      price_adult: Number(priceAdult),
      price_child: Number(priceChild),
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