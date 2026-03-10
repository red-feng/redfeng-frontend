'use client'

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

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
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded shadow w-96">
        <h1 className="text-2xl font-bold mb-6 text-center">
          Merchant Register
        </h1>

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
          onClick={handleRegister}
          disabled={loading}
          className="w-full bg-black text-white py-2 rounded"
        >
          {loading ? "Loading..." : "Register"}
        </button>

        {errorMsg ? (
          <p className="mt-4 text-sm text-red-600">{errorMsg}</p>
        ) : null}
      </div>
    </div>
  )
}
