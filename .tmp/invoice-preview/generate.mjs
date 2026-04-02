import { writeFileSync } from "node:fs"
import { createInvoicePdf } from "./invoicePdf.ts"

const common = {
  invoiceNumber: "INV-RF2603310001",
  bookingCode: "RF2603310001",
  customerName: "Bayu Kusumo",
  packageTitle: "3 Hari 2 Malam Bali Adventure",
  pickupDateLabel: "02 April 2026",
  merchantName: "Golden Road Travel",
  merchantCode: "GRT-001",
  verificationUrl: "https://app.redfeng.co/verifikasi-invoice/?booking_id=RF2603310001",
  paymentStatusLabel: "Fully Paid",
  paymentTypeLabel: "Full Payment",
  subtotalAmount: 4000000,
  adminFeeAmount: 50000,
  taxAmount: 24000,
  totalAmount: 4074000,
}

const locales = [
  { code: "id", status: "Lunas", type: "Full Payment" },
  { code: "en", status: "Fully Paid", type: "Full Payment" },
  { code: "zh", status: "?????", type: "????" },
]

for (const locale of locales) {
  const pdf = createInvoicePdf({
    ...common,
    locale: locale.code,
    paymentStatusLabel: locale.status,
    paymentTypeLabel: locale.type,
  })
  writeFileSync(`.tmp/invoice-preview/sample-${locale.code}.pdf`, pdf)
}
