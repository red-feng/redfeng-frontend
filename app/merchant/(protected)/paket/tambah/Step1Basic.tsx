"use client"

import { createPackage } from "./actions"
import Image from "next/image"

export default function Step1Basic() {
  return (
    <div className="min-h-screen bg-gray-300">

      {/* HEADER LOGO */}
      <div className="p-6">
        <Image
          src="/logo-redfeng.png"  // pastikan file ada di /public
          alt="Red Feng"
          width={160}
          height={60}
        />
      </div>

      {/* CONTENT WRAPPER */}
      <div className="flex justify-center items-center px-6 pb-20">

        <div className="w-full max-w-3xl bg-white rounded-2xl shadow-xl p-10">

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

            {/* Nama Paket */}
            <input
              name="title"
              placeholder="Nama Paket"
              className="border rounded-lg p-3 w-full outline-none focus:ring-2 focus:ring-blue-400"
              required
            />

            {/* Travel Style */}
            <select
              name="travel_style"
              className="border rounded-lg p-3 w-full outline-none focus:ring-2 focus:ring-blue-400"
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

            {/* GRID 2 KOLOM */}
            <div className="grid grid-cols-2 gap-4">

              <input
                name="province"
                placeholder="Provinsi"
                className="border rounded-lg p-3 w-full outline-none focus:ring-2 focus:ring-blue-400"
                required
              />

              <input
                name="minimal_peserta"
                type="number"
                placeholder="Minimal Peserta"
                className="border rounded-lg p-3 w-full outline-none focus:ring-2 focus:ring-blue-400"
                required
              />

              <input
                name="duration"
                type="number"
                placeholder="Durasi (hari)"
                className="border rounded-lg p-3 w-full outline-none focus:ring-2 focus:ring-blue-400"
                required
              />

              <input
                name="price_adult"
                type="number"
                placeholder="Harga Dewasa"
                className="border rounded-lg p-3 w-full outline-none focus:ring-2 focus:ring-blue-400"
                required
              />

              <input
                name="price_child"
                type="number"
                placeholder="Harga Anak"
                className="border rounded-lg p-3 w-full outline-none focus:ring-2 focus:ring-blue-400"
              />

              <select
                name="currency"
                className="border rounded-lg p-3 w-full outline-none focus:ring-2 focus:ring-blue-400"
                defaultValue="IDR"
              >
                <option value="IDR">IDR</option>
                <option value="USD">USD</option>
                <option value="SGD">SGD</option>
                <option value="MYR">MYR</option>
                <option value="CNY">CNY</option>
                <option value="THB">THB</option>
                <option value="JPY">JPY</option>
                <option value="KRW">KRW</option>
              </select>

              <select
                name="default_language"
                className="border rounded-lg p-3 w-full col-span-2 outline-none focus:ring-2 focus:ring-blue-400"
                defaultValue="id"
                required
              >
                <option value="id">Bahasa Indonesia</option>
                <option value="en">English</option>
                <option value="zh">Chinese (中文)</option>
                <option value="ms">Malay</option>
                <option value="th">Thai (ไทย)</option>
                <option value="ja">Japanese (日本語)</option>
                <option value="ko">Korean (한국어)</option>
              </select>

            </div>

            {/* FOTO */}
            <div>
              <label className="block font-medium mb-2">
                Foto Sampul
              </label>
              <input
                type="file"
                name="cover_image"
                accept="image/*"
                className="border rounded-lg p-3 w-full"
                required
              />
            </div>

            {/* BUTTON */}
            <div className="flex justify-center pt-6">
              <button
                type="submit"
                className="px-12 py-3 rounded-xl text-white font-semibold bg-gradient-to-r from-blue-600 to-blue-400 shadow-md hover:opacity-90 transition"
              >
                Simpan & Lanjut
              </button>
            </div>

          </form>

        </div>

      </div>
    </div>
  )
}