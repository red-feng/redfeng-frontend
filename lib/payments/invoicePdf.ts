import QRCode from "qrcode"

type InvoicePdfPayload = {
  invoiceNumber: string
  bookingCode: string
  customerName: string | null
  packageTitle?: string | null
  pickupDateLabel?: string | null
  merchantName?: string | null
  verificationUrl?: string | null
  paymentStatusLabel: string
  paymentTypeLabel: string
  subtotalAmount: number
  adminFeeAmount: number
  taxAmount: number
  totalAmount: number
  issuedAt?: Date
}

function escapePdfText(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)")
}

function formatMoney(value: number) {
  return `Rp ${Number(value || 0).toLocaleString("id-ID")}`
}

function formatDate(value: Date) {
  return value.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  })
}

function pdfText(
  x: number,
  y: number,
  text: string,
  options?: {
    font?: "F1" | "F2"
    size?: number
    color?: [number, number, number]
  },
) {
  const font = options?.font || "F1"
  const size = options?.size || 12
  const [r, g, b] = options?.color || [0.07, 0.09, 0.13]
  return [`${r} ${g} ${b} rg`, "BT", `/${font} ${size} Tf`, `1 0 0 1 ${x} ${y} Tm (${escapePdfText(text)}) Tj`, "ET"].join("\n")
}

function pdfLine(x1: number, y1: number, x2: number, y2: number, width = 1, color: [number, number, number] = [0.9, 0.89, 0.86]) {
  return [`${color[0]} ${color[1]} ${color[2]} RG`, `${width} w`, `${x1} ${y1} m`, `${x2} ${y2} l`, "S"].join("\n")
}

function pdfFilledRect(
  x: number,
  y: number,
  width: number,
  height: number,
  fill: [number, number, number],
  stroke?: [number, number, number],
) {
  const commands = [`${fill[0]} ${fill[1]} ${fill[2]} rg`]
  if (stroke) {
    commands.push(`${stroke[0]} ${stroke[1]} ${stroke[2]} RG`)
  }
  commands.push(`${x} ${y} ${width} ${height} re`)
  commands.push(stroke ? "B" : "f")
  return commands.join("\n")
}

const code39Patterns: Record<string, string> = {
  "0": "nnnwwnwnn",
  "1": "wnnwnnnnw",
  "2": "nnwwnnnnw",
  "3": "wnwwnnnnn",
  "4": "nnnwwnnnw",
  "5": "wnnwwnnnn",
  "6": "nnwwwnnnn",
  "7": "nnnwnnwnw",
  "8": "wnnwnnwnn",
  "9": "nnwwnnwnn",
  A: "wnnnnwnnw",
  B: "nnwnnwnnw",
  C: "wnwnnwnnn",
  D: "nnnnwwnnw",
  E: "wnnnwwnnn",
  F: "nnwnwwnnn",
  G: "nnnnnwwnw",
  H: "wnnnnwwnn",
  I: "nnwnnwwnn",
  J: "nnnnwwwnn",
  K: "wnnnnnnww",
  L: "nnwnnnnww",
  M: "wnwnnnnwn",
  N: "nnnnwnnww",
  O: "wnnnwnnwn",
  P: "nnwnwnnwn",
  Q: "nnnnnnwww",
  R: "wnnnnnwwn",
  S: "nnwnnnwwn",
  T: "nnnnwnwwn",
  U: "wwnnnnnnw",
  V: "nwwnnnnnw",
  W: "wwwnnnnnn",
  X: "nwnnwnnnw",
  Y: "wwnnwnnnn",
  Z: "nwwnwnnnn",
  "-": "nwnnnnwnw",
  ".": "wwnnnnwnn",
  " ": "nwwnnnwnn",
  "$": "nwnwnwnnn",
  "/": "nwnwnnnwn",
  "+": "nwnnnwnwn",
  "%": "nnnwnwnwn",
  "*": "nwnnwnwnn",
}

