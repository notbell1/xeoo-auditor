<?php
declare(strict_types=1);

namespace XeooAuditor\Auth;

require_once __DIR__ . '/../Security/ApiResponse.php';
require_once __DIR__ . '/../../config/database.php';

use PDO;
use Throwable;
use XeooAuditor\Config\Database;
use XeooAuditor\Security\ApiResponse;

class SessionManager
{
    private const IDLE_TIMEOUT_SECONDS = 1800; // 30 minutes
    private const ABSOLUTE_LIFETIME_SECONDS = 28800; // 8 hours
    private const MAX_LOGIN_ATTEMPTS = 5;
    private const RATE_LIMIT_WINDOW_SECONDS = 900; // 15 minutes

    public static function getCookieName(): string
    {
        return self::isHttps() ? '__Host-xeoo_admin_session' : 'xeoo_admin_session';
    }

    public static function isHttps(): bool
    {
        return (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
            || (isset($_SERVER['SERVER_PORT']) && (int)$_SERVER['SERVER_PORT'] === 443)
            || (isset($_SERVER['HTTP_X_FORWARDED_PROTO']) && $_SERVER['HTTP_X_FORWARDED_PROTO'] === 'https');
    }

    public static function getClientIp(): string
    {
        // In local/production, sanitize and bound remote address
        $ip = $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1';
        return filter_var($ip, FILTER_VALIDATE_IP) ? $ip : '127.0.0.1';
    }

    /**
     * Check if client IP or username is currently rate-limited due to repeated failures
     */
    public static function isRateLimited(string $ip, string $username): bool
    {
        return self::getRateLimitRemainingSeconds($ip, $username) > 0;
    }

    /**
     * Return remaining lockout seconds (0 if not rate limited)
     */
    public static function getRateLimitRemainingSeconds(string $ip, string $username): int
    {
        $pdo = Database::getConnection();

        // Calculate count and elapsed seconds directly using MySQL clock to eliminate any PHP-MySQL timezone discrepancy
        if ($username !== '') {
            $stmt = $pdo->prepare(
                "SELECT COUNT(*) AS total, 
                        TIMESTAMPDIFF(SECOND, MAX(`attempted_at`), NOW()) AS elapsed_seconds
                 FROM `admin_login_attempts`
                 WHERE (`ip_address` = :ip OR `username_attempted` = :username)
                   AND `is_success` = 0
                   AND `attempted_at` >= (NOW() - INTERVAL :window SECOND)"
            );
            $stmt->execute([
                ':ip' => $ip,
                ':username' => $username,
                ':window' => self::RATE_LIMIT_WINDOW_SECONDS,
            ]);
        } else {
            $stmt = $pdo->prepare(
                "SELECT COUNT(*) AS total, 
                        TIMESTAMPDIFF(SECOND, MAX(`attempted_at`), NOW()) AS elapsed_seconds
                 FROM `admin_login_attempts`
                 WHERE `ip_address` = :ip
                   AND `is_success` = 0
                   AND `attempted_at` >= (NOW() - INTERVAL :window SECOND)"
            );
            $stmt->execute([
                ':ip' => $ip,
                ':window' => self::RATE_LIMIT_WINDOW_SECONDS,
            ]);
        }
        $row = $stmt->fetch();

        if (!$row || (int)($row['total'] ?? 0) < self::MAX_LOGIN_ATTEMPTS) {
            return 0;
        }

        $elapsed = (int)($row['elapsed_seconds'] ?? 0);
        $remaining = self::RATE_LIMIT_WINDOW_SECONDS - $elapsed;

        return max(0, min(self::RATE_LIMIT_WINDOW_SECONDS, $remaining));
    }


    /**
     * Log a login attempt
     */
    public static function recordLoginAttempt(string $ip, string $username, bool $isSuccess): void
    {
        try {
            $pdo = Database::getConnection();
            $stmt = $pdo->prepare(
                "INSERT INTO `admin_login_attempts` (`ip_address`, `username_attempted`, `is_success`, `attempted_at`)
                 VALUES (:ip, :username, :is_success, NOW())"
            );
            $stmt->execute([
                ':ip' => $ip,
                ':username' => substr($username, 0, 64),
                ':is_success' => $isSuccess ? 1 : 0,
            ]);
        } catch (Throwable $e) {
            error_log('Failed to record login attempt: ' . $e->getMessage());
        }
    }

    /**
     * Authenticate administrator and enforce single active session
     * Returns array with success status, user info, rawToken, and message
     */
    public static function login(string $username, string $password, ?string $ip = null, ?string $userAgent = null): array
    {
        $ip = $ip ?? self::getClientIp();
        $userAgent = substr($userAgent ?? ($_SERVER['HTTP_USER_AGENT'] ?? 'Unknown'), 0, 255);

        // 1. Rate limiting check
        $remainingLockout = self::getRateLimitRemainingSeconds($ip, $username);
        if ($remainingLockout > 0) {
            return [
                'success' => false,
                'status_code' => 429,
                'error' => 'Too many failed login attempts. Please wait 15 minutes before trying again.',
                'retry_after' => $remainingLockout,
            ];
        }

        $pdo = Database::getConnection();

        // 2. Fetch administrator record
        $stmt = $pdo->prepare(
            "SELECT `id`, `username`, `password_hash`, `role`, `is_active`
             FROM `users`
             WHERE `username` = :username
             LIMIT 1"
        );
        $stmt->execute([':username' => $username]);
        $admin = $stmt->fetch();

        // Constant time / dummy verification against timing attacks if user doesn't exist
        $dummyHash = '$argon2id$v=19$m=65536,t=4,p=1$enpBc3JWODZRLlJhRXY3Sw$N+bTx+ftIDCLEl5B9TeyeRmxX/UclNQjZC2fRoV1sPU';
        $targetHash = $admin ? $admin['password_hash'] : $dummyHash;
        $passwordMatches = password_verify($password, $targetHash);

        if (!$admin || !$passwordMatches || (int)$admin['is_active'] !== 1) {
            self::recordLoginAttempt($ip, $username, false);
            return [
                'success' => false,
                'status_code' => 401,
                'error' => 'Invalid credentials or access is restricted.',
            ];
        }

        // 3. Atomically enforce single active session policy using Transaction + Lock
        $rawToken = bin2hex(random_bytes(32)); // 64 hex characters (256 bits of entropy)
        $tokenHash = hash('sha256', $rawToken);

        $now = time();
        $expiresAt = date('Y-m-d H:i:s', $now + self::IDLE_TIMEOUT_SECONDS);

        try {
            $pdo->beginTransaction();

            // Lock user row to serialize concurrent logins
            $lockStmt = $pdo->prepare("SELECT `id` FROM `users` WHERE `id` = :id FOR UPDATE");
            $lockStmt->execute([':id' => $admin['id']]);

            // REVOKE ALL PREVIOUS ACTIVE SESSIONS FOR THIS ADMIN
            $revokeStmt = $pdo->prepare(
                "UPDATE `admin_sessions`
                 SET `revoked_at` = NOW(), `revoked_reason` = 'new_login'
                 WHERE `admin_id` = :admin_id AND `revoked_at` IS NULL"
            );
            $revokeStmt->execute([':admin_id' => $admin['id']]);

            // Insert new session using database native clock for precision
            $insertStmt = $pdo->prepare(
                "INSERT INTO `admin_sessions`
                 (`admin_id`, `token_hash`, `ip_address`, `user_agent`, `created_at`, `last_active_at`, `expires_at`)
                 VALUES (:admin_id, :token_hash, :ip, :user_agent, NOW(), NOW(), DATE_ADD(NOW(), INTERVAL :idle_sec SECOND))"
            );
            $insertStmt->execute([
                ':admin_id' => $admin['id'],
                ':token_hash' => $tokenHash,
                ':ip' => $ip,
                ':user_agent' => $userAgent,
                ':idle_sec' => self::IDLE_TIMEOUT_SECONDS,
            ]);

            // Log successful action to audit logs
            $logStmt = $pdo->prepare(
                "INSERT INTO `admin_audit_logs` (`admin_id`, `action`, `details`, `ip_address`, `created_at`)
                 VALUES (:admin_id, 'login_success', :details, :ip, NOW())"
            );
            $logStmt->execute([
                ':admin_id' => $admin['id'],
                ':details' => json_encode(['single_session_enforced' => true]),
                ':ip' => $ip,
            ]);

            $pdo->commit();
            self::recordLoginAttempt($ip, $username, true);

            return [
                'success' => true,
                'status_code' => 200,
                'raw_token' => $rawToken,
                'user' => [
                    'id' => (int)$admin['id'],
                    'username' => $admin['username'],
                    'role' => $admin['role'],
                ],
            ];
        } catch (Throwable $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            error_log('Session creation transaction error: ' . $e->getMessage());
            return [
                'success' => false,
                'status_code' => 500,
                'error' => 'An operational error occurred while creating session.',
            ];
        }
    }

    /**
     * Validate session token from cookie
     */
    public static function validateSession(?string $rawToken): ?array
    {
        if (!$rawToken || strlen($rawToken) !== 64 || !ctype_xdigit($rawToken)) {
            return null;
        }

        $tokenHash = hash('sha256', $rawToken);
        $pdo = Database::getConnection();

        $stmt = $pdo->prepare(
            "SELECT s.`id` AS session_id, s.`admin_id`, s.`created_at` AS session_created_at,
                    s.`last_active_at`, s.`expires_at`, s.`revoked_at`,
                    a.`username`, a.`role`, a.`is_active`
             FROM `admin_sessions` s
             INNER JOIN `users` a ON a.`id` = s.`admin_id`
             WHERE s.`token_hash` = :token_hash
               AND s.`revoked_at` IS NULL
               AND s.`expires_at` > NOW()
             LIMIT 1"
        );
        $stmt->execute([':token_hash' => $tokenHash]);
        $record = $stmt->fetch();

        if (!$record) {
            return null;
        }

        // Check absolute lifetime (max 8 hours since session creation)
        $createdTimestamp = strtotime($record['session_created_at']);
        if ((time() - $createdTimestamp) > self::ABSOLUTE_LIFETIME_SECONDS) {
            $pdo->prepare("UPDATE `admin_sessions` SET `revoked_at` = NOW(), `revoked_reason` = 'absolute_timeout' WHERE `id` = :id")
                ->execute([':id' => $record['session_id']]);
            return null;
        }

        // Check admin active status
        if ((int)$record['is_active'] !== 1) {
            return null;
        }

        // Slide idle timeout: update last_active_at and expires_at using database native arithmetic
        $updateStmt = $pdo->prepare(
            "UPDATE `admin_sessions`
             SET `last_active_at` = NOW(),
                 `expires_at` = LEAST(DATE_ADD(NOW(), INTERVAL :idle_sec SECOND), DATE_ADD(`created_at`, INTERVAL :abs_sec SECOND))
             WHERE `id` = :id"
        );
        $updateStmt->execute([
            ':idle_sec' => self::IDLE_TIMEOUT_SECONDS,
            ':abs_sec' => self::ABSOLUTE_LIFETIME_SECONDS,
            ':id' => $record['session_id'],
        ]);

        return [
            'session_id' => (int)$record['session_id'],
            'admin_id' => (int)$record['admin_id'],
            'username' => $record['username'],
            'role' => $record['role'],
        ];
    }

    /**
     * Revoke session on logout
     */
    public static function revokeSession(?string $rawToken, string $reason = 'user_logout'): bool
    {
        if (!$rawToken || strlen($rawToken) !== 64 || !ctype_xdigit($rawToken)) {
            return false;
        }

        $tokenHash = hash('sha256', $rawToken);
        $pdo = Database::getConnection();

        $stmt = $pdo->prepare(
            "UPDATE `admin_sessions`
             SET `revoked_at` = NOW(), `revoked_reason` = :reason
             WHERE `token_hash` = :token_hash AND `revoked_at` IS NULL"
        );
        $stmt->execute([
            ':reason' => $reason,
            ':token_hash' => $tokenHash,
        ]);

        return $stmt->rowCount() > 0;
    }

    /**
     * Set secure session cookie in HTTP response
     */
    public static function sendSessionCookie(string $rawToken): void
    {
        $cookieName = self::getCookieName();
        $isSecure = self::isHttps();

        setcookie($cookieName, $rawToken, [
            'expires' => time() + self::ABSOLUTE_LIFETIME_SECONDS,
            'path' => '/',
            'domain' => '', // MUST be empty for __Host- prefix
            'secure' => $isSecure,
            'httponly' => true,
            'samesite' => 'Lax',
        ]);
    }

    /**
     * Clear session cookie
     */
    public static function clearSessionCookie(): void
    {
        $cookieName = self::getCookieName();
        $isSecure = self::isHttps();

        setcookie($cookieName, '', [
            'expires' => time() - 3600,
            'path' => '/',
            'domain' => '',
            'secure' => $isSecure,
            'httponly' => true,
            'samesite' => 'Lax',
        ]);
    }

    /**
     * Retrieve session token from cookie
     */
    public static function getTokenFromCookie(): ?string
    {
        $cookieName = self::getCookieName();
        if (!empty($_COOKIE[$cookieName])) {
            return $_COOKIE[$cookieName];
        }

        // Fallback for transition between HTTP / HTTPS
        if (!empty($_COOKIE['xeoo_admin_session'])) {
            return $_COOKIE['xeoo_admin_session'];
        }

        if (!empty($_COOKIE['__Host-xeoo_admin_session'])) {
            return $_COOKIE['__Host-xeoo_admin_session'];
        }

        return null;
    }

    /**
     * Require active admin session for API endpoints
     * Terminates with JSON 401 if not authenticated
     */
    public static function requireAdmin(): array
    {
        $rawToken = self::getTokenFromCookie();
        $session = self::validateSession($rawToken);

        if (!$session) {
            ApiResponse::error(401, 'UNAUTHENTICATED', 'Unauthorized: Invalid or expired administrator session');
            exit;
        }

        return $session;
    }

    /**
     * Update administrator username and password
     */
    public static function updateProfile(int $userId, string $currentPassword, string $newUsername, ?string $newPassword = null): array
    {
        $pdo = Database::getConnection();

        // 1. Fetch user to verify current password
        $stmt = $pdo->prepare("SELECT `id`, `username`, `password_hash` FROM `users` WHERE `id` = :id LIMIT 1");
        $stmt->execute([':id' => $userId]);
        $user = $stmt->fetch();

        if (!$user || !password_verify($currentPassword, $user['password_hash'])) {
            return [
                'success' => false,
                'status_code' => 401,
                'error' => 'Current password is incorrect.',
            ];
        }

        // 2. Validate new username
        $newUsername = trim($newUsername);
        if (strlen($newUsername) < 3 || strlen($newUsername) > 64 || !preg_match('/^[a-zA-Z0-9_-]+$/', $newUsername)) {
            return [
                'success' => false,
                'status_code' => 400,
                'error' => 'Username must be 3-64 characters alphanumeric, underscore, or hyphen.',
            ];
        }

        // Check if username taken by another user
        if ($newUsername !== $user['username']) {
            $checkStmt = $pdo->prepare("SELECT `id` FROM `users` WHERE `username` = :u AND `id` != :id");
            $checkStmt->execute([':u' => $newUsername, ':id' => $userId]);
            if ($checkStmt->fetch()) {
                return [
                    'success' => false,
                    'status_code' => 409,
                    'error' => 'Username is already taken by another account.',
                ];
            }
        }

        // 3. Handle password update if provided
        $passwordHash = $user['password_hash'];
        if ($newPassword !== null && trim($newPassword) !== '') {
            if (strlen($newPassword) < 8 || strlen($newPassword) > 128) {
                return [
                    'success' => false,
                    'status_code' => 400,
                    'error' => 'New password must be between 8 and 128 characters.',
                ];
            }
            $algo = defined('PASSWORD_ARGON2ID') ? PASSWORD_ARGON2ID : PASSWORD_BCRYPT;
            $options = $algo === PASSWORD_BCRYPT ? ['cost' => 12] : [];
            $passwordHash = password_hash($newPassword, $algo, $options);
        }

        // 4. Update users table
        $updateStmt = $pdo->prepare(
            "UPDATE `users`
             SET `username` = :username, `password_hash` = :hash, `updated_at` = NOW()
             WHERE `id` = :id"
        );
        $updateStmt->execute([
            ':username' => $newUsername,
            ':hash' => $passwordHash,
            ':id' => $userId,
        ]);

        // 5. Log audit action
        $logStmt = $pdo->prepare(
            "INSERT INTO `admin_audit_logs` (`admin_id`, `action`, `details`, `ip_address`, `created_at`)
             VALUES (:id, 'profile_updated', :details, :ip, NOW())"
        );
        $logStmt->execute([
            ':id' => $userId,
            ':details' => json_encode(['username_changed' => $newUsername !== $user['username'], 'password_changed' => ($newPassword !== null && trim($newPassword) !== '')]),
            ':ip' => self::getClientIp(),
        ]);

        return [
            'success' => true,
            'status_code' => 200,
            'message' => 'Profile updated successfully.',
            'user' => [
                'id' => $userId,
                'username' => $newUsername,
            ],
        ];
    }

    /**
     * Best-effort recording of administrative actions in admin_audit_logs.
     */
    public static function logAction(int $adminId, string $action, ?string $details = null): void
    {
        try {
            $pdo = Database::getConnection();
            $stmt = $pdo->prepare(
                "INSERT INTO `admin_audit_logs` (`admin_id`, `action`, `details`, `ip_address`, `created_at`)
                 VALUES (:admin_id, :action, :details, :ip, NOW())"
            );
            $stmt->execute([
                ':admin_id' => $adminId,
                ':action' => substr($action, 0, 64),
                ':details' => $details !== null ? substr($details, 0, 2048) : null,
                ':ip' => self::getClientIp(),
            ]);
        } catch (Throwable $e) {
            // Best-effort auditing, never crash main execution if log table fails
            error_log('Failed to write admin audit log: ' . $e->getMessage());
        }
    }
}

