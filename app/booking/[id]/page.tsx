import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export default async function BookingPage({
  params,
}: {
  params: { id: string };
}) {
  console.log("PARAM ID:", params.id);

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data: booking, error } = await supabase
    .from("bookings")
    .select("*")
    .eq("id", params.id)
    .single();

  console.log("SUPABASE ERROR:", error);
  console.log("SUPABASE DATA:", booking);

  if (error || !booking) {
    return (
      <div className="p-10">
        <pre>{JSON.stringify({ id: params.id, error }, null, 2)}</pre>
        Booking tidak ditemukan
      </div>
    );
  }

  return <div>Booking ditemukan</div>;
}