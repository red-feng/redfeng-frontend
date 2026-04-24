export type OperationsDashboardCoreWidgetKey =
  | "kpi_overview"
  | "product_performance"
  | "booking_trends"
  | "quick_actions"

export type OperationsDashboardWidgetKey = string

export type OperationsDashboardWidgetDefinition = {
  key: OperationsDashboardCoreWidgetKey
  title: string
  description: string
  status: "connected" | "partial" | "roadmap"
  defaultEnabled: boolean
  scope: "global_only" | "hybrid"
  scopeNote: string
}

export type ProductWidgetCatalogSection = {
  title: string
  items: Array<{
    key: string
    label: string
    status: "connected" | "partial" | "roadmap"
    defaultEnabled: boolean
    scope: "product_only" | "hybrid"
    scopeNote: string
  }>
}

export type ProductWidgetCatalogEntry = {
  productLabel: string
  productHref: string
  status: "connected" | "partial" | "roadmap"
  note: string
  sections: ProductWidgetCatalogSection[]
}

export const OPERATIONS_DASHBOARD_SCOPE = "operations_manager"

export const OPERATIONS_DASHBOARD_WIDGETS: OperationsDashboardWidgetDefinition[] = [
  {
    key: "kpi_overview",
    title: "KPI Utama",
    description: "Total booking, revenue, partner aktif, queue review, dan anomali terbuka.",
    status: "connected",
    defaultEnabled: true,
    scope: "global_only",
    scopeNote: "Hanya muncul di level dashboard utama lintas semua produk.",
  },
  {
    key: "product_performance",
    title: "Performa per Produk",
    description: "Ringkasan Paket Wisata, Pesawat, Hotel, Kereta, Bus, Kapal Laut, dan Kapal Pesiar.",
    status: "partial",
    defaultEnabled: true,
    scope: "global_only",
    scopeNote: "Dipakai untuk membandingkan semua produk dalam satu ringkasan.",
  },
  {
    key: "booking_trends",
    title: "Booking & Revenue Trend",
    description: "Grafik booking, revenue, dan distribusi booking per kategori.",
    status: "connected",
    defaultEnabled: true,
    scope: "hybrid",
    scopeNote: "Versi global merangkum semua produk, versi detail bisa hidup lagi di masing-masing produk.",
  },
  {
    key: "quick_actions",
    title: "Quick Actions",
    description: "Shortcut cepat ke anomali, approval queue, audit log, booking center, dan laporan lintas workspace.",
    status: "connected",
    defaultEnabled: true,
    scope: "global_only",
    scopeNote: "Dipakai sebagai shortcut lintas workspace. Action yang spesifik produk dipindahkan ke widget produk.",
  },
]

export const DEFAULT_OPERATIONS_DASHBOARD_WIDGET_KEYS = OPERATIONS_DASHBOARD_WIDGETS
  .filter((widget) => widget.defaultEnabled)
  .map((widget) => widget.key)

