<?php
declare(strict_types=1);

namespace XeooAuditor\Security;

require_once __DIR__ . '/ApiResponse.php';
require_once __DIR__ . '/../../config/database.php';

use Throwable;
use XeooAuditor\Config\Database;

/**
 * Best-effort security event log. Stores only sanitized metadata (no IPs, payloads, URLs).
 * A failure here must never break the request or recurse into itself.
 */
class SecurityLog
{
    private const RETENTION_DAYS = 14;
    private static bool $writing = false;

    public static function record(string $category, string $severity, string $route, string $reasonCode, string $action): void
    {
        if (self::$writing) {
            return;
        }
        self::$writing = true;
        try {
            $pdo = Database::getConnection();
            $stmt = $pdo->prepare(
                'INSERT INTO `security_events` (`request_id`, `category`, `severity`, `route`, `reason_code`, `action_taken`)
                 VALUES (:rid, :cat, :sev, :route, :reason, :action)'
            );
            $stmt->execute([
                ':rid' => ApiResponse::requestId(),
                ':cat' => substr($category, 0, 32),
                ':sev' => substr($severity, 0, 16),
                ':route' => substr($route, 0, 64),
                ':reason' => substr($reasonCode, 0, 48),
                ':action' => substr($action, 0, 24),
            ]);

            if (random_int(1, 50) === 1) {
                $pdo->prepare('DELETE FROM `security_events` WHERE `created_at` < DATE_SUB(NOW(), INTERVAL :d DAY)')
                    ->execute([':d' => self::RETENTION_DAYS]);
            }
        } catch (Throwable $e) {
            error_log('Security log unavailable: ' . get_class($e));
        } finally {
            self::$writing = false;
        }
    }
}

/**
 * DB-backed fixed-window rate limiter (no Redis dependency on shared hosting).
 * Keys are salted hashes; fails open (with a log line) if the database is unavailable.
 */
class RateLimiter
{
    /**
     * @return array{allowed: bool, retry_after: int}
     */
    public static function hit(string $scope, string $key, int $limit, int $windowSeconds): array
    {
        try {
            $pdo = Database::getConnection();
            $bucket = hash('sha256', self::pepper() . '|' . $scope . '|' . $key);

            $pdo->prepare(
                'INSERT INTO `security_rate_limits` (`bucket_hash`, `scope`, `hits`, `window_start`)
                 VALUES (:b, :s, 1, NOW())
                 ON DUPLICATE KEY UPDATE
                    `hits` = IF(`window_start` < DATE_SUB(NOW(), INTERVAL :w1 SECOND), 1, `hits` + 1),
                    `window_start` = IF(`window_start` < DATE_SUB(NOW(), INTERVAL :w2 SECOND), NOW(), `window_start`)'
            )->execute([':b' => $bucket, ':s' => substr($scope, 0, 32), ':w1' => $windowSeconds, ':w2' => $windowSeconds]);

            $stmt = $pdo->prepare(
                'SELECT `hits`, GREATEST(1, TIMESTAMPDIFF(SECOND, NOW(), DATE_ADD(`window_start`, INTERVAL :w SECOND))) AS retry
                 FROM `security_rate_limits` WHERE `bucket_hash` = :b'
            );
            $stmt->execute([':w' => $windowSeconds, ':b' => $bucket]);
            $row = $stmt->fetch();

            if (random_int(1, 100) === 1) {
                $pdo->exec('DELETE FROM `security_rate_limits` WHERE `window_start` < DATE_SUB(NOW(), INTERVAL 1 DAY)');
            }

            if (!$row) {
                return ['allowed' => true, 'retry_after' => 0];
            }
            $allowed = (int)$row['hits'] <= $limit;
            return ['allowed' => $allowed, 'retry_after' => $allowed ? 0 : (int)$row['retry']];
        } catch (Throwable $e) {
            error_log('Rate limiter unavailable: ' . get_class($e));
            return ['allowed' => true, 'retry_after' => 0];
        }
    }

    /** Enforce a limit; throws a 429 HttpException (and logs a sanitized event) when exceeded. */
    public static function enforce(string $scope, string $key, int $limit, int $windowSeconds, string $route): void
    {
        $result = self::hit($scope, $key, $limit, $windowSeconds);
        if (!$result['allowed']) {
            SecurityLog::record('RATE_LIMITED', 'medium', $route, 'rate_limit_' . $scope, 'throttled');
            throw new HttpException(429, 'RATE_LIMITED', 'Too many requests. Please slow down and try again shortly.', [
                'retry_after' => $result['retry_after'],
            ]);
        }
    }

    private static function pepper(): string
    {
        $pepper = getenv('XEOO_RL_PEPPER');
        if (!$pepper) {
            $env = strtolower(getenv('APP_ENV') ?: 'development');
            if ($env === 'production') {
                error_log('Critical configuration failure: XEOO_RL_PEPPER must be configured in production.');
                throw new HttpException(500, 'INTERNAL_ERROR', 'Security configuration failure.');
            }
            return 'xeoo-auditor-rate-limit';
        }
        return $pepper;
    }
}
