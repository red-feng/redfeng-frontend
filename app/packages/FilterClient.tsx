"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"

export default function FilterClient() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [minPrice, setMinPrice] = useState(0)
  const [maxPrice, setMaxPrice] = useState(100000000)

  // 🔥 fasilitas sementara hardcoded dulu
  const facilities = [
    { id: "snorkeling", name: "Snorkeling" },
    { id: "rafting", name: "Rafting" },
    { id: "hotel3", name: "Hotel Bintang 3" },
    { id: "airport", name: "Antar Jemput Bandara" },
  ]

  const [selectedFacilities, setSelectedFacilities] = useState<string[]>([])

  function applyFilter() {
    const params = new URLSearchParams(searchParams.toString())

    params.set("min_price", String(minPrice))
    params.set("max_price", String(maxPrice))

    if (selectedFacilities.length > 0) {
      params.set("facilities", selectedFacilities.join(","))
    } else {
      params.delete("facilities")
    }

    router.push(`/packages?${params.toString()}`)
  }

  return (
    <div className="space-y-6">

      {/* PRICE RANGE */}
      <div>
        <label className="font-semibold">Price Range</label>

        <input
          type="range"
          min="0"
          max="100000000"
          step="500000"
          value={maxPrice}
          onChange={(e) => setMaxPrice(Number(e.target.value))}
          className="w-full"
        />

        <div className="flex justify-between text-sm mt-2">
          <span>Rp {minPrice.toLocaleString()}</span>
          <span>Rp {maxPrice.toLocaleString()}</span>
        </div>
      </div>

      {/* FACILITIES */}
      <div>
        <label className="font-semibold">Fasilitas</label>

        <div className="space-y-2 mt-2">
          {facilities.map((f) => (
            <label key={f.id} className="flex items-center gap-2">
              <input
                type="checkbox"
                value={f.id}
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedFacilities([...selectedFacilities, f.id])
                  } else {
                    setSelectedFacilities(
                      selectedFacilities.filter(id => id !== f.id)
                    )
                  }
                }}
              />
              {f.name}
            </label>
          ))}
        </div>
      </div>

      {/* APPLY BUTTON */}
      <button
        onClick={applyFilter}
        className="bg-black text-white px-4 py-2 rounded w-full"
      >
        Apply
      </button>

    </div>
  )
}