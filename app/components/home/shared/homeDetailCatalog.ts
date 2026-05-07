import {
  appHomeConfig,
  destinations,
  inspirationArticles,
  popularBookings,
} from "@/app/components/home/shared/homeContent"

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
}

function resolveServiceHref(category: string) {
  const normalized = category.trim().toLowerCase()
  if (normalized === "pesawat") return "/pesawat"
  if (normalized === "hotel") return "/hotel"
  if (normalized === "kereta") return "/kereta"
  if (normalized === "bus") return "/bus"
  if (normalized === "kapal") return "/kapal"
  if (normalized === "kapal pesiar") return "/kapal-pesiar"
  if (normalized === "aktivitas") return "/aktivitas"
  if (normalized === "paket wisata") return "/packages"
  return "/search"
}

export const popularBookingCatalog = popularBookings.map((item) => ({
  ...item,
  slug: slugify(`${item.category}-${item.title}`),
  detailHref: `/popular-booking/${slugify(`${item.category}-${item.title}`)}`,
  serviceHref: resolveServiceHref(item.category),
  overview:
    item.category === "Pesawat"
      ? "Pilihan ini termasuk kategori yang paling sering dicari customer RedFeng karena rute, harga, dan timing-nya cocok untuk perjalanan cepat."
      : item.category === "Hotel"
        ? "Pilihan hotel ini tampil sebagai salah satu yang paling banyak diminati karena kombinasi lokasi, rating, dan harga yang kuat."
        : item.category === "Kereta"
          ? "Rute kereta ini masuk daftar populer karena praktis, cepat, dan sering dipilih untuk perjalanan antarkota."
          : item.category === "Paket Wisata"
            ? "Paket ini menjadi salah satu yang paling banyak dipesan karena sudah menggabungkan itinerary, akomodasi, dan kemudahan koordinasi."
            : "Item ini termasuk pilihan yang paling sering dilihat dan cocok dijadikan pijakan untuk eksplor lebih lanjut.",
  highlights: [
    `Kategori utama: ${item.category}`,
    `Rating visual saat ini: ${item.rating}`,
    `Harga tampil mulai dari ${item.price}${item.suffix || ""}`,
  ],
}))

export function getPopularBookingBySlug(slug: string) {
  return popularBookingCatalog.find((item) => item.slug === slug) || null
}

export const inspirationArticleCatalog = inspirationArticles.map((article) => ({
  ...article,
  slug: slugify(article.title),
  detailHref: `/inspirasi/${slugify(article.title)}`,
  bodyIntro:
    article.category === "Travel Guide"
      ? "Artikel ini dirancang sebagai panduan cepat untuk traveler yang ingin mulai dari langkah paling aman dan paling hemat."
      : article.category === "Hotel Insight"
        ? "Konten ini membantu user memahami cara memilih akomodasi dengan lebih cermat sebelum check-out."
        : article.category === "Destinasi Favorit"
          ? "Artikel ini memberi gambaran destinasi dan alasan kenapa tempat tersebut layak masuk rencana perjalanan berikutnya."
          : "Artikel ini menjadi pintu masuk ringan untuk ide dan inspirasi perjalanan di ekosistem RedFeng.",
  sections: [
    "Ringkasan ide utama yang paling relevan untuk traveler pertama kali.",
    "Saran langkah lanjutan yang bisa diterapkan sebelum booking.",
    "Arahkan pembaca ke pencarian, promo, atau paket yang paling cocok setelah membaca artikel.",
  ],
}))

export function getInspirationArticleBySlug(slug: string) {
  return inspirationArticleCatalog.find((item) => item.slug === slug) || null
}

export const recentActivityDetail = {
  ...appHomeConfig.featuredActivity,
  slug: slugify(`${appHomeConfig.featuredActivity.category}-${appHomeConfig.featuredActivity.title}`),
  detailHref: `/recent-activity/${slugify(`${appHomeConfig.featuredActivity.category}-${appHomeConfig.featuredActivity.title}`)}`,
  serviceHref: resolveServiceHref(appHomeConfig.featuredActivity.category),
  summary:
    "Halaman ini menjadi jembatan antara aktivitas terakhir di homepage dengan tindak lanjut yang lebih jelas, tanpa langsung melempar user ke dashboard umum.",
  nextSteps: [
    "Lanjutkan review order atau perjalanan dari kartu ini.",
    "Buka halaman pesanan jika ingin melihat histori yang lebih lengkap.",
    "Kembali ke layanan terkait untuk eksplor opsi serupa.",
  ],
}

export function getRecentActivityBySlug(slug: string) {
  return recentActivityDetail.slug === slug ? recentActivityDetail : null
}

export const destinationCatalog = destinations.map((destination) => ({
  ...destination,
  slug: slugify(`${destination.name}-${destination.country}`),
  detailHref: `/destinasi/${slugify(`${destination.name}-${destination.country}`)}`,
  serviceHref: "/search",
  overview:
    destination.country === "Indonesia"
      ? `${destination.name} menjadi salah satu destinasi favorit untuk perjalanan domestik karena aksesnya mudah dan pilihan aktivitasnya beragam.`
      : `${destination.name} termasuk destinasi favorit yang sering masuk wishlist traveler RedFeng karena daya tarik visual dan itinerary-nya kuat.`,
  highlights: [
    `Negara tujuan: ${destination.country}`,
    `Teaser harga saat ini: ${destination.teaser}`,
    `Cocok dipakai sebagai titik mulai pencarian berikutnya`,
  ],
}))

export function getDestinationBySlug(slug: string) {
  return destinationCatalog.find((item) => item.slug === slug) || null
}
