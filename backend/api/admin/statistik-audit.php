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

// Parse requested range parameter (7, 30, or 90 days)
$days = (int)($_GET['range'] ?? 30);
if (!in_array($days, [7, 30, 90], true)) {
    $days = 30;
}

$stmt = $pdo->prepare("
    SELECT 
        SUM(`total_audits`) as total_audits,
        SUM(`completed_audits`) as completed_audits,
        SUM(`failed_audits`) as failed_audits,
        AVG(`avg_duration_ms`) as avg_duration_ms,
        SUM(`ssl_checks_count`) as total_ssl_checks,
        SUM(`header_checks_count`) as total_header_checks,
        SUM(`sitemap_checks_count`) as total_sitemap_checks,
        SUM(`robots_checks_count`) as total_robots_checks
    FROM `audit_metrics_daily`
    WHERE `metric_date` >= DATE_SUB(CURDATE(), INTERVAL :days DAY)
");
$stmt->execute([':days' => $days]);
$summary = $stmt->fetch(PDO::FETCH_ASSOC) ?: [];

$trendStmt = $pdo->prepare("
    SELECT 
        `metric_date` as date,
        `total_audits` as total,
        `completed_audits` as completed,
        `failed_audits` as failed,
        `avg_duration_ms` as avg_duration
    FROM `audit_metrics_daily`
    WHERE `metric_date` >= DATE_SUB(CURDATE(), INTERVAL :days DAY)
    ORDER BY `metric_date` ASC
");
$trendStmt->execute([':days' => $days]);
$dailyTrend = $trendStmt->fetchAll(PDO::FETCH_ASSOC);

echo json_encode([
    'success' => true,
    'range_days' => $days,
    'summary' => [
        'total_audits' => (int)($summary['total_audits'] ?? 0),
        'completed_audits' => (int)($summary['completed_audits'] ?? 0),
        'failed_audits' => (int)($summary['failed_audits'] ?? 0),
        'success_rate' => ($summary['total_audits'] ?? 0) > 0 
            ? round(((int)$summary['completed_audits'] / (int)$summary['total_audits']) * 100, 1) 
            : 100.0,
        'avg_duration_ms' => round((float)($summary['avg_duration_ms'] ?? 0)),
        'module_execution_counts' => [
            'ssl_tls' => (int)($summary['total_ssl_checks'] ?? 0),
            'security_headers' => (int)($summary['total_header_checks'] ?? 0),
            'sitemap' => (int)($summary['total_sitemap_checks'] ?? 0),
            'robots_txt' => (int)($summary['total_robots_checks'] ?? 0),
        ],
    ],
    'trend' => $dailyTrend,
    'generated_at' => date('c'),
]);

