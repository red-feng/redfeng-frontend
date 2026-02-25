"use client"

import { useEffect, useState } from "react"
import Link from "next/link"

export default function HomePage() {

  // ========================
  // FILTER STATE
  // ========================
  const [packages, setPackages] = useState<any[]>([])
  const [destination, setDestination] = useState("Semua")
  const [duration, setDuration] = useState("Semua")
  const [sort, setSort] = useState("")
  const [page, setPage] = useState(1)

  // ========================
  // FETCH DATA
  // ========================
  useEffect(() => {
    const params = new URLSearchParams({
      destination,
      duration,
      sort,
      page: page.toString(),
    })

    fetch(`/api/packages?${params}`)
      .then(res => res.json())
      .then(result => {
        setPackages(result.data || [])
      })
  }, [destination, duration, sort, page])

  return (
    <main className="min-h-screen bg-gray-100 p-10">
      <div className="max-w-7xl mx-auto grid grid-cols-4 gap-8">

        {/* SIDEBAR FILTER */}
        <div className="col-span-1 bg-white rounded-xl shadow p-6 h-fit">
          <h2 className="text-lg font-bold mb-6">Filter</h2>

          {/* Destination */}
          <div className="mb-4">
            <label className="text-sm text-gray-500">Destination</label>
            <select
              value={destination}
              onChange={(e) => {
                setDestination(e.target.value)
                setPage(1)
              }}
              className="w-full border rounded-lg p-2 mt-2"
            >
              <option>Semua</option>
              <option>Bali</option>
              <option>Lombok</option>
              <option>Labuan Bajo</option>
            </select>
          </div>

          {/* Duration */}
          <div className="mb-4">
            <label className="text-sm text-gray-500">Durasi</label>
            <select
              value={duration}
              onChange={(e) => {
                setDuration(e.target.value)
                setPage(1)
              }}
              className="w-full border rounded-lg p-2 mt-2"
            >
              <option>Semua</option>
              <option>2D1N</option>
              <option>3D2N</option>
              <option>4D3N</option>
            </select>
          </div>

          {/* Sorting */}
          <div className="mb-4">
            <label className="text-sm text-gray-500">Urutkan</label>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="w-full border rounded-lg p-2 mt-2"
            >
              <option value="">Default</option>
              <option value="price_asc">Harga Terendah</option>
              <option value="price_desc">Harga Tertinggi</option>
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

              {/* PRICE */}
              <div className="w-1/3 border-l p-6 flex flex-col justify-center items-center">
                <p className="text-2xl font-bold text-red-600 mb-4">
                  Rp {p.price_adult?.toLocaleString()}
                </p>

                <Link
  href={`/packages/${p.slug}`}
  className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition"
>
  Choose
</Link>
              </div>

            </div>
          ))}

          {/* PAGINATION */}
          <div className="flex gap-2 mt-6">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-4 py-2 bg-gray-300 rounded"
            >
              Prev
            </button>

            <span className="px-4 py-2">
              Page {page}
            </span>

            <button
              onClick={() => setPage((p) => p + 1)}
              className="px-4 py-2 bg-gray-300 rounded"
            >
              Next
            </button>
          </div>

        </div>
      </div>
    </main>
  )
}