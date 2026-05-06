import type { HeroTabKey } from "@/app/components/home/shared/homeContent"

export type HeroSearchFieldData = {
  label: string
  value: string
  sublabel?: string
  group?: string
  withChevron?: boolean
  withSwap?: boolean
  inputType?: "text" | "date" | "select" | "autocomplete"
  options?: { label: string; value: string; sublabel?: string; group?: string }[]
}

export type HeroSearchOption = {
  key: string
  label: string
}

export type HeroSearchVariant = {
  ctaHref: string
  ctaLabel: string
  desktopFields: HeroSearchFieldData[]
  desktopGridClass: string
  mobileFields: HeroSearchFieldData[]
  mobilePrimaryCount: number
  showDesktopSwap?: boolean
}

export type HeroSearchTabConfig = {
  defaultOption: string
  options: HeroSearchOption[]
  variants: Record<string, HeroSearchVariant>
}

export type HeroSearchConfig = HeroSearchVariant & {
  defaultOption: string
  activeOption: string
  options: HeroSearchOption[]
}

export const heroSearchConfigs: Record<HeroTabKey, HeroSearchTabConfig> = {
  flight: {
    defaultOption: "one_way",
    options: [
      { key: "one_way", label: "Sekali Jalan" },
      { key: "round_trip", label: "Pulang - Pergi" },
      { key: "multi_city", label: "Multi Kota" },
    ],
    variants: {
      one_way: {
        ctaHref: "https://redfeng.co/pesawat/",
        ctaLabel: "Cari Tiket",
        desktopGridClass: "hidden gap-3 lg:mt-6 lg:grid lg:grid-cols-[1.3fr_44px_1.3fr_1fr_1fr_auto] lg:items-center",
        showDesktopSwap: true,
        desktopFields: [
          { label: "Dari", value: "CGK   Jakarta", sublabel: "Semua Bandara" },
          { label: "Ke", value: "DPS   Denpasar", sublabel: "Bali" },
          { label: "Berangkat", value: "25 Mei 2026", sublabel: "Minggu" },
          { label: "Penumpang", value: "1 Dewasa, Ekonomi", sublabel: "Kelas Kabin", withChevron: true },
        ],
        mobilePrimaryCount: 2,
        mobileFields: [
          { label: "Dari", value: "Jakarta (CGK)", sublabel: "Soekarno Hatta", withSwap: true },
          { label: "Ke", value: "Denpasar (DPS)", sublabel: "Ngurah Rai" },
          { label: "Berangkat", value: "25 Mei 2026", sublabel: "Minggu" },
          { label: "Penumpang", value: "1 Dewasa", sublabel: "Ekonomi", withChevron: true },
        ],
      },
      round_trip: {
        ctaHref: "https://redfeng.co/pesawat/",
        ctaLabel: "Cari Tiket",
        desktopGridClass: "hidden gap-3 lg:mt-6 lg:grid lg:grid-cols-[1.22fr_44px_1.22fr_0.86fr_0.86fr_1fr_auto] lg:items-center",
        showDesktopSwap: true,
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
      multi_city: {
        ctaHref: "https://redfeng.co/pesawat/",
        ctaLabel: "Cari Rute",
        desktopGridClass: "hidden gap-3 lg:mt-6 lg:grid lg:grid-cols-[1.08fr_1.08fr_1.08fr_0.9fr_1fr_auto] lg:items-center",
        desktopFields: [
          { label: "Kota Asal", value: "Jakarta", sublabel: "CGK" },
          { label: "Transit", value: "Singapore", sublabel: "SIN" },
          { label: "Kota Tujuan", value: "Tokyo", sublabel: "HND" },
          { label: "Berangkat", value: "4 Juni 2026", sublabel: "Kamis" },
          { label: "Penumpang", value: "2 Dewasa", sublabel: "Ekonomi", withChevron: true },
        ],
        mobilePrimaryCount: 1,
        mobileFields: [
          { label: "Rute", value: "Jakarta - Singapore - Tokyo", sublabel: "3 kota" },
          { label: "Berangkat", value: "4 Juni 2026", sublabel: "Kamis" },
          { label: "Penumpang", value: "2 Dewasa", sublabel: "Ekonomi", withChevron: true },
        ],
      },
    },
  },
  hotel: {
    defaultOption: "hotel",
    options: [
      { key: "hotel", label: "Hotel" },
      { key: "villa", label: "Villa" },
      { key: "resort", label: "Resort" },
    ],
    variants: {
      hotel: {
        ctaHref: "https://redfeng.co/hotel/",
        ctaLabel: "Cari Hotel",
        desktopGridClass: "hidden gap-3 lg:mt-6 lg:grid lg:grid-cols-[1.55fr_0.92fr_0.92fr_1fr_auto] lg:items-center",
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
      villa: {
        ctaHref: "https://redfeng.co/hotel/",
        ctaLabel: "Cari Villa",
        desktopGridClass: "hidden gap-3 lg:mt-6 lg:grid lg:grid-cols-[1.45fr_0.9fr_0.9fr_1.08fr_auto] lg:items-center",
        desktopFields: [
          { label: "Area Villa", value: "Ubud", sublabel: "Bali" },
          { label: "Check-in", value: "12 Juni 2026", sublabel: "Jumat" },
          { label: "Check-out", value: "15 Juni 2026", sublabel: "Senin" },
          { label: "Tamu & Kamar", value: "4 Tamu, 2 Kamar", sublabel: "Private pool", withChevron: true },
        ],
        mobilePrimaryCount: 1,
        mobileFields: [
          { label: "Area Villa", value: "Ubud", sublabel: "Bali" },
          { label: "Check-in", value: "12 Juni", sublabel: "Jumat" },
          { label: "Check-out", value: "15 Juni", sublabel: "Senin" },
          { label: "Tamu", value: "4 Tamu", sublabel: "2 Kamar", withChevron: true },
        ],
      },
      resort: {
        ctaHref: "https://redfeng.co/hotel/",
        ctaLabel: "Cari Resort",
        desktopGridClass: "hidden gap-3 lg:mt-6 lg:grid lg:grid-cols-[1.5fr_0.95fr_0.95fr_1fr_auto] lg:items-center",
        desktopFields: [
          { label: "Destinasi Resort", value: "Labuan Bajo", sublabel: "Nusa Tenggara Timur" },
          { label: "Check-in", value: "24 Juni 2026", sublabel: "Rabu" },
          { label: "Check-out", value: "27 Juni 2026", sublabel: "Sabtu" },
          { label: "Tamu & Kamar", value: "2 Tamu, 1 Kamar", sublabel: "Ocean view", withChevron: true },
        ],
        mobilePrimaryCount: 1,
        mobileFields: [
          { label: "Destinasi Resort", value: "Labuan Bajo", sublabel: "NTT" },
          { label: "Check-in", value: "24 Juni", sublabel: "Rabu" },
          { label: "Check-out", value: "27 Juni", sublabel: "Sabtu" },
          { label: "Tamu", value: "2 Tamu", sublabel: "Ocean view", withChevron: true },
        ],
      },
    },
  },
  train: {
    defaultOption: "one_way",
    options: [
      { key: "one_way", label: "Sekali Jalan" },
      { key: "round_trip", label: "Pulang - Pergi" },
      { key: "fast_train", label: "Kereta Cepat" },
    ],
    variants: {
      one_way: {
        ctaHref: "https://redfeng.co/kereta_api/",
        ctaLabel: "Cari Kereta",
        desktopGridClass: "hidden gap-3 lg:mt-6 lg:grid lg:grid-cols-[1.28fr_44px_1.28fr_1fr_1fr_auto] lg:items-center",
        showDesktopSwap: true,
        desktopFields: [
          { label: "Stasiun Asal", value: "Gambir", sublabel: "Jakarta" },
          { label: "Stasiun Tujuan", value: "Bandung", sublabel: "Jawa Barat" },
          { label: "Berangkat", value: "26 Mei 2026", sublabel: "Selasa" },
          { label: "Penumpang", value: "2 Dewasa", sublabel: "Ekonomi", withChevron: true },
        ],
        mobilePrimaryCount: 2,
        mobileFields: [
          { label: "Asal", value: "Gambir", sublabel: "Jakarta", withSwap: true },
          { label: "Tujuan", value: "Bandung", sublabel: "Jawa Barat" },
          { label: "Berangkat", value: "26 Mei", sublabel: "Selasa" },
          { label: "Penumpang", value: "2 Dewasa", sublabel: "Ekonomi", withChevron: true },
        ],
      },
      round_trip: {
        ctaHref: "https://redfeng.co/kereta_api/",
        ctaLabel: "Cari Kereta",
        desktopGridClass: "hidden gap-3 lg:mt-6 lg:grid lg:grid-cols-[1.18fr_44px_1.18fr_0.9fr_0.9fr_1fr_auto] lg:items-center",
        showDesktopSwap: true,
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
      fast_train: {
        ctaHref: "https://redfeng.co/kereta_api/",
        ctaLabel: "Cari Whoosh",
        desktopGridClass: "hidden gap-3 lg:mt-6 lg:grid lg:grid-cols-[1.18fr_44px_1.18fr_0.95fr_1fr_auto] lg:items-center",
        showDesktopSwap: true,
        desktopFields: [
          { label: "Stasiun Asal", value: "Halim", sublabel: "Jakarta" },
          { label: "Stasiun Tujuan", value: "Padalarang", sublabel: "Bandung" },
          { label: "Berangkat", value: "29 Mei 2026", sublabel: "Jumat" },
          { label: "Penumpang", value: "2 Dewasa", sublabel: "Premium Economy", withChevron: true },
        ],
        mobilePrimaryCount: 2,
        mobileFields: [
          { label: "Asal", value: "Halim", sublabel: "Jakarta", withSwap: true },
          { label: "Tujuan", value: "Padalarang", sublabel: "Bandung" },
          { label: "Berangkat", value: "29 Mei", sublabel: "Jumat" },
          { label: "Penumpang", value: "2 Dewasa", sublabel: "Premium", withChevron: true },
        ],
      },
    },
  },
  bus: {
    defaultOption: "one_way",
    options: [
      { key: "one_way", label: "Sekali Jalan" },
      { key: "round_trip", label: "Pulang - Pergi" },
      { key: "sleeper", label: "Sleeper Bus" },
    ],
    variants: {
      one_way: {
        ctaHref: "https://redfeng.co/bus-travel/",
        ctaLabel: "Cari Bus",
        desktopGridClass: "hidden gap-3 lg:mt-6 lg:grid lg:grid-cols-[1.22fr_1.22fr_0.92fr_0.9fr_1fr_auto] lg:items-center",
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
      round_trip: {
        ctaHref: "https://redfeng.co/bus-travel/",
        ctaLabel: "Cari Bus",
        desktopGridClass: "hidden gap-3 lg:mt-6 lg:grid lg:grid-cols-[1.14fr_1.14fr_0.88fr_0.88fr_1fr_auto] lg:items-center",
        desktopFields: [
          { label: "Kota Asal", value: "Jakarta", sublabel: "Pulo Gebang" },
          { label: "Kota Tujuan", value: "Yogyakarta", sublabel: "Jombor" },
          { label: "Pergi", value: "24 Mei 2026", sublabel: "Minggu" },
          { label: "Pulang", value: "27 Mei 2026", sublabel: "Rabu" },
          { label: "Penumpang", value: "2 Penumpang", sublabel: "Executive", withChevron: true },
        ],
        mobilePrimaryCount: 2,
        mobileFields: [
          { label: "Asal", value: "Jakarta", sublabel: "Pulo Gebang" },
          { label: "Tujuan", value: "Yogyakarta", sublabel: "Jombor" },
          { label: "Pergi", value: "24 Mei", sublabel: "Minggu" },
          { label: "Pulang", value: "27 Mei", sublabel: "Rabu" },
          { label: "Penumpang", value: "2 Orang", sublabel: "Executive", withChevron: true },
        ],
      },
      sleeper: {
        ctaHref: "https://redfeng.co/bus-travel/",
        ctaLabel: "Cari Sleeper",
        desktopGridClass: "hidden gap-3 lg:mt-6 lg:grid lg:grid-cols-[1.2fr_1.2fr_0.9fr_0.95fr_1fr_auto] lg:items-center",
        desktopFields: [
          { label: "Kota Asal", value: "Jakarta", sublabel: "Pulo Gebang" },
          { label: "Kota Tujuan", value: "Malang", sublabel: "Arjosari" },
          { label: "Tanggal", value: "31 Mei 2026", sublabel: "Minggu" },
          { label: "Jam", value: "21:00", sublabel: "Sleeper night" },
          { label: "Penumpang", value: "1 Penumpang", sublabel: "Sleeper suite", withChevron: true },
        ],
        mobilePrimaryCount: 2,
        mobileFields: [
          { label: "Asal", value: "Jakarta", sublabel: "Pulo Gebang" },
          { label: "Tujuan", value: "Malang", sublabel: "Arjosari" },
          { label: "Tanggal", value: "31 Mei", sublabel: "Minggu" },
          { label: "Jam", value: "21:00", sublabel: "Sleeper" },
          { label: "Penumpang", value: "1 Orang", sublabel: "Suite", withChevron: true },
        ],
      },
    },
  },
  ship: {
    defaultOption: "one_way",
    options: [
      { key: "one_way", label: "Sekali Jalan" },
      { key: "round_trip", label: "Pulang - Pergi" },
      { key: "fast_ferry", label: "Ferry Cepat" },
    ],
    variants: {
      one_way: {
        ctaHref: "https://redfeng.co/kapal_laut/",
        ctaLabel: "Cari Kapal",
        desktopGridClass: "hidden gap-3 lg:mt-6 lg:grid lg:grid-cols-[1.28fr_44px_1.28fr_1fr_1fr_auto] lg:items-center",
        showDesktopSwap: true,
        desktopFields: [
          { label: "Pelabuhan Asal", value: "Merak", sublabel: "Banten" },
          { label: "Pelabuhan Tujuan", value: "Bakauheni", sublabel: "Lampung" },
          { label: "Berangkat", value: "22 Mei 2026", sublabel: "Jumat" },
          { label: "Penumpang", value: "2 Dewasa", sublabel: "Ekonomi", withChevron: true },
        ],
        mobilePrimaryCount: 2,
        mobileFields: [
          { label: "Asal", value: "Merak", sublabel: "Banten", withSwap: true },
          { label: "Tujuan", value: "Bakauheni", sublabel: "Lampung" },
          { label: "Berangkat", value: "22 Mei", sublabel: "Jumat" },
          { label: "Penumpang", value: "2 Dewasa", sublabel: "Ekonomi", withChevron: true },
        ],
      },
      round_trip: {
        ctaHref: "https://redfeng.co/kapal_laut/",
        ctaLabel: "Cari Kapal",
        desktopGridClass: "hidden gap-3 lg:mt-6 lg:grid lg:grid-cols-[1.18fr_44px_1.18fr_0.9fr_0.9fr_1fr_auto] lg:items-center",
        showDesktopSwap: true,
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
      fast_ferry: {
        ctaHref: "https://redfeng.co/kapal_laut/",
        ctaLabel: "Cari Ferry",
        desktopGridClass: "hidden gap-3 lg:mt-6 lg:grid lg:grid-cols-[1.2fr_44px_1.2fr_0.9fr_1fr_auto] lg:items-center",
        showDesktopSwap: true,
        desktopFields: [
          { label: "Pelabuhan Asal", value: "Sanur", sublabel: "Bali" },
          { label: "Pelabuhan Tujuan", value: "Nusa Penida", sublabel: "Banjar Nyuh" },
          { label: "Berangkat", value: "6 Juni 2026", sublabel: "Sabtu" },
          { label: "Penumpang", value: "2 Dewasa", sublabel: "Fast ferry", withChevron: true },
        ],
        mobilePrimaryCount: 2,
        mobileFields: [
          { label: "Asal", value: "Sanur", sublabel: "Bali", withSwap: true },
          { label: "Tujuan", value: "Nusa Penida", sublabel: "Banjar Nyuh" },
          { label: "Berangkat", value: "6 Juni", sublabel: "Sabtu" },
          { label: "Penumpang", value: "2 Dewasa", sublabel: "Fast ferry", withChevron: true },
        ],
      },
    },
  },
  activity: {
    defaultOption: "attraction",
    options: [
      { key: "attraction", label: "Atraksi" },
      { key: "tour", label: "Tur" },
      { key: "event", label: "Event" },
    ],
    variants: {
      attraction: {
        ctaHref: "https://redfeng.co/aktivitas/",
        ctaLabel: "Cari Aktivitas",
        desktopGridClass: "hidden gap-3 lg:mt-6 lg:grid lg:grid-cols-[1.55fr_1fr_0.92fr_1fr_auto] lg:items-center",
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
      tour: {
        ctaHref: "https://redfeng.co/aktivitas/",
        ctaLabel: "Cari Tur",
        desktopGridClass: "hidden gap-3 lg:mt-6 lg:grid lg:grid-cols-[1.52fr_1fr_0.92fr_1fr_auto] lg:items-center",
        desktopFields: [
          { label: "Destinasi", value: "Great Wall Day Tour", sublabel: "Beijing, China" },
          { label: "Jenis Tur", value: "Private tour", sublabel: "Guide included", withChevron: true },
          { label: "Tanggal", value: "14 Juni 2026", sublabel: "Minggu" },
          { label: "Peserta", value: "4 Orang", sublabel: "Full-day trip", withChevron: true },
        ],
        mobilePrimaryCount: 1,
        mobileFields: [
          { label: "Destinasi", value: "Great Wall Day Tour", sublabel: "Beijing" },
          { label: "Jenis Tur", value: "Private tour", sublabel: "Guide", withChevron: true },
          { label: "Tanggal", value: "14 Juni", sublabel: "Minggu" },
          { label: "Peserta", value: "4 Orang", sublabel: "Full day", withChevron: true },
        ],
      },
      event: {
        ctaHref: "https://redfeng.co/aktivitas/",
        ctaLabel: "Cari Event",
        desktopGridClass: "hidden gap-3 lg:mt-6 lg:grid lg:grid-cols-[1.55fr_1fr_0.92fr_1fr_auto] lg:items-center",
        desktopFields: [
          { label: "Event", value: "Universal Beijing Night Show", sublabel: "Beijing" },
          { label: "Kategori", value: "Live entertainment", sublabel: "Limited seats", withChevron: true },
          { label: "Tanggal", value: "21 Juni 2026", sublabel: "Minggu" },
          { label: "Tiket", value: "2 Dewasa", sublabel: "VIP", withChevron: true },
        ],
        mobilePrimaryCount: 1,
        mobileFields: [
          { label: "Event", value: "Universal Beijing Night Show", sublabel: "Beijing" },
          { label: "Kategori", value: "Live entertainment", sublabel: "VIP", withChevron: true },
          { label: "Tanggal", value: "21 Juni", sublabel: "Minggu" },
          { label: "Tiket", value: "2 Dewasa", sublabel: "VIP", withChevron: true },
        ],
      },
    },
  },
  package: {
    defaultOption: "domestic",
    options: [
      { key: "domestic", label: "Domestik" },
      { key: "international", label: "Internasional" },
      { key: "open_trip", label: "Open Trip" },
    ],
    variants: {
      domestic: {
        ctaHref: "/packages",
        ctaLabel: "Lihat Paket",
        desktopGridClass: "hidden gap-3 lg:mt-6 lg:grid lg:grid-cols-[1.55fr_1fr_0.92fr_1fr_auto] lg:items-center",
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
      international: {
        ctaHref: "/packages",
        ctaLabel: "Lihat Paket",
        desktopGridClass: "hidden gap-3 lg:mt-6 lg:grid lg:grid-cols-[1.55fr_1fr_0.92fr_1fr_auto] lg:items-center",
        desktopFields: [
          { label: "Destinasi", value: "Shanghai 4H3M", sublabel: "Hotel + City Tour" },
          { label: "Durasi", value: "4 Hari 3 Malam", sublabel: "Visa assist", withChevron: true },
          { label: "Keberangkatan", value: "8 Juni 2026", sublabel: "Senin" },
          { label: "Peserta", value: "2 Orang", sublabel: "Twin sharing", withChevron: true },
        ],
        mobilePrimaryCount: 1,
        mobileFields: [
          { label: "Destinasi", value: "Shanghai 4H3M", sublabel: "City Tour" },
          { label: "Durasi", value: "4H 3M", sublabel: "Visa assist", withChevron: true },
          { label: "Berangkat", value: "8 Juni", sublabel: "Senin" },
          { label: "Peserta", value: "2 Orang", sublabel: "Twin", withChevron: true },
        ],
      },
      open_trip: {
        ctaHref: "/packages",
        ctaLabel: "Lihat Open Trip",
        desktopGridClass: "hidden gap-3 lg:mt-6 lg:grid lg:grid-cols-[1.48fr_1fr_0.92fr_1fr_auto] lg:items-center",
        desktopFields: [
          { label: "Trip", value: "Bromo Sunrise Trip", sublabel: "Join trip" },
          { label: "Durasi", value: "2 Hari 1 Malam", sublabel: "Shared itinerary", withChevron: true },
          { label: "Keberangkatan", value: "15 Juni 2026", sublabel: "Senin" },
          { label: "Peserta", value: "1 Orang", sublabel: "Seat available", withChevron: true },
        ],
        mobilePrimaryCount: 1,
        mobileFields: [
          { label: "Trip", value: "Bromo Sunrise Trip", sublabel: "Join trip" },
          { label: "Durasi", value: "2H 1M", sublabel: "Shared", withChevron: true },
          { label: "Berangkat", value: "15 Juni", sublabel: "Senin" },
          { label: "Peserta", value: "1 Orang", sublabel: "Available", withChevron: true },
        ],
      },
    },
  },
}

export function getHeroSearchConfig(tab: HeroTabKey, optionKey?: string): HeroSearchConfig {
  const tabConfig = heroSearchConfigs[tab]
  const activeOption = optionKey && tabConfig.variants[optionKey] ? optionKey : tabConfig.defaultOption

  return {
    defaultOption: tabConfig.defaultOption,
    activeOption,
    options: tabConfig.options,
    ...tabConfig.variants[activeOption],
  }
}
