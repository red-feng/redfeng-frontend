import fs from "node:fs"
import path from "node:path"
import zlib from "node:zlib"
import QRCode from "qrcode"
import { normalizeLocale, type Locale } from "@/lib/i18n"

type InvoicePdfPayload = {
  invoiceNumber: string
  bookingCode: string
  customerName: string | null
  locale?: string | null
  packageTitle?: string | null
  pickupDateLabel?: string | null
  merchantName?: string | null
  merchantCode?: string | null
  verificationUrl?: string | null
  paymentStatusLabel: string
  paymentTypeLabel: string
  subtotalAmount: number
  adminFeeAmount: number
  taxAmount: number
  totalAmount: number
  issuedAt?: Date
}

const invoiceCopy: Record<
  Locale,
  {
    subtitle: string
    invoiceLabel: string
    bookingIdLabel: string
    issuedTo: string
    customerFallback: string
    bookingCode: string
    invoiceDate: string
    packageLabel: string
    pickupDate: string
    merchantLabel: string
    merchantCode: string
    paymentDetails: string
    status: string
    type: string
    escrowNoticeLine1: string
    escrowNoticeLine2: string
    verifyUrl: string
    description: string
    amount: string
    packageSubtotal: string
    customerAdminFee: string
    customerTax: string
    totalPayment: string
    verifiedBy: string
    verificationBarcode: string
    verificationBarcodeNote: string
    verificationQr: string
    qrLine1: string
    qrLine2: string
    qrLine3: string
    termsTitle: string
    paymentTerms: string
    paymentTerm1: string
    paymentTerm2: string
    paymentTerm2b: string
    paymentTerm3: string
    paymentTerm3b: string
    travelTerms: string
    travelTerm4: string
    travelTerm4b: string
    travelTerm5: string
    travelTerm5b: string
    refundTerms: string
    refundTerm6: string
    refundTerm6b: string
    refundTerm7: string
    refundTerm7b: string
    generated: string
    supportLabel: string
    supportValue: string
    pageLabel: string
  }
