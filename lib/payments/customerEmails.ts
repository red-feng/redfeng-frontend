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
  verificationUrl?: string | null
  totalAmount: number
  subtotalAmount?: number | null
  adminFeeAmount?: number | null
  taxAmount?: number | null
  finalPaymentAmount?: number | null
  paymentTypeLabel: string
  paymentStatusLabel: string
  sendInvoicePdf?: boolean
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
      ? `Invoice ${payload.paymentStatusLabel} - ${payload.bookingCode}`
      : `Konfirmasi ${payload.paymentStatusLabel} - ${payload.bookingCode}`,
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#0f172a">
        <h2 style="margin-bottom:8px">Red Feng</h2>
        <p>Halo ${payload.customerName || "Customer"},</p>
        <p>Status pembayaran booking Anda sudah diperbarui menjadi <strong>${payload.paymentStatusLabel}</strong>.</p>
        <ul>
          <li>Kode booking: ${payload.bookingCode}</li>
          <li>Status pembayaran: ${payload.paymentStatusLabel}</li>
          <li>Jenis pembayaran: ${payload.paymentTypeLabel}</li>
          <li>Nama paket: ${payload.packageTitle || "-"}</li>
          <li>Tanggal wisata: ${payload.pickupDateLabel || "-"}</li>
          <li>Merchant / operator: ${payload.merchantName || "-"}</li>
          <li>Subtotal paket: ${formatMoney(Number(payload.subtotalAmount || 0))}</li>
          <li>Admin fee customer: ${formatMoney(Number(payload.adminFeeAmount || 0))}</li>
          <li>Pajak customer: ${formatMoney(Number(payload.taxAmount || 0))}</li>
          <li>Nominal: ${formatMoney(payload.totalAmount)}</li>
        </ul>
        <p>Fase operasional berikutnya akan mengikuti alur Arrived, Picked up, Go, lalu Ready for Finance sebelum payout merchant diproses.</p>
        <p>Verifikasi Booking ID: <a href="${payload.verificationUrl || "https://app.redfeng.co/verifikasi-invoice/"}">${payload.verificationUrl || "https://app.redfeng.co/verifikasi-invoice/"}</a></p>
        <p>${payload.sendInvoicePdf ? "Invoice PDF terlampir pada email ini." : "Invoice PDF akan dikirim setelah status berubah menjadi Fully Paid."}</p>
      </div>
    `,
    attachments,
  })

  return { skipped: false }
}
