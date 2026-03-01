import { createClient } from '@/lib/supabase/server'
import { approvePackage } from './actions'

export default async function AdminPackagesPage() {
  const supabase = await createClient()

  const { data: packages } = await supabase
    .from('merchant_packages')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  return (
    <div className="p-10">
      <h1 className="text-2xl font-bold mb-6">
        Pending Package Approvals
      </h1>

      {!packages?.length && (
        <p>Tidak ada paket pending.</p>
      )}

      {packages?.map((pkg) => (
        <div key={pkg.id} className="border p-4 mb-4 rounded">
          <h2 className="font-bold">{pkg.title}</h2>
          <p>Harga: {pkg.price_adult}</p>

          <form action={approvePackage}>
            <input
              type="hidden"
              name="packageId"
              value={pkg.id}
            />
            <button className="bg-green-600 text-white px-4 py-2 mt-2">
              Approve Paket
            </button>
          </form>
        </div>
      ))}
    </div>
  )
}