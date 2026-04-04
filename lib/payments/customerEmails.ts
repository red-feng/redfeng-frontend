import { Resend } from "resend"
import { getOptionalEnv } from "@/lib/env"
import { createInvoicePdf } from "./invoicePdf"
import { normalizeLocale, type Locale } from "@/lib/i18n"

type PaymentEmailPayload = {
  bookingCode: string
  customerName: string | null
  customerEmail: string | null
  locale?: string | null
  currency?: string | null
  packageTitle?: string | null
  pickupDateLabel?: string | null
  merchantName?: string | null
  merchantCode?: string | null
  verificationUrl?: string | null
  totalAmount: number
  subtotalAmount?: number | null
  adminFeeAmount?: number | null
  taxAmount?: number | null
  finalPaymentAmount?: number | null
  paymentTypeLabel: string
  paymentStatusLabel: string
  sendInvoicePdf?: boolean
  settlementDueLabel?: string | null
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

export async function sendCustomerPaymentEmail(payload: PaymentEmailPayload) {
  const apiKey = getOptionalEnv("RESEND_API_KEY")
  const fromEmail = getOptionalEnv("RESEND_FROM_EMAIL", "Red Feng <hello@redfeng.co>")

  if (!apiKey || !payload.customerEmail) {
    return { skipped: true }
  }

  const resend = new Resend(apiKey)
  const locale = normalizeLocale(payload.locale)
  const copy = {
    id: {
      greeting: "Halo",
      subjectPrefix: "RedFeng Booking",
      updatedStatus: "Status pembayaran booking Anda telah diperbarui menjadi",
      transactionSummary: "Berikut ringkasan transaksi Anda di RedFeng.",
      bookingCode: "Kode booking",
      paymentStatus: "Status pembayaran",
      paymentType: "Jenis pembayaran",
      packageName: "Nama paket",
      travelDate: "Tanggal wisata",
      merchantOperator: "Merchant / operator",
      merchantCode: "Merchant code",
      subtotal: "Subtotal paket",
      adminFee: "Admin fee customer",
      tax: "Pajak customer",
      paidAmount: "Nominal dibayar",
      operationalFlow:
        "Tahap operasional berikutnya akan mengikuti alur Arrived, Picked up, Go, lalu Ready for Finance saat booking masuk ke antrean finance.",
      settlementDeadline: "Batas waktu pelunasan",
      verificationLabel: "Verifikasi Booking ID",
      pdfAttached: "Invoice PDF terlampir pada email ini.",
      pdfLater: "Invoice PDF akan dikirim setelah status pembayaran berubah menjadi Fully Paid.",
      closing: "Terima kasih,<br/><strong>Tim RedFeng</strong>",
      customerFallback: "Customer",
      dpPayment: "DP Payment",
      finalPayment: "Final Payment",
      fullPayment: "Full Payment",
      dpPaid: "DP Paid",
      finalPaymentSettled: "Final Payment Settled",
      fullyPaid: "Fully Paid",
    },
    en: {
      greeting: "Hello",
      subjectPrefix: "RedFeng Booking",
      updatedStatus: "Your booking payment status has been updated to",
      transactionSummary: "Below is your RedFeng transaction summary.",
      bookingCode: "Booking code",
      paymentStatus: "Payment status",
      paymentType: "Payment type",
      packageName: "Package name",
      travelDate: "Travel date",
      merchantOperator: "Merchant / operator",
      merchantCode: "Merchant code",
      subtotal: "Package subtotal",
      adminFee: "Customer admin fee",
      tax: "Customer tax",
      paidAmount: "Amount paid",
      operationalFlow:
        "The next operational stages will follow Arrived, Picked up, Go, and then Ready for Finance when the booking enters the finance queue.",
      settlementDeadline: "Final payment deadline",
      verificationLabel: "Booking ID verification",
      pdfAttached: "The invoice PDF is attached to this email.",
      pdfLater: "The invoice PDF will be sent once the payment status changes to Fully Paid.",
      closing: "Thank you,<br/><strong>RedFeng Team</strong>",
      customerFallback: "Customer",
      dpPayment: "DP Payment",
      finalPayment: "Final Payment",
      fullPayment: "Full Payment",
      dpPaid: "DP Paid",
      finalPaymentSettled: "Final Payment Settled",
      fullyPaid: "Fully Paid",
    },
    zh: {
      greeting: "您好",
      subjectPrefix: "RedFeng Booking",
      updatedStatus: "您的订单付款状态已更新为",
      transactionSummary: "以下是您在 RedFeng 的交易摘要。",
      bookingCode: "订单编号",
      paymentStatus: "付款状态",
      paymentType: "付款类型",
      packageName: "套餐名称",
      travelDate: "出行日期",
      merchantOperator: "商家 / 运营方",
      merchantCode: "商家代码",
      subtotal: "套餐小计",
      adminFee: "客户管理费",
      tax: "客户税费",
      paidAmount: "已支付金额",
      operationalFlow:
        "接下来的运营阶段将依次为 Arrived、Picked up、Go，随后订单进入财务队列时会显示为 Ready for Finance。",
      settlementDeadline: "尾款截止时间",
      verificationLabel: "订单验证链接",
      pdfAttached: "本邮件已附上 PDF 发票。",
      pdfLater: "付款状态变为 Fully Paid 后，系统将发送 PDF 发票。",
      closing: "感谢您的信任，<br/><strong>RedFeng 团队</strong>",
      customerFallback: "Customer",
      dpPayment: "定金付款",
      finalPayment: "尾款支付",
      fullPayment: "全额付款",
      dpPaid: "定金已支付",
      finalPaymentSettled: "尾款已结清",
      fullyPaid: "已全额付款",
    },  }[locale]

  const localizedPaymentTypeLabel =
    payload.paymentTypeLabel === "DP Payment"
      ? copy.dpPayment
      : payload.paymentTypeLabel === "Final Payment"
        ? copy.finalPayment
        : payload.paymentTypeLabel === "Full Payment"
          ? copy.fullPayment
          : payload.paymentTypeLabel

  const localizedPaymentStatusLabel =
    payload.paymentStatusLabel === "DP Paid"
      ? copy.dpPaid
      : payload.paymentStatusLabel === "Final Payment Settled"
        ? copy.finalPaymentSettled
        : payload.paymentStatusLabel === "Fully Paid"
          ? copy.fullyPaid
          : payload.paymentStatusLabel

  const attachments = payload.sendInvoicePdf
    ? [
        {
          filename: `invoice-${payload.bookingCode}.pdf`,
          content: await createInvoicePdf({
            invoiceNumber: `INV-${payload.bookingCode}`,
            bookingCode: payload.bookingCode,
            customerName: payload.customerName,
            locale,
            currency: payload.currency || null,
            packageTitle: payload.packageTitle || null,
            pickupDateLabel: payload.pickupDateLabel || null,
            merchantName: payload.merchantName || null,
            merchantCode: payload.merchantCode || null,
            verificationUrl: payload.verificationUrl || "https://app.redfeng.co/verifikasi-invoice/",
            paymentStatusLabel: localizedPaymentStatusLabel,
            paymentTypeLabel: localizedPaymentTypeLabel,
            subtotalAmount: Number(payload.subtotalAmount || 0),
            adminFeeAmount: Number(payload.adminFeeAmount || 0),
            taxAmount: Number(payload.taxAmount || 0),
            totalAmount: Number(payload.totalAmount || 0),
          }),
        },
      ]
    : undefined

  await resend.emails.send({
    from: fromEmail,
    to: payload.customerEmail,
    subject: `${copy.subjectPrefix}: ${localizedPaymentStatusLabel} - ${payload.bookingCode}`,
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.7;color:#0f172a">
        <h2 style="margin-bottom:8px">${copy.greeting} ${payload.customerName || copy.customerFallback},</h2>
        <p style="margin:0 0 14px;">${copy.updatedStatus} <strong>${localizedPaymentStatusLabel}</strong>.</p>
        <p style="margin:0 0 18px;">${copy.transactionSummary}</p>

        <div style="border:1px solid #e2e8f0;border-radius:16px;padding:16px 18px;margin:0 0 18px;background:#fffdfa;">
          <p style="margin:0 0 8px;"><strong>${copy.bookingCode}:</strong> ${payload.bookingCode}</p>
          <p style="margin:0 0 8px;"><strong>${copy.paymentStatus}:</strong> ${localizedPaymentStatusLabel}</p>
          <p style="margin:0 0 8px;"><strong>${copy.paymentType}:</strong> ${localizedPaymentTypeLabel}</p>
          <p style="margin:0 0 8px;"><strong>${copy.packageName}:</strong> ${payload.packageTitle || "-"}</p>
          <p style="margin:0 0 8px;"><strong>${copy.travelDate}:</strong> ${payload.pickupDateLabel || "-"}</p>
          <p style="margin:0 0 8px;"><strong>${copy.merchantOperator}:</strong> ${payload.merchantName || "-"}</p>
          <p style="margin:0;"><strong>${copy.merchantCode}:</strong> ${payload.merchantCode || "-"}</p>
        </div>

        <div style="border:1px solid #fed7aa;border-radius:16px;padding:16px 18px;margin:0 0 18px;background:#fff7ed;">
          <p style="margin:0 0 8px;"><strong>${copy.subtotal}:</strong> ${formatMoney(Number(payload.subtotalAmount || 0), locale, payload.currency)}</p>
          <p style="margin:0 0 8px;"><strong>${copy.adminFee}:</strong> ${formatMoney(Number(payload.adminFeeAmount || 0), locale, payload.currency)}</p>
          <p style="margin:0 0 8px;"><strong>${copy.tax}:</strong> ${formatMoney(Number(payload.taxAmount || 0), locale, payload.currency)}</p>
          <p style="margin:0;"><strong>${copy.paidAmount}:</strong> ${formatMoney(payload.totalAmount, locale, payload.currency)}</p>
        </div>

        <p style="margin:0 0 14px;">${copy.operationalFlow}</p>
        ${payload.settlementDueLabel ? `<p style="margin:0 0 14px;"><strong>${copy.settlementDeadline}:</strong> ${payload.settlementDueLabel}</p>` : ""}
        <p style="margin:0 0 14px;">${copy.verificationLabel}: <a href="${payload.verificationUrl || "https://app.redfeng.co/verifikasi-invoice/"}">${payload.verificationUrl || "https://app.redfeng.co/verifikasi-invoice/"}</a></p>
        <p style="margin:0 0 18px;">${payload.sendInvoicePdf ? copy.pdfAttached : copy.pdfLater}</p>
        <p style="margin:0;">${copy.closing}</p>
      </div>
    `,
    attachments,
  })

  return { skipped: false }
}

