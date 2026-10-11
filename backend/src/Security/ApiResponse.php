<?php
declare(strict_types=1);

namespace XeooAuditor\Security;

use Throwable;

/** Safe, typed failure that maps directly to a stable API error code. */
class HttpException extends \RuntimeException
{
    /** @param array<string, mixed> $extra */
    public function __construct(
        public readonly int $status,
        public readonly string $errorCode,
        string $message,
        public readonly array $extra = [],
    ) {
        parent::__construct($message);
    }
}

/**
 * Consistent API responses. Keeps the legacy `success` / `error` fields and adds
 * a stable `code` and a `request_id` for correlation. Never leaks internals.
 */
class ApiResponse
{
    private static ?string $requestId = null;

    public static function requestId(): string
    {
        return self::$requestId ??= bin2hex(random_bytes(8));
    }

    /** Install the global exception handler and disable error display. */
    public static function boot(): void
    {
        ini_set('display_errors', '0');
        header('X-Request-Id: ' . self::requestId());

        set_exception_handler(static function (Throwable $e): void {
            if ($e instanceof HttpException) {
                self::error($e->status, $e->errorCode, $e->getMessage(), $e->extra);
                return;
            }
            error_log('[' . self::requestId() . '] Unhandled ' . get_class($e) . ': ' . $e->getMessage());
            self::error(500, 'INTERNAL_ERROR', 'An internal error occurred. Please try again later.');
        });
    }

    /** @param array<string, mixed> $extra */
    public static function error(int $status, string $code, string $message, array $extra = []): void
    {
        if (!headers_sent()) {
            http_response_code($status);
            if (isset($extra['retry_after'])) {
                header('Retry-After: ' . (int)$extra['retry_after']);
            }
        }
        echo json_encode(array_merge($extra, [
            'success' => false,
            'code' => $code,
            'error' => $message,
            'request_id' => self::requestId(),
        ]), JSON_UNESCAPED_SLASHES);
    }

    /** @param array<string, mixed> $payload */
    public static function ok(array $payload, int $status = 200): void
    {
        http_response_code($status);
        echo json_encode(array_merge(['success' => true], $payload));
    }
}

