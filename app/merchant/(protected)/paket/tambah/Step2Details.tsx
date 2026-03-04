"use client"

import { ChangeEvent, FormEvent, useState } from "react"
import { savePackageDetails } from "./actions"
import Image from "next/image"

const MAX_GALLERY_BYTES = 18 * 1024 * 1024

export default function Step2Details({
  packageId,
}: {
  packageId: string | null
}) {
  const [uploadError, setUploadError] = useState<string | null>(null)

  const validateSelectedFiles = (files: FileList | null): boolean => {
    if (!files || files.length === 0) {
      setUploadError(null)
      return true
    }

    const totalBytes = Array.from(files).reduce((sum, file) => sum + file.size, 0)
    if (totalBytes > MAX_GALLERY_BYTES) {
      setUploadError("file gambar terlalu besar")
      return false
    }

    setUploadError(null)
    return true
  }

  const handleGalleryChange = (event: ChangeEvent<HTMLInputElement>) => {
    const isValid = validateSelectedFiles(event.target.files)
    if (!isValid) {
      event.target.value = ""
    }
  }

  const validateGallerySize = (event: FormEvent<HTMLFormElement>) => {
    const form = event.currentTarget
    const fileInput = form.elements.namedItem("gallery_images") as HTMLInputElement | null
    const isValid = validateSelectedFiles(fileInput?.files ?? null)
    if (!isValid) {
      event.preventDefault()
      if (fileInput) fileInput.value = ""
    }
  }

  if (!packageId) {
    return <p className="text-red-500">Package ID tidak ditemukan</p>
  }

  return (
    <div className="relative min-h-screen">

      {/* BACKGROUND IMAGE */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: "url('/bg-wizard.png')"
        }}
      />

     
      {/* CONTENT */}
      <div className="relative z-10">

        {/* HEADER LOGO */}
        <div className="px-10 py-8">
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

        {/* CONTENT WRAPPER */}
       <div className="flex justify-center px-8 pb-28">
        
          <div className="w-full max-w-5xl bg-white rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] p-14">

            <h1 className="text-2xl font-bold mb-1">
              Buat Paket Baru
            </h1>

            <p className="text-gray-500 mb-10">
              Step 2 – Detail Konten
            </p>

            <form
              action={savePackageDetails}
              encType="multipart/form-data"
              onSubmit={validateGallerySize}
              className="space-y-8"
            >
              <input type="hidden" name="package_id" value={packageId} />

              {/* Info Tentang Tour */}
              <div>
                <label className="block font-medium mb-2">
                  Info Tentang Tour
                </label>
                <textarea
                  name="about_tour"
                  className="border rounded-lg p-4 w-full h-36 focus:ring-2 focus:ring-orange-400 outline-none"
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
                  className="border rounded-lg p-4 w-full h-28 focus:ring-2 focus:ring-orange-400 outline-none"
                />
              </div>

              {/* Include */}
              <div>
                <label className="block font-medium mb-2">
                  Include
                </label>
                <textarea
                  name="include"
                  className="border rounded-lg p-4 w-full h-28 focus:ring-2 focus:ring-orange-400 outline-none"
                />
              </div>

              {/* Exclude */}
              <div>
                <label className="block font-medium mb-2">
                  Exclude
                </label>
                <textarea
                  name="exclude"
                  className="border rounded-lg p-4 w-full h-28 focus:ring-2 focus:ring-orange-400 outline-none"
                />
              </div>

              {/* Peralatan */}
              <div>
                <label className="block font-medium mb-2">
                  Peralatan & Dokumen yang Disiapkan Peserta
                </label>
                <textarea
                  name="preparation"
                  className="border rounded-lg p-4 w-full h-28 focus:ring-2 focus:ring-orange-400 outline-none"
                />
              </div>

              {/* Syarat */}
              <div>
                <label className="block font-medium mb-2">
                  Syarat & Ketentuan saat di lokasi
                </label>
                <textarea
                  name="terms_conditions"
                  className="border rounded-lg p-4 w-full h-28 focus:ring-2 focus:ring-orange-400 outline-none"
                />
              </div>

              {/* Meeting Point */}
              <div>
                <label className="block font-medium mb-2">
                  Meeting Point
                </label>
                <input
                  name="meeting_point"
                  className="border rounded-lg p-4 w-full focus:ring-2 focus:ring-orange-400 outline-none"
                />
              </div>

              {/* Google Map */}
              <div>
                <label className="block font-medium mb-2">
                  Embedding tourist destinations on Google Maps
                </label>
                <textarea
                  name="map_embed"
                  className="border rounded-lg p-4 w-full h-24 focus:ring-2 focus:ring-orange-400 outline-none"
                />
              </div>

              {/* Tags */}
              <div>
                <label className="block font-medium mb-2">
                  Tags / Highlights
                </label>
                <input
                  name="tags"
                  className="border rounded-lg p-4 w-full focus:ring-2 focus:ring-orange-400 outline-none"
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
                  onChange={handleGalleryChange}
                  className="border rounded-lg p-4 w-full"
                />
                <p className="mt-2 text-xs text-gray-500">
                  Maksimal total ukuran upload 18MB per submit.
                </p>
                {uploadError && (
                  <p className="mt-2 text-sm text-red-600">
                    {uploadError}
                  </p>
                )}
              </div>

              {/* BUTTON */}
              <div className="flex justify-center pt-6">
                <button
                  type="submit"
                  className="px-14 py-4 rounded-2xl font-semibold text-lg
                             bg-gradient-to-r from-orange-500 via-orange-400 to-orange-300
                             text-white
                             shadow-[0_10px_30px_rgba(249,115,22,0.45)]
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
