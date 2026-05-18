export type DummyServiceSlug =
  | "pesawat"
  | "hotel"
  | "kereta"
  | "bus"
  | "kapal"
  | "kapal-pesiar"
  | "aktivitas"

export type DummyCatalogItem = {
  id: string
  title: string
  location: string
  region: string
  group: string
  image: string
  availabilityNote: string
  statusNote: string
  highlights: string[]
}

export type DummyServiceCatalog = {
  slug: DummyServiceSlug
  emptyKeyword: string
  searchPlaceholder: string
  supportHref: string
  promoHref: string
  uiCopy: {
    id: {
      searchNoun: string
      resultTitle: string
      resultNoun: string
      keywordLabel: string
      regionLabel: string
      groupLabel: string
      locationLabel: string
    }
    en: {
      searchNoun: string
      resultTitle: string
      resultNoun: string
      keywordLabel: string
      regionLabel: string
      groupLabel: string
      locationLabel: string
    }
  }
  items: DummyCatalogItem[]
}

const dummyCatalogs: Record<DummyServiceSlug, DummyServiceCatalog> = {
  pesawat: {
    slug: "pesawat",
    emptyKeyword: "rute atau maskapai",
    searchPlaceholder: "Cari rute, kota, atau maskapai dummy",
    supportHref: "/bantuan",
    promoHref: "/promo",
    uiCopy: {
      id: {
        searchNoun: "rute dan maskapai contoh",
        resultTitle: "Hasil katalog rute",
        resultNoun: "rute contoh",
        keywordLabel: "Rute / maskapai",
        regionLabel: "Region terbang",
        groupLabel: "Tipe perjalanan",
        locationLabel: "Kode rute",
      },
      en: {
        searchNoun: "sample routes and airlines",
        resultTitle: "Route catalog results",
        resultNoun: "sample routes",
        keywordLabel: "Route / airline",
        regionLabel: "Flight region",
        groupLabel: "Trip type",
        locationLabel: "Route code",
      },
    },
    items: [
      {
        id: "flight-cgk-dps",
        title: "Jakarta - Denpasar Saver Window",
        location: "CGK - DPS",
        region: "Domestik",
        group: "Sekali jalan",
        image: "/home-assets/card-flight.png",
        availabilityNote: "Contoh katalog rute populer untuk fondasi flight-ready.",
        statusNote: "Belum checkout live, siap dipakai untuk validasi route dan promo checkout nanti.",
        highlights: ["Garuda / Citilink mix", "Pagi - siang", "Economy focus"],
      },
      {
        id: "flight-cgk-sin",
        title: "Jakarta - Singapore Business Window",
        location: "CGK - SIN",
        region: "Internasional",
        group: "Business",
        image: "/home-assets/promo-flight.png",
        availabilityNote: "Dummy inventory untuk contoh city pair internasional.",
        statusNote: "Cocok untuk sambungan fare class, airline targeting, dan promo regional.",
        highlights: ["Business cabin", "Weekday demand", "Regional traffic"],
      },
      {
        id: "flight-sub-bpn",
        title: "Surabaya - Balikpapan Project Route",
        location: "SUB - BPN",
        region: "Domestik",
        group: "Pulang pergi",
        image: "/home-assets/card-flight.png",
        availabilityNote: "Contoh rute operasional dengan pola corporate.",
        statusNote: "Bisa dipakai untuk menguji trip type, return date, dan quota user.",
        highlights: ["Round-trip", "Corporate need", "Short stay"],
      },
      {
        id: "flight-dps-kul",
        title: "Bali - Kuala Lumpur Leisure Flow",
        location: "DPS - KUL",
        region: "Internasional",
        group: "Promo route",
        image: "/home-assets/promo-flight.png",
        availabilityNote: "Dummy route untuk promo lintas destinasi favorit.",
        statusNote: "Belum live, tapi sudah cocok untuk rule airline, cabin, dan departure window.",
        highlights: ["Weekend peak", "Leisure demand", "Promo-friendly"],
      },
    ],
  },
  hotel: {
    slug: "hotel",
    emptyKeyword: "kota atau properti",
    searchPlaceholder: "Cari kota, area, atau hotel dummy",
    supportHref: "/bantuan",
    promoHref: "/promo",
    uiCopy: {
      id: {
        searchNoun: "properti dan area contoh",
        resultTitle: "Hasil katalog properti",
        resultNoun: "properti contoh",
        keywordLabel: "Kota / properti",
        regionLabel: "Region menginap",
        groupLabel: "Tipe properti",
        locationLabel: "Area properti",
      },
      en: {
        searchNoun: "sample properties and areas",
        resultTitle: "Property catalog results",
        resultNoun: "sample properties",
        keywordLabel: "City / property",
        regionLabel: "Stay region",
        groupLabel: "Property type",
        locationLabel: "Property area",
      },
    },
    items: [
      {
        id: "hotel-bali-resort",
        title: "Kuta Sunset Resort Collection",
        location: "Kuta, Bali",
        region: "Indonesia",
        group: "Resort",
        image: "/home-assets/card-hotel-1.png",
        availabilityNote: "Contoh katalog hotel leisure dengan city targeting.",
        statusNote: "Belum inventory live, tapi siap untuk city, star rating, check-in, dan durasi inap.",
        highlights: ["4 star", "Family stay", "Beach corridor"],
      },
      {
        id: "hotel-jakarta-business",
        title: "Sudirman Business Stay Hub",
        location: "Jakarta Pusat",
        region: "Indonesia",
        group: "Business hotel",
        image: "/home-assets/card-hotel-2.png",
        availabilityNote: "Dummy properti untuk kebutuhan weekday dan corporate stay.",
        statusNote: "Bisa dipakai untuk menguji nightly stay, payment method targeting, dan hotel city code.",
        highlights: ["Weekday booking", "Business area", "Breakfast included"],
      },
      {
        id: "hotel-singapore-city",
        title: "Marina City Connect Hotel",
        location: "Singapore",
        region: "Asia",
        group: "City hotel",
        image: "/home-assets/promo-hotel.png",
        availabilityNote: "Contoh katalog internasional dengan positioning urban stay.",
        statusNote: "Fondasi hotel-ready untuk country targeting dan stay window lintas negara.",
        highlights: ["5 star", "Urban trip", "Short break"],
      },
      {
        id: "hotel-tokyo-compact",
        title: "Shinjuku Compact Stay",
        location: "Tokyo",
        region: "Asia",
        group: "Compact stay",
        image: "/home-assets/card-hotel-2.png",
        availabilityNote: "Dummy unit untuk kebutuhan short stay dan city explorer.",
        statusNote: "Belum live, tetapi struktur checkout hotel nanti bisa memakai shape data yang sama.",
        highlights: ["3 star", "Transit stay", "Metro access"],
      },
    ],
  },
  kereta: {
    slug: "kereta",
    emptyKeyword: "rute atau layanan",
    searchPlaceholder: "Cari rute atau layanan kereta dummy",
    supportHref: "/bantuan",
    promoHref: "/promo",
    uiCopy: {
      id: {
        searchNoun: "jalur dan layanan kereta contoh",
        resultTitle: "Hasil katalog jalur",
        resultNoun: "jalur contoh",
        keywordLabel: "Rute / layanan",
        regionLabel: "Koridor kereta",
        groupLabel: "Jenis layanan",
        locationLabel: "Koridor stasiun",
      },
      en: {
        searchNoun: "sample rail lines and services",
        resultTitle: "Rail catalog results",
        resultNoun: "sample rail lines",
        keywordLabel: "Route / service",
        regionLabel: "Rail corridor",
        groupLabel: "Service type",
        locationLabel: "Station corridor",
      },
    },
    items: [
      {
        id: "train-whoosh-jkt-bdg",
        title: "Jakarta - Bandung Fast Rail Window",
        location: "Halim - Tegalluar",
        region: "Jawa",
        group: "Kereta cepat",
        image: "/home-assets/card-train.png",
        availabilityNote: "Contoh katalog cepat untuk rute high-demand.",
        statusNote: "Belum seat live, cocok untuk fondasi jadwal, kelas, dan promo jalur populer.",
        highlights: ["WHOOSH", "Premium economy", "Same-day trip"],
      },
      {
        id: "train-gambir-yogya",
        title: "Gambir - Yogyakarta Heritage Line",
        location: "Jakarta - Yogyakarta",
        region: "Jawa",
        group: "Antarkota",
        image: "/home-assets/card-train.png",
        availabilityNote: "Dummy rute klasik untuk long-distance train catalog.",
        statusNote: "Bisa dipakai untuk menyusun layer operator, class targeting, dan departure timing.",
        highlights: ["Night route", "Executive focus", "Leisure mix"],
      },
      {
        id: "train-sby-mlg",
        title: "Surabaya - Malang Regular Shuttle",
        location: "Surabaya - Malang",
        region: "Jawa Timur",
        group: "Komuter",
        image: "/home-assets/card-train.png",
        availabilityNote: "Contoh layanan pendek untuk komuter dan keluarga.",
        statusNote: "Fondasi dummy untuk route regional dan volume transaksi kecil-menengah.",
        highlights: ["Short hop", "Daily repeat", "Budget-friendly"],
      },
      {
        id: "train-jkt-solo",
        title: "Jakarta - Solo Family Rail Plan",
        location: "Jakarta - Solo",
        region: "Jawa",
        group: "Family route",
        image: "/home-assets/card-train.png",
        availabilityNote: "Dummy jalur keluarga dengan pola liburan.",
        statusNote: "Belum live, namun siap menjadi anchor untuk promo seasonal kereta.",
        highlights: ["Holiday demand", "Family cabin", "Weekend heavy"],
      },
    ],
  },
  bus: {
    slug: "bus",
    emptyKeyword: "rute atau operator",
    searchPlaceholder: "Cari rute atau operator bus dummy",
    supportHref: "/bantuan",
    promoHref: "/promo",
    uiCopy: {
      id: {
        searchNoun: "operator dan koridor bus contoh",
        resultTitle: "Hasil katalog operator",
        resultNoun: "operator contoh",
        keywordLabel: "Rute / operator",
        regionLabel: "Region darat",
        groupLabel: "Tipe layanan",
        locationLabel: "Koridor perjalanan",
      },
      en: {
        searchNoun: "sample bus operators and corridors",
        resultTitle: "Operator catalog results",
        resultNoun: "sample operators",
        keywordLabel: "Route / operator",
        regionLabel: "Ground region",
        groupLabel: "Service type",
        locationLabel: "Travel corridor",
      },
    },
    items: [
      {
        id: "bus-jkt-bdg",
        title: "Jakarta - Bandung Express Sleeper",
        location: "Jakarta - Bandung",
        region: "Jawa Barat",
        group: "Sleeper",
        image: "/home-assets/hero-bg.png",
        availabilityNote: "Contoh katalog sleeper dan premium coach.",
        statusNote: "Belum operator live, siap untuk fondasi jadwal, operator, dan rute.",
        highlights: ["Sleeper seat", "Night route", "High frequency"],
      },
      {
        id: "bus-sby-yk",
        title: "Surabaya - Yogyakarta Intercity",
        location: "Surabaya - Yogyakarta",
        region: "Jawa",
        group: "Antarkota",
        image: "/home-assets/hero-reference.png",
        availabilityNote: "Dummy operator antarkota untuk contoh route map.",
        statusNote: "Cocok untuk pengujian harga operator, pickup point, dan waktu berangkat.",
        highlights: ["Pickup point", "Mid-tier fare", "Student demand"],
      },
      {
        id: "bus-medan-aceh",
        title: "Medan - Banda Aceh Corridor",
        location: "Medan - Banda Aceh",
        region: "Sumatra",
        group: "Lintas provinsi",
        image: "/home-assets/hero-bg.png",
        availabilityNote: "Contoh lintas provinsi untuk ekspansi beyond Jawa.",
        statusNote: "Belum live, tetapi struktur katalog dummy ini siap untuk operator regional.",
        highlights: ["Long haul", "Regional operator", "Overnight"],
      },
      {
        id: "bus-bali-labuanbajo",
        title: "Bali Overland Connector",
        location: "Denpasar - Labuan Bajo",
        region: "Nusa Tenggara",
        group: "Travel combo",
        image: "/home-assets/dest-labuanbajo.png",
        availabilityNote: "Dummy travel combo untuk rute wisata.",
        statusNote: "Berguna untuk menguji packaging bus + aktivitas pada tahap berikutnya.",
        highlights: ["Travel combo", "Leisure route", "Seasonal"],
      },
    ],
  },
  kapal: {
    slug: "kapal",
    emptyKeyword: "pelabuhan atau rute",
    searchPlaceholder: "Cari pelabuhan atau rute kapal dummy",
    supportHref: "/bantuan",
    promoHref: "/promo",
    uiCopy: {
      id: {
        searchNoun: "pelabuhan dan rute laut contoh",
        resultTitle: "Hasil katalog pelayaran",
        resultNoun: "pelayaran contoh",
        keywordLabel: "Pelabuhan / rute",
        regionLabel: "Region laut",
        groupLabel: "Tipe pelayaran",
        locationLabel: "Koridor pelabuhan",
      },
      en: {
        searchNoun: "sample ports and sea routes",
        resultTitle: "Sailing catalog results",
        resultNoun: "sample sailings",
        keywordLabel: "Port / route",
        regionLabel: "Sea region",
        groupLabel: "Sailing type",
        locationLabel: "Port corridor",
      },
    },
    items: [
      {
        id: "ship-merak-bakauheni",
        title: "Merak - Bakauheni Fast Ferry Flow",
        location: "Banten - Lampung",
        region: "Selat Sunda",
        group: "Fast ferry",
        image: "/home-assets/hero-reference.png",
        availabilityNote: "Contoh katalog penyeberangan ramai dengan pola harian.",
        statusNote: "Belum live, tapi siap untuk struktur pelabuhan, trip window, dan operator.",
        highlights: ["Daily crossing", "Vehicle-ready", "Peak holiday"],
      },
      {
        id: "ship-bali-lombok",
        title: "Padang Bai - Senggigi Sea Link",
        location: "Bali - Lombok",
        region: "Nusa Tenggara",
        group: "Leisure ferry",
        image: "/home-assets/dest-bali.png",
        availabilityNote: "Dummy rute wisata bahari untuk perjalanan pendek.",
        statusNote: "Cocok menjadi dasar promo regional dan penargetan musim liburan.",
        highlights: ["Short crossing", "Tourist route", "Weekend demand"],
      },
      {
        id: "ship-surabaya-makassar",
        title: "Surabaya - Makassar Regular Sea Route",
        location: "Surabaya - Makassar",
        region: "Antarpulau",
        group: "Kapal laut",
        image: "/home-assets/hero-bg.png",
        availabilityNote: "Contoh rute jarak jauh untuk katalog antarpulau.",
        statusNote: "Belum ticketing live, siap untuk fondasi jadwal multi-day dan cabin basic.",
        highlights: ["Long haul", "Cabin mix", "Logistics corridor"],
      },
      {
        id: "ship-batam-bintan",
        title: "Batam - Bintan Island Shuttle",
        location: "Batam - Bintan",
        region: "Kepulauan Riau",
        group: "Island shuttle",
        image: "/home-assets/dest-singapore.png",
        availabilityNote: "Dummy island shuttle untuk kebutuhan short transfer.",
        statusNote: "Berguna untuk fondasi transfer harbor dan opsi multi-operator.",
        highlights: ["Short transfer", "Island hop", "Frequent departure"],
      },
    ],
  },
  "kapal-pesiar": {
    slug: "kapal-pesiar",
    emptyKeyword: "itinerary atau pelayaran",
    searchPlaceholder: "Cari itinerary cruise dummy",
    supportHref: "/bantuan",
    promoHref: "/promo",
    uiCopy: {
      id: {
        searchNoun: "itinerary dan cabin cruise contoh",
        resultTitle: "Hasil katalog itinerary",
        resultNoun: "itinerary contoh",
        keywordLabel: "Itinerary / cruise",
        regionLabel: "Region pelayaran",
        groupLabel: "Tipe cruise",
        locationLabel: "Jalur itinerary",
      },
      en: {
        searchNoun: "sample cruise itineraries and cabins",
        resultTitle: "Itinerary catalog results",
        resultNoun: "sample itineraries",
        keywordLabel: "Itinerary / cruise",
        regionLabel: "Sailing region",
        groupLabel: "Cruise type",
        locationLabel: "Itinerary route",
      },
    },
    items: [
      {
        id: "cruise-singapore-penang",
        title: "Singapore - Penang Weekend Cruise",
        location: "Singapore - Penang",
        region: "Asia Tenggara",
        group: "Weekend cruise",
        image: "/home-assets/dest-singapore.png",
        availabilityNote: "Contoh itinerary pendek untuk premium leisure.",
        statusNote: "Belum live, tetapi siap untuk cabin class, sail date, dan promo seasonal.",
        highlights: ["3D2N", "Balcony mix", "Weekend getaway"],
      },
      {
        id: "cruise-bali-komodo",
        title: "Bali - Komodo Scenic Voyage",
        location: "Bali - Labuan Bajo",
        region: "Indonesia",
        group: "Scenic cruise",
        image: "/home-assets/dest-labuanbajo.png",
        availabilityNote: "Dummy itinerary premium untuk jalur wisata unggulan.",
        statusNote: "Bisa jadi fondasi paket hybrid cruise + aktivitas pada fase berikutnya.",
        highlights: ["Luxury route", "Island view", "Premium cabin"],
      },
      {
        id: "cruise-shanghai-okinawa",
        title: "Shanghai - Okinawa Seasonal Sailing",
        location: "Shanghai - Okinawa",
        region: "Asia Timur",
        group: "Seasonal",
        image: "/home-assets/hero-header-background-1.jpg",
        availabilityNote: "Contoh itinerary lintas negara untuk cruise seasonal.",
        statusNote: "Belum live, cocok untuk promosi window-based dan cabin targeting.",
        highlights: ["Seasonal run", "International", "Family cruise"],
      },
      {
        id: "cruise-japan-spring",
        title: "Japan Spring Blossom Cruise",
        location: "Tokyo - Osaka",
        region: "Jepang",
        group: "Theme cruise",
        image: "/home-assets/dest-tokyo.png",
        availabilityNote: "Dummy thematic sailing untuk promosi kalender musiman.",
        statusNote: "Berguna untuk menguji landing premium dan summary itinerary multi-stop.",
        highlights: ["Cherry season", "Multi-stop", "Premium positioning"],
      },
    ],
  },
  aktivitas: {
    slug: "aktivitas",
    emptyKeyword: "aktivitas atau destinasi",
    searchPlaceholder: "Cari aktivitas dummy atau destinasi",
    supportHref: "/bantuan",
    promoHref: "/promo",
    uiCopy: {
      id: {
        searchNoun: "atraksi dan aktivitas contoh",
        resultTitle: "Hasil katalog aktivitas",
        resultNoun: "aktivitas contoh",
        keywordLabel: "Aktivitas / destinasi",
        regionLabel: "Region pengalaman",
        groupLabel: "Tipe aktivitas",
        locationLabel: "Lokasi aktivitas",
      },
      en: {
        searchNoun: "sample attractions and activities",
        resultTitle: "Activity catalog results",
        resultNoun: "sample activities",
        keywordLabel: "Activity / destination",
        regionLabel: "Experience region",
        groupLabel: "Activity type",
        locationLabel: "Activity location",
      },
    },
    items: [
      {
        id: "activity-bali-atv",
        title: "Bali ATV Jungle Pass",
        location: "Ubud, Bali",
        region: "Indonesia",
        group: "Outdoor",
        image: "/home-assets/dest-bali.png",
        availabilityNote: "Contoh katalog atraksi luar ruang dengan voucher flow.",
        statusNote: "Belum voucher live, siap untuk fondasi instant redeem dan date window.",
        highlights: ["Outdoor", "Voucher-ready", "Half-day"],
      },
      {
        id: "activity-jakarta-observatory",
        title: "Jakarta City Observatory Entry",
        location: "Jakarta",
        region: "Indonesia",
        group: "City experience",
        image: "/home-assets/dest-jakarta.png",
        availabilityNote: "Dummy tiket atraksi urban untuk city break.",
        statusNote: "Cocok untuk penargetan date slot, quota per user, dan promo kode.",
        highlights: ["Urban attraction", "Timed entry", "Family-friendly"],
      },
      {
        id: "activity-bangkok-food-tour",
        title: "Bangkok Night Food Walk",
        location: "Bangkok",
        region: "Asia",
        group: "Guided tour",
        image: "/home-assets/dest-bangkok.png",
        availabilityNote: "Contoh aktivitas terkurasi untuk short guided tour.",
        statusNote: "Belum live, tetapi shape data dummy ini siap untuk supplier aktivitas nanti.",
        highlights: ["Night tour", "Guide included", "Small group"],
      },
      {
        id: "activity-tokyo-pass",
        title: "Tokyo Urban Multi-Attraction Pass",
        location: "Tokyo",
        region: "Asia",
        group: "Multi-pass",
        image: "/home-assets/dest-tokyo.png",
        availabilityNote: "Dummy city pass untuk use case voucher multi-visit.",
        statusNote: "Siap menjadi dasar katalog aktivitas instan setelah supplier live disambungkan.",
        highlights: ["City pass", "Multi-entry", "Traveler favorite"],
      },
    ],
  },
}

export function getDummyServiceCatalog(slug: DummyServiceSlug) {
  return dummyCatalogs[slug]
}
