import Link from "next/link";
import { notFound } from "next/navigation";

export const revalidate = 300;



async function getData(slug: string) {
  const url = `https://redfeng.co/wp-json/redfeng/v1/paket/${slug}`;

  const res = await fetch(url, {
    cache: "no-store",
  });

  console.log("FETCH URL:", url);
  console.log("STATUS:", res.status);

  const text = await res.text();
  console.log("RAW RESPONSE:", text);

  if (!res.ok) return null;

  return JSON.parse(text);
}



//function//
export default async function PaketPage({
  params,
}: {
  params: { slug: string };
}) {
  const { slug } = params;

  console.log("SLUG:", slug);

  const data = await getData(slug);

  if (!data) {
    return <div>Data tidak ditemukan</div>;
  }

  return (
    <main>
      <h1>Detail Paket</h1>
      <p>Slug: {slug}</p>
    </main>
  );
}