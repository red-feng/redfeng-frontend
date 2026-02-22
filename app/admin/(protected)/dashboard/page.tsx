import Link from "next/link"

export default function AdminDashboard() {
  return (
    <div className="p-10">
      <h1 className="text-3xl font-bold">Admin Dashboard</h1>

      <Link
        href="/admin/bookings"
        className="inline-block mt-4 bg-black text-white px-4 py-2 rounded"
      >
        Manage Tour Bookings
      </Link>
    </div>
  )
}