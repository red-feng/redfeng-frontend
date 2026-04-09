'use client'

import Link from "next/link"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import PasswordField from "@/app/components/PasswordField"
import { ACTIVE_PORTAL_COOKIE, ACTIVE_PORTAL_MAX_AGE, MERCHANT_PORTAL_DEFAULT_REDIRECT } from "@/lib/portal-context"
import { readPortalSessionErrorMessage } from "@/lib/portal-session"

const partnerPoints = [
  {
    title: "Akses merchant workspace",
    description: "Masuk ke dashboard partner untuk mengelola paket, pesanan, saldo, dan performa.",
    icon: "▣",
  },
  {
    title: "Review status bisnis",
    description: "Lihat apakah akun masih draft, pending review, approved, atau perlu revisi dokumen.",
    icon: "◎",
  },
  {
    title: "Autentikasi aman",
    description: "Gunakan email bisnis terverifikasi untuk melanjutkan proses merchant dengan aman.",
    icon: "◈",
  },
]

export default function MerchantLogin() {
  const router = useRouter()
  const supabase = createClient()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [blockedStatus] = useState<string | null>(() => {
    if (typeof window === "undefined") return null
    return new URLSearchParams(window.location.search).get("blocked")
  })
  const [systemError] = useState<string | null>(() => {
    if (typeof window === "undefined") return null
    return new URLSearchParams(window.location.search).get("error")
  })
  const blockedError =
    blockedStatus === "inactive"
      ? "Akun merchant Anda sedang dinonaktifkan sementara oleh admin."
      : blockedStatus === "deleted"
        ? "Akun merchant Anda sudah dihapus dari akses merchant oleh admin."
        : ""
  const systemErrorMessage = readPortalSessionErrorMessage(systemError, {
    noSession: "Sesi merchant Anda sudah berakhir atau tergantikan. Silakan login lagi.",
    noProfile: "Akun ini belum memiliki profil merchant yang valid.",
    wrongPortalPrefix: "Portal merchant hanya menerima akun merchant.",
  })

  useEffect(() => {
    if (!blockedStatus) return

    void supabase.auth.signOut()
  }, [blockedStatus, supabase])

  const handleLogin = async () => {
    setLoading(true)
    setError("")

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session?.user) {
      router.push("/")
      return
    }

    const userId = session.user.id

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .maybeSingle()

    if (!profile) {
      setError("Akun ini belum memiliki akses merchant.")
      await supabase.auth.signOut()
      setLoading(false)
      return
    }

    if (profile.role === "merchant") {
      if (typeof document !== "undefined") {
        document.cookie = `${ACTIVE_PORTAL_COOKIE}=merchant; Path=/; Max-Age=${ACTIVE_PORTAL_MAX_AGE}; SameSite=Lax`
      }
      const { data: merchant } = await supabase
        .from("merchants")
        .select("verification_status")
        .eq("user_id", userId)
        .maybeSingle()

      if (merchant?.verification_status === "inactive") {
        await supabase.auth.signOut()
        setError("Akun merchant Anda sedang dinonaktifkan sementara oleh admin.")
        setLoading(false)
        return
      }

      if (merchant?.verification_status === "deleted") {
        await supabase.auth.signOut()
        setError("Akun merchant Anda sudah dihapus dari akses merchant oleh admin.")
        setLoading(false)
        return
      }

      router.push(MERCHANT_PORTAL_DEFAULT_REDIRECT)
    } else {
      setError("Portal ini khusus untuk merchant.")
      await supabase.auth.signOut()
      setLoading(false)
      return
    }

    setLoading(false)
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fff7f0_0%,#f7f2ea_38%,#f3efe8_100%)] px-4 py-10 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-7xl overflow-hidden rounded-[36px] border border-orange-200/60 bg-white shadow-[0_36px_120px_rgba(146,64,14,0.16)] lg:grid-cols-[1.04fr_0.96fr]">
        <section className="relative overflow-hidden bg-[linear-gradient(145deg,#7c2d12_0%,#c2410c_36%,#f97316_72%,#fdba74_100%)] px-8 py-10 text-white sm:px-10 lg:px-12 lg:py-14">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.22),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.12),transparent_30%)]" />
          <div className="absolute -left-24 top-16 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute bottom-8 right-0 h-72 w-72 rounded-full bg-amber-200/15 blur-3xl" />

          <div className="relative flex h-full flex-col">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.38em] text-orange-100/90">
                  Red Feng Merchant Access
                </p>
                <h1 className="mt-3 max-w-xl text-4xl font-semibold leading-tight sm:text-5xl">
                  Masuk ke partner workspace yang terasa lebih premium dan terstruktur.
                </h1>
              </div>
              <div className="hidden rounded-[24px] border border-white/20 bg-white/10 px-5 py-4 backdrop-blur md:block">
                <p className="text-[11px] uppercase tracking-[0.28em] text-orange-100/80">
                  Partner Journey
                </p>
                <p className="mt-2 text-sm font-medium text-white/90">
                  Built for verified travel merchants
                </p>
              </div>
            </div>

            <p className="relative mt-8 max-w-2xl text-base leading-8 text-orange-50/92 sm:text-lg">
              Lanjutkan pengelolaan bisnis travel Anda dari dashboard merchant Red Feng, dengan alur
              login yang lebih profesional dan konsisten dengan partner onboarding.
            </p>

            <div className="relative mt-10 grid gap-4 xl:grid-cols-3">
              {partnerPoints.map((item) => {
                return (
                  <article
                    key={item.title}
                    className="rounded-[28px] border border-white/20 bg-white/10 p-5 backdrop-blur"
                  >
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/16">
                      <span className="text-lg font-semibold text-white">{item.icon}</span>
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
                  Need access
                </p>
                <p className="mt-4 text-sm leading-7 text-orange-50/90">
                  Jika belum memiliki akun merchant, buat akun baru lalu lanjutkan ke onboarding bisnis
                  untuk masuk ke antrian review admin.
                </p>
                <Link
                  href="/merchant/register"
                  className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-white transition hover:text-orange-100"
                >
                  Buat akun merchant
                  <span aria-hidden="true">→</span>
                </Link>
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
                    Merchant Sign In
                  </span>
                  <h2 className="mt-5 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                    Masuk ke dashboard merchant
                  </h2>
                  <p className="mt-3 max-w-md text-sm leading-7 text-slate-600 sm:text-base">
                    Gunakan akun merchant Anda untuk mengakses dashboard partner, status verifikasi, dan
                    proses bisnis yang sedang berjalan.
                  </p>
                </div>
                <Link
                  href="https://redfeng.co/"
                  className="inline-flex items-center gap-2 text-sm font-medium text-orange-700 transition hover:text-orange-800"
                >
                  Kembali ke beranda
                  <span aria-hidden="true">→</span>
                </Link>
              </div>

              {error || blockedError || systemErrorMessage ? (
                <div className="mt-8 rounded-[20px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error || blockedError || systemErrorMessage}
                </div>
              ) : null}

              <div className="mt-8 space-y-6">
                <div className="space-y-3">
                  <label
                    htmlFor="merchant-login-email"
                    className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-500"
                  >
                    Email bisnis
                  </label>
                  <input
                    id="merchant-login-email"
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
                    htmlFor="merchant-login-password"
                    className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-500"
                  >
                    Password
                  </label>
                  <PasswordField
                    id="merchant-login-password"
                    autoComplete="current-password"
                    className="w-full rounded-[20px] border border-orange-100 bg-white px-5 py-4 pr-28 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                    placeholder="Masukkan password akun merchant"
                    value={password}
                    onChange={setPassword}
                  />
                  <div className="flex justify-end">
                    <Link
                      href="/forgot-password?next=/merchant/login"
                      className="text-sm font-medium text-orange-700 transition hover:text-orange-800"
                    >
                      Lupa password?
                    </Link>
                  </div>
                </div>

                <button
                  onClick={handleLogin}
                  disabled={loading}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-[20px] bg-[linear-gradient(135deg,#9a3412_0%,#ea580c_42%,#fb923c_100%)] px-5 py-4 text-base font-semibold text-white shadow-[0_16px_36px_rgba(194,65,12,0.24)] transition hover:shadow-[0_20px_44px_rgba(194,65,12,0.3)] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {loading ? "Memproses login..." : "Masuk ke merchant dashboard"}
                  <span aria-hidden="true">→</span>
                </button>
              </div>

              <div className="mt-8 rounded-[24px] border border-slate-200 bg-slate-50/80 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
                  Belum punya akun?
                </p>
                <p className="mt-3 text-sm leading-7 text-slate-600">
                  Daftar sebagai merchant Red Feng lalu lanjutkan onboarding untuk masuk ke proses review
                  admin.
                </p>
                <Link
                  href="/merchant/register"
                  className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-orange-700 transition hover:text-orange-800"
                >
                  Daftar merchant baru
                  <span aria-hidden="true">→</span>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
