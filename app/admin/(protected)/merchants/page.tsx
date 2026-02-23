'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function AdminMerchantsPage() {
  const supabase = createClient()

  const [merchants, setMerchants] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchMerchants = async () => {
      const { data } = await supabase
        .from('merchants')
        .select('*')
        .eq('verification_status', 'pending')
        .order('created_at', { ascending: false })

      setMerchants(data || [])
      setLoading(false)
    }

    fetchMerchants()
  }, [])

  if (loading) return <div className="p-10">Loading...</div>

  return (
    <div className="p-10">
      <h1 className="text-2xl font-bold mb-6">
        Pending Merchant Approvals
      </h1>

      {merchants.length === 0 && (
        <p>Tidak ada merchant pending.</p>
      )}

      {merchants.map((merchant) => (
        <MerchantCard key={merchant.id} merchant={merchant} />
      ))}
    </div>
  )
}

function MerchantCard({ merchant }: { merchant: any }) {
  const supabase = createClient()

  const handleApprove = async () => {
    await supabase
      .from('merchants')
      .update({ verification_status: 'approved' })
      .eq('id', merchant.id)

    // kirim email approved
    await fetch('/api/send-merchant-approved', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: merchant.email,
        brandName: merchant.brand_name
      })
    })

    alert('Merchant approved!')
    window.location.reload()
  }

  return (
    <div className="border p-4 mb-4 rounded">
      <h2 className="font-bold text-lg">{merchant.brand_name}</h2>
      <p>Email: {merchant.email}</p>
      <p>Company: {merchant.company_name}</p>

      <button
        onClick={handleApprove}
        className="bg-green-600 text-white px-4 py-2 mt-3"
      >
        Approve
      </button>
    </div>
  )
}