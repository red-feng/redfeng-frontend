export type Locale = "id" | "en" | "zh"

export const localeCookieName = "rf_locale"
export const defaultLocale: Locale = "id"

type Dictionary = {
  header: {
    promo: string
    orders: string
    partnerTour: string
    verifyInvoice: string
    help: string
    language: string
    account: string
    packageTour: string
    flight: string
    hotel: string
    busTravel: string
    train: string
    seaShip: string
    cruise: string
    langId: string
    langEn: string
    langZh: string
  }
  home: {
    noPackages: string
  }
  searchBar: {
    countryLabel: string
    styleLabel: string
    durationLabel: string
    departureDateLabel: string
    departureDateHint: string
    allCountries: string
    allStyles: string
    allDurations: string
    apply: string
    day: string
  }
  sortBar: {
    packagesFound: string
    topPopularity: string
    lowestPrice: string
  }
  filter: {
    priceRange: string
  }
  packageCard: {
    specialDeal: string
    location: string
    excellent: string
    freeCancellation: string
    breakfastIncluded: string
    taxesIncluded: string
    choosePackage: string
  }
  detail: {
    fromTo: string
    language: string
    bookingTour: string
    duration: string
    day: string
    minimumParticipants: string
    childPrice: string
    bookingNow: string
    days: string
    people: string
    otherInfo: string
    personalDocs: string
    terms: string
    chat: string
  }
  tabs: {
    infoTour: string
    itinerary: string
    facilities: string
    standardService: string
    packageDetail: string
    aboutTour: string
    meetingPoint: string
    highlights: string
    map: string
    noFacilities: string
    service: string
    include: string
    exclude: string
    noItinerary: string
    dayLabel: string
    noRoute: string
  }
  sidebar: {
    personalDocs: string
    terms: string
  }
  chat: {
    title: string
    merchantInbox: string
    customerInbox: string
    migrationMissing: string
    createRoomFailed: string
    loadRoomsFailed: string
    loadMessagesFailed: string
    chatRooms: string
    noChats: string
    packageLabel: string
    selectRoom: string
    viewPackageDetail: string
    noMessages: string
    writeMessage: string
    send: string
    packageFallback: string
  }
  checkout: {
    packageNotFound: string
    title: string
    totalPay: string
    name: string
    email: string
    phone: string
    createBookingPay: string
    saveBookingFailed: string
    createTransactionFailed: string
    snapNotReady: string
  }
  login: {
    title: string
    subtitle: string
    continueWithGoogle: string
    continueWithApple: string
    continueWithFacebook: string
    processing: string
    otherOptions: string
    autoCreateHint: string
    termsLead: string
    terms: string
    privacy: string
    registerCta: string
    registerLink: string
    loginCta: string
    loginLink: string
  }
  resetPassword: {
    title: string
    placeholder: string
    updating: string
    update: string
    success: string
  }
  packagesPage: {
    tempTitle: string
  }
}

