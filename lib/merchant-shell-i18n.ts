import { type Locale } from "@/lib/i18n"

type MerchantShellDictionary = {
  suiteBadge: string
  merchantBadge: string
  viewSite: string
  logout: string
  languageLabel: string
  langId: string
  langEn: string
  langZh: string
  nav: {
    dashboard: string
    packages: string
    orders: string
    statistics: string
    chat: string
    calendar: string
    payout: string
    review: string
    profile: string
  }
  dashboard: {
    merchantMissing: string
    totalPackages: string
    totalBookings: string
    revenue: string
    rating: string
    active: string
    draft: string
    awaitingPayment: string
    paidBookings: string
    customerReviews: string
    heroBadge: string
    heroDescription: string
    performanceFocus: string
    revenueDescription: string
    operationalNotes: string
    newChats: string
    pendingPackages: string
    bookingPaid: string
    packageDraftCount: string
    pendingPaymentCount: string
    noCustomerReview: string
    dpPaid: string
    fullyPaid: string
    awaitingPickup: string
    readyForFinance: string
    paidOut: string
  }
}

const dictionaries: Record<Locale, MerchantShellDictionary> = {
  id: {
    suiteBadge: "Merchant Suite",
    merchantBadge: "Red Feng Merchant",
    viewSite: "Lihat situs",
    logout: "Logout",
    languageLabel: "Bahasa",
    langId: "Bahasa Indonesia",
    langEn: "English",
    langZh: "中文",
    nav: {
      dashboard: "Dashboard",
      packages: "Kelola Paket",
      orders: "Pesanan",
      statistics: "Statistik",
      chat: "Chat",
      calendar: "Kalender",
      payout: "Saldo & Payout",
      review: "Review",
      profile: "Profil",
    },
    dashboard: {
      merchantMissing: "Merchant belum terdaftar.",
      totalPackages: "Total Paket",
      totalBookings: "Total Booking",
      revenue: "Revenue",
      rating: "Rating",
      active: "aktif",
      draft: "draft",
      awaitingPayment: "menunggu pembayaran",
      paidBookings: "booking terbayar",
      customerReviews: "review customer",
      heroBadge: "Merchant Command Center",
      heroDescription: "Pantau performa paket, booking, revenue, chat customer, dan kualitas layanan dari satu dashboard merchant yang lebih premium dan terstruktur.",
      performanceFocus: "Performance Focus",
      revenueDescription: "Revenue terhitung dari booking berstatus paid yang terkait langsung dengan merchant Anda.",
      operationalNotes: "Operational Notes",
      newChats: "Chat baru",
      pendingPackages: "Paket pending",
      bookingPaid: "Booking paid",
      packageDraftCount: "Draft paket",
      pendingPaymentCount: "Pembayaran pending",
      noCustomerReview: "Belum ada ulasan customer",
      dpPaid: "DP Paid",
      fullyPaid: "Fully Paid",
      awaitingPickup: "Awaiting Pickup",
      readyForFinance: "Ready for Finance",
      paidOut: "Paid Out",
    },
  },
  en: {
    suiteBadge: "Merchant Suite",
    merchantBadge: "Red Feng Merchant",
    viewSite: "View site",
    logout: "Logout",
    languageLabel: "Language",
    langId: "Bahasa Indonesia",
    langEn: "English",
    langZh: "Chinese",
    nav: {
      dashboard: "Dashboard",
      packages: "Manage Packages",
      orders: "Orders",
      statistics: "Statistics",
      chat: "Chat",
      calendar: "Calendar",
      payout: "Balance & Payout",
      review: "Reviews",
      profile: "Profile",
    },
    dashboard: {
      merchantMissing: "Merchant is not registered yet.",
      totalPackages: "Total Packages",
      totalBookings: "Total Bookings",
      revenue: "Revenue",
      rating: "Rating",
      active: "active",
      draft: "draft",
      awaitingPayment: "awaiting payment",
      paidBookings: "paid bookings",
      customerReviews: "customer reviews",
      heroBadge: "Merchant Command Center",
      heroDescription: "Monitor package performance, bookings, revenue, customer chats, and service quality from one more premium and structured merchant dashboard.",
      performanceFocus: "Performance Focus",
      revenueDescription: "Revenue is calculated from paid bookings directly related to your merchant account.",
      operationalNotes: "Operational Notes",
      newChats: "New chats",
      pendingPackages: "Pending packages",
      bookingPaid: "Paid bookings",
      packageDraftCount: "Package drafts",
      pendingPaymentCount: "Pending payments",
      noCustomerReview: "No customer reviews yet",
      dpPaid: "DP Paid",
      fullyPaid: "Fully Paid",
      awaitingPickup: "Awaiting Pickup",
      readyForFinance: "Ready for Finance",
      paidOut: "Paid Out",
    },
  },
  zh: {
    suiteBadge: "商家套件",
    merchantBadge: "Red Feng Merchant",
    viewSite: "查看网站",
    logout: "退出",
    languageLabel: "语言",
    langId: "印度尼西亚语",
    langEn: "English",
    langZh: "中文",
    nav: {
      dashboard: "仪表盘",
      packages: "管理套餐",
      orders: "订单",
      statistics: "统计",
      chat: "聊天",
      calendar: "日历",
      payout: "余额与结算",
      review: "评价",
      profile: "资料",
    },
    dashboard: {
      merchantMissing: "商家尚未注册。",
      totalPackages: "套餐总数",
      totalBookings: "订单总数",
      revenue: "营收",
      rating: "评分",
      active: "已上架",
      draft: "草稿",
      awaitingPayment: "待付款",
      paidBookings: "已付款订单",
      customerReviews: "客户评价",
      heroBadge: "商家指挥中心",
      heroDescription: "从一个更高级、更有条理的商家仪表盘中查看套餐表现、预订、营收、客户聊天和服务质量。",
      performanceFocus: "核心表现",
      revenueDescription: "营收根据与您的商家直接相关的已付款订单计算。",
      operationalNotes: "运营备注",
      newChats: "新消息",
      pendingPackages: "待审核套餐",
      bookingPaid: "已付款订单",
      packageDraftCount: "草稿套餐",
      pendingPaymentCount: "待付款",
      noCustomerReview: "暂无客户评价",
      dpPaid: "定金已付",
      fullyPaid: "全额已付",
      awaitingPickup: "等待接送",
      readyForFinance: "待财务处理",
      paidOut: "已结算",
    },
  },
}

export function getMerchantShellText(locale: Locale) {
  return dictionaries[locale]
}
