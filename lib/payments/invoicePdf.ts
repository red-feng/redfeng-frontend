import fs from "node:fs"
import path from "node:path"
import chromium from "@sparticuz/chromium"
import puppeteer from "puppeteer-core"
import QRCode from "qrcode"
import { normalizeLocale, type Locale } from "@/lib/i18n"
import { buildAppUrl, getSiteHost } from "@/lib/site-config"

type InvoicePdfPayload = {
  invoiceNumber: string
  bookingCode: string
  customerName: string | null
  locale?: string | null
  currency?: string | null
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
  quantity?: number
  issuedAt?: Date
}

type InvoiceCopy = {
  invoice: string
  issuedTo: string
  paymentDetails: string
  bookingCode: string
  invoiceDate: string
  packageLabel: string
  travelDate: string
  merchantLabel: string
  merchantCode: string
  status: string
  type: string
  noLabel: string
  description: string
  qty: string
  nominal: string
  total: string
  subTotal: string
  adminFee: string
  tax: string
  totalPayment: string
  barcodeTitle: string
  barcodeNote: string
  qrNote1: string
  qrNote2: string
  support: string
  email: string
  website: string
  termsTitle: string
  refundTitle: string
  dpPayment: string
  finalPayment: string
  fullPayment: string
  dpPaid: string
  finalPaymentSettled: string
  fullyPaid: string
  terms: string[]
  refunds: string[]
}

