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
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const data = await getData(slug);

  if (!data) {
    return <div>Data tidak ditemukan</div>;
  }

  return (
    <main>
      <h1>{data.title}</h1>
      <div dangerouslySetInnerHTML={{ __html: data.content }} />
    </main>
  );
}


<h1 className="text-5xl font-bold text-red-600">
  Tailwind Active
</h1>