export const OPERATIONS_PRODUCT_WIDGET_CATALOG: ProductWidgetCatalogEntry[] = [
  {
    productLabel: "Paket Wisata",
    productHref: "/admin/paket-tour",
    status: "connected",
    note: "Produk yang saat ini paling siap dan sudah punya data operasional live di dashboard.",
    sections: [
      {
        title: "Volume & Revenue",
        items: [
          { key: "package_tour_total_booking", label: "Total booking", status: "connected", defaultEnabled: false, scope: "product_only", scopeNote: "Khusus performa Paket Wisata." },
          { key: "package_tour_revenue", label: "Revenue paket", status: "connected", defaultEnabled: false, scope: "product_only", scopeNote: "Khusus revenue Paket Wisata." },
          { key: "package_tour_merchant_active", label: "Merchant aktif", status: "connected", defaultEnabled: false, scope: "product_only", scopeNote: "Dipakai untuk konteks merchant di Paket Wisata." },
          { key: "package_tour_top_destinations", label: "Top destinasi", status: "connected", defaultEnabled: false, scope: "product_only", scopeNote: "Hanya relevan untuk produk Paket Wisata." },
        ],
      },
      {
        title: "Operational Health",
        items: [
          { key: "package_tour_pending_review", label: "Pending review", status: "connected", defaultEnabled: false, scope: "product_only", scopeNote: "Queue review milik Paket Wisata." },
          { key: "package_tour_open_anomalies", label: "Anomali terbuka", status: "connected", defaultEnabled: false, scope: "hybrid", scopeNote: "Anomali bisa punya versi global dan detail per produk." },
          { key: "package_tour_sla_review", label: "SLA review", status: "connected", defaultEnabled: false, scope: "hybrid", scopeNote: "SLA cocok dibaca global maupun per produk." },
          { key: "package_tour_deletion_request", label: "Deletion request", status: "connected", defaultEnabled: false, scope: "product_only", scopeNote: "Digunakan untuk workflow operasional merchant Paket Wisata." },
        ],
      },
      {
        title: "Performance",
        items: [
          { key: "package_tour_top_merchant_revenue", label: "Top merchant revenue", status: "connected", defaultEnabled: false, scope: "product_only", scopeNote: "Khusus merchant di produk Paket Wisata." },
          { key: "package_tour_review_queue", label: "Paket menunggu review", status: "connected", defaultEnabled: false, scope: "product_only", scopeNote: "Detail review queue Paket Wisata." },
          { key: "package_tour_booking_trend", label: "Booking trend", status: "connected", defaultEnabled: false, scope: "hybrid", scopeNote: "Trend bisa punya ringkasan global dan detail produk." },
          { key: "package_tour_activity_feed", label: "Activity feed", status: "connected", defaultEnabled: false, scope: "hybrid", scopeNote: "Aktivitas bisa dibaca lintas sistem atau khusus per produk." },
          { key: "package_tour_quick_actions", label: "Quick actions Paket Wisata", status: "connected", defaultEnabled: false, scope: "product_only", scopeNote: "Shortcut tindakan cepat yang khusus untuk workflow Paket Wisata." },
        ],
      },
    ],
  },
  {
    productLabel: "Pesawat",
    productHref: "/admin/pesawat",
    status: "partial",
    note: "Fokus ke issue/issuance tiket, supplier API, dan exception handling khas flight.",
    sections: [
      {
        title: "Volume & Revenue",
        items: [
          { key: "flight_ticket_issued", label: "Ticket issued", status: "roadmap", defaultEnabled: false, scope: "product_only", scopeNote: "Khusus operasional produk Pesawat." },
          { key: "flight_pending_payment", label: "Booking pending payment", status: "roadmap", defaultEnabled: false, scope: "product_only", scopeNote: "Antrian pembayaran tiket Pesawat." },
          { key: "flight_revenue", label: "Revenue tiket", status: "roadmap", defaultEnabled: false, scope: "product_only", scopeNote: "Revenue khusus channel Pesawat." },
        ],
      },
      {
        title: "Operational Health",
        items: [
          { key: "flight_refund_reschedule_request", label: "Refund/reschedule request", status: "roadmap", defaultEnabled: false, scope: "product_only", scopeNote: "Workflow khas operasional Pesawat." },
          { key: "flight_gds_api_error", label: "GDS/API error", status: "roadmap", defaultEnabled: false, scope: "product_only", scopeNote: "Error supplier khusus produk Pesawat." },
          { key: "flight_issue_failed", label: "Booking failed / issue failed", status: "roadmap", defaultEnabled: false, scope: "product_only", scopeNote: "Exception issuing tiket Pesawat." },
          { key: "flight_schedule_change", label: "Schedule change", status: "roadmap", defaultEnabled: false, scope: "product_only", scopeNote: "Perubahan jadwal khas Pesawat." },
        ],
      },
      {
        title: "Performance",
        items: [
          { key: "flight_top_airlines", label: "Maskapai teratas", status: "roadmap", defaultEnabled: false, scope: "product_only", scopeNote: "Leaderboard khusus operasional Pesawat." },
          { key: "flight_top_routes", label: "Route teratas", status: "roadmap", defaultEnabled: false, scope: "product_only", scopeNote: "Rute paling aktif di produk Pesawat." },
          { key: "flight_supplier_api_success_rate", label: "Supplier/API success rate", status: "roadmap", defaultEnabled: false, scope: "product_only", scopeNote: "Kesehatan supplier khusus Pesawat." },
          { key: "flight_quick_actions", label: "Quick actions Pesawat", status: "roadmap", defaultEnabled: false, scope: "product_only", scopeNote: "Shortcut cepat khusus workflow operasional Pesawat." },
        ],
      },
    ],
  },
  {
    productLabel: "Hotel",
    productHref: "/admin/hotel",
    status: "roadmap",
    note: "Cocok untuk fokus ke supplier confirmation, room availability, dan lifecycle stay.",
    sections: [
      {
        title: "Volume & Revenue",
        items: [
          { key: "hotel_room_night", label: "Room night", status: "roadmap", defaultEnabled: false, scope: "product_only", scopeNote: "Khusus operasional Hotel." },
          { key: "hotel_revenue", label: "Revenue hotel", status: "roadmap", defaultEnabled: false, scope: "product_only", scopeNote: "Revenue khusus channel Hotel." },
          { key: "hotel_pending_confirmation", label: "Booking pending confirmation", status: "roadmap", defaultEnabled: false, scope: "product_only", scopeNote: "Menunggu konfirmasi supplier Hotel." },
        ],
      },
      {
        title: "Operational Health",
        items: [
          { key: "hotel_cancellation", label: "Cancellation", status: "roadmap", defaultEnabled: false, scope: "product_only", scopeNote: "Exception khas Hotel." },
          { key: "hotel_supplier_confirmation_sla", label: "Supplier confirmation SLA", status: "roadmap", defaultEnabled: false, scope: "product_only", scopeNote: "SLA konfirmasi khusus Hotel." },
          { key: "hotel_refund_amendment_request", label: "Refund / amendment request", status: "roadmap", defaultEnabled: false, scope: "product_only", scopeNote: "Perubahan/reschedule khusus Hotel." },
        ],
      },
      {
        title: "Performance",
        items: [
          { key: "hotel_partner_occupancy", label: "Occupancy partner", status: "roadmap", defaultEnabled: false, scope: "product_only", scopeNote: "Performa partner Hotel." },
          { key: "hotel_top_hotel_city", label: "Top hotel/city", status: "roadmap", defaultEnabled: false, scope: "product_only", scopeNote: "Leaderboard Hotel." },
          { key: "hotel_checkin_today", label: "Check-in hari ini", status: "roadmap", defaultEnabled: false, scope: "product_only", scopeNote: "Operasional harian Hotel." },
          { key: "hotel_checkout_today", label: "Check-out hari ini", status: "roadmap", defaultEnabled: false, scope: "product_only", scopeNote: "Operasional harian Hotel." },
          { key: "hotel_quick_actions", label: "Quick actions Hotel", status: "roadmap", defaultEnabled: false, scope: "product_only", scopeNote: "Shortcut cepat khusus workflow operasional Hotel." },
        ],
      },
    ],
  },
  {
    productLabel: "Kereta Api",
    productHref: "/admin/kereta-api",
    status: "roadmap",
    note: "Blueprint awal untuk produk tiket transportasi yang bersifat schedule-based.",
    sections: [
      {
        title: "Volume & Revenue",
        items: [
          { key: "train_ticket_issued", label: "Ticket issued", status: "roadmap", defaultEnabled: false, scope: "product_only", scopeNote: "Khusus operasional Kereta Api." },
          { key: "train_pending_payment", label: "Pending payment", status: "roadmap", defaultEnabled: false, scope: "product_only", scopeNote: "Menunggu pembayaran tiket Kereta Api." },
        ],
      },
      {
        title: "Operational Health",
        items: [
          { key: "train_refund_cancel", label: "Refund/cancel", status: "roadmap", defaultEnabled: false, scope: "product_only", scopeNote: "Workflow khas Kereta Api." },
          { key: "train_vendor_issue_error", label: "Vendor issue/error", status: "roadmap", defaultEnabled: false, scope: "product_only", scopeNote: "Kesehatan vendor Kereta Api." },
          { key: "train_issued_success_rate", label: "Issued success rate", status: "roadmap", defaultEnabled: false, scope: "product_only", scopeNote: "KPI issuing Kereta Api." },
        ],
      },
      {
        title: "Performance",
        items: [
          { key: "train_top_routes", label: "Route teratas", status: "roadmap", defaultEnabled: false, scope: "product_only", scopeNote: "Rute paling aktif di Kereta Api." },
          { key: "train_operator_vendor_performance", label: "Operator/vendor performance", status: "roadmap", defaultEnabled: false, scope: "product_only", scopeNote: "Performa operator Kereta Api." },
          { key: "train_schedule_today", label: "Jadwal hari ini", status: "roadmap", defaultEnabled: false, scope: "product_only", scopeNote: "Operasional harian Kereta Api." },
          { key: "train_quick_actions", label: "Quick actions Kereta Api", status: "roadmap", defaultEnabled: false, scope: "product_only", scopeNote: "Shortcut cepat khusus workflow operasional Kereta Api." },
        ],
      },
    ],
  },
  {
    productLabel: "Bus & Travel",
    productHref: "/admin/bus-travel",
    status: "roadmap",
    note: "Mirip kereta, tetapi akan lebih berat di operator, pool, dan route coverage.",
    sections: [
      {
        title: "Volume & Revenue",
        items: [
          { key: "bus_ticket_issued", label: "Ticket issued", status: "roadmap", defaultEnabled: false, scope: "product_only", scopeNote: "Khusus operasional Bus & Travel." },
          { key: "bus_pending_payment", label: "Pending payment", status: "roadmap", defaultEnabled: false, scope: "product_only", scopeNote: "Menunggu pembayaran Bus & Travel." },
        ],
      },
      {
        title: "Operational Health",
        items: [
          { key: "bus_refund_cancel", label: "Refund/cancel", status: "roadmap", defaultEnabled: false, scope: "product_only", scopeNote: "Exception Bus & Travel." },
          { key: "bus_vendor_issue_error", label: "Vendor issue/error", status: "roadmap", defaultEnabled: false, scope: "product_only", scopeNote: "Kesehatan vendor Bus & Travel." },
          { key: "bus_issued_success_rate", label: "Issued success rate", status: "roadmap", defaultEnabled: false, scope: "product_only", scopeNote: "KPI issuing Bus & Travel." },
        ],
      },
      {
        title: "Performance",
        items: [
          { key: "bus_top_routes", label: "Route teratas", status: "roadmap", defaultEnabled: false, scope: "product_only", scopeNote: "Rute aktif Bus & Travel." },
          { key: "bus_operator_vendor_performance", label: "Operator/vendor performance", status: "roadmap", defaultEnabled: false, scope: "product_only", scopeNote: "Performa operator Bus & Travel." },
          { key: "bus_schedule_today", label: "Jadwal hari ini", status: "roadmap", defaultEnabled: false, scope: "product_only", scopeNote: "Operasional harian Bus & Travel." },
          { key: "bus_quick_actions", label: "Quick actions Bus & Travel", status: "roadmap", defaultEnabled: false, scope: "product_only", scopeNote: "Shortcut cepat khusus workflow operasional Bus & Travel." },
        ],
      },
    ],
  },
  {
    productLabel: "Kapal Laut",
    productHref: "/admin/kapal-laut",
    status: "roadmap",
    note: "Akan cocok untuk shipment/passenger schedule dengan operator dan manifest monitoring.",
    sections: [
      {
        title: "Volume & Revenue",
        items: [
          { key: "sea_ticket_issued", label: "Ticket issued", status: "roadmap", defaultEnabled: false, scope: "product_only", scopeNote: "Khusus operasional Kapal Laut." },
          { key: "sea_pending_payment", label: "Pending payment", status: "roadmap", defaultEnabled: false, scope: "product_only", scopeNote: "Menunggu pembayaran Kapal Laut." },
        ],
      },
      {
        title: "Operational Health",
        items: [
          { key: "sea_refund_cancel", label: "Refund/cancel", status: "roadmap", defaultEnabled: false, scope: "product_only", scopeNote: "Exception Kapal Laut." },
          { key: "sea_vendor_issue_error", label: "Vendor issue/error", status: "roadmap", defaultEnabled: false, scope: "product_only", scopeNote: "Kesehatan vendor Kapal Laut." },
          { key: "sea_issued_success_rate", label: "Issued success rate", status: "roadmap", defaultEnabled: false, scope: "product_only", scopeNote: "KPI issuing Kapal Laut." },
        ],
      },
      {
        title: "Performance",
        items: [
          { key: "sea_top_routes", label: "Route teratas", status: "roadmap", defaultEnabled: false, scope: "product_only", scopeNote: "Rute aktif Kapal Laut." },
          { key: "sea_operator_vendor_performance", label: "Operator/vendor performance", status: "roadmap", defaultEnabled: false, scope: "product_only", scopeNote: "Performa operator Kapal Laut." },
          { key: "sea_schedule_today", label: "Jadwal hari ini", status: "roadmap", defaultEnabled: false, scope: "product_only", scopeNote: "Operasional harian Kapal Laut." },
          { key: "sea_quick_actions", label: "Quick actions Kapal Laut", status: "roadmap", defaultEnabled: false, scope: "product_only", scopeNote: "Shortcut cepat khusus workflow operasional Kapal Laut." },
        ],
      },
    ],
  },
  {
    productLabel: "Kapal Pesiar",
    productHref: "/admin/kapal-pesiar",
    status: "roadmap",
    note: "Biasanya perlu tambahan cabin inventory dan itinerary handling, tapi bisa mulai dari struktur transportasi.",
    sections: [
      {
        title: "Volume & Revenue",
        items: [
          { key: "cruise_ticket_issued", label: "Ticket issued", status: "roadmap", defaultEnabled: false, scope: "product_only", scopeNote: "Khusus operasional Kapal Pesiar." },
          { key: "cruise_pending_payment", label: "Pending payment", status: "roadmap", defaultEnabled: false, scope: "product_only", scopeNote: "Menunggu pembayaran Kapal Pesiar." },
        ],
      },
      {
        title: "Operational Health",
        items: [
          { key: "cruise_refund_cancel", label: "Refund/cancel", status: "roadmap", defaultEnabled: false, scope: "product_only", scopeNote: "Exception Kapal Pesiar." },
          { key: "cruise_vendor_issue_error", label: "Vendor issue/error", status: "roadmap", defaultEnabled: false, scope: "product_only", scopeNote: "Kesehatan vendor Kapal Pesiar." },
          { key: "cruise_issued_success_rate", label: "Issued success rate", status: "roadmap", defaultEnabled: false, scope: "product_only", scopeNote: "KPI issuing Kapal Pesiar." },
        ],
      },
      {
        title: "Performance",
        items: [
          { key: "cruise_top_routes", label: "Route teratas", status: "roadmap", defaultEnabled: false, scope: "product_only", scopeNote: "Rute aktif Kapal Pesiar." },
          { key: "cruise_operator_vendor_performance", label: "Operator/vendor performance", status: "roadmap", defaultEnabled: false, scope: "product_only", scopeNote: "Performa operator Kapal Pesiar." },
          { key: "cruise_schedule_today", label: "Jadwal hari ini", status: "roadmap", defaultEnabled: false, scope: "product_only", scopeNote: "Operasional harian Kapal Pesiar." },
          { key: "cruise_quick_actions", label: "Quick actions Kapal Pesiar", status: "roadmap", defaultEnabled: false, scope: "product_only", scopeNote: "Shortcut cepat khusus workflow operasional Kapal Pesiar." },
        ],
      },
    ],
  },
]