const copy: Record<Locale, InvoiceCopy> = {
  id: {
    invoice: "INVOICE",
    issuedTo: "Ditagihkan Kepada",
    paymentDetails: "Detail Pembayaran",
    bookingCode: "Kode Booking",
    invoiceDate: "Tanggal Invoice",
    packageLabel: "Paket",
    travelDate: "Tanggal Wisata",
    merchantLabel: "Merchant",
    merchantCode: "Kode Merchant",
    status: "Status",
    type: "Jenis",
    noLabel: "NO",
    description: "DESKRIPSI",
    qty: "QTY",
    nominal: "NOMINAL",
    total: "TOTAL",
    subTotal: "Sub Total Paket",
    adminFee: "Biaya admin",
    tax: "Pajak",
    totalPayment: "Total Pembayaran",
    barcodeTitle: "Barcode Verifikasi",
    barcodeNote: "Gunakan Booking ID ini pada halaman verifikasi.",
    qrNote1: "Pindai untuk membuka",
    qrNote2: "halaman verifikasi booking.",
    support: "Customer Support",
    email: "Email",
    website: "Website",
    termsTitle: "Syarat dan Ketentuan",
    refundTitle: "Klausul Refund",
    dpPayment: "DP Payment",
    finalPayment: "Final Payment",
    fullPayment: "Full Payment",
    dpPaid: "DP Paid",
    finalPaymentSettled: "Final Payment Settled",
    fullyPaid: "Fully Paid",
    terms: [
      "1. Invoice ini merupakan bukti pembayaran resmi customer kepada Red Feng untuk transaksi sesuai Booking ID yang tercantum.",
      "2. Data booking, nominal pembayaran, detail paket, mata uang tampilan, dan snapshot kurs pada invoice ini mengikuti data yang tercatat di sistem Red Feng pada saat transaksi berhasil dibuat.",
      "3. Pembayaran dapat berupa DP, pelunasan, atau full payment sesuai metode yang dipilih saat checkout.",
      "4. Dana customer diterima dan dikelola terlebih dahulu oleh Red Feng sesuai mekanisme escrow dan proses operasional yang berlaku.",
      "5. Status pembayaran pada invoice ini berlaku pada saat invoice diterbitkan dan dapat berubah mengikuti pembaruan status transaksi di sistem.",
      "6. Biaya admin payment gateway, pajak, biaya layanan, atau komponen biaya lain yang tercantum pada invoice dibebankan kepada customer sesuai ketentuan yang berlaku saat transaksi dilakukan.",
      "7. Untuk booking dengan skema DP, customer wajib melakukan pelunasan sebelum batas waktu yang ditentukan. Keterlambatan pelunasan dapat menyebabkan booking dibatalkan sesuai kebijakan yang berlaku.",
      "8. Pengajuan refund dan pembatalan hanya dapat diproses sebelum melewati batas waktu H-3. Setelah melewati H-3, pembayaran tidak dapat direfund.",
      "9. Booking ID pada invoice ini dapat digunakan untuk verifikasi keaslian transaksi melalui kanal verifikasi resmi Red Feng.",
      "10. Jika terdapat perbedaan antara invoice dan data pada sistem Red Feng, maka data pada sistem Red Feng menjadi acuan utama.",
    ],
    refunds: [
      "1. Pengajuan refund hanya dapat diproses sebelum melewati batas waktu H-3 dari tanggal perjalanan.",
      "2. Setelah melewati batas waktu H-3, seluruh pembayaran yang telah diterima tidak dapat direfund.",
      "3. Untuk pengajuan refund yang dilakukan sebelum H-3, nilai refund dapat dipotong biaya admin, biaya payment gateway, pajak, biaya layanan, atau komponen non-refundable lainnya.",
      "4. Refund atas transaksi DP, pelunasan, atau full payment akan ditentukan berdasarkan status booking, waktu pengajuan, dan tahapan operasional yang telah berjalan.",
      "5. Pengajuan refund karena keterlambatan pelunasan, no-show, data peserta tidak valid, atau pelanggaran ketentuan booking dapat ditolak sesuai kebijakan Red Feng.",
      "6. Waktu pencairan refund mengikuti proses verifikasi internal, metode pembayaran, serta kebijakan payment gateway atau bank terkait.",
    ],
  },
  en: {
    invoice: "INVOICE",
    issuedTo: "Issued To",
    paymentDetails: "Payment Details",
    bookingCode: "Booking Code",
    invoiceDate: "Invoice Date",
    packageLabel: "Package",
    travelDate: "Travel Date",
    merchantLabel: "Merchant",
    merchantCode: "Merchant Code",
    status: "Status",
    type: "Type",
    noLabel: "NO",
    description: "DESCRIPTION",
    qty: "QTY",
    nominal: "AMOUNT",
    total: "TOTAL",
    subTotal: "Package Subtotal",
    adminFee: "Admin Fee",
    tax: "Tax",
    totalPayment: "Total Payment",
    barcodeTitle: "Verification Barcode",
    barcodeNote: "Use this Booking ID on the verification page.",
    qrNote1: "Scan to open",
    qrNote2: "the booking verification page.",
    support: "Customer Support",
    email: "Email",
    website: "Website",
    termsTitle: "Terms and Conditions",
    refundTitle: "Refund Clause",
    dpPayment: "DP Payment",
    finalPayment: "Final Payment",
    fullPayment: "Full Payment",
    dpPaid: "DP Paid",
    finalPaymentSettled: "Final Payment Settled",
    fullyPaid: "Fully Paid",
    terms: [
      "1. This invoice is official proof of customer payment to Red Feng for the transaction linked to the Booking ID shown here.",
      "2. Booking data, payment amount, package details, display currency, and exchange-rate snapshot on this invoice follow the records stored in the Red Feng system when the transaction is created.",
      "3. Payment may be made as a deposit, final settlement, or full payment based on the method selected at checkout.",
      "4. Customer funds are first received and managed by Red Feng in accordance with the applicable escrow and operational process.",
      "5. The payment status shown on this invoice is valid at the time of issuance and may change if the transaction status is updated in the system.",
      "6. Payment gateway fees, taxes, service fees, or other listed charges are borne by the customer based on the rules in effect when the transaction is made.",
      "7. For deposit bookings, the customer must complete the final payment before the stated deadline. Late final payment may cause the booking to be cancelled under the applicable policy.",
      "8. Refund and cancellation requests may only be processed before the H-3 deadline. After H-3, payments are non-refundable.",
      "9. The Booking ID on this invoice can be used to verify the authenticity of the transaction through Red Feng's official verification channel.",
      "10. If there is any difference between this invoice and Red Feng system data, the system data will prevail.",
    ],
    refunds: [
      "1. Refund requests can only be processed before the H-3 deadline from the travel date.",
      "2. After the H-3 deadline has passed, all received payments are non-refundable.",
      "3. For refund requests made before H-3, the approved refund may be reduced by admin fees, payment gateway fees, taxes, service fees, or other non-refundable components.",
      "4. Refunds for deposit, final payment, or full payment transactions will be determined based on booking status, request timing, and the operational stage already in progress.",
      "5. Refund requests due to late final payment, no-show, invalid participant data, or booking-policy violations may be rejected in accordance with Red Feng policy.",
      "6. Refund disbursement timing follows internal verification, payment method, and the relevant payment gateway or bank policy.",
    ],
  },
  zh: {
    invoice: "发票",
    issuedTo: "开具给",
    paymentDetails: "付款详情",
    bookingCode: "预订编号",
    invoiceDate: "发票日期",
    packageLabel: "套餐",
    travelDate: "出行日期",
    merchantLabel: "商家",
    merchantCode: "商家代码",
    status: "状态",
    type: "类型",
    noLabel: "序号",
    description: "说明",
    qty: "数量",
    nominal: "金额",
    total: "总计",
    subTotal: "套餐小计",
    adminFee: "管理费",
    tax: "税费",
    totalPayment: "付款总额",
    barcodeTitle: "验证条码",
    barcodeNote: "请在验证页面使用此预订编号。",
    qrNote1: "扫码打开",
    qrNote2: "预订验证页面。",
    support: "客户支持",
    email: "邮箱",
    website: "网站",
    termsTitle: "条款与条件",
    refundTitle: "退款条款",
    dpPayment: "定金付款",
    finalPayment: "尾款支付",
    fullPayment: "全额付款",
    dpPaid: "定金已支付",
    finalPaymentSettled: "尾款已结清",
    fullyPaid: "已全额付款",
    terms: [
      "1. 本发票是客户向 Red Feng 支付与本预订编号相关交易款项的正式凭证。",
      "2. 发票中的订单资料、付款金额、套餐详情、展示货币及汇率快照，以交易成功创建时 Red Feng 系统记录为准。",
      "3. 付款方式可为定金、尾款或全额付款，具体取决于结账时选择的方式。",
      "4. 客户资金将由 Red Feng 先行接收和管理，并遵循适用的托管及运营流程。",
      "5. 本发票所示付款状态仅代表开票时状态，后续可随系统交易更新而变化。",
      "6. 支付网关费用、税费、服务费或其他列示费用由客户承担，并以交易时适用规则为准。",
      "7. 对于定金订单，客户须在规定期限前完成尾款支付。逾期可能导致订单依政策被取消。",
      "8. 退款与取消申请仅可在出行日前 H-3 之前受理。超过 H-3 后款项不可退款。",
      "9. 本发票中的预订编号可通过 Red Feng 官方验证渠道核验交易真伪。",
      "10. 如本发票与 Red Feng 系统数据存在差异，以系统数据为准。",
    ],
    refunds: [
      "1. 退款申请仅可在出行日前 H-3 之前处理。",
      "2. 超过 H-3 截止时间后，已收取的全部款项均不可退款。",
      "3. 在 H-3 前提交的退款申请，批准金额仍可能扣除管理费、支付网关费用、税费、服务费或其他不可退还项目。",
      "4. 定金、尾款或全额付款的退款，将依据订单状态、申请时间及已进行的运营阶段决定。",
      "5. 因尾款逾期、未到场、参团资料无效或违反预订条款而提出的退款申请，可依 Red Feng 政策被拒绝。",
      "6. 退款到账时间取决于内部审核流程、付款方式以及相关支付网关或银行政策。",
    ],
  },
}