> = {
  id: {
    subtitle: "Invoice Pembayaran Perjalanan",
    invoiceLabel: "INVOICE",
    bookingIdLabel: "Booking ID",
    issuedTo: "Ditagihkan Kepada",
    customerFallback: "Customer",
    bookingCode: "Kode Booking",
    invoiceDate: "Tanggal Invoice",
    packageLabel: "Paket",
    pickupDate: "Tanggal Wisata",
    merchantLabel: "Merchant",
    merchantCode: "Kode Merchant",
    paymentDetails: "Detail Pembayaran",
    status: "Status",
    type: "Jenis",
    escrowNoticeLine1: "Seluruh dana customer ditahan sementara oleh Red Feng",
    escrowNoticeLine2: "hingga aturan pelepasan dana selesai dipenuhi.",
    verifyUrl: "URL Verifikasi",
    description: "Deskripsi",
    amount: "Nominal",
    packageSubtotal: "Subtotal paket",
    customerAdminFee: "Biaya admin customer",
    customerTax: "Pajak customer",
    totalPayment: "TOTAL PEMBAYARAN",
    verifiedBy: "Tercatat dan diverifikasi oleh Red Feng",
    verificationBarcode: "Barcode Verifikasi",
    verificationBarcodeNote: "Gunakan Booking ID ini pada halaman verifikasi.",
    verificationQr: "QR Verifikasi",
    qrLine1: "Pindai untuk membuka",
    qrLine2: "halaman verifikasi",
    qrLine3: "booking.",
    termsTitle: "Syarat dan Ketentuan",
    paymentTerms: "Ketentuan Pembayaran",
    paymentTerm1: "1. Invoice ini merupakan bukti pembayaran resmi customer kepada Red Feng.",
    paymentTerm2: "2. Dana customer, baik DP, pelunasan, maupun full payment, ditahan lebih",
    paymentTerm2b: "dahulu di rekening Red Feng sesuai skema escrow operasional.",
    paymentTerm3: "3. Biaya admin payment gateway dan pajak dikenakan kepada customer",
    paymentTerm3b: "berdasarkan perhitungan aktif pada saat transaksi dibuat.",
    travelTerms: "Ketentuan Perjalanan",
    travelTerm4: "4. Merchant payout diproses terpisah setelah status Arrived, Picked up,",
    travelTerm4b: "Go, dan handoff admin ke finance tervalidasi penuh di sistem.",
    travelTerm5: "5. Biaya transfer dari rekening Red Feng ke rekening merchant menjadi",
    travelTerm5b: "beban merchant sesuai biaya admin bank tujuan.",
    refundTerms: "Refund, Reschedule, dan Verifikasi",
    refundTerm6: "6. Refund, reschedule, force majeure, dan komplain layanan mengikuti",
    refundTerm6b: "kebijakan operasional Red Feng yang berlaku pada kanal resmi.",
    refundTerm7: "7. Booking ID pada invoice ini dapat diverifikasi melalui halaman verifikasi",
    refundTerm7b: "invoice Red Feng untuk memastikan kecocokan data booking dan paket.",
    generated: "Dibuat",
    supportLabel: "Customer Support",
    supportValue: "hello@redfeng.co | app.redfeng.co/verifikasi-invoice",
    pageLabel: "Halaman",
  },
  en: {
    subtitle: "Travel Payment Invoice",
    invoiceLabel: "INVOICE",
    bookingIdLabel: "Booking ID",
    issuedTo: "Issued To",
    customerFallback: "Customer",
    bookingCode: "Booking Code",
    invoiceDate: "Invoice Date",
    packageLabel: "Package",
    pickupDate: "Travel Date",
    merchantLabel: "Merchant",
    merchantCode: "Merchant Code",
    paymentDetails: "Payment Details",
    status: "Status",
    type: "Type",
    escrowNoticeLine1: "All customer funds are temporarily held by Red Feng",
    escrowNoticeLine2: "until the release rules have been fully satisfied.",
    verifyUrl: "Verification URL",
    description: "Description",
    amount: "Amount",
    packageSubtotal: "Package subtotal",
    customerAdminFee: "Customer admin fee",
    customerTax: "Customer tax",
    totalPayment: "TOTAL PAYMENT",
    verifiedBy: "Captured and verified by Red Feng",
    verificationBarcode: "Verification Barcode",
    verificationBarcodeNote: "Use this Booking ID on the verification page.",
    verificationQr: "Verification QR",
    qrLine1: "Scan to open",
    qrLine2: "the booking",
    qrLine3: "verification page.",
    termsTitle: "Terms & Conditions",
    paymentTerms: "Payment Terms",
    paymentTerm1: "1. This invoice is the official proof of customer payment to Red Feng.",
    paymentTerm2: "2. Customer funds, including deposits, final settlements, and full payments,",
    paymentTerm2b: "are temporarily held in Red Feng accounts under the operational escrow flow.",
    paymentTerm3: "3. Payment gateway admin fees and taxes are charged to the customer",
    paymentTerm3b: "based on the active calculation at the time the transaction is created.",
    travelTerms: "Travel Terms",
    travelTerm4: "4. Merchant payout is processed separately after Arrived, Picked up,",
    travelTerm4b: "Go, and the admin-to-finance handoff have been fully validated in the system.",
    travelTerm5: "5. Transfer fees from Red Feng accounts to merchant bank accounts",
    travelTerm5b: "are borne by the merchant based on the destination bank admin charges.",
    refundTerms: "Refund, Reschedule, and Verification",
    refundTerm6: "6. Refunds, reschedules, force majeure, and service complaints follow",
    refundTerm6b: "the applicable Red Feng operational policies on official channels.",
    refundTerm7: "7. The Booking ID on this invoice can be verified through the Red Feng",
    refundTerm7b: "invoice verification page to confirm the booking and package details.",
    generated: "Generated",
    supportLabel: "Customer Support",
    supportValue: "hello@redfeng.co | app.redfeng.co/verifikasi-invoice",
    pageLabel: "Page",
  },
  zh: {
    subtitle: "旅行付款发票",
    invoiceLabel: "发票",
    bookingIdLabel: "预订编号",
    issuedTo: "开具给",
    customerFallback: "客户",
    bookingCode: "预订代码",
    invoiceDate: "发票日期",
    packageLabel: "套餐",
    pickupDate: "出行日期",
    merchantLabel: "商家",
    merchantCode: "商家代码",
    paymentDetails: "付款详情",
    status: "状态",
    type: "类型",
    escrowNoticeLine1: "客户资金将暂由 Red Feng 保管，",
    escrowNoticeLine2: "直到放款规则全部满足为止。",
    verifyUrl: "验证链接",
    description: "说明",
    amount: "金额",
    packageSubtotal: "套餐小计",
    customerAdminFee: "客户管理费",
    customerTax: "客户税费",
    totalPayment: "付款总额",
    verifiedBy: "由 Red Feng 记录并验证",
    verificationBarcode: "验证条码",
    verificationBarcodeNote: "请在验证页面使用此预订编号。",
    verificationQr: "验证二维码",
    qrLine1: "扫码打开",
    qrLine2: "预订验证",
    qrLine3: "页面。",
    termsTitle: "条款与条件",
    paymentTerms: "付款条款",
    paymentTerm1: "1. 本发票是客户向 Red Feng 支付款项的正式凭证。",
    paymentTerm2: "2. 客户资金，包括定金、尾款和全额付款，",
    paymentTerm2b: "将根据运营托管流程暂存于 Red Feng 账户中。",
    paymentTerm3: "3. 支付网关管理费和税费由客户承担，",
    paymentTerm3b: "并按交易创建时的有效计算规则执行。",
    travelTerms: "行程条款",
    travelTerm4: "4. 商家结算将单独处理，前提是 Arrived、Picked up、",
    travelTerm4b: "Go 以及 admin 到 finance 的交接均已在系统中完成验证。",
    travelTerm5: "5. 从 Red Feng 账户转账至商家账户所产生的费用，",
    travelTerm5b: "由商家承担，并按收款银行行政费用执行。",
    refundTerms: "退款、改期与验证",
    refundTerm6: "6. 退款、改期、不可抗力及服务投诉，",
    refundTerm6b: "均遵循 Red Feng 官方渠道现行运营政策。",
    refundTerm7: "7. 本发票中的预订编号可通过 Red Feng 发票验证页面核验，",
    refundTerm7b: "以确认预订与套餐资料是否一致。",
    generated: "生成于",
    supportLabel: "客户支持",
    supportValue: "hello@redfeng.co | app.redfeng.co/verifikasi-invoice",
    pageLabel: "第",
  },
}

