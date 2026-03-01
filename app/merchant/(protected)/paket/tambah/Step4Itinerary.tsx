"use client"

import { useState } from "react"
import { saveItinerary } from "./actions"
import Image from "next/image"

type RouteType = {
  pickup: string
  route: string
}

type DayType = {
  day: number
  description: string
  routes: RouteType[]
}

export default function Step4Itinerary({
  packageId,
}: {
  packageId: string | null
}) {

  const [days, setDays] = useState<DayType[]>([
    {
      day: 1,
      description: "",
      routes: [{ pickup: "", route: "" }]
    }
  ])

  if (!packageId) {
    return <p className="text-red-500">Package ID tidak ditemukan</p>
  }

  const addDay = () => {
    setDays(prev => [
      ...prev,
      {
        day: prev.length + 1,
        description: "",
        routes: [{ pickup: "", route: "" }]
      }
    ])
  }

  const removeDay = (dayIndex: number) => {
    const filtered = days.filter((_, i) => i !== dayIndex)
    setDays(
      filtered.map((d, i) => ({
        ...d,
        day: i + 1
      }))
    )
  }

  const addRoute = (dayIndex: number) => {
    setDays(prev => {
      const updated = [...prev]
      updated[dayIndex].routes.push({ pickup: "", route: "" })
      return updated
    })
  }

  const removeRoute = (dayIndex: number, routeIndex: number) => {
    setDays(prev => {
      const updated = [...prev]
      updated[dayIndex].routes =
        updated[dayIndex].routes.filter((_, i) => i !== routeIndex)
      return updated
    })
  }

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

      {/* HEADER */}
      <div className="px-10 py-8">
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

      <div className="flex justify-center px-8 pb-28">

        <div className="w-full max-w-6xl bg-white rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] p-14">

          <h1 className="text-2xl font-bold mb-2">
            Buat Paket Baru
          </h1>

          <p className="text-gray-500 mb-10">
            Step 4 – Itinerary
          </p>

          <form action={saveItinerary} className="space-y-12">

            <input type="hidden" name="package_id" value={packageId} />

            {days.map((day, dayIndex) => (
              <div
                key={dayIndex}
                className="border rounded-2xl p-8 space-y-8 bg-slate-50"
              >

                {/* HEADER HARI */}
                <div className="flex justify-between items-center">
                  <h3 className="text-xl font-semibold text-gray-800">
                    Hari ke {day.day}
                  </h3>

                  {days.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeDay(dayIndex)}
                      className="text-red-500 text-sm font-medium hover:underline"
                    >
                      ❌ Hapus Hari
                    </button>
                  )}
                </div>

                {/* ROUTES */}
                <div className="space-y-6">

                  {day.routes.map((route, routeIndex) => (
                    <div
                      key={routeIndex}
                      className="grid grid-cols-12 gap-6 items-end"
                    >

                      <input
                        type="hidden"
                        name="day_number[]"
                        value={day.day}
                      />

                      <div className="col-span-1 text-sm font-semibold text-gray-400">
                        #{routeIndex + 1}
                      </div>

                      {/* JAM */}
                      <div className="col-span-3">
                        {routeIndex === 0 && (
                          <label className="text-sm font-medium text-gray-600">
                            Jam
                          </label>
                        )}

                        <div className="flex gap-2">
                          <input
                            type="time"
                            name="pickup_time[]"
                            className="border rounded-lg p-3 w-full focus:ring-2 focus:ring-orange-400 outline-none"
                          />

                          <select
                            name="pickup_period[]"
                            className="border rounded-lg p-3 focus:ring-2 focus:ring-orange-400 outline-none"
                          >
                            <option value="AM">AM</option>
                            <option value="PM">PM</option>
                          </select>
                        </div>
                      </div>

                      {/* RUTE */}
                      <div className="col-span-6">
                        {routeIndex === 0 && (
                          <label className="text-sm font-medium text-gray-600">
                            Rute
                          </label>
                        )}
                        <input
                          name="route[]"
                          className="border rounded-lg p-3 w-full focus:ring-2 focus:ring-orange-400 outline-none"
                        />
                      </div>

                      {/* DELETE ROUTE */}
                      <div className="col-span-2 text-right">
                        {day.routes.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeRoute(dayIndex, routeIndex)}
                            className="text-red-500 hover:underline"
                          >
                            ❌
                          </button>
                        )}
                      </div>

                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={() => addRoute(dayIndex)}
                    className="text-orange-500 font-semibold hover:underline"
                  >
                    + Tambah Rute
                  </button>

                </div>

                {/* DESKRIPSI */}
                <div>
                  <label className="text-sm font-medium text-gray-600">
                    Deskripsi Perjalanan Hari Ini
                  </label>
                  <textarea
                    name="description[]"
                    className="border rounded-lg p-4 w-full h-32 focus:ring-2 focus:ring-orange-400 outline-none"
                  />
                </div>

              </div>
            ))}

            {/* BUTTON AREA */}
            <div className="flex gap-6 pt-6">

              <button
                type="button"
                onClick={addDay}
                className="px-8 py-3 rounded-xl bg-gray-700 text-white hover:bg-gray-800 transition"
              >
                + Tambah Hari
              </button>

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