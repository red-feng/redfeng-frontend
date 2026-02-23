'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import CompanyStep from './steps/CompanyStep'
import LegalStep from './steps/LegalStep'
import BankingStep from './steps/BankingStep'
import DocumentsStep from './steps/DocumentsStep'

export default function OnboardingPage() {
  const supabase = createClient()
  const router = useRouter()

  const [merchantId, setMerchantId] = useState<string | null>(null)
  const [step, setStep] = useState<number>(1)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const initDraft = async () => {
      const {
        data: { user }
      } = await supabase.auth.getUser()

      if (!user) return

      const { data: existing } = await supabase
        .from('merchants')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (existing) {

  // 🔒 kalau sudah selesai onboarding, langsung ke dashboard
  if (existing.onboarding_completed) {
    router.replace('/merchant/dashboard')
    return
  }

  setMerchantId(existing.id)
  setStep(existing.onboarding_step || 1)
  setLoading(false)
  return
}

      
      // create draft
      const { data: newMerchant } = await supabase
        .from('merchants')
        .insert({
          user_id: user.id,
          verification_status: 'draft',
          onboarding_step: 1
        })
        .select()
        .single()

      setMerchantId(newMerchant?.id ?? null)
      setStep(1)
      setLoading(false)
    }

    initDraft()
  }, [])

  if (loading) return <div className="p-10">Loading...</div>

  return (
    <div className="max-w-2xl mx-auto p-10">
      <h1 className="text-2xl font-bold mb-6">
        Merchant Onboarding - Step {step}
      </h1>

      {merchantId && step === 1 && (
  <CompanyStep merchantId={merchantId} setStep={setStep} />
)}

{merchantId && step === 2 && (
  <LegalStep merchantId={merchantId} setStep={setStep} />
)}

{merchantId && step === 3 && (
  <BankingStep merchantId={merchantId} setStep={setStep} />
)}

{merchantId && step === 4 && (
  <DocumentsStep merchantId={merchantId} />
)}
    </div>
  )
}