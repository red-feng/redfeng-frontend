"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { saveFacilities } from "./actions"

export default function Step3Facilities({
  packageId,
}: {
  packageId: string | null
}) {
  const supabase = createClient()
  const [facilities, setFacilities] = useState<any[]>([])

  useEffect(() => {
    const fetchFacilities = async () => {
      const { data } = await supabase
        .from("facilities")
        .select("*")
        .order("category", { ascending: true })

      setFacilities(data || [])
    }

    fetchFacilities()
  }, [])

  if (!packageId) {
    return <p className="text-red-500">Package ID tidak ditemukan</p>
  }

  return (
    <form action={saveFacilities} className="space-y-4">
      <input type="hidden" name="package_id" value={packageId} />

      <h2 className="text-xl font-semibold">
        Step 3 – Pilih Fasilitas
      </h2>

      <div className="grid grid-cols-2 gap-4">
        {facilities.map((facility) => (
          <label key={facility.id} className="flex items-center gap-2">
            <input
              type="checkbox"
              name="facility_ids[]"
              value={facility.id}
            />
            {facility.name}
          </label>
        ))}
      </div>

      <button className="bg-blue-600 text-white px-6 py-2 rounded">
        Simpan & Lanjut
      </button>
    </form>
  )
}

