"use client"

import { ChangeEvent, FormEvent, useState } from "react"
import { savePackageDetails } from "./actions"
import Image from "next/image"

const MAX_GALLERY_BYTES = 18 * 1024 * 1024
const LANGS = [
  { code: "id", label: "Indonesia" },
  { code: "en", label: "English" },
  { code: "zh", label: "Chinese" },
  { code: "th", label: "Thailand" },
] as const

type LangCode = (typeof LANGS)[number]["code"]

export default function Step2Details({
  packageId,
  defaultLanguage,
}: {
  packageId: string | null
  defaultLanguage: string
}) {
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [activeLang, setActiveLang] = useState<LangCode>(
    (LANGS.find((lang) => lang.code === defaultLanguage)?.code || "id") as LangCode
  )

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
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: "url('/bg-wizard.png')",
        }}
      />

      <div className="relative z-10">
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

        <div className="flex justify-center px-8 pb-28">
          <div className="w-full max-w-5xl rounded-3xl bg-white p-14 shadow-[0_20px_50px_rgba(0,0,0,0.15)]">
            <h1 className="mb-1 text-2xl font-bold">Buat Paket Baru</h1>
            <p className="mb-10 text-gray-500">Step 2 - Detail Konten (Multibahasa)</p>

            <form
              action={savePackageDetails}
              encType="multipart/form-data"
              onSubmit={validateGallerySize}
              className="space-y-8"
            >
              <input type="hidden" name="package_id" value={packageId} />

              <div className="rounded-xl border border-orange-200 bg-orange-50 p-4 text-sm text-orange-700">
                Default language paket: <strong>{defaultLanguage}</strong>. Minimal isi konten bahasa default.
              </div>

              <div>
                <div className="mb-4 flex flex-wrap gap-2">
                  {LANGS.map((lang) => (
                    <button
                      key={lang.code}
                      type="button"
                      onClick={() => setActiveLang(lang.code)}
                      className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${
                        activeLang === lang.code
                          ? "bg-orange-500 text-white"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                      }`}
                    >
                      {lang.label}
                    </button>
                  ))}
                </div>

                {LANGS.map((lang) => (
                  <div
                    key={lang.code}
                    className={activeLang === lang.code ? "space-y-6" : "hidden"}
                  >
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
                      Konten bahasa: <strong>{lang.label}</strong> ({lang.code})
                    </div>

                    <div>
                      <label className="mb-2 block font-medium">Info Tentang Tour</label>
                      <textarea
                        name={`about_tour_${lang.code}`}
                        className="h-36 w-full rounded-lg border p-4 outline-none focus:ring-2 focus:ring-orange-400"
                        required={lang.code === defaultLanguage}
                      />
                    </div>

                    <div>
                      <label className="mb-2 block font-medium">Standar Layanan Merchant</label>
                      <textarea
                        name={`service_standard_${lang.code}`}
                        className="h-28 w-full rounded-lg border p-4 outline-none focus:ring-2 focus:ring-orange-400"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block font-medium">Include</label>
                      <textarea
                        name={`include_${lang.code}`}
                        className="h-28 w-full rounded-lg border p-4 outline-none focus:ring-2 focus:ring-orange-400"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block font-medium">Exclude</label>
                      <textarea
                        name={`exclude_${lang.code}`}
                        className="h-28 w-full rounded-lg border p-4 outline-none focus:ring-2 focus:ring-orange-400"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block font-medium">Peralatan & Dokumen yang Disiapkan Peserta</label>
                      <textarea
                        name={`preparation_${lang.code}`}
                        className="h-28 w-full rounded-lg border p-4 outline-none focus:ring-2 focus:ring-orange-400"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block font-medium">Syarat & Ketentuan saat di lokasi</label>
                      <textarea
                        name={`terms_conditions_${lang.code}`}
                        className="h-28 w-full rounded-lg border p-4 outline-none focus:ring-2 focus:ring-orange-400"
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div>
                <label className="mb-2 block font-medium">Meeting Point</label>
                <input
                  name="meeting_point"
                  className="w-full rounded-lg border p-4 outline-none focus:ring-2 focus:ring-orange-400"
                />
              </div>

              <div>
                <label className="mb-2 block font-medium">Embedding tourist destinations on Google Maps</label>
                <textarea
                  name="map_embed"
                  className="h-24 w-full rounded-lg border p-4 outline-none focus:ring-2 focus:ring-orange-400"
                />
              </div>

              <div>
                <label className="mb-2 block font-medium">Tags / Highlights</label>
                <input
                  name="tags"
                  className="w-full rounded-lg border p-4 outline-none focus:ring-2 focus:ring-orange-400"
                />
              </div>

              <div>
                <label className="mb-2 block font-medium">Gallery Images</label>
                <input
                  type="file"
                  name="gallery_images"
                  multiple
                  accept="image/*"
                  onChange={handleGalleryChange}
                  className="w-full rounded-lg border p-4"
                />
                <p className="mt-2 text-xs text-gray-500">Maksimal total ukuran upload 18MB per submit.</p>
                {uploadError && <p className="mt-2 text-sm text-red-600">{uploadError}</p>}
              </div>

              <div className="flex justify-center pt-6">
                <button
                  type="submit"
                  className="rounded-2xl bg-gradient-to-r from-orange-500 via-orange-400 to-orange-300 px-14 py-4 text-lg font-semibold text-white shadow-[0_10px_30px_rgba(249,115,22,0.45)] transition-all duration-300 hover:scale-105"
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
