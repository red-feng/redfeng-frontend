import Link from "next/link";
import { notFound } from "next/navigation";

export const revalidate = 300;



async function getData(slug: string) {
  console.log("SLUG FROM PARAMS:", slug);

  const res = await fetch(
    `https://redfeng.co/wp-json/redfeng/v1/paket/${slug}`,
    { cache: "no-store" }
  );

  const text = await res.text();

  console.log("STATUS:", res.status);
  console.log("BODY:", text);

  if (!res.ok) {
    throw new Error("FETCH FAILED");
  }

  const data = JSON.parse(text);
  return data;
}



//function//
export default async function CheckoutPage({
  params,
  searchParams,
}: {
  params: { slug?: string };
  searchParams?: { nxtPslug?: string };
}) {
  const slug = params?.slug ?? searchParams?.nxtPslug;

  console.log("FINAL SLUG:", slug);

  if (!slug) {
    return <div>Slug tidak ditemukan</div>;
  }

  console.log("PARAMS OBJECT:", params);
  console.log("SLUG VALUE:", slug);

  const data = await getData(slug);

  console.log("DATA SERVER:", data);

  if (!data) {
    return <div>Data tidak ditemukan</div>;
  }

  const publicPrice = data.pricing?.dewasa ?? 0;
  const adminFee = publicPrice * 0.03;
  const subtotal = publicPrice + adminFee;
  const ppn = subtotal * 0.11;
  const total = Math.round(subtotal + ppn);


  return (
    <main className="min-h-screen bg-gray-100 p-10">
      <div className="max-w-3xl mx-auto bg-white p-8 rounded-xl shadow">
        <h1 className="text-3xl font-bold mb-6">
        Detail Paket
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
    <Link
  href={`/checkout/${slug}`}
  className="block w-full bg-blue-600 text-white text-center py-3 rounded-lg mt-6"
>
  Lanjut ke Booking
</Link>
        </div>
      </div>
    </main>
  );
}