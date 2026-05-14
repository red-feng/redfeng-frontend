import type { ReactNode } from "react"
import { deleteMarketingNewsletterCampaign, sendMarketingNewsletterCampaign, upsertMarketingNewsletterCampaign } from "@/app/marketing/(protected)/actions"
import { createAdminClient } from "@/lib/supabase/admin"

type MarketingEmailCampaignsSearchParams = {
  success?: string
  error?: string
  q?: string
  status?: string
}

type CampaignRow = {
  id: string
  title: string
  subject: string
  preview_text: string | null
  body_html: string | null
  body_text: string | null
  status: string | null
  audience_count: number | null
  sent_count: number | null
  last_sent_at: string | null
  updated_at: string | null
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "-"
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return "-"
  return parsed.toLocaleString("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  })
}

export default async function MarketingEmailCampaignsPage({
  searchParams,
}: {
  searchParams?: Promise<MarketingEmailCampaignsSearchParams>
}) {
  const params = searchParams ? await searchParams : {}
  const query = String(params.q || "").trim().toLowerCase()
  const statusFilter = String(params.status || "all").trim()
  const adminSupabase = createAdminClient()
  const basePath = "/marketing/email-campaigns"

  let campaignsQuery = adminSupabase
    .from("marketing_newsletter_campaigns")
    .select("id, title, subject, preview_text, body_html, body_text, status, audience_count, sent_count, last_sent_at, updated_at")
    .order("updated_at", { ascending: false })

  if (statusFilter !== "all") {
    campaignsQuery = campaignsQuery.eq("status", statusFilter)
  }

  const [
    { data: campaignRows },
    { count: draftCount },
    { count: sentCount },
    { count: activeSubscribers },
  ] = await Promise.all([
    campaignsQuery,
    adminSupabase.from("marketing_newsletter_campaigns").select("id", { count: "exact", head: true }).eq("status", "draft"),
    adminSupabase.from("marketing_newsletter_campaigns").select("id", { count: "exact", head: true }).eq("status", "sent"),
    adminSupabase.from("newsletter_subscribers").select("id", { count: "exact", head: true }).eq("status", "active"),
  ])

  const campaigns = ((campaignRows as CampaignRow[] | null) || []).filter((campaign) => {
    if (!query) return true
    const haystack = [campaign.title, campaign.subject, campaign.preview_text].map((value) => String(value || "").toLowerCase()).join(" ")
    return haystack.includes(query)
  })
  const readyToSendCount = campaigns.filter((campaign) => String(campaign.status || "draft") === "draft").length
  const recentlySent = campaigns.filter((campaign) => String(campaign.status || "") === "sent").slice(0, 4)

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fff8f1_0%,#f7f1e8_100%)] px-4 py-5 sm:px-6 sm:py-6 md:px-8 md:py-8 lg:px-10">
      <div className="mx-auto max-w-7xl space-y-5 sm:space-y-6 lg:space-y-8">
        <section className="overflow-hidden rounded-[28px] border border-orange-200/60 bg-[linear-gradient(135deg,#7c2d12_0%,#c2410c_38%,#f97316_72%,#fdba74_100%)] px-5 py-6 text-white shadow-[0_30px_100px_rgba(146,64,14,0.18)] sm:rounded-[32px] sm:px-8 sm:py-8 lg:px-10">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_320px]">
            <div className="max-w-3xl">
              <span className="inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.34em] text-orange-50">
                Email Campaigns
              </span>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:mt-5 sm:text-4xl lg:text-5xl">
                Kirim newsletter campaign ke subscriber aktif dari workspace marketing.
              </h1>
            </div>
            <div className="rounded-[22px] border border-white/20 bg-white/10 px-4 py-4 backdrop-blur sm:rounded-[24px] sm:px-5 sm:py-5">
              <p className="text-[11px] uppercase tracking-[0.28em] text-orange-100/80">Ringkasan campaign</p>
              <div className="mt-5 grid gap-4">
                <div>
                  <p className="text-sm text-orange-50/80">Draft campaign</p>
                  <p className="mt-1 text-2xl font-semibold text-white sm:text-3xl">{(draftCount || 0).toLocaleString("id-ID")}</p>
                </div>
                <div>
                  <p className="text-sm text-orange-50/80">Campaign terkirim</p>
                  <p className="mt-1 text-2xl font-semibold text-white sm:text-3xl">{(sentCount || 0).toLocaleString("id-ID")}</p>
                </div>
                <div>
                  <p className="text-sm text-orange-50/80">Subscriber aktif</p>
                  <p className="mt-1 text-2xl font-semibold text-white sm:text-3xl">{(activeSubscribers || 0).toLocaleString("id-ID")}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {params.success ? <div className="rounded-[24px] border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-700">{params.success}</div> : null}
        {params.error ? <div className="rounded-[24px] border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">{params.error}</div> : null}

        <section className="grid gap-4 sm:gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <article className="rounded-[24px] border border-[#f3dbc3] bg-white/85 p-5 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur-sm sm:rounded-[32px] sm:p-6 lg:p-7">
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-orange-500">Workflow campaign</p>
            <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-slate-950 sm:text-2xl">Baca antrian dari draft sampai terkirim</h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {[
                { label: "Ready to send", value: readyToSendCount, note: "Campaign draft yang siap dikirim ke audience aktif." },
                { label: "Sent campaigns", value: sentCount || 0, note: "Campaign yang sudah keluar lewat jalur Resend." },
                { label: "Active audience", value: activeSubscribers || 0, note: "Subscriber aktif yang akan menerima campaign baru." },
                { label: "Filtered result", value: campaigns.length, note: "Campaign yang sedang tampil sesuai filter." },
              ].map((lane) => (
                <article key={lane.label} className="rounded-[20px] border border-[#efe1cf] bg-[#fffaf3] px-4 py-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">{lane.label}</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-950">{lane.value.toLocaleString("id-ID")}</p>
                  <p className="mt-2 text-xs leading-6 text-slate-500">{lane.note}</p>
                </article>
              ))}
            </div>
          </article>

          <article className="rounded-[24px] border border-[#f3dbc3] bg-white/85 p-5 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur-sm sm:rounded-[32px] sm:p-6 lg:p-7">
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-orange-500">Action queue</p>
            <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-slate-950 sm:text-2xl">Titik kerja berikutnya untuk tim campaign</h2>
            <div className="mt-5 space-y-3">
              <div className="rounded-[20px] border border-[#efe1cf] bg-[#fffaf3] px-4 py-4">
                <p className="text-sm font-semibold text-slate-950">Ready to ship</p>
                <p className="mt-2 text-sm text-slate-600">
                  {readyToSendCount
                    ? `${readyToSendCount.toLocaleString("id-ID")} campaign draft siap dikirim ke audience aktif.`
                    : "Belum ada campaign draft yang siap dikirim."}
                </p>
              </div>
              <div className="rounded-[20px] border border-[#efe1cf] bg-[#fffaf3] px-4 py-4">
                <p className="text-sm font-semibold text-slate-950">Latest delivery</p>
                <p className="mt-2 text-sm text-slate-600">
                  {recentlySent.length
                    ? `${recentlySent[0]?.title || "-"} terakhir dikirim pada ${formatDateTime(recentlySent[0]?.last_sent_at)}.`
                    : "Belum ada campaign yang pernah dikirim."}
                </p>
              </div>
            </div>
          </article>
        </section>

        <section className="rounded-[24px] border border-[#f3dbc3] bg-white/85 p-5 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur-sm sm:rounded-[32px] sm:p-6 lg:p-7">
          <form className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="xl:col-span-3">
              <label className="mb-2 block text-sm font-medium text-slate-700">Cari campaign</label>
              <input
                name="q"
                defaultValue={String(params.q || "")}
                placeholder="Cari berdasarkan judul, subject, atau preview text"
                className="w-full rounded-[18px] border border-[#e6d8c2] bg-[#fffdf9] px-4 py-3 text-sm outline-none ring-orange-500 transition focus:ring-2"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Status</label>
              <select
                name="status"
                defaultValue={statusFilter}
                className="w-full rounded-[18px] border border-[#e6d8c2] bg-[#fffdf9] px-4 py-3 text-sm outline-none ring-orange-500 transition focus:ring-2"
              >
                <option value="all">Semua status</option>
                <option value="draft">Draft</option>
                <option value="sent">Sent</option>
              </select>
            </div>
            <div className="flex gap-3 xl:col-span-4">
              <button className="rounded-[18px] bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800">
                Terapkan filter
              </button>
              <a
                href={basePath}
                className="rounded-[18px] border border-[#e6d8c2] bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Reset
              </a>
            </div>
          </form>
        </section>

        <section className="rounded-[24px] border border-[#f3dbc3] bg-white/85 p-5 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur-sm sm:rounded-[32px] sm:p-6 lg:p-7">
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-orange-500">Buat campaign</p>
          <div className="mt-5">
            <CampaignForm />
          </div>
        </section>

        <section className="space-y-4">
          {!campaigns.length ? (
            <div className="rounded-[24px] border border-dashed border-[#e8d7c1] bg-[#fffaf3] px-5 py-6 text-sm text-slate-500">
              Belum ada campaign email yang cocok dengan filter saat ini.
            </div>
          ) : (
            campaigns.map((campaign) => (
              <article key={campaign.id} className="rounded-[24px] border border-[#f3dbc3] bg-white/85 p-5 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur-sm sm:rounded-[32px] sm:p-6 lg:p-7">
                <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-orange-500">Existing campaign</p>
                    <h2 className="mt-2 text-xl font-semibold text-slate-950">{campaign.title}</h2>
                    <p className="mt-2 text-sm text-slate-500">Subject: {campaign.subject}</p>
                    <p className="mt-2 text-sm text-slate-500">
                      Status: {String(campaign.status || "draft")} | Audience: {Number(campaign.audience_count || 0).toLocaleString("id-ID")} | Sent: {Number(campaign.sent_count || 0).toLocaleString("id-ID")}
                    </p>
                    <p className="mt-2 text-sm text-slate-500">Last sent: {formatDateTime(campaign.last_sent_at)}</p>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {String(campaign.status || "draft") === "draft" ? (
                      <form action={sendMarketingNewsletterCampaign}>
                        <input type="hidden" name="campaign_id" value={campaign.id} />
                        <input type="hidden" name="return_to" value={basePath} />
                        <button className="rounded-[16px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100">
                          Kirim campaign
                        </button>
                      </form>
                    ) : null}
                    <form action={deleteMarketingNewsletterCampaign}>
                      <input type="hidden" name="campaign_id" value={campaign.id} />
                      <input type="hidden" name="title" value={campaign.title} />
                      <input type="hidden" name="return_to" value={basePath} />
                      <button className="rounded-[16px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-100">
                        Hapus campaign
                      </button>
                    </form>
                  </div>
                </div>
                <CampaignForm campaign={campaign} />
              </article>
            ))
          )}
        </section>
      </div>
    </main>
  )
}

