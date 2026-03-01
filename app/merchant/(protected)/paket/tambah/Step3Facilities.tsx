"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { saveFacilities } from "./actions"
import Image from "next/image"

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
    <div className="relative min-h-screen">

      {/* BACKGROUND IMAGE */}
      <div
        className="absolute inset-0 bg-contain bg-no-repeat bg-top opacity-30"
        style={{
          backgroundImage: "url('/bg-wizard.png')"
        }}
      />

      {/* SOFT OVERLAY */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-100/90 via-blue-100/90 to-slate-400/90" />

      {/* CONTENT */}
      <div className="relative z-10">

        {/* HEADER AREA */}
        <div className="px-8 py-6">
          <Image
            src="/logo-redfeng.png"
            alt="Red Feng"
            width={240}
            height={80}
            priority
          />
        </div>

        {/* CONTENT WRAPPER */}
        <div className="flex justify-center px-8 pb-28">

          <div className="w-full max-w-5xl bg-white/95 backdrop-blur rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] p-14">

            <h1 className="text-2xl font-bold mb-1">
              Buat Paket Baru
            </h1>

            <p className="text-gray-500 mb-10">
              Step 3 – Pilih Fasilitas
            </p>

            <form action={saveFacilities} className="space-y-10">
              <input type="hidden" name="package_id" value={packageId} />

              <div className="grid grid-cols-2 md:grid-cols-3 gap-6">

                {facilities.map((facility) => (
                  <label
                    key={facility.id}
                    className="flex items-center gap-3 p-4 border rounded-xl hover:bg-orange-50 transition cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      name="facility_ids[]"
                      value={facility.id}
                      className="w-5 h-5 accent-orange-500"
                    />
                    <span className="text-gray-700">
                      {facility.name}
                    </span>
                  </label>
                ))}

              </div>

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