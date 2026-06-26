import type { Locale } from "@/lib/i18n"
import { normalizeStatus } from "@/lib/status-tones"

type CustomerFlightStatusInput = {
  lifecycleStatus?: string | null
  issueStatus?: string | null
  paymentStatus?: string | null
  holdExpired?: boolean
  ticketNumber?: string | null
  pnrCode?: string | null
}

type CustomerFlightStatusCopy = {
  label: string
  headline: string
  body: string
  timelineLabel: string
}

export type CustomerFlightStatus = CustomerFlightStatusCopy & {
  tone: string
  code: string
}

function copy(locale: Locale, id: CustomerFlightStatusCopy, en: CustomerFlightStatusCopy, zh: CustomerFlightStatusCopy) {
  if (locale === "en") return en
  if (locale === "zh") return zh
  return id
}

export function getCustomerFlightStatus(input: CustomerFlightStatusInput, locale: Locale = "id"): CustomerFlightStatus {
  const lifecycle = normalizeStatus(input.lifecycleStatus)
  const issue = normalizeStatus(input.issueStatus)
  const payment = normalizeStatus(input.paymentStatus)
  const ticketReady = Boolean(input.ticketNumber || input.pnrCode)

  if (lifecycle === "issued" || issue === "issued" || (ticketReady && lifecycle === "issued")) {
    return {
      code: "issued",
      tone: "border-emerald-200 bg-emerald-50 text-emerald-800",
      ...copy(
        locale,
        {
          label: "E-ticket tersedia",
          headline: "Tiket Anda sudah diterbitkan.",
          body: "E-ticket sudah dikirim ke email Anda. Simpan kode booking dan PNR untuk proses check-in.",
          timelineLabel: "E-ticket tersedia",
        },
        {
          label: "E-ticket ready",
          headline: "Your ticket has been issued.",
          body: "The e-ticket has been sent to your email. Keep the booking code and PNR for check-in.",
          timelineLabel: "E-ticket ready",
        },
        {
          label: "电子票已生成",
          headline: "您的机票已出票。",
          body: "电子票已发送到您的邮箱。请保存订单编号和 PNR 以便办理值机。",
          timelineLabel: "电子票已生成",
        },
      ),
    }
  }

  if (lifecycle === "ticketing" || issue === "ticketing") {
    return {
      code: "ticketing",
      tone: "border-indigo-200 bg-indigo-50 text-indigo-800",
      ...copy(
        locale,
        {
          label: "Tiket sedang diterbitkan",
          headline: "Pembayaran berhasil. Tiket sedang diterbitkan.",
          body: "Red Feng sedang menerbitkan tiket ke maskapai. Anda akan menerima e-ticket setelah proses selesai.",
          timelineLabel: "Tiket sedang diterbitkan",
        },
        {
          label: "Ticket is being issued",
          headline: "Payment received. Your ticket is being issued.",
          body: "Red Feng is issuing the ticket with the airline. You will receive the e-ticket once it is complete.",
          timelineLabel: "Ticketing",
        },
        {
          label: "出票处理中",
          headline: "付款成功，机票正在出票。",
          body: "Red Feng 正在向航司出票。出票完成后您将收到电子票。",
          timelineLabel: "出票处理中",
        },
      ),
    }
  }

  if (lifecycle === "issue_failed" || issue === "issue_failed") {
    return {
      code: "issue_review",
      tone: "border-amber-200 bg-amber-50 text-amber-800",
      ...copy(
        locale,
        {
          label: "Dikonfirmasi tim Red Feng",
          headline: "Pembayaran berhasil. Tiket sedang dikonfirmasi tim Red Feng.",
          body: "Kami sedang memastikan penerbitan tiket ke maskapai. Jika ada perubahan dari maskapai, tim Red Feng akan menghubungi Anda.",
          timelineLabel: "Dikonfirmasi tim Red Feng",
        },
        {
          label: "Under Red Feng review",
          headline: "Payment received. Red Feng is confirming your ticket.",
          body: "We are confirming ticket issuance with the airline. If the airline returns any change, the Red Feng team will contact you.",
          timelineLabel: "Under Red Feng review",
        },
        {
          label: "Red Feng 确认中",
          headline: "付款成功，Red Feng 正在确认机票。",
          body: "我们正在与航司确认出票。如航空公司有任何变动，Red Feng 团队会联系您。",
          timelineLabel: "Red Feng 确认中",
        },
      ),
    }
  }

  if (lifecycle === "payment_verified" || payment === "paid") {
    return {
      code: "payment_verified",
      tone: "border-sky-200 bg-sky-50 text-sky-800",
      ...copy(
        locale,
        {
          label: "Pembayaran berhasil",
          headline: "Pembayaran berhasil. Tiket segera diterbitkan.",
          body: "Payment Anda sudah terverifikasi. Red Feng akan menerbitkan tiket dan mengirim e-ticket setelah maskapai mengonfirmasi.",
          timelineLabel: "Menunggu e-ticket",
        },
        {
          label: "Payment received",
          headline: "Payment received. Ticket issuance will start shortly.",
          body: "Your payment has been verified. Red Feng will issue the ticket and send the e-ticket after airline confirmation.",
          timelineLabel: "Waiting for e-ticket",
        },
        {
          label: "付款成功",
          headline: "付款成功，即将出票。",
          body: "您的付款已验证。Red Feng 会在航司确认后出票并发送电子票。",
          timelineLabel: "等待电子票",
        },
      ),
    }
  }

  if (lifecycle === "booking_hold_created" || lifecycle === "pending_payment") {
    if (input.holdExpired) {
      return {
        code: "hold_expired",
        tone: "border-amber-200 bg-amber-50 text-amber-800",
        ...copy(
          locale,
          {
            label: "Hold perlu diperbarui",
            headline: "Hold penerbangan perlu diperbarui.",
            body: "Waktu hold sebelumnya sudah lewat. Tim Red Feng akan recheck ulang sebelum payment dibuka lagi.",
            timelineLabel: "Hold perlu diperbarui",
          },
          {
            label: "Hold needs refresh",
            headline: "The flight hold needs to be refreshed.",
            body: "The previous hold window has passed. Red Feng will recheck before reopening payment.",
            timelineLabel: "Hold refresh needed",
          },
          {
            label: "需重新锁位",
            headline: "航班锁位需要更新。",
            body: "之前的锁位时间已过。Red Feng 会重新核验后再开放付款。",
            timelineLabel: "需重新锁位",
          },
        ),
      }
    }

    return {
      code: "ready_to_pay",
      tone: "border-emerald-200 bg-emerald-50 text-emerald-800",
      ...copy(
        locale,
        {
          label: "Siap dibayar",
          headline: "Hold penerbangan sudah aman. Pembayaran Midtrans sudah bisa dilanjutkan.",
          body: "Fare dan hold sudah dikonfirmasi. Selesaikan pembayaran sebelum batas hold berakhir agar tiket bisa diterbitkan.",
          timelineLabel: "Siap dibayar",
        },
        {
          label: "Ready to pay",
          headline: "The flight hold is secured. Midtrans payment is ready.",
          body: "The fare and hold are confirmed. Complete payment before the hold expires so the ticket can be issued.",
          timelineLabel: "Ready to pay",
        },
        {
          label: "可付款",
          headline: "航班已锁位，可通过 Midtrans 付款。",
          body: "票价和锁位已确认。请在锁位到期前完成付款，以便出票。",
          timelineLabel: "可付款",
        },
      ),
    }
  }

  if (lifecycle === "fare_rechecked" || lifecycle === "fare_recheck_required" || payment === "pending" || payment === "unpaid") {
    return {
      code: "fare_recheck",
      tone: "border-sky-200 bg-sky-50 text-sky-800",
      ...copy(
        locale,
        {
          label: "Sedang cek fare",
          headline: "Booking diterima. Red Feng sedang cek fare dan ketersediaan kursi.",
          body: "Pembayaran belum dibuka agar Anda tidak membayar sebelum harga dan seat benar-benar aman.",
          timelineLabel: "Sedang cek fare",
        },
        {
          label: "Fare check in progress",
          headline: "Booking received. Red Feng is checking fare and seat availability.",
          body: "Payment is not opened yet so you do not pay before fare and seat availability are secured.",
          timelineLabel: "Fare check",
        },
        {
          label: "票价核验中",
          headline: "订单已收到，Red Feng 正在核验票价和座位。",
          body: "付款暂未开放，以避免您在价格和座位确认前付款。",
          timelineLabel: "票价核验中",
        },
      ),
    }
  }

  return {
    code: "processing",
    tone: "border-slate-200 bg-slate-50 text-slate-700",
    ...copy(
      locale,
      {
        label: "Diproses Red Feng",
        headline: "Booking pesawat sedang diproses Red Feng.",
        body: "Tim Red Feng sedang menyiapkan langkah berikutnya untuk booking pesawat Anda.",
        timelineLabel: "Diproses Red Feng",
      },
      {
        label: "Processing",
        headline: "Your flight booking is being processed by Red Feng.",
        body: "The Red Feng team is preparing the next step for your flight booking.",
        timelineLabel: "Processing",
      },
      {
        label: "处理中",
        headline: "您的机票订单正在由 Red Feng 处理。",
        body: "Red Feng 团队正在为您的机票订单准备下一步。",
        timelineLabel: "处理中",
      },
    ),
  }
}
