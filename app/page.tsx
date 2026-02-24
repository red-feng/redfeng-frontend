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
    <main style={{ padding: 40 }}>
      <h1>Semua Paket Wisata</h1>

      {packages.map((p) => (
        <div key={p.id} style={{ marginBottom: 20 }}>
          <h2>{p.title}</h2>
          <p>{p.destination}</p>
          <p>Rp {p.price_adult}</p>
          <Link href={`/paket/${p.slug}`}>
            Lihat Detail
          </Link>
        </div>
      ))}
    </main>
  )
}