function buildCode39Bars(value: string, x: number, y: number, height: number) {
  const text = `*${value.toUpperCase()}*`
  const commands: string[] = ["0.07 0.09 0.13 rg"]
  let cursor = x
  const narrow = 1.35
  const wide = 3.4

  for (const char of text) {
    const pattern = code39Patterns[char] || code39Patterns["-"]
    for (let index = 0; index < pattern.length; index += 1) {
      const width = pattern[index] === "w" ? wide : narrow
      const isBar = index % 2 === 0
      if (isBar) {
        commands.push(`${cursor} ${y} ${width} ${height} re`)
        commands.push("f")
      }
      cursor += width
    }
    cursor += narrow
  }

  return commands.join("\n")
}

function buildQrBlocks(value: string, x: number, y: number, size: number) {
  const qr = QRCode.create(value, { errorCorrectionLevel: "M" })
  const commands: string[] = ["0.07 0.09 0.13 rg"]
  const moduleSize = size / qr.modules.size

  for (let row = 0; row < qr.modules.size; row += 1) {
    for (let column = 0; column < qr.modules.size; column += 1) {
      if (!qr.modules.get(row, column)) continue
      const rectX = x + column * moduleSize
      const rectY = y + (qr.modules.size - row - 1) * moduleSize
      commands.push(`${rectX.toFixed(2)} ${rectY.toFixed(2)} ${moduleSize.toFixed(2)} ${moduleSize.toFixed(2)} re`)
      commands.push("f")
    }
  }

  return commands.join("\n")
}

