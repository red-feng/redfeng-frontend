export type OperationsDashboardCoreWidgetKey =
  | "kpi_overview"
  | "product_performance"
  | "booking_trends"
  | "package_review_queue"
  | "latest_anomalies"
  | "sla_review"
  | "activity_feed"
  | "top_destinations"
  | "quick_actions"

export type OperationsDashboardWidgetKey = string

export type OperationsDashboardWidgetDefinition = {
  key: OperationsDashboardCoreWidgetKey
  title: string
  description: string
  status: "connected" | "partial" | "roadmap"
  defaultEnabled: boolean
}

export type ProductWidgetCatalogSection = {
  title: string
  items: Array<{
    key: string
    label: string
    status: "connected" | "partial" | "roadmap"
    defaultEnabled: boolean
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
    description: "Total booking, revenue, merchant aktif, pending review, dan anomali terbuka.",
    status: "connected",
    defaultEnabled: true,
  },
  {
    key: "product_performance",
    title: "Performa per Produk",
    description: "Ringkasan Paket Wisata, Pesawat, Hotel, Kereta, Bus, Kapal Laut, dan Kapal Pesiar.",
    status: "partial",
    defaultEnabled: true,
  },
  {
    key: "booking_trends",
    title: "Booking & Revenue Trend",
    description: "Grafik booking, revenue, dan distribusi booking per kategori.",
    status: "connected",
    defaultEnabled: true,
  },
  {
    key: "package_review_queue",
    title: "Paket Menunggu Review",
    description: "Tabel paket wisata yang perlu ditinjau oleh tim operasional/admin.",
    status: "connected",
    defaultEnabled: true,
  },
  {
    key: "latest_anomalies",
    title: "Anomali Terbaru",
    description: "Deletion request, approval request, dan item yang melewati SLA.",
    status: "connected",
    defaultEnabled: true,
  },
  {
    key: "sla_review",
    title: "SLA Review",
    description: "Ringkasan SLA tepat waktu, mendekati batas, dan lewat batas.",
    status: "connected",
    defaultEnabled: true,
  },
  {
    key: "activity_feed",
    title: "Aktivitas Terakhir",
    description: "Audit log dan aktivitas operasional terbaru.",
    status: "connected",
    defaultEnabled: true,
  },
  {
    key: "top_destinations",
    title: "Top Destinasi",
    description: "Destinasi teratas berdasarkan booking Paket Wisata.",
    status: "connected",
    defaultEnabled: true,
  },
  {
    key: "quick_actions",
    title: "Quick Actions",
    description: "Shortcut cepat ke review paket, anomali, deletion request, audit log, dan booking center.",
    status: "connected",
    defaultEnabled: true,
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
          { key: "package_tour_total_booking", label: "Total booking", status: "connected", defaultEnabled: false },
          { key: "package_tour_revenue", label: "Revenue paket", status: "connected", defaultEnabled: false },
          { key: "package_tour_merchant_active", label: "Merchant aktif", status: "connected", defaultEnabled: false },
          { key: "package_tour_top_destinations", label: "Top destinasi", status: "connected", defaultEnabled: false },
        ],
      },
      {
        title: "Operational Health",
        items: [
          { key: "package_tour_pending_review", label: "Pending review", status: "connected", defaultEnabled: false },
          { key: "package_tour_open_anomalies", label: "Anomali terbuka", status: "connected", defaultEnabled: false },
          { key: "package_tour_sla_review", label: "SLA review", status: "connected", defaultEnabled: false },
          { key: "package_tour_deletion_request", label: "Deletion request", status: "connected", defaultEnabled: false },
        ],
      },
      {
        title: "Performance",
        items: [
          { key: "package_tour_top_merchant_revenue", label: "Top merchant revenue", status: "connected", defaultEnabled: false },
          { key: "package_tour_review_queue", label: "Paket menunggu review", status: "connected", defaultEnabled: false },
          { key: "package_tour_booking_trend", label: "Booking trend", status: "connected", defaultEnabled: false },
          { key: "package_tour_activity_feed", label: "Activity feed", status: "connected", defaultEnabled: false },
        ],
      },
    ],
  },
  {
    productLabel: "Pesawat",
    productHref: "/admin/pesawat",
    status: "roadmap",
    note: "Fokus ke issue/issuance tiket, supplier API, dan exception handling khas flight.",
    sections: [
      {
        title: "Volume & Revenue",
        items: [
          { key: "flight_ticket_issued", label: "Ticket issued", status: "roadmap", defaultEnabled: false },
          { key: "flight_pending_payment", label: "Booking pending payment", status: "roadmap", defaultEnabled: false },
          { key: "flight_revenue", label: "Revenue tiket", status: "roadmap", defaultEnabled: false },
        ],
      },
      {
        title: "Operational Health",
        items: [
          { key: "flight_refund_reschedule_request", label: "Refund/reschedule request", status: "roadmap", defaultEnabled: false },
          { key: "flight_gds_api_error", label: "GDS/API error", status: "roadmap", defaultEnabled: false },
          { key: "flight_issue_failed", label: "Booking failed / issue failed", status: "roadmap", defaultEnabled: false },
          { key: "flight_schedule_change", label: "Schedule change", status: "roadmap", defaultEnabled: false },
        ],
      },
      {
        title: "Performance",
        items: [
          { key: "flight_top_airlines", label: "Maskapai teratas", status: "roadmap", defaultEnabled: false },
          { key: "flight_top_routes", label: "Route teratas", status: "roadmap", defaultEnabled: false },
          { key: "flight_supplier_api_success_rate", label: "Supplier/API success rate", status: "roadmap", defaultEnabled: false },
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
          { key: "hotel_room_night", label: "Room night", status: "roadmap", defaultEnabled: false },
          { key: "hotel_revenue", label: "Revenue hotel", status: "roadmap", defaultEnabled: false },
          { key: "hotel_pending_confirmation", label: "Booking pending confirmation", status: "roadmap", defaultEnabled: false },
        ],
      },
      {
        title: "Operational Health",
        items: [
          { key: "hotel_cancellation", label: "Cancellation", status: "roadmap", defaultEnabled: false },
          { key: "hotel_supplier_confirmation_sla", label: "Supplier confirmation SLA", status: "roadmap", defaultEnabled: false },
          { key: "hotel_refund_amendment_request", label: "Refund / amendment request", status: "roadmap", defaultEnabled: false },
        ],
      },
      {
        title: "Performance",
        items: [
          { key: "hotel_partner_occupancy", label: "Occupancy partner", status: "roadmap", defaultEnabled: false },
          { key: "hotel_top_hotel_city", label: "Top hotel/city", status: "roadmap", defaultEnabled: false },
          { key: "hotel_checkin_today", label: "Check-in hari ini", status: "roadmap", defaultEnabled: false },
          { key: "hotel_checkout_today", label: "Check-out hari ini", status: "roadmap", defaultEnabled: false },
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
          { key: "train_ticket_issued", label: "Ticket issued", status: "roadmap", defaultEnabled: false },
          { key: "train_pending_payment", label: "Pending payment", status: "roadmap", defaultEnabled: false },
        ],
      },
      {
        title: "Operational Health",
        items: [
          { key: "train_refund_cancel", label: "Refund/cancel", status: "roadmap", defaultEnabled: false },
          { key: "train_vendor_issue_error", label: "Vendor issue/error", status: "roadmap", defaultEnabled: false },
          { key: "train_issued_success_rate", label: "Issued success rate", status: "roadmap", defaultEnabled: false },
        ],
      },
      {
        title: "Performance",
        items: [
          { key: "train_top_routes", label: "Route teratas", status: "roadmap", defaultEnabled: false },
          { key: "train_operator_vendor_performance", label: "Operator/vendor performance", status: "roadmap", defaultEnabled: false },
          { key: "train_schedule_today", label: "Jadwal hari ini", status: "roadmap", defaultEnabled: false },
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
          { key: "bus_ticket_issued", label: "Ticket issued", status: "roadmap", defaultEnabled: false },
          { key: "bus_pending_payment", label: "Pending payment", status: "roadmap", defaultEnabled: false },
        ],
      },
      {
        title: "Operational Health",
        items: [
          { key: "bus_refund_cancel", label: "Refund/cancel", status: "roadmap", defaultEnabled: false },
          { key: "bus_vendor_issue_error", label: "Vendor issue/error", status: "roadmap", defaultEnabled: false },
          { key: "bus_issued_success_rate", label: "Issued success rate", status: "roadmap", defaultEnabled: false },
        ],
      },
      {
        title: "Performance",
        items: [
          { key: "bus_top_routes", label: "Route teratas", status: "roadmap", defaultEnabled: false },
          { key: "bus_operator_vendor_performance", label: "Operator/vendor performance", status: "roadmap", defaultEnabled: false },
          { key: "bus_schedule_today", label: "Jadwal hari ini", status: "roadmap", defaultEnabled: false },
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
          { key: "sea_ticket_issued", label: "Ticket issued", status: "roadmap", defaultEnabled: false },
          { key: "sea_pending_payment", label: "Pending payment", status: "roadmap", defaultEnabled: false },
        ],
      },
      {
        title: "Operational Health",
        items: [
          { key: "sea_refund_cancel", label: "Refund/cancel", status: "roadmap", defaultEnabled: false },
          { key: "sea_vendor_issue_error", label: "Vendor issue/error", status: "roadmap", defaultEnabled: false },
          { key: "sea_issued_success_rate", label: "Issued success rate", status: "roadmap", defaultEnabled: false },
        ],
      },
      {
        title: "Performance",
        items: [
          { key: "sea_top_routes", label: "Route teratas", status: "roadmap", defaultEnabled: false },
          { key: "sea_operator_vendor_performance", label: "Operator/vendor performance", status: "roadmap", defaultEnabled: false },
          { key: "sea_schedule_today", label: "Jadwal hari ini", status: "roadmap", defaultEnabled: false },
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
          { key: "cruise_ticket_issued", label: "Ticket issued", status: "roadmap", defaultEnabled: false },
          { key: "cruise_pending_payment", label: "Pending payment", status: "roadmap", defaultEnabled: false },
        ],
      },
      {
        title: "Operational Health",
        items: [
          { key: "cruise_refund_cancel", label: "Refund/cancel", status: "roadmap", defaultEnabled: false },
          { key: "cruise_vendor_issue_error", label: "Vendor issue/error", status: "roadmap", defaultEnabled: false },
          { key: "cruise_issued_success_rate", label: "Issued success rate", status: "roadmap", defaultEnabled: false },
        ],
      },
      {
        title: "Performance",
        items: [
          { key: "cruise_top_routes", label: "Route teratas", status: "roadmap", defaultEnabled: false },
          { key: "cruise_operator_vendor_performance", label: "Operator/vendor performance", status: "roadmap", defaultEnabled: false },
          { key: "cruise_schedule_today", label: "Jadwal hari ini", status: "roadmap", defaultEnabled: false },
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

export const ALL_OPERATIONS_DASHBOARD_WIDGET_KEYS = [
  ...OPERATIONS_DASHBOARD_WIDGETS.map((widget) => widget.key),
  ...OPERATIONS_PRODUCT_WIDGET_KEYS,
]
