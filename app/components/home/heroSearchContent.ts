import type { HeroTabKey } from "@/app/components/home/homeContent"

export type HeroSearchFieldData = {
  label: string
  value: string
  sublabel?: string
  withChevron?: boolean
  withSwap?: boolean
}

export type HeroSearchOption = {
  label: string
  active?: boolean
}

export type HeroSearchConfig = {
  ctaHref: string
  ctaLabel: string
  desktopFields: HeroSearchFieldData[]
  desktopGridClass: string
  mobileFields: HeroSearchFieldData[]
  mobilePrimaryCount: number
  options: HeroSearchOption[]
  showDesktopSwap?: boolean
}

export const heroSearchConfigs: Record<HeroTabKey, HeroSearchConfig> = {
  flight: {
    ctaHref: "https://redfeng.co/pesawat/",
    ctaLabel: "Cari Tiket",
    desktopGridClass: "hidden gap-3 lg:mt-6 lg:grid lg:grid-cols-[1.22fr_44px_1.22fr_0.86fr_0.86fr_1fr_auto] lg:items-center",
    showDesktopSwap: true,
    options: [
      { label: "Sekali Jalan", active: true },
      { label: "Pulang - Pergi" },
      { label: "Multi Kota" },
    ],
    desktopFields: [
      { label: "Dari", value: "CGK   Jakarta", sublabel: "Semua Bandara" },
      { label: "Ke", value: "DPS   Denpasar", sublabel: "Bali" },
      { label: "Berangkat", value: "25 Mei 2026", sublabel: "Minggu" },
      { label: "Pulang", value: "28 Mei 2026", sublabel: "Rabu" },
      { label: "Penumpang", value: "1 Dewasa, Ekonomi", sublabel: "Kelas Kabin", withChevron: true },
    ],
    mobilePrimaryCount: 2,
    mobileFields: [
      { label: "Dari", value: "Jakarta (CGK)", sublabel: "Soekarno Hatta", withSwap: true },
      { label: "Ke", value: "Denpasar (DPS)", sublabel: "Ngurah Rai" },
      { label: "Berangkat", value: "25 Mei 2026", sublabel: "Minggu" },
      { label: "Pulang", value: "28 Mei 2026", sublabel: "Rabu" },
      { label: "Penumpang", value: "1 Dewasa", sublabel: "Ekonomi", withChevron: true },
    ],
  },
  hotel: {
    ctaHref: "https://redfeng.co/hotel/",
    ctaLabel: "Cari Hotel",
    desktopGridClass: "hidden gap-3 lg:mt-6 lg:grid lg:grid-cols-[1.55fr_0.92fr_0.92fr_1fr_auto] lg:items-center",
    options: [
      { label: "Hotel", active: true },
      { label: "Villa" },
      { label: "Resort" },
    ],
    desktopFields: [
      { label: "Destinasi", value: "Bali", sublabel: "Indonesia" },
      { label: "Check-in", value: "18 Mei 2026", sublabel: "Senin" },
      { label: "Check-out", value: "20 Mei 2026", sublabel: "Rabu" },
      { label: "Tamu & Kamar", value: "2 Tamu, 1 Kamar", sublabel: "Siap menginap", withChevron: true },
    ],
    mobilePrimaryCount: 1,
    mobileFields: [
      { label: "Destinasi", value: "Bali", sublabel: "Indonesia" },
      { label: "Check-in", value: "18 Mei", sublabel: "Senin" },
      { label: "Check-out", value: "20 Mei", sublabel: "Rabu" },
      { label: "Tamu", value: "2 Tamu", sublabel: "1 Kamar", withChevron: true },
    ],
  },
  train: {
    ctaHref: "https://redfeng.co/kereta_api/",
    ctaLabel: "Cari Kereta",
    desktopGridClass: "hidden gap-3 lg:mt-6 lg:grid lg:grid-cols-[1.18fr_44px_1.18fr_0.9fr_0.9fr_1fr_auto] lg:items-center",
    showDesktopSwap: true,
    options: [
      { label: "Sekali Jalan", active: true },
      { label: "Pulang - Pergi" },
      { label: "Kereta Cepat" },
    ],
    desktopFields: [
      { label: "Stasiun Asal", value: "Gambir", sublabel: "Jakarta" },
      { label: "Stasiun Tujuan", value: "Bandung", sublabel: "Jawa Barat" },
      { label: "Berangkat", value: "26 Mei 2026", sublabel: "Selasa" },
      { label: "Pulang", value: "28 Mei 2026", sublabel: "Kamis" },
      { label: "Penumpang", value: "2 Dewasa", sublabel: "Ekonomi", withChevron: true },
    ],
    mobilePrimaryCount: 2,
    mobileFields: [
      { label: "Asal", value: "Gambir", sublabel: "Jakarta", withSwap: true },
      { label: "Tujuan", value: "Bandung", sublabel: "Jawa Barat" },
      { label: "Berangkat", value: "26 Mei", sublabel: "Selasa" },
      { label: "Pulang", value: "28 Mei", sublabel: "Kamis" },
      { label: "Penumpang", value: "2 Dewasa", sublabel: "Ekonomi", withChevron: true },
    ],
  },
  bus: {
    ctaHref: "https://redfeng.co/bus-travel/",
    ctaLabel: "Cari Bus",
    desktopGridClass: "hidden gap-3 lg:mt-6 lg:grid lg:grid-cols-[1.14fr_1.14fr_0.88fr_0.8fr_1fr_auto] lg:items-center",
    options: [
      { label: "Sekali Jalan", active: true },
      { label: "Pulang - Pergi" },
      { label: "Sleeper Bus" },
    ],
    desktopFields: [
      { label: "Kota Asal", value: "Jakarta", sublabel: "Pulo Gebang" },
      { label: "Kota Tujuan", value: "Yogyakarta", sublabel: "Jombor" },
      { label: "Tanggal", value: "24 Mei 2026", sublabel: "Minggu" },
      { label: "Jam", value: "19:30", sublabel: "Keberangkatan" },
      { label: "Penumpang", value: "2 Penumpang", sublabel: "Executive", withChevron: true },
    ],
    mobilePrimaryCount: 2,
    mobileFields: [
      { label: "Asal", value: "Jakarta", sublabel: "Pulo Gebang" },
      { label: "Tujuan", value: "Yogyakarta", sublabel: "Jombor" },
      { label: "Tanggal", value: "24 Mei", sublabel: "Minggu" },
      { label: "Jam", value: "19:30", sublabel: "Malam" },
      { label: "Penumpang", value: "2 Orang", sublabel: "Executive", withChevron: true },
    ],
  },
  ship: {
    ctaHref: "https://redfeng.co/kapal_laut/",
    ctaLabel: "Cari Kapal",
    desktopGridClass: "hidden gap-3 lg:mt-6 lg:grid lg:grid-cols-[1.18fr_44px_1.18fr_0.9fr_0.9fr_1fr_auto] lg:items-center",
    showDesktopSwap: true,
    options: [
      { label: "Sekali Jalan", active: true },
      { label: "Pulang - Pergi" },
      { label: "Ferry Cepat" },
    ],
    desktopFields: [
      { label: "Pelabuhan Asal", value: "Merak", sublabel: "Banten" },
      { label: "Pelabuhan Tujuan", value: "Bakauheni", sublabel: "Lampung" },
      { label: "Berangkat", value: "22 Mei 2026", sublabel: "Jumat" },
      { label: "Pulang", value: "24 Mei 2026", sublabel: "Minggu" },
      { label: "Penumpang", value: "2 Dewasa", sublabel: "Ekonomi", withChevron: true },
    ],
    mobilePrimaryCount: 2,
    mobileFields: [
      { label: "Asal", value: "Merak", sublabel: "Banten", withSwap: true },
      { label: "Tujuan", value: "Bakauheni", sublabel: "Lampung" },
      { label: "Berangkat", value: "22 Mei", sublabel: "Jumat" },
      { label: "Pulang", value: "24 Mei", sublabel: "Minggu" },
      { label: "Penumpang", value: "2 Dewasa", sublabel: "Ekonomi", withChevron: true },
    ],
  },
  activity: {
    ctaHref: "https://redfeng.co/aktivitas/",
    ctaLabel: "Cari Aktivitas",
    desktopGridClass: "hidden gap-3 lg:mt-6 lg:grid lg:grid-cols-[1.55fr_1fr_0.92fr_1fr_auto] lg:items-center",
    options: [
      { label: "Atraksi", active: true },
      { label: "Tur" },
      { label: "Event" },
    ],
    desktopFields: [
      { label: "Destinasi", value: "Shanghai Disneyland", sublabel: "Shanghai, China" },
      { label: "Kategori", value: "Taman Hiburan", sublabel: "Pilihan populer", withChevron: true },
      { label: "Kunjungan", value: "30 Mei 2026", sublabel: "Sabtu" },
      { label: "Tiket", value: "2 Dewasa", sublabel: "Reguler", withChevron: true },
    ],
    mobilePrimaryCount: 1,
    mobileFields: [
      { label: "Destinasi", value: "Shanghai Disneyland", sublabel: "Shanghai" },
      { label: "Kategori", value: "Taman Hiburan", sublabel: "Atraksi", withChevron: true },
      { label: "Tanggal", value: "30 Mei", sublabel: "Sabtu" },
      { label: "Tiket", value: "2 Dewasa", sublabel: "Reguler", withChevron: true },
    ],
  },
  package: {
    ctaHref: "/packages",
    ctaLabel: "Lihat Paket",
    desktopGridClass: "hidden gap-3 lg:mt-6 lg:grid lg:grid-cols-[1.55fr_1fr_0.92fr_1fr_auto] lg:items-center",
    options: [
      { label: "Domestik", active: true },
      { label: "Internasional" },
      { label: "Open Trip" },
    ],
    desktopFields: [
      { label: "Destinasi", value: "Bali 3H2M", sublabel: "Hotel + Tour" },
      { label: "Durasi", value: "3 Hari 2 Malam", sublabel: "Paket lengkap", withChevron: true },
      { label: "Keberangkatan", value: "1 Juni 2026", sublabel: "Senin" },
      { label: "Peserta", value: "2 Orang", sublabel: "Twin sharing", withChevron: true },
    ],
    mobilePrimaryCount: 1,
    mobileFields: [
      { label: "Destinasi", value: "Bali 3H2M", sublabel: "Hotel + Tour" },
      { label: "Durasi", value: "3H 2M", sublabel: "Paket", withChevron: true },
      { label: "Berangkat", value: "1 Juni", sublabel: "Senin" },
      { label: "Peserta", value: "2 Orang", sublabel: "Twin", withChevron: true },
    ],
  },
}
