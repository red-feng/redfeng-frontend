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
      <h1 className="text-3xl font-bold mb-8">
        Semua Paket Wisata
      </h1>

      <div className="grid md:grid-cols-3 gap-6">
        {packages.map((p) => (
          <div
            key={p.id}
            className="bg-white rounded-2xl shadow-md p-6 hover:shadow-xl transition"
          >
            <h2 className="text-xl font-semibold mb-2">
              {p.title}
            </h2>

            <p className="text-gray-500 mb-4">
              {p.destination}
            </p>

            <p className="text-lg font-bold text-red-600 mb-4">
              Rp {p.price_adult.toLocaleString()}
            </p>

            <Link
              href={`/paket/${p.slug}`}
              className="block text-center bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 transition"
            >
              Lihat Detail
            </Link>
          </div>
        ))}
      </div>
    </main>
  )
}