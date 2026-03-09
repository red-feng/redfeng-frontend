import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Terms of Service | RedFeng Travel",
  description: "Terms of Service for using RedFeng Travel websites and customer accounts.",
  alternates: {
    canonical: "/terms",
  },
}

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-slate-100 px-4 py-10 text-slate-900">
      <div className="mx-auto max-w-4xl rounded-3xl bg-white p-8 shadow-sm">
        <div className="mb-8 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-sky-700">
              RedFeng Travel
            </p>
            <h1 className="mt-2 text-3xl font-bold">Terms of Service</h1>
            <p className="mt-2 text-sm text-slate-600">Last updated: March 10, 2026</p>
          </div>
          <Link href="/" className="text-sm font-semibold text-sky-700 hover:text-sky-800">
            Back to home
          </Link>
        </div>

        <div className="space-y-8 text-sm leading-7 text-slate-700">
          <section>
            <h2 className="text-lg font-semibold text-slate-950">Acceptance of Terms</h2>
            <p className="mt-2">
              By accessing or using RedFeng Travel services, you agree to these Terms of Service
              and any related policies referenced on this site.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-950">Accounts</h2>
            <p className="mt-2">
              You are responsible for maintaining accurate account information and for activity
              performed through your account. We may suspend accounts involved in abuse, fraud,
              or policy violations.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-950">Bookings and Payments</h2>
            <p className="mt-2">
              Travel products, pricing, availability, payment terms, cancellations, and refunds
              may vary by package, merchant, or booking terms presented at checkout.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-950">Acceptable Use</h2>
            <p className="mt-2">
              You must not misuse the service, interfere with platform operations, attempt
              unauthorized access, submit fraudulent information, or violate applicable laws.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-950">Third-Party Integrations</h2>
            <p className="mt-2">
              Some parts of the service depend on third-party providers, including authentication,
              payments, communications, and merchant-operated offerings. Their services may be
              subject to separate terms and policies.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-950">Limitation of Liability</h2>
            <p className="mt-2">
              To the extent permitted by law, RedFeng Travel is not liable for indirect,
              incidental, special, or consequential damages arising from use of the service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-950">Changes</h2>
            <p className="mt-2">
              We may update these terms from time to time. Continued use of the service after an
              update means you accept the revised terms.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-950">Contact</h2>
            <p className="mt-2">
              Questions about these terms can be sent to{" "}
              <a className="font-semibold text-sky-700 hover:text-sky-800" href="mailto:jenovacinfinityroyal@gmail.com">
                jenovacinfinityroyal@gmail.com
              </a>.
            </p>
          </section>
        </div>
      </div>
    </main>
  )
}
