import { Resend } from "resend"
import { getOptionalEnv } from "@/lib/env"
import { getCustomerResendFromEmail } from "@/lib/contact-config"
import { normalizeLocale, type Locale } from "@/lib/i18n"
import { buildAppUrl } from "@/lib/site-config"

export type FlightTicketEmailPayload = {
  bookingCode: string
  customerName?: string | null
  customerEmail?: string | null
  locale?: string | null
  airlineName?: string | null
  airlineCode?: string | null
  flightNumber?: string | null
  originAirportCode?: string | null
  destinationAirportCode?: string | null
  departureAt?: string | null
  arrivalAt?: string | null
  ticketNumber?: string | null
  pnrCode?: string | null
  verificationUrl?: string | null
}

function formatDateTime(value: string | null | undefined, locale: Locale) {
  if (!value) return "-"
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  const localeCode = locale === "en" ? "en-US" : locale === "zh" ? "zh-CN" : "id-ID"
  return parsed.toLocaleString(localeCode, {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function escapeHtml(value: string | null | undefined) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

export async function sendFlightTicketIssuedEmail(payload: FlightTicketEmailPayload) {
  const apiKey = getOptionalEnv("RESEND_API_KEY")
  const fromEmail = getCustomerResendFromEmail()

  if (!apiKey || !payload.customerEmail) {
    return { skipped: true }
  }

  const resend = new Resend(apiKey)
  const locale = normalizeLocale(payload.locale)
  const verificationUrl =
    payload.verificationUrl ||
    buildAppUrl(`/verifikasi-invoice/?booking_id=${encodeURIComponent(payload.bookingCode)}`)
  const copy = {
    id: {
      subject: "E-ticket Pesawat Red Feng",
      greeting: "Halo",
      customerFallback: "Customer",
      intro: "Tiket pesawat Anda sudah berhasil issued. Simpan detail berikut untuk proses check-in dan perjalanan Anda.",
      bookingCode: "Kode booking",
      route: "Rute",
      airline: "Maskapai",
      flight: "Penerbangan",
      departure: "Berangkat",
      arrival: "Tiba",
      ticketNumber: "Nomor tiket",
      pnr: "PNR / kode booking maskapai",
      verification: "Verifikasi booking",
      note: "Pastikan nama penumpang sesuai identitas yang digunakan saat check-in. Jika ada perbedaan data, segera hubungi tim Red Feng.",
      closing: "Terima kasih,<br/><strong>Tim Red Feng</strong>",
    },
    en: {
      subject: "Your Red Feng Flight E-ticket",
      greeting: "Hello",
      customerFallback: "Customer",
      intro: "Your flight ticket has been issued. Keep the details below for check-in and travel.",
      bookingCode: "Booking code",
      route: "Route",
      airline: "Airline",
      flight: "Flight",
      departure: "Departure",
      arrival: "Arrival",
      ticketNumber: "Ticket number",
      pnr: "PNR / airline booking code",
      verification: "Booking verification",
      note: "Make sure each passenger name matches the identity document used for check-in. Contact Red Feng immediately if anything looks incorrect.",
      closing: "Thank you,<br/><strong>Red Feng Team</strong>",
    },
    zh: {
      subject: "您的 Red Feng 机票电子凭证",
      greeting: "您好",
      customerFallback: "Customer",
      intro: "您的机票已出票。请保存以下信息以便办理值机和出行。",
      bookingCode: "订单编号",
      route: "航线",
      airline: "航空公司",
      flight: "航班",
      departure: "出发",
      arrival: "到达",
      ticketNumber: "票号",
      pnr: "PNR / 航空公司预订号",
      verification: "订单验证",
      note: "请确认乘客姓名与值机所用证件一致。如发现信息不正确，请立即联系 Red Feng 团队。",
      closing: "感谢您的信任，<br/><strong>Red Feng 团队</strong>",
    },
  }[locale]

  const route = [payload.originAirportCode, payload.destinationAirportCode].filter(Boolean).join(" - ") || "-"
  const airline = [payload.airlineCode, payload.airlineName].filter(Boolean).join(" ") || "-"
  const flight = [payload.airlineCode, payload.flightNumber].filter(Boolean).join(" ") || payload.flightNumber || "-"

  await resend.emails.send({
    from: fromEmail,
    to: payload.customerEmail,
    subject: `${copy.subject} - ${payload.bookingCode}`,
    html: `
      <div style="font-family:'Segoe UI',sans-serif;line-height:1.7;color:#0f172a">
        <h2 style="margin-bottom:8px">${copy.greeting} ${escapeHtml(payload.customerName || copy.customerFallback)},</h2>
        <p style="margin:0 0 18px;">${copy.intro}</p>

        <div style="border:1px solid #fed7aa;border-radius:16px;padding:16px 18px;margin:0 0 18px;background:#fff7ed;">
          <p style="margin:0 0 8px;"><strong>${copy.bookingCode}:</strong> ${escapeHtml(payload.bookingCode)}</p>
          <p style="margin:0 0 8px;"><strong>${copy.route}:</strong> ${escapeHtml(route)}</p>
          <p style="margin:0 0 8px;"><strong>${copy.airline}:</strong> ${escapeHtml(airline)}</p>
          <p style="margin:0 0 8px;"><strong>${copy.flight}:</strong> ${escapeHtml(flight)}</p>
          <p style="margin:0 0 8px;"><strong>${copy.departure}:</strong> ${escapeHtml(formatDateTime(payload.departureAt, locale))}</p>
          <p style="margin:0 0 8px;"><strong>${copy.arrival}:</strong> ${escapeHtml(formatDateTime(payload.arrivalAt, locale))}</p>
          <p style="margin:0 0 8px;"><strong>${copy.ticketNumber}:</strong> ${escapeHtml(payload.ticketNumber || "-")}</p>
          <p style="margin:0;"><strong>${copy.pnr}:</strong> ${escapeHtml(payload.pnrCode || "-")}</p>
        </div>

        <p style="margin:0 0 14px;">${copy.verification}: <a href="${verificationUrl}">${verificationUrl}</a></p>
        <p style="margin:0 0 18px;">${copy.note}</p>
        <p style="margin:0;">${copy.closing}</p>
      </div>
    `,
  })

  return { skipped: false }
}
