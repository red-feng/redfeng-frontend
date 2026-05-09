import { CardIcon, heroBenefitsByTab } from "@/app/components/home/shared/homeContent"
import type { HeroTabKey } from "@/app/components/home/shared/homeContent"
import type { Locale } from "@/lib/i18n"

type HeroBenefitsProps = {
  activeTab: HeroTabKey
  locale: Locale
}

const localizedBenefitTitles: Record<Locale, Record<string, string>> = {
  id: {
    "Harga tiket terbaik": "Harga tiket terbaik",
    "Maskapai terpercaya": "Maskapai terpercaya",
    "Support 24/7": "Support 24/7",
    "Properti terkurasi": "Properti terkurasi",
    "Booking aman": "Booking aman",
    "Harga promo hotel": "Harga promo hotel",
    "Rute populer": "Rute populer",
    "Jadwal akurat": "Jadwal akurat",
    "Tarif terbaik": "Tarif terbaik",
    "Operator pilihan": "Operator pilihan",
    "Kursi nyaman": "Kursi nyaman",
    "Harga hemat": "Harga hemat",
    "Pelabuhan utama": "Pelabuhan utama",
    "Pelayaran aman": "Pelayaran aman",
    "Tarif fleksibel": "Tarif fleksibel",
    "Itinerary premium": "Itinerary premium",
    "Cabin terpercaya": "Cabin terpercaya",
    "Promo cruise aktif": "Promo cruise aktif",
    "Atraksi favorit": "Atraksi favorit",
    "Voucher instan": "Voucher instan",
    "Promo tiket seru": "Promo tiket seru",
    "Paket terlengkap": "Paket terlengkap",
    "Partner terpercaya": "Partner terpercaya",
    "Harga bundling hemat": "Harga bundling hemat",
    "Pembayaran fleksibel": "Pembayaran fleksibel",
  },
  en: {
    "Harga tiket terbaik": "Best ticket prices",
    "Maskapai terpercaya": "Trusted airlines",
    "Support 24/7": "24/7 support",
    "Properti terkurasi": "Curated properties",
    "Booking aman": "Secure booking",
    "Harga promo hotel": "Hotel promo prices",
    "Rute populer": "Popular routes",
    "Jadwal akurat": "Accurate schedules",
    "Tarif terbaik": "Best fares",
    "Operator pilihan": "Selected operators",
    "Kursi nyaman": "Comfortable seats",
    "Harga hemat": "Budget-friendly fares",
    "Pelabuhan utama": "Main ports",
    "Pelayaran aman": "Safe sailings",
    "Tarif fleksibel": "Flexible fares",
    "Itinerary premium": "Premium itineraries",
    "Cabin terpercaya": "Trusted cabins",
    "Promo cruise aktif": "Active cruise deals",
    "Atraksi favorit": "Favorite attractions",
    "Voucher instan": "Instant vouchers",
    "Promo tiket seru": "Great ticket deals",
    "Paket terlengkap": "Complete packages",
    "Partner terpercaya": "Trusted partners",
    "Harga bundling hemat": "Value bundle pricing",
    "Pembayaran fleksibel": "Flexible payments",
  },
  zh: {
    "Harga tiket terbaik": "超值机票价格",
    "Maskapai terpercaya": "可信赖航空公司",
    "Support 24/7": "24/7 全天支持",
    "Properti terkurasi": "精选住宿",
    "Booking aman": "安全预订",
    "Harga promo hotel": "酒店优惠价格",
    "Rute populer": "热门路线",
    "Jadwal akurat": "时刻准确",
    "Tarif terbaik": "优惠票价",
    "Operator pilihan": "精选运营商",
    "Kursi nyaman": "舒适座位",
    "Harga hemat": "实惠价格",
    "Pelabuhan utama": "主要港口",
    "Pelayaran aman": "安全航行",
    "Tarif fleksibel": "灵活票价",
    "Itinerary premium": "高端行程",
    "Cabin terpercaya": "可靠舱房",
    "Promo cruise aktif": "邮轮优惠进行中",
    "Atraksi favorit": "热门景点",
    "Voucher instan": "即时凭证",
    "Promo tiket seru": "精彩门票优惠",
    "Paket terlengkap": "完整旅游套餐",
    "Partner terpercaya": "可靠合作伙伴",
    "Harga bundling hemat": "超值套餐价格",
    "Pembayaran fleksibel": "灵活支付",
  },
}

export default function HeroBenefits({ activeTab, locale }: HeroBenefitsProps) {
  const benefits = heroBenefitsByTab[activeTab]
  const localizedTitles = localizedBenefitTitles[locale]

  return (
    <div className="mt-4 grid grid-cols-2 gap-y-5 border-t border-[#edf1f5] px-1 pt-5 text-sm text-slate-600 sm:grid-cols-4 lg:mt-4 lg:gap-y-0 lg:pt-6">
      {benefits.map((item) => {
        const Icon = item.icon
        return (
          <div key={item.title} className="flex flex-col items-center gap-2.5 text-center">
            <div className="flex h-[48px] w-[48px] items-center justify-center rounded-full bg-white text-slate-700 ring-1 ring-[#d8e1eb]">
              <Icon className="h-4 w-4" />
            </div>
            <span className="text-[11px] font-medium leading-5 text-[#6d829e] lg:text-[12px]">{localizedTitles[item.title] || item.title}</span>
          </div>
        )
      })}
      <div className="flex flex-col items-center gap-2.5 text-center">
        <div className="flex h-[48px] w-[48px] items-center justify-center rounded-full bg-white text-slate-700 ring-1 ring-[#d8e1eb]">
          <CardIcon className="h-4 w-4" />
        </div>
        <span className="text-[11px] font-medium leading-5 text-[#6d829e] lg:text-[12px]">{localizedTitles["Pembayaran fleksibel"]}</span>
      </div>
    </div>
  )
}
