import { Resend } from "resend"
import { getOptionalEnv } from "@/lib/env"
import { createInvoicePdf } from "./invoicePdf"

type PaymentEmailPayload = {
  bookingCode: string
  customerName: string | null
  customerEmail: string | null
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

function formatMoney(value: number) {
  return `Rp ${Number(value || 0).toLocaleString("id-ID")}`
}

export async function sendCustomerPaymentEmail(payload: PaymentEmailPayload) {
  const apiKey = getOptionalEnv("RESEND_API_KEY")
  const fromEmail = getOptionalEnv("RESEND_FROM_EMAIL", "Red Feng <noreply@redfeng.co>")

  if (!apiKey || !payload.customerEmail) {
    return { skipped: true }
  }

  const resend = new Resend(apiKey)
  const attachments = payload.sendInvoicePdf
    ? [
        {
          filename: `invoice-${payload.bookingCode}.pdf`,
          content: createInvoicePdf({
            invoiceNumber: `INV-${payload.bookingCode}`,
            bookingCode: payload.bookingCode,
            customerName: payload.customerName,
            packageTitle: payload.packageTitle || null,
            pickupDateLabel: payload.pickupDateLabel || null,
            merchantName: payload.merchantName || null,
            merchantCode: payload.merchantCode || null,
            verificationUrl: payload.verificationUrl || "https://app.redfeng.co/verifikasi-invoice/",
            paymentStatusLabel: payload.paymentStatusLabel,
            paymentTypeLabel: payload.paymentTypeLabel,
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
    subject: payload.sendInvoicePdf
      ? `RedFeng Booking: ${payload.paymentStatusLabel} - ${payload.bookingCode}`
      : `RedFeng Booking: ${payload.paymentStatusLabel} - ${payload.bookingCode}`,
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.7;color:#0f172a">
        <h2 style="margin-bottom:8px">Halo ${payload.customerName || "Customer"},</h2>
        <p style="margin:0 0 14px;">Status pembayaran booking Anda telah diperbarui menjadi <strong>${payload.paymentStatusLabel}</strong>.</p>
        <p style="margin:0 0 18px;">Berikut ringkasan transaksi Anda di RedFeng.</p>

        <div style="border:1px solid #e2e8f0;border-radius:16px;padding:16px 18px;margin:0 0 18px;background:#fffdfa;">
          <p style="margin:0 0 8px;"><strong>Kode booking:</strong> ${payload.bookingCode}</p>
          <p style="margin:0 0 8px;"><strong>Status pembayaran:</strong> ${payload.paymentStatusLabel}</p>
          <p style="margin:0 0 8px;"><strong>Jenis pembayaran:</strong> ${payload.paymentTypeLabel}</p>
          <p style="margin:0 0 8px;"><strong>Nama paket:</strong> ${payload.packageTitle || "-"}</p>
          <p style="margin:0 0 8px;"><strong>Tanggal wisata:</strong> ${payload.pickupDateLabel || "-"}</p>
          <p style="margin:0 0 8px;"><strong>Merchant / operator:</strong> ${payload.merchantName || "-"}</p>
          <p style="margin:0;"><strong>Merchant code:</strong> ${payload.merchantCode || "-"}</p>
        </div>

        <div style="border:1px solid #fed7aa;border-radius:16px;padding:16px 18px;margin:0 0 18px;background:#fff7ed;">
          <p style="margin:0 0 8px;"><strong>Subtotal paket:</strong> ${formatMoney(Number(payload.subtotalAmount || 0))}</p>
          <p style="margin:0 0 8px;"><strong>Admin fee customer:</strong> ${formatMoney(Number(payload.adminFeeAmount || 0))}</p>
          <p style="margin:0 0 8px;"><strong>Pajak customer:</strong> ${formatMoney(Number(payload.taxAmount || 0))}</p>
          <p style="margin:0;"><strong>Nominal dibayar:</strong> ${formatMoney(payload.totalAmount)}</p>
        </div>

        <p style="margin:0 0 14px;">Tahap operasional berikutnya akan mengikuti alur <strong>Arrived</strong>, <strong>Picked up</strong>, <strong>Go</strong>, lalu <strong>Ready for Finance</strong> sebelum payout merchant diproses.</p>
        ${payload.settlementDueLabel ? `<p style="margin:0 0 14px;"><strong>Batas waktu pelunasan:</strong> ${payload.settlementDueLabel}</p>` : ""}
        <p style="margin:0 0 14px;">Verifikasi Booking ID: <a href="${payload.verificationUrl || "https://app.redfeng.co/verifikasi-invoice/"}">${payload.verificationUrl || "https://app.redfeng.co/verifikasi-invoice/"}</a></p>
        <p style="margin:0 0 18px;">${payload.sendInvoicePdf ? "Invoice PDF terlampir pada email ini." : "Invoice PDF akan dikirim setelah status pembayaran berubah menjadi Fully Paid."}</p>
        <p style="margin:0;">Terima kasih,<br/><strong>Tim RedFeng</strong></p>
      </div>
    `,
    attachments,
  })

  return { skipped: false }
}
