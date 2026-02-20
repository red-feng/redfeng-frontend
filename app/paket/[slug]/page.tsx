import Link from "next/link";
import { notFound } from "next/navigation";

export const revalidate = 300;



async function getData(slug: string) {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/api/paket/${slug}`,
    { cache: "no-store" }
  );

  if (!res.ok) return null;

  return res.json();
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