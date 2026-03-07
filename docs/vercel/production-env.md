# Vercel Production Environment Variables

Set these variables in the Vercel project that serves `app.redfeng.co`.

## Required

- `NEXT_PUBLIC_SUPABASE_URL`
  - Supabase project URL.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - Supabase anon/public key.
- `SUPABASE_SERVICE_ROLE_KEY`
  - Required by server-side routes and admin actions.
- `MIDTRANS_SERVER_KEY`
  - Required by payment creation and webhook routes.

## Optional but expected in production

- `NEXT_PUBLIC_MIDTRANS_CLIENT_KEY`
  - Required if Snap payment script is used on customer-facing checkout/payment pages.
- `RESEND_API_KEY`
  - Required if merchant verification email sending is enabled.

## Verification checklist

1. Open Vercel project settings.
2. Go to `Environment Variables`.
3. Confirm all required values exist in `Production`.
4. Redeploy after adding or changing any variable.
5. Validate on the Vercel deployment URL, not localhost.

## Symptoms of missing variables

- Missing `NEXT_PUBLIC_SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - Auth, middleware/proxy, public data loading, and merchant pages fail.
- Missing `SUPABASE_SERVICE_ROLE_KEY`
  - Booking creation, payout, reviews, admin actions, and protected server data fail.
- Missing `MIDTRANS_SERVER_KEY`
  - Payment creation or payment webhook fails.
- Missing `NEXT_PUBLIC_MIDTRANS_CLIENT_KEY`
  - Snap script will not load on the frontend.
- Missing `RESEND_API_KEY`
  - Merchant pending email route returns `Email service not configured`.
