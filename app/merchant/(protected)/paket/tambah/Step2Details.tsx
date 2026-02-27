"use client"

import { savePackageDetails } from "./actions"

export default function Step2Details({
  packageId,
}: {
  packageId: string | null
}) {
  if (!packageId) {
    return <p className="text-red-500">Package ID tidak ditemukan</p>
  }

  return (
    <form
      action={savePackageDetails}
      encType="multipart/form-data"
      className="space-y-6 max-w-3xl"
    >
      <input type="hidden" name="package_id" value={packageId} />

      <h2 className="text-xl font-semibold">
        Step 2 – Detail Konten
      </h2>

      {/* Info Tentang Tour */}
      <div>
        <label className="font-medium">Info Tentang Tour</label>
        <textarea
          name="about_tour"
          className="border p-3 w-full h-32"
          required
        />
      </div>

      {/* Standar Layanan */}
      <div>
        <label className="font-medium">
          Standar Layanan Merchant
        </label>
        <textarea
          name="service_standard"
          className="border p-3 w-full h-28"
        />
      </div>

      {/* Include */}
      <div>
        <label className="font-medium">Include</label>
        <textarea
          name="include"
          className="border p-3 w-full h-28"
          placeholder="Apa saja yang termasuk dalam paket"
        />
      </div>

      {/* Exclude */}
      <div>
        <label className="font-medium">Exclude</label>
        <textarea
          name="exclude"
          className="border p-3 w-full h-28"
          placeholder="Apa saja yang tidak termasuk"
        />
      </div>

      {/* Peralatan */}
      <div>
        <label className="font-medium">
          Peralatan & Dokumen yang Disiapkan Peserta
        </label>
        <textarea
          name="preparation"
          className="border p-3 w-full h-28"
        />
      </div>

      {/* Syarat */}
      <div>
        <label className="font-medium">
          Syarat & Ketentuan saat di lokasi
        </label>
        <textarea
          name="terms_conditions"
          className="border p-3 w-full h-28"
        />
      </div>

      {/* Meeting Point */}
      <div>
        <label className="font-medium">
          Meeting Point
        </label>
        <input
          name="meeting_point"
          className="border p-3 w-full"
          placeholder="Lokasi meeting point"
        />
      </div>

      {/* Google Map */}
      <div>
        <label className="font-medium">
          Google Maps Embed
        </label>
        <textarea
          name="map_embed"
          className="border p-3 w-full h-24"
          placeholder="<iframe src='...'></iframe>"
        />
      </div>

      {/* Tags */}
      <div>
        <label className="font-medium">
          Tags / Highlights
        </label>
        <input
          name="tags"
          className="border p-3 w-full"
          placeholder="Pisahkan dengan koma (Sunset, Family, Adventure)"
        />
      </div>

      {/* Gallery */}
      <div className="mt-6">
        <label className="block font-semibold mb-2">
          Gallery Images
        </label>

        <input
          type="file"
          name="gallery_images"
          multiple
          accept="image/*"
          className="border p-2 rounded w-full"
        />

        <p className="text-sm text-gray-500 mt-1">
          Anda bisa pilih beberapa gambar sekaligus
        </p>
      </div>

      <button
        type="submit"
        className="bg-blue-600 text-white px-6 py-2 rounded"
      >
        Simpan & Lanjut
      </button>
    </form>
  )
}