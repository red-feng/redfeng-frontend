import { createClient } from '@/lib/supabase/server'
import { approveMerchant } from './actions'

export default async function AdminMerchantsPage() {
  const supabase = await createClient()

  const { data: merchants } = await supabase
  .from('merchants')
  .select('*')
  .eq('verification_status', 'pending')
  .order('created_at', { ascending: false })

  return (
    <div className="p-10">
      <h1 className="text-2xl font-bold mb-6">
        Pending Merchant Approvals
      </h1>

      {!merchants?.length && (
        <p>Tidak ada merchant pending.</p>
      )}

      {merchants?.map((merchant) => (
        <div key={merchant.id} className="border p-4 mb-4 rounded">
          <h2 className="font-bold text-lg">
            {merchant.brand_name}
          </h2>
          <p>Email: {merchant.email}</p>
          <p>Company: {merchant.company_name}</p>

          <form action={approveMerchant}>
            <input
              type="hidden"
              name="merchantId"
              value={merchant.id}
            />
            <button className="bg-green-600 text-white px-4 py-2 mt-3">
              Approve
            </button>
          </form>
        </div>
      ))}
    </div>
  )
}