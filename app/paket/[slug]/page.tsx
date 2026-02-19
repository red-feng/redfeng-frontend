"use client";

"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

export default function CheckoutPage() {

  const params = useParams();
  const slug = params.slug as string;

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);


  const [nama, setNama] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  useEffect(() => {
    fetch(`https://redfeng.co/wp-json/redfeng/v1/paket/${slug}`)
      .then((res) => res.json())
      .then((result) => {
        setData(result);
        setLoading(false);
      });
  }, [slug]);

  if (loading) return <div className="p-10">Loading...</div>;
  if (!data) return <div className="p-10">Paket tidak ditemukan</div>;

  const publicPrice = data.pricing?.dewasa ?? 0;

  const adminFee = publicPrice * 0.03;
  const subtotal = publicPrice + adminFee;
  const ppn = subtotal * 0.11;
  const total = subtotal + ppn;

  const handleBooking = async () => {
    const res = await fetch(
      "https://redfeng.co/wp-json/redfeng/v1/booking",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          slug,
          nama,
          email,
          phone,
          public_price: publicPrice,
          admin_fee: adminFee,
          ppn,
          total,
        }),
      }
    );

    const result = await res.json();

    if (result.booking_id) {
      const payment = await fetch(
        "https://redfeng.co/wp-json/redfeng/v1/payment/create",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            booking_id: result.booking_id,
          }),
        }
      );

      const paymentResult = await payment.json();

      if (paymentResult.snap_token) {
        window.snap.pay(paymentResult.snap_token);
      }
    }
  };

  return (
    <main className="min-h-screen bg-gray-100 p-10">
      <div className="max-w-3xl mx-auto bg-white p-8 rounded-xl shadow">

        <h1 className="text-3xl font-bold mb-6">
          Checkout
        </h1>

        <div className="space-y-3 mb-8">
          <div className="flex justify-between">
            <span>Harga Paket</span>
            <span>Rp {publicPrice.toLocaleString("id-ID")}</span>
          </div>

          <div className="flex justify-between">
            <span>Admin 3%</span>
            <span>Rp {adminFee.toLocaleString("id-ID")}</span>
          </div>

          <div className="flex justify-between">
            <span>PPN 11%</span>
            <span>Rp {ppn.toLocaleString("id-ID")}</span>
          </div>

          <hr />

          <div className="flex justify-between font-bold text-xl">
            <span>Total</span>
            <span>Rp {total.toLocaleString("id-ID")}</span>
          </div>
        </div>

        <div className="space-y-4">
          <input
            type="text"
            placeholder="Nama"
            value={nama}
            onChange={(e) => setNama(e.target.value)}
            className="w-full border p-3 rounded"
          />

          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border p-3 rounded"
          />

          <input
            type="text"
            placeholder="No HP"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full border p-3 rounded"
          />

          <button
            onClick={handleBooking}
            className="w-full bg-blue-600 text-white py-3 rounded-lg text-lg"
          >
            Buat Booking & Bayar
          </button>
        </div>

      </div>
    </main>
  );
}
