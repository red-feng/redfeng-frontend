"use client"

import { submitForReview } from "./actions"
import Image from "next/image"

export default function Step5Review({
  packageId,
}: {
  packageId: string | null
}) {
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

      {/* CONTENT */}
      <div className="flex justify-center px-8 pb-28">

        <div className="w-full max-w-4xl bg-white rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] p-14">

          <h1 className="text-2xl font-bold mb-2">
            Buat Paket Baru
          </h1>

          <p className="text-gray-500 mb-10">
            Step 5 – Review & Submit
          </p>

          <form action={submitForReview} className="space-y-10">

            <input type="hidden" name="package_id" value={packageId} />

            {/* INFO BOX */}
            <div className="bg-orange-50 border border-orange-300 p-6 rounded-2xl space-y-2">
              <p className="text-gray-800 font-medium">
                Setelah disubmit, paket akan direview oleh Admin.
              </p>
              <p className="text-gray-700 text-sm">
                Paket tidak bisa diedit sampai proses review selesai.
              </p>
            </div>

            {/* CONFIRMATION BOX (visual only) */}
            <div className="bg-slate-50 border rounded-2xl p-6">
              <p className="text-gray-600 text-sm">
                Pastikan seluruh data sudah benar sebelum melakukan submit.
                Setelah submit, status paket akan berubah menjadi
                <span className="font-semibold text-orange-500">
                  {" "}Submitted
                </span>.
              </p>
            </div>

            {/* BUTTON */}
            <div className="flex justify-center pt-6">
              <button
                type="submit"
                className="px-16 py-4 rounded-2xl font-semibold text-lg
                           bg-gradient-to-r from-orange-500 via-orange-400 to-orange-300
                           text-white
                           shadow-[0_10px_30px_rgba(249,115,22,0.45)]
                           hover:scale-105
                           transition-all duration-300"
              >
                Submit untuk Review
              </button>
            </div>

          </form>

        </div>
        </div>
      </div>
    </div>
  )
}