import type { ReactNode } from "react"
import {
  approveMarketingNewsletterCampaign,
  deleteMarketingNewsletterCampaign,
  sendMarketingNewsletterCampaign,
  upsertMarketingNewsletterCampaign,
} from "@/app/marketing/(protected)/actions"
import { createClient } from "@/lib/supabase/server"
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
  approved_by: string | null
  approved_at: string | null
  last_sent_at: string | null
  updated_at: string | null
}

type CampaignDeliveryRow = {
  campaign_id: string | null
  status: string | null
}

function isApprovalRole(role: string | null | undefined) {
  return ["marketing_manager", "superadmin"].includes(String(role || "").trim().toLowerCase())
}

function getCampaignStatusMeta(status: string | null | undefined) {
  const normalized = String(status || "draft").trim().toLowerCase()

  if (normalized === "approved") {
    return {
      label: "Ready",
      tone: "border border-emerald-200 bg-emerald-50 text-emerald-700",
      laneLabel: "Ready to send",
    }
  }

  if (normalized === "sent") {
    return {
      label: "Sent",
      tone: "border border-sky-200 bg-sky-50 text-sky-700",
      laneLabel: "Sent campaigns",
    }
  }

  return {
    label: "Review",
    tone: "border border-amber-200 bg-amber-50 text-amber-700",
    laneLabel: "Needs approval",
  }
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

function getDeliveryProgress(campaign: CampaignRow) {
  const audience = Math.max(Number(campaign.audience_count || 0), 0)
  const sent = Math.max(Number(campaign.sent_count || 0), 0)
  const remaining = Math.max(audience - sent, 0)
  const percent = audience > 0 ? Math.min(Math.round((sent / audience) * 100), 100) : 0

  return { audience, sent, remaining, percent }
}

export default async function MarketingEmailCampaignsPage({
  searchParams,
}: {
  searchParams?: Promise<MarketingEmailCampaignsSearchParams>
}) {
  const params = searchParams ? await searchParams : {}
  const query = String(params.q || "").trim().toLowerCase()
  const statusFilter = String(params.status || "all").trim()
  const supabase = await createClient("marketing")
  const adminSupabase = createAdminClient()
  const basePath = "/marketing/email-campaigns"

  const {
    data: { user },
  } = await supabase.auth.getUser()
  const { data: currentProfile } = user
    ? await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle()
    : { data: null }
  const currentRole = String(currentProfile?.role || "")
  const canApproveAndSend = isApprovalRole(currentRole)

  let campaignsQuery = adminSupabase
    .from("marketing_newsletter_campaigns")
    .select("id, title, subject, preview_text, body_html, body_text, status, audience_count, sent_count, approved_by, approved_at, last_sent_at, updated_at")
    .order("updated_at", { ascending: false })

  if (statusFilter !== "all") {
    campaignsQuery = campaignsQuery.eq("status", statusFilter)
  }

  const [
    { data: campaignRows },
    { count: draftCount },
    { count: approvedCount },
    { count: sentCount },
    { count: activeSubscribers },
  ] = await Promise.all([
    campaignsQuery,
    adminSupabase.from("marketing_newsletter_campaigns").select("id", { count: "exact", head: true }).eq("status", "draft"),
    adminSupabase.from("marketing_newsletter_campaigns").select("id", { count: "exact", head: true }).eq("status", "approved"),
    adminSupabase.from("marketing_newsletter_campaigns").select("id", { count: "exact", head: true }).eq("status", "sent"),
    adminSupabase.from("newsletter_subscribers").select("id", { count: "exact", head: true }).eq("status", "active"),
  ])

  const campaigns = ((campaignRows as CampaignRow[] | null) || []).filter((campaign) => {
    if (!query) return true
    const haystack = [campaign.title, campaign.subject, campaign.preview_text].map((value) => String(value || "").toLowerCase()).join(" ")
    return haystack.includes(query)
  })
  const campaignIds = campaigns.map((campaign) => campaign.id)
  const approverIds = Array.from(new Set(campaigns.map((campaign) => String(campaign.approved_by || "").trim()).filter(Boolean)))
  const approverMap = new Map<string, string>()
  const failedDeliveryCountMap = new Map<string, number>()

  if (campaignIds.length) {
    const { data: deliveryRows } = await adminSupabase
      .from("marketing_newsletter_campaign_deliveries")
      .select("campaign_id, status")
      .in("campaign_id", campaignIds)

    for (const row of (deliveryRows as CampaignDeliveryRow[] | null) || []) {
      if (row.status !== "failed" || !row.campaign_id) continue
      failedDeliveryCountMap.set(row.campaign_id, (failedDeliveryCountMap.get(row.campaign_id) || 0) + 1)
    }
  }

  if (approverIds.length) {
    const { data: approverProfiles } = await adminSupabase.from("profiles").select("id, username").in("id", approverIds)
    for (const profile of approverProfiles || []) {
      approverMap.set(String(profile.id), String(profile.username || profile.id))
    }
  }

  const readyToSendCount = campaigns.filter((campaign) => String(campaign.status || "draft") === "approved").length
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
                  <p className="text-sm text-orange-50/80">Siap kirim</p>
                  <p className="mt-1 text-2xl font-semibold text-white sm:text-3xl">{(approvedCount || 0).toLocaleString("id-ID")}</p>
                </div>
                <div>
                  <p className="text-sm text-orange-50/80">Campaign terkirim</p>
                  <p className="mt-1 text-2xl font-semibold text-white sm:text-3xl">{(sentCount || 0).toLocaleString("id-ID")}</p>
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
                {
                  label: "Needs approval",
                  value: draftCount || 0,
                  note: "Campaign draft yang masih menunggu approval manager.",
                  tone: "border-amber-200 bg-amber-50 text-amber-700",
                },
                {
                  label: "Ready to send",
                  value: readyToSendCount,
                  note: "Campaign yang sudah disetujui dan siap dikirim.",
                  tone: "border-emerald-200 bg-emerald-50 text-emerald-700",
                },
                {
                  label: "Sent campaigns",
                  value: sentCount || 0,
                  note: "Campaign yang sudah keluar lewat jalur Resend.",
                  tone: "border-sky-200 bg-sky-50 text-sky-700",
                },
                { label: "Active audience", value: activeSubscribers || 0, note: "Subscriber aktif yang akan menerima campaign baru.", tone: "border-slate-200 bg-slate-100 text-slate-700" },
                { label: "Filtered result", value: campaigns.length, note: "Campaign yang sedang tampil sesuai filter.", tone: "border-slate-200 bg-slate-100 text-slate-700" },
              ].map((lane) => (
                <article key={lane.label} className={`rounded-[20px] border px-4 py-4 ${lane.tone}`}>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em]">{lane.label}</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-950">{lane.value.toLocaleString("id-ID")}</p>
                  <p className="mt-2 text-xs leading-6 text-slate-600">{lane.note}</p>
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
                    ? `${readyToSendCount.toLocaleString("id-ID")} campaign sudah disetujui dan siap dikirim ke audience aktif.`
                    : "Belum ada campaign yang siap dikirim."}
                </p>
              </div>
              <div className="rounded-[20px] border border-[#efe1cf] bg-[#fffaf3] px-4 py-4">
                <p className="text-sm font-semibold text-slate-950">Approval lane</p>
                <p className="mt-2 text-sm text-slate-600">
                  {draftCount
                    ? `${(draftCount || 0).toLocaleString("id-ID")} campaign masih menunggu approval marketing manager atau superadmin.`
                    : "Tidak ada campaign yang menunggu approval saat ini."}
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
                <option value="approved">Approved</option>
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

        <section className="rounded-[24px] border border-[#f3dbc3] bg-white/85 p-5 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur-sm sm:rounded-[32px] sm:p-6">
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500">Legend status</p>
            <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-700">
              Review
            </span>
            <span className="text-sm text-slate-500">Draft yang menunggu approval.</span>
            <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-700">
              Ready
            </span>
            <span className="text-sm text-slate-500">Sudah disetujui dan siap dikirim.</span>
            <span className="inline-flex rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-sky-700">
              Sent
            </span>
            <span className="text-sm text-slate-500">Sudah keluar ke subscriber aktif.</span>
          </div>
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
            campaigns.map((campaign) => {
              const statusMeta = getCampaignStatusMeta(campaign.status)
              const progress = getDeliveryProgress(campaign)
              const failedDeliveryCount = failedDeliveryCountMap.get(campaign.id) || 0

              return (
              <article key={campaign.id} className="rounded-[24px] border border-[#f3dbc3] bg-white/85 p-5 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur-sm sm:rounded-[32px] sm:p-6 lg:p-7">
                <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-orange-500">Existing campaign</p>
                    <h2 className="mt-2 text-xl font-semibold text-slate-950">{campaign.title}</h2>
                    <p className="mt-2 text-sm text-slate-500">Subject: {campaign.subject}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <span className={`inline-flex rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] ${statusMeta.tone}`}>
                        {statusMeta.label}
                      </span>
                      <span className="text-sm text-slate-500">
                        Audience: {progress.audience.toLocaleString("id-ID")} | Sent: {progress.sent.toLocaleString("id-ID")}
                      </span>
                    </div>
                    <div className="mt-3 max-w-xl">
                      <div className="flex items-center justify-between gap-3 text-xs text-slate-500">
                        <span>Delivery progress</span>
                        <span>{progress.percent}%</span>
                      </div>
                      <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-200">
                        <div
                          className={`h-full rounded-full transition-all ${
                            progress.percent >= 100 ? "bg-sky-500" : progress.sent > 0 ? "bg-emerald-500" : "bg-amber-400"
                          }`}
                          style={{ width: `${progress.percent}%` }}
                        />
                      </div>
                      <p className="mt-2 text-xs text-slate-500">
                        {progress.audience > 0
                          ? progress.remaining > 0
                            ? `${progress.sent.toLocaleString("id-ID")} dari ${progress.audience.toLocaleString("id-ID")} subscriber sudah sukses terkirim. ${progress.remaining.toLocaleString("id-ID")} sisanya akan dilanjutkan saat retry berikutnya.`
                            : `Seluruh ${progress.audience.toLocaleString("id-ID")} subscriber aktif sudah sukses menerima campaign ini.`
                          : "Progress pengiriman akan muncul setelah campaign mulai dikirim ke audience aktif."}
                      </p>
                      {failedDeliveryCount > 0 ? (
                        <p className="mt-2 text-xs font-medium text-rose-600">
                          Failed retry saat ini: {failedDeliveryCount.toLocaleString("id-ID")} email masih menunggu attempt berikutnya.
                        </p>
                      ) : null}
                    </div>
                    <p className="mt-2 text-sm text-slate-500">
                      Approval:{" "}
                      {campaign.approved_at
                        ? `${approverMap.get(String(campaign.approved_by || "")) || "Manager"} pada ${formatDateTime(campaign.approved_at)}`
                        : "-"}
                    </p>
                    <p className="mt-2 text-sm text-slate-500">Last sent: {formatDateTime(campaign.last_sent_at)}</p>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {String(campaign.status || "draft") === "draft" && canApproveAndSend ? (
                      <form action={approveMarketingNewsletterCampaign}>
                        <input type="hidden" name="campaign_id" value={campaign.id} />
                        <input type="hidden" name="return_to" value={basePath} />
                        <button className="rounded-[16px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700 transition hover:bg-amber-100">
                          Setujui campaign
                        </button>
                      </form>
                    ) : null}
                    {String(campaign.status || "draft") === "approved" && canApproveAndSend ? (
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
                {!canApproveAndSend && String(campaign.status || "draft") === "draft" ? (
                  <div className="mb-4 rounded-[18px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                    Campaign ini menunggu approval marketing manager atau superadmin sebelum bisa dikirim.
                  </div>
                ) : null}
                <CampaignForm campaign={campaign} />
              </article>
            )})
          )}
        </section>
      </div>
    </main>
  )
}