function buildInvoiceStream(payload: InvoicePdfPayload) {
  const issuedAt = payload.issuedAt || new Date()
  const sections: string[] = []

  sections.push(pdfFilledRect(0, 0, 595, 842, [1, 1, 1]))
  sections.push(pdfFilledRect(0, 746, 595, 96, [0.49, 0.18, 0.07]))
  sections.push(pdfFilledRect(392, 760, 155, 56, [0.98, 0.64, 0.34]))

  sections.push(pdfText(52, 790, "RED FENG", { font: "F2", size: 26, color: [1, 1, 1] }))
  sections.push(pdfText(52, 768, "Travel Payment Invoice", { font: "F1", size: 12, color: [0.98, 0.94, 0.9] }))
  sections.push(pdfText(410, 794, "INVOICE", { font: "F2", size: 18, color: [0.49, 0.18, 0.07] }))
  sections.push(pdfText(410, 790, payload.invoiceNumber, { font: "F2", size: 11, color: [0.49, 0.18, 0.07] }))
  sections.push(pdfText(410, 772, `Booking ID ${payload.bookingCode}`, { font: "F1", size: 10, color: [0.49, 0.18, 0.07] }))

  sections.push(pdfText(52, 712, "Issued To", { font: "F2", size: 11, color: [0.76, 0.34, 0.1] }))
  sections.push(pdfText(52, 688, payload.customerName || "Customer", { font: "F2", size: 18 }))
  sections.push(pdfText(52, 666, `Booking Code: ${payload.bookingCode}`, { size: 11, color: [0.35, 0.38, 0.44] }))
  sections.push(pdfText(52, 648, `Invoice Date: ${formatDate(issuedAt)}`, { size: 11, color: [0.35, 0.38, 0.44] }))
  sections.push(pdfText(52, 630, `Package: ${payload.packageTitle || "-"}`, { size: 11, color: [0.35, 0.38, 0.44] }))
  sections.push(pdfText(52, 612, `Pickup Date: ${payload.pickupDateLabel || "-"}`, { size: 11, color: [0.35, 0.38, 0.44] }))
  sections.push(pdfText(52, 594, `Merchant: ${payload.merchantName || "-"}`, { size: 11, color: [0.35, 0.38, 0.44] }))

  sections.push(pdfText(332, 712, "Payment Details", { font: "F2", size: 11, color: [0.76, 0.34, 0.1] }))
  sections.push(pdfText(332, 688, `Status: ${payload.paymentStatusLabel}`, { font: "F2", size: 13 }))
  sections.push(pdfText(332, 666, `Type: ${payload.paymentTypeLabel}`, { size: 11, color: [0.35, 0.38, 0.44] }))
  sections.push(pdfText(332, 648, "All customer funds are held by Red Feng until release rules are completed.", { size: 10, color: [0.35, 0.38, 0.44] }))
  sections.push(pdfText(332, 630, `Verify URL: ${payload.verificationUrl || "https://app.redfeng.co/verifikasi-invoice/"}`, { size: 9, color: [0.35, 0.38, 0.44] }))

  sections.push(pdfFilledRect(52, 560, 491, 42, [0.99, 0.97, 0.94], [0.92, 0.86, 0.8]))
  sections.push(pdfText(68, 577, "Description", { font: "F2", size: 10, color: [0.36, 0.28, 0.2] }))
  sections.push(pdfText(500, 577, "Amount", { font: "F2", size: 10, color: [0.36, 0.28, 0.2] }))

  const rows = [
    { label: "Package subtotal", amount: payload.subtotalAmount },
    { label: "Customer admin fee", amount: payload.adminFeeAmount },
    { label: "Customer tax", amount: payload.taxAmount },
  ]

  let rowTop = 560
  for (const row of rows) {
    rowTop -= 44
    sections.push(pdfLine(52, rowTop, 543, rowTop))
    sections.push(pdfText(68, rowTop + 16, row.label, { size: 11, color: [0.18, 0.2, 0.24] }))
    sections.push(pdfText(455, rowTop + 16, formatMoney(row.amount), { font: "F2", size: 11, color: [0.18, 0.2, 0.24] }))
  }

  sections.push(pdfFilledRect(332, 372, 211, 92, [1, 0.98, 0.95], [0.94, 0.84, 0.74]))
  sections.push(pdfText(350, 436, "TOTAL PAYMENT", { font: "F2", size: 10, color: [0.76, 0.34, 0.1] }))
  sections.push(pdfText(350, 402, formatMoney(payload.totalAmount), { font: "F2", size: 24, color: [0.07, 0.09, 0.13] }))
  sections.push(pdfText(350, 382, "Captured and verified by Red Feng", { size: 10, color: [0.35, 0.38, 0.44] }))

  sections.push(pdfText(52, 330, "Verification Barcode", { font: "F2", size: 11, color: [0.76, 0.34, 0.1] }))
  sections.push(pdfFilledRect(52, 200, 225, 110, [1, 1, 1], [0.92, 0.86, 0.8]))
  sections.push(buildCode39Bars(payload.bookingCode, 68, 228, 54))
  sections.push(pdfText(104, 210, payload.bookingCode, { font: "F2", size: 13, color: [0.07, 0.09, 0.13] }))
  sections.push(pdfText(68, 194, "Use this Booking ID on the verification page.", { size: 9, color: [0.35, 0.38, 0.44] }))

  const qrValue = payload.verificationUrl || `https://app.redfeng.co/verifikasi-invoice/?booking_id=${encodeURIComponent(payload.bookingCode)}`
  sections.push(pdfText(52, 174, "Verification QR", { font: "F2", size: 11, color: [0.76, 0.34, 0.1] }))
  sections.push(pdfFilledRect(52, 48, 118, 118, [1, 1, 1], [0.92, 0.86, 0.8]))
  sections.push(buildQrBlocks(qrValue, 63, 59, 96))
  sections.push(pdfText(184, 126, "Scan to open", { font: "F2", size: 10, color: [0.18, 0.2, 0.24] }))
  sections.push(pdfText(184, 110, "the booking", { size: 9, color: [0.35, 0.38, 0.44] }))
  sections.push(pdfText(184, 96, "verification page.", { size: 9, color: [0.35, 0.38, 0.44] }))

  sections.push(pdfText(312, 330, "Syarat dan Ketentuan", { font: "F2", size: 11, color: [0.76, 0.34, 0.1] }))
  sections.push(pdfText(312, 310, "Ketentuan Pembayaran", { font: "F2", size: 8, color: [0.18, 0.2, 0.24] }))
  sections.push(pdfText(312, 298, "1. Invoice ini merupakan bukti pembayaran resmi customer kepada Red Feng.", { size: 7.5, color: [0.35, 0.38, 0.44] }))
  sections.push(pdfText(312, 286, "2. Dana customer, baik DP, pelunasan, maupun full payment, ditahan lebih", { size: 7.5, color: [0.35, 0.38, 0.44] }))
  sections.push(pdfText(324, 276, "dahulu di rekening Red Feng sesuai skema escrow operasional.", { size: 7.5, color: [0.35, 0.38, 0.44] }))
  sections.push(pdfText(312, 262, "3. Biaya admin payment gateway dan pajak dikenakan kepada customer", { size: 7.5, color: [0.35, 0.38, 0.44] }))
  sections.push(pdfText(324, 252, "berdasarkan perhitungan aktif pada saat transaksi dibuat.", { size: 7.5, color: [0.35, 0.38, 0.44] }))

  sections.push(pdfText(312, 236, "Ketentuan Perjalanan", { font: "F2", size: 8, color: [0.18, 0.2, 0.24] }))
  sections.push(pdfText(312, 224, "4. Merchant payout diproses terpisah setelah status Arrived, Picked up,", { size: 7.5, color: [0.35, 0.38, 0.44] }))
  sections.push(pdfText(324, 214, "Go, dan handoff admin ke finance tervalidasi penuh di sistem.", { size: 7.5, color: [0.35, 0.38, 0.44] }))
  sections.push(pdfText(312, 200, "5. Biaya transfer dari rekening Red Feng ke rekening merchant menjadi", { size: 7.5, color: [0.35, 0.38, 0.44] }))
  sections.push(pdfText(324, 190, "beban merchant sesuai biaya admin bank tujuan.", { size: 7.5, color: [0.35, 0.38, 0.44] }))

  sections.push(pdfText(312, 174, "Refund, Reschedule, dan Verifikasi", { font: "F2", size: 8, color: [0.18, 0.2, 0.24] }))
  sections.push(pdfText(312, 162, "6. Refund, reschedule, force majeure, dan komplain layanan mengikuti", { size: 7.5, color: [0.35, 0.38, 0.44] }))
  sections.push(pdfText(324, 152, "kebijakan operasional Red Feng yang berlaku pada kanal resmi.", { size: 7.5, color: [0.35, 0.38, 0.44] }))
  sections.push(pdfText(312, 138, "7. Booking ID pada invoice ini dapat diverifikasi melalui halaman verifikasi", { size: 7.5, color: [0.35, 0.38, 0.44] }))
  sections.push(pdfText(324, 128, "invoice Red Feng untuk memastikan kecocokan data booking dan paket.", { size: 7.5, color: [0.35, 0.38, 0.44] }))

  sections.push(pdfLine(52, 40, 543, 40, 1, [0.92, 0.86, 0.8]))
  sections.push(pdfText(184, 20, "Red Feng", { font: "F2", size: 12, color: [0.18, 0.2, 0.24] }))
  sections.push(pdfText(255, 20, payload.verificationUrl || "https://app.redfeng.co/verifikasi-invoice/", { size: 8, color: [0.35, 0.38, 0.44] }))
  sections.push(pdfText(470, 20, "Generated", { size: 8, color: [0.35, 0.38, 0.44] }))

  return sections.join("\n")
}

export function createInvoicePdf(payload: InvoicePdfPayload) {
  const stream = buildInvoiceStream(payload)
  const objects = [
    "1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj",
    "2 0 obj << /Type /Pages /Count 1 /Kids [3 0 R] >> endobj",
    "3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> >> endobj",
    `4 0 obj << /Length ${Buffer.byteLength(stream, "utf8")} >> stream\n${stream}\nendstream endobj`,
    "5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj",
    "6 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >> endobj",
  ]

  let pdf = "%PDF-1.4\n"
  const offsets: number[] = [0]

  for (const object of objects) {
    offsets.push(Buffer.byteLength(pdf, "utf8"))
    pdf += `${object}\n`
  }

  const xrefOffset = Buffer.byteLength(pdf, "utf8")
  pdf += `xref\n0 ${objects.length + 1}\n`
  pdf += "0000000000 65535 f \n"

  for (let index = 1; index < offsets.length; index += 1) {
    pdf += `${String(offsets[index]).padStart(10, "0")} 00000 n \n`
  }

  pdf += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`
  return Buffer.from(pdf, "utf8")
}
