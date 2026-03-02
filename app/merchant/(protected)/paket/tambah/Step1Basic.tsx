"use client"

import { useEffect, useState } from "react"
import { createPackage } from "./actions"

type Country = {
  id: string
  name: string
}

type Province = {
  id: string
  name: string
}

export default function Step1Basic({ countries }: { countries: Country[] }) {
  const [originCountry, setOriginCountry] = useState("")
  const [originProvinces, setOriginProvinces] = useState<Province[]>([])

  const [destinationCountry, setDestinationCountry] = useState("")
  const [destinationProvinces, setDestinationProvinces] = useState<Province[]>([])

  // Fetch Origin Provinces
  useEffect(() => {
    if (!originCountry) {
      setOriginProvinces([])
      return
    }

    fetch(`/api/provinces?country_id=${originCountry}`)
      .then(res => res.json())
      .then(data => setOriginProvinces(data))
  }, [originCountry])

  // Fetch Destination Provinces
  useEffect(() => {
    if (!destinationCountry) {
      setDestinationProvinces([])
      return
    }

    fetch(`/api/provinces?country_id=${destinationCountry}`)
      .then(res => res.json())
      .then(data => setDestinationProvinces(data))
  }, [destinationCountry])

  return (
    <form action={createPackage} className="space-y-6">

      {/* ORIGIN */}
      <div>
        <h3 className="font-semibold mb-2">Keberangkatan</h3>

        <select
          name="origin_country_id"
          value={originCountry}
          onChange={(e) => {
            setOriginCountry(e.target.value)
          }}
          className="border p-3 w-full rounded mb-3"
          required
        >
          <option value="">Pilih Negara Keberangkatan</option>
          {countries.map(c => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        <select
          name="origin_province_id"
          className="border p-3 w-full rounded"
          disabled={!originCountry}
          required
        >
          <option value="">Pilih Provinsi</option>
          {originProvinces.map(p => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      {/* DESTINATION */}
      <div>
        <h3 className="font-semibold mb-2">Tujuan</h3>

        <select
          name="destination_country_id"
          value={destinationCountry}
          onChange={(e) => {
            setDestinationCountry(e.target.value)
          }}
          className="border p-3 w-full rounded mb-3"
          required
        >
          <option value="">Pilih Negara Tujuan</option>
          {countries.map(c => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        <select
          name="destination_province_id"
          className="border p-3 w-full rounded"
          disabled={!destinationCountry}
          required
        >
          <option value="">Pilih Provinsi</option>
          {destinationProvinces.map(p => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      {/* CURRENCY */}
      <select
        name="currency"
        defaultValue="IDR"
        className="border p-3 w-full rounded"
      >
        <option value="IDR">IDR</option>
        <option value="USD">USD</option>
        <option value="CNY">CNY</option>
      </select>

      <button
        type="submit"
        className="bg-orange-500 text-white px-6 py-3 rounded"
      >
        Simpan & Lanjut
      </button>
    </form>
  )
}