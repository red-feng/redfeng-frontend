'use client'

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

export default function MerchantLogin() {
  const router = useRouter()
  const supabase = createClient()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleLogin = async () => {
    setLoading(true)
    setError("")

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    // ambil role user
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", data.user.id)
      .single()

    if (!profile) {
      router.push("/")
      return
    }

    // redirect berdasarkan role
    switch (profile.role) {
      case "superadmin":
      case "admin":
        router.push("/admin/dashboard")
        break
      case "merchant":
        router.push("/merchant/dashboard")
        break
      default:
        router.push("/")
    }

    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded shadow w-96">
        <h1 className="text-2xl font-bold mb-6 text-center">
          Merchant Login
        </h1>

        {error && (
          <p className="text-red-500 mb-4 text-sm">{error}</p>
        )}

        <input
          className="w-full border p-2 mb-4"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          type="password"
          className="w-full border p-2 mb-4"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button
          onClick={handleLogin}
          disabled={loading}
          className="w-full bg-black text-white py-2 rounded"
        >
          {loading ? "Loading..." : "Login"}
        </button>

        <p className="text-sm text-center mt-4">
          Belum punya akun?{" "}
          <a href="/merchant/register" className="text-blue-600 underline">
            Register
          </a>
        </p>
      </div>
    </div>
  )
}