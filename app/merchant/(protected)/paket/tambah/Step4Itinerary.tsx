"use client"

import { useState } from "react"
import { saveItinerary } from "./actions"

type RouteType = {
  pickup: string
  route: string
  description: string
}

type DayType = {
  day: number
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
      routes: [{ pickup: "", route: "", description: "" }]
    }
  ])

  if (!packageId) {
    return <p className="text-red-500">Package ID tidak ditemukan</p>
  }

  const addDay = () => {
    setDays((prev) => [
      ...prev,
      {
        day: prev.length + 1,
        routes: [{ pickup: "", route: "", description: "" }]
      }
    ])
  }

  const addRoute = (dayIndex: number) => {
    setDays((prev) => {
      const updated = [...prev]
      updated[dayIndex] = {
        ...updated[dayIndex],
        routes: [
          ...updated[dayIndex].routes,
          { pickup: "", route: "", description: "" }
        ]
      }
      return updated
    })
  }

  return (
    <form action={saveItinerary} className="space-y-6">

      <input type="hidden" name="package_id" value={packageId} />

      <h2 className="text-xl font-semibold">
        Step 4 – Itinerary
      </h2>

      {days.map((day, dayIndex) => (
        <div key={dayIndex} className="border p-4 rounded space-y-4">

          <div className="font-semibold">
            Hari ke : {day.day}
          </div>

          {day.routes.map((_, routeIndex) => (
            <div
              key={routeIndex}
              className="grid grid-cols-12 gap-4 items-start"
            >

              <input
                type="hidden"
                name="day_number[]"
                value={day.day}
              />

              <div className="col-span-2">
                <label>Waktu pick up</label>
                <input
                  name="pickup_time[]"
                  className="border p-2 w-full"
                />
              </div>

              <div className="col-span-4">
                <label>Rute</label>
                <input
                  name="route[]"
                  className="border p-2 w-full"
                />
              </div>

              <div className="col-span-5">
                <label>Deskripsi perjalanan</label>
                <textarea
                  name="description[]"
                  className="border p-2 w-full h-24"
                />
              </div>

              <div className="col-span-1 flex items-end">
                <button
                  type="button"
                  onClick={() => addRoute(dayIndex)}
                  className="text-xl font-bold"
                >
                  +
                </button>
              </div>

            </div>
          ))}

        </div>
      ))}

      <button
        type="button"
        onClick={addDay}
        className="bg-gray-600 text-white px-4 py-2 rounded"
      >
        + Tambah
      </button>

      <button
        type="submit"
        className="bg-blue-600 text-white px-6 py-2 rounded"
      >
        Simpan & Lanjut
      </button>

    </form>
  )
}