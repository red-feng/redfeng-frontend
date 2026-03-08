'use client'

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

function getSafeNextFromLocation() {
  if (typeof window === "undefined") return "/customer/dashboard"
  const requestedNext = new URLSearchParams(window.location.search).get("next")
  return requestedNext && requestedNext.startsWith("/") ? requestedNext : "/customer/dashboard"
}

export default function CustomerRegisterPage() {
  const supabase = createClient()
  const router = useRouter()

  const [fullName, setFullName] = useState("")
  const [phone, setPhone] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState("")
  const [safeNext] = useState(getSafeNextFromLocation)

  const handleRegister = async (event: React.FormEvent) => {
    event.preventDefault()
    setLoading(true)
    setErrorMsg("")

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          phone_number: phone,
        },
      },
    })

    if (error) {
      setErrorMsg(error.message)
      setLoading(false)
      return
    }

    const user = data.user

    if (user) {
      await supabase.from("profiles").upsert({
        id: user.id,
        role: "customer",
      })
    }

    router.replace(`/login?next=${encodeURIComponent(safeNext)}`)
    setLoading(false)
  }

  const handleGoogleRegister = async () => {
    setLoading(true)
    setErrorMsg("")

    const redirectTo =
      typeof window === "undefined"
        ? undefined
        : `${window.location.origin}/auth/callback?next=${encodeURIComponent(safeNext)}`

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
      },
    })

    if (error) {
      setErrorMsg(error.message)
      setLoading(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-100 px-4">
      <div className="w-full max-w-md rounded-xl bg-white p-8 shadow">
        <h1 className="mb-2 text-center text-2xl font-bold text-slate-900">Register Customer</h1>
        <p className="mb-6 text-center text-sm text-slate-500">
          Buat akun customer terlebih dahulu sebelum login dan melakukan booking.
        </p>

        <form onSubmit={handleRegister} className="space-y-4">
          <input
            className="w-full rounded border p-3"
            placeholder="Nama lengkap"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            required
          />

          <input
            type="tel"
            className="w-full rounded border p-3"
            placeholder="No telp"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            required
          />

          <input
            type="email"
            className="w-full rounded border p-3"
            placeholder="Email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />

          <input
            type="password"
            className="w-full rounded border p-3"
            placeholder="Password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />

          {errorMsg && <div className="text-sm text-red-500">{errorMsg}</div>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-orange-500 py-3 text-white transition hover:bg-orange-600"
          >
            {loading ? "Mendaftarkan..." : "Register"}
          </button>
        </form>

        <div className="my-5 flex items-center gap-3 text-xs uppercase tracking-[0.24em] text-slate-400">
          <div className="h-px flex-1 bg-slate-200" />
          <span>atau</span>
          <div className="h-px flex-1 bg-slate-200" />
        </div>

        <button
          type="button"
          onClick={handleGoogleRegister}
          disabled={loading}
          className="flex w-full items-center justify-center gap-3 rounded-lg border border-slate-300 bg-white py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70"
        >
          <span className="text-base">G</span>
          <span>Lanjutkan dengan Google</span>
        </button>

        <p className="mt-5 text-center text-sm text-slate-600">
          Sudah punya akun?{" "}
          <a href="/login" className="font-semibold text-orange-600 hover:text-orange-700">
            Login
          </a>
        </p>
      </div>
    </main>
  )
}
