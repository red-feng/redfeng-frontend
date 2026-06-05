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
    customerDpPaid?: string
    fullyPaid: string
    awaitingPickup: string
    readyForFinance: string
    paidOut: string
  }
  packages: {
    merchantMissing: string
    addPackage: string
    draftPackages: string
    activePackages: string
    inactivePackages: string
    pendingPackages: string
    rejectedPackages: string
    heroBadge: string
    heroTitle: string
    heroDescription: string
    activePackageStat: string
    activePackageNote: string
    pendingReviewStat: string
    pendingReviewNote: string
    draftRejectedStat: string
    draftRejectedNote: string
    totalPackages: string
    active: string
    draft: string
    packageWorkflow: string
    workflowTitle: string
    workflowDescription: string
    quickSummary: string
    rejected: string
    loadError: string
    emptyState: string
    untitledPackage: string
    adminReason: string
    rejectedWithoutNote: string
    rejectedHelp: string
    reviewStatus: string
    underReview: string
    submitDate: string
    pendingHelp: string
    adultPrice: string
    pullToDraft: string
    activatePackage: string
    deactivatePackage: string
    editPackage: string
    deletePackage: string
    viewPackage: string
    pendingReviewStatus: string
    pendingRevisionStatus?: string
    draftRevisionStatus?: string
    rejectedRevisionStatus?: string
    revisionStatus?: string
    revisionSubmittedDate?: string
    revisionUnderReview?: string
    revisionPendingHelp?: string
    revisionDraftHelp?: string
    revisionRejectedHelp?: string
    continueRevision?: string
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
      customerDpPaid: "Customer DP Paid",
      fullyPaid: "Fully Paid",
      awaitingPickup: "Awaiting Pickup",
      readyForFinance: "Ready for Finance",
      paidOut: "Paid Out",
    },
    packages: {
      merchantMissing: "Data merchant tidak ditemukan.",
      addPackage: "Tambah Paket",
      draftPackages: "Draft Paket",
      activePackages: "Paket Aktif",
      inactivePackages: "Paket Nonaktif",
      pendingPackages: "Paket Pending Review",
      rejectedPackages: "Paket Ditolak",
      heroBadge: "Merchant Packages",
      heroTitle: "Atur seluruh siklus paket merchant dari draft sampai live.",
      heroDescription: "Pantau kesehatan listing, status review admin, dan tindakan cepat untuk mengaktifkan, merevisi, atau menonaktifkan paket.",
      activePackageStat: "Paket Aktif",
      activePackageNote: "Sudah live untuk customer.",
      pendingReviewStat: "Pending Review",
      pendingReviewNote: "Sedang dinilai admin.",
      draftRejectedStat: "Draft & Ditolak",
      draftRejectedNote: "Butuh perapihan lanjutan.",
      totalPackages: "Total Paket",
      active: "Aktif",
      draft: "Draft",
      packageWorkflow: "Package Workflow",
      workflowTitle: "Kelola pipeline paket merchant",
      workflowDescription: "Pilih kategori listing yang ingin Anda kerjakan, lalu lanjutkan dengan edit, aktivasi, atau submit ulang sesuai status masing-masing paket.",
      quickSummary: "Quick Summary",
      rejected: "Ditolak",
      loadError: "Gagal memuat data paket merchant.",
      emptyState: "Belum ada paket pada kategori ini.",
      untitledPackage: "Paket tanpa judul",
      adminReason: "Alasan Admin",
      rejectedWithoutNote: "Paket ditolak tanpa catatan tambahan dari admin.",
      rejectedHelp: "Perbaiki paket lewat tombol edit, lalu kirim ulang ke review admin. Paket yang ditolak tidak bisa langsung diaktifkan.",
      reviewStatus: "Status Review",
      underReview: "Sedang direview admin",
      submitDate: "Tanggal submit",
      pendingHelp: "Paket belum tampil ke customer selama proses review. Tarik ke draft jika Anda ingin membatalkan review dan melanjutkan revisi.",
      adultPrice: "Harga Dewasa",
      pullToDraft: "Tarik ke Draft",
      activatePackage: "Aktifkan Paket",
      deactivatePackage: "Nonaktifkan Paket",
      editPackage: "Edit Paket",
      deletePackage: "Hapus Paket",
      viewPackage: "Lihat Paket",
      pendingReviewStatus: "Pending Review",
      pendingRevisionStatus: "Revisi Pending Review",
      draftRevisionStatus: "Draft Revisi",
      rejectedRevisionStatus: "Revisi Ditolak",
      revisionStatus: "Status Revisi",
      revisionSubmittedDate: "Tanggal kirim revisi",
      revisionUnderReview: "Revisi sedang direview admin",
      revisionPendingHelp: "Paket live tetap aktif, tetapi perubahan terbaru Anda belum tayang sampai admin menyetujui revisi ini.",
      revisionDraftHelp: "Paket live tetap aktif. Lanjutkan draft revisi ini untuk menyelesaikan perubahan sebelum dikirim ke admin.",
      revisionRejectedHelp: "Revisi terakhir ditolak admin. Buka kembali draft revisi untuk memperbaiki catatan admin lalu kirim ulang.",
      continueRevision: "Lanjutkan Revisi",
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
      customerDpPaid: "Customer DP Paid",
      fullyPaid: "Fully Paid",
      awaitingPickup: "Awaiting Pickup",
      readyForFinance: "Ready for Finance",
      paidOut: "Paid Out",
    },
    packages: {
      merchantMissing: "Merchant data not found.",
      addPackage: "Add Package",
      draftPackages: "Draft Packages",
      activePackages: "Active Packages",
      inactivePackages: "Inactive Packages",
      pendingPackages: "Pending Review Packages",
      rejectedPackages: "Rejected Packages",
      heroBadge: "Merchant Packages",
      heroTitle: "Manage the full merchant package lifecycle from draft to live.",
      heroDescription: "Monitor listing health, admin review status, and quick actions to activate, revise, or deactivate packages.",
      activePackageStat: "Active Packages",
      activePackageNote: "Already live for customers.",
      pendingReviewStat: "Pending Review",
      pendingReviewNote: "Currently reviewed by admin.",
      draftRejectedStat: "Draft & Rejected",
      draftRejectedNote: "Needs further cleanup.",
      totalPackages: "Total Packages",
      active: "Active",
      draft: "Draft",
      packageWorkflow: "Package Workflow",
      workflowTitle: "Manage the merchant package pipeline",
      workflowDescription: "Choose the listing category you want to work on, then continue by editing, activating, or resubmitting based on each package status.",
      quickSummary: "Quick Summary",
      rejected: "Rejected",
      loadError: "Failed to load merchant package data.",
      emptyState: "There are no packages in this category yet.",
      untitledPackage: "Untitled package",
      adminReason: "Admin Reason",
      rejectedWithoutNote: "Package was rejected without additional notes from the admin.",
      rejectedHelp: "Revise the package using the edit button, then resubmit it for admin review. Rejected packages cannot be activated directly.",
      reviewStatus: "Review Status",
      underReview: "Currently under admin review",
      submitDate: "Submission date",
      pendingHelp: "The package is not visible to customers during the review process. Move it back to draft if you want to cancel the review and continue revising.",
      adultPrice: "Adult Price",
      pullToDraft: "Move to Draft",
      activatePackage: "Activate Package",
      deactivatePackage: "Deactivate Package",
      editPackage: "Edit Package",
      deletePackage: "Delete Package",
      viewPackage: "View Package",
      pendingReviewStatus: "Pending Review",
      pendingRevisionStatus: "Revision Pending Review",
      draftRevisionStatus: "Revision Draft",
      rejectedRevisionStatus: "Revision Rejected",
      revisionStatus: "Revision Status",
      revisionSubmittedDate: "Revision submission date",
      revisionUnderReview: "The revision is currently under admin review",
      revisionPendingHelp: "The live package stays active, but your latest changes will not appear until the admin approves this revision.",
      revisionDraftHelp: "The live package stays active. Continue this revision draft to complete your changes before sending them to admin.",
      revisionRejectedHelp: "The latest revision was rejected by admin. Reopen the revision draft, fix the admin notes, and resubmit it.",
      continueRevision: "Continue Revision",
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
    packages: {
      merchantMissing: "未找到商家数据。",
      addPackage: "添加套餐",
      draftPackages: "草稿套餐",
      activePackages: "已上架套餐",
      inactivePackages: "未启用套餐",
      pendingPackages: "待审核套餐",
      rejectedPackages: "被拒绝套餐",
      heroBadge: "商家套餐",
      heroTitle: "从草稿到上架，统一管理商家套餐的完整生命周期。",
      heroDescription: "查看套餐状态、管理员审核进度，以及启用、修改或停用套餐的快捷操作。",
      activePackageStat: "已上架套餐",
      activePackageNote: "客户已经可以看到。",
      pendingReviewStat: "待审核",
      pendingReviewNote: "管理员正在审核中。",
      draftRejectedStat: "草稿与被拒绝",
      draftRejectedNote: "还需要进一步整理。",
      totalPackages: "套餐总数",
      active: "已上架",
      draft: "草稿",
      packageWorkflow: "套餐流程",
      workflowTitle: "管理商家套餐流程",
      workflowDescription: "选择您要处理的套餐分类，然后根据每个套餐的状态继续编辑、启用或重新提交审核。",
      quickSummary: "快速摘要",
      rejected: "已拒绝",
      loadError: "加载商家套餐数据失败。",
      emptyState: "该分类下还没有套餐。",
      untitledPackage: "未命名套餐",
      adminReason: "管理员原因",
      rejectedWithoutNote: "管理员拒绝了该套餐，但没有附加说明。",
      rejectedHelp: "请通过编辑按钮修改套餐，然后重新提交管理员审核。被拒绝的套餐不能直接启用。",
      reviewStatus: "审核状态",
      underReview: "管理员正在审核",
      submitDate: "提交日期",
      pendingHelp: "审核期间，客户看不到该套餐。如果您想取消审核并继续修改，请先拉回草稿。",
      adultPrice: "成人价格",
      pullToDraft: "拉回草稿",
      activatePackage: "启用套餐",
      deactivatePackage: "停用套餐",
      editPackage: "编辑套餐",
      deletePackage: "删除套餐",
      viewPackage: "查看套餐",
      pendingReviewStatus: "待审核",
      pendingRevisionStatus: "修订待审核",
      draftRevisionStatus: "修订草稿",
      rejectedRevisionStatus: "修订被拒",
      revisionStatus: "修订状态",
      revisionSubmittedDate: "修订提交日期",
      revisionUnderReview: "该修订正在由管理员审核",
      revisionPendingHelp: "当前 live 套餐会继续保持上线，但您的最新修改要等管理员通过后才会显示。",
      revisionDraftHelp: "当前 live 套餐会继续保持上线。请继续完善这份修订草稿，然后再提交管理员审核。",
      revisionRejectedHelp: "最新修订已被管理员拒绝。请重新打开修订草稿，按管理员意见修改后再提交。",
      continueRevision: "继续修订",
    },
  },
}

export function getMerchantShellText(locale: Locale) {
  return dictionaries[locale]
}
