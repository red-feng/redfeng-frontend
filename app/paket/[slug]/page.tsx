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
export default async function PaketPage({
  params,
  searchParams,
}: {
  params: { slug?: string };
  searchParams?: { nxtPslug?: string };
}) {
  const slug =
    params?.slug ||
    searchParams?.nxtPslug ||
    "";

  console.log("PARAMS:", params);
  console.log("SEARCH PARAMS:", searchParams);
  console.log("FINAL SLUG:", slug);

  if (!slug) {
    return <div>Slug tidak ditemukan</div>;
  }

  const data = await getData(slug);

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

        <p>Slug: {slug}</p>

        <div className="space-y-3 mb-8">
          <div className="flex justify-between">
            <span>Total</span>
            <span>Rp {total.toLocaleString("id-ID")}</span>
          </div>
        </div>
      </div>
    </main>
  );
}