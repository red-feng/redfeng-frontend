"use client"

import { useEffect, useState } from "react"
import { createPackage } from "./actions"
import Image from "next/image"

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
  
  const [destinationCountry, setDestinationCountry] = useState("")
  

  

  return (
    <div className="relative min-h-screen">

      {/* BACKGROUND */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url('/bg-wizard.png')" }}
      />

      <div className="relative z-10">

        {/* HEADER LOGO */}
        <div className="px-8 py-6">
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
<h1 className="text-red-500">TEST DEPLOY</h1>
        {/* CONTENT WRAPPER */}
        <div className="flex justify-center px-8 pb-28">

          <div className="w-full max-w-5xl bg-white rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] p-14">

            <h1 className="text-2xl font-bold mb-1">
              Buat Paket Baru
            </h1>

            <p className="text-gray-500 mb-8">
              Step 1 – Basic Info
            </p>

            <form
              action={createPackage}
              encType="multipart/form-data"
              className="space-y-6"
            >

             <div className="grid grid-cols-2 gap-4">

  {/* NAMA PAKET */}
  <input
    name="title"
    placeholder="Nama Paket"
    className="border rounded-lg p-3 w-full col-span-2 outline-none focus:ring-2 focus:ring-blue-400"
    required
  />

  {/* TRAVEL STYLE */}
  <select
    name="travel_style"
    className="border rounded-lg p-3 w-full col-span-2 outline-none focus:ring-2 focus:ring-blue-400"
    required
  >
    <option value="">Pilih Travel Style</option>
    <option value="explore">Explore</option>
    <option value="adventure">Adventure</option>
    <option value="family">Family</option>
    <option value="luxury">Luxury</option>
    <option value="honeymoon">Honeymoon</option>
    <option value="wellness">Wellness</option>
    <option value="religious">Religious</option>
    <option value="budget">Budget</option>
    <option value="group">Group</option>
    <option value="solo">Solo</option>
  </select>

  {/* ===== ORIGIN ===== */}
  <div className="col-span-2 font-semibold pt-2">
    Keberangkatan
  </div>

  <select
  name="origin_country_id"
  value={originCountry}
  onChange={(e) => setOriginCountry(e.target.value)}
  className="border rounded-lg p-3 w-full outline-none focus:ring-2 focus:ring-blue-400"
  required
>
  <option value="">Pilih Negara Keberangkatan</option>
  {countries.map(c => (
    <option key={c.id} value={c.id}>{c.name}</option>
  ))}
</select>

<input
  name="origin_province"
  placeholder="Provinsi Keberangkatan"
  className="border rounded-lg p-3 w-full outline-none focus:ring-2 focus:ring-blue-400"
  required
/>

  {/* ===== DESTINATION ===== */}
<div className="col-span-2 font-semibold pt-6">
  Tujuan
</div>

<select
  name="destination_country_id"
  value={destinationCountry}
  onChange={(e) => setDestinationCountry(e.target.value)}
  className="border rounded-lg p-3 w-full outline-none focus:ring-2 focus:ring-blue-400"
  required
>
  <option value="">Pilih Negara Tujuan</option>
  {countries.map((c) => (
    <option key={c.id} value={c.id}>
      {c.name}
    </option>
  ))}
</select>

<input
  name="destination_province"
  placeholder="Provinsi Tujuan"
  className="border rounded-lg p-3 w-full outline-none focus:ring-2 focus:ring-blue-400"
  required
/>

  {/* MINIMAL PESERTA */}
  <input
    name="minimal_peserta"
    type="number"
    placeholder="Minimal Peserta"
    className="border rounded-lg p-3 w-full outline-none focus:ring-2 focus:ring-blue-400"
    required
  />

  {/* DURASI */}
  <input
    name="duration_days"
    type="number"
    placeholder="Durasi (hari)"
    className="border rounded-lg p-3 w-full outline-none focus:ring-2 focus:ring-blue-400"
    required
  />

  {/* HARGA DEWASA */}
  <input
    name="price_adult"
    type="number"
    placeholder="Harga Dewasa"
    className="border rounded-lg p-3 w-full outline-none focus:ring-2 focus:ring-blue-400"
    required
  />

  {/* HARGA ANAK */}
  <input
    name="price_child"
    type="number"
    placeholder="Harga Anak"
    className="border rounded-lg p-3 w-full outline-none focus:ring-2 focus:ring-blue-400"
  />

  {/* CURRENCY */}
  <select
    name="currency"
    defaultValue="IDR"
    className="border rounded-lg p-3 w-full outline-none focus:ring-2 focus:ring-blue-400"
  >
    <option value="IDR">IDR</option>
    <option value="USD">USD</option>
    <option value="CNY">CNY</option>
  </select>

  {/* DEFAULT LANGUAGE */}
  <select
    name="default_language"
    className="border rounded-lg p-3 w-full col-span-2 outline-none focus:ring-2 focus:ring-blue-400"
    defaultValue="id"
    required
  >
    <option value="id">Bahasa Indonesia</option>
    <option value="en">English</option>
    <option value="zh">Chinese</option>
  </select>

</div>

              <div className="flex justify-center pt-6">
                <button
                  type="submit"
                  className="px-12 py-3 rounded-xl font-semibold 
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