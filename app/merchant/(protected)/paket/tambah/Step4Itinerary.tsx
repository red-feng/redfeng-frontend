"use client"

import { useState } from "react"
import { saveItinerary } from "./actions"

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
        day: i + 1 // auto renumber
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
    <form action={saveItinerary} className="space-y-8">

      <input type="hidden" name="package_id" value={packageId} />

      <h2 className="text-2xl font-bold">
        Step 4 – Itinerary
      </h2>

      {days.map((day, dayIndex) => (
        <div
          key={dayIndex}
          className="bg-white shadow rounded-xl p-6 border space-y-6"
        >

          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">
              Hari ke {day.day}
            </h3>

            {days.length > 1 && (
              <button
                type="button"
                onClick={() => removeDay(dayIndex)}
                className="text-red-500 text-sm"
              >
                ❌ Hapus Hari
              </button>
            )}
          </div>

          {/* ROUTES */}
          <div className="space-y-4">

            {day.routes.map((route, routeIndex) => (
              <div
                key={routeIndex}
                className="grid grid-cols-12 gap-4 items-end"
              >

                <input
                  type="hidden"
                  name="day_number[]"
                  value={day.day}
                />

                <div className="col-span-1 text-sm font-semibold text-gray-500">
                  #{routeIndex + 1}
                </div>

                <div className="col-span-3">
  {routeIndex === 0 && (
    <label className="text-sm">Jam</label>
  )}

  <div className="flex gap-2">
    <input
      type="time"
      name="pickup_time[]"
      className="border rounded p-2 w-full"
    />

    <select
      name="pickup_period[]"
      className="border rounded p-2"
    >
      <option value="AM">AM</option>
      <option value="PM">PM</option>
    </select>
  </div>
</div>

                <div className="col-span-6">
                  <label className="text-sm">Rute</label>
                  <input
                    name="route[]"
                    className="border rounded p-2 w-full"
                  />
                </div>

                <div className="col-span-2 text-right">
                  {day.routes.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeRoute(dayIndex, routeIndex)}
                      className="text-red-500 text-sm"
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
              className="text-blue-600 text-sm font-semibold"
            >
              + Tambah Rute
            </button>

          </div>

          {/* DESKRIPSI HARI */}
          <div>
            <label className="text-sm font-medium">
              Deskripsi Perjalanan Hari Ini
            </label>
            <textarea
              name="description[]"
              className="border rounded p-3 w-full h-28"
            />
          </div>

        </div>
      ))}

      <div className="flex gap-4">

        <button
          type="button"
          onClick={addDay}
          className="bg-gray-600 text-white px-5 py-2 rounded-lg"
        >
          + Tambah Hari
        </button>

        <button
          type="submit"
          className="bg-blue-600 text-white px-6 py-2 rounded-lg"
        >
          Simpan & Lanjut
        </button>

      </div>

    </form>
  )
}