function wrapText(value: string, maxChars: number) {
  const normalized = String(value || "-").trim().replace(/\s+/g, " ")
  if (!normalized) return ["-"]
  const words = normalized.split(" ")
  const lines: string[] = []
  let current = ""
  for (const word of words) {
    const next = current ? `${current} ${word}` : word
    if (next.length > maxChars && current) {
      lines.push(current)
      current = word
    } else {
      current = next
    }
  }
  if (current) lines.push(current)
  return lines
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

function formatMoney(value: number, locale: Locale, currency?: string | null) {
  const localeCode = locale === "en" ? "en-US" : locale === "zh" ? "zh-CN" : "id-ID"
  const safeCurrency = String(currency || (locale === "en" ? "USD" : locale === "zh" ? "CNY" : "IDR")).trim().toUpperCase()
  try {
    return new Intl.NumberFormat(localeCode, {
      style: "currency",
      currency: safeCurrency,
      currencyDisplay: safeCurrency === "IDR" ? "code" : "symbol",
      maximumFractionDigits: 0,
    }).format(Number(value || 0))
  } catch {
    return `${safeCurrency} ${Number(value || 0).toLocaleString(localeCode)}`
  }
}

function formatDate(value: Date, locale: Locale) {
  const localeCode = locale === "en" ? "en-US" : locale === "zh" ? "zh-CN" : "id-ID"
  return value.toLocaleDateString(localeCode, { day: "numeric", month: "short", year: "numeric" })
}

function escapeHtml(value: string) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

function getLogoDataUrl() {
  const logoPath = path.join(process.cwd(), "public", "logo-redfeng.png")
  const file = fs.readFileSync(logoPath)
  return `data:image/png;base64,${file.toString("base64")}`
}

function buildCode39SvgDataUrl(value: string) {
  const text = `*${String(value || "").toUpperCase()}*`
  const narrow = 2
  const wide = 5
  const gap = narrow
  const height = 68
  let cursor = 12
  const bars: string[] = []

  for (const char of text) {
    const pattern = code39Patterns[char] || code39Patterns["-"]
    for (let index = 0; index < pattern.length; index += 1) {
      const width = pattern[index] === "w" ? wide : narrow
      if (index % 2 === 0) {
        bars.push(`<rect x="${cursor}" y="10" width="${width}" height="${height}" fill="#111827" />`)
      }
      cursor += width
    }
    cursor += gap
  }

  const svgWidth = cursor + 12
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${svgWidth}" height="92" viewBox="0 0 ${svgWidth} 92"><rect width="100%" height="100%" fill="white"/>${bars.join("")}</svg>`
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`
}

function buildTermsList(items: string[]) {
  return items.map((item) => `<li>${escapeHtml(item.replace(/^\d+\.\s*/, ""))}</li>`).join("")
}

function localizePaymentTypeLabel(value: string, t: InvoiceCopy) {
  if (value === "DP Payment" || value === t.dpPayment) return t.dpPayment
  if (value === "Final Payment" || value === t.finalPayment) return t.finalPayment
  if (value === "Full Payment" || value === t.fullPayment) return t.fullPayment
  return value
}

function localizePaymentStatusLabel(value: string, t: InvoiceCopy) {
  if (value === "DP Paid" || value === t.dpPaid) return t.dpPaid
  if (value === "Final Payment Settled" || value === t.finalPaymentSettled) return t.finalPaymentSettled
  if (value === "Fully Paid" || value === t.fullyPaid) return t.fullyPaid
  return value
}

async function renderInvoiceHtml(payload: InvoicePdfPayload) {
  const locale = normalizeLocale(payload.locale)
  const t = copy[locale]
  const paymentStatusLabel = localizePaymentStatusLabel(payload.paymentStatusLabel, t)
  const paymentTypeLabel = localizePaymentTypeLabel(payload.paymentTypeLabel, t)
  const displayCurrency = String(payload.currency || (locale === "en" ? "USD" : locale === "zh" ? "CNY" : "IDR")).trim().toUpperCase()
  const quantity = Math.max(1, Number(payload.quantity || 1))
  const nominalAmount = quantity > 0 ? Math.round(payload.subtotalAmount / quantity) : payload.subtotalAmount
  const verificationUrl =
    payload.verificationUrl || buildAppUrl(`/verifikasi-invoice/?booking_id=${encodeURIComponent(payload.bookingCode)}`)
  const barcodeUrl = buildCode39SvgDataUrl(payload.bookingCode)
  const qrUrl = await QRCode.toDataURL(verificationUrl, { width: 280, margin: 0, color: { dark: "#111827", light: "#ffffff" } })
  const logoUrl = getLogoDataUrl()
  const websiteHost = getSiteHost()
  const packageLines = wrapText(payload.packageTitle || "-", 28).slice(0, 2)
  const styles = `
    @page { size: A4; margin: 0; }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: 'Segoe UI', sans-serif; color: #111827; background: #ffffff; }
    body.locale-zh { font-family: 'Microsoft YaHei', 'PingFang SC', 'Noto Sans CJK SC', 'Hiragino Sans GB', 'Source Han Sans SC', Arial, sans-serif; }
    .page { width: 794px; min-height: 1123px; padding: 18px 8px 18px 8px; position: relative; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px; }
    .logo { width: 178px; display:block; }
    .invoice-box { width: 240px; background: #ffc766; border-radius: 12px; padding: 14px 18px 12px; text-align: center; }
    .invoice-box h1 { margin: 0 0 10px; font-size: 24px; font-weight: 700; }
    .invoice-box p { margin: 0 0 7px; font-size: 12.5px; }
    .invoice-box p:last-child { margin-bottom: 0; }
    .panel { border: 1.5px solid #ffc766; border-radius: 10px; background: #fff; }
    .detail-panel { padding: 20px 18px 18px; display: grid; grid-template-columns: 1.42fr 1fr; column-gap: 48px; margin-bottom: 12px; }
    .section-title { margin: 0 0 12px; font-size: 14px; font-weight: 700; }
    .customer-name { margin: 0 0 14px; font-size: 32px; font-weight: 800; }
    .rows { display: grid; row-gap: 7px; }
    .row { display: grid; grid-template-columns: 124px 14px 1fr; align-items: start; font-size: 13px; line-height: 1.28; }
    .label { font-weight: 700; }
    .colon { text-align: center; }
    .table-panel { padding: 12px 14px 16px; margin-bottom: 10px; }
    .table-head { background: #ffc766; border-radius: 0; padding: 5px 0; display: grid; grid-template-columns: 56px 1.7fr 88px 136px 136px; font-size: 12.5px; font-weight: 700; text-align: center; }
    .table-row { display: grid; grid-template-columns: 56px 1.7fr 88px 136px 136px; padding: 10px 0 5px; font-size: 13px; align-items: start; text-align: center; }
    .table-row .desc { text-align: left; padding-right: 10px; line-height: 1.35; }
    .rule { height: 1px; background: #d1d5db; margin: 10px 0 18px; }
    .totals { width: 306px; margin-left: auto; }
    .sum-row { display: grid; grid-template-columns: 1fr 128px; align-items: center; margin-bottom: 9px; background: #ffc766; height: 26px; padding: 0 12px; font-size: 12.5px; }
    .sum-row .label-text { text-align: right; padding-right: 12px; font-weight: 800; }
    .sum-row .amount { text-align: right; font-weight: 400; }
    .total-row { display: grid; grid-template-columns: 1fr 128px; align-items: center; padding: 5px 0 0; font-size: 15px; }
    .total-row .label { text-align: right; padding-right: 14px; font-weight: 800; }
    .total-row .amount { text-align: right; font-weight: 800; }
    .bottom { display: grid; grid-template-columns: 1fr 168px; column-gap: 8px; margin-bottom: 22px; }
    .barcode-panel { padding: 12px 12px 16px; }
    .barcode-title { margin: 0 0 12px; font-size: 13.5px; font-weight: 700; }
    .barcode-box { border: 1.5px solid #ffc766; border-radius: 10px; padding: 12px 12px 10px; text-align: center; }
    .barcode-box img { width: 100%; height: 82px; object-fit: fill; display: block; margin: 0 auto 8px; }
    .barcode-number { font-size: 15px; font-weight: 700; margin-bottom: 10px; }
    .barcode-note { text-align: center; font-size: 11px; color: #4b5563; font-style: italic; margin: 14px 0 0; }
    .qr-panel { padding: 12px 12px 16px; display: flex; flex-direction: column; align-items: center; justify-content: flex-start; }
    .qr-box { border: 1.5px solid #ffc766; border-radius: 0; padding: 8px; margin-bottom: 12px; background: #fff; }
    .qr-box img { width: 112px; height: 112px; display:block; }
    .qr-note { text-align: center; font-size: 11px; color: #4b5563; font-style: italic; line-height: 1.35; margin-top: auto; }
    .footer { font-size: 11px; line-height: 1.35; }
    .footer strong { display: block; margin-bottom: 4px; }
    .legal-page { width: 794px; min-height: 1123px; padding: 20px 22px 16px; page-break-before: always; position: relative; }
    .legal-title { text-align: center; margin: 46px 0 20px; font-size: 22px; font-weight: 700; }
    .legal-box { border: 1.5px solid #ffc766; border-radius: 10px; padding: 18px 20px 20px; }
    .legal-box ol { margin: 0; padding-left: 22px; }
    .legal-box li { margin: 0 0 10px; font-size: 14px; line-height: 1.48; }
    .legal-footer { position: absolute; left: 22px; bottom: 16px; font-size: 11.5px; line-height: 1.35; }
  `
  return `
    <!doctype html>
    <html lang="${locale}">
      <head>
        <meta charset="utf-8" />
        <style>${styles}</style>
      </head>
      <body class="locale-${locale}">
        <section class="page">
          <div class="header">
            <img class="logo" src="${logoUrl}" alt="Red Feng" />
            <div class="invoice-box">
              <h1>${escapeHtml(t.invoice)}</h1>
              <p>${escapeHtml(payload.invoiceNumber)}</p>
              <p>${escapeHtml(`${t.bookingCode} ${payload.bookingCode}`)}</p>
            </div>
          </div>

          <section class="panel detail-panel">
            <div>
              <h2 class="section-title">${escapeHtml(t.issuedTo)}</h2>
              <div class="customer-name">${escapeHtml(payload.customerName || "Customer")}</div>
              <div class="rows">
                <div class="row"><span class="label">${escapeHtml(t.bookingCode)}</span><span class="colon">:</span><span>${escapeHtml(payload.bookingCode)}</span></div>
                <div class="row"><span class="label">${escapeHtml(t.invoiceDate)}</span><span class="colon">:</span><span>${escapeHtml(formatDate(payload.issuedAt || new Date(), locale))}</span></div>
                <div class="row"><span class="label">${escapeHtml(t.packageLabel)}</span><span class="colon">:</span><span>${packageLines.map(escapeHtml).join("<br/>")}</span></div>
                <div class="row"><span class="label">${escapeHtml(t.travelDate)}</span><span class="colon">:</span><span>${escapeHtml(payload.pickupDateLabel || "-")}</span></div>
                <div class="row"><span class="label">${escapeHtml(t.merchantLabel)}</span><span class="colon">:</span><span>${escapeHtml(payload.merchantName || "-")}</span></div>
                <div class="row"><span class="label">${escapeHtml(t.merchantCode)}</span><span class="colon">:</span><span>${escapeHtml(payload.merchantCode || "-")}</span></div>
              </div>
            </div>
            <div>
              <h2 class="section-title">${escapeHtml(t.paymentDetails)}</h2>
              <div style="height:49px"></div>
              <div class="rows">
                <div class="row"><span class="label">${escapeHtml(t.status)}</span><span class="colon">:</span><span>${escapeHtml(paymentStatusLabel)}</span></div>
                <div class="row"><span class="label">${escapeHtml(t.type)}</span><span class="colon">:</span><span>${escapeHtml(paymentTypeLabel)}</span></div>
              </div>
            </div>
          </section>

          <section class="panel table-panel">
            <div class="table-head">
              <div>${escapeHtml(t.noLabel)}</div>
              <div style="text-align:left;padding-left:12px">${escapeHtml(t.description)}</div>
              <div>${escapeHtml(t.qty)}</div>
              <div>${escapeHtml(t.nominal)}</div>
              <div>${escapeHtml(t.total)}</div>
            </div>
            <div class="table-row">
              <div>1</div>
              <div class="desc">${packageLines.map(escapeHtml).join("<br/>")}</div>
              <div>${quantity}</div>
              <div>${escapeHtml(formatMoney(nominalAmount, locale, displayCurrency))}</div>
              <div>${escapeHtml(formatMoney(payload.subtotalAmount, locale, displayCurrency))}</div>
            </div>
            <div class="rule"></div>
            <div class="totals">
              <div class="sum-row"><div class="label-text">${escapeHtml(t.subTotal)} :</div><div class="amount">${escapeHtml(formatMoney(payload.subtotalAmount, locale, displayCurrency))}</div></div>
              <div class="sum-row"><div class="label-text">${escapeHtml(t.adminFee)} :</div><div class="amount">${escapeHtml(formatMoney(payload.adminFeeAmount, locale, displayCurrency))}</div></div>
              <div class="sum-row"><div class="label-text">${escapeHtml(t.tax)} :</div><div class="amount">${escapeHtml(formatMoney(payload.taxAmount, locale, displayCurrency))}</div></div>
              <div class="total-row"><div class="label">${escapeHtml(t.totalPayment)} :</div><div class="amount">${escapeHtml(formatMoney(payload.totalAmount, locale, displayCurrency))}</div></div>
            </div>
          </section>

          <section class="bottom">
            <div class="panel barcode-panel">
              <h3 class="barcode-title">${escapeHtml(t.barcodeTitle)}</h3>
              <div class="barcode-box">
                <img src="${barcodeUrl}" alt="Barcode" />
                <div class="barcode-number">${escapeHtml(payload.bookingCode)}</div>
              </div>
              <div class="barcode-note">${escapeHtml(t.barcodeNote)}</div>
            </div>
            <div class="panel qr-panel">
              <div class="qr-box"><img src="${qrUrl}" alt="QR verification" /></div>
              <div class="qr-note">${escapeHtml(t.qrNote1)}<br/>${escapeHtml(t.qrNote2)}</div>
            </div>
          </section>

          <footer class="footer">
            <strong>${escapeHtml(t.support)} :</strong>
            <div>${escapeHtml(t.email)} : hello@redfeng.co</div>
            <div>${escapeHtml(t.website)} : ${escapeHtml(websiteHost)}</div>
          </footer>
        </section>

        <section class="legal-page">
          <img class="logo" src="${logoUrl}" alt="Red Feng" />
          <h2 class="legal-title">${escapeHtml(t.termsTitle)}</h2>
          <div class="legal-box"><ol>${buildTermsList(t.terms)}</ol></div>
          <div class="legal-footer">
            <strong>${escapeHtml(t.support)} :</strong>
            <div>${escapeHtml(t.email)} : hello@redfeng.co</div>
            <div>${escapeHtml(t.website)} : ${escapeHtml(websiteHost)}</div>
          </div>
        </section>

        <section class="legal-page">
          <img class="logo" src="${logoUrl}" alt="Red Feng" />
          <h2 class="legal-title">${escapeHtml(t.refundTitle)}</h2>
          <div class="legal-box"><ol>${buildTermsList(t.refunds)}</ol></div>
          <div class="legal-footer">
            <strong>${escapeHtml(t.support)} :</strong>
            <div>${escapeHtml(t.email)} : hello@redfeng.co</div>
            <div>${escapeHtml(t.website)} : ${escapeHtml(websiteHost)}</div>
          </div>
        </section>
      </body>
    </html>
  `
}

async function resolveBrowserExecutablePath() {
  if (process.env.PUPPETEER_EXECUTABLE_PATH) return process.env.PUPPETEER_EXECUTABLE_PATH

  const candidates = [
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  ]

  const localBrowser = candidates.find((candidate) => fs.existsSync(candidate))
  if (localBrowser) return localBrowser

  try {
    const serverlessPath = await chromium.executablePath()
    if (serverlessPath && fs.existsSync(serverlessPath)) return serverlessPath
  } catch {}

  return null
}

export async function createInvoicePdf(payload: InvoicePdfPayload) {
  const executablePath = await resolveBrowserExecutablePath()
  if (!executablePath) {
    throw new Error("No browser executable found for invoice PDF rendering.")
  }

  const browser = await puppeteer.launch({
    executablePath,
    args: [...chromium.args, "--font-render-hinting=medium"],
    headless: true,
  })

  try {
    const page = await browser.newPage()
    await page.setViewport({ width: 794, height: 1123, deviceScaleFactor: 2 })
    await page.setContent(await renderInvoiceHtml(payload), { waitUntil: "networkidle0" })
    await page.emulateMediaType("screen")
    return Buffer.from(
      await page.pdf({
        format: "A4",
        printBackground: true,
        margin: { top: "0", right: "0", bottom: "0", left: "0" },
      }),
    )
  } finally {
    await browser.close()
  }
}

