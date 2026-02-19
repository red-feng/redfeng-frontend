import CheckoutClient from "./CheckoutClient";

async function getDetail(slug: string) {
  const res = await fetch(
    `https://redfeng.co/wp-json/redfeng/v1/paket/${slug}`,
    { cache: "no-store" }
  );

  if (!res.ok) return null;

  return res.json();
}

export default async function CheckoutPage({
  params,
}: {
  params: { slug: string };
}) {

  const data = await getDetail(params.slug);

  if (!data) {
    return <div className="p-10">Paket tidak ditemukan</div>;
  }

  return <CheckoutClient data={data} slug={params.slug} />;
}
