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

// 1. Audit Volume & Performance Metrics (Last 7 days aggregate)
$rangeStmt = $pdo->query("
    SELECT 
        SUM(`total_audits`) as total_audits,
        SUM(`completed_audits`) as completed_audits,
        SUM(`failed_audits`) as failed_audits,
        AVG(`avg_duration_ms`) as avg_duration_ms
    FROM `audit_metrics_daily`
    WHERE `metric_date` >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
");
$stats = $rangeStmt->fetch(PDO::FETCH_ASSOC) ?: [];

$dailyTrendStmt = $pdo->query("
    SELECT 
        `metric_date` as date,
        `total_audits` as total,
        `completed_audits` as completed,
        `failed_audits` as failed
    FROM `audit_metrics_daily`
    WHERE `metric_date` >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
    ORDER BY `metric_date` ASC
");
$dailyTrend = $dailyTrendStmt->fetchAll(PDO::FETCH_ASSOC);

// 2. Service Health Status Check
$dbHealthy = false;
try {
    $pdo->query("SELECT 1");
    $dbHealthy = true;
} catch (Throwable) {
    $dbHealthy = false;
}

$tmpHealthy = is_writable(sys_get_temp_dir());
$curlAvailable = function_exists('curl_init');
$overallHealth = ($dbHealthy && $tmpHealthy && $curlAvailable) ? 'OPERATIONAL' : 'DEGRADED';

// 3. Recent Sanitized Operational Errors
$errorsStmt = $pdo->query("
    SELECT 
        `fingerprint`,
        `category`,
        `severity`,
        `message`,
        `occurrence_count`,
        `status`,
        `last_seen_at`
    FROM `operational_errors`
    ORDER BY `last_seen_at` DESC
    LIMIT 3
");
$recentErrors = $errorsStmt->fetchAll(PDO::FETCH_ASSOC);

// 4. Session & Security Metrics
$activeSessions = (int)$pdo->query(
    "SELECT COUNT(*) FROM `admin_sessions` WHERE `revoked_at` IS NULL AND `expires_at` > NOW()"
)->fetchColumn();

$failedAttempts24h = (int)$pdo->query(
    "SELECT COUNT(*) FROM `admin_login_attempts` WHERE `is_success` = 0 AND `attempted_at` >= DATE_SUB(NOW(), INTERVAL 24 HOUR)"
)->fetchColumn();

// 5. Contact Inquiries Metrics
$unreadInquiries = 0;
$totalInquiries = 0;
$recentInquiries = [];
try {
    $unreadInquiries = (int)$pdo->query(
        "SELECT COUNT(*) FROM `contact_submissions` WHERE `status` = 'unread'"
    )->fetchColumn();
    $totalInquiries = (int)$pdo->query(
        "SELECT COUNT(*) FROM `contact_submissions`"
    )->fetchColumn();
    $recentInquiriesStmt = $pdo->query("
        SELECT 
            `id`,
            `name`,
            `email`,
            `category`,
            `subject`,
            `status`,
            `created_at`
        FROM `contact_submissions`
        ORDER BY `id` DESC
        LIMIT 5
    ");
    $recentInquiries = $recentInquiriesStmt->fetchAll(PDO::FETCH_ASSOC);
} catch (Throwable) {
    // Graceful fallback if table is unavailable
}

echo json_encode([
    'success' => true,
    'admin' => [
        'username' => $session['username'],
        'role' => $session['role'],
    ],
    'summary' => [
        'total_audits' => (int)($stats['total_audits'] ?? 0),
        'completed_audits' => (int)($stats['completed_audits'] ?? 0),
        'failed_audits' => (int)($stats['failed_audits'] ?? 0),
        'avg_duration_ms' => round((float)($stats['avg_duration_ms'] ?? 0)),
        'service_health' => $overallHealth,
        'active_admin_sessions' => $activeSessions,
        'failed_logins_24h' => $failedAttempts24h,
    ],
    'inquiries_summary' => [
        'total' => $totalInquiries,
        'unread' => $unreadInquiries,
    ],
    'recent_inquiries' => $recentInquiries,
    'chart_data' => $dailyTrend,
    'health_summary' => [
        'backend_api' => 'OPERATIONAL',
        'database' => $dbHealthy ? 'OPERATIONAL' : 'UNAVAILABLE',
        'audit_processor' => $curlAvailable ? 'OPERATIONAL' : 'DEGRADED',
        'temp_storage' => $tmpHealthy ? 'OPERATIONAL' : 'DEGRADED',
        'last_checked' => date('c'),
    ],
    'recent_errors' => $recentErrors,
    'server_time' => date('c'),
]);

