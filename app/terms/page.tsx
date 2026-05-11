import type { Metadata } from "next"
import Link from "next/link"
import { homeLayoutLock } from "@/app/components/home/shared/homeLayoutLock"

export const metadata: Metadata = {
  title: "Terms of Service | Red Feng",
  description: "Terms of Service for using Red Feng websites and customer accounts.",
  alternates: {
    canonical: "/terms",
  },
}

const sections = [
  {
    title: "Acceptance of Terms",
    body: "By accessing or using Red Feng services, you agree to these Terms of Service and any related policies published on this website.",
  },
  {
    title: "Accounts",
    body: "You are responsible for maintaining accurate account information and for activity performed through your account. Accounts involved in abuse, fraud, or policy violations may be suspended.",
  },
  {
    title: "Bookings and Payments",
    body: "Travel products, prices, availability, payment terms, cancellations, and refund conditions may vary by package, merchant, and the booking terms shown at checkout.",
  },
  {
    title: "Acceptable Use",
    body: "You must not misuse the service, interfere with platform operations, attempt unauthorized access, submit fraudulent information, or violate applicable laws or third-party rights.",
  },
  {
    title: "Third-Party Integrations",
    body: "Parts of the service may depend on third-party providers including authentication services, payment processors, communication tools, and merchant-operated offerings with their own terms.",
  },
  {
    title: "Limitation of Liability",
    body: "To the extent permitted by law, Red Feng is not liable for indirect, incidental, special, or consequential damages resulting from use of the service or third-party offerings.",
  },
  {
    title: "Changes",
    body: "We may update these terms from time to time. Continued use of the service after changes are published means you accept the revised terms.",
  },
  {
    title: "Contact",
    body: "Questions about these terms can be sent to hello@redfeng.co.",
  },
]

export default function TermsPage() {
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
              Terms of Service for using Red Feng customer accounts and booking flows.
            </h1>
            <p className="mt-5 max-w-xl text-sm leading-7 text-orange-50/90 md:text-base">
              These terms define account responsibilities, booking limitations, acceptable use,
              and the boundaries of Red Feng services and third-party integrations.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-[26px] border border-white/16 bg-white/12 p-5 backdrop-blur">
              <p className="text-xs uppercase tracking-[0.22em] text-orange-50/70">Use</p>
              <p className="mt-3 text-2xl font-semibold">Customer-facing service terms</p>
              <p className="mt-2 text-sm text-orange-50/85">
                Applies to sign-in, bookings, support, transactions, and related digital services.
              </p>
            </div>
            <div className="rounded-[26px] border border-white/16 bg-white/12 p-5 backdrop-blur">
              <p className="text-xs uppercase tracking-[0.22em] text-orange-50/70">Updates</p>
              <p className="mt-3 text-2xl font-semibold">Policy may evolve</p>
              <p className="mt-2 text-sm text-orange-50/85">
                Continued use after revisions means you accept the latest published version.
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
                  Service contact:
                  <br />
                  <a className="font-semibold text-orange-700 hover:text-orange-800" href="mailto:hello@redfeng.co">
                    hello@redfeng.co
                  </a>
                </p>
                <p>
                  These terms govern customer use of{" "}
                  <span className="font-semibold text-slate-950">redfeng.co</span>.
                </p>
              </div>
            </div>

            <div className="rounded-[28px] border border-[#f3e7da] bg-[#fff9f2] p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-orange-700">
                Quick Links
              </p>
              <div className="mt-4 grid gap-3 text-sm">
                <Link href="https://redfeng.co/" className="font-semibold text-slate-800 hover:text-orange-700">
                  Back to home
                </Link>
                <Link href="/privacy" className="font-semibold text-slate-800 hover:text-orange-700">
                  View Privacy Policy
                </Link>
              </div>
            </div>
          </aside>

          <div className="rounded-[32px] border border-[#f1e4d5] bg-white p-6 shadow-[0_20px_60px_rgba(95,45,12,0.07)] md:p-8">
            <div className="mb-8 flex flex-col gap-4 border-b border-slate-100 pb-6 md:flex-row md:items-end md:justify-between">
              <div>
                <div className="inline-flex rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.26em] text-orange-700">
                  Terms of Service
                </div>
                <h2 className="mt-4 text-3xl font-semibold text-slate-950">Service rules and account responsibilities</h2>
              </div>
              <Link href="https://redfeng.co/" className="text-sm font-semibold text-orange-700 hover:text-orange-800">
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