export const dictionaries: Record<Locale, Dictionary> = {
  id: {
    header: {
      promo: "Promo",
      orders: "Pesanan",
      partnerTour: "Kemitraan Tour",
      verifyInvoice: "Verifikasi Invoice Tour",
      help: "Bantuan",
      language: "Bahasa",
      account: "Akun Saya",
      packageTour: "Paket Tour",
      flight: "Pesawat",
      hotel: "Hotel",
      busTravel: "Bus & Travel",
      train: "Kereta Api",
      seaShip: "Kapal Laut",
      cruise: "Kapal Pesiar",
      langId: "Indonesia",
      langEn: "English",
      langZh: "China",
    },
    home: {
      noPackages: "Tidak ada paket ditemukan",
    },
    searchBar: {
      countryLabel: "Negara",
      styleLabel: "Travel Style",
      durationLabel: "Durasi",
      departureDateLabel: "Tanggal Keberangkatan",
      departureDateHint: "Khusus Open Trip dan Umroh",
      allCountries: "Semua Negara",
      allStyles: "Semua Travel Style",
      allDurations: "Semua Durasi",
      apply: "Terapkan",
      day: "Hari",
    },
    sortBar: {
      packagesFound: "paket ditemukan",
      topPopularity: "Popularitas tertinggi",
      lowestPrice: "Harga terendah",
    },
    filter: {
      priceRange: "Price Range",
    },
    packageCard: {
      specialDeal: "Special Deal",
      location: "Lokasi",
      excellent: "Excellent",
      freeCancellation: "Free Cancellation",
      breakfastIncluded: "Breakfast Included",
      taxesIncluded: "Termasuk pajak & biaya",
      choosePackage: "Pilih Paket",
    },
    detail: {
      fromTo: "ke",
      language: "Bahasa",
      bookingTour: "Booking Tour",
      duration: "Durasi",
      day: "hari",
      minimumParticipants: "Minimal peserta",
      childPrice: "Harga anak",
      bookingNow: "Booking now",
      days: "hari",
      people: "orang",
      otherInfo: "Informasi Lainnya",
      personalDocs: "Peralatan & dokumen pribadi",
      terms: "Syarat dan ketentuan",
      chat: "Chat",
    },
    tabs: {
      infoTour: "Info Tour",
      itinerary: "Itinerary",
      facilities: "Fasilitas",
      standardService: "Standar Layanan",
      packageDetail: "Detail Paket",
      aboutTour: "Tentang Tour",
      meetingPoint: "Meeting Point",
      highlights: "Highlights",
      map: "Map",
      noFacilities: "Tidak ada fasilitas.",
      service: "Layanan",
      include: "Include",
      exclude: "Exclude",
      noItinerary: "Itinerary belum tersedia.",
      dayLabel: "Hari",
      noRoute: "Rute belum tersedia.",
    },
    sidebar: {
      personalDocs: "Peralatan & dokumen pribadi",
      terms: "Syarat dan ketentuan",
    },
    chat: {
      title: "Chat",
      merchantInbox: "Inbox merchant",
      customerInbox: "Chat dengan merchant paket",
      migrationMissing: "Tabel chat belum tersedia. Jalankan migration chat terlebih dulu.",
      createRoomFailed: "Gagal membuat ruang chat",
      loadRoomsFailed: "Gagal memuat ruang chat",
      loadMessagesFailed: "Gagal memuat pesan",
      chatRooms: "Ruang Chat",
      noChats: "Belum ada chat.",
      packageLabel: "Paket",
      selectRoom: "Pilih ruang chat",
      viewPackageDetail: "Lihat detail paket",
      noMessages: "Belum ada pesan. Mulai percakapan sekarang.",
      writeMessage: "Tulis pesan...",
      send: "Kirim",
      packageFallback: "Paket",
    },
    checkout: {
      packageNotFound: "Paket tidak ditemukan",
      title: "Checkout",
      totalPay: "Total Bayar",
      name: "Nama",
      email: "Email",
      phone: "Nomor Telepon",
      createBookingPay: "Buat Booking & Bayar",
      saveBookingFailed: "Gagal menyimpan booking",
      createTransactionFailed: "Gagal membuat transaksi",
      snapNotReady: "Snap belum siap",
    },
    login: {
      title: "Masuk atau Daftar",
      subtitle: "Lanjutkan lebih cepat dengan akun yang Anda gunakan setiap hari.",
      continueWithGoogle: "Lanjutkan dengan Google",
      continueWithApple: "Apple",
      continueWithFacebook: "Facebook",
      processing: "Memproses...",
      otherOptions: "Pilihan lainnya",
      autoCreateHint: "Jika belum punya akun, akun customer akan dibuat otomatis saat Anda melanjutkan.",
      termsLead: "Dengan melanjutkan, Anda menyetujui",
      terms: "Syarat & Ketentuan",
      privacy: "Kebijakan Privasi",
      registerCta: "Belum punya akun?",
      registerLink: "Buat akun",
      loginCta: "Sudah punya akun?",
      loginLink: "Masuk",
    },
    resetPassword: {
      title: "Atur Password Baru",
      placeholder: "Password baru",
      updating: "Menyimpan...",
      update: "Perbarui Password",
      success: "Password berhasil diperbarui",
    },
    packagesPage: {
      tempTitle: "Halaman Paket Sementara",
    },
  },
  en: {
    header: {
      promo: "Promo",
      orders: "Orders",
      partnerTour: "Tour Partnership",
      verifyInvoice: "Tour Invoice Verification",
      help: "Help",
      language: "Language",
      account: "My Account",
      packageTour: "Tour Packages",
      flight: "Flights",
      hotel: "Hotels",
      busTravel: "Bus & Travel",
      train: "Train",
      seaShip: "Sea Ship",
      cruise: "Cruise",
      langId: "Indonesia",
      langEn: "English",
      langZh: "Chinese",
    },
    home: { noPackages: "No packages found" },
    searchBar: {
      countryLabel: "Country",
      styleLabel: "Travel Style",
      durationLabel: "Duration",
      departureDateLabel: "Departure Date",
      departureDateHint: "For Open Trip and Umrah only",
      allCountries: "All Countries",
      allStyles: "All Travel Styles",
      allDurations: "All Durations",
      apply: "Apply",
      day: "Days",
    },
    sortBar: {
      packagesFound: "packages found",
      topPopularity: "Top popularity",
      lowestPrice: "Lowest price",
    },
    filter: { priceRange: "Price Range" },
    packageCard: {
      specialDeal: "Special Deal",
      location: "Location",
      excellent: "Excellent",
      freeCancellation: "Free Cancellation",
      breakfastIncluded: "Breakfast Included",
      taxesIncluded: "Taxes and fees included",
      choosePackage: "Choose Package",
    },
    detail: {
      fromTo: "to",
      language: "Language",
      bookingTour: "Booking Tour",
      duration: "Duration",
      day: "day",
      minimumParticipants: "Minimum participants",
      childPrice: "Child price",
      bookingNow: "Booking now",
      days: "days",
      people: "people",
      otherInfo: "Other Information",
      personalDocs: "Personal documents & equipment",
      terms: "Terms and conditions",
      chat: "Chat",
    },
    tabs: {
      infoTour: "Tour Info",
      itinerary: "Itinerary",
      facilities: "Facilities",
      standardService: "Service Standard",
      packageDetail: "Package Detail",
      aboutTour: "About Tour",
      meetingPoint: "Meeting Point",
      highlights: "Highlights",
      map: "Map",
      noFacilities: "No facilities available.",
      service: "Service",
      include: "Include",
      exclude: "Exclude",
      noItinerary: "Itinerary not available.",
      dayLabel: "Day",
      noRoute: "Route not available.",
    },
    sidebar: {
      personalDocs: "Personal documents & equipment",
      terms: "Terms and conditions",
    },
    chat: {
      title: "Chat",
      merchantInbox: "Merchant inbox",
      customerInbox: "Chat with package merchant",
      migrationMissing: "Chat tables are not available yet. Please run chat migration first.",
      createRoomFailed: "Failed to create chat room",
      loadRoomsFailed: "Failed to load chat rooms",
      loadMessagesFailed: "Failed to load messages",
      chatRooms: "Chat Rooms",
      noChats: "No chats yet.",
      packageLabel: "Package",
      selectRoom: "Select a chat room",
      viewPackageDetail: "View package detail",
      noMessages: "No messages yet. Start a conversation now.",
      writeMessage: "Write a message...",
      send: "Send",
      packageFallback: "Package",
    },
    checkout: {
      packageNotFound: "Package not found",
      title: "Checkout",
      totalPay: "Total Payment",
      name: "Name",
      email: "Email",
      phone: "Phone",
      createBookingPay: "Create Booking & Pay",
      saveBookingFailed: "Failed to save booking",
      createTransactionFailed: "Failed to create transaction",
      snapNotReady: "Snap is not ready",
    },
    login: {
      title: "Sign In or Register",
      subtitle: "Continue faster with the account you already use every day.",
      continueWithGoogle: "Continue with Google",
      continueWithApple: "Apple",
      continueWithFacebook: "Facebook",
      processing: "Processing...",
      otherOptions: "Other options",
      autoCreateHint: "If you do not have an account yet, a customer account will be created automatically when you continue.",
      termsLead: "By continuing, you agree to our",
      terms: "Terms & Conditions",
      privacy: "Privacy Policy",
      registerCta: "Don't have an account?",
      registerLink: "Create one",
      loginCta: "Already have an account?",
      loginLink: "Sign in",
    },
    resetPassword: {
      title: "Set New Password",
      placeholder: "New password",
      updating: "Updating...",
      update: "Update Password",
      success: "Password updated successfully",
    },
    packagesPage: {
      tempTitle: "Temporary Packages Page",
    },
  },
  zh: {
    header: {
      promo: "优惠",
      orders: "订单",
      partnerTour: "旅游合作",
      verifyInvoice: "旅游发票验证",
      help: "帮助",
      language: "语言",
      account: "我的账户",
      packageTour: "旅游套餐",
      flight: "机票",
      hotel: "酒店",
      busTravel: "巴士与旅行",
      train: "火车",
      seaShip: "海运",
      cruise: "邮轮",
      langId: "印尼语",
      langEn: "英语",
      langZh: "中文",
    },
    home: { noPackages: "未找到套餐" },
    searchBar: {
      countryLabel: "国家",
      styleLabel: "旅行方式",
      durationLabel: "行程时长",
      departureDateLabel: "出发日期",
      departureDateHint: "仅适用于拼团和副朝",
      allCountries: "所有国家",
      allStyles: "所有旅行方式",
      allDurations: "所有时长",
      apply: "应用",
      day: "天",
    },
    sortBar: {
      packagesFound: "个套餐",
      topPopularity: "最高人气",
      lowestPrice: "最低价格",
    },
    filter: { priceRange: "价格范围" },
    packageCard: {
      specialDeal: "特惠",
      location: "地点",
      excellent: "优秀",
      freeCancellation: "免费取消",
      breakfastIncluded: "含早餐",
      taxesIncluded: "含税费",
      choosePackage: "选择套餐",
    },
    detail: {
      fromTo: "到",
      language: "语言",
      bookingTour: "预订行程",
      duration: "时长",
      day: "天",
      minimumParticipants: "最少参加人数",
      childPrice: "儿童价格",
      bookingNow: "立即预订",
      days: "天",
      people: "人",
      otherInfo: "其他信息",
      personalDocs: "个人文件与装备",
      terms: "条款与条件",
      chat: "聊天",
    },
    tabs: {
      infoTour: "行程信息",
      itinerary: "行程安排",
      facilities: "设施",
      standardService: "服务标准",
      packageDetail: "套餐详情",
      aboutTour: "关于行程",
      meetingPoint: "集合地点",
      highlights: "亮点",
      map: "地图",
      noFacilities: "暂无设施。",
      service: "服务",
      include: "包含",
      exclude: "不包含",
      noItinerary: "暂无行程安排。",
      dayLabel: "第",
      noRoute: "暂无路线。",
    },
    sidebar: {
      personalDocs: "个人文件与装备",
      terms: "条款与条件",
    },
    chat: {
      title: "聊天",
      merchantInbox: "商家收件箱",
      customerInbox: "与套餐商家聊天",
      migrationMissing: "聊天数据表尚不可用，请先运行聊天迁移。",
      createRoomFailed: "创建聊天室失败",
      loadRoomsFailed: "加载聊天室失败",
      loadMessagesFailed: "加载消息失败",
      chatRooms: "聊天室",
      noChats: "暂无聊天。",
      packageLabel: "套餐",
      selectRoom: "请选择聊天室",
      viewPackageDetail: "查看套餐详情",
      noMessages: "暂无消息，立即开始对话。",
      writeMessage: "输入消息...",
      send: "发送",
      packageFallback: "套餐",
    },
    checkout: {
      packageNotFound: "未找到套餐",
      title: "结账",
      totalPay: "总支付金额",
      name: "姓名",
      email: "邮箱",
      phone: "电话",
      createBookingPay: "创建预订并支付",
      saveBookingFailed: "保存预订失败",
      createTransactionFailed: "创建交易失败",
      snapNotReady: "Snap 尚未就绪",
    },
    login: {
      title: "登录或注册",
      subtitle: "使用您日常使用的账户更快继续。",
      continueWithGoogle: "使用 Google 继续",
      continueWithApple: "Apple",
      continueWithFacebook: "Facebook",
      processing: "处理中...",
      otherOptions: "其他选项",
      autoCreateHint: "如果您还没有账户，继续时将自动创建客户账户。",
      termsLead: "继续即表示您同意我们的",
      terms: "条款与条件",
      privacy: "隐私政策",
      registerCta: "还没有账户？",
      registerLink: "创建账户",
      loginCta: "已有账户？",
      loginLink: "登录",
    },
    resetPassword: {
      title: "设置新密码",
      placeholder: "新密码",
      updating: "更新中...",
      update: "更新密码",
      success: "密码更新成功",
    },
    packagesPage: {
      tempTitle: "临时套餐页面",
    },
  },
}

export function normalizeLocale(input: string | null | undefined): Locale {
  if (input === "en") return "en"
  if (input === "zh") return "zh"
  return "id"
}

