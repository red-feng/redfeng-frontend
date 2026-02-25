"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"

export default function FilterClient() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [minPrice, setMinPrice] = useState(0)
  const [maxPrice, setMaxPrice] = useState(5000000)

  function applyFilter() {
    const params = new URLSearchParams(searchParams.toString())

    params.set("min_price", String(minPrice))
    params.set("max_price", String(maxPrice))

    router.push(`/packages?${params.toString()}`)
  }

  return (
    <div className="space-y-4">
      <label className="font-semibold">Price Range</label>

      <input
        type="range"
        min="0"
        max="5000000"
        step="100000"
        value={maxPrice}
        onChange={(e) => setMaxPrice(Number(e.target.value))}
        className="w-full"
      />

      <div className="flex justify-between text-sm">
        <span>Rp {minPrice.toLocaleString()}</span>
        <span>Rp {maxPrice.toLocaleString()}</span>
      </div>

      <button
        onClick={applyFilter}
        className="bg-black text-white px-4 py-2 rounded"
      >
        Apply
      </button>
    </div>
  )
}