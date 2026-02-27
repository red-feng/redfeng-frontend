"use client"

import { createPackage } from "./actions"

export default function Step1Basic() {
  return (
      <form action={createPackage}encType="multipart/form-data"className="space-y-4 max-w-xl">
      <h2 className="text-xl font-semibold">Step 1 – Basic Info</h2>

      <input
        name="title"
        placeholder="Nama Paket"
        className="border p-2 w-full"
        required
      />

      <input
        name="country"
        placeholder="Country (Indonesia, Singapore, etc)"
        className="border p-2 w-full"
        required
      />

      <input
        name="city"
        placeholder="City (Bali, Kuala Lumpur, etc)"
        className="border p-2 w-full"
        required
      />

      <input
        name="duration"
        type="number"
        placeholder="Durasi (hari)"
        className="border p-2 w-full"
        required
      />

      <input
        name="price_adult"
        type="number"
        placeholder="Harga Dewasa"
        className="border p-2 w-full"
        required
      />

      <input
        name="price_child"
        type="number"
        placeholder="Harga Anak"
        className="border p-2 w-full"
      />

      <select
        name="currency"
        className="border p-2 w-full"
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

      {/* 🌏 Default Language (Asia Ready) */}
      <select
        name="default_language"
        className="border p-2 w-full"
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

      <div>
        <label className="font-medium">Foto Sampul</label>
        <input
        type="file"
        name="cover_image"
        accept="image/*"
        className="border p-2 w-full"
        required
      />
      </div>
      <button
      type="submit"
      className="bg-blue-600 text-white px-4 py-2 rounded"
>
        Simpan & Lanjut
      </button>
    </form>
  )
}