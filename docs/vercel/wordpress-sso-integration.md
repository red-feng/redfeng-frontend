# WordPress Customer SSO Integration

`app.redfeng.co` is the customer auth source of truth.
`www.redfeng.co` should not maintain a separate customer password flow.

## Required Vercel env

- `WORDPRESS_SITE_URL`
  - Example: `https://www.redfeng.co`
- `WORDPRESS_SSO_SHARED_SECRET`
  - Shared secret used by WordPress server when exchanging SSO tokens
- `WORDPRESS_SSO_LOGIN_PATH` (optional)
  - Default: `/rf-sso-login`

## Required Supabase migration

Run:

- [20260308_create_sso_tokens.sql](/c:/Users/UsEr/redfeng-frontend/supabase/migrations/20260308_create_sso_tokens.sql)

## Next.js endpoints

- Issue WordPress SSO token:
  - `GET /api/sso/wordpress/issue?redirect_to=/akun-saya`
- Exchange WordPress SSO token:
  - `POST /api/sso/wordpress/exchange`
  - Header: `x-rf-sso-secret: <WORDPRESS_SSO_SHARED_SECRET>`
  - Body:

```json
{
  "token": "raw_sso_token"
}
```

## Browser flow from WordPress to app auth

Use these URLs from WordPress buttons:

- Login:

```text
https://app.redfeng.co/login?next=%2Fapi%2Fsso%2Fwordpress%2Fissue%3Fredirect_to%3D%2Fmy-account
```

- Register:

```text
https://app.redfeng.co/register?next=%2Fapi%2Fsso%2Fwordpress%2Fissue%3Fredirect_to%3D%2Fmy-account
```

Meaning:
- customer authenticates in `app.redfeng.co`
- after login/register, app redirects to `/api/sso/wordpress/issue`
- app creates a one-time token
- app redirects browser back to WordPress callback path:
  - `https://www.redfeng.co/rf-sso-login?token=...&redirect_to=/akun-saya`

## What WordPress must do

Create a custom endpoint/page handler at:

```text
/rf-sso-login
```

That handler must:

1. Read `token` and `redirect_to` from query params
2. Server-side `POST` to:

```text
https://app.redfeng.co/api/sso/wordpress/exchange
```

3. Send header:

```text
x-rf-sso-secret: <WORDPRESS_SSO_SHARED_SECRET>
```

4. If response succeeds:
   - find WP user by `supabase_user_id` user meta or `email`
   - create user if missing
   - update user meta:
     - `supabase_user_id`
     - `phone_number`
   - log in the WP user with standard WP auth
   - redirect to `redirect_to`

## Exchange response shape

```json
{
  "user_id": "supabase-user-id",
  "email": "customer@example.com",
  "full_name": "Customer Name",
  "phone_number": "08123456789",
  "role": "customer",
  "redirect_to": "/akun-saya"
}
```

## Security notes

- Tokens are one-time use
- Tokens expire after 5 minutes
- WordPress must call exchange from the server, not from browser JS
- Keep `WORDPRESS_SSO_SHARED_SECRET` only on server-side

## Recommended WordPress user mapping

- Primary key:
  - `supabase_user_id`
- Fallback:
  - `email`

Do not sync passwords from Supabase into WordPress.

## Ready-made WordPress plugin template

Files provided in this repo:

- [redfeng-customer-sso.php](/c:/Users/UsEr/redfeng-frontend/docs/wordpress/redfeng-customer-sso.php)
- [INSTALL_RED_FENG_CUSTOMER_SSO.md](/c:/Users/UsEr/redfeng-frontend/docs/wordpress/INSTALL_RED_FENG_CUSTOMER_SSO.md)

This plugin:
- receives `/rf-sso-login`
- exchanges token to `app.redfeng.co`
- creates or updates WP customer user
- logs customer into WordPress
- redirects to the requested page
