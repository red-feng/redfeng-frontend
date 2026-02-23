'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function BankingStep({
  merchantId,
  setStep
}: {
  merchantId: string
  setStep: (step: number) => void
}) {

  const supabase = createClient()

  const [form, setForm] = useState({
    bank_name: '',
    bank_account_number: '',
    bank_account_holder: '',
    bank_branch: ''
  })

  const [saving, setSaving] = useState(false)

  const handleChange = (e: any) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value
    })
  }

  const handleNext = async () => {
    if (!form.bank_name || !form.bank_account_number || !form.bank_account_holder) {
      alert('Data bank wajib diisi lengkap')
      return
    }

    setSaving(true)

    await supabase
      .from('merchants')
      .update({
        ...form,
        onboarding_step: 4
      })
      .eq('id', merchantId)

    setSaving(false)

    setStep(4) // 🔥 pindah ke Step 4 TANPA reload
  }

  return (
    <div className="space-y-4">

      <input
        name="bank_name"
        placeholder="Bank Name"
        className="w-full border p-2"
        onChange={handleChange}
      />

      <input
        name="bank_account_number"
        placeholder="Bank Account Number"
        className="w-full border p-2"
        onChange={handleChange}
      />

      <input
        name="bank_account_holder"
        placeholder="Account Holder Name"
        className="w-full border p-2"
        onChange={handleChange}
      />

      <input
        name="bank_branch"
        placeholder="Bank Branch (optional)"
        className="w-full border p-2"
        onChange={handleChange}
      />

      <button
        onClick={handleNext}
        disabled={saving}
        className="bg-black text-white px-6 py-2"
      >
        {saving ? 'Saving...' : 'Next'}
      </button>

    </div>
  )
}