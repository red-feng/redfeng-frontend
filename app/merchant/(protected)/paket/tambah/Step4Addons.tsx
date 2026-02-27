"use client"

import { useState } from "react"
import { saveAddons } from "./actions"

export default function Step4Addons({
  packageId,
}: {
  packageId: string | null
}) {
  const [addons, setAddons] = useState([
    { name: "", price: "" },
  ])

  if (!packageId) {
    return <p className="text-red-500">Package ID tidak ditemukan</p>
  }

  const addAddonField = () => {
    setAddons([...addons, { name: "", price: "" }])
  }

  return (
    <form action={saveAddons} className="space-y-6">
      <input type="hidden" name="package_id" value={packageId} />

      <h2 className="text-xl font-semibold">
        Step 4 – Add-ons (Opsional)
      </h2>

      {addons.map((addon, index) => (
        <div key={index} className="flex gap-4">
          <input
            name="addon_name[]"
            placeholder="Nama Add-on (Honeymoon, Private Guide, dll)"
            className="border p-2 w-1/2"
          />

          <input
            name="addon_price[]"
            type="number"
            placeholder="Harga"
            className="border p-2 w-1/2"
          />
        </div>
      ))}

<div>
  <label className="font-medium">Foto Gallery</label>
  <input
    type="file"
    name="gallery_images"
    accept="image/*"
    multiple
    className="border p-2 w-full"
  />
</div>


      <button
        type="button"
        onClick={addAddonField}
        className="bg-gray-500 text-white px-4 py-2 rounded"
      >
        + Tambah Add-on
      </button>



      <div>
        <button className="bg-blue-600 text-white px-6 py-2 rounded">
          Simpan & Lanjut
        </button>
      </div>
    </form>
  )
}

