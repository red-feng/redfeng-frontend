import { type NotificationEntry } from "@/app/components/notifications/notificationsStore"

export const defaultNotificationItems: NotificationEntry[] = [
  {
    id: "promo-active",
    title: "Promo baru sudah aktif",
    body: "Pantau promo tiket, hotel, dan paket wisata terbaru yang sekarang sudah sinkron di aplikasi dan website.",
    href: "/promo",
    tag: "Promo",
  },
  {
    id: "bookings-center",
    title: "Pesanan Anda bisa dipantau dari satu halaman",
    body: "Halaman booking customer sekarang sudah dipisah dari dashboard umum agar progress order lebih mudah dibaca.",
    href: "/customer/bookings",
    tag: "Pesanan",
  },
  {
    id: "services-landing",
    title: "Layanan utama kini punya halaman sendiri",
    body: "Pesawat, Hotel, Kereta, Bus, Kapal, Kapal Pesiar, dan Aktivitas sekarang punya landing page lokal yang sama untuk app dan website.",
    href: "/search",
    tag: "Layanan",
  },
  {
    id: "wishlist-active",
    title: "Wishlist awal sudah tersedia",
    body: "Semua ikon heart utama sekarang punya tujuan nyata dan mengarah ke halaman wishlist sebagai fondasi favorit user.",
    href: "/wishlist",
    tag: "Favorite",
  },
] as const
