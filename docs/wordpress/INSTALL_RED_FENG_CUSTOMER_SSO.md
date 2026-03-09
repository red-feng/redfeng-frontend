# Install RedFeng Customer SSO Plugin

## 1. Prepare app side first

Required on `app.redfeng.co`:

- run Supabase migration:
  - [20260308_create_sso_tokens.sql](/c:/Users/UsEr/redfeng-frontend/supabase/migrations/20260308_create_sso_tokens.sql)
- set Vercel env:
  - `WORDPRESS_SITE_URL=https://www.redfeng.co`
  - `WORDPRESS_SSO_SHARED_SECRET=<same_secret_as_wordpress_plugin>`
  - `WORDPRESS_SSO_LOGIN_PATH=/rf-sso-login`

## 2. Install plugin in WordPress

File:

- [redfeng-customer-sso.php](/c:/Users/UsEr/redfeng-frontend/docs/wordpress/redfeng-customer-sso.php)

Steps:

1. Copy that file into:

```text
wp-content/plugins/redfeng-customer-sso/redfeng-customer-sso.php
```

2. Edit constants at the top:
   - `RF_SSO_APP_URL`
   - `RF_SSO_SHARED_SECRET`
   - `RF_SSO_LOGIN_PATH`

Recommended values for your current setup:

```php
define('RF_SSO_APP_URL', 'https://app.redfeng.co');
define('RF_SSO_SHARED_SECRET', '9f3a7e8b4c1d6a9e2f7c5d8b1a3e6f4c');
define('RF_SSO_LOGIN_PATH', 'rf-sso-login');
define('RF_SSO_WORDPRESS_ACCOUNT_PATH', '/akun-saya');
define('RF_SSO_AUTO_MENU_ENABLED', false);
```

Important:
- in WordPress plugin use `rf-sso-login`
- in Vercel env use `/rf-sso-login`
- they represent the same endpoint path
- `RF_SSO_AUTO_MENU_ENABLED = false` is recommended for Elementor headers that already place auth buttons via shortcode
- `RF_SSO_WORDPRESS_ACCOUNT_PATH` stays on `/akun-saya` as the symbolic customer target, but successful SSO will send that target to `https://app.redfeng.co/customer/dashboard`

3. Activate the plugin in WordPress admin

## 3. Add login/register links in WordPress

Use these shortcode helpers in menus, buttons, or templates:

- Login URL:

```text
[rf_customer_login_url redirect_to="/akun-saya"]
```

- Register URL:

```text
[rf_customer_register_url redirect_to="/akun-saya"]
```

Or directly link to app URLs generated with the same pattern.

## 3a. Automatic menu injection

By default the plugin now tries to append:

- `Login`
- `Register`
- `Akun Saya`
- `Logout`

to common WordPress header menus with theme locations:

- `primary`
- `main-menu`
- `header-menu`

If your theme does not use one of those locations:

1. keep using shortcode:
   - `[rf_customer_auth_links redirect_to="/akun-saya"]`
2. or change the plugin logic for your actual menu location

If your theme already renders its own auth buttons, disable auto injection:

```php
define('RF_SSO_AUTO_MENU_ENABLED', false);
```

## 4. Flush rewrite rules

If `/rf-sso-login` returns 404 after activation:

1. Open `Settings > Permalinks`
2. Click `Save Changes`

## 5. Test flow

1. Open WordPress page with login link
2. Click login
3. Complete login on `app.redfeng.co`
4. Confirm browser returns to:

```text
https://www.redfeng.co/rf-sso-login?token=...
```

5. Confirm WordPress logs in the customer
6. Confirm redirect lands on `https://app.redfeng.co/customer/dashboard`
7. Confirm WordPress header now shows:
   - before login: `Login`, `Register`
   - after login: `Akun Saya`, `Logout`

## Notes

- Plugin maps users by `supabase_user_id`
- Fallback is `email`
- Password is not synchronized
- Token is one-time and expires in 5 minutes
