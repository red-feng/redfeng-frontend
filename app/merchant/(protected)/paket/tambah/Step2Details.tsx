"use client"

import { savePackageDetails } from "./actions"
import Image from "next/image"

export default function Step2Details({
  packageId,
}: {
  packageId: string | null
}) {
  if (!packageId) {
    return <p className="text-red-500">Package ID tidak ditemukan</p>
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-blue-100 to-slate-400">

      {/* HEADER LOGO */}
      <div className="px-10 py-8">
  <Image
    src="/logo-redfeng.png"
    alt="Red Feng"
    width={0}
    height={0}
    sizes="100vw"
    className="h-25 w-auto"
    priority
  />
</div>

      {/* CONTENT WRAPPER */}
      <div className="flex justify-center px-6 pb-20">

        <div className="w-full max-w-3xl bg-white rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] p-14">

          <h1 className="text-2xl font-bold mb-1">
            Buat Paket Baru
          </h1>

          <p className="text-gray-500 mb-8">
            Step 2 – Detail Konten
          </p>

          <form
            action={savePackageDetails}
            encType="multipart/form-data"
            className="space-y-6"
          >
            <input type="hidden" name="package_id" value={packageId} />

            {/* Info Tentang Tour */}
            <div>
              <label className="block font-medium mb-2">
                Info Tentang Tour
              </label>
              <textarea
                name="about_tour"
                className="border rounded-lg p-3 w-full h-32 focus:ring-2 focus:ring-orange-400 outline-none"
                required
              />
            </div>

            {/* Standar Layanan */}
            <div>
              <label className="block font-medium mb-2">
                Standar Layanan Merchant
              </label>
              <textarea
                name="service_standard"
                className="border rounded-lg p-3 w-full h-28 focus:ring-2 focus:ring-orange-400 outline-none"
              />
            </div>

            {/* Include */}
            <div>
              <label className="block font-medium mb-2">
                Include
              </label>
              <textarea
                name="include"
                className="border rounded-lg p-3 w-full h-28 focus:ring-2 focus:ring-orange-400 outline-none"
                placeholder="Apa saja yang termasuk dalam paket"
              />
            </div>

            {/* Exclude */}
            <div>
              <label className="block font-medium mb-2">
                Exclude
              </label>
              <textarea
                name="exclude"
                className="border rounded-lg p-3 w-full h-28 focus:ring-2 focus:ring-orange-400 outline-none"
                placeholder="Apa saja yang tidak termasuk"
              />
            </div>

            {/* Peralatan */}
            <div>
              <label className="block font-medium mb-2">
                Peralatan & Dokumen yang Disiapkan Peserta
              </label>
              <textarea
                name="preparation"
                className="border rounded-lg p-3 w-full h-28 focus:ring-2 focus:ring-orange-400 outline-none"
              />
            </div>

            {/* Syarat */}
            <div>
              <label className="block font-medium mb-2">
                Syarat & Ketentuan saat di lokasi
              </label>
              <textarea
                name="terms_conditions"
                className="border rounded-lg p-3 w-full h-28 focus:ring-2 focus:ring-orange-400 outline-none"
              />
            </div>

            {/* Meeting Point */}
            <div>
              <label className="block font-medium mb-2">
                Meeting Point
              </label>
              <input
                name="meeting_point"
                className="border rounded-lg p-3 w-full focus:ring-2 focus:ring-orange-400 outline-none"
                placeholder="Lokasi meeting point"
              />
            </div>

            {/* Google Map */}
            <div>
              <label className="block font-medium mb-2">
                Embedding tourist destinations on Google Maps
              </label>
              <textarea
                name="map_embed"
                className="border rounded-lg p-3 w-full h-24 focus:ring-2 focus:ring-orange-400 outline-none"
                placeholder="<iframe src='...'></iframe>"
              />
            </div>

            {/* Tags */}
            <div>
              <label className="block font-medium mb-2">
                Tags / Highlights
              </label>
              <input
                name="tags"
                className="border rounded-lg p-3 w-full focus:ring-2 focus:ring-orange-400 outline-none"
                placeholder="Pisahkan dengan koma (Sunset, Family, Adventure)"
              />
            </div>

            {/* Gallery */}
            <div>
              <label className="block font-medium mb-2">
                Gallery Images
              </label>

              <input
                type="file"
                name="gallery_images"
                multiple
                accept="image/*"
                className="border rounded-lg p-3 w-full"
              />

              <p className="text-sm text-gray-500 mt-1">
                Anda bisa pilih beberapa gambar sekaligus
              </p>
            </div>

            {/* BUTTON */}
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
  )
}