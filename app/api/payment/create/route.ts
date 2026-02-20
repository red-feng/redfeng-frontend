import { NextResponse } from "next/server";
import midtransClient from "midtrans-client";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  try {
    const { booking_id } = await req.json();

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: booking, error } = await supabase
      .from("bookings")
      .select("*")
      .eq("id", booking_id)
      .single();

    if (error || !booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    const snap = new midtransClient.Snap({
      isProduction: true, // ganti false kalau sandbox
      serverKey: process.env.MIDTRANS_SERVER_KEY!,
    });

    const amount =
      booking.payment_type === "dp"
        ? booking.dp_amount
        : booking.total_amount;

    const parameter = {
      transaction_details: {
        order_id: booking.id,
        gross_amount: amount,
      },
      customer_details: {
        first_name: booking.customer_name,
        email: booking.customer_email,
        phone: booking.customer_phone,
      },
    };

    const transaction = await snap.createTransaction(parameter);

    return NextResponse.json({
      token: transaction.token,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}