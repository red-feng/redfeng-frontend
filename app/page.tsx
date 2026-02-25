import Link from "next/link"

export default function HomePage() {
  return (
    <main className="min-h-screen bg-white">

      {/* HERO SECTION */}
      <section className="h-[70vh] flex flex-col justify-center items-center text-center bg-gradient-to-r from-red-600 to-orange-500 text-white">
        <h1 className="text-5xl font-bold mb-6">
          Jelajahi Indonesia Bersama RedFeng
        </h1>
        <p className="text-lg mb-8">
          Paket wisata premium dengan harga terbaik
        </p>

        <Link
          href="/packages"
          className="bg-white text-red-600 px-8 py-3 rounded-xl font-semibold hover:scale-105 transition"
        >
          Lihat Semua Paket
        </Link>
      </section>

    </main>
  )
}