function CampaignForm({ campaign }: { campaign?: CampaignRow }) {
  return (
    <form action={upsertMarketingNewsletterCampaign} className="grid gap-4">
      <input type="hidden" name="campaign_id" value={campaign?.id || ""} />
      <input type="hidden" name="return_to" value="/marketing/email-campaigns" />

      <FormSection
        eyebrow={campaign ? "Edit campaign" : "Campaign identity"}
        title={campaign ? "Rapikan campaign email yang sudah ada" : "Mulai dari identitas dan subject email"}
        description="Judul internal membantu tim marketing, sedangkan subject dan preview text akan dibaca subscriber saat email masuk."
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Field label="Judul campaign" name="title" defaultValue={campaign?.title || ""} />
          <Field label="Subject email" name="subject" defaultValue={campaign?.subject || ""} />
          <Field label="Preview text" name="preview_text" defaultValue={campaign?.preview_text || ""} required={false} />
        </div>
      </FormSection>

      <FormSection
        eyebrow="Body content"
        title="Tulis isi email dalam HTML dan teks pendamping"
        description="Body HTML menjadi versi utama email. Body text dipakai sebagai fallback teks polos bila dibutuhkan."
      >
        <div className="grid gap-4 xl:grid-cols-2">
          <TextArea label="Body HTML" name="body_html" rows={12} defaultValue={campaign?.body_html || ""} />
          <TextArea label="Body text" name="body_text" rows={12} defaultValue={campaign?.body_text || ""} required={false} />
        </div>
      </FormSection>

      <button className="w-fit rounded-[18px] bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800">
        {campaign ? "Simpan perubahan campaign" : "Buat campaign email"}
      </button>
    </form>
  )
}

