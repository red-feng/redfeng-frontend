import type { Locale } from "@/lib/i18n"

type MerchantWizardDictionary = {
  createPackageTitle: string
  editPackageTitle: string
  basicInfoStep: string
  contentDetailsStep: string
  facilitiesStep: string
  itineraryStep: string
  reviewStep: string
  packageIdMissing: string
  packageName: string
  packageNamePlaceholder: string
  travelStyle: string
  selectTravelStyle: string
  departureSection: string
  destinationSection: string
  originCountry: string
  selectOriginCountry: string
  originProvince: string
  originProvincePlaceholder: string
  destinationCountry: string
  selectDestinationCountry: string
  destinationProvince: string
  destinationProvincePlaceholder: string
  merchantCurrency: string
  minimumParticipants: string
  quotaHint: string
  departureDate: string
  departureDateHint: string
  durationDays: string
  durationPlaceholder: string
  adultPrice: string
  adultPricePlaceholder: string
  childPrice: string
  childPricePlaceholder: string
  defaultLanguage: string
  publishLanguage: string
  publishLanguageHint: string
  defaultBadge: string
  saveAndNext: string
  saveAndSendReview: string
  back: string
  nextReview: string
  defaultLanguageNotice: string
  contentLanguage: string
  aboutTour: string
  serviceStandard: string
  include: string
  exclude: string
  preparation: string
  meetingPoint: string
  highlights: string
  termsConditions: string
  pickupMapEmbed: string
  galleryImages: string
  galleryLimitHint: string
  uploadTooLarge: string
  facilitiesLanguageHint: string
  time: string
  route: string
  addRoute: string
  removeRoute: string
  removeDay: string
  dayTitlePlaceholder: string
  dayTitleLabel: string
  dayLabel: string
  dayTripDescription: string
  addDay: string
  timeFormatHint: string
  editWizardHint: string
  backToPackageManagement: string
  resubmissionNotice: string
  step1Short: string
  step2Short: string
  step3Short: string
  step4Short: string
  step5Short: string
  reviewSubmitInfoTitle: string
  reviewSubmitInfoBody: string
  reviewPendingNotice: string
  reviewSubmitButton: string
}

export const merchantWizardLanguageOptions: Array<{ code: Locale; label: string }> = [
  { code: "id", label: "Bahasa Indonesia" },
  { code: "en", label: "English" },
  { code: "zh", label: "中文" },
]

