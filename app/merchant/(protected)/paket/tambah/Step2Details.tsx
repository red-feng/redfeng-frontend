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
      className="space-y-6 max-w-3xl"
    >
      <input type="hidden" name="package_id" value={packageId} />
      <input type="file" name="cover_image" accept="image/*" />
      <h2 className="text-xl font-semibold">
        Step 2 – Detail Konten
      </h2>

      <div>
        <label className="font-medium">Info Tentang Tour</label>
        <textarea
          name="about_tour"
          className="border p-3 w-full h-32"
          required
        />
      </div>

      <div>
        <label className="font-medium">Itinerary</label>
        <textarea
          name="itinerary"
          className="border p-3 w-full h-40"
          required
        />
      </div>

      <div>
        <label className="font-medium">
          Standar Layanan Merchant
        </label>
        <textarea
          name="service_standard"
          className="border p-3 w-full h-28"
        />
      </div>

      <div>
        <label className="font-medium">
          Peralatan & Dokumen yang Harus Disiapkan
        </label>
        <textarea
          name="preparation"
          className="border p-3 w-full h-28"
        />
      </div>

      <div>
        <label className="font-medium">
          Syarat & Ketentuan
        </label>
        <textarea
          name="terms_conditions"
          className="border p-3 w-full h-28"
        />
      </div>

      <div>
        <label className="font-medium">
          Embed Map (Google Maps iframe)
        </label>
        <textarea
          name="map_embed"
          className="border p-3 w-full h-24"
          placeholder="<iframe src='...'></iframe>"
        />
      </div>

<div>
  <form action={savePackageDetails} encType="multipart/form-data"></form>

  
  <label className="font-medium">Gallery Foto</label>
  <input
    type="file"
    name="gallery_images"
    accept="image/*"
    multiple
    className="border p-2 w-full"
  />
  <p className="text-sm text-gray-500">
    Bisa pilih lebih dari satu foto
  </p>
</div>

      <button className="bg-blue-600 text-white px-6 py-2 rounded">
        Simpan & Lanjut
      </button>
    </form>
  )
}