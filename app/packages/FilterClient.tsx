"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"

type Facility = {
  id: string
  name: string
  category: string
}

export default function FilterClient({
  facilities,
}: {
  facilities: Facility[]
}) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [maxPrice, setMaxPrice] = useState<number>(
    Number(searchParams.get("max_price")) || 100000000
  )

  const [selectedFacilities, setSelectedFacilities] = useState<string[]>(
    searchParams.get("facilities")?.split(",") || []
  )

  // AUTO FILTER PRICE
  useEffect(() => {
  const timeout = setTimeout(() => {
    const params = new URLSearchParams(searchParams.toString())
    params.set("max_price", String(maxPrice))
    router.push(`/?${params.toString()}`)
  }, 300)

  return () => clearTimeout(timeout)
}, [maxPrice])

  // AUTO FILTER FACILITIES
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString())

    if (selectedFacilities.length > 0) {
      params.set("facilities", selectedFacilities.join(","))
    } else {
      params.delete("facilities")
    }

    router.push(`/?${params.toString()}`)
  }, [selectedFacilities])

  const grouped = facilities.reduce<Record<string, Facility[]>>(
    (acc, f) => {
      if (!acc[f.category]) {
        acc[f.category] = []
      }
      acc[f.category].push(f)
      return acc
    },
    {}
  )

  return (
    <div className="space-y-6 sticky top-6">

      <div>
        <label className="font-semibold">Price Range</label>

        <input
          type="range"
          min="0"
          max="100000000"
          step="100000"
          value={maxPrice}
          onChange={(e) => setMaxPrice(Number(e.target.value))}
          className="w-full"
        />

        <div className="flex justify-between text-sm">
          <span>Rp 0</span>
          <span>Rp {maxPrice.toLocaleString()}</span>
        </div>
      </div>

      {Object.entries(grouped).map(([category, items]) => (
        <div key={category}>
          <h4 className="font-semibold mb-2">{category}</h4>

          {items.map((f) => (
            <label key={f.id} className="flex items-center gap-2 mb-1">
              <input
                type="checkbox"
                value={f.id}
                checked={selectedFacilities.includes(f.id)}
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedFacilities([...selectedFacilities, f.id])
                  } else {
                    setSelectedFacilities(
                      selectedFacilities.filter((id) => id !== f.id)
                    )
                  }
                }}
              />
              {f.name}
            </label>
          ))}
        </div>
      ))}

    </div>
  )
}