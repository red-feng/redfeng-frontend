import Link from "next/link"

const adminMenus = [
  { label: "Merchant Approvals", href: "/admin/merchants", available: true },
  { label: "Package Approvals", href: "/admin/packages", available: true },
  { label: "Support", href: "", available: false },
]

export default function AdminDashboard() {
  return (
    <div className="p-10">
      <h1 className="mb-6 text-2xl font-bold">Admin Dashboard</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {adminMenus.map((menu) =>
          menu.available ? (
            <Link
              key={menu.label}
              href={menu.href}
              className="rounded-xl border bg-white p-5 shadow-sm transition hover:shadow-md"
            >
              {menu.label}
            </Link>
          ) : (
            <div
              key={menu.label}
              className="rounded-xl border border-gray-300 bg-white p-5 text-gray-500"
            >
              <p className="font-medium">{menu.label}</p>
              <p className="text-sm">Segera hadir</p>
            </div>
          ),
        )}
      </div>
    </div>
  )
}
