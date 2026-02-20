import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export default async function BookingPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data, error } = await supabase
    .from("bookings")
    .select("*")
    .eq("id", params.id);

  console.log("ID:", params.id);
  console.log("DATA:", data);
  console.log("ERROR:", error);

  if (!data || data.length === 0) {
    return <div className="p-10">Booking tidak ditemukan</div>;
  }

  const booking = data[0];

  return (
    <div>
      Booking ditemukan: {booking.customer_name}
    </div>
  );
}