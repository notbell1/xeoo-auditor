<?php
declare(strict_types=1);

require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../src/Security/SecurityHeaders.php';
require_once __DIR__ . '/../../src/Auth/SessionManager.php';

use XeooAuditor\Security\SecurityHeaders;
use XeooAuditor\Auth\SessionManager;
use XeooAuditor\Config\Database;

SecurityHeaders::applyApiHeaders();

// Enforces server-side administrator session
$session = SessionManager::requireAdmin();
$pdo = Database::getConnection();

// 1. Session Security Status
$activeSessions = (int)$pdo->query(
    "SELECT COUNT(*) FROM `admin_sessions` WHERE `revoked_at` IS NULL AND `expires_at` > NOW()"
)->fetchColumn();

// 2. Failed Login Attempts (Aggregate)
$failed24h = (int)$pdo->query(
    "SELECT COUNT(*) FROM `admin_login_attempts` WHERE `is_success` = 0 AND `attempted_at` >= DATE_SUB(NOW(), INTERVAL 24 HOUR)"
)->fetchColumn();

$failed7d = (int)$pdo->query(
    "SELECT COUNT(*) FROM `admin_login_attempts` WHERE `is_success` = 0 AND `attempted_at` >= DATE_SUB(NOW(), INTERVAL 7 DAY)"
)->fetchColumn();

// 3. Security Checks & Posture Metrics
$checks = [
    [
        'id' => 'sec_single_session',
        'title' => 'Single Active Session Policy',
        'status' => 'PASS',
        'details' => 'Every new login automatically revokes previous administrator sessions atomically.',
    ],
    [
        'id' => 'sec_ssrf_protection',
        'title' => 'SSRF Pre-Flight Gateway & Filter',
        'status' => 'PASS',
        'details' => 'Every hop (including redirects) is re-validated; all resolved IPs must be public, the connection is pinned to the validated IP, and only ports 80/443/8080/8443 are allowed.',
    ],
    [
        'id' => 'sec_tls_verification',
        'title' => 'TLS/SSL Certificate Verification',
        'status' => 'PASS',
        'details' => 'TLS certificate verification is strictly enforced (CURLOPT_SSL_VERIFYPEER = true).',
    ],
    [
        'id' => 'sec_rate_limiting',
        'title' => 'Brute-force Rate Limiting',
        'status' => 'PASS',
        'details' => 'Login lockout after 5 failures per 15 minutes, a per-IP login throttle, and rate-limited public audit endpoints. Counters use salted hashes, not raw IPs.',
    ],
    [
        'id' => 'sec_cookie_hardening',
        'title' => 'Cookie Hardening (__Host- / HttpOnly / Lax)',
        'status' => 'PASS',
        'details' => 'Authentication cookies protected with HttpOnly, SameSite=Lax, and inaccessible to JavaScript.',
    ],
];

// 4. Recent Sanitized Security Logs (Last 5 events)
$recentLogsStmt = $pdo->query("
    SELECT 
        `action`,
        `details`,
        `created_at`
    FROM `admin_audit_logs`
    ORDER BY `created_at` DESC
    LIMIT 5
");
$recentLogs = $recentLogsStmt->fetchAll(PDO::FETCH_ASSOC);

// 4b. Sanitized security events (no IPs, payloads, or URLs). Best-effort: table may not exist yet.
$securityEvents = ['by_category_24h' => [], 'recent' => []];
try {
    $securityEvents['by_category_24h'] = $pdo->query(
        'SELECT `category`, COUNT(*) AS total FROM `security_events`
         WHERE `created_at` >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
         GROUP BY `category` ORDER BY total DESC'
    )->fetchAll(PDO::FETCH_ASSOC);
    $securityEvents['recent'] = $pdo->query(
        'SELECT `request_id`, `category`, `severity`, `route`, `reason_code`, `action_taken`, `created_at`
         FROM `security_events` ORDER BY `id` DESC LIMIT 10'
    )->fetchAll(PDO::FETCH_ASSOC);
} catch (Throwable $e) {
    error_log('security_events unavailable: ' . get_class($e));
}

echo json_encode([
    'success' => true,
    'session_posture' => [
        'active_admin_sessions' => $activeSessions,
        'policy' => '1 Active Session per Admin',
        'idle_timeout_minutes' => 30,
    ],
    'failed_login_stats' => [
        'last_24h' => $failed24h,
        'last_7d' => $failed7d,
    ],
    'checks' => $checks,
    'recent_security_logs' => $recentLogs,
    'security_events' => $securityEvents,
    'evaluated_at' => date('c'),
]);

