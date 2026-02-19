import Link from "next/link";

async function getPaket() {
  const res = await fetch(
    "https://redfeng.co/wp-json/redfeng/v1/paket",
    { cache: "no-store" }
  );

  return res.json();
}

export default async function Home() {
  const paket = await getPaket();

  return (
    <main className="min-h-screen bg-gray-100 p-10">
      <h1 className="text-4xl font-bold text-center text-blue-600">
        RedFeng Digital Travel Aggregator
      </h1>

      <p className="text-center mt-4 text-lg">
        Hotels • Flights • Tours
      </p>

      <div className="grid grid-cols-3 gap-6 mt-10">
  {paket.map((item: any) => (
    <div
      key={item.id}
      className="bg-white p-5 rounded-xl shadow hover:shadow-lg transition"
    >
      {item.image && (
        <img
          src={item.image}
          alt={item.title}
          className="w-full h-40 object-cover rounded-lg mb-4"
        />
      )}

      <h2 className="font-bold text-lg mb-2">{item.title}</h2>

      <p
        className="text-sm text-gray-600 mb-4"
        dangerouslySetInnerHTML={{ __html: item.excerpt }}
      />

      <Link
  href={`/paket/${item.slug}`}
  className="block bg-blue-600 text-white px-4 py-2 rounded-lg w-full text-center"
>
  View Details
</Link>
    </div>
  ))}
</div>

    </main>
  );
}
