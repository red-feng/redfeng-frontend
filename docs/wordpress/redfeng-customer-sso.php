<?php
/**
 * Plugin Name: RedFeng Customer SSO
 * Description: Customer SSO bridge between www.redfeng.co WordPress and app.redfeng.co Supabase auth.
 * Version: 1.0.0
 * Author: RedFeng
 */

if (!defined('ABSPATH')) {
    exit;
}

if (!defined('RF_SSO_APP_URL')) {
    define('RF_SSO_APP_URL', 'https://app.redfeng.co');
}

if (!defined('RF_SSO_SHARED_SECRET')) {
    define('RF_SSO_SHARED_SECRET', '9f3a7e8b4c1d6a9e2f7c5d8b1a3e6f4c');
}

if (!defined('RF_SSO_LOGIN_PATH')) {
    define('RF_SSO_LOGIN_PATH', 'rf-sso-login');
}

if (!defined('RF_SSO_DEFAULT_REDIRECT')) {
    define('RF_SSO_DEFAULT_REDIRECT', '/akun-saya');
}

if (!defined('RF_SSO_WORDPRESS_ACCOUNT_PATH')) {
    define('RF_SSO_WORDPRESS_ACCOUNT_PATH', '/akun-saya');
}

if (!defined('RF_SSO_AUTO_MENU_ENABLED')) {
    define('RF_SSO_AUTO_MENU_ENABLED', true);
}

if (!defined('RF_SSO_BUTTON_PRIMARY_BG')) {
    define('RF_SSO_BUTTON_PRIMARY_BG', '#f97316');
}

if (!defined('RF_SSO_BUTTON_PRIMARY_TEXT')) {
    define('RF_SSO_BUTTON_PRIMARY_TEXT', '#ffffff');
}

if (!defined('RF_SSO_BUTTON_SECONDARY_BG')) {
    define('RF_SSO_BUTTON_SECONDARY_BG', '#ffffff');
}

if (!defined('RF_SSO_BUTTON_SECONDARY_TEXT')) {
    define('RF_SSO_BUTTON_SECONDARY_TEXT', '#0f172a');
}

function rf_sso_sanitize_redirect_path($path) {
    if (!$path || !is_string($path) || strpos($path, '/') !== 0) {
        return RF_SSO_DEFAULT_REDIRECT;
    }

    return $path;
}

function rf_sso_build_app_auth_url($mode = 'login', $redirect_to = '/akun-saya') {
    $redirect_to = rf_sso_sanitize_redirect_path($redirect_to);
    $next = '/api/sso/wordpress/issue?redirect_to=' . rawurlencode($redirect_to);
    $base = rtrim(RF_SSO_APP_URL, '/');
    $path = $mode === 'register' ? '/register' : '/login';

    return $base . $path . '?next=' . rawurlencode($next);
}

function rf_sso_get_wordpress_account_url() {
    return home_url(rf_sso_sanitize_redirect_path(RF_SSO_WORDPRESS_ACCOUNT_PATH));
}

function rf_sso_get_wordpress_logout_url() {
    return wp_logout_url(home_url('/'));
}

function rf_sso_upsert_wordpress_user($payload) {
    $supabase_user_id = sanitize_text_field($payload['user_id']);
    $email = sanitize_email($payload['email']);
    $full_name = sanitize_text_field($payload['full_name']);
    $phone_number = sanitize_text_field($payload['phone_number']);

    $existing_users = get_users(array(
        'meta_key' => 'supabase_user_id',
        'meta_value' => $supabase_user_id,
        'number' => 1,
        'count_total' => false,
        'fields' => 'all',
    ));

    if (!empty($existing_users)) {
        $user = $existing_users[0];
        wp_update_user(array(
            'ID' => $user->ID,
            'display_name' => $full_name ?: $user->display_name,
            'first_name' => $full_name,
            'user_email' => $email ?: $user->user_email,
        ));
        update_user_meta($user->ID, 'phone_number', $phone_number);
        return $user->ID;
    }

    if ($email && email_exists($email)) {
        $user = get_user_by('email', $email);
        if ($user) {
            update_user_meta($user->ID, 'supabase_user_id', $supabase_user_id);
            update_user_meta($user->ID, 'phone_number', $phone_number);
            wp_update_user(array(
                'ID' => $user->ID,
                'display_name' => $full_name ?: $user->display_name,
                'first_name' => $full_name,
            ));
            return $user->ID;
        }
    }

    $username_seed = $email ? current(explode('@', $email)) : 'customer';
    $username = sanitize_user($username_seed, true);
    if (!$username) {
        $username = 'customer';
    }
    $base_username = $username;
    $counter = 1;
    while (username_exists($username)) {
        $username = $base_username . $counter;
        $counter++;
    }

    $user_id = wp_insert_user(array(
        'user_login' => $username,
        'user_pass' => wp_generate_password(32, true, true),
        'user_email' => $email,
        'display_name' => $full_name ?: $username,
        'first_name' => $full_name,
        'role' => 'customer',
    ));

    if (is_wp_error($user_id)) {
        return $user_id;
    }

    update_user_meta($user_id, 'supabase_user_id', $supabase_user_id);
    update_user_meta($user_id, 'phone_number', $phone_number);

    return $user_id;
}

