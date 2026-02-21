import { createClient } from "@/lib/supabase/server"

export default async function AdminBookingsPage() {
  const supabase = await createClient()

  const { data: bookings } = await supabase
    .from("bookings")
    .select("*")
    .order("created_at", { ascending: false })

  return (
    <div className="p-10">
      <h1 className="text-3xl font-bold mb-6">Booking Management</h1>

      <table className="w-full border">
        <thead className="bg-gray-100">
          <tr>
            <th className="p-2 border">Code</th>
            <th className="p-2 border">Customer</th>
            <th className="p-2 border">Total</th>
            <th className="p-2 border">Payment</th>
            <th className="p-2 border">Status</th>
          </tr>
        </thead>

        <tbody>
          {bookings?.map((booking) => (
            <tr key={booking.id}>
              <td className="p-2 border">{booking.booking_code}</td>
              <td className="p-2 border">{booking.customer_name}</td>
              <td className="p-2 border">
                Rp {booking.total_amount?.toLocaleString("id-ID")}
              </td>
              <td className="p-2 border">{booking.payment_status}</td>
              <td className="p-2 border">{booking.booking_status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}