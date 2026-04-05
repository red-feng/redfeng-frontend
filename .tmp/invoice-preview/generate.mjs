import { writeFileSync } from "node:fs"
import { createInvoicePdf } from "./invoicePdf.ts"

const common = {
  invoiceNumber: "INV-RF2603310001",
  bookingCode: "RF2603310001",
  customerName: "Bayu Kusumo",
  pickupDateLabel: "02 April 2026",
  merchantName: "Golden Road Travel",
  merchantCode: "GRT-001",
  verificationUrl: "https://app.redfeng.co/verifikasi-invoice/?booking_id=RF2603310001",
}

const locales = [
  {
    code: "id",
    currency: "IDR",
    status: "Lunas",
    type: "Full Payment",
    packageTitle: "3 Hari 2 Malam Bali Adventure",
    subtotalAmount: 4000000,
    adminFeeAmount: 50000,
    taxAmount: 24000,
    totalAmount: 4074000,
  },
  {
    code: "en",
    currency: "USD",
    status: "Fully Paid",
    type: "Full Payment",
    packageTitle: "3 Days 2 Nights Bali Adventure",
    subtotalAmount: 244,
    adminFeeAmount: 3,
    taxAmount: 1,
    totalAmount: 248,
  },
  {
    code: "zh",
    currency: "CNY",
    status: "已全额付款",
    type: "全额付款",
    packageTitle: "巴厘岛 3天2晚探险之旅",
    subtotalAmount: 1780,
    adminFeeAmount: 22,
    taxAmount: 11,
    totalAmount: 1813,
  },
]

for (const locale of locales) {
  const pdf = await createInvoicePdf({
    ...common,
    locale: locale.code,
    currency: locale.currency,
    packageTitle: locale.packageTitle,
    paymentStatusLabel: locale.status,
    paymentTypeLabel: locale.type,
    subtotalAmount: locale.subtotalAmount,
    adminFeeAmount: locale.adminFeeAmount,
    taxAmount: locale.taxAmount,
    totalAmount: locale.totalAmount,
  })
  writeFileSync(`.tmp/invoice-preview/sample-${locale.code}.pdf`, pdf)
}
