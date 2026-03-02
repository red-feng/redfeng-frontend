"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useState } from "react"

export default function SearchBar() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [country, setCountry] = useState(searchParams.get("country") || "")
  const [style, setStyle] = useState(searchParams.get("style") || "")
  const [duration, setDuration] = useState(searchParams.get("duration") || "")

  const applyFilter = () => {
    const params = new URLSearchParams(searchParams.toString())

    country ? params.set("country", country) : params.delete("country")
    style ? params.set("style", style) : params.delete("style")
    duration ? params.set("duration", duration) : params.delete("duration")

    router.push(`/?${params.toString()}`)
  }

  return (
    <div className="bg-white border-b shadow-sm px-8 py-4">
      <div className="max-w-[1360px] mx-auto flex gap-4 items-center">

        {/* NEGARA */}
        <select
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          className="border rounded-xl px-4 py-3 w-[240px]"
        >
          <option value="">Semua Negara</option>
          <option value="indonesia">Indonesia</option>
          <option value="japan">Japan</option>
          <option value="singapore">Singapore</option>
        </select>

        {/* TRAVEL STYLE */}
        <select
          value={style}
          onChange={(e) => setStyle(e.target.value)}
          className="border rounded-xl px-4 py-3 w-[240px]"
        >
          <option value="">Semua Travel Style</option>
          <option value="luxury">Luxury</option>
          <option value="adventure">Adventure</option>
          <option value="family">Family</option>
          <option value="honeymoon">Honeymoon</option>
        </select>

        {/* DURASI */}
        <select
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
          className="border rounded-xl px-4 py-3 w-[200px]"
        >
          <option value="">Semua Durasi</option>
          <option value="1-3">1-3 Hari</option>
          <option value="4-7">4-7 Hari</option>
          <option value="8+">8+ Hari</option>
        </select>

        {/* BUTTON */}
        <button
          onClick={applyFilter}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl"
        >
          Terapkan
        </button>

      </div>
    </div>
  )
}