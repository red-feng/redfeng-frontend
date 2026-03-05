import CheckoutClient from "./CheckoutClient";
import { getCurrentLocale } from "@/lib/locale";
import type { Locale } from "@/lib/i18n";

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
  const { slug } = params;
  const locale = await getCurrentLocale();
  const isId = locale === "id";

  const data = await getDetail(slug);

  if (!data) {
    return <div className="p-10">{isId ? "Paket tidak ditemukan" : "Package not found"}</div>;
  }

  return <CheckoutClient data={data} slug={slug} locale={locale as Locale} />;
}
