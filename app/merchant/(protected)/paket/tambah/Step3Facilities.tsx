"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { saveFacilities } from "./actions"
import Image from "next/image"
import { getFacilityIcon } from "@/lib/facility-icons"

type Facility = {
  id: string
  name: string
  category: string
}

export default function Step3Facilities({
  packageId,
}: {
  packageId: string | null
}) {
  const [facilities, setFacilities] = useState<Facility[]>([])

  useEffect(() => {
    const fetchFacilities = async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from("facilities")
        .select("*")
        .order("category", { ascending: true })

      setFacilities((data as Facility[] | null) || [])
    }

    fetchFacilities()
  }, [])

  if (!packageId) {
    return <p className="text-red-500">Package ID tidak ditemukan</p>
  }

  const groupedFacilities = facilities.reduce<Record<string, Facility[]>>((acc, facility) => {
    const category = facility.category || "Lainnya"
    if (!acc[category]) acc[category] = []
    acc[category].push(facility)
    return acc
  }, {})

 
  return (
    <div className="relative min-h-screen">

      {/* BACKGROUND IMAGE */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: "url('/bg-wizard.png')"
        }}
      />

     
      {/* CONTENT */}
      <div className="relative z-10">

      {/* HEADER AREA */}
            <div className="px-8 py-6">
              <Image
                        src="/logo-redfeng.png"
                        alt="Red Feng"
                        width={0}
                        height={0}
                        sizes="100vw"
                        className="h-32 w-auto"
                        priority
                      />
                    </div>

      {/* CONTENT WRAPPER */}
      <div className="flex justify-center px-8 pb-28">

        <div className="w-full max-w-5xl bg-white rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] p-14">

          <h1 className="text-2xl font-bold mb-1">
            Buat Paket Baru
          </h1>

          <p className="text-gray-500 mb-10">
            Step 3 – Pilih Fasilitas
          </p>

          <form action={saveFacilities} className="space-y-10">
            <input type="hidden" name="package_id" value={packageId} />

            {/* FACILITIES GRID */}
            <div className="space-y-8">
              {Object.entries(groupedFacilities).map(([category, items]) => (
                <div key={category}>
                  <h3 className="mb-4 text-lg font-semibold text-slate-800">{category}</h3>
                  <div className="grid grid-cols-2 gap-6 md:grid-cols-3">
                    {items.map((facility) => (
                      <label
                        key={facility.id}
                        className="flex items-center gap-3 rounded-xl border p-4 transition cursor-pointer hover:bg-orange-50"
                      >
                        <input
                          type="checkbox"
                          name="facility_ids[]"
                          value={facility.id}
                          className="h-5 w-5 accent-orange-500"
                        />
                        <span className="text-lg leading-none">
                          {getFacilityIcon(facility.name)}
                        </span>
                        <span className="text-gray-700">
                          {facility.name}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* BUTTON */}
            <div className="flex justify-center pt-6">
              <button
                type="submit"
                className="px-14 py-3 rounded-xl font-semibold 
                           bg-gradient-to-r from-orange-500 via-orange-400 to-orange-300
                           text-white
                           shadow-[0_8px_20px_rgba(249,115,22,0.4)]
                           hover:scale-105
                           transition-all duration-300"
              >
                Simpan & Lanjut
              </button>
            </div>

          </form>

        </div>
      </div>
      </div>
    </div>
  )
}
