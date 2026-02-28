"use client"

import { createPackage } from "./actions"

export default function Step1Basic() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-200 via-gray-300 to-gray-400 p-6">

      <div className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl p-10">

        <h1 className="text-3xl font-bold mb-2">
          Buat Paket Baru
        </h1>

        <h2 className="text-gray-600 mb-8">
          Step 1 – Basic Info
        </h2>

        <form
          action={createPackage}
          encType="multipart/form-data"
          className="space-y-6"
        >

          {/* Nama Paket */}
          <input
            name="title"
            placeholder="Nama Paket"
            className="border rounded-lg p-3 w-full focus:ring-2 focus:ring-blue-400 outline-none"
            required
          />

          {/* Travel Style */}
          <select
            name="travel_style"
            className="border rounded-lg p-3 w-full focus:ring-2 focus:ring-blue-400 outline-none"
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

          {/* Grid 2 Kolom */}
          <div className="grid grid-cols-2 gap-4">

            <input
              name="province"
              placeholder="Provinsi"
              className="border rounded-lg p-3 w-full focus:ring-2 focus:ring-blue-400 outline-none"
              required
            />

            <input
              name="minimal_peserta"
              type="number"
              placeholder="Minimal Peserta"
              className="border rounded-lg p-3 w-full focus:ring-2 focus:ring-blue-400 outline-none"
              required
            />

            <input
              name="duration"
              type="number"
              placeholder="Durasi (hari)"
              className="border rounded-lg p-3 w-full focus:ring-2 focus:ring-blue-400 outline-none"
              required
            />

            <input
              name="price_adult"
              type="number"
              placeholder="Harga Dewasa"
              className="border rounded-lg p-3 w-full focus:ring-2 focus:ring-blue-400 outline-none"
              required
            />

            <input
              name="price_child"
              type="number"
              placeholder="Harga Anak"
              className="border rounded-lg p-3 w-full focus:ring-2 focus:ring-blue-400 outline-none"
            />

            <select
              name="currency"
              className="border rounded-lg p-3 w-full focus:ring-2 focus:ring-blue-400 outline-none"
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
              className="border rounded-lg p-3 w-full focus:ring-2 focus:ring-blue-400 outline-none col-span-2"
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

          {/* Foto */}
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

          {/* Button */}
          <div className="pt-4 flex justify-center">
            <button
              type="submit"
              className="px-10 py-3 rounded-xl text-white font-semibold bg-gradient-to-r from-blue-600 to-blue-400 hover:opacity-90 shadow-lg transition"
            >
              Simpan & Lanjut
            </button>
          </div>

        </form>

      </div>
    </div>
  )
}