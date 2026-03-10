'use client'

import Link from "next/link"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowRight, Building2, CircleCheck, ShieldCheck, Store } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

const highlights = [
  {
    title: "Merchant dashboard terverifikasi",
    description: "Kelola inventori, harga, dokumen, dan status verifikasi dari satu workspace.",
    icon: Building2,
  },
  {
    title: "Onboarding bertahap",
    description: "Ikuti alur singkat dan terstruktur sebelum data masuk ke tim admin review.",
    icon: Store,
  },
  {
    title: "Review admin lebih rapi",
    description: "Setelah onboarding selesai, merchant langsung masuk ke antrian approval internal.",
    icon: ShieldCheck,
  },
]

const checkpoints = [
  "Akun merchant dibuat lebih dulu",
  "Lengkapi identitas bisnis dan legal",
  "Upload dokumen untuk masuk review admin",
]

export default function MerchantRegister() {
  const supabase = createClient()
  const router = useRouter()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState("")

  const handleRegister = async () => {
    setLoading(true)
    setErrorMsg("")

    const normalizedEmail = email.trim().toLowerCase()
    if (!normalizedEmail || !password) {
      setErrorMsg("Email dan password wajib diisi.")
      setLoading(false)
      return
    }

    const { data, error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
    })

    if (error) {
      setErrorMsg(error.message)
      setLoading(false)
      return
    }

    const user = data.user
    if (!user) {
      setErrorMsg("User merchant gagal dibuat. Coba ulangi.")
      setLoading(false)
      return
    }

    const { error: profileError } = await supabase.from("profiles").upsert({
      id: user.id,
      role: "merchant",
    })

    if (profileError) {
      setErrorMsg(profileError.message)
      setLoading(false)
      return
    }

    const { error: merchantError } = await supabase.from("merchants").upsert(
      {
        user_id: user.id,
        email: normalizedEmail,
        verification_status: "draft",
        onboarding_step: 1,
        onboarding_completed: false,
      },
      { onConflict: "user_id" },
    )

    if (merchantError) {
      setErrorMsg(merchantError.message)
      setLoading(false)
      return
    }

    router.push("/merchant/onboarding")
    setLoading(false)
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fff7f0_0%,#f7f2ea_35%,#f3efe8_100%)] px-4 py-10 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto grid min-h-[calc(100vh-5rem)] w-full max-w-7xl overflow-hidden rounded-[36px] border border-orange-200/60 bg-white shadow-[0_36px_120px_rgba(146,64,14,0.16)] lg:grid-cols-[1.08fr_0.92fr]">
        <section className="relative overflow-hidden bg-[linear-gradient(145deg,#7c2d12_0%,#c2410c_36%,#f97316_72%,#fdba74_100%)] px-8 py-10 text-white sm:px-10 lg:px-12 lg:py-14">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.22),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.12),transparent_30%)]" />
          <div className="absolute -left-24 top-16 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute bottom-10 right-0 h-72 w-72 rounded-full bg-amber-200/15 blur-3xl" />

          <div className="relative flex h-full flex-col">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.38em] text-orange-100/90">
                  Red Feng Merchant
                </p>
                <h1 className="mt-3 max-w-lg text-4xl font-semibold leading-tight sm:text-5xl">
                  Join The Digital Travel Ecosystem dengan onboarding yang lebih rapi.
                </h1>
              </div>
              <div className="hidden rounded-[24px] border border-white/20 bg-white/10 px-5 py-4 backdrop-blur md:block">
                <p className="text-[11px] uppercase tracking-[0.28em] text-orange-100/80">
                  Merchant Access
                </p>
                <p className="mt-2 text-sm font-medium text-white/90">
                  Professional setup for travel partners
                </p>
              </div>
            </div>

            <p className="relative mt-8 max-w-2xl text-base leading-8 text-orange-50/92 sm:text-lg">
              Buat akun merchant untuk melanjutkan onboarding bisnis, pengisian data legal, dokumen,
              dan review admin dalam satu alur yang lebih profesional.
            </p>

            <div className="relative mt-10 grid gap-4 xl:grid-cols-3">
              {highlights.map((item) => {
                const Icon = item.icon
                return (
                  <article
                    key={item.title}
                    className="rounded-[28px] border border-white/20 bg-white/10 p-5 backdrop-blur"
                  >
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/16">
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                    <h2 className="mt-4 text-lg font-semibold text-white">{item.title}</h2>
                    <p className="mt-2 text-sm leading-7 text-orange-50/86">{item.description}</p>
                  </article>
                )
              })}
            </div>

            <div className="relative mt-auto pt-10">
              <div className="rounded-[30px] border border-white/18 bg-slate-950/16 p-6 backdrop-blur">
                <p className="text-xs font-semibold uppercase tracking-[0.34em] text-orange-100/80">
                  Before review
                </p>
                <div className="mt-5 space-y-4">
                  {checkpoints.map((item) => (
                    <div key={item} className="flex items-start gap-3">
                      <CircleCheck className="mt-0.5 h-5 w-5 text-amber-200" />
                      <p className="text-sm leading-7 text-orange-50/90">{item}</p>
                    </div>
                  ))}
                </div>
                <p className="mt-6 text-sm leading-7 text-orange-100/80">
                  Sudah punya akun merchant? Masuk ke area partner untuk melanjutkan proses onboarding.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="flex items-center bg-[linear-gradient(180deg,#fffdfa_0%,#fff8f1_100%)] px-6 py-10 sm:px-10 lg:px-12">
          <div className="mx-auto w-full max-w-xl">
            <div className="rounded-[32px] border border-orange-100 bg-white p-8 shadow-[0_24px_70px_rgba(148,64,14,0.08)] sm:p-10">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <span className="inline-flex rounded-full border border-orange-200 bg-orange-50 px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.34em] text-orange-700">
                    Merchant Register
                  </span>
                  <h2 className="mt-5 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                    Buat akun partner baru
                  </h2>
                  <p className="mt-3 max-w-md text-sm leading-7 text-slate-600 sm:text-base">
                    Langkah ini membuat akun merchant awal. Setelah itu Anda akan diarahkan ke onboarding
                    bisnis untuk melengkapi data sebelum masuk ke tim admin.
                  </p>
                </div>
                <Link
                  href="https://redfeng.co/"
                  className="inline-flex items-center gap-2 text-sm font-medium text-orange-700 transition hover:text-orange-800"
                >
                  Kembali ke beranda
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>

              <div className="mt-8 rounded-[24px] border border-orange-100 bg-gradient-to-r from-orange-50 via-white to-amber-50 p-5">
                <p className="text-sm font-semibold text-slate-900">Siap untuk onboarding merchant</p>
                <p className="mt-2 text-sm leading-7 text-slate-600">
                  Gunakan email bisnis aktif agar komunikasi verifikasi dan approval admin tetap rapi.
                </p>
              </div>

              <div className="mt-8 space-y-6">
                <div className="space-y-3">
                  <label
                    htmlFor="merchant-email"
                    className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-500"
                  >
                    Email bisnis
                  </label>
                  <input
                    id="merchant-email"
                    type="email"
                    autoComplete="email"
                    className="w-full rounded-[20px] border border-orange-100 bg-white px-5 py-4 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                    placeholder="hello@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                <div className="space-y-3">
                  <label
                    htmlFor="merchant-password"
                    className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-500"
                  >
                    Password
                  </label>
                  <input
                    id="merchant-password"
                    type="password"
                    autoComplete="new-password"
                    className="w-full rounded-[20px] border border-orange-100 bg-white px-5 py-4 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                    placeholder="Minimal 8 karakter"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>

                {errorMsg ? (
                  <div className="rounded-[20px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {errorMsg}
                  </div>
                ) : null}

                <button
                  onClick={handleRegister}
                  disabled={loading}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-[20px] bg-[linear-gradient(135deg,#9a3412_0%,#ea580c_42%,#fb923c_100%)] px-5 py-4 text-base font-semibold text-white shadow-[0_16px_36px_rgba(194,65,12,0.24)] transition hover:shadow-[0_20px_44px_rgba(194,65,12,0.3)] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {loading ? "Membuat akun..." : "Lanjut ke onboarding merchant"}
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-8 rounded-[24px] border border-slate-200 bg-slate-50/80 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
                  Catatan onboarding
                </p>
                <ul className="mt-4 space-y-3 text-sm leading-7 text-slate-600">
                  <li>Data awal merchant akan dibuat sebagai draft.</li>
                  <li>Merchant baru tampil ke admin setelah onboarding dan upload dokumen selesai.</li>
                  <li>Pastikan email aktif untuk notifikasi verifikasi dan approval.</li>
                </ul>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
