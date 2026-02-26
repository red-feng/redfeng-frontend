"use client"

import { submitForReview } from "./actions"

export default function Step5Review({
  packageId,
}: {
  packageId: string | null
}) {
  if (!packageId) {
    return <p className="text-red-500">Package ID tidak ditemukan</p>
  }

  return (
    <form action={submitForReview} className="space-y-6">
      <input type="hidden" name="package_id" value={packageId} />

      <h2 className="text-xl font-semibold">
        Step 5 – Review & Submit
      </h2>

      <div className="bg-yellow-50 border border-yellow-300 p-4 rounded">
        <p>
          Setelah disubmit, paket akan direview oleh Admin.
        </p>
        <p>
          Paket tidak bisa diedit sampai proses review selesai.
        </p>
      </div>

      <button className="bg-green-600 text-white px-6 py-2 rounded">
        Submit untuk Review
      </button>
    </form>
  )
}