import type { Metadata } from "next"
import Link from "next/link"
import { homeLayoutLock } from "@/app/components/home/shared/homeLayoutLock"
import { getAppHost, getSiteBaseUrl, getSiteHost } from "@/lib/site-config"

export const metadata: Metadata = {
  title: "Privacy Policy | Red Feng",
  description: "Privacy Policy for Red Feng customer accounts and services.",
  alternates: {
    canonical: "/privacy",
  },
}

const appHost = getAppHost()
const siteBaseUrl = getSiteBaseUrl()
const siteHost = getSiteHost()

const sections = [
  {
    title: "Overview",
    body: `Red Feng collects and processes personal information to provide account access, booking services, customer support, fraud prevention, and service improvements across ${appHost} and connected customer journeys.`,
  },
  {
    title: "Information We Collect",
    body: "We may collect your name, email address, phone number, authentication profile, booking details, payment-related metadata, device information, and activity logs required to operate the service securely.",
  },
  {
    title: "How We Use Information",
    body: "We use personal information to create and secure your account, process bookings, communicate about transactions, respond to support issues, comply with legal obligations, and improve product quality.",
  },
  {
    title: "Third-Party Services",
    body: "We may rely on third-party providers such as Supabase, payment processors, email services, analytics tools, and social login providers like Google or Facebook to operate parts of the platform.",
  },
  {
    title: "Data Retention",
    body: "We retain personal data only as long as needed for active services, compliance, fraud prevention, dispute handling, and legitimate business recordkeeping.",
  },
  {
    title: "Your Rights",
    body: "You may request access, correction, or deletion of your account data, subject to legal obligations, fraud prevention controls, and operational requirements.",
  },
  {
    title: "Data Deletion Requests",
    body: "To request account deletion or personal data removal, email hello@redfeng.co with the subject Data Deletion Request. We may verify account ownership before processing the request.",
  },
  {
    title: "Contact",
    body: "For privacy questions or account data requests, contact hello@redfeng.co.",
  },
]

export default function PrivacyPage() {
  return (
    <main className={`relative min-h-screen overflow-hidden bg-[#f6f3ee] ${homeLayoutLock.pageXClass} py-8 md:py-10`}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(251,146,60,0.2),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(194,65,12,0.14),_transparent_24%),linear-gradient(180deg,#fbf7f1_0%,#f4efe8_100%)]" />
      <div className="absolute left-[-7rem] top-24 h-72 w-72 rounded-full bg-orange-200/40 blur-3xl" />
      <div className="absolute bottom-0 right-[-6rem] h-80 w-80 rounded-full bg-amber-100/80 blur-3xl" />

      <div
        className={`relative ${homeLayoutLock.contentWidthClass} overflow-hidden ${homeLayoutLock.cardRadiusClass} border border-white/70 bg-white shadow-[0_30px_120px_rgba(95,45,12,0.12)]`}
      >
        <section className="grid gap-8 bg-[linear-gradient(145deg,#a84316_0%,#d86118_30%,#ef7f1a_58%,#f6b14f_100%)] px-6 py-8 text-white md:grid-cols-[1.1fr_0.9fr] md:px-10 md:py-10">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-orange-50/80">
              Red Feng
            </p>
            <h1 className="mt-4 max-w-2xl text-3xl font-semibold leading-tight md:text-5xl">
              Privacy Policy for customer accounts, bookings, and connected services.
            </h1>
            <p className="mt-5 max-w-xl text-sm leading-7 text-orange-50/90 md:text-base">
              This page explains what data Red Feng collects, why it is used, how long it may be
              retained, and how customers can request access or deletion.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-[26px] border border-white/16 bg-white/12 p-5 backdrop-blur">
              <p className="text-xs uppercase tracking-[0.22em] text-orange-50/70">Scope</p>
              <p className="mt-3 text-2xl font-semibold">Account + booking data</p>
              <p className="mt-2 text-sm text-orange-50/85">
                Covers sign-in, traveler identity, booking flows, and customer support records.
              </p>
            </div>
            <div className="rounded-[26px] border border-white/16 bg-white/12 p-5 backdrop-blur">
              <p className="text-xs uppercase tracking-[0.22em] text-orange-50/70">Requests</p>
              <p className="mt-3 text-2xl font-semibold">Email-based verification</p>
              <p className="mt-2 text-sm text-orange-50/85">
                Data deletion requests may require proof of account ownership before execution.
              </p>
            </div>
          </div>
        </section>

        <section className="grid gap-8 bg-[linear-gradient(180deg,#fffdfa_0%,#fff7ef_100%)] px-6 py-8 md:grid-cols-[0.76fr_1.24fr] md:px-10 md:py-10">
          <aside className="space-y-5">
            <div className="rounded-[28px] border border-[#f1e4d5] bg-white p-6 shadow-[0_18px_50px_rgba(95,45,12,0.07)]">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-orange-700">
                Legal Summary
              </p>
              <div className="mt-5 space-y-4 text-sm leading-7 text-slate-600">
                <p>
                  Last updated: <span className="font-semibold text-slate-950">March 10, 2026</span>
                </p>
                <p>
                  Data controller contact:
                  <br />
                  <a className="font-semibold text-orange-700 hover:text-orange-800" href="mailto:hello@redfeng.co">
                    hello@redfeng.co
                  </a>
                </p>
                <p>
                  This policy applies to customer-facing activity on{" "}
                  <span className="font-semibold text-slate-950">{siteHost}</span>.
                </p>
              </div>
            </div>

            <div className="rounded-[28px] border border-[#f3e7da] bg-[#fff9f2] p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-orange-700">
                Quick Links
              </p>
              <div className="mt-4 grid gap-3 text-sm">
                <Link href={siteBaseUrl} className="font-semibold text-slate-800 hover:text-orange-700">
                  Back to home
                </Link>
                <Link href="/terms" className="font-semibold text-slate-800 hover:text-orange-700">
                  View Terms of Service
                </Link>
              </div>
            </div>
          </aside>

          <div className="rounded-[32px] border border-[#f1e4d5] bg-white p-6 shadow-[0_20px_60px_rgba(95,45,12,0.07)] md:p-8">
            <div className="mb-8 flex flex-col gap-4 border-b border-slate-100 pb-6 md:flex-row md:items-end md:justify-between">
              <div>
                <div className="inline-flex rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.26em] text-orange-700">
                  Privacy Policy
                </div>
                <h2 className="mt-4 text-3xl font-semibold text-slate-950">How Red Feng handles personal data</h2>
              </div>
              <Link href={siteBaseUrl} className="text-sm font-semibold text-orange-700 hover:text-orange-800">
                Back to home
              </Link>
            </div>

            <div className="space-y-5">
              {sections.map((section, index) => (
                <section
                  key={section.title}
                  className="rounded-[24px] border border-slate-100 bg-[linear-gradient(180deg,#ffffff_0%,#fffdf9_100%)] p-5"
                >
                  <div className="flex items-start gap-4">
                    <div className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-orange-50 text-sm font-semibold text-orange-700">
                      {String(index + 1).padStart(2, "0")}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-slate-950">{section.title}</h3>
                      <p className="mt-2 text-sm leading-7 text-slate-600">{section.body}</p>
                    </div>
                  </div>
                </section>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
