"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"

export default function PaketPage() {
  const { slug } = useParams()
  const [paket, setPaket] = useState<any>(null)

  useEffect(() => {
    if (!slug) return

    fetch(`/api/packages/${slug}`)
      .then(res => res.json())
      .then(data => setPaket(data))
  }, [slug])

  if (!paket) return <div>Loading...</div>

  return (
    <main style={{ padding: 40 }}>
      <h1>{paket.title}</h1>
      <p>{paket.description}</p>
      <h3>Harga Dewasa: Rp {paket.price_adult}</h3>
      <h3>Harga Anak: Rp {paket.price_child}</h3>
    </main>
  )
}