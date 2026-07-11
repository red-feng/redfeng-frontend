# Vercel Production Environment Variables

Set these variables in the Vercel project that serves `redfeng.co`.

Template reference:

- [production-env.template.txt](/c:/Users/UsEr/redfeng-frontend/docs/vercel/production-env.template.txt)

## Required

- `NEXT_PUBLIC_SUPABASE_URL`
  - Supabase project URL.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - Supabase anon/public key.
- `SUPABASE_SERVICE_ROLE_KEY`
  - Required by server-side routes and admin actions.
- `MIDTRANS_SERVER_KEY`
  - Required by payment creation and webhook routes.
- `KOPRA_REFUND_API_URL`
  - Required if finance refund should execute manual bank transfer automatically.
- `KOPRA_STATUS_API_URL`
  - Required if finance refund should sync manual bank transfer status automatically.

## Optional but expected in production

- `NEXT_PUBLIC_APP_URL`
  - Public app base URL, for example `https://app.your-new-domain.com`.
- `APP_URL`
  - Server-side app base URL. Keep aligned with `NEXT_PUBLIC_APP_URL`.
- `NEXT_PUBLIC_SITE_URL`
  - Public marketing/site base URL, for example `https://your-new-domain.com`.
- `SITE_URL`
  - Server-side site base URL. Keep aligned with `NEXT_PUBLIC_SITE_URL`.
- `NEXT_PUBLIC_COOKIE_DOMAIN`
  - Optional public cookie domain override, for example `.your-new-domain.com`.
- `COOKIE_DOMAIN`
  - Server-side cookie domain override, used when app and website should share cookies across subdomains.
- `NEXT_PUBLIC_CONTACT_EMAIL`
  - Public contact email shown on customer-facing pages.
- `CONTACT_EMAIL`
  - Server-side fallback public contact email.
- `NEXT_PUBLIC_PRIVACY_CONTACT_EMAIL`
  - Public privacy/data-request email shown on legal pages.
- `PRIVACY_CONTACT_EMAIL`
  - Server-side fallback privacy/data-request email.
- `NEXT_PUBLIC_ADMIN_SUPPORT_EMAIL`
  - Public admin support email used by merchant help widgets.
- `ADMIN_SUPPORT_EMAIL`
  - Server-side admin support email used by internal notifications.
- `NEXT_PUBLIC_MIDTRANS_CLIENT_KEY`
  - Required if Snap payment script is used on customer-facing checkout/payment pages.
- `RESEND_API_KEY`
  - Required if merchant verification email sending is enabled.
- `RESEND_FROM_EMAIL`
  - Expected sender for customer payment confirmation, invoice email, and newsletter email, for example `Red Feng <hello@your-new-domain.com>`.
- `RESEND_ADMIN_FROM_EMAIL`
  - Expected sender for admin or merchant-review emails, for example `RedFeng Admin <admin@your-new-domain.com>`.
- `CRON_SECRET`
  - Recommended to protect scheduled cleanup endpoints such as abandoned draft booking cleanup.
- `WORDPRESS_SITE_URL`
  - Required if customer SSO between `www.redfeng.co` and `redfeng.co` is enabled.
- `WORDPRESS_SSO_SHARED_SECRET`
  - Required for secure token exchange between WordPress and Next.js app.
- `WORDPRESS_SSO_LOGIN_PATH`
  - Optional custom WordPress callback path. Default is `/rf-sso-login`.
- `NEXT_PUBLIC_AUTH_ENABLE_GOOGLE`
  - Optional. Default enabled unless explicitly set to `false`.
- `NEXT_PUBLIC_AUTH_ENABLE_FACEBOOK`
  - Optional. Set `true` only after Facebook provider is enabled in Supabase.
- `MIDTRANS_IS_PRODUCTION`
  - Optional. Defaults to production unless explicitly set to `false`.
- `KOPRA_API_TOKEN`
  - Optional bearer token for Kopra or internal refund bridge.
- `KOPRA_API_KEY`
  - Optional API key header for Kopra or internal refund bridge.

## Verification checklist

1. Open Vercel project settings.
2. Go to `Environment Variables`.
3. Confirm all required values exist in `Production`.
4. Confirm `CRON_SECRET` is set in `Production` if scheduled cleanup endpoints are enabled.
5. Verify `vercel.json` includes cron jobs for `/api/cron/cleanup-booking-drafts`, `/api/cron/cleanup-commerce-chat-retention`, `/api/cron/cleanup-expired-merchant-revisions`, and `/api/cron/purge-deleted-commerce-chat-threads` when production cleanup is enabled.
6. Redeploy after adding or changing any variable or cron configuration.
7. Validate on the Vercel deployment URL, not localhost.

## Active cron schedule

- `/api/cron/cleanup-booking-drafts`
  - Runs from `vercel.json` schedule `5 17 * * *` (around `00:05 WIB` each day).
  - Deletes expired draft bookings and H-3 overdue unpaid bookings, including related payment and participant records.
- `/api/cron/cleanup-commerce-chat-retention`
  - Runs from `vercel.json` schedule `15 17 * * *` (around `00:15 WIB` each day).
  - Removes old commerce-chat attachments via Storage API first, then cleans message rows older than six months.
- `/api/cron/cleanup-expired-merchant-revisions`
  - Runs from `vercel.json` schedule `20 17 * * *` (around `00:20 WIB` each day).
  - Purges expired merchant revision records and related merchant documents.
- `/api/cron/purge-deleted-commerce-chat-threads`
  - Runs from `vercel.json` schedule `35 17 * * *` (around `00:35 WIB` each day).
  - Removes deleted-thread attachments via Storage API first, then purges soft-deleted commerce chat rows whose `purge_after_at` has passed.

## Symptoms of missing variables

- Missing `NEXT_PUBLIC_SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - Auth, middleware/proxy, public data loading, and merchant pages fail.
- Missing `SUPABASE_SERVICE_ROLE_KEY`
  - Booking creation, payout, reviews, admin actions, and protected server data fail.
- Missing `MIDTRANS_SERVER_KEY`
  - Payment creation or payment webhook fails.
- Missing `KOPRA_REFUND_API_URL`
  - Finance can record refund manually but automatic bank transfer execution will not run.
- Missing `KOPRA_STATUS_API_URL`
  - Finance cannot sync transfer completion/failure automatically from bank bridge.
- Missing `NEXT_PUBLIC_MIDTRANS_CLIENT_KEY`
  - Snap script will not load on the frontend.
- Missing `RESEND_API_KEY`
  - Merchant pending email route returns `Email service not configured`.
- Missing `RESEND_FROM_EMAIL`
  - Payment emails may fall back to the default sender and fail if that sender is not verified in Resend.
- Missing `CRON_SECRET`
  - Scheduled cleanup endpoints can be called without a shared secret.
- Missing or disabled `NEXT_PUBLIC_AUTH_ENABLE_FACEBOOK`
  - Facebook button stays hidden on login/register pages.
- Enabled frontend provider flag without enabling the same provider in Supabase
  - OAuth redirect returns `Unsupported provider: provider is not enabled`.
