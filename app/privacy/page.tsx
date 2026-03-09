import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Privacy Policy | RedFeng Travel",
  description: "Privacy Policy for RedFeng Travel customer accounts and services.",
  alternates: {
    canonical: "/privacy",
  },
}

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-slate-100 px-4 py-10 text-slate-900">
      <div className="mx-auto max-w-4xl rounded-3xl bg-white p-8 shadow-sm">
        <div className="mb-8 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-sky-700">
              RedFeng Travel
            </p>
            <h1 className="mt-2 text-3xl font-bold">Privacy Policy</h1>
            <p className="mt-2 text-sm text-slate-600">Last updated: March 10, 2026</p>
          </div>
          <Link href="/" className="text-sm font-semibold text-sky-700 hover:text-sky-800">
            Back to home
          </Link>
        </div>

        <div className="space-y-8 text-sm leading-7 text-slate-700">
          <section>
            <h2 className="text-lg font-semibold text-slate-950">Overview</h2>
            <p className="mt-2">
              RedFeng Travel collects and processes personal information to provide account
              access, booking services, customer support, and service improvements across
              `app.redfeng.co` and connected services.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-950">Information We Collect</h2>
            <p className="mt-2">
              We may collect your name, email address, phone number, authentication profile,
              booking details, payment-related metadata, device information, and usage logs.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-950">How We Use Information</h2>
            <p className="mt-2">
              We use personal information to create and secure your account, process bookings,
              communicate about orders and support requests, prevent abuse, comply with legal
              obligations, and improve our products and operations.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-950">Third-Party Services</h2>
            <p className="mt-2">
              We may rely on third-party providers such as Supabase, payment processors, email
              services, analytics tools, and social login providers like Google or Facebook to
              operate the service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-950">Data Retention</h2>
            <p className="mt-2">
              We retain personal data only as long as needed for active services, compliance,
              dispute resolution, fraud prevention, and legitimate business recordkeeping.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-950">Your Rights</h2>
            <p className="mt-2">
              You may request access, correction, or deletion of your customer account data
              subject to legal and operational requirements.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-950">Data Deletion Requests</h2>
            <p className="mt-2">
              To request account deletion or personal data removal, contact us at{" "}
              <a className="font-semibold text-sky-700 hover:text-sky-800" href="mailto:jenovacinfinityroyal@gmail.com">
                jenovacinfinityroyal@gmail.com
              </a>{" "}
              with the subject `Data Deletion Request`. We may verify account ownership before
              processing the request.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-950">Contact</h2>
            <p className="mt-2">
              For privacy questions, contact{" "}
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