function escapePdfText(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)")
}

function encodePdfHexText(value: string) {
  const utf16be = Buffer.from(value, "utf16le").swap16()
  return utf16be.toString("hex").toUpperCase()
}

function hasNonAscii(value: string) {
  return /[^\u0000-\u007F]/.test(value)
}

function formatMoney(value: number, locale: Locale) {
  const localeCode = locale === "en" ? "en-US" : locale === "zh" ? "zh-CN" : "id-ID"
  return `Rp ${Number(value || 0).toLocaleString(localeCode)}`
}

function formatDate(value: Date, locale: Locale) {
  const localeCode = locale === "en" ? "en-US" : locale === "zh" ? "zh-CN" : "id-ID"
  return value.toLocaleDateString(localeCode, {
    day: "2-digit",
    month: "long",
    year: "numeric",
  })
}

function wrapText(value: string, maxCharsPerLine: number) {
  const normalized = value.trim().replace(/\s+/g, " ")
  if (!normalized) return [""]

  const words = normalized.split(" ")
  const lines: string[] = []
  let current = ""

  for (const word of words) {
    if (word.length > maxCharsPerLine) {
      if (current) {
        lines.push(current)
        current = ""
      }

      for (let index = 0; index < word.length; index += maxCharsPerLine) {
        lines.push(word.slice(index, index + maxCharsPerLine))
      }
      continue
    }

    const next = current ? `${current} ${word}` : word
    if (next.length > maxCharsPerLine) {
      lines.push(current)
      current = word
    } else {
      current = next
    }
  }

  if (current) {
    lines.push(current)
  }

  return lines
}

function addLabelValueLines(
  sections: string[],
  options: {
    x: number
    y: number
    labelWidth: number
    lineHeight: number
    label: string
    value: string
    font: "F1" | "F2"
    labelFont?: "F1" | "F2"
    size?: number
    color?: [number, number, number]
    wrapAt: number
  },
) {
  const lines = wrapText(options.value || "-", options.wrapAt)
  sections.push(
    pdfText(options.x, options.y, `${options.label}:`, {
      font: options.labelFont || options.font,
      size: options.size || 11,
      color: options.color,
    }),
  )

  let currentY = options.y
  for (const line of lines) {
    sections.push(
      pdfText(options.x + options.labelWidth, currentY, line, {
        font: options.font,
        size: options.size || 11,
        color: options.color,
      }),
    )
    currentY -= options.lineHeight
  }

  return currentY
}

