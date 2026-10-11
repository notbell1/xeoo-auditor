<?php
declare(strict_types=1);

namespace XeooAuditor\Security;

require_once __DIR__ . '/ApiResponse.php';

class SecurityHeaders
{
    /**
     * Origins allowed for credentialed cross-origin calls (dev frontend by default).
     * Production can extend via XEOO_ALLOWED_ORIGINS (comma-separated exact origins).
     *
     * @return list<string>
     */
    public static function allowedOrigins(): array
    {
        $env = strtolower(getenv('APP_ENV') ?: 'development');
        $origins = [];

        // Development origins only when not running in production
        if ($env !== 'production') {
            $origins = [
                'http://localhost:5173',
                'http://127.0.0.1:5173',
                'http://localhost:3000',
                'http://127.0.0.1:3000',
            ];
        }

        $extra = getenv('XEOO_ALLOWED_ORIGINS') ?: '';
        foreach (explode(',', $extra) as $candidate) {
            $candidate = rtrim(trim($candidate), '/');
            if ($candidate !== '' && preg_match('#^https?://[a-z0-9.\-]+(:\d+)?$#i', $candidate) === 1) {
                $origins[] = $candidate;
            }
        }
        return array_values(array_unique($origins));
    }

    public static function applyApiHeaders(): void
    {
        ApiResponse::boot();

        // Standard security response headers
        header('Content-Type: application/json; charset=utf-8');
        header('X-Content-Type-Options: nosniff');
        header('X-Frame-Options: DENY');
        header("Content-Security-Policy: default-src 'none'; frame-ancestors 'none'");
        header('Referrer-Policy: strict-origin-when-cross-origin');
        header('Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=()');
        header('Cross-Origin-Opener-Policy: same-origin');
        header('Cross-Origin-Resource-Policy: same-site');
        header('Cache-Control: no-store, no-cache, must-revalidate, private');
        header('Pragma: no-cache');
        header('Vary: Origin');

        $https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
            || (isset($_SERVER['SERVER_PORT']) && (int)$_SERVER['SERVER_PORT'] === 443);
        if ($https) {
            header('Strict-Transport-Security: max-age=31536000; includeSubDomains');
        }

        // CORS Handling (for development between Vite frontend & PHP backend)
        $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
        if (in_array($origin, self::allowedOrigins(), true)) {
            header("Access-Control-Allow-Origin: {$origin}");
            header('Access-Control-Allow-Credentials: true');
            header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
            header('Access-Control-Allow-Headers: Content-Type, X-Requested-With');
            header('Access-Control-Expose-Headers: X-Request-Id, Retry-After');
        }

        // Handle preflight OPTIONS
        if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
            http_response_code(204);
            exit;
        }
    }
}
