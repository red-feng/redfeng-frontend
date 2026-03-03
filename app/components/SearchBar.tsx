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

    if (country) {
      params.set("country", country)
    } else {
      params.delete("country")
    }

    if (style) {
      params.set("style", style)
    } else {
      params.delete("style")
    }

    if (duration) {
      params.set("duration", duration)
    } else {
      params.delete("duration")
    }

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
          <option value="explore">Explore</option>
          <option value="luxury">Luxury</option>
          <option value="adventure">Adventure</option>
          <option value="family">Family</option>
          <option value="honeymoon">Honeymoon</option>
          <option value="wellness">Wellness</option>
          <option value="religious">Religious</option>
          <option value="budget">Budget</option>
          <option value="group">Group</option>
          <option value="solo">Solo</option>
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
