"use client"

import { useEffect, useRef, useState } from "react"
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
  const isFirstPriceRender = useRef(true)
  const isFirstFacilitiesRender = useRef(true)

  // AUTO FILTER PRICE
  useEffect(() => {
    if (isFirstPriceRender.current) {
      isFirstPriceRender.current = false
      return
    }
    const timeout = setTimeout(() => {
      const currentValue = searchParams.get("max_price") || ""
      const nextValue = String(maxPrice)
      if (currentValue === nextValue) return

      const params = new URLSearchParams(searchParams.toString())
      params.set("max_price", nextValue)
      router.replace(`/?${params.toString()}`)
    }, 300)

    return () => clearTimeout(timeout)
  }, [maxPrice, router, searchParams])

  // AUTO FILTER FACILITIES
  useEffect(() => {
    if (isFirstFacilitiesRender.current) {
      isFirstFacilitiesRender.current = false
      return
    }

    const params = new URLSearchParams(searchParams.toString())
    const currentFacilities = searchParams.get("facilities") || ""
    const nextFacilities = selectedFacilities.join(",")
    if (currentFacilities === nextFacilities) return

    if (selectedFacilities.length > 0) {
      params.set("facilities", nextFacilities)
    } else {
      params.delete("facilities")
    }

    router.replace(`/?${params.toString()}`)
   }, [selectedFacilities, router, searchParams])

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