import { Resend } from "resend"
import { getOptionalEnv } from "@/lib/env"
import { getCustomerResendFromEmail } from "@/lib/contact-config"
import {
  buildNewsletterUnsubscribeUrl,
  getNewsletterUnsubscribeLabel,
  normalizeNewsletterLocale,
} from "@/lib/newsletter-unsubscribe"

type NewsletterCampaignSubscriber = {
  email: string
  locale?: string | null
}

type SendNewsletterCampaignInput = {
  subject: string
  previewText?: string | null
  bodyHtml: string
  bodyText?: string | null
  subscribers: NewsletterCampaignSubscriber[]
}

type NewsletterCampaignDeliveryResult = {
  email: string
  locale: string
  status: "sent" | "failed"
  errorMessage?: string | null
}

function stripHtml(html: string) {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function buildNewsletterHtml(
  previewText: string | null | undefined,
  bodyHtml: string,
  unsubscribeUrl: string,
  locale?: string | null,
) {
  const hiddenPreview = previewText
    ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${previewText}</div>`
    : ""
  const unsubscribeLabel = getNewsletterUnsubscribeLabel(locale)

  return `
    <div style="margin:0;padding:24px;background:#f7f1e8;font-family:Arial,Helvetica,sans-serif;color:#1f2937;">
      ${hiddenPreview}
      <div style="max-width:680px;margin:0 auto;background:#ffffff;border:1px solid #f3dbc3;border-radius:24px;overflow:hidden;">
        <div style="padding:28px 32px;background:linear-gradient(135deg,#7c2d12 0%,#c2410c 45%,#f97316 100%);color:#ffffff;">
          <div style="font-size:11px;letter-spacing:0.28em;text-transform:uppercase;font-weight:700;">RedFeng Marketing</div>
        </div>
        <div style="padding:32px;">
          ${bodyHtml}
        </div>
        <div style="padding:0 32px 32px 32px;">
          <div style="padding-top:20px;border-top:1px solid #f3dbc3;font-size:13px;line-height:1.7;color:#6b7280;">
            <a href="${unsubscribeUrl}" style="color:#c2410c;text-decoration:none;font-weight:600;">${unsubscribeLabel}</a>
          </div>
        </div>
      </div>
    </div>
  `
}

function buildNewsletterText(bodyText: string | null | undefined, bodyHtml: string, unsubscribeUrl: string, locale?: string | null) {
  const text = String(bodyText || "").trim() || stripHtml(bodyHtml)
  const unsubscribeLabel = getNewsletterUnsubscribeLabel(locale)
  return `${text}\n\n${unsubscribeLabel}: ${unsubscribeUrl}`.trim()
}

export async function sendNewsletterCampaign(input: SendNewsletterCampaignInput) {
  const apiKey = getOptionalEnv("RESEND_API_KEY")
  const fromEmail = getCustomerResendFromEmail()

  if (!apiKey) {
    throw new Error("RESEND_API_KEY belum diatur.")
  }

  const resend = new Resend(apiKey)
  let sentCount = 0
  const results: NewsletterCampaignDeliveryResult[] = []

  for (const subscriber of input.subscribers) {
    const email = String(subscriber.email || "").trim()
    if (!email) continue
    const locale = normalizeNewsletterLocale(subscriber.locale)
    const unsubscribeUrl = buildNewsletterUnsubscribeUrl(email, locale)
    const html = buildNewsletterHtml(input.previewText, input.bodyHtml, unsubscribeUrl, locale)
    const text = buildNewsletterText(input.bodyText, input.bodyHtml, unsubscribeUrl, locale)

    try {
      await resend.emails.send({
        from: fromEmail,
        to: email,
        subject: input.subject,
        html,
        text,
      })

      sentCount += 1
      results.push({
        email,
        locale,
        status: "sent",
      })
    } catch (error) {
      results.push({
        email,
        locale,
        status: "failed",
        errorMessage: error instanceof Error ? error.message : "Pengiriman email gagal.",
      })
    }
  }

  return {
    audienceCount: input.subscribers.length,
    sentCount,
    failedCount: results.filter((result) => result.status === "failed").length,
    results,
  }
}
