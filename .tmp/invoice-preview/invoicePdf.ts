import fs from "node:fs"
import path from "node:path"
import chromium from "@sparticuz/chromium"
import puppeteer from "puppeteer-core"
import QRCode from "qrcode"
import { normalizeLocale, type Locale } from "./i18n.ts"

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
    terms: [
      "1. Invoice ini merupakan bukti pembayaran resmi customer kepada Red Feng untuk transaksi sesuai Booking ID yang tercantum.",
      "2. Data booking, nominal pembayaran, dan detail paket pada invoice ini mengikuti data yang tercatat di sistem Red Feng pada saat transaksi berhasil dibuat.",
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
    terms: [
      "1. This invoice is official proof of customer payment to Red Feng for the transaction linked to the Booking ID shown here.",
      "2. Booking data, payment amount, and package details on this invoice follow the records stored in the Red Feng system when the transaction is created.",
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
    invoice: "å‘ç¥¨",
    issuedTo: "å¼€å…·ç»™",
    paymentDetails: "ä»˜æ¬¾è¯¦æƒ…",
    bookingCode: "é¢„è®¢ç¼–å·",
    invoiceDate: "å‘ç¥¨æ—¥æœŸ",
    packageLabel: "å¥—é¤",
    travelDate: "å‡ºè¡Œæ—¥æœŸ",
    merchantLabel: "å•†å®¶",
    merchantCode: "å•†å®¶ä»£ç ",
    status: "çŠ¶æ€",
    type: "ç±»åž‹",
    noLabel: "åºå·",
    description: "è¯´æ˜Ž",
    qty: "æ•°é‡",
    nominal: "é‡‘é¢",
    total: "æ€»è®¡",
    subTotal: "å¥—é¤å°è®¡",
    adminFee: "ç®¡ç†è´¹",
    tax: "ç¨Žè´¹",
    totalPayment: "ä»˜æ¬¾æ€»é¢",
    barcodeTitle: "éªŒè¯æ¡ç ",
    barcodeNote: "è¯·åœ¨éªŒè¯é¡µé¢ä½¿ç”¨æ­¤é¢„è®¢ç¼–å·ã€‚",
    qrNote1: "æ‰«ç æ‰“å¼€",
    qrNote2: "é¢„è®¢éªŒè¯é¡µé¢ã€‚",
    support: "å®¢æˆ·æ”¯æŒ",
    email: "é‚®ç®±",
    website: "ç½‘ç«™",
    termsTitle: "æ¡æ¬¾ä¸Žæ¡ä»¶",
    refundTitle: "é€€æ¬¾æ¡æ¬¾",
    terms: [
      "1. æœ¬å‘ç¥¨æ˜¯å®¢æˆ·å‘ Red Feng æ”¯ä»˜ä¸Žæœ¬é¢„è®¢ç¼–å·ç›¸å…³äº¤æ˜“æ¬¾é¡¹çš„æ­£å¼å‡­è¯ã€‚",
      "2. å‘ç¥¨ä¸­çš„è®¢å•èµ„æ–™ã€ä»˜æ¬¾é‡‘é¢åŠå¥—é¤è¯¦æƒ…ï¼Œä»¥äº¤æ˜“æˆåŠŸåˆ›å»ºæ—¶ Red Feng ç³»ç»Ÿè®°å½•ä¸ºå‡†ã€‚",
      "3. ä»˜æ¬¾æ–¹å¼å¯ä¸ºå®šé‡‘ã€å°¾æ¬¾æˆ–å…¨é¢ä»˜æ¬¾ï¼Œå…·ä½“å–å†³äºŽç»“è´¦æ—¶é€‰æ‹©çš„æ–¹å¼ã€‚",
      "4. å®¢æˆ·èµ„é‡‘å°†ç”± Red Feng å…ˆè¡ŒæŽ¥æ”¶å’Œç®¡ç†ï¼Œå¹¶éµå¾ªé€‚ç”¨çš„æ‰˜ç®¡åŠè¿è¥æµç¨‹ã€‚",
      "5. æœ¬å‘ç¥¨æ‰€ç¤ºä»˜æ¬¾çŠ¶æ€ä»…ä»£è¡¨å¼€ç¥¨æ—¶çŠ¶æ€ï¼ŒåŽç»­å¯éšç³»ç»Ÿäº¤æ˜“æ›´æ–°è€Œå˜åŒ–ã€‚",
      "6. æ”¯ä»˜ç½‘å…³è´¹ç”¨ã€ç¨Žè´¹ã€æœåŠ¡è´¹æˆ–å…¶ä»–åˆ—ç¤ºè´¹ç”¨ç”±å®¢æˆ·æ‰¿æ‹…ï¼Œå¹¶ä»¥äº¤æ˜“æ—¶é€‚ç”¨è§„åˆ™ä¸ºå‡†ã€‚",
      "7. å¯¹äºŽå®šé‡‘è®¢å•ï¼Œå®¢æˆ·é¡»åœ¨è§„å®šæœŸé™å‰å®Œæˆå°¾æ¬¾æ”¯ä»˜ã€‚é€¾æœŸå¯èƒ½å¯¼è‡´è®¢å•ä¾æ”¿ç­–è¢«å–æ¶ˆã€‚",
      "8. é€€æ¬¾ä¸Žå–æ¶ˆç”³è¯·ä»…å¯åœ¨å‡ºè¡Œæ—¥å‰ H-3 ä¹‹å‰å—ç†ã€‚è¶…è¿‡ H-3 åŽæ¬¾é¡¹ä¸å¯é€€æ¬¾ã€‚",
      "9. æœ¬å‘ç¥¨ä¸­çš„é¢„è®¢ç¼–å·å¯é€šè¿‡ Red Feng å®˜æ–¹éªŒè¯æ¸ é“æ ¸éªŒäº¤æ˜“çœŸä¼ªã€‚",
      "10. å¦‚æœ¬å‘ç¥¨ä¸Ž Red Feng ç³»ç»Ÿæ•°æ®å­˜åœ¨å·®å¼‚ï¼Œä»¥ç³»ç»Ÿæ•°æ®ä¸ºå‡†ã€‚",
    ],
    refunds: [
      "1. é€€æ¬¾ç”³è¯·ä»…å¯åœ¨å‡ºè¡Œæ—¥å‰ H-3 ä¹‹å‰å¤„ç†ã€‚",
      "2. è¶…è¿‡ H-3 æˆªæ­¢æ—¶é—´åŽï¼Œå·²æ”¶å–çš„å…¨éƒ¨æ¬¾é¡¹å‡ä¸å¯é€€æ¬¾ã€‚",
      "3. åœ¨ H-3 å‰æäº¤çš„é€€æ¬¾ç”³è¯·ï¼Œæ‰¹å‡†é‡‘é¢ä»å¯èƒ½æ‰£é™¤ç®¡ç†è´¹ã€æ”¯ä»˜ç½‘å…³è´¹ç”¨ã€ç¨Žè´¹ã€æœåŠ¡è´¹æˆ–å…¶ä»–ä¸å¯é€€è¿˜é¡¹ç›®ã€‚",
      "4. å®šé‡‘ã€å°¾æ¬¾æˆ–å…¨é¢ä»˜æ¬¾çš„é€€æ¬¾ï¼Œå°†ä¾æ®è®¢å•çŠ¶æ€ã€ç”³è¯·æ—¶é—´åŠå·²è¿›è¡Œçš„è¿è¥é˜¶æ®µå†³å®šã€‚",
      "5. å› å°¾æ¬¾é€¾æœŸã€æœªåˆ°åœºã€å‚å›¢èµ„æ–™æ— æ•ˆæˆ–è¿åé¢„è®¢æ¡æ¬¾è€Œæå‡ºçš„é€€æ¬¾ç”³è¯·ï¼Œå¯ä¾ Red Feng æ”¿ç­–è¢«æ‹’ç»ã€‚",
      "6. é€€æ¬¾åˆ°è´¦æ—¶é—´å–å†³äºŽå†…éƒ¨å®¡æ ¸æµç¨‹ã€ä»˜æ¬¾æ–¹å¼ä»¥åŠç›¸å…³æ”¯ä»˜ç½‘å…³æˆ–é“¶è¡Œæ”¿ç­–ã€‚",
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

function formatMoney(value: number, locale: Locale) {
  const localeCode = locale === "en" ? "en-US" : locale === "zh" ? "zh-CN" : "id-ID"
  return `IDR ${Number(value || 0).toLocaleString(localeCode)}`
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

async function renderInvoiceHtml(payload: InvoicePdfPayload) {
  const locale = normalizeLocale(payload.locale)
  const t = copy[locale]
  const quantity = Math.max(1, Number(payload.quantity || 1))
  const nominalAmount = quantity > 0 ? Math.round(payload.subtotalAmount / quantity) : payload.subtotalAmount
  const verificationUrl =
    payload.verificationUrl || `https://app.redfeng.co/verifikasi-invoice/?booking_id=${encodeURIComponent(payload.bookingCode)}`
  const barcodeUrl = buildCode39SvgDataUrl(payload.bookingCode)
  const qrUrl = await QRCode.toDataURL(verificationUrl, { width: 280, margin: 0, color: { dark: "#111827", light: "#ffffff" } })
  const logoUrl = getLogoDataUrl()
  const packageLines = wrapText(payload.packageTitle || "-", 28).slice(0, 2)
  const styles = `
    @page { size: A4; margin: 0; }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: Arial, Helvetica, sans-serif; color: #111827; background: #ffffff; }
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
      <body>
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
                <div class="row"><span class="label">${escapeHtml(t.status)}</span><span class="colon">:</span><span>${escapeHtml(payload.paymentStatusLabel)}</span></div>
                <div class="row"><span class="label">${escapeHtml(t.type)}</span><span class="colon">:</span><span>${escapeHtml(payload.paymentTypeLabel)}</span></div>
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
              <div>${escapeHtml(formatMoney(nominalAmount, locale))}</div>
              <div>${escapeHtml(formatMoney(payload.subtotalAmount, locale))}</div>
            </div>
            <div class="rule"></div>
            <div class="totals">
              <div class="sum-row"><div class="label-text">${escapeHtml(t.subTotal)} :</div><div class="amount">${escapeHtml(formatMoney(payload.subtotalAmount, locale))}</div></div>
              <div class="sum-row"><div class="label-text">${escapeHtml(t.adminFee)} :</div><div class="amount">${escapeHtml(formatMoney(payload.adminFeeAmount, locale))}</div></div>
              <div class="sum-row"><div class="label-text">${escapeHtml(t.tax)} :</div><div class="amount">${escapeHtml(formatMoney(payload.taxAmount, locale))}</div></div>
              <div class="total-row"><div class="label">${escapeHtml(t.totalPayment)} :</div><div class="amount">${escapeHtml(formatMoney(payload.totalAmount, locale))}</div></div>
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
            <div>${escapeHtml(t.website)} : www.redfeng.co</div>
          </footer>
        </section>

        <section class="legal-page">
          <img class="logo" src="${logoUrl}" alt="Red Feng" />
          <h2 class="legal-title">${escapeHtml(t.termsTitle)}</h2>
          <div class="legal-box"><ol>${buildTermsList(t.terms)}</ol></div>
          <div class="legal-footer">
            <strong>${escapeHtml(t.support)} :</strong>
            <div>${escapeHtml(t.email)} : hello@redfeng.co</div>
            <div>${escapeHtml(t.website)} : www.redfeng.co</div>
          </div>
        </section>

        <section class="legal-page">
          <img class="logo" src="${logoUrl}" alt="Red Feng" />
          <h2 class="legal-title">${escapeHtml(t.refundTitle)}</h2>
          <div class="legal-box"><ol>${buildTermsList(t.refunds)}</ol></div>
          <div class="legal-footer">
            <strong>${escapeHtml(t.support)} :</strong>
            <div>${escapeHtml(t.email)} : hello@redfeng.co</div>
            <div>${escapeHtml(t.website)} : www.redfeng.co</div>
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

