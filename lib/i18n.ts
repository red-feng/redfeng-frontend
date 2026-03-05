export type Locale = "id" | "en" | "zh" | "th"

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
    langTh: string
  }
  home: {
    noPackages: string
  }
  searchBar: {
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
    email: string
    password: string
    login: string
    loggingIn: string
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
      langTh: "Thailand",
    },
    home: {
      noPackages: "Tidak ada paket ditemukan",
    },
    searchBar: {
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
      title: "Login Merchant",
      email: "Email",
      password: "Password",
      login: "Login",
      loggingIn: "Sedang login...",
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
      langTh: "Thai",
    },
    home: { noPackages: "No packages found" },
    searchBar: {
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
      title: "Merchant Login",
      email: "Email",
      password: "Password",
      login: "Login",
      loggingIn: "Logging in...",
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
      busTravel: "巴士与出行",
      train: "火车",
      seaShip: "海运",
      cruise: "邮轮",
      langId: "印尼语",
      langEn: "英语",
      langZh: "中文",
      langTh: "泰语",
    },
    home: { noPackages: "未找到套餐" },
    searchBar: {
      allCountries: "所有国家",
      allStyles: "所有旅游风格",
      allDurations: "所有行程",
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
      specialDeal: "特价",
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
      minimumParticipants: "最少人数",
      childPrice: "儿童价格",
      bookingNow: "立即预订",
      days: "天",
      people: "人",
      otherInfo: "其他信息",
      personalDocs: "个人文件和装备",
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
      meetingPoint: "集合点",
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
      personalDocs: "个人文件和装备",
      terms: "条款与条件",
    },
    chat: {
      title: "聊天",
      merchantInbox: "商家收件箱",
      customerInbox: "与商家聊天",
      migrationMissing: "聊天表尚不可用。请先运行聊天迁移。",
      createRoomFailed: "创建聊天房间失败",
      loadRoomsFailed: "加载聊天房间失败",
      loadMessagesFailed: "加载消息失败",
      chatRooms: "聊天房间",
      noChats: "暂无聊天。",
      packageLabel: "套餐",
      selectRoom: "选择聊天房间",
      viewPackageDetail: "查看套餐详情",
      noMessages: "暂无消息。立即开始对话。",
      writeMessage: "输入消息...",
      send: "发送",
      packageFallback: "套餐",
    },
    checkout: {
      packageNotFound: "未找到套餐",
      title: "结账",
      totalPay: "应付总额",
      name: "姓名",
      email: "邮箱",
      phone: "电话",
      createBookingPay: "创建预订并支付",
      saveBookingFailed: "保存预订失败",
      createTransactionFailed: "创建交易失败",
      snapNotReady: "Snap 尚未就绪",
    },
    login: {
      title: "商家登录",
      email: "邮箱",
      password: "密码",
      login: "登录",
      loggingIn: "登录中...",
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
  th: {
    header: {
      promo: "โปรโมชั่น",
      orders: "คำสั่งซื้อ",
      partnerTour: "พาร์ทเนอร์ทัวร์",
      verifyInvoice: "ยืนยันใบแจ้งหนี้ทัวร์",
      help: "ช่วยเหลือ",
      language: "ภาษา",
      account: "บัญชีของฉัน",
      packageTour: "แพ็กเกจทัวร์",
      flight: "เที่ยวบิน",
      hotel: "โรงแรม",
      busTravel: "รถบัสและท่องเที่ยว",
      train: "รถไฟ",
      seaShip: "เรือเดินทะเล",
      cruise: "เรือสำราญ",
      langId: "อินโดนีเซีย",
      langEn: "อังกฤษ",
      langZh: "จีน",
      langTh: "ไทย",
    },
    home: { noPackages: "ไม่พบแพ็กเกจ" },
    searchBar: {
      allCountries: "ทุกประเทศ",
      allStyles: "ทุกสไตล์การท่องเที่ยว",
      allDurations: "ทุกระยะเวลา",
      apply: "ใช้งาน",
      day: "วัน",
    },
    sortBar: {
      packagesFound: "แพ็กเกจที่พบ",
      topPopularity: "ยอดนิยมสูงสุด",
      lowestPrice: "ราคาต่ำสุด",
    },
    filter: { priceRange: "ช่วงราคา" },
    packageCard: {
      specialDeal: "ดีลพิเศษ",
      location: "สถานที่",
      excellent: "ยอดเยี่ยม",
      freeCancellation: "ยกเลิกฟรี",
      breakfastIncluded: "รวมอาหารเช้า",
      taxesIncluded: "รวมภาษีและค่าธรรมเนียม",
      choosePackage: "เลือกแพ็กเกจ",
    },
    detail: {
      fromTo: "ไปยัง",
      language: "ภาษา",
      bookingTour: "จองทัวร์",
      duration: "ระยะเวลา",
      day: "วัน",
      minimumParticipants: "จำนวนผู้ร่วมขั้นต่ำ",
      childPrice: "ราคาเด็ก",
      bookingNow: "จองตอนนี้",
      days: "วัน",
      people: "คน",
      otherInfo: "ข้อมูลเพิ่มเติม",
      personalDocs: "เอกสารและอุปกรณ์ส่วนตัว",
      terms: "ข้อกำหนดและเงื่อนไข",
      chat: "แชต",
    },
    tabs: {
      infoTour: "ข้อมูลทัวร์",
      itinerary: "กำหนดการ",
      facilities: "สิ่งอำนวยความสะดวก",
      standardService: "มาตรฐานบริการ",
      packageDetail: "รายละเอียดแพ็กเกจ",
      aboutTour: "เกี่ยวกับทัวร์",
      meetingPoint: "จุดนัดพบ",
      highlights: "ไฮไลต์",
      map: "แผนที่",
      noFacilities: "ไม่มีสิ่งอำนวยความสะดวก",
      service: "บริการ",
      include: "รวม",
      exclude: "ไม่รวม",
      noItinerary: "ยังไม่มีกำหนดการ",
      dayLabel: "วันที่",
      noRoute: "ยังไม่มีเส้นทาง",
    },
    sidebar: {
      personalDocs: "เอกสารและอุปกรณ์ส่วนตัว",
      terms: "ข้อกำหนดและเงื่อนไข",
    },
    chat: {
      title: "แชต",
      merchantInbox: "กล่องข้อความผู้ขาย",
      customerInbox: "แชตกับผู้ขายแพ็กเกจ",
      migrationMissing: "ตารางแชตยังไม่พร้อมใช้งาน โปรดรัน migration แชตก่อน",
      createRoomFailed: "สร้างห้องแชตไม่สำเร็จ",
      loadRoomsFailed: "โหลดห้องแชตไม่สำเร็จ",
      loadMessagesFailed: "โหลดข้อความไม่สำเร็จ",
      chatRooms: "ห้องแชต",
      noChats: "ยังไม่มีแชต",
      packageLabel: "แพ็กเกจ",
      selectRoom: "เลือกห้องแชต",
      viewPackageDetail: "ดูรายละเอียดแพ็กเกจ",
      noMessages: "ยังไม่มีข้อความ เริ่มบทสนทนาได้เลย",
      writeMessage: "พิมพ์ข้อความ...",
      send: "ส่ง",
      packageFallback: "แพ็กเกจ",
    },
    checkout: {
      packageNotFound: "ไม่พบแพ็กเกจ",
      title: "ชำระเงิน",
      totalPay: "ยอดชำระรวม",
      name: "ชื่อ",
      email: "อีเมล",
      phone: "โทรศัพท์",
      createBookingPay: "สร้างการจองและชำระเงิน",
      saveBookingFailed: "บันทึกการจองไม่สำเร็จ",
      createTransactionFailed: "สร้างธุรกรรมไม่สำเร็จ",
      snapNotReady: "Snap ยังไม่พร้อมใช้งาน",
    },
    login: {
      title: "เข้าสู่ระบบผู้ขาย",
      email: "อีเมล",
      password: "รหัสผ่าน",
      login: "เข้าสู่ระบบ",
      loggingIn: "กำลังเข้าสู่ระบบ...",
    },
    resetPassword: {
      title: "ตั้งรหัสผ่านใหม่",
      placeholder: "รหัสผ่านใหม่",
      updating: "กำลังอัปเดต...",
      update: "อัปเดตรหัสผ่าน",
      success: "อัปเดตรหัสผ่านสำเร็จ",
    },
    packagesPage: {
      tempTitle: "หน้าแพ็กเกจชั่วคราว",
    },
  },
}

export function normalizeLocale(input: string | null | undefined): Locale {
  if (input === "en") return "en"
  if (input === "zh") return "zh"
  if (input === "th") return "th"
  return "id"
}

