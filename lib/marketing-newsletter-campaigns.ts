import { Resend } from "resend"
import { getOptionalEnv } from "@/lib/env"

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

function stripHtml(html: string) {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function buildNewsletterHtml(previewText: string | null | undefined, bodyHtml: string) {
  const hiddenPreview = previewText
    ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${previewText}</div>`
    : ""

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
      </div>
    </div>
  `
}

export async function sendNewsletterCampaign(input: SendNewsletterCampaignInput) {
  const apiKey = getOptionalEnv("RESEND_API_KEY")
  const fromEmail = getOptionalEnv("RESEND_FROM_EMAIL", "Red Feng <hello@redfeng.co>")

  if (!apiKey) {
    throw new Error("RESEND_API_KEY belum diatur.")
  }

  const resend = new Resend(apiKey)
  const html = buildNewsletterHtml(input.previewText, input.bodyHtml)
  const text = String(input.bodyText || "").trim() || stripHtml(input.bodyHtml)
  let sentCount = 0

  for (const subscriber of input.subscribers) {
    const email = String(subscriber.email || "").trim()
    if (!email) continue

    await resend.emails.send({
      from: fromEmail,
      to: email,
      subject: input.subject,
      html,
      text,
    })

    sentCount += 1
  }

  return {
    audienceCount: input.subscribers.length,
    sentCount,
  }
}