const dictionaries: Record<Locale, MerchantWizardDictionary> = {
  id: {
    createPackageTitle: "Buat Paket Baru",
    editPackageTitle: "Edit Paket",
    basicInfoStep: "Step 1 - Basic Info",
    contentDetailsStep: "Step 2 - Detail Konten (Multibahasa)",
    facilitiesStep: "Step 3 - Pilih Fasilitas",
    itineraryStep: "Step 4 - Itinerary",
    reviewStep: "Step 5 - Review",
    packageIdMissing: "Package ID tidak ditemukan",
    packageName: "Nama Paket",
    packageNamePlaceholder: "Nama Paket",
    travelStyle: "Travel Style",
    selectTravelStyle: "Pilih Travel Style",
    departureSection: "Keberangkatan",
    destinationSection: "Tujuan",
    originCountry: "Negara Keberangkatan",
    selectOriginCountry: "Pilih Negara Keberangkatan",
    originProvince: "Provinsi Keberangkatan",
    originProvincePlaceholder: "Provinsi Keberangkatan",
    destinationCountry: "Negara Tujuan",
    selectDestinationCountry: "Pilih Negara Tujuan",
    destinationProvince: "Provinsi Tujuan",
    destinationProvincePlaceholder: "Provinsi Tujuan",
    merchantCurrency: "Mata Uang Merchant",
    minimumParticipants: "Minimal Peserta",
    quotaHint: "Kuota akan otomatis berkurang berdasarkan jumlah peserta yang booking pada tanggal keberangkatan yang sama.",
    departureDate: "Tanggal Keberangkatan",
    departureDateHint: "Wajib diisi untuk Open Trip dan Umroh agar jadwal keberangkatan paket jelas.",
    durationDays: "Durasi (hari)",
    durationPlaceholder: "Durasi (hari)",
    adultPrice: "Harga Dewasa",
    adultPricePlaceholder: "Harga Dewasa",
    childPrice: "Harga Anak",
    childPricePlaceholder: "Harga Anak",
    defaultLanguage: "Bahasa Default Merchant",
    publishLanguage: "Bahasa Publish",
    publishLanguageHint: "Paket akan tampil di pilihan bahasa yang dicentang.",
    defaultBadge: "default",
    saveAndNext: "Simpan & Lanjut",
    saveAndSendReview: "Simpan & Kirim Review",
    back: "Kembali",
    nextReview: "Simpan & Kirim Review",
    defaultLanguageNotice: "Default language paket",
    contentLanguage: "Konten bahasa",
    aboutTour: "Info Tentang Tour",
    serviceStandard: "Standar Layanan Merchant",
    include: "Yang Termasuk",
    exclude: "Yang Tidak Termasuk",
    preparation: "Peralatan & Dokumen yang Disiapkan Peserta",
    meetingPoint: "Meeting Point",
    highlights: "Tag / Highlight",
    termsConditions: "Syarat & Ketentuan saat di lokasi",
    pickupMapEmbed: "Embedding titik penjemputan wisatawan di Google Maps",
    galleryImages: "Galeri Gambar",
    galleryLimitHint: "Maksimal total ukuran upload 18MB per submit.",
    uploadTooLarge: "Ukuran total file gambar terlalu besar.",
    facilitiesLanguageHint: "Pilih bahasa tampilan fasilitas. Data fasilitas tetap sama, hanya labelnya yang berubah.",
    time: "Jam",
    route: "Rute",
    addRoute: "+ Tambah Rute",
    removeRoute: "Hapus",
    removeDay: "Hapus Hari",
    dayTitlePlaceholder: "Judul",
    dayTitleLabel: "Judul hari",
    dayLabel: "Hari ke",
    dayTripDescription: "Deskripsi Perjalanan Hari Ini",
    addDay: "+ Tambah Hari",
    timeFormatHint: "Gunakan format 12 jam seperti 11.30 atau 1.30",
    editWizardHint: "Wizard edit paket merchant step 1 sampai 4.",
    backToPackageManagement: "Kembali ke Kelola Paket",
    resubmissionNotice: "Setiap perubahan paket akan dikirim ulang ke admin untuk verifikasi.",
    step1Short: "Step 1",
    step2Short: "Step 2",
    step3Short: "Step 3",
    step4Short: "Step 4",
    step5Short: "Step 5",
    reviewSubmitInfoTitle: "Setelah disubmit, paket akan direview oleh Admin.",
    reviewSubmitInfoBody: "Paket tidak bisa diedit sampai proses review selesai.",
    reviewPendingNotice: "Pastikan seluruh data sudah benar sebelum melakukan submit. Setelah submit, status paket akan berubah menjadi Pending.",
    reviewSubmitButton: "Submit untuk Review",
  },
  en: {
    createPackageTitle: "Create New Package",
    editPackageTitle: "Edit Package",
    basicInfoStep: "Step 1 - Basic Info",
    contentDetailsStep: "Step 2 - Content Details (Multilingual)",
    facilitiesStep: "Step 3 - Select Facilities",
    itineraryStep: "Step 4 - Itinerary",
    reviewStep: "Step 5 - Review",
    packageIdMissing: "Package ID not found",
    packageName: "Package Name",
    packageNamePlaceholder: "Package Name",
    travelStyle: "Travel Style",
    selectTravelStyle: "Select Travel Style",
    departureSection: "Departure",
    destinationSection: "Destination",
    originCountry: "Departure Country",
    selectOriginCountry: "Select Departure Country",
    originProvince: "Departure Province",
    originProvincePlaceholder: "Departure Province",
    destinationCountry: "Destination Country",
    selectDestinationCountry: "Select Destination Country",
    destinationProvince: "Destination Province",
    destinationProvincePlaceholder: "Destination Province",
    merchantCurrency: "Merchant Currency",
    minimumParticipants: "Minimum Participants",
    quotaHint: "Quota will be reduced automatically based on the number of participants booked on the same departure date.",
    departureDate: "Departure Date",
    departureDateHint: "Required for Open Trip and Umrah so the package departure schedule is clear.",
    durationDays: "Duration (days)",
    durationPlaceholder: "Duration (days)",
    adultPrice: "Adult Price",
    adultPricePlaceholder: "Adult Price",
    childPrice: "Child Price",
    childPricePlaceholder: "Child Price",
    defaultLanguage: "Merchant Default Language",
    publishLanguage: "Publish Languages",
    publishLanguageHint: "The package will appear in the checked language options.",
    defaultBadge: "default",
    saveAndNext: "Save & Continue",
    saveAndSendReview: "Save & Send for Review",
    back: "Back",
    nextReview: "Save & Send for Review",
    defaultLanguageNotice: "Package default language",
    contentLanguage: "Content language",
    aboutTour: "About the Tour",
    serviceStandard: "Merchant Service Standard",
    include: "Included",
    exclude: "Excluded",
    preparation: "Participant Equipment & Documents",
    meetingPoint: "Meeting Point",
    highlights: "Tags / Highlights",
    termsConditions: "Terms & Conditions on Site",
    pickupMapEmbed: "Google Maps embed for tourist pickup point",
    galleryImages: "Gallery Images",
    galleryLimitHint: "Maximum total upload size is 18MB per submit.",
    uploadTooLarge: "Total image file size is too large.",
    facilitiesLanguageHint: "Choose the facility display language. The selected facilities stay the same; only the labels change.",
    time: "Time",
    route: "Route",
    addRoute: "+ Add Route",
    removeRoute: "Remove",
    removeDay: "Remove Day",
    dayTitlePlaceholder: "Title",
    dayTitleLabel: "Day title",
    dayLabel: "Day",
    dayTripDescription: "Today's Trip Description",
    addDay: "+ Add Day",
    timeFormatHint: "Use 12-hour format such as 11.30 or 1.30",
    editWizardHint: "Merchant package edit wizard for steps 1 to 4.",
    backToPackageManagement: "Back to Package Management",
    resubmissionNotice: "Any package changes will be resubmitted to the admin for verification.",
    step1Short: "Step 1",
    step2Short: "Step 2",
    step3Short: "Step 3",
    step4Short: "Step 4",
    step5Short: "Step 5",
    reviewSubmitInfoTitle: "After submission, the package will be reviewed by the Admin.",
    reviewSubmitInfoBody: "The package cannot be edited until the review process is complete.",
    reviewPendingNotice: "Please make sure all data is correct before submitting. After submission, the package status will change to Pending.",
    reviewSubmitButton: "Submit for Review",
  },
  zh: {
    createPackageTitle: "创建新套餐",
    editPackageTitle: "编辑套餐",
    basicInfoStep: "第 1 步 - 基本信息",
    contentDetailsStep: "第 2 步 - 内容详情（多语言）",
    facilitiesStep: "第 3 步 - 选择设施",
    itineraryStep: "第 4 步 - 行程安排",
    reviewStep: "第 5 步 - 审核",
    packageIdMissing: "未找到套餐 ID",
    packageName: "套餐名称",
    packageNamePlaceholder: "套餐名称",
    travelStyle: "旅行风格",
    selectTravelStyle: "选择旅行风格",
    departureSection: "出发地",
    destinationSection: "目的地",
    originCountry: "出发国家",
    selectOriginCountry: "选择出发国家",
    originProvince: "出发省份",
    originProvincePlaceholder: "出发省份",
    destinationCountry: "目的国家",
    selectDestinationCountry: "选择目的国家",
    destinationProvince: "目的省份",
    destinationProvincePlaceholder: "目的省份",
    merchantCurrency: "商家货币",
    minimumParticipants: "最少参加人数",
    quotaHint: "同一出发日期的预订人数会自动扣减可用名额。",
    departureDate: "出发日期",
    departureDateHint: "Open Trip 和 Umrah 必填，以便明确套餐出发时间。",
    durationDays: "行程时长（天）",
    durationPlaceholder: "行程时长（天）",
    adultPrice: "成人价格",
    adultPricePlaceholder: "成人价格",
    childPrice: "儿童价格",
    childPricePlaceholder: "儿童价格",
    defaultLanguage: "商家默认语言",
    publishLanguage: "发布语言",
    publishLanguageHint: "套餐会显示在勾选的语言选项中。",
    defaultBadge: "默认",
    saveAndNext: "保存并继续",
    saveAndSendReview: "保存并提交审核",
    back: "返回",
    nextReview: "保存并提交审核",
    defaultLanguageNotice: "套餐默认语言",
    contentLanguage: "内容语言",
    aboutTour: "行程介绍",
    serviceStandard: "商家服务标准",
    include: "费用包含",
    exclude: "费用不含",
    preparation: "游客需准备的文件与装备",
    meetingPoint: "集合地点",
    highlights: "标签 / 亮点",
    termsConditions: "现场条款与条件",
    pickupMapEmbed: "游客接送点 Google 地图嵌入代码",
    galleryImages: "图片库",
    galleryLimitHint: "每次提交的上传总大小最多 18MB。",
    uploadTooLarge: "图片文件总大小过大。",
    facilitiesLanguageHint: "请选择设施显示语言。已选择的设施不会改变，只会切换标签文字。",
    time: "时间",
    route: "路线",
    addRoute: "+ 添加路线",
    removeRoute: "删除",
    removeDay: "删除当天",
    dayTitlePlaceholder: "标题",
    dayTitleLabel: "当天标题",
    dayLabel: "第",
    dayTripDescription: "当天行程描述",
    addDay: "+ 添加天数",
    timeFormatHint: "请使用 12 小时格式，例如 11.30 或 1.30",
    editWizardHint: "商家套餐编辑向导，包含第 1 步到第 4 步。",
    backToPackageManagement: "返回套餐管理",
    resubmissionNotice: "套餐的任何修改都会重新提交给管理员审核。",
    step1Short: "第 1 步",
    step2Short: "第 2 步",
    step3Short: "第 3 步",
    step4Short: "第 4 步",
    step5Short: "第 5 步",
    reviewSubmitInfoTitle: "提交后，套餐将由管理员进行审核。",
    reviewSubmitInfoBody: "在审核完成之前，套餐无法被编辑。",
    reviewPendingNotice: "请在提交前确认所有数据已正确填写。提交后，套餐状态将变为 Pending。",
    reviewSubmitButton: "提交审核",
  },
}

export function getMerchantWizardText(locale: Locale): MerchantWizardDictionary {
  return dictionaries[locale]
}
