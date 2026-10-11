<?php
declare(strict_types=1);

namespace XeooAuditor\Security;

require_once __DIR__ . '/ApiResponse.php';
require_once __DIR__ . '/SecurityHeaders.php';

/**
 * Trust-boundary checks for incoming requests: method, content type, body size,
 * JSON shape, and cross-site request protection. Frontend validation is never trusted.
 */
class RequestGuard
{
    public const MAX_BODY_BYTES = 16384;
    private const MAX_JSON_DEPTH = 6;
    private const MAX_JSON_KEYS = 32;

    public static function requireMethod(string $method): void
    {
        $actual = $_SERVER['REQUEST_METHOD'] ?? '';
        if ($actual !== $method) {
            if (!headers_sent()) {
                header('Allow: ' . $method . ', OPTIONS');
            }
            throw new HttpException(405, 'METHOD_NOT_ALLOWED', 'Method Not Allowed');
        }
    }

    /**
     * Same-origin enforcement for state-changing, cookie-authenticated requests.
     * Allowed when Sec-Fetch-Site/Origin are absent (non-browser clients carry no ambient cookies).
     */
    public static function requireSameOrigin(): void
    {
        $fetchSite = strtolower((string)($_SERVER['HTTP_SEC_FETCH_SITE'] ?? ''));
        if ($fetchSite === 'cross-site') {
            throw new HttpException(403, 'FORBIDDEN', 'Cross-site requests are not permitted.');
        }

        $origin = $_SERVER['HTTP_ORIGIN'] ?? null;
        if ($origin === null || $origin === '') {
            return;
        }
        if (!self::isOriginAllowed((string)$origin, (string)($_SERVER['HTTP_HOST'] ?? ''))) {
            throw new HttpException(403, 'FORBIDDEN', 'Request origin is not permitted.');
        }
    }

    public static function isOriginAllowed(string $origin, string $host): bool
    {
        if (in_array($origin, SecurityHeaders::allowedOrigins(), true)) {
            return true;
        }
        $parts = parse_url($origin);
        if ($parts === false || !isset($parts['host'], $parts['scheme'])
            || !in_array($parts['scheme'], ['http', 'https'], true)) {
            return false;
        }
        $originHost = strtolower($parts['host']) . (isset($parts['port']) ? ':' . $parts['port'] : '');
        return $host !== '' && hash_equals(strtolower($host), $originHost);
    }

    /**
     * Read and decode a bounded JSON object body.
     *
     * @return array<string, mixed>
     */
    public static function readJsonObject(?string $rawBody = null, ?string $contentType = null): array
    {
        $contentType ??= (string)($_SERVER['CONTENT_TYPE'] ?? '');
        if (stripos($contentType, 'application/json') !== 0) {
            throw new HttpException(415, 'UNSUPPORTED_MEDIA_TYPE', 'Content-Type must be application/json.');
        }

        if ($rawBody === null) {
            $declared = (int)($_SERVER['CONTENT_LENGTH'] ?? 0);
            if ($declared > self::MAX_BODY_BYTES) {
                throw new HttpException(413, 'REQUEST_TOO_LARGE', 'Request body is too large.');
            }
            $stream = fopen('php://input', 'rb');
            $rawBody = $stream === false ? '' : (string)stream_get_contents($stream, self::MAX_BODY_BYTES + 1);
            if ($stream !== false) {
                fclose($stream);
            }
        }

        if (strlen($rawBody) > self::MAX_BODY_BYTES) {
            throw new HttpException(413, 'REQUEST_TOO_LARGE', 'Request body is too large.');
        }

        try {
            $data = json_decode($rawBody, true, self::MAX_JSON_DEPTH, JSON_THROW_ON_ERROR);
        } catch (\JsonException) {
            throw new HttpException(400, 'INVALID_INPUT', 'Invalid JSON payload.');
        }

        if (!is_array($data) || ($data !== [] && array_is_list($data)) || count($data) > self::MAX_JSON_KEYS) {
            throw new HttpException(400, 'INVALID_INPUT', 'Request body must be a JSON object.');
        }

        return $data;
    }
}

/** Field-level validators. They never coerce types (e.g. arrays are never cast to strings). */
class Validator
{
    /**
     * @param array<string, mixed> $data
     * @return string|null null only when the field is optional and absent/empty
     */
    public static function string(
        array $data,
        string $field,
        int $min,
        int $max,
        ?string $pattern = null,
        bool $required = true,
        bool $trim = false,
    ): ?string {
        $value = $data[$field] ?? null;
        if ($value === null || $value === '') {
            if ($required) {
                throw self::invalid($field, 'is required');
            }
            return null;
        }
        if (!is_string($value)) {
            throw self::invalid($field, 'must be a string');
        }
        if ($trim) {
            $value = trim($value);
        }
        $length = mb_strlen($value, 'UTF-8');
        if ($length < $min || $length > $max) {
            throw self::invalid($field, "must be between {$min} and {$max} characters");
        }
        if (!mb_check_encoding($value, 'UTF-8') || preg_match('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/', $value) === 1) {
            throw self::invalid($field, 'contains invalid characters');
        }
        if ($pattern !== null && preg_match($pattern, $value) !== 1) {
            throw self::invalid($field, 'has an invalid format');
        }
        return $value;
    }

    /** Optional honeypot: must be absent or an empty string. Returns true when filled. */
    public static function honeypotFilled(array $data, string $field): bool
    {
        $value = $data[$field] ?? '';
        return !is_string($value) || trim($value) !== '';
    }

    public static function int(array $data, string $field, int $min, int $max, bool $required = true): ?int
    {
        $value = $data[$field] ?? null;
        if ($value === null || $value === '') {
            if ($required) {
                throw self::invalid($field, 'is required');
            }
            return null;
        }
        if (!is_int($value) && (!is_string($value) || !ctype_digit(ltrim((string)$value, '-')))) {
            throw self::invalid($field, 'must be an integer');
        }
        $intVal = (int)$value;
        if ($intVal < $min || $intVal > $max) {
            throw self::invalid($field, "must be between {$min} and {$max}");
        }
        return $intVal;
    }

    /**
     * Rejects input containing script tags, javascript: pseudo-protocols,
     * inline event handlers (onerror=, onload=, etc.), or raw HTML tags.
     */
    public static function assertNoScript(string $value, string $field): void
    {
        $patterns = [
            '/<\s*script\b[^>]*>/i',
            '/<\s*\/\s*script\s*>/i',
            '/javascript\s*:/i',
            '/vbscript\s*:/i',
            '/data\s*:\s*text\/html/i',
            '/\bon\w+\s*=/i',
            '/<\s*(iframe|object|embed|applet|meta|link|style|base|svg|img|body|input|form)\b/i',
            '/document\s*\.\s*(cookie|location|domain)/i',
            '/window\s*\.\s*(location|open)/i',
            '/eval\s*\(/i',
            '/<\s*\/?\s*[a-zA-Z]/',
        ];

        foreach ($patterns as $pattern) {
            if (preg_match($pattern, $value) === 1) {
                throw self::invalid($field, 'contains prohibited HTML or JavaScript code');
            }
        }
    }

    private static function invalid(string $field, string $reason): HttpException
    {
        return new HttpException(400, 'INVALID_INPUT', "Field '{$field}' {$reason}.", ['field' => $field]);
    }
}