function CampaignForm({ campaign }: { campaign?: CampaignRow }) {
  const status = String(campaign?.status || "draft")
  const isLocked = status === "sent"
  const approvalResetNote = status === "approved"

  return (
    <form action={upsertMarketingNewsletterCampaign} className="grid gap-4">
      <input type="hidden" name="campaign_id" value={campaign?.id || ""} />
      <input type="hidden" name="return_to" value="/marketing/email-campaigns" />

      {isLocked ? (
        <div className="rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          Campaign yang sudah terkirim dikunci sebagai arsip pengiriman dan tidak bisa diubah lagi.
        </div>
      ) : null}
      {approvalResetNote ? (
        <div className="rounded-[18px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Perubahan pada campaign yang sudah disetujui akan mengembalikannya ke draft agar bisa di-approve ulang.
        </div>
      ) : null}

      <FormSection
        eyebrow={campaign ? "Edit campaign" : "Campaign identity"}
        title={campaign ? "Rapikan campaign email yang sudah ada" : "Mulai dari identitas dan subject email"}
        description="Judul internal membantu tim marketing, sedangkan subject dan preview text akan dibaca subscriber saat email masuk."
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Field label="Judul campaign" name="title" defaultValue={campaign?.title || ""} disabled={isLocked} />
          <Field label="Subject email" name="subject" defaultValue={campaign?.subject || ""} disabled={isLocked} />
          <Field label="Preview text" name="preview_text" defaultValue={campaign?.preview_text || ""} required={false} disabled={isLocked} />
        </div>
      </FormSection>

      <FormSection
        eyebrow="Body content"
        title="Tulis isi email dalam HTML dan teks pendamping"
        description="Body HTML menjadi versi utama email. Body text dipakai sebagai fallback teks polos bila dibutuhkan."
      >
        <div className="grid gap-4 xl:grid-cols-2">
          <TextArea label="Body HTML" name="body_html" rows={12} defaultValue={campaign?.body_html || ""} disabled={isLocked} />
          <TextArea label="Body text" name="body_text" rows={12} defaultValue={campaign?.body_text || ""} required={false} disabled={isLocked} />
        </div>
      </FormSection>

      <button
        disabled={isLocked}
        className="w-fit rounded-[18px] bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
      >
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
  disabled = false,
}: {
  label: string
  name: string
  defaultValue: string
  required?: boolean
  disabled?: boolean
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-slate-700">{label}</label>
      <input
        name={name}
        required={required}
        defaultValue={defaultValue}
        disabled={disabled}
        className="w-full rounded-[18px] border border-[#e6d8c2] bg-[#fffdf9] px-4 py-3 text-sm outline-none ring-orange-500 transition focus:ring-2 disabled:cursor-not-allowed disabled:bg-slate-100"
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
  disabled = false,
}: {
  label: string
  name: string
  defaultValue: string
  rows: number
  required?: boolean
  disabled?: boolean
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-slate-700">{label}</label>
      <textarea
        name={name}
        required={required}
        defaultValue={defaultValue}
        rows={rows}
        disabled={disabled}
        className="w-full rounded-[18px] border border-[#e6d8c2] bg-[#fffdf9] px-4 py-3 text-sm outline-none ring-orange-500 transition focus:ring-2 disabled:cursor-not-allowed disabled:bg-slate-100"
      />
    </div>
  )
}