function pdfText(
  x: number,
  y: number,
  text: string,
  options?: {
    font?: "F1" | "F2" | "F3"
    size?: number
    color?: [number, number, number]
  },
) {
  let font = options?.font || "F1"
  if (font !== "F3" && hasNonAscii(text)) {
    font = "F3"
  }
  const size = options?.size || 12
  const [r, g, b] = options?.color || [0.07, 0.09, 0.13]
  const payload = font === "F3" ? `<${encodePdfHexText(text)}>` : `(${escapePdfText(text)})`
  return [`${r} ${g} ${b} rg`, "BT", `/${font} ${size} Tf`, `1 0 0 1 ${x} ${y} Tm ${payload} Tj`, "ET"].join("\n")
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

function pdfRoundedSection(
  x: number,
  y: number,
  width: number,
  height: number,
  fill: [number, number, number],
  stroke: [number, number, number],
) {
  return pdfFilledRect(x, y, width, height, fill, stroke)
}

function pdfImage(x: number, y: number, width: number, height: number, imageName: string) {
  return ["q", `${width} 0 0 ${height} ${x} ${y} cm`, `/${imageName} Do`, "Q"].join("\n")
}

function paethPredictor(a: number, b: number, c: number) {
  const p = a + b - c
  const pa = Math.abs(p - a)
  const pb = Math.abs(p - b)
  const pc = Math.abs(p - c)
  if (pa <= pb && pa <= pc) return a
  if (pb <= pc) return b
  return c
}

function unfilterPngScanlines(data: Buffer, width: number, height: number, bytesPerPixel: number) {
  const stride = width * bytesPerPixel
  const rowLength = stride + 1
  const output = Buffer.alloc(height * stride)

  for (let row = 0; row < height; row += 1) {
    const rowStart = row * rowLength
    const filterType = data[rowStart]
    const inputOffset = rowStart + 1
    const outputOffset = row * stride

    for (let index = 0; index < stride; index += 1) {
      const raw = data[inputOffset + index]
      const left = index >= bytesPerPixel ? output[outputOffset + index - bytesPerPixel] : 0
      const up = row > 0 ? output[outputOffset - stride + index] : 0
      const upLeft = row > 0 && index >= bytesPerPixel ? output[outputOffset - stride + index - bytesPerPixel] : 0

      switch (filterType) {
        case 0:
          output[outputOffset + index] = raw
          break
        case 1:
          output[outputOffset + index] = (raw + left) & 0xff
          break
        case 2:
          output[outputOffset + index] = (raw + up) & 0xff
          break
        case 3:
          output[outputOffset + index] = (raw + Math.floor((left + up) / 2)) & 0xff
          break
        case 4:
          output[outputOffset + index] = (raw + paethPredictor(left, up, upLeft)) & 0xff
          break
        default:
          throw new Error(`Unsupported PNG filter type: ${filterType}`)
      }
    }
  }

  return output
}

function toPredictorStream(data: Buffer, width: number, height: number, channels: number) {
  const stride = width * channels
  const output = Buffer.alloc(height * (stride + 1))
  for (let row = 0; row < height; row += 1) {
    const sourceOffset = row * stride
    const targetOffset = row * (stride + 1)
    output[targetOffset] = 0
    data.copy(output, targetOffset + 1, sourceOffset, sourceOffset + stride)
  }
  return output
}

type PdfPngImage = {
  width: number
  height: number
  colorData: Buffer
  alphaData: Buffer
}

let cachedLogoImage: PdfPngImage | null = null

function loadLogoForPdf() {
  if (cachedLogoImage) return cachedLogoImage

  const logoPath = path.join(process.cwd(), "public", "logo-redfeng.png")
  const png = fs.readFileSync(logoPath)
  let offset = 8
  let width = 0
  let height = 0
  let bitDepth = 0
  let colorType = 0
  const idatChunks: Buffer[] = []

  while (offset < png.length) {
    const length = png.readUInt32BE(offset)
    offset += 4
    const type = png.slice(offset, offset + 4).toString("ascii")
    offset += 4
    const chunk = png.slice(offset, offset + length)
    offset += length + 4

    if (type === "IHDR") {
      width = chunk.readUInt32BE(0)
      height = chunk.readUInt32BE(4)
      bitDepth = chunk[8]
      colorType = chunk[9]
    } else if (type === "IDAT") {
      idatChunks.push(chunk)
    } else if (type === "IEND") {
      break
    }
  }

  if (bitDepth !== 8 || colorType !== 6) {
    throw new Error("Unsupported logo PNG format. Expected 8-bit RGBA PNG.")
  }

  const inflated = zlib.inflateSync(Buffer.concat(idatChunks))
  const rgba = unfilterPngScanlines(inflated, width, height, 4)
  const rgb = Buffer.alloc(width * height * 3)
  const alpha = Buffer.alloc(width * height)

  for (let index = 0, rgbOffset = 0, alphaOffset = 0; index < rgba.length; index += 4) {
    rgb[rgbOffset] = rgba[index]
    rgb[rgbOffset + 1] = rgba[index + 1]
    rgb[rgbOffset + 2] = rgba[index + 2]
    alpha[alphaOffset] = rgba[index + 3]
    rgbOffset += 3
    alphaOffset += 1
  }

  cachedLogoImage = {
    width,
    height,
    colorData: zlib.deflateSync(toPredictorStream(rgb, width, height, 3)),
    alphaData: zlib.deflateSync(toPredictorStream(alpha, width, height, 1)),
  }

  return cachedLogoImage
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

function buildInvoiceStreams(payload: InvoicePdfPayload) {
  const issuedAt = payload.issuedAt || new Date()
  const locale = normalizeLocale(payload.locale)
  const t = invoiceCopy[locale]
  const textFont = "F1" as const
  const headingFont = "F2" as const
  const pageOne: string[] = []
  const pageTwo: string[] = []

  pageOne.push(pdfFilledRect(0, 0, 595, 842, [0.99, 0.98, 0.97]))
  pageOne.push(pdfFilledRect(0, 734, 595, 108, [0.49, 0.18, 0.07]))
  pageOne.push(pdfFilledRect(392, 756, 155, 60, [0.98, 0.64, 0.34]))
  pageOne.push(pdfRoundedSection(34, 506, 527, 210, [1, 1, 1], [0.94, 0.9, 0.84]))
  pageOne.push(pdfRoundedSection(34, 222, 527, 262, [1, 1, 1], [0.94, 0.9, 0.84]))
  pageOne.push(pdfRoundedSection(34, 40, 258, 164, [1, 1, 1], [0.94, 0.9, 0.84]))
  pageOne.push(pdfRoundedSection(303, 40, 258, 164, [1, 1, 1], [0.94, 0.9, 0.84]))

  pageOne.push(pdfImage(50, 752, 58, 44, "Im1"))
  pageOne.push(pdfText(118, 790, "RED FENG", { font: "F2", size: 28, color: [1, 1, 1] }))
  pageOne.push(pdfText(118, 766, t.subtitle, { font: textFont, size: 13, color: [0.98, 0.94, 0.9] }))
  pageOne.push(pdfText(410, 794, t.invoiceLabel, { font: headingFont, size: 19, color: [0.49, 0.18, 0.07] }))
  pageOne.push(pdfText(410, 788, payload.invoiceNumber, { font: headingFont, size: 11.5, color: [0.49, 0.18, 0.07] }))
  pageOne.push(pdfText(410, 770, `${t.bookingIdLabel} ${payload.bookingCode}`, { font: textFont, size: 10.5, color: [0.49, 0.18, 0.07] }))

  pageOne.push(pdfText(56, 694, t.issuedTo, { font: headingFont, size: 12, color: [0.76, 0.34, 0.1] }))
  pageOne.push(pdfText(56, 668, payload.customerName || t.customerFallback, { font: headingFont, size: 18 }))
  let leftInfoY = 642
  leftInfoY = addLabelValueLines(pageOne, {
    x: 56,
    y: leftInfoY,
    labelWidth: 84,
    lineHeight: 14,
    label: t.bookingCode,
    value: payload.bookingCode,
    font: textFont,
    labelFont: headingFont,
    size: 10.5,
    color: [0.35, 0.38, 0.44],
    wrapAt: 30,
  }) - 6
  leftInfoY = addLabelValueLines(pageOne, {
    x: 52,
    y: leftInfoY,
    labelWidth: 84,
    lineHeight: 14,
    label: t.invoiceDate,
    value: formatDate(issuedAt, locale),
    font: textFont,
    labelFont: headingFont,
    size: 10.5,
    color: [0.35, 0.38, 0.44],
    wrapAt: 26,
  }) - 6
  leftInfoY = addLabelValueLines(pageOne, {
    x: 52,
    y: leftInfoY,
    labelWidth: 84,
    lineHeight: 14,
    label: t.packageLabel,
    value: payload.packageTitle || "-",
    font: textFont,
    labelFont: headingFont,
    size: 10.5,
    color: [0.35, 0.38, 0.44],
    wrapAt: locale === "zh" ? 18 : 30,
  }) - 6
  leftInfoY = addLabelValueLines(pageOne, {
    x: 52,
    y: leftInfoY,
    labelWidth: 84,
    lineHeight: 14,
    label: t.pickupDate,
    value: payload.pickupDateLabel || "-",
    font: textFont,
    labelFont: headingFont,
    size: 10.5,
    color: [0.35, 0.38, 0.44],
    wrapAt: 24,
  }) - 6
  leftInfoY = addLabelValueLines(pageOne, {
    x: 52,
    y: leftInfoY,
    labelWidth: 84,
    lineHeight: 14,
    label: t.merchantLabel,
    value: payload.merchantName || "-",
    font: textFont,
    labelFont: headingFont,
    size: 10.5,
    color: [0.35, 0.38, 0.44],
    wrapAt: locale === "zh" ? 18 : 30,
  }) - 6
  addLabelValueLines(pageOne, {
    x: 52,
    y: leftInfoY,
    labelWidth: 84,
    lineHeight: 14,
    label: t.merchantCode,
    value: payload.merchantCode || "-",
    font: textFont,
    labelFont: headingFont,
    size: 10.5,
    color: [0.35, 0.38, 0.44],
    wrapAt: 20,
  })

  pageOne.push(pdfText(332, 694, t.paymentDetails, { font: headingFont, size: 12, color: [0.76, 0.34, 0.1] }))
  addLabelValueLines(pageOne, {
    x: 332,
    y: 642,
    labelWidth: 52,
    lineHeight: 14,
    label: t.status,
    value: payload.paymentStatusLabel,
    font: textFont,
    labelFont: headingFont,
    size: 10.5,
    color: [0.35, 0.38, 0.44],
    wrapAt: 18,
  })
  addLabelValueLines(pageOne, {
    x: 332,
    y: 620,
    labelWidth: 52,
    lineHeight: 14,
    label: t.type,
    value: payload.paymentTypeLabel,
    font: textFont,
    labelFont: headingFont,
    size: 10.5,
    color: [0.35, 0.38, 0.44],
    wrapAt: 18,
  })
  pageOne.push(pdfText(332, 596, t.escrowNoticeLine1, { font: textFont, size: 10.5, color: [0.35, 0.38, 0.44] }))
  pageOne.push(pdfText(332, 582, t.escrowNoticeLine2, { font: textFont, size: 10.5, color: [0.35, 0.38, 0.44] }))
  addLabelValueLines(pageOne, {
    x: 332,
    y: 562,
    labelWidth: 62,
    lineHeight: 11,
    label: t.verifyUrl,
    value: payload.verificationUrl || "https://app.redfeng.co/verifikasi-invoice/",
    font: textFont,
    labelFont: headingFont,
    size: 8.5,
    color: [0.35, 0.38, 0.44],
    wrapAt: locale === "zh" ? 20 : 28,
  })

  pageOne.push(pdfFilledRect(50, 432, 495, 44, [0.99, 0.97, 0.94], [0.92, 0.86, 0.8]))
  pageOne.push(pdfText(68, 459, t.description, { font: headingFont, size: 10.5, color: [0.36, 0.28, 0.2] }))
  pageOne.push(pdfText(498, 459, t.amount, { font: headingFont, size: 10.5, color: [0.36, 0.28, 0.2] }))

  const rows = [
    { label: t.packageSubtotal, amount: payload.subtotalAmount },
    { label: t.customerAdminFee, amount: payload.adminFeeAmount },
    { label: t.customerTax, amount: payload.taxAmount },
  ]

  let rowTop = 432
  for (const row of rows) {
    rowTop -= 46
    pageOne.push(pdfLine(50, rowTop, 545, rowTop))
    pageOne.push(pdfText(68, rowTop + 18, row.label, { font: textFont, size: 11.5, color: [0.18, 0.2, 0.24] }))
    pageOne.push(pdfText(448, rowTop + 18, formatMoney(row.amount, locale), { font: headingFont, size: 11.5, color: [0.18, 0.2, 0.24] }))
  }

  pageOne.push(pdfFilledRect(318, 268, 215, 118, [1, 0.98, 0.95], [0.94, 0.84, 0.74]))
  pageOne.push(pdfText(338, 364, t.totalPayment, { font: headingFont, size: 10.5, color: [0.76, 0.34, 0.1] }))
  pageOne.push(pdfText(338, 320, formatMoney(payload.totalAmount, locale), { font: headingFont, size: 24, color: [0.07, 0.09, 0.13] }))
  pageOne.push(pdfText(338, 298, t.verifiedBy, { font: textFont, size: 10, color: [0.35, 0.38, 0.44] }))

  pageOne.push(pdfText(54, 182, t.verificationBarcode, { font: headingFont, size: 11.5, color: [0.76, 0.34, 0.1] }))
  pageOne.push(pdfFilledRect(54, 86, 218, 74, [1, 1, 1], [0.92, 0.86, 0.8]))
  pageOne.push(buildCode39Bars(payload.bookingCode, 68, 100, 38))
  pageOne.push(pdfText(104, 88, payload.bookingCode, { font: "F2", size: 12.5, color: [0.07, 0.09, 0.13] }))
  pageOne.push(pdfText(68, 72, t.verificationBarcodeNote, { font: textFont, size: 8, color: [0.35, 0.38, 0.44] }))

  const qrValue = payload.verificationUrl || `https://app.redfeng.co/verifikasi-invoice/?booking_id=${encodeURIComponent(payload.bookingCode)}`
  pageOne.push(pdfText(320, 182, t.verificationQr, { font: headingFont, size: 11.5, color: [0.76, 0.34, 0.1] }))
  pageOne.push(pdfFilledRect(320, 80, 116, 116, [1, 1, 1], [0.92, 0.86, 0.8]))
  pageOne.push(buildQrBlocks(qrValue, 332, 92, 92))
  pageOne.push(pdfText(452, 146, t.qrLine1, { font: headingFont, size: 10.5, color: [0.18, 0.2, 0.24] }))
  pageOne.push(pdfText(452, 130, t.qrLine2, { font: textFont, size: 9.5, color: [0.35, 0.38, 0.44] }))
  pageOne.push(pdfText(452, 116, t.qrLine3, { font: textFont, size: 9.5, color: [0.35, 0.38, 0.44] }))
  pageOne.push(pdfLine(52, 40, 543, 40, 1, [0.92, 0.86, 0.8]))
  pageOne.push(pdfText(184, 20, "Red Feng", { font: "F2", size: 12, color: [0.18, 0.2, 0.24] }))
  pageOne.push(pdfText(255, 28, `${t.supportLabel}:`, { font: headingFont, size: 8.5, color: [0.35, 0.38, 0.44] }))
  pageOne.push(pdfText(255, 16, t.supportValue, { font: textFont, size: 7.8, color: [0.35, 0.38, 0.44] }))
  pageOne.push(pdfText(486, 20, `${t.pageLabel} 1/2`, { font: textFont, size: 8, color: [0.35, 0.38, 0.44] }))

  pageTwo.push(pdfFilledRect(0, 0, 595, 842, [0.99, 0.98, 0.97]))
  pageTwo.push(pdfFilledRect(0, 734, 595, 108, [0.49, 0.18, 0.07]))
  pageTwo.push(pdfRoundedSection(34, 58, 527, 646, [1, 1, 1], [0.94, 0.9, 0.84]))
  pageTwo.push(pdfImage(50, 752, 58, 44, "Im1"))
  pageTwo.push(pdfText(118, 790, "RED FENG", { font: "F2", size: 28, color: [1, 1, 1] }))
  pageTwo.push(pdfText(118, 766, t.termsTitle, { font: headingFont, size: 17, color: [0.98, 0.94, 0.9] }))
  pageTwo.push(pdfText(56, 684, `${t.bookingIdLabel}: ${payload.bookingCode}`, { font: textFont, size: 11.5, color: [0.35, 0.38, 0.44] }))
  pageTwo.push(pdfText(56, 638, t.paymentTerms, { font: headingFont, size: 12, color: [0.76, 0.34, 0.1] }))
  pageTwo.push(pdfText(56, 610, t.paymentTerm1, { font: textFont, size: 10.5, color: [0.18, 0.2, 0.24] }))
  pageTwo.push(pdfText(56, 588, t.paymentTerm2, { font: textFont, size: 10.5, color: [0.18, 0.2, 0.24] }))
  pageTwo.push(pdfText(74, 570, t.paymentTerm2b, { font: textFont, size: 10.5, color: [0.18, 0.2, 0.24] }))
  pageTwo.push(pdfText(56, 548, t.paymentTerm3, { font: textFont, size: 10.5, color: [0.18, 0.2, 0.24] }))
  pageTwo.push(pdfText(74, 530, t.paymentTerm3b, { font: textFont, size: 10.5, color: [0.18, 0.2, 0.24] }))
  pageTwo.push(pdfText(56, 484, t.travelTerms, { font: headingFont, size: 12, color: [0.76, 0.34, 0.1] }))
  pageTwo.push(pdfText(56, 456, t.travelTerm4, { font: textFont, size: 10.5, color: [0.18, 0.2, 0.24] }))
  pageTwo.push(pdfText(74, 438, t.travelTerm4b, { font: textFont, size: 10.5, color: [0.18, 0.2, 0.24] }))
  pageTwo.push(pdfText(56, 416, t.travelTerm5, { font: textFont, size: 10.5, color: [0.18, 0.2, 0.24] }))
  pageTwo.push(pdfText(74, 398, t.travelTerm5b, { font: textFont, size: 10.5, color: [0.18, 0.2, 0.24] }))
  pageTwo.push(pdfText(56, 352, t.refundTerms, { font: headingFont, size: 12, color: [0.76, 0.34, 0.1] }))
  pageTwo.push(pdfText(56, 324, t.refundTerm6, { font: textFont, size: 10.5, color: [0.18, 0.2, 0.24] }))
  pageTwo.push(pdfText(74, 306, t.refundTerm6b, { font: textFont, size: 10.5, color: [0.18, 0.2, 0.24] }))
  pageTwo.push(pdfText(56, 284, t.refundTerm7, { font: textFont, size: 10.5, color: [0.18, 0.2, 0.24] }))
  pageTwo.push(pdfText(74, 266, t.refundTerm7b, { font: textFont, size: 10.5, color: [0.18, 0.2, 0.24] }))
  pageTwo.push(pdfLine(52, 40, 543, 40, 1, [0.92, 0.86, 0.8]))
  pageTwo.push(pdfText(184, 20, "Red Feng", { font: "F2", size: 12, color: [0.18, 0.2, 0.24] }))
  pageTwo.push(pdfText(255, 28, `${t.supportLabel}:`, { font: headingFont, size: 8.5, color: [0.35, 0.38, 0.44] }))
  pageTwo.push(pdfText(255, 16, t.supportValue, { font: textFont, size: 7.8, color: [0.35, 0.38, 0.44] }))
  pageTwo.push(pdfText(486, 20, `${t.pageLabel} 2/2`, { font: textFont, size: 8, color: [0.35, 0.38, 0.44] }))

  return [pageOne.join("\n"), pageTwo.join("\n")]
}

export function createInvoicePdf(payload: InvoicePdfPayload) {
  const [streamOne, streamTwo] = buildInvoiceStreams(payload)
  const logo = loadLogoForPdf()
  const objects = [
    "1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj",
    "2 0 obj << /Type /Pages /Count 2 /Kids [3 0 R 4 0 R] >> endobj",
    "3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 5 0 R /Resources << /Font << /F1 7 0 R /F2 8 0 R /F3 9 0 R >> /XObject << /Im1 11 0 R >> >> >> endobj",
    "4 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 6 0 R /Resources << /Font << /F1 7 0 R /F2 8 0 R /F3 9 0 R >> /XObject << /Im1 11 0 R >> >> >> endobj",
    `5 0 obj << /Length ${Buffer.byteLength(streamOne, "binary")} >> stream\n${streamOne}\nendstream endobj`,
    `6 0 obj << /Length ${Buffer.byteLength(streamTwo, "binary")} >> stream\n${streamTwo}\nendstream endobj`,
    "7 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj",
    "8 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >> endobj",
    "9 0 obj << /Type /Font /Subtype /Type0 /BaseFont /STSong-Light /Encoding /UniGB-UCS2-H /DescendantFonts [10 0 R] >> endobj",
    "10 0 obj << /Type /Font /Subtype /CIDFontType0 /BaseFont /STSong-Light /CIDSystemInfo << /Registry (Adobe) /Ordering (GB1) /Supplement 4 >> /DW 1000 >> endobj",
    `11 0 obj << /Type /XObject /Subtype /Image /Width ${logo.width} /Height ${logo.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /FlateDecode /DecodeParms << /Predictor 15 /Colors 3 /BitsPerComponent 8 /Columns ${logo.width} >> /SMask 12 0 R /Length ${logo.colorData.length} >> stream\n${logo.colorData.toString("binary")}\nendstream endobj`,
    `12 0 obj << /Type /XObject /Subtype /Image /Width ${logo.width} /Height ${logo.height} /ColorSpace /DeviceGray /BitsPerComponent 8 /Filter /FlateDecode /DecodeParms << /Predictor 15 /Colors 1 /BitsPerComponent 8 /Columns ${logo.width} >> /Length ${logo.alphaData.length} >> stream\n${logo.alphaData.toString("binary")}\nendstream endobj`,
  ]

  let pdf = "%PDF-1.4\n"
  const offsets: number[] = [0]

  for (const object of objects) {
    offsets.push(Buffer.byteLength(pdf, "binary"))
    pdf += `${object}\n`
  }

  const xrefOffset = Buffer.byteLength(pdf, "binary")
  pdf += `xref\n0 ${objects.length + 1}\n`
  pdf += "0000000000 65535 f \n"

  for (let index = 1; index < offsets.length; index += 1) {
    pdf += `${String(offsets[index]).padStart(10, "0")} 00000 n \n`
  }

  pdf += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`
  return Buffer.from(pdf, "binary")
}
