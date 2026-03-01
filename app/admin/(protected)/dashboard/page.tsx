export default function AdminDashboard() {
  return (
    <div className="p-10">
      <h1 className="text-2xl font-bold mb-6">
        Admin Dashboard
      </h1>

      <div className="space-y-4">
        <a href="/admin/merchants" className="block text-blue-600">
          ➜ Merchant Approvals
        </a>

        <a href="/admin/packages" className="block text-blue-600">
          ➜ Package Approvals
        </a>
      </div>
    </div>
  )
}