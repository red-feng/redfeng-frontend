'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import CompanyStep from './steps/CompanyStep'
import LegalStep from './steps/LegalStep'
import BankingStep from './steps/BankingStep'
import DocumentsStep from './steps/DocumentsStep'

const stepItems = [
  {
    number: '01',
    title: 'Company Profile',
    description: 'Informasi brand, badan usaha, dan alamat operasional merchant.',
  },
  {
    number: '02',
    title: 'Legal Identity',
    description: 'Data PIC, identitas utama, dan nomor legalitas perusahaan.',
  },
  {
    number: '03',
    title: 'Banking Details',
    description: 'Rekening payout untuk pencairan dana setelah verifikasi.',
  },
  {
    number: '04',
    title: 'Documents Upload',
    description: 'KTP, NPWP, NIB, dan identitas visual brand untuk review admin.',
  },
]

const trustNotes = [
  'Review merchant terhubung ke dashboard admin.',
  'Status akan berubah ke pending hanya setelah dokumen lengkap.',
  'Data payout dan legalitas disimpan terpisah per tahap onboarding.',
]

export default function OnboardingPage() {
  const router = useRouter()

  const [merchantId, setMerchantId] = useState<string | null>(null)
  const [step, setStep] = useState<number>(1)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const initDraft = async () => {
      const supabase = createClient()

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
        if (existing.onboarding_completed) {
          router.replace('/merchant/dashboard')
          return
        }

        setMerchantId(existing.id)
        setStep(existing.onboarding_step || 1)
        setLoading(false)
        return
      }

      const { data: newMerchant } = await supabase
        .from('merchants')
        .insert({
          user_id: user.id,
          email: user.email ?? null,
          verification_status: 'draft',
          onboarding_step: 1,
          onboarding_completed: false
        })
        .select()
        .single()

      setMerchantId(newMerchant?.id ?? null)
      setStep(1)
      setLoading(false)
    }

    initDraft()
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f7f3ed] px-4 py-10">
        <div className="mx-auto max-w-6xl animate-pulse rounded-[36px] border border-white/70 bg-white p-8 shadow-[0_20px_80px_rgba(95,45,12,0.08)]">
          <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="space-y-4">
              <div className="h-8 w-40 rounded-full bg-orange-100" />
              <div className="h-16 w-full rounded-3xl bg-orange-50" />
              <div className="h-24 w-full rounded-3xl bg-orange-50" />
            </div>
            <div className="h-[420px] rounded-[32px] bg-slate-100" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#f6f2eb] px-4 py-8 md:px-6 md:py-10">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(251,146,60,0.18),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(194,65,12,0.12),_transparent_24%),linear-gradient(180deg,#fbf7f1_0%,#f4efe8_100%)]" />
      <div className="absolute left-[-6rem] top-16 h-64 w-64 rounded-full bg-orange-200/30 blur-3xl" />
      <div className="absolute bottom-0 right-[-5rem] h-72 w-72 rounded-full bg-amber-100/80 blur-3xl" />

      <div className="relative mx-auto max-w-6xl overflow-hidden rounded-[36px] border border-white/70 bg-white shadow-[0_28px_120px_rgba(95,45,12,0.12)]">
        <div className="grid gap-0 lg:grid-cols-[0.88fr_1.12fr]">
          <section className="relative overflow-hidden bg-[linear-gradient(160deg,#a84316_0%,#d86118_32%,#ef7f1a_58%,#f6b14f_100%)] px-6 py-8 text-white md:px-8 md:py-10">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.16),_transparent_26%),radial-gradient(circle_at_bottom_left,_rgba(124,45,18,0.32),_transparent_30%)]" />
            <div className="relative">
              <div className="inline-flex rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-orange-50/90">
                Merchant Onboarding
              </div>
              <h1 className="mt-5 max-w-md text-3xl font-semibold leading-tight md:text-5xl">
                Join Red Feng with a merchant workflow that feels enterprise-ready.
              </h1>
              <p className="mt-5 max-w-xl text-sm leading-7 text-orange-50/88 md:text-base">
                Lengkapi profil bisnis, legalitas, rekening payout, dan dokumen pendukung.
                Setelah tahap final selesai, pengajuan langsung masuk ke dashboard admin untuk verifikasi.
              </p>

              <div className="mt-8 space-y-3">
                {stepItems.map((item, index) => {
                  const isActive = step === index + 1
                  const isCompleted = step > index + 1

                  return (
                    <div
                      key={item.number}
                      className={`rounded-[24px] border px-4 py-4 backdrop-blur transition ${
                        isActive
                          ? 'border-white/30 bg-white/16 shadow-[0_18px_40px_rgba(124,45,18,0.18)]'
                          : isCompleted
                            ? 'border-white/18 bg-white/10'
                            : 'border-white/10 bg-black/10'
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-white/90 text-sm font-semibold text-orange-700">
                          {isCompleted ? 'OK' : item.number}
                        </div>
                        <div>
                          <h2 className="text-base font-semibold text-white">{item.title}</h2>
                          <p className="mt-1 text-sm leading-6 text-orange-50/82">{item.description}</p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="mt-8 rounded-[28px] border border-white/18 bg-white/10 p-5 backdrop-blur">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-orange-50/75">
                  Why this flow matters
                </p>
                <div className="mt-4 grid gap-3">
                  {trustNotes.map((item) => (
                    <div
                      key={item}
                      className="flex items-center gap-3 rounded-2xl border border-white/12 bg-white/8 px-4 py-3 text-sm text-orange-50/90"
                    >
                      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/90 text-xs font-bold text-orange-700">
                        +
                      </span>
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className="bg-[linear-gradient(180deg,#fffdfa_0%,#fff7ef_100%)] px-5 py-8 md:px-8 md:py-10">
            <div className="mx-auto max-w-2xl rounded-[32px] border border-[#f1e4d5] bg-white p-6 shadow-[0_22px_60px_rgba(95,45,12,0.08)] md:p-8">
              <div className="flex flex-col gap-4 border-b border-slate-100 pb-6 md:flex-row md:items-end md:justify-between">
                <div>
                  <div className="inline-flex rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.26em] text-orange-700">
                    Step {step} of 4
                  </div>
                  <h2 className="mt-4 text-3xl font-semibold text-slate-950">
                    {stepItems[step - 1]?.title}
                  </h2>
                  <p className="mt-2 text-sm leading-7 text-slate-600">
                    {stepItems[step - 1]?.description}
                  </p>
                </div>
                <div className="rounded-2xl border border-orange-100 bg-[#fff9f2] px-4 py-3 text-sm text-slate-600">
                  Status review akan masuk ke admin setelah semua tahap selesai.
                </div>
              </div>

              <div className="pt-6">
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
                  <DocumentsStep merchantId={merchantId} setStep={setStep} />
                )}
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  )
}
