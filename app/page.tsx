"use client"

import { useEffect, useState } from "react"
import Link from "next/link"

export default function HomePage() {
  const [packages, setPackages] = useState<any[]>([])

  useEffect(() => {
    fetch("/api/packages")
      .then(res => res.json())
      .then(data => setPackages(data))
  }, [])

  return (
    <main className="min-h-screen bg-gray-100 p-10">
      <div className="max-w-7xl mx-auto grid grid-cols-4 gap-8">

        {/* SIDEBAR FILTER */}
        <div className="col-span-1 bg-white rounded-xl shadow p-6 h-fit">
          <h2 className="text-lg font-bold mb-6">Filter</h2>

          <div className="mb-4">
            <label className="text-sm text-gray-500">Destination</label>
            <select className="w-full border rounded-lg p-2 mt-2">
              <option>Semua</option>
              <option>Bali</option>
              <option>Lombok</option>
              <option>Labuan Bajo</option>
            </select>
          </div>

          <div className="mb-4">
            <label className="text-sm text-gray-500">Durasi</label>
            <select className="w-full border rounded-lg p-2 mt-2">
              <option>Semua</option>
              <option>2D1N</option>
              <option>3D2N</option>
              <option>4D3N</option>
            </select>
          </div>
        </div>

        {/* LIST PAKET */}
        <div className="col-span-3 space-y-6">
          {packages.map((p) => (
            <div
              key={p.id}
              className="bg-white rounded-xl shadow flex overflow-hidden"
            >

              {/* IMAGE */}
              <div className="w-1/3 bg-gray-200">
                <img
                  src="https://images.unsplash.com/photo-1507525428034-b723cf961d3e"
                  alt="paket"
                  className="h-full w-full object-cover"
                />
              </div>

              {/* INFO */}
              <div className="w-1/3 p-6">
                <h2 className="text-xl font-bold mb-2">
                  {p.title}
                </h2>

                <p className="text-gray-500 mb-4">
                  {p.destination}
                </p>

                <p className="text-gray-600 text-sm">
                  {p.description}
                </p>
              </div>

              {/* PRICE + BUTTON */}
              <div className="w-1/3 border-l p-6 flex flex-col justify-center items-center">
                <p className="text-2xl font-bold text-red-600 mb-4">
                  Rp {p.price_adult.toLocaleString()}
                </p>

                <Link
                  href={`/paket/${p.slug}`}
                  className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition"
                >
                  Choose
                </Link>
              </div>

            </div>
          ))}
        </div>

      </div>
    </main>
  )
}