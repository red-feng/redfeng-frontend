import type { Locale } from "@/lib/i18n"

const facilityLabelMap: Record<string, Record<Locale, string>> = {
  "Bantuan pengurusan visa": {
    id: "Bantuan pengurusan visa",
    en: "Visa processing assistance",
    zh: "签证办理协助",
  },
  "Sarapan harian": {
    id: "Sarapan harian",
    en: "Daily breakfast",
    zh: "每日早餐",
  },
  "Hotel Bintang 2": {
    id: "Hotel Bintang 2",
    en: "2-star hotel",
    zh: "二星酒店",
  },
  "Hotel Bintang 3": {
    id: "Hotel Bintang 3",
    en: "3-star hotel",
    zh: "三星酒店",
  },
  "Hotel Bintang 4": {
    id: "Hotel Bintang 4",
    en: "4-star hotel",
    zh: "四星酒店",
  },
  "Hotel Bintang 5": {
    id: "Hotel Bintang 5",
    en: "5-star hotel",
    zh: "五星酒店",
  },
  "Tiket masuk objek wisata": {
    id: "Tiket masuk objek wisata",
    en: "Tourist attraction entry tickets",
    zh: "景区入场门票",
  },
  "Asuransi perjalanan": {
    id: "Asuransi perjalanan",
    en: "Travel insurance",
    zh: "旅游保险",
  },
  "Guide lokal / berlisensi": {
    id: "Guide lokal / berlisensi",
    en: "Local / licensed guide",
    zh: "当地 / 持证导游",
  },
  "Dokumentasi foto/video": {
    id: "Dokumentasi foto/video",
    en: "Photo/video documentation",
    zh: "照片 / 视频记录",
  },
  "Pilihan makanan halal": {
    id: "Pilihan makanan halal",
    en: "Halal meal option",
    zh: "清真餐食选项",
  },
  "Driver berpengalaman & BBM": {
    id: "Driver berpengalaman & BBM",
    en: "Experienced driver & fuel",
    zh: "资深司机与燃油",
  },
  "Tiket transportasi antarkota": {
    id: "Tiket transportasi antarkota",
    en: "Intercity transport tickets",
    zh: "跨城交通票",
  },
  "Transportasi selama tour": {
    id: "Transportasi selama tour",
    en: "Transport during tour",
    zh: "行程交通",
  },
  "Antar-jemput bandara / meeting point": {
    id: "Antar-jemput bandara / meeting point",
    en: "Airport / meeting point transfer",
    zh: "机场 / 集合点接送",
  },
  "Makan siang": {
    id: "Makan siang",
    en: "Lunch",
    zh: "午餐",
  },
  "Makan malam": {
    id: "Makan malam",
    en: "Dinner",
    zh: "晚餐",
  },
  "Air mineral": {
    id: "Air mineral",
    en: "Mineral water",
    zh: "矿泉水",
  },
  "Tour leader": {
    id: "Tour leader",
    en: "Tour leader",
    zh: "领队",
  },
  "Parkir & tol": {
    id: "Parkir & tol",
    en: "Parking & toll",
    zh: "停车与过路费",
  },
  "Bantuan visa": {
    id: "Bantuan visa",
    en: "Visa assistance",
    zh: "签证协助",
  },
  "Termasuk Sarapan": {
    id: "Termasuk Sarapan",
    en: "Breakfast included",
    zh: "含早餐",
  },
  "Restoran Halal": {
    id: "Restoran Halal",
    en: "Halal restaurant",
    zh: "清真餐厅",
  },
  "Tiket pesawat / kereta / kapal": {
    id: "Tiket pesawat / kereta / kapal",
    en: "Flight / train / ferry tickets",
    zh: "机票 / 火车 / 船票",
  },
  "Kendaraan selama tour": {
    id: "Kendaraan selama tour",
    en: "Vehicle during tour",
    zh: "行程用车",
  },
  "Asuransi wisata domestik": {
    id: "Asuransi wisata domestik",
    en: "Domestic travel insurance",
    zh: "国内旅游保险",
  },
  "Perlindungan kecelakaan": {
    id: "Perlindungan kecelakaan",
    en: "Accident protection",
    zh: "意外保障",
  },
  "Asuransi wisata internasional": {
    id: "Asuransi wisata internasional",
    en: "International travel insurance",
    zh: "国际旅游保险",
  },
}

const facilityCategoryLabelMap: Record<string, Record<Locale, string>> = {
  "Akomodasi": {
    id: "Akomodasi",
    en: "Accommodation",
    zh: "住宿",
  },
  "Makan & Minum": {
    id: "Makan & Minum",
    en: "Meals & Drinks",
    zh: "餐饮",
  },
  "Transportasi": {
    id: "Transportasi",
    en: "Transport",
    zh: "交通",
  },
  "Pemandu & Operasional": {
    id: "Pemandu & Operasional",
    en: "Guiding & Operations",
    zh: "导览与运营",
  },
  "Tiket & Akses": {
    id: "Tiket & Akses",
    en: "Tickets & Access",
    zh: "门票与通行",
  },
  "Proteksi": {
    id: "Proteksi",
    en: "Protection",
    zh: "保障",
  },
  "Layanan Tambahan": {
    id: "Layanan Tambahan",
    en: "Additional Services",
    zh: "附加服务",
  },
}

export function getFacilityLabel(name: string | null | undefined, locale: Locale) {
  const safeName = String(name || "").trim()
  return facilityLabelMap[safeName]?.[locale] || safeName
}

export function getFacilityCategoryLabel(category: string | null | undefined, locale: Locale) {
  const safeCategory = String(category || "").trim()
  return facilityCategoryLabelMap[safeCategory]?.[locale] || safeCategory
}