function rf_sso_exchange_token($token) {
    $response = wp_remote_post(rtrim(RF_SSO_APP_URL, '/') . '/api/sso/wordpress/exchange', array(
        'timeout' => 20,
        'headers' => array(
            'Content-Type' => 'application/json',
            'x-rf-sso-secret' => RF_SSO_SHARED_SECRET,
        ),
        'body' => wp_json_encode(array(
            'token' => $token,
        )),
    ));

    if (is_wp_error($response)) {
        return $response;
    }

    $status = wp_remote_retrieve_response_code($response);
    $body = json_decode(wp_remote_retrieve_body($response), true);

    if ($status < 200 || $status >= 300 || !is_array($body)) {
        return new WP_Error('rf_sso_exchange_failed', 'SSO exchange failed', array(
            'status' => $status,
            'body' => $body,
        ));
    }

    return $body;
}

function rf_sso_handle_login() {
    if (!isset($_GET['token'])) {
        return;
    }

    $token = sanitize_text_field(wp_unslash($_GET['token']));
    $requested_redirect = isset($_GET['redirect_to']) ? sanitize_text_field(wp_unslash($_GET['redirect_to'])) : RF_SSO_DEFAULT_REDIRECT;
    $requested_redirect = rf_sso_sanitize_redirect_path($requested_redirect);

    $payload = rf_sso_exchange_token($token);

    if (is_wp_error($payload)) {
        wp_die('Gagal melakukan SSO login customer.');
    }

    $user_id = rf_sso_upsert_wordpress_user($payload);

    if (is_wp_error($user_id)) {
        wp_die('Gagal membuat atau memperbarui user WordPress.');
    }

    wp_set_current_user($user_id);
    wp_set_auth_cookie($user_id, true);

    $redirect_to = isset($payload['redirect_to']) ? rf_sso_sanitize_redirect_path($payload['redirect_to']) : $requested_redirect;
    wp_safe_redirect(home_url($redirect_to));
    exit;
}
add_action('template_redirect', function () {
    global $wp;

    if (!isset($wp->request) || trim($wp->request, '/') !== RF_SSO_LOGIN_PATH) {
        return;
    }

    rf_sso_handle_login();
});

add_action('init', function () {
    add_rewrite_rule('^' . preg_quote(RF_SSO_LOGIN_PATH, '/') . '/?$', 'index.php?rf_sso_login=1', 'top');
});

add_filter('query_vars', function ($vars) {
    $vars[] = 'rf_sso_login';
    return $vars;
});

add_shortcode('rf_customer_login_url', function ($atts) {
    $atts = shortcode_atts(array(
        'redirect_to' => RF_SSO_DEFAULT_REDIRECT,
    ), $atts);

    return esc_url(rf_sso_build_app_auth_url('login', $atts['redirect_to']));
});

add_shortcode('rf_customer_register_url', function ($atts) {
    $atts = shortcode_atts(array(
        'redirect_to' => RF_SSO_DEFAULT_REDIRECT,
    ), $atts);

    return esc_url(rf_sso_build_app_auth_url('register', $atts['redirect_to']));
});

add_shortcode('rf_customer_auth_links', function ($atts) {
    $atts = shortcode_atts(array(
        'redirect_to' => RF_SSO_DEFAULT_REDIRECT,
        'class' => 'rf-customer-auth-links',
    ), $atts);

    $redirect_to = rf_sso_sanitize_redirect_path($atts['redirect_to']);
    $class = sanitize_html_class($atts['class']);

    if (is_user_logged_in()) {
        return sprintf(
            '<div class="%1$s rf-customer-auth-links"><a class="rf-sso-button rf-sso-button-primary" href="%2$s">Akun Saya</a><a class="rf-sso-button rf-sso-button-secondary" href="%3$s">Logout</a></div>',
            esc_attr($class),
            esc_url(rf_sso_get_wordpress_account_url()),
            esc_url(rf_sso_get_wordpress_logout_url())
        );
    }

    return sprintf(
        '<div class="%1$s rf-customer-auth-links"><a class="rf-sso-button rf-sso-button-secondary" href="%2$s">Login</a><a class="rf-sso-button rf-sso-button-primary" href="%3$s">Register</a></div>',
        esc_attr($class),
        esc_url(rf_sso_build_app_auth_url('login', $redirect_to)),
        esc_url(rf_sso_build_app_auth_url('register', $redirect_to))
    );
});

