export type OperationsDashboardWidgetKey =
  | "kpi_overview"
  | "product_performance"
  | "booking_trends"
  | "package_review_queue"
  | "latest_anomalies"
  | "sla_review"
  | "activity_feed"
  | "top_destinations"
  | "quick_actions"

export type OperationsDashboardWidgetDefinition = {
  key: OperationsDashboardWidgetKey
  title: string
  description: string
  status: "connected" | "partial" | "roadmap"
  defaultEnabled: boolean
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

export function resolveOperationsDashboardWidgetKeys(
  preferences: Array<{ widget_key: string | null; enabled: boolean | null }> | null | undefined,
) {
  if (!preferences || preferences.length === 0) {
    return new Set<OperationsDashboardWidgetKey>(DEFAULT_OPERATIONS_DASHBOARD_WIDGET_KEYS)
  }

  const validKeys = new Set(OPERATIONS_DASHBOARD_WIDGETS.map((widget) => widget.key))
  return new Set(
    preferences
      .filter((preference) => preference.enabled && preference.widget_key && validKeys.has(preference.widget_key as OperationsDashboardWidgetKey))
      .map((preference) => preference.widget_key as OperationsDashboardWidgetKey),
  )
}