function FormSection({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string
  title: string
  description: string
  children: ReactNode
}) {
  return (
    <section className="rounded-[24px] border border-[#efe1cf] bg-white px-5 py-5 shadow-[0_18px_44px_rgba(15,23,42,0.04)]">
      <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-orange-500">{eyebrow}</p>
      <h3 className="mt-2 text-lg font-semibold text-slate-950">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
      <div className="mt-5">{children}</div>
    </section>
  )
}

function Field({
  label,
  name,
  defaultValue,
  required = true,
}: {
  label: string
  name: string
  defaultValue: string
  required?: boolean
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-slate-700">{label}</label>
      <input
        name={name}
        required={required}
        defaultValue={defaultValue}
        className="w-full rounded-[18px] border border-[#e6d8c2] bg-[#fffdf9] px-4 py-3 text-sm outline-none ring-orange-500 transition focus:ring-2"
      />
    </div>
  )
}

function TextArea({
  label,
  name,
  defaultValue,
  rows,
  required = true,
}: {
  label: string
  name: string
  defaultValue: string
  rows: number
  required?: boolean
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-slate-700">{label}</label>
      <textarea
        name={name}
        required={required}
        defaultValue={defaultValue}
        rows={rows}
        className="w-full rounded-[18px] border border-[#e6d8c2] bg-[#fffdf9] px-4 py-3 text-sm outline-none ring-orange-500 transition focus:ring-2"
      />
    </div>
  )
}