add_action('wp_head', function () {
    ?>
    <style id="rf-customer-sso-styles">
        .rf-customer-auth-links {
            display: flex;
            align-items: center;
            justify-content: flex-end;
            gap: 12px;
            flex-wrap: wrap;
        }

        .rf-customer-auth-links .rf-sso-button {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            min-height: 42px;
            padding: 10px 18px;
            border-radius: 12px;
            font-size: 14px;
            font-weight: 700;
            line-height: 1;
            text-decoration: none !important;
            transition: all 0.2s ease;
            border: 1px solid transparent;
            box-sizing: border-box;
            white-space: nowrap;
        }

        .rf-customer-auth-links .rf-sso-button-primary {
            background: <?php echo esc_html(RF_SSO_BUTTON_PRIMARY_BG); ?>;
            color: <?php echo esc_html(RF_SSO_BUTTON_PRIMARY_TEXT); ?> !important;
            border-color: <?php echo esc_html(RF_SSO_BUTTON_PRIMARY_BG); ?>;
        }

        .rf-customer-auth-links .rf-sso-button-primary:hover {
            filter: brightness(0.95);
            color: <?php echo esc_html(RF_SSO_BUTTON_PRIMARY_TEXT); ?> !important;
        }

        .rf-customer-auth-links .rf-sso-button-secondary {
            background: <?php echo esc_html(RF_SSO_BUTTON_SECONDARY_BG); ?>;
            color: <?php echo esc_html(RF_SSO_BUTTON_SECONDARY_TEXT); ?> !important;
            border-color: #cbd5e1;
        }

        .rf-customer-auth-links .rf-sso-button-secondary:hover {
            border-color: #94a3b8;
            color: <?php echo esc_html(RF_SSO_BUTTON_SECONDARY_TEXT); ?> !important;
        }
    </style>
    <?php
});

if (RF_SSO_AUTO_MENU_ENABLED) {
    add_filter('wp_nav_menu_items', function ($items, $args) {
        if (is_admin()) {
            return $items;
        }

        $theme_location = isset($args->theme_location) ? (string) $args->theme_location : '';
        if ($theme_location && !in_array($theme_location, array('primary', 'main-menu', 'header-menu'), true)) {
            return $items;
        }

        $auth_items = '';
        if (is_user_logged_in()) {
            $auth_items .= '<li class="menu-item menu-item-rf-account"><a href="' . esc_url(rf_sso_get_wordpress_account_url()) . '">Akun Saya</a></li>';
            $auth_items .= '<li class="menu-item menu-item-rf-logout"><a href="' . esc_url(rf_sso_get_wordpress_logout_url()) . '">Logout</a></li>';
        } else {
            $auth_items .= '<li class="menu-item menu-item-rf-login"><a href="' . esc_url(rf_sso_build_app_auth_url('login', RF_SSO_DEFAULT_REDIRECT)) . '">Login</a></li>';
            $auth_items .= '<li class="menu-item menu-item-rf-register"><a href="' . esc_url(rf_sso_build_app_auth_url('register', RF_SSO_DEFAULT_REDIRECT)) . '">Register</a></li>';
        }

        return $items . $auth_items;
    }, 20, 2);
}

add_action('admin_bar_menu', function ($wp_admin_bar) {
    if (!is_user_logged_in()) {
        return;
    }

    $wp_admin_bar->add_node(array(
        'id' => 'rf-customer-account',
        'title' => 'Akun Saya',
        'href' => rf_sso_get_wordpress_account_url(),
    ));

    $wp_admin_bar->add_node(array(
        'id' => 'rf-customer-logout',
        'title' => 'Logout',
        'href' => rf_sso_get_wordpress_logout_url(),
        'parent' => 'rf-customer-account',
    ));
}, 100);

add_action('wp_logout', function () {
    if (headers_sent()) {
        return;
    }

    $app_logout = rtrim(RF_SSO_APP_URL, '/') . '/login';
    wp_redirect($app_logout);
    exit;
});

register_activation_hook(__FILE__, function () {
    add_rewrite_rule('^' . preg_quote(RF_SSO_LOGIN_PATH, '/') . '/?$', 'index.php?rf_sso_login=1', 'top');
    flush_rewrite_rules();
});

register_deactivation_hook(__FILE__, function () {
    flush_rewrite_rules();
});