export function resolveOperationsDashboardWidgetKeys(
  preferences: Array<{ widget_key: string | null; enabled: boolean | null }> | null | undefined,
) {
  if (!preferences || preferences.length === 0) {
    return new Set<OperationsDashboardWidgetKey>(DEFAULT_OPERATIONS_DASHBOARD_WIDGET_KEYS)
  }

  const validKeys = new Set(ALL_OPERATIONS_DASHBOARD_WIDGET_KEYS)
  return new Set(
    preferences
      .filter((preference) => preference.enabled && preference.widget_key && validKeys.has(preference.widget_key))
      .map((preference) => preference.widget_key as OperationsDashboardWidgetKey),
  )
}

export const OPERATIONS_PRODUCT_WIDGET_KEYS = OPERATIONS_PRODUCT_WIDGET_CATALOG.flatMap((product) =>
  product.sections.flatMap((section) => section.items.map((item) => item.key)),
)

export const LEGACY_OPERATIONS_DASHBOARD_WIDGET_KEYS = [
  "package_review_queue",
  "latest_anomalies",
  "sla_review",
  "activity_feed",
  "top_destinations",
] as const

export const ALL_OPERATIONS_DASHBOARD_WIDGET_KEYS = [
  ...OPERATIONS_DASHBOARD_WIDGETS.map((widget) => widget.key),
  ...OPERATIONS_PRODUCT_WIDGET_KEYS,
  ...LEGACY_OPERATIONS_DASHBOARD_WIDGET_KEYS,
]
