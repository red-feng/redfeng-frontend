"use client"

import { useState } from "react"
import { updatePackageStep4 } from "../../actions"
import { formatPickupTimeInput, parseStoredPickupTime } from "@/lib/time/pickupTime"

type RouteType = {
  pickupTime: string
  pickupPeriod: string
  route: string
}

type DayType = {
  day: number
  title: string
  description: string
  routes: RouteType[]
}

export default function EditStep4Itinerary({
  packageId,
  initialDays,
}: {
  packageId: string
  initialDays: Array<{
    day: number
    title: string
    description: string
    routes: Array<{
      pickup_time: string
      route: string
    }>
  }>
}) {
  const [days, setDays] = useState<DayType[]>(
    initialDays.length > 0
        ? initialDays.map((day) => ({
            day: day.day,
            title: day.title,
            description: day.description,
            routes: day.routes.length > 0
            ? day.routes.map((route) => ({
                ...parseStoredPickupTime(route.pickup_time || ""),
                route: route.route || "",
              }))
            : [{ pickupTime: "", pickupPeriod: "AM", route: "" }],
        }))
      : [{ day: 1, title: "", description: "", routes: [{ pickupTime: "", pickupPeriod: "AM", route: "" }] }],
  )

  const addDay = () => {
    setDays((prev) => [
      ...prev,
      { day: prev.length + 1, title: "", description: "", routes: [{ pickupTime: "", pickupPeriod: "AM", route: "" }] },
    ])
  }

  const removeDay = (dayIndex: number) => {
    const filtered = days.filter((_, index) => index !== dayIndex)
    setDays(filtered.map((day, index) => ({ ...day, day: index + 1 })))
  }

  const addRoute = (dayIndex: number) => {
    setDays((prev) => {
      const updated = [...prev]
      updated[dayIndex].routes.push({ pickupTime: "", pickupPeriod: "AM", route: "" })
      return updated
    })
  }

  const removeRoute = (dayIndex: number, routeIndex: number) => {
    setDays((prev) => {
      const updated = [...prev]
      updated[dayIndex].routes = updated[dayIndex].routes.filter((_, index) => index !== routeIndex)
      return updated
    })
  }

  const updateField = (dayIndex: number, field: "title" | "description", value: string) => {
    setDays((prev) => {
      const updated = [...prev]
      updated[dayIndex] = { ...updated[dayIndex], [field]: value }
      return updated
    })
  }

  const updateRouteField = (dayIndex: number, routeIndex: number, field: keyof RouteType, value: string) => {
    setDays((prev) => {
      const updated = [...prev]
      updated[dayIndex].routes[routeIndex] = {
        ...updated[dayIndex].routes[routeIndex],
        [field]: field === "pickupTime" ? formatPickupTimeInput(value) : value,
      }
      return updated
    })
  }

  return (
    <form action={updatePackageStep4} className="space-y-12">
      <input type="hidden" name="package_id" value={packageId} />

      {days.map((day, dayIndex) => (
        <div key={dayIndex} className="space-y-8 rounded-2xl border border-slate-200 bg-slate-50 p-8">
          <div className="flex items-center justify-between">
            <div className="flex flex-1 flex-col gap-3 md:flex-row md:items-center">
              <h3 className="text-xl font-semibold text-slate-800">Hari ke {day.day}</h3>
              <input
                name="day_title[]"
                value={day.title}
                onChange={(event) => updateField(dayIndex, "title", event.target.value)}
                placeholder="Judul"
                className="w-full max-w-xl rounded-xl border p-3 text-sm outline-none focus:ring-2 focus:ring-orange-400"
              />
            </div>
            {days.length > 1 && (
              <button
                type="button"
                onClick={() => removeDay(dayIndex)}
                className="text-sm font-medium text-red-500 hover:underline"
              >
                Hapus Hari
              </button>
            )}
          </div>

          <div className="space-y-6">
            {day.routes.map((route, routeIndex) => (
              <div key={routeIndex} className="grid grid-cols-12 items-end gap-4">
                <input type="hidden" name="day_number[]" value={day.day} />

                <div className="col-span-1 text-sm font-semibold text-slate-400">#{routeIndex + 1}</div>

                <div className="col-span-3">
                  {routeIndex === 0 && <label className="text-sm font-medium text-slate-600">Jam</label>}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      name="pickup_time[]"
                      value={route.pickupTime}
                      onChange={(event) => updateRouteField(dayIndex, routeIndex, "pickupTime", event.target.value)}
                      placeholder=""
                      inputMode="numeric"
                      maxLength={5}
                      className="w-full rounded-xl border p-3 outline-none focus:ring-2 focus:ring-orange-400"
                    />
                    <select
                      name="pickup_period[]"
                      value={route.pickupPeriod}
                      onChange={(event) => updateRouteField(dayIndex, routeIndex, "pickupPeriod", event.target.value)}
                      className="rounded-xl border p-3 outline-none focus:ring-2 focus:ring-orange-400"
                    >
                      <option value="AM">AM</option>
                      <option value="PM">PM</option>
                    </select>
                  </div>
                </div>

                <div className="col-span-6">
                  {routeIndex === 0 && <label className="text-sm font-medium text-slate-600">Rute</label>}
                  <input
                    name="route[]"
                    value={route.route}
                    onChange={(event) => updateRouteField(dayIndex, routeIndex, "route", event.target.value)}
                    className="w-full rounded-xl border p-3 outline-none focus:ring-2 focus:ring-orange-400"
                  />
                </div>

                <div className="col-span-2 text-right">
                  {day.routes.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeRoute(dayIndex, routeIndex)}
                      className="text-sm font-medium text-red-500 hover:underline"
                    >
                      Hapus
                    </button>
                  )}
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={() => addRoute(dayIndex)}
              className="font-semibold text-orange-500 hover:underline"
            >
              + Tambah Rute
            </button>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-600">Deskripsi Perjalanan Hari Ini</label>
            <textarea
              name="description[]"
              value={day.description}
              onChange={(event) => updateField(dayIndex, "description", event.target.value)}
              className="mt-2 h-32 w-full rounded-xl border p-4 outline-none focus:ring-2 focus:ring-orange-400"
            />
          </div>
        </div>
      ))}

      <div className="flex flex-wrap gap-4 pt-4">
        <button
          type="button"
          onClick={addDay}
          className="rounded-2xl bg-slate-700 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          + Tambah Hari
        </button>
        <a
          href={`?step=3`}
          className="rounded-2xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-orange-300 hover:text-orange-600"
        >
          Kembali
        </a>
        <button
          type="submit"
          className="rounded-2xl bg-gradient-to-r from-orange-500 via-orange-400 to-orange-300 px-8 py-3 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(249,115,22,0.4)] transition-all duration-300 hover:scale-105"
        >
          Simpan & Kirim Review
        </button>
      </div>
    </form>
  )
}
