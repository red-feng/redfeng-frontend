'use client'

import Link from "next/link"
import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import PasswordField from "@/app/components/PasswordField"
import { buildInternalAdminEmail, normalizeInternalUsername } from "@/lib/internal-auth"
import { isAdminPortalRole } from "@/lib/internal-roles"

export default function AdminLogin() {
  const supabase = createClient()

  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleLogin = async () => {
    setLoading(true)
    setError("")

    const normalizedUsername = normalizeInternalUsername(username)
    if (!normalizedUsername || !password) {
      setError("Username dan password wajib diisi.")
      setLoading(false)
      return
    }

    await supabase.auth.signOut()

    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email: buildInternalAdminEmail(normalizedUsername),
      password,
    })

    if (signInError || !data.user) {
      setError(signInError?.message || "Username atau password admin tidak valid.")
      setLoading(false)
      return
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", data.user.id)
      .maybeSingle()

    if (!profile) {
      setError("Akun ini belum memiliki akses admin.")
      await supabase.auth.signOut()
      setLoading(false)
      return
    }

    if (profile.role === "superadmin") {
      setError("Portal ini khusus untuk admin dan operations manager. Gunakan portal superadmin.")
      await supabase.auth.signOut()
      setLoading(false)
      return
    }

    if (isAdminPortalRole(profile.role)) {
      window.location.assign("/admin/dashboard")
      setLoading(false)
      return
    }

    setError("Portal ini khusus untuk admin dan operations manager.")
    await supabase.auth.signOut()
    setLoading(false)
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fff8f1_0%,#f6f0e8_100%)] px-4 py-10 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-6xl overflow-hidden rounded-[36px] border border-orange-200/60 bg-white shadow-[0_32px_110px_rgba(146,64,14,0.16)] lg:grid-cols-[1.05fr_0.95fr]">
        <section className="relative overflow-hidden bg-[linear-gradient(145deg,#7c2d12_0%,#c2410c_36%,#f97316_72%,#fdba74_100%)] px-8 py-10 text-white sm:px-10 lg:px-12 lg:py-14">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.22),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.12),transparent_30%)]" />
          <div className="relative flex h-full flex-col">
            <span className="inline-flex w-fit rounded-full border border-white/20 bg-white/10 px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.34em] text-orange-50">
              Red Feng Admin
            </span>
            <h1 className="mt-6 max-w-xl text-4xl font-semibold leading-tight sm:text-5xl">
              Secure access untuk tim internal Red Feng.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-orange-50/92">
              Halaman ini khusus untuk administrator yang mengelola merchant review, paket, booking, dan
              operasional internal.
            </p>

            <div className="mt-10 grid gap-4">
              {[
                "Merchant approvals dan revisi dokumen",
                "Monitoring booking, paket, dan kualitas listing",
                "Akses internal untuk admin dan operations manager",
              ].map((item) => (
                <div
                  key={item}
                  className="rounded-[24px] border border-white/18 bg-white/10 px-5 py-4 text-sm leading-7 text-orange-50/90 backdrop-blur"
                >
                  <span className="mr-3 text-amber-200">●</span>
                  {item}
                </div>
              ))}
            </div>

            <div className="mt-auto pt-10 text-sm text-orange-100/85">
              Bukan admin? Gunakan portal merchant atau customer sesuai peran akun Anda.
            </div>
          </div>
        </section>

        <section className="flex items-center bg-[linear-gradient(180deg,#fffdfa_0%,#fff8f1_100%)] px-6 py-10 sm:px-10 lg:px-12">
          <div className="mx-auto w-full max-w-xl">
            <div className="rounded-[32px] border border-orange-100 bg-white p-8 shadow-[0_24px_70px_rgba(148,64,14,0.08)] sm:p-10">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <span className="inline-flex rounded-full border border-orange-200 bg-orange-50 px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.34em] text-orange-700">
                    Admin Login
                  </span>
                  <h2 className="mt-5 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                    Masuk ke admin dashboard
                  </h2>
                  <p className="mt-3 max-w-md text-sm leading-7 text-slate-600 sm:text-base">
                    Gunakan username internal yang dibuat oleh operations manager.
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

              {error ? (
                <div className="mt-8 rounded-[20px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              ) : null}

              <div className="mt-8 space-y-6">
                <div className="space-y-3">
                  <label
                    htmlFor="admin-username"
                    className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-500"
                  >
                    Username admin
                  </label>
                  <input
                    id="admin-username"
                    type="text"
                    autoComplete="username"
                    className="w-full rounded-[20px] border border-orange-100 bg-white px-5 py-4 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                    placeholder="mis: admin.operasional"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                </div>

                <div className="space-y-3">
                  <label
                    htmlFor="admin-password"
                    className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-500"
                  >
                    Password
                  </label>
                  <PasswordField
                    id="admin-password"
                    autoComplete="current-password"
                    className="w-full rounded-[20px] border border-orange-100 bg-white px-5 py-4 pr-28 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                    placeholder="Masukkan password admin"
                    value={password}
                    onChange={setPassword}
                  />
                  <div className="flex justify-end">
                    <span className="text-sm font-medium text-orange-700">
                      Reset password dikelola oleh operations manager.
                    </span>
                  </div>
                </div>

                <button
                  onClick={handleLogin}
                  disabled={loading}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-[20px] bg-[linear-gradient(135deg,#9a3412_0%,#ea580c_42%,#fb923c_100%)] px-5 py-4 text-base font-semibold text-white shadow-[0_16px_36px_rgba(194,65,12,0.24)] transition hover:shadow-[0_20px_44px_rgba(194,65,12,0.3)] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {loading ? "Memproses login..." : "Masuk ke admin dashboard"}
                  <span aria-hidden="true">→</span>
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
