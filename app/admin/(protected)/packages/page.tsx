import { createAdminClient } from "@/lib/supabase/admin"
import { approvePackage, rejectPackage } from "./actions"

export default async function AdminPackagesPage() {
  const supabase = createAdminClient()

  const { data: packages } = await supabase
  .from("packages")   // ✅ BENAR
  .select("*")
  .eq("status", "pending")
  .order("created_at", { ascending: false })

  return (
    <div className="p-10">
      <h1 className="text-2xl font-bold mb-6">
        Pending Package Approvals
      </h1>

      {!packages?.length && (
        <p>Tidak ada paket pending.</p>
      )}

      {packages?.map((pkg) => (
        <div key={pkg.id} className="border p-6 mb-6 rounded-xl shadow-sm">

          <h2 className="text-lg font-bold">
            {pkg.title}
          </h2>

          <p className="text-gray-600">
            Merchant ID: {pkg.merchant_id}
          </p>

          <p className="text-gray-600">
            Harga Dewasa: {pkg.price_adult}
          </p>

          {/* APPROVE */}
          <form action={approvePackage} className="mt-4">
            <input
              type="hidden"
              name="packageId"
              value={pkg.id}
            />
            <button className="bg-green-600 text-white px-5 py-2 rounded-lg">
              Approve
            </button>
          </form>

          {/* REJECT */}
          <form action={rejectPackage} className="mt-3">
            <input
              type="hidden"
              name="packageId"
              value={pkg.id}
            />

            <textarea
              name="reason"
              placeholder="Alasan penolakan..."
              required
              className="border p-2 w-full mt-2 rounded"
            />

            <button className="bg-red-600 text-white px-5 py-2 rounded-lg mt-2">
              Reject
            </button>
          </form>

        </div>
      ))}
    </div>
